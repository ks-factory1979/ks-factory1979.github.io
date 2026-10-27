(function () {
  "use strict";
  const app = MapSymbolNinja;
  const copy = value => JSON.parse(JSON.stringify(value));
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  const defaults = () => ({ schemaVersion: 1, revision: 0, wallet: 0,
    ownedSwords: ["none"], equippedSword: "none", rewardReceipts: [] });
  let serial = 0;
  class EconomyManager {
    constructor(options) {
      const o = options || {};
      this.development = Boolean(o.development);
      this.key = this.development ? "chizuKigouNinja_economy_dev_v1" : "chizuKigouNinja_economy_v1";
      this.backupKey = this.key + "_backup";
      this.now = o.now || (() => performance.now());
      this.locks = null;
      try { this.locks = Object.hasOwn(o, "locks") ? o.locks : window.navigator && window.navigator.locks; } catch (_) {}
      this.storage = null;
      try { this.storage = Object.hasOwn(o, "storage") ? o.storage : window.localStorage; } catch (_) {}
      this.data = defaults(); this.problem = null; this.problemCode = null; this.listeners = new Set();
      this.queue = Promise.resolve(); this.runs = new WeakMap(); this.claims = new Map(); this.checkTask = null; this.checking = false;
      this.load();
      if (window.addEventListener) window.addEventListener("storage", e => {
        if (e.key === this.key || e.key === null) { this.load(); this._emit(); }
      });
    }
    static calculateReward(score) {
      const safe = typeof score === "number" && Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
      return { completion: 5, scoreBonus: Math.floor(safe / 500), amount: 5 + Math.floor(safe / 500), score: safe };
    }
    _validate(raw) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw.schemaVersion !== 1 ||
        !integer(raw.wallet)) throw new Error("invalid-save");
      const value = defaults();
      value.wallet = raw.wallet; value.revision = integer(raw.revision) ? raw.revision : 0;
      if (Array.isArray(raw.ownedSwords)) value.ownedSwords = Array.from(new Set(["none",
        ...raw.ownedSwords.filter(id => app.SwordCatalog.has(id))]));
      value.equippedSword = value.ownedSwords.includes(raw.equippedSword) ? raw.equippedSword : "none";
      if (raw.rewardReceipts !== undefined && !Array.isArray(raw.rewardReceipts)) throw new Error("invalid-receipts");
      const ids = new Set();
      for (const receipt of raw.rewardReceipts || []) {
        if (!receipt || typeof receipt.runId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(receipt.runId) ||
          !integer(receipt.score) || !integer(receipt.amount) ||
          receipt.amount !== EconomyManager.calculateReward(receipt.score).amount || ids.has(receipt.runId)) throw new Error("invalid-receipts");
        ids.add(receipt.runId); value.rewardReceipts.push({ runId: receipt.runId, score: receipt.score, amount: receipt.amount });
      }
      return value;
    }
    _problem(code) {
      const messages = {
        "locks-unavailable": "この環境では小判を安全に保存できません。刀の購入・装備変更はできません。先生やおうちの人に知らせてね。",
        "storage-unavailable": "この環境では小判の保存先を使えません。刀の購入・装備変更はできません。先生やおうちの人に知らせてね。",
        "saved-data-unavailable": "小判の保存データを確認できません。購入・装備変更を止めています。先生やおうちの人に知らせてね。",
        "storage-write-failed": "小判を保存できません。保存環境を確認するまで、刀の購入・装備変更を止めています。",
        "transaction-failed": "小判の保存を確認できませんでした。保存環境と所持数を確認してね。"
      };
      this.problemCode = code; this.problem = code ? messages[code] : null;
    }
    // 財布には触れず、一意な一時キーだけで書込・読込・削除の可否を確認する。
    _probeWrite() {
      const id = window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() :
        Date.now().toString(36) + "-" + (++serial) + "-" + Math.random().toString(36).slice(2);
      const key = this.key + "_check_" + id;
      if (this.storage.getItem(key) !== null) throw new Error("probe-key-exists");
      try {
        this.storage.setItem(key, id);
        if (this.storage.getItem(key) !== id) throw new Error("probe-write-unconfirmed");
      } finally { this.storage.removeItem(key); }
      if (this.storage.getItem(key) !== null) throw new Error("probe-cleanup-unconfirmed");
    }
    load(checkWrite) {
      let code = null;
      try {
        if (!this.storage) throw new Error("storage-unavailable");
        const raw = this.storage.getItem(this.key);
        this.data = raw === null ? defaults() : this._validate(JSON.parse(raw));
      } catch (_) { code = this.storage ? "saved-data-unavailable" : "storage-unavailable"; }
      if (!code && (!this.locks || typeof this.locks.request !== "function")) code = "locks-unavailable";
      if (!code && checkWrite) {
        try { this._probeWrite(); } catch (_) { code = "storage-write-failed"; }
      }
      if (!code && !checkWrite && ["storage-write-failed", "transaction-failed"].includes(this.problemCode)) code = this.problemCode;
      this._problem(code);
      this._qa(); return this.getState();
    }
    checkAvailability() {
      if (this.checkTask) return this.checkTask;
      this.checking = true;
      const check = async () => {
        if (!this.locks || typeof this.locks.request !== "function") { this.load(); return; }
        try { await this.locks.request(this.key, () => this.load(true)); }
        catch (_) { this._problem("transaction-failed"); }
      };
      // 能力確認も取引と同じキューとロック内で実行する。再確認で購入や報酬を勝手に再実行しない。
      this.checkTask = this.queue.then(check, check).then(() => {
        this.checking = false; this.checkTask = null; this._emit(); return this.getState();
      });
      this.queue = this.checkTask.catch(() => {}); this._emit(); return this.checkTask;
    }
    getState() { return Object.assign(copy(this.data), { development: this.development, problem: this.problem, problemCode: this.problemCode, checking: this.checking }); }
    getReceipt(id) { const r = this.data.rewardReceipts.find(r => r.runId === id); return r ? copy(r) : null; }
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    _emit() { this._qa(); this.listeners.forEach(fn => { try { fn(this.getState()); } catch (_) { console.warn("[Economy] status listener unavailable"); } }); }
    _qa() { if (window.__NINJA_QA) window.__NINJA_QA.economy = this.getState(); }
    _transaction(change) {
      const execute = async () => {
        if (!this.locks || typeof this.locks.request !== "function") {
          this._problem("locks-unavailable"); this._emit();
          return { status: "save-failed", persisted: false, state: this.getState() };
        }
        try {
          return await this.locks.request(this.key, () => {
            this.load();
            if (this.problem) { this._emit(); return { status: "save-failed", persisted: false, state: this.getState() }; }
            const next = copy(this.data), result = change(next);
            if (!result.changed) return Object.assign(result, { persisted: true, state: this.getState() });
            if (!integer(next.wallet) || !integer(next.revision + 1)) return { status: "limit", persisted: false, state: this.getState() };
            next.revision++;
            const text = JSON.stringify(next), before = this.storage.getItem(this.key);
            // Backup is supplementary; balance, ownership, equipment and receipts commit in one primary write.
            if (before !== null) try { this.storage.setItem(this.backupKey, before); } catch (_) {}
            this.storage.setItem(this.key, text);
            if (this.storage.getItem(this.key) !== text) throw new Error("write-conflict");
            this.data = next; this._emit();
            return Object.assign(result, { persisted: true, state: this.getState() });
          });
        } catch (_) { this._problem("transaction-failed"); this._emit(); return { status: "save-failed", persisted: false, state: this.getState() }; }
      };
      const task = this.queue.then(execute, execute);
      this.queue = task.catch(() => {}); return task;
    }
    purchase(id) {
      return this._transaction(next => {
        const item = app.SwordCatalog.get(id);
        if (!app.SwordCatalog.has(id)) return { status: "invalid", changed: false };
        if (next.ownedSwords.includes(id)) return { status: "owned", changed: false };
        if (next.wallet < item.price) return { status: "insufficient", changed: false };
        next.wallet -= item.price; next.ownedSwords.push(id); next.equippedSword = id;
        return { status: "purchased", changed: true, id, paid: item.price };
      });
    }
    equip(id) {
      return this._transaction(next => {
        if (!app.SwordCatalog.has(id) || !next.ownedSwords.includes(id)) return { status: "unowned", changed: false };
        if (next.equippedSword === id) return { status: "equipped", changed: false, id };
        next.equippedSword = id; return { status: "equipped", changed: true, id };
      });
    }
    beginRun(eligible) {
      const id = window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() :
        "run-" + Date.now().toString(36) + "-" + (++serial).toString(36) + "-" + Math.random().toString(36).slice(2);
      const token = Object.freeze({ id });
      this.runs.set(token, { eligible: Boolean(eligible && !this.development), started: null, activeMs: 0, promise: null });
      return token;
    }
    startRun(token) { const r = this.runs.get(token); if (r && r.started === null) r.started = this.now(); }
    advanceRun(token, consumedMs) {
      const r = this.runs.get(token);
      if (r && r.started !== null && !r.promise && Number.isFinite(consumedMs)) r.activeMs += Math.max(0, Math.min(80, consumedMs));
    }
    cancelRun(token) { const r = this.runs.get(token); if (r && !r.promise) r.eligible = false; }
    finishRun(token, score, natural) {
      const run = this.runs.get(token);
      if (!run) return Promise.resolve({ status: "ineligible", amount: 0 });
      if (run.promise) return run.promise;
      const eligible = run.eligible && natural === true && run.started !== null &&
        run.activeMs >= 59999.9 && this.now() - run.started >= 59950;
      if (!eligible) { run.eligible = false; run.promise = Promise.resolve({ status: "ineligible", amount: 0, runId: token.id }); return run.promise; }
      const reward = EconomyManager.calculateReward(score);
      if (!integer(reward.amount) || !integer(reward.score)) { run.promise = Promise.resolve({ status: "ineligible", amount: 0 }); return run.promise; }
      this.claims.set(token.id, { runId: token.id, score: reward.score, amount: reward.amount });
      run.promise = this.retryReward(token.id);
      return run.promise;
    }
    async retryReward(id) {
      const claim = this.claims.get(id);
      if (!claim) {
        const receipt = this.getReceipt(id);
        return receipt ? Object.assign({ status: "already-awarded", wallet: this.data.wallet }, receipt) : { status: "ineligible", amount: 0 };
      }
      const result = await this._transaction(next => {
        if (next.rewardReceipts.some(r => r.runId === id)) return { status: "already-awarded", changed: false };
        if (!integer(next.wallet + claim.amount)) return { status: "limit", changed: false };
        next.wallet += claim.amount; next.rewardReceipts.push(copy(claim));
        return { status: "awarded", changed: true };
      });
      const success = ["awarded", "already-awarded"].includes(result.status);
      if (success) this.claims.delete(id);
      const reward = EconomyManager.calculateReward(claim.score);
      return { runId: id, claimId: id, status: result.status, amount: success ? claim.amount : 0,
        pendingReward: success ? 0 : claim.amount, completion: reward.completion, scoreBonus: reward.scoreBonus,
        wallet: result.state.wallet };
    }
    devSet(wallet, owned) {
      if (!this.development || !integer(wallet)) return Promise.resolve({ status: "forbidden" });
      return this._transaction(next => {
        next.wallet = wallet; next.ownedSwords = Array.from(new Set(["none", ...(owned || []).filter(id => app.SwordCatalog.has(id))]));
        if (!next.ownedSwords.includes(next.equippedSword)) next.equippedSword = "none";
        next.rewardReceipts = [];
        return { status: "dev-set", changed: true };
      });
    }
  }
  app.EconomyManager = EconomyManager;
})();

