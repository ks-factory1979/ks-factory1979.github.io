(function () {
  "use strict";
  const app = MapSymbolNinja;
  const config = app.ProgressConfig;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const count = (value) => typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))) : 0;
  const addOne = (value) => Math.min(Number.MAX_SAFE_INTEGER, value + 1);
  const dateOrNull = (value) => typeof value === "string" && value.length <= 40 &&
    Number.isFinite(Date.parse(value)) ? value : null;

  let memorySerial = 0;

  // IndexedDBのreadwriteトランザクションが、タブをまたぐ最新読込と確定を直列化する。
  // localStorageのキャッシュを排他下で読み直すだけでは、別タブの古い値を読む場合がある。
  class ProgressRepository {
    constructor(indexedDB, key) { this.indexedDB = indexedDB; this.key = key; this.connection = null; }
    _open() {
      if (this.connection) return this.connection;
      this.connection = new Promise((resolve, reject) => {
        let settled = false;
        const fail = error => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } };
        const timer = setTimeout(() => fail(new Error("database-open-timeout")), 8000);
        let request;
        try { request = this.indexedDB.open(config.DATABASE_NAME, 1); } catch (error) { fail(error); return; }
        request.onupgradeneeded = () => request.result.createObjectStore("records");
        request.onblocked = () => fail(new Error("database-blocked"));
        request.onerror = () => fail(request.error);
        request.onsuccess = () => {
          const db = request.result;
          if (settled) { db.close(); return; }
          settled = true; clearTimeout(timer);
          db.onversionchange = () => { db.close(); this.connection = null; };
          resolve(db);
        };
      }).catch(error => { this.connection = null; throw error; });
      return this.connection;
    }
    async read() {
      const db = await this._open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("records", "readonly"), request = tx.objectStore("records").get(this.key);
        tx.oncomplete = () => resolve(request.result === undefined ? null : request.result);
        tx.onabort = () => reject(tx.error || new Error("database-read-aborted"));
      });
    }
    async transact(change) {
      const db = await this._open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("records", "readwrite"), store = tx.objectStore("records"), request = store.get(this.key);
        let result, failure;
        request.onsuccess = () => {
          try {
            result = change(request.result === undefined ? null : request.result);
            if (result.text !== undefined) store.put(result.text, this.key);
            if (result.legacyText !== null && result.legacyText !== undefined) store.put(result.legacyText, this.key + ":legacy-backup");
            if (result.catalogBackupText !== undefined) {
              const backupKey = this.key + ":catalog-v2-backup", backup = store.get(backupKey);
              backup.onsuccess = () => { if (backup.result === undefined) store.put(result.catalogBackupText, backupKey); };
            }
          } catch (error) { failure = error; tx.abort(); }
        };
        // request成功では確定しない。バックアップ・成果・適用済み連番をすべてcommitしてから返す。
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(failure || tx.error || new Error("database-write-aborted"));
      });
    }
  }

  // 学習進行専用。Phaser / スコア / Combo / Spawn / 演出の参照を持たない。
  class ProgressManager {
    constructor(options) {
      const settings = options || {};
      this.catalog = settings.catalog || app.MapSymbolData;
      this.stages = settings.stages || app.StageData;
      this.now = settings.now || (() => new Date().toISOString());
      this.readOnly = Boolean(settings.readOnly);
      this.progressEnabled = !this.readOnly;
      this.onEvent = settings.onEvent || null;
      this.saveListeners = new Set(); this.lastSaveNotification = null; this.retryTask = null;
      this.storageKey = config.STORAGE_KEY;
      const crypto = window.crypto;
      this.writerId = crypto && typeof crypto.randomUUID === "function" ? "writer-" + crypto.randomUUID() :
        crypto && typeof crypto.getRandomValues === "function" ? "writer-" +
          Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, "0")).join("") : null;
      this.sequence = 0; this.pending = []; this.saveTask = null; this.saveProblem = null;
      this.memoryId = "memory-" + (++memorySerial);
      this.storage = null;
      this.storageUnavailable = false;
      try { this.storage = Object.prototype.hasOwnProperty.call(settings, "storage") ? settings.storage : window.localStorage; }
      catch (_error) { this.storageUnavailable = true; console.warn("[Progress] storage unavailable; using memory"); }
      let indexedDB = null;
      try { indexedDB = window.indexedDB; } catch (_error) {}
      const memoryOnly = Object.prototype.hasOwnProperty.call(settings, "storage") && settings.storage === null;
      this.memoryOnly = memoryOnly;
      this.repository = Object.prototype.hasOwnProperty.call(settings, "repository") ? settings.repository :
        indexedDB && !memoryOnly ? new ProgressRepository(indexedDB, this.storageKey) : null;
      this.readyTask = Promise.resolve(false);
      this.initialized = false; this.initializing = false;
      this.channel = null;
      if (!this.readOnly && window.BroadcastChannel && this.repository) {
        try {
          this.channel = new window.BroadcastChannel(config.DATABASE_NAME + "_changes");
          this.channel.onmessage = event => { if (event.data === this.storageKey) this.refresh(); };
        } catch (_error) {}
      }
      this.loaded = false; this.dirty = false; this.currentEncounter = null;
      this.stats = { loadCount: 0, saveCount: 0, saveAttempts: 0, finalizedCount: 0, successCount: 0 };
      this.data = this._fresh();
      if (window.addEventListener) {
        window.addEventListener("storage", event => {
          if (event.key === this.storageKey || event.key === null) this.refresh();
        });
        window.addEventListener("focus", () => this.refresh());
      }
    }

    static isDevelopmentMode() {
      return Boolean(NINJA_CONFIG.DEV_PANEL_ENABLED && (NINJA_CONFIG.DEBUG_MODE ||
        new URLSearchParams(window.location && window.location.search || "").get("dev") === "1"));
    }

    _fresh() {
      const symbols = {};
      for (const entry of this.catalog.entries) symbols[entry.id] = {
        totalCorrectCuts: 0, successfulEncounters: 0, firstDiscoveredAt: null
      };
      const now = this.now();
      return { schemaVersion: config.SCHEMA_VERSION, symbols, announcedUnlocks: [], retainedUnlocks: [], meta: { createdAt: now, updatedAt: now },
        persistence: { revision: 0, generation: "initial", writerHeads: {} } };
    }

    // 将来の形式変換入口。未対応バージョンを新形式で上書きしない。
    migrateProgressData(raw) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw) || ![1, 2, config.SCHEMA_VERSION].includes(raw.schemaVersion) ||
          !raw.symbols || typeof raw.symbols !== "object" || Array.isArray(raw.symbols)) {
        throw new Error("invalid progress schema");
      }
      const normalized = this._fresh();
      for (const entry of this.catalog.entries) {
        const saved = raw.symbols[entry.id];
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) continue;
        normalized.symbols[entry.id] = {
          totalCorrectCuts: count(saved.totalCorrectCuts), successfulEncounters: count(saved.successfulEncounters),
          firstDiscoveredAt: dateOrNull(saved.firstDiscoveredAt)
        };
      }
      const validIds = new Set(this._allUnlockIds());
      normalized.announcedUnlocks = Array.isArray(raw.announcedUnlocks)
        ? Array.from(new Set(raw.announcedUnlocks.filter((id) => typeof id === "string" && validIds.has(id)))) : [];
      if (raw.schemaVersion < 3) {
        // 旧2枠で得た老人ホームの成果だけを合算。ダムを学んだ成果にはしない。
        const duplicate = raw.symbols.nursing_home;
        if (duplicate && typeof duplicate === "object" && !Array.isArray(duplicate)) {
          const elderly = normalized.symbols.elderly_home, earlier = dateOrNull(duplicate.firstDiscoveredAt);
          elderly.totalCorrectCuts = Math.min(Number.MAX_SAFE_INTEGER, elderly.totalCorrectCuts + count(duplicate.totalCorrectCuts));
          elderly.successfulEncounters = Math.min(Number.MAX_SAFE_INTEGER, elderly.successfulEncounters + count(duplicate.successfulEncounters));
          if (earlier && (!elderly.firstDiscoveredAt || Date.parse(earlier) < Date.parse(elderly.firstDiscoveredAt))) elderly.firstDiscoveredAt = earlier;
        }
        // 合算前の旧カタログで到達済みだった入口を記録する。未通知の解放も保つ。
        let rankAccessible = true;
        for (const rank of this.stages.order) {
          const rankData = this.stages.getRank(rank);
          if (rankAccessible && rank !== this.stages.order[0]) normalized.retainedUnlocks.push("rank_" + rank);
          let stageAccessible = rankAccessible, allComplete = rankData.stages.length === 4 && rankData.expectedSymbols === 20;
          for (const stage of rankData.stages) {
            if (stageAccessible && stage.stageNumber > 1) normalized.retainedUnlocks.push(rank + "_stage_" + stage.stageNumber);
            const complete = !stage.reserved && stage.expectedSymbols > 0 && stage.symbolIds.length === stage.expectedSymbols && stage.symbolIds.every(id => {
              const oldId = id === "dam" ? "nursing_home" : id;
              return count(raw.symbols[oldId] && raw.symbols[oldId].successfulEncounters) >= config.ACQUIRE_THRESHOLD;
            });
            stageAccessible = stageAccessible && complete; allComplete = allComplete && complete;
          }
          rankAccessible = rankAccessible && allComplete;
        }
      } else {
        normalized.retainedUnlocks = Array.isArray(raw.retainedUnlocks)
          ? Array.from(new Set(raw.retainedUnlocks.filter(id => typeof id === "string" && validIds.has(id)))) : [];
      }
      normalized.meta.createdAt = dateOrNull(raw.meta && raw.meta.createdAt) || normalized.meta.createdAt;
      normalized.meta.updatedAt = dateOrNull(raw.meta && raw.meta.updatedAt) || normalized.meta.updatedAt;
      if (raw.schemaVersion >= 2) {
        const p = raw.persistence, validId = id => typeof id === "string" && /^[a-zA-Z0-9_-]{1,150}$/.test(id);
        if (!p || !Number.isSafeInteger(p.revision) || p.revision < 0 || !validId(p.generation) ||
            !p.writerHeads || typeof p.writerHeads !== "object" || Array.isArray(p.writerHeads) ||
            Object.entries(p.writerHeads).some(([id, n]) => !validId(id) ||
              ["__proto__", "constructor", "prototype"].includes(id) || !Number.isSafeInteger(n) || n < 0)) {
          throw new Error("invalid progress transaction metadata");
        }
        normalized.persistence = copy(p);
      }
      return normalized;
    }

    _readLegacy() {
      // v1は読むだけ。旧版のタブは新しいIndexedDB記録を上書きできない。
      if (!this.storage && this.storageUnavailable) throw new Error("legacy-storage-unavailable");
      const legacyText = this.storage ? this.storage.getItem(config.LEGACY_STORAGE_KEY) : null;
      return { data: legacyText !== null ? this.migrateProgressData(JSON.parse(legacyText)) : this._fresh(), legacyText };
    }

    load(initialData) {
      if (this.loaded) return this.getSnapshot();
      this.loaded = true; this.stats.loadCount += 1;
      try {
        if (initialData !== undefined && initialData !== null) {
          this.data = this.migrateProgressData(initialData); this.repository = null; this.memoryOnly = true;
        } else this.data = this._readLegacy().data;
      } catch (_error) { this._saveFailed("saved-data-unavailable"); }
      if (this.repository) this._initialize();
      else if (!this.readOnly && !this.memoryOnly) this._saveFailed("database-unavailable");
      return this.getSnapshot();
    }

    _initialize() {
      this.initializing = true;
      // 正式画面へ進む前に旧記録の移行と保存先の読込を完了する。
      this.readyTask = (this.readOnly ? this.repository.read().then(text => ({ text })) : this.repository.transact(text => {
        if (text !== null) {
          const raw = JSON.parse(text), next = this.migrateProgressData(raw);
          if (raw.schemaVersion === config.SCHEMA_VERSION) return { text };
          if (!Number.isSafeInteger(next.persistence.revision + 1)) throw new Error("revision-limit");
          next.persistence.revision += 1;
          return { text: JSON.stringify(next), catalogBackupText: text };
        }
        const legacy = this._readLegacy();
        return { text: JSON.stringify(legacy.data), legacyText: legacy.legacyText };
      })).then(result => {
        if (result.text !== null) this._adopt(this.migrateProgressData(JSON.parse(result.text)));
        this.saveProblem = null; this.storageUnavailable = false; this.initialized = true; return true;
      }).catch(() => { this._saveFailed("saved-data-unavailable"); return false; }).then(ready => {
        this.initializing = false; this._notifySaveState(); return ready;
      });
      this._notifySaveState();
    }

    whenReady() {
      if (this.repository && !this.initialized && !this.initializing) this._initialize();
      return this.readyTask;
    }

    _applyOperation(data, op) {
      const p = data.persistence;
      // 同じ書き手の連番を、成果と同じトランザクションで確定する。再試行で二重加算しない。
      if ((p.writerHeads[op.writer] || 0) >= op.sequence) return;
      p.writerHeads[op.writer] = op.sequence;
      if (p.generation !== op.generation) return; // リセット前の保留成果を復活させない。
      if (op.type === "reset") {
        const fresh = this._fresh();
        data.symbols = fresh.symbols; data.announcedUnlocks = []; data.retainedUnlocks = [];
        data.meta = { createdAt: op.at, updatedAt: op.at }; p.generation = op.resetGeneration;
      } else if (op.type === "cut") {
        const symbol = data.symbols[op.symbolId];
        symbol.totalCorrectCuts = addOne(symbol.totalCorrectCuts);
        if (!symbol.firstDiscoveredAt || Date.parse(op.at) < Date.parse(symbol.firstDiscoveredAt)) symbol.firstDiscoveredAt = op.at;
      } else if (op.type === "success") {
        data.symbols[op.symbolId].successfulEncounters = addOne(data.symbols[op.symbolId].successfulEncounters);
      } else if (op.type === "announce" && !data.announcedUnlocks.includes(op.id)) data.announcedUnlocks.push(op.id);
      data.meta.updatedAt = op.at;
    }

    _enqueue(type, details) {
      const op = Object.assign({ type, writer: this.writerId || this.memoryId, sequence: ++this.sequence,
        generation: this.data.persistence.generation, at: this.now() }, details);
      if (type === "reset") op.resetGeneration = op.writer + "_" + op.sequence;
      this.pending.push(op); this._applyOperation(this.data, op); this.dirty = true;
    }

    _adopt(latest) {
      if (latest.persistence.revision < this.data.persistence.revision) return;
      const oldGeneration = this.data.persistence.generation;
      this.data = latest;
      for (const op of this.pending) this._applyOperation(this.data, op);
      if (oldGeneration !== this.data.persistence.generation) this.cancelEncounter("reset_in_another_tab");
    }

    async refresh() {
      if (!this.loaded || !this.repository) return false;
      try {
        const text = await this.repository.read();
        if (text === null && this.initialized) throw new Error("missing-committed-progress");
        if (text !== null) this._adopt(this.migrateProgressData(JSON.parse(text)));
        this._emit({ type: "progress_refreshed" }); return true;
      } catch (_error) { this._saveFailed("saved-data-unavailable"); return false; }
    }

    _saveFailed(problem) {
      this.saveProblem = problem; this.storageUnavailable = true;
      console.warn("[Progress] learning save pending:", problem);
      this._emit({ type: "progress_save_failed", problem });
    }

    save() {
      if (this.readOnly || this.memoryOnly || !this.pending.length) return false;
      // IndexedDB非対応時に古いスナップショットを上書きするフォールバックは設けない。
      if (!this.repository || !this.writerId) {
        this._saveFailed(!this.writerId ? "secure-id-unavailable" : "database-unavailable"); return false;
      }
      if (this.saveTask) return true;
      let batch;
      this.saveTask = this.whenReady().then(ready => {
        if (!ready) throw new Error("database-not-ready");
        return this.repository.transact(text => {
          if (text === null) throw new Error("missing-committed-progress");
          const raw = JSON.parse(text), next = this.migrateProgressData(raw);
          batch = this.pending.slice();
          for (const op of batch) this._applyOperation(next, op);
          if (!Number.isSafeInteger(next.persistence.revision + 1)) throw new Error("revision-limit");
          next.persistence.revision += 1; this.stats.saveAttempts += 1;
          return Object.assign({ text: JSON.stringify(next), next }, raw.schemaVersion < 3 ? { catalogBackupText: text } : {});
        });
      }).then(result => {
        this.pending.splice(0, batch.length); this.dirty = this.pending.length > 0;
        this._adopt(result.next); this.stats.saveCount += 1;
        this.saveProblem = null; this.storageUnavailable = false;
        if (this.channel) try { this.channel.postMessage(this.storageKey); } catch (_error) {}
        this._emit({ type: "progress_saved", revision: result.next.persistence.revision });
        return true;
      }).catch(() => { this._saveFailed("save-failed"); return false; }).then(saved => {
        this.saveTask = null;
        if (saved && this.pending.length) this.save();
        this._notifySaveState();
        return saved;
      });
      this._notifySaveState();
      return true; // 保存受付。永続化完了はwhenSavedで待つ。
    }

    async whenSaved() {
      this.save();
      while (this.saveTask) {
        if (!await this.saveTask) return false;
      }
      return !this.pending.length && !this.saveProblem;
    }

    // UIの再試行は同じPromiseへまとめ、成果の連番を作り直さない。
    retrySave() {
      if (this.retryTask) return this.retryTask;
      if (this.readOnly || this.memoryOnly) return Promise.resolve(false);
      this.retryTask = Promise.resolve().then(async () => {
        if (!this.repository || !this.writerId) {
          this._saveFailed(!this.writerId ? "secure-id-unavailable" : "database-unavailable"); return false;
        }
        if (!await this.whenReady()) return false;
        if (!await this.refresh()) return false;
        if (this.pending.length || this.saveTask) return this.whenSaved();
        // 保留操作がない読込失敗でも、保存先の再確認が完了してから警告を解除する。
        this.saveProblem = null; this.storageUnavailable = false;
        this._emit({ type: "progress_save_confirmed" }); return true;
      }).catch(() => { this._saveFailed("save-failed"); return false; }).then(saved => {
        this.retryTask = null; this._notifySaveState(); return saved;
      });
      this._notifySaveState(); return this.retryTask;
    }

    getSaveState() {
      const inactive = this.readOnly || this.memoryOnly;
      const busy = Boolean(this.initializing || this.saveTask || this.retryTask);
      return { status: inactive ? "inactive" : this.saveProblem ? "failed" :
        busy || this.pending.length ? "saving" : this.initialized ? "saved" : "checking",
        busy, pendingOperations: this.pending.length, problem: this.saveProblem,
        canRetry: Boolean(!inactive && this.repository && this.writerId && !busy),
        initialized: this.initialized, revision: this.data.persistence.revision };
    }

    subscribeSaveState(listener) {
      this.saveListeners.add(listener); listener(this.getSaveState());
      return () => this.saveListeners.delete(listener);
    }

    _notifySaveState() {
      const state = this.getSaveState(), signature = JSON.stringify(state);
      if (signature === this.lastSaveNotification) return;
      this.lastSaveNotification = signature;
      for (const listener of this.saveListeners) {
        try { listener(copy(state)); } catch (_error) { console.warn("[Progress] save status listener unavailable"); }
      }
    }

    beginSession(enabled) {
      this.refresh();
      this.cancelEncounter("new_session");
      this.progressEnabled = Boolean(enabled) && !this.readOnly;
      this.stats.finalizedCount = 0; this.stats.successCount = 0;
    }

    invalidateSession(reason) {
      this.cancelEncounter(reason || "forced_action");
      this.progressEnabled = false;
    }

    startEncounter(symbolId) {
      this.refresh();
      this.cancelEncounter("new_target");
      const entry = this.catalog.get(symbolId);
      if (!this.progressEnabled || !entry || !entry.implemented) return null;
      this.currentEncounter = { symbolId: entry.id, correctHits: 0, hadWrongAttempt: false,
        pausedByZone: false, finalized: false, startedAt: this.now() };
      this._emit({ type: "encounter_started", symbolId: entry.id });
      return copy(this.currentEncounter);
    }

    _canRecord() {
      return this.progressEnabled && this.currentEncounter && !this.currentEncounter.finalized && !this.currentEncounter.pausedByZone;
    }

    recordCorrectHit(symbolId) {
      if (!this._canRecord() || this.catalog.canonicalId(symbolId) !== this.currentEncounter.symbolId) return false;
      const id = this.currentEncounter.symbolId, before = this.getMasteryState(id);
      this.currentEncounter.correctHits = addOne(this.currentEncounter.correctHits);
      this._enqueue("cut", { symbolId: id });
      this.save();
      this._masteryChanged(id, before);
      this._emit({ type: "encounter_hit", symbolId: id });
      return true;
    }

    recordWrongAttempt(symbolId) {
      // symbolIdは誤答札のID。現在のお題のEncounterを失敗候補にする。
      if (!this._canRecord()) return false;
      this.currentEncounter.hadWrongAttempt = true;
      this._emit({ type: "encounter_wrong", symbolId: this.currentEncounter.symbolId,
        attemptedSymbolId: this.catalog.canonicalId(symbolId) });
      return true;
    }

    pauseEncounter() {
      if (!this._canRecord()) return;
      this.currentEncounter.pausedByZone = true;
      this._emit({ type: "encounter_paused", symbolId: this.currentEncounter.symbolId });
    }

    resumeEncounter() {
      if (!this.progressEnabled || !this.currentEncounter || this.currentEncounter.finalized) return;
      this.currentEncounter.pausedByZone = false;
      this._emit({ type: "encounter_resumed", symbolId: this.currentEncounter.symbolId });
    }

    finalizeEncounter(reason) {
      if (reason !== "target_end" && reason !== "game_end") { this.cancelEncounter(reason); return null; }
      if (!this._canRecord()) return null;
      const encounter = this.currentEncounter;
      encounter.finalized = true;
      this.stats.finalizedCount += 1;
      const success = encounter.correctHits >= 1 && !encounter.hadWrongAttempt;
      if (success) {
        const previousUnlocks = new Set(this.getPendingUnlocks().map((event) => event.id));
        const before = this.getMasteryState(encounter.symbolId);
        this._enqueue("success", { symbolId: encounter.symbolId });
        this.stats.successCount += 1;
        this._masteryChanged(encounter.symbolId, before);
        for (const event of this.getPendingUnlocks()) if (!previousUnlocks.has(event.id)) this._emit(event);
      }
      // 追加の正解枚数は統計のみ。失敗したEncounterでも正式なcut統計は保存する。
      this.save();
      const result = { type: "encounter_finalized", reason, symbolId: encounter.symbolId,
        correctHits: encounter.correctHits, hadWrongAttempt: encounter.hadWrongAttempt, success };
      this._emit(result);
      return result;
    }

    cancelEncounter(reason) {
      if (this.currentEncounter && !this.currentEncounter.finalized) {
        this.currentEncounter.finalized = true;
        this._emit({ type: "encounter_cancelled", reason: reason || "cancel", symbolId: this.currentEncounter.symbolId });
      }
      this.currentEncounter = null;
    }

    getSymbolProgress(symbolId) {
      const id = this.catalog.canonicalId(symbolId);
      return id ? copy(this.data.symbols[id]) : null;
    }

    getMasteryState(symbolId) {
      const progress = this.getSymbolProgress(symbolId);
      if (!progress) return "unknown";
      if (progress.successfulEncounters >= config.MASTER_THRESHOLD) return "master";
      if (progress.successfulEncounters >= config.ACQUIRE_THRESHOLD) return "acquired";
      if (progress.totalCorrectCuts >= config.DISCOVER_THRESHOLD) return "discovered";
      return "unknown";
    }

    _stageComplete(rank, stage) {
      const data = this.stages.getStage(rank, stage);
      return Boolean(data && !data.reserved && data.symbolIds.length === data.expectedSymbols && data.expectedSymbols > 0 &&
        data.symbolIds.every((id) => {
          const entry = this.catalog.get(id), progress = this.data.symbols[id];
          return entry && entry.implemented && progress && progress.successfulEncounters >= config.ACQUIRE_THRESHOLD;
        }));
    }

    _rankComplete(rank) {
      const data = this.stages.getRank(rank);
      return Boolean(data && data.stages.length === 4 && data.expectedSymbols === 20 &&
        data.stages.every((stage) => this._stageComplete(rank, stage.stageNumber)));
    }

    isRankUnlocked(rank) {
      const index = this.stages.order.indexOf(rank);
      if (index < 0) return false;
      if (index === 0) return true;
      if (this.data.retainedUnlocks.includes("rank_" + rank)) return true;
      return this.isRankUnlocked(this.stages.order[index - 1]) && this._rankComplete(this.stages.order[index - 1]);
    }

    isStageUnlocked(rank, stage) {
      const data = this.stages.getStage(rank, stage);
      if (!data || !this.isRankUnlocked(rank)) return false;
      if (this.data.retainedUnlocks.includes(rank + "_stage_" + stage)) return true;
      return stage === 1 || this.isStageUnlocked(rank, stage - 1) && this._stageComplete(rank, stage - 1);
    }

    getStageProgress(rank, stage) {
      const data = this.stages.getStage(rank, stage);
      if (!data) return null;
      const symbols = data.symbolIds.map((id) => this.getSymbolProgress(id));
      const playable = !data.reserved && data.symbolIds.length === data.expectedSymbols &&
        data.symbolIds.every((id) => this.catalog.get(id) && this.catalog.get(id).implemented);
      return { rank, stage, totalSymbols: data.expectedSymbols,
        discoveredCount: symbols.filter((p) => p && p.totalCorrectCuts >= config.DISCOVER_THRESHOLD).length,
        acquiredCount: symbols.filter((p) => p && p.successfulEncounters >= config.ACQUIRE_THRESHOLD).length,
        masterCount: symbols.filter((p) => p && p.successfulEncounters >= config.MASTER_THRESHOLD).length,
        unlocked: this.isStageUnlocked(rank, stage), completed: this._stageComplete(rank, stage), playable };
    }

    getAllSymbolProgress() {
      return this.catalog.entries.map((entry) => Object.assign({}, entry, this.getSymbolProgress(entry.id),
        { masteryState: this.getMasteryState(entry.id) }));
    }

    getSymbolsWithProgress(rank, stage) {
      return this.getAllSymbolProgress().filter((entry) => entry.rank === rank && (stage === undefined || entry.stage === stage));
    }

    _allUnlockIds() {
      const ids = [];
      this.stages.order.forEach((rank, index) => {
        if (index) ids.push("rank_" + rank);
        for (const stage of this.stages.getRank(rank).stages) if (stage.stageNumber > 1) ids.push(rank + "_stage_" + stage.stageNumber);
      });
      return ids;
    }

    getPendingUnlocks() {
      const events = [], announced = new Set(this.data.announcedUnlocks);
      this.stages.order.forEach((rank, index) => {
        if (index && this.isRankUnlocked(rank)) events.push({ type: "rank_unlock", rank, id: "rank_" + rank });
        for (const stage of this.stages.getRank(rank).stages) {
          if (stage.stageNumber > 1 && this.isStageUnlocked(rank, stage.stageNumber)) {
            events.push({ type: "stage_unlock", rank, stage: stage.stageNumber, id: rank + "_stage_" + stage.stageNumber });
          }
        }
      });
      return events.filter((event) => !announced.has(event.id));
    }

    getUnlockPresentation(event) {
      const rank = this.stages.getRank(event.rank);
      if (!rank) return null;
      if (event.type === "rank_unlock") return { title: rank.name, subtitle: "かいほう！", variant: "rank" };
      const stage = this.stages.getStage(event.rank, event.stage);
      return stage ? { title: rank.name.replace(/の巻$/, "") + "・" + stage.displayName, subtitle: "かいほう！", variant: "stage" } : null;
    }

    markUnlockAnnounced(id) {
      if (!this.progressEnabled || !this.getPendingUnlocks().some((event) => event.id === id)) return false;
      this._enqueue("announce", { id });
      this.save(); this._emit({ type: "unlock_announced", id });
      return true;
    }

    resetProgress() {
      if (this.readOnly || !this.progressEnabled) return false;
      this.refresh(); this.cancelEncounter("reset"); this._enqueue("reset");
      this.save(); this._emit({ type: "progress_reset" });
      return true;
    }

    getSnapshot() { return copy(this.data); }
    getDebugState() {
      return Object.assign({}, this.stats, { enabled: this.progressEnabled, readOnly: this.readOnly,
        storageAvailable: Boolean(this.repository && !this.storageUnavailable),
        pendingOperations: this.pending.length, saving: Boolean(this.saveTask), saveProblem: this.saveProblem,
        revision: this.data.persistence.revision,
        currentEncounter: this.currentEncounter ? copy(this.currentEncounter) : null,
        pendingUnlocks: this.getPendingUnlocks() });
    }
    _masteryChanged(symbolId, before) {
      const after = this.getMasteryState(symbolId);
      if (before !== after) this._emit({ type: "mastery_changed", symbolId, from: before, to: after });
    }
    _emit(event) {
      if (this.onEvent) this.onEvent(copy(event));
      this._notifySaveState();
    }
  }
  app.ProgressRepository = ProgressRepository;
  app.ProgressManager = ProgressManager;
})();
