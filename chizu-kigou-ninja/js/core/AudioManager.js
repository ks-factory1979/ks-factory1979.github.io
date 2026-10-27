(function () {
  "use strict";

  window.NinjaCore = window.NinjaCore || {};

  function slashProfile(comboValue) {
    const combo = Math.max(1, Number(comboValue) || 1);
    const stage = combo >= 10 ? 4 : combo >= 5 ? 3 : combo >= 3 ? 2 : 1;
    const profiles = {
      1: {
        stage: 1,
        windStart: 4200,
        windEnd: 1750,
        windVolume: 0.092,
        impactStart: 1150,
        impactEnd: 480,
        impactVolume: 0.082,
        bladeStart: 2500,
        bladeEnd: 1740,
        bladeVolume: 0.022,
        lowVolume: 0
      },
      2: {
        stage: 2,
        windStart: 4550,
        windEnd: 1850,
        windVolume: 0.098,
        impactStart: 1250,
        impactEnd: 500,
        impactVolume: 0.087,
        bladeStart: 2850,
        bladeEnd: 1940,
        bladeVolume: 0.037,
        lowVolume: 0
      },
      3: {
        stage: 3,
        windStart: 5000,
        windEnd: 1900,
        windVolume: 0.108,
        impactStart: 1320,
        impactEnd: 470,
        impactVolume: 0.096,
        bladeStart: 3200,
        bladeEnd: 2120,
        bladeVolume: 0.047,
        lowVolume: 0
      },
      4: {
        stage: 4,
        windStart: 5600,
        windEnd: 2050,
        windVolume: 0.116,
        impactStart: 1420,
        impactEnd: 430,
        impactVolume: 0.103,
        bladeStart: 3650,
        bladeEnd: 2350,
        bladeVolume: 0.055,
        lowVolume: 0.027
      }
    };
    return profiles[stage];
  }

  class AudioManager {
    constructor(storageKey, options) {
      const settings = options || {};
      this.storageKey = storageKey || "ninja-core-muted";
      this.context = null;
      this.master = null;
      this.output = null;
      this.effectsEnabled = settings.effectsEnabled !== false;
      this.muteListeners = new Set();
      this.attributeBus = null;
      this.compressor = null;
      this.noiseBuffer = null;
      this.muted = this._readMuted();
      this.slashAudioData = settings.slashAudioData || null;
      this.slashBuffers = null;
      this.slashDecodePromise = null;
      this.slashAudioMode = this.slashAudioData ? "pending" : "fallback-synth";
      this.maxSlashVoices = Math.max(1, Math.min(8, Number(settings.maxSlashVoices) || 5));
      this.activeSlashVoices = new Set();
      this.issenPlayedForCurrentSwipe = false;
      this.elemental = NinjaCore.ElementalAudio ? new NinjaCore.ElementalAudio(this) : null;
      this._writeQa({
        slashAudioReady: false,
        slashAudioMode: this.slashAudioMode,
        activeSlashVoices: 0
      });
    }

    _readMuted() {
      try {
        return window.localStorage.getItem(this.storageKey) === "1";
      } catch (_error) {
        return false;
      }
    }

    _storeMuted() {
      try {
        window.localStorage.setItem(this.storageKey, this.muted ? "1" : "0");
      } catch (_error) {
        // 保存できない環境でも、現在のセッションでは音設定を維持します。
      }
    }

    unlock() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return Promise.resolve(false);

      if (!this.context) {
        this.context = new AudioContextClass();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted || !this.effectsEnabled ? 0 : 0.48;
        this.output = this.context.createGain();
        this.output.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.output);
        if (this.elemental) {
          this.attributeBus = this.context.createGain();
          this.attributeBus.gain.value = 1;
          this.attributeBus.connect(this.master);
        }
        if (typeof this.context.createDynamicsCompressor === "function") {
          this.compressor = this.context.createDynamicsCompressor();
          this.compressor.threshold.value = -18;
          this.compressor.knee.value = 16;
          this.compressor.ratio.value = 6;
          this.compressor.attack.value = 0.003;
          this.compressor.release.value = 0.12;
          this.output.connect(this.compressor);
          this.compressor.connect(this.context.destination);
        } else {
          this.output.connect(this.context.destination);
        }
        this.noiseBuffer = this._makeNoiseBuffer();
      }

      if (this.context.state === "closed") return Promise.resolve(false);
      const resumed = this.context.state !== "running"
        ? this.context.resume().then(() => true).catch(() => false)
        : Promise.resolve(true);

      return resumed.then((available) => {
        if (!available) return false;
        return Promise.all([this._prepareSlashAudio(), this.elemental ? this.elemental.prepare() : false]).then(() => true);
      });
    }

    isMuted() {
      return this.muted;
    }

    toggle() {
      this.muted = !this.muted;
      this._storeMuted();
      if (this.master) this.master.gain.value = this.muted || !this.effectsEnabled ? 0 : 0.48;
      if (this.output) this.output.gain.value = this.muted ? 0 : 1;
      this.muteListeners.forEach(fn => fn(this.muted));
      if (this.muted) this.stopAttributeSounds();
      if (!this.muted) this.unlock();
      return this.muted;
    }

    subscribeMute(fn) { this.muteListeners.add(fn); return () => this.muteListeners.delete(fn); }

    setEffectsEnabled(enabled) {
      this.effectsEnabled = Boolean(enabled);
      if (this.master) this.master.gain.value = this.muted || !this.effectsEnabled ? 0 : 0.48;
      if (!this.effectsEnabled) this.stopAttributeSounds();
    }

    beginSwipe() {
      if (!this.muted && this.context && this.context.state !== "running") this.unlock().catch(() => false);
      this.issenPlayedForCurrentSwipe = false;
      if (this.elemental) this.elemental.beginSwipe();
    }

    playElementHit(settings) { return this.effectsEnabled && this.elemental ? this.elemental.play(settings) : false; }
    stopAttributeSounds() { if (this.elemental) this.elemental.cancelPreview(); }

    endSwipe() {
      this.issenPlayedForCurrentSwipe = false;
      if (this.elemental) this.elemental.endSwipe();
    }

    play(name, options) {
      if (this.muted || !this.effectsEnabled || !this.context || !this.master) return;
      const settings = typeof options === "number" ? { combo: options } : (options || {});
      const now = this.context.currentTime;

      switch (name) {
        case "ui":
          this._tone(520, 720, 0.075, "sine", 0.12, now);
          break;
        case "swipe":
          this._noise(0.075, 1500, 0.10, now);
          break;
        case "correct":
        case "slash":
          this._slash(settings, now);
          break;
        case "questionChange":
          this._questionChange(now);
          break;
        case "wrong":
          this._tone(920, 610, 0.12, "square", 0.075, now);
          this._tone(610, 460, 0.10, "triangle", 0.06, now + 0.07);
          break;
        case "tenSeconds":
          this._tone(760, 760, 0.09, "square", 0.07, now);
          this._tone(980, 980, 0.12, "square", 0.07, now + 0.13);
          break;
        case "finish":
          this._tone(330, 190, 0.28, "sawtooth", 0.11, now);
          this._noise(0.16, 240, 0.10, now + 0.06);
          break;
        case "result":
          this._tone(440, 554, 0.12, "triangle", 0.07, now);
          this._tone(554, 659, 0.12, "triangle", 0.07, now + 0.10);
          this._tone(659, 880, 0.18, "sine", 0.08, now + 0.20);
          break;
        default:
          break;
      }
    }

    _slash(settings, at) {
      const combo = Math.max(1, Number(settings.combo) || 1);
      const hitIndex = Math.max(1, Number(settings.multiHitIndex) || 1);
      const variant = AudioManager.selectSlashVariant(combo, hitIndex, this.issenPlayedForCurrentSwipe);
      if (variant === "issen") this.issenPlayedForCurrentSwipe = true;
      this._recordSlashVariant(variant);

      if (this.slashBuffers && this.slashBuffers[variant]) {
        if (this._playSlashBuffer(variant, settings, at)) return;
      }

      this._incrementQa("audioFallbackCount");
      this._slashFallback(combo, hitIndex, at, this._slashScale(settings, variant));
    }

    _slashScale(settings, variant) {
      return this.elemental ? this.elemental.slashScale(settings, variant) : 1;
    }

    _playSlashBuffer(variant, settings, at) {
      while (this.activeSlashVoices.size >= this.maxSlashVoices) {
        const oldest = this.activeSlashVoices.values().next().value;
        this._disposeSlashVoice(oldest, true);
      }

      let source = null;
      let gain = null;
      let voice = null;
      try {
        source = this.context.createBufferSource();
        gain = this.context.createGain();
        voice = { source, gain, panner: null };
        source.buffer = this.slashBuffers[variant];
        if (source.playbackRate) source.playbackRate.value = 1;
        gain.gain.value = (variant === "normal" ? 0.92 : variant === "comboStrong" ? 0.90 : 0.88) * this._slashScale(settings, variant);
        this._writeQa({ lastSlashGain: gain.gain.value });
        source.connect(gain);

        if (typeof this.context.createStereoPanner === "function") {
          const panner = this.context.createStereoPanner();
          const width = Math.max(1, Number(settings.viewportWidth) || 1);
          const x = Number.isFinite(Number(settings.x)) ? Number(settings.x) : width / 2;
          panner.pan.value = Math.max(-0.25, Math.min(0.25, ((x / width) * 2 - 1) * 0.25));
          gain.connect(panner);
          panner.connect(this.master);
          voice.panner = panner;
        } else {
          gain.connect(this.master);
        }

        source.onended = () => this._disposeSlashVoice(voice, false);
        this.activeSlashVoices.add(voice);
        this._writeQa({ activeSlashVoices: this.activeSlashVoices.size });
        source.start(at);
        return true;
      } catch (_error) {
        if (voice && this.activeSlashVoices.has(voice)) {
          this._disposeSlashVoice(voice, false);
        } else {
          if (source) source.disconnect();
          if (gain) gain.disconnect();
          if (voice && voice.panner) voice.panner.disconnect();
        }
        return false;
      }
    }

    _disposeSlashVoice(voice, stopNow) {
      if (!voice || !this.activeSlashVoices.has(voice)) return;
      this.activeSlashVoices.delete(voice);
      voice.source.onended = null;
      if (stopNow) {
        try {
          voice.source.stop(this.context.currentTime);
        } catch (_error) {
          // 終了済みSourceでも、接続解除は続けます。
        }
      }
      voice.source.disconnect();
      voice.gain.disconnect();
      if (voice.panner) voice.panner.disconnect();
      this._writeQa({ activeSlashVoices: this.activeSlashVoices.size });
    }

    _slashFallback(combo, multiHitIndex, at, volumeScale = 1) {
      const profile = Object.assign({}, slashProfile(combo));
      for (const key of ["windVolume", "impactVolume", "bladeVolume", "lowVolume"]) profile[key] *= volumeScale;
      const hitIndex = Math.max(1, Number(multiHitIndex) || 1);
      if (hitIndex >= 2) {
        const edge = Math.min(4, hitIndex);
        this._filteredNoise(0.052, "highpass", profile.windStart + edge * 180, 1900, 0.8, 0.055 * volumeScale, at);
        this._filteredNoise(0.042, "bandpass", profile.impactStart + edge * 90, 690, 1.0, 0.042 * volumeScale, at + 0.008);
        this._tone(profile.bladeStart * 1.04, profile.bladeEnd, 0.048, "triangle", profile.bladeVolume * 0.82, at + 0.012);
        return;
      }

      this._filteredNoise(0.090, "highpass", profile.windStart, profile.windEnd, 0.7, profile.windVolume, at);
      this._filteredNoise(0.066, "bandpass", profile.impactStart, profile.impactEnd, 0.9, profile.impactVolume, at + 0.014);
      this._tone(profile.bladeStart, profile.bladeEnd, profile.stage >= 4 ? 0.085 : 0.060, "triangle", profile.bladeVolume, at + 0.024);
      if (profile.lowVolume > 0) this._tone(118, 62, 0.065, "sine", profile.lowVolume, at + 0.008);
    }

    _prepareSlashAudio() {
      if (this.slashDecodePromise) return this.slashDecodePromise;
      if (!this.slashAudioData) {
        this.slashAudioMode = "fallback-synth";
        this._writeQa({ slashAudioReady: false, slashAudioMode: this.slashAudioMode });
        this.slashDecodePromise = Promise.resolve(false);
        return this.slashDecodePromise;
      }

      const variants = ["normal", "comboStrong", "issen"];
      this.slashDecodePromise = Promise.all(variants.map((variant) => Promise.resolve().then(() => {
        const entry = this.slashAudioData[variant];
        if (!entry || !entry.base64) throw new Error("Missing embedded slash audio: " + variant);
        this._incrementQa("slashDecodeCount");
        return this._decodeAudioData(this._base64ToArrayBuffer(entry.base64))
          .then((buffer) => {
            if (!buffer) throw new Error("Empty decoded slash audio: " + variant);
            return [variant, buffer];
          });
      }))).then((decoded) => {
        this.slashBuffers = Object.fromEntries(decoded);
        this.slashAudioMode = "embedded-wav";
        this._writeQa({
          slashAudioReady: true,
          slashAudioMode: this.slashAudioMode,
          slashAudioError: null
        });
        return true;
      }).catch((error) => {
        this.slashBuffers = null;
        this.slashAudioMode = "fallback-synth";
        this._writeQa({
          slashAudioReady: false,
          slashAudioMode: this.slashAudioMode,
          slashAudioError: String(error && error.message ? error.message : error)
        });
        if (window.NINJA_CONFIG && window.NINJA_CONFIG.DEBUG_MODE && window.console) {
          window.console.warn("内蔵斬撃音の復号に失敗したため、生成音へ切り替えます。", error);
        }
        return false;
      });
      return this.slashDecodePromise;
    }

    _decodeAudioData(arrayBuffer) {
      return new Promise((resolve, reject) => {
        let settled = false;
        const succeed = (buffer) => {
          if (settled) return;
          settled = true;
          resolve(buffer);
        };
        const fail = (error) => {
          if (settled) return;
          settled = true;
          reject(error || new Error("decodeAudioData failed"));
        };
        try {
          const result = this.context.decodeAudioData(arrayBuffer, succeed, fail);
          if (result && typeof result.then === "function") result.then(succeed, fail);
        } catch (error) {
          fail(error);
        }
      });
    }

    _base64ToArrayBuffer(base64) {
      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes.buffer;
    }

    _recordSlashVariant(variant) {
      this._writeQa({ lastSlashVariant: variant });
      if (variant === "normal") this._incrementQa("slashNormalCount");
      if (variant === "comboStrong") this._incrementQa("slashStrongCount");
      if (variant === "issen") this._incrementQa("slashIssenCount");
      if (window.NINJA_CONFIG && window.NINJA_CONFIG.DEBUG_MODE && window.console) {
        window.console.debug("SLASH: " + (variant === "comboStrong" ? "STRONG" : variant.toUpperCase()));
      }
    }

    _incrementQa(key) {
      if (!window.__NINJA_QA) return;
      window.__NINJA_QA[key] = (Number(window.__NINJA_QA[key]) || 0) + 1;
    }

    _writeQa(values) {
      if (!window.__NINJA_QA) return;
      Object.assign(window.__NINJA_QA, values);
    }

    _questionChange(at) {
      this._filteredNoise(0.190, "bandpass", 1550, 520, 0.65, 0.055, at);
      this._filteredNoise(0.085, "highpass", 3600, 1450, 0.75, 0.040, at + 0.075);
      this._tone(1180, 760, 0.050, "triangle", 0.032, at + 0.155);
    }

    _makeNoiseBuffer() {
      const length = Math.max(1, Math.floor(this.context.sampleRate * 0.30));
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) {
        const envelope = 1 - index / length;
        data[index] = (Math.random() * 2 - 1) * envelope;
      }
      return buffer;
    }

    _tone(startFrequency, endFrequency, duration, type, volume, at) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(startFrequency, at);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), at + duration);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(at);
      oscillator.stop(at + duration + 0.01);
    }

    _noise(duration, cutoff, volume, at) {
      this._filteredNoise(duration, "highpass", cutoff, Math.max(100, cutoff * 0.42), 0.7, volume, at);
    }

    _filteredNoise(duration, type, startFrequency, endFrequency, q, volume, at) {
      if (!this.noiseBuffer) return;
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      source.buffer = this.noiseBuffer;
      filter.type = type;
      filter.Q.value = q;
      filter.frequency.setValueAtTime(Math.max(40, startFrequency), at);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), at + duration);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      source.start(at, 0, duration);
      source.stop(at + duration + 0.008);
    }

    static getSlashProfile(combo) {
      return slashProfile(combo);
    }

    static selectSlashVariant(comboValue, swipeHitCountValue, issenPlayed) {
      const combo = Math.max(1, Number(comboValue) || 1);
      const swipeHitCount = Math.max(1, Number(swipeHitCountValue) || 1);
      if (!issenPlayed && (swipeHitCount >= 3 || combo >= 10)) return "issen";
      if (swipeHitCount >= 2 || combo >= 3) return "comboStrong";
      return "normal";
    }
  }

  window.NinjaCore.AudioManager = AudioManager;
})();
