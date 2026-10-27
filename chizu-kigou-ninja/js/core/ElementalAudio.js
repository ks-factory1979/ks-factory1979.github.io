(function () {
  "use strict";
  class ElementalAudio {
    constructor(manager) {
      this.manager = manager; this.buffers = {}; this.voices = new Set(); this.loading = null;
      this.issenPlayed = false;
      this.previewToken = 0;
      this.stats = { ready: 0, failed: [], requests: 0, played: 0, coalesced: 0, suppressed: 0, peakVoices: 0, last: null };
    }
    prepare() {
      if (this.loading) return this.loading;
      const data = window.MapSymbolNinja.ElementalAudioData || {};
      const jobs = [];
      for (const [element, candidates] of Object.entries(data)) for (const [candidate, entry] of Object.entries(candidates)) {
        for (const [variant, clip] of Object.entries(entry.variants)) {
          const key = [element, candidate, variant].join(":");
          jobs.push(Promise.resolve().then(() => this.manager._decodeAudioData(this.manager._base64ToArrayBuffer(clip.base64)))
            .then(buffer => { this.buffers[key] = buffer; this.stats.ready++; })
            .catch(() => { this.stats.failed.push(key); }));
        }
      }
      this.loading = Promise.all(jobs).then(() => { this._qa(); return this.stats.ready > 0; });
      return this.loading;
    }
    beginSwipe() { this.issenPlayed = false; }
    endSwipe() { this.issenPlayed = false; }
    slashScale(settings, variant) {
      const preferences = MapSymbolNinja.ElementalSoundPreferences.forGame();
      const element = settings.element, candidate = preferences.candidates[element];
      if (!preferences.volume || !this.buffers[[element, candidate, "normal"].join(":")]) return 1;
      // Keep the original ZONE issen as the lead sound; ordinary attribute cuts lead with their element.
      if (settings.zone && variant === "issen") return 1;
      return variant === "issen" ? Math.min(1, preferences.slashVolume + .10) : preferences.slashVolume;
    }
    play(settings) {
      const m = this.manager, element = settings.element;
      if (m.muted || !m.context || m.context.state === "closed" || element === "none") return false;
      const preferences = MapSymbolNinja.ElementalSoundPreferences.forGame();
      const candidate = settings.candidate || preferences.candidates[element];
      const type = settings.type || "normal", zone = type.startsWith("zone_");
      const issen = type.endsWith("issen"), firstIssen = issen && !this.issenPlayed;
      // Later cuts in a held swipe retain an attribute body after its one issen accent.
      const variant = firstIssen && !zone ? "issen" : type === "critical" ? "critical" : "normal";
      const buffer = this.buffers[[element, candidate, variant].join(":")];
      if (!buffer || preferences.volume <= 0) return false;
      const at = m.context.currentTime;
      if (settings.preview) this.stop();
      this.stats.requests++;
      const cap = zone ? 2 : 4;
      const compatible = Array.from(this.voices).reverse().find(voice =>
        voice.element === element && voice.candidate === candidate && voice.zone === zone &&
        voice.duration - (at - voice.at) > .10);
      const oldest = this.voices.values().next().value;
      // Merge dense hits into a sound that is still playing. Never reject a cut by timestamp alone.
      // In ZONE, give the recorded body 220ms before replacing it at the voice cap.
      const merge = !settings.preview && compatible && (
        (issen && !firstIssen) ||
        ((compatible.variant === variant || zone) && at - compatible.at < (zone ? .075 : .055)) ||
        (this.voices.size >= cap && at - oldest.at < (zone ? .22 : .18)));
      if (issen) this.issenPlayed = true;
      if (merge) {
        const level = this._level(preferences, type, zone, this.voices.size - 1);
        compatible.gain.gain.cancelScheduledValues(at);
        compatible.gain.gain.setTargetAtTime(level, at, .008);
        this.stats.coalesced++;
        this._record(compatible, type, level, at, true);
        return true;
      }
      while (this.voices.size >= cap) this._dispose(this.voices.values().next().value, true);
      const source = m.context.createBufferSource(), gain = m.context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = settings.preview ? 1 : .985 + Math.random() * .03;
      const level = this._level(preferences, type, zone, this.voices.size);
      const duration = buffer.duration;
      gain.gain.value = level;
      const voice = { source, gain, element, candidate, zone, variant, at, duration };
      source.connect(gain); gain.connect(m.attributeBus || m.master);
      source.onended = () => this._dispose(voice, false);
      this.voices.add(voice);
      try { source.start(at, 0, duration); } catch (_) { this._dispose(voice, false); return false; }
      this.stats.played++;
      this.stats.peakVoices = Math.max(this.stats.peakVoices, this.voices.size);
      this._record(voice, type, level, at, false); return true;
    }
    _level(preferences, type, zone, others) {
      const strength = type === "critical" ? 1.10 : type.endsWith("issen") ? (zone ? 1.08 : 1.12) : 1;
      return 1.02 * preferences.volume * (zone ? .90 : 1) * strength / Math.sqrt(1 + Math.max(0, others) * .65);
    }
    _record(voice, type, level, at, coalesced) {
      this.stats.last = { element: voice.element, candidate: voice.candidate, type, variant: voice.variant,
        at, gain: level, duration: voice.duration, startedAt: voice.at, coalesced };
      this._qa();
    }
    async preview(element, candidate, type, mixed) {
      const token = ++this.previewToken;
      await this.manager.unlock();
      if (token !== this.previewToken) return false;
      if (mixed) {
        this.manager.beginSwipe();
        this.manager.play("slash", { combo: type.endsWith("issen") ? 10 : type === "critical" ? 3 : 1,
          element, zone: type.startsWith("zone_") });
      }
      return this.play({ element, candidate, type, preview: true });
    }
    _dispose(voice, stop) {
      if (!this.voices.delete(voice)) return;
      voice.source.onended = null;
      if (stop) { try { voice.source.stop(); } catch (_) { /* already ended */ } }
      voice.source.disconnect(); voice.gain.disconnect(); this._qa();
    }
    stop() { for (const voice of Array.from(this.voices)) this._dispose(voice, true); this.issenPlayed = false; }
    cancelPreview() { this.previewToken++; this.stop(); }
    state() { return Object.assign({}, this.stats, { activeVoices: this.voices.size }); }
    _qa() { if (window.__NINJA_QA) window.__NINJA_QA.elementalAudio = this.state(); }
  }
  window.NinjaCore.ElementalAudio = ElementalAudio;
})();
