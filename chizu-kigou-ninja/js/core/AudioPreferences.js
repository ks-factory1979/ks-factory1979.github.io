(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};
  // 音設定専用。学習・小判・装備の保存キーには触れない。
  class AudioPreferences {
    constructor(storage) {
      this.storage = storage || null;
      if (!this.storage) { try { this.storage = window.localStorage; } catch (_error) { /* メモリ内の設定で続行。 */ } }
      this.key = "chizuKigouNinja_audio_v1";
      this.listeners = new Set();
      this.value = { version: 1, bgmEnabled: true, sfxEnabled: true, bgmVolume: 0.22 };
      try {
        const saved = JSON.parse(this.storage.getItem(this.key));
        if (saved && saved.version === 1) this._assign(saved);
      } catch (_error) { /* 保存不可・破損時は初期値で遊べる。 */ }
    }
    _assign(next) {
      ["bgmEnabled", "sfxEnabled"].forEach(key => {
        if (typeof next[key] === "boolean") this.value[key] = next[key];
      });
      if (typeof next.bgmVolume === "number" && Number.isFinite(next.bgmVolume)) {
        this.value.bgmVolume = Math.max(0, Math.min(0.5, next.bgmVolume));
      }
    }
    get() { return Object.assign({}, this.value); }
    set(next) {
      this._assign(next || {});
      try { this.storage.setItem(this.key, JSON.stringify(this.value)); } catch (_error) { /* セッション内では有効。 */ }
      this.listeners.forEach(fn => fn(this.get()));
      return this.get();
    }
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  }
  NinjaCore.AudioPreferences = AudioPreferences;
})();
