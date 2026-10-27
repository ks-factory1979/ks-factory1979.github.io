(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};
  class BGMManager {
    constructor(audio, tracks, preferences) {
      this.audio = audio; this.tracks = tracks || {}; this.preferences = preferences;
      this.buffers = {}; this.errors = {}; this.loads = {}; this.cacheOrder = [];
      this.bus = null; this.voice = null; this.retiring = null; this.timer = null;
      this.session = null; this.serial = 0; this.revision = 0;
      this.sceneOwner = null; this.releaseTimer = null; this.pendingResult = null; this.completed = false;
      this.desired = "normal"; this.offsets = { normal: 0, zone: 0 };
      this.pauses = new Set(); this.scenePauses = new Set();
      this.sources = new Set(); this.starts = { normal: 0, zone: 0 }; this.maxSources = 0;
      this.onHidden = () => this.setPaused("hidden", document.hidden);
      this.onBlur = () => this.setPaused("blur", true);
      this.onFocus = () => { this.setPaused("blur", false); this.onHidden(); };
      this.onContext = () => this.setPaused("context", this.audio.context.state !== "running");
      document.addEventListener("visibilitychange", this.onHidden);
      window.addEventListener("blur", this.onBlur); window.addEventListener("focus", this.onFocus);
      if (document.hidden) this.pauses.add("hidden");
      this.unsubscribePrefs = preferences.subscribe(() => { this._volume(); this._reconcile(); });
      this.unsubscribeMute = audio.subscribeMute(() => this._reconcile());
    }
    prepare(keys) {
      const ctx = this.audio.context;
      // AudioContextは既存のユーザー操作によるunlockだけで作成する。
      if (!ctx || ctx.state === "closed") return Promise.resolve(false);
      if (!this.bus) {
        this.bus = ctx.createGain(); this.bus.connect(this.audio.output); this._volume();
        ctx.addEventListener("statechange", this.onContext); this.onContext();
      }
      const requested = Array.isArray(keys) ? keys : [this.desired];
      return Promise.all(requested.filter(key => this.tracks[key]).map(key => {
        if (this.buffers[key]) return Promise.resolve(true);
        if (this.loads[key]) return this.loads[key];
        if (this.errors[key]) return Promise.resolve(false);
        const load = (async () => {
        try {
          const encoded = this.tracks[key].dataUri.split(",")[1];
          const bytes = Uint8Array.from(window.atob(encoded), char => char.charCodeAt(0));
          const buffer = await new Promise((resolve, reject) => {
            const result = ctx.decodeAudioData(bytes.buffer, resolve, reject);
            if (result && result.then) result.then(resolve, reject);
          });
          if (!(buffer.duration > 0)) throw new Error("Empty BGM");
          this.buffers[key] = buffer;
          this.cacheOrder = this.cacheOrder.filter(value => value !== key).concat(key);
          this._reconcile();
          this._trimBuffers();
          return true;
        } catch (error) { this.errors[key] = String(error && error.message || error); return false; }
        })();
        this.loads[key] = load;
        load.then(() => { if (this.loads[key] === load) delete this.loads[key]; });
        return load;
      })).then(values => values.some(Boolean));
    }
    _trimBuffers() {
      const keep = new Set([this.desired, this.voice && this.voice.key, this.retiring && this.retiring.key]);
      if (this.session && this.session.kind === "training") { keep.add("normal"); keep.add("zone"); }
      while (Object.keys(this.buffers).length > 3) {
        const key = this.cacheOrder.find(value => !keep.has(value));
        if (!key) break;
        delete this.buffers[key]; this.cacheOrder = this.cacheOrder.filter(value => value !== key);
      }
    }
    enterScene(scene) {
      const restarting = this.releaseTimer !== null;
      if (this.releaseTimer !== null) window.clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
      const name = scene.sys.settings.key;
      let key = BGMManager.sceneTracks[name];
      if (name === "ResultScene") {
        const sameResult = this.sceneOwner === scene && this.session && this.desired === "result";
        if (sameResult && !restarting) return;
        key = sameResult || this.pendingResult !== null && !scene.returnedFromBook ? "result" : null;
        this.pendingResult = null;
      } else this.pendingResult = null;
      if (!key) { this.end(); this.sceneOwner = null; return; }
      if (!this.session || this.session.kind !== "menu" || this.desired !== key) {
        this._cancelPending();
        this.session = { id: ++this.serial, kind: "menu" };
        this.desired = key; this.offsets = { [key]: 0 }; this.completed = false;
      }
      this.sceneOwner = scene; this.scenePauses.clear();
      const token = this.session;
      const pause = () => { if (this.sceneOwner === scene) this.pauseScene(token, "scene", true); };
      const resume = () => { if (this.sceneOwner === scene) this.pauseScene(token, "scene", false); };
      scene.events.on("pause", pause); scene.events.on("sleep", pause);
      scene.events.on("resume", resume); scene.events.on("wake", resume);
      scene.events.once("shutdown", () => {
        scene.events.off("pause", pause); scene.events.off("sleep", pause);
        scene.events.off("resume", resume); scene.events.off("wake", resume);
        if (this.sceneOwner !== scene) return;
        // 次Sceneのcreateを待ち、同じ曲ならタイトル/修行選択間で流し続ける。
        this.releaseTimer = window.setTimeout(() => {
          this.releaseTimer = null;
          if (this.sceneOwner === scene) { this.end(token); this.sceneOwner = null; }
        }, 0);
      });
      const warm = name === "TrainingSelectScene" ? [key, "normal", "zone"] : [key];
      this.prepare(warm).catch(() => false); this._reconcile();
    }
    complete(token, natural) {
      if (token && token === this.session) this.pendingResult = natural ? token.id : null;
    }
    pauseShop(practicing) {
      if (this.session && this.desired === "shop") this.pauseScene(this.session, "practice", practicing);
    }
    begin() {
      this.end();
      const token = { id: ++this.serial, kind: "training" };
      this.session = token; this.desired = "normal";
      this.pendingResult = null; this.completed = false; this.sceneOwner = null;
      this.offsets = { normal: 0, zone: 0 }; this.scenePauses.clear();
      this.prepare(["normal", "zone"]).catch(() => false); this._reconcile();
      return token;
    }
    zone(token, active) {
      if (!token || token !== this.session) return;
      const next = active ? "zone" : "normal";
      if (next === this.desired) return;
      if (active) this.offsets.zone = 0;
      this.desired = next; this.prepare(["normal", "zone"]).catch(() => false); this._reconcile();
    }
    pauseScene(token, reason, paused) {
      if (!token || token !== this.session) return;
      if (paused) this.scenePauses.add(reason); else this.scenePauses.delete(reason);
      this._reconcile();
    }
    setPaused(reason, paused) {
      if (paused) this.pauses.add(reason); else this.pauses.delete(reason);
      this._reconcile();
    }
    end(token) {
      if (token && token !== this.session) return;
      this.session = null; this._cancelPending(); this._stopCurrent(false);
      if (this.releaseTimer !== null) window.clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
      this.offsets = { normal: 0, zone: 0 }; this.scenePauses.clear();
    }
    _canPlay() {
      return this.session && !this.completed && this.preferences.get().bgmEnabled && !this.audio.isMuted() &&
        !this.pauses.size && !this.scenePauses.size && this.audio.context && this.audio.context.state === "running";
    }
    _loop(key) { return Math.min(this.buffers[key].duration, this.tracks[key].loopSeconds || this.buffers[key].duration); }
    _position(voice, at) {
      const position = voice.offset + Math.max(0, at - voice.startedAt), length = this._loop(voice.key);
      return this.tracks[voice.key].loop === false ? Math.min(position, length) : position % length;
    }
    _volume() { if (this.bus) this.bus.gain.value = this.preferences.get().bgmVolume; }
    _dispose(voice) {
      if (!voice) return;
      voice.stoppedByManager = true;
      try { voice.source.stop(); } catch (_error) { /* already stopped */ }
      try { voice.source.disconnect(); voice.gain.disconnect(); } catch (_error) { /* disposed */ }
      this.sources.delete(voice.source);
    }
    _cancelPending() {
      this.revision++;
      if (this.timer !== null) window.clearTimeout(this.timer);
      this.timer = null;
      if (this.retiring) { this._dispose(this.retiring); this.retiring = null; }
    }
    _stopCurrent(remember) {
      if (!this.voice) return;
      if (remember) this.offsets[this.voice.key] = this._position(this.voice, this.audio.context.currentTime);
      this._dispose(this.voice); this.voice = null;
    }
    _reconcile() {
      if (!this._canPlay()) { this._cancelPending(); this._stopCurrent(true); return; }
      const key = this.buffers[this.desired] ? this.desired : (this.desired === "zone" && this.buffers.normal ? "normal" : null);
      if (!key) {
        this._cancelPending(); this._stopCurrent(true);
        return; // 復号待ちでもゲームは進む。別画面の曲は残さない。
      }
      if (this.voice && this.voice.key === key) return;
      if (this.timer !== null && this.pendingKey === key) return;
      this._cancelPending();
      const rev = this.revision, ctx = this.audio.context;
      const start = () => {
        this.timer = null;
        if (rev !== this.revision || !this._canPlay()) return;
        if (this.retiring) { this._dispose(this.retiring); this.retiring = null; }
        const length = this._loop(key), loop = this.tracks[key].loop !== false;
        const offset = this.offsets[key] || 0;
        if (!loop && offset >= length) { this.completed = true; return; }
        const source = ctx.createBufferSource(), gain = ctx.createGain(), now = ctx.currentTime;
        source.buffer = this.buffers[key]; source.loop = loop; source.loopStart = 0; source.loopEnd = length;
        const level = this.tracks[key].gain === undefined ? 1 : this.tracks[key].gain;
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(level, now + 0.12);
        source.connect(gain); gain.connect(this.bus);
        const voice = { source, gain, key, startedAt: now, offset: loop ? offset % length : offset, level };
        source.onended = () => {
          this.sources.delete(source); source.disconnect(); gain.disconnect();
          if (!voice.stoppedByManager && !loop && this.voice === voice) {
            this.voice = null; this.completed = true; this.offsets[key] = length;
          }
        };
        this.voice = voice; this.sources.add(source); this.maxSources = Math.max(this.maxSources, this.sources.size);
        this.starts[key] = (this.starts[key] || 0) + 1; source.start(now, voice.offset);
        this.cacheOrder = this.cacheOrder.filter(value => value !== key).concat(key); this._trimBuffers();
      };
      if (this.voice) {
        const old = this.voice, now = ctx.currentTime;
        // 短いフェードのあとに切替。2曲を同時に鳴らさない。
        this.offsets[old.key] = this._position(old, now + 0.08);
        old.stoppedByManager = true;
        old.gain.gain.cancelScheduledValues(now); old.gain.gain.setValueAtTime(old.gain.gain.value, now);
        old.gain.gain.linearRampToValueAtTime(0, now + 0.08); old.source.stop(now + 0.08);
        this.voice = null; this.retiring = old; this.pendingKey = key;
        this.timer = window.setTimeout(start, 85);
      } else start();
    }
    duck() {
      if (!this.voice || !this._canPlay() || !this.preferences.get().sfxEnabled) return;
      const now = this.audio.context.currentTime, voice = this.voice, param = voice.gain.gain;
      param.cancelScheduledValues(now); param.setValueAtTime(Math.min(param.value, voice.level), now);
      param.linearRampToValueAtTime(voice.level * 0.55, now + 0.018);
      param.setValueAtTime(voice.level * 0.55, now + 0.12);
      param.linearRampToValueAtTime(voice.level, now + 0.30);
    }
    getState() {
      return { session: this.session && this.session.id, desired: this.desired,
        playing: this.voice && this.voice.key, position: this.voice ? this._position(this.voice, this.audio.context.currentTime) : null,
        offsets: Object.assign({}, this.offsets), sources: this.sources.size, maxSources: this.maxSources,
        starts: Object.assign({}, this.starts), loaded: Object.keys(this.buffers), errors: Object.assign({}, this.errors),
        loading: Object.keys(this.loads), completed: this.completed,
        pauses: Array.from(this.pauses).concat(Array.from(this.scenePauses)),
        muted: this.audio.isMuted(), settings: this.preferences.get(), context: this.audio.context && this.audio.context.state };
    }
    destroy() {
      this.end(); this.unsubscribePrefs(); this.unsubscribeMute();
      document.removeEventListener("visibilitychange", this.onHidden);
      window.removeEventListener("blur", this.onBlur); window.removeEventListener("focus", this.onFocus);
      if (this.audio.context) this.audio.context.removeEventListener("statechange", this.onContext);
      if (this.bus) this.bus.disconnect();
    }
  }
  BGMManager.sceneTracks = Object.freeze({ TitleScene: "title", TrainingSelectScene: "title", HowToScene: "title",
    SwordSelectScene: "shop", NinjutsuBookScene: "book" });
  NinjaCore.BGMManager = BGMManager;
})();
