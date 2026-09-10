'use strict';
(() => {
  const SETTINGS_KEY = 'hiraganaTownMusic_v1';
  const TRACKS = {
    title: './audio/hiragana_town_title_loop.mp3',
    quiz: './audio/hiragana_town_quiz_loop.mp3',
    town: './audio/hiragana_town_town_loop.mp3'
  };
  const FADE_SECONDS = 0.4;
  const SEAM_SECONDS = 0.012;
  const buffers = new Map();
  const voices = new Set();
  const retryAfter = new Map();
  const settings = { enabled: true, volume: 0.3 };
  let context, master, controls, current, pendingScene, resumePosition;
  let scene = 'title', unlocked = false, pageHidden = false, revision = 0;

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
  }

  function updateControls() {
    if (!controls) return;
    controls.toggle.textContent = !settings.enabled ? '♪ おんがく オフ'
      : !unlocked ? '♪ タップで おんがく' : '♪ おんがく オン';
    controls.toggle.setAttribute('aria-pressed', String(settings.enabled));
    controls.toggle.setAttribute('aria-label', settings.enabled && unlocked ? 'おんがくを とめる' : 'おんがくを ながす');
    controls.range.value = Math.round(settings.volume * 100);
    controls.value.textContent = Math.round(settings.volume * 100) + '%';
  }

  function canPlay() {
    return settings.enabled && settings.volume > 0 && unlocked && !document.hidden && !pageHidden;
  }

  // Blend just 12 ms at the wrap point after decoding. Keep the original MP3s
  // untouched and let AudioBufferSourceNode loop without timer/decoder gaps.
  function prepareLoop(decoded) {
    const overlap = Math.min(Math.round(decoded.sampleRate * SEAM_SECONDS), Math.floor(decoded.length / 4));
    if (overlap < 2) return decoded;
    const length = decoded.length - overlap;
    const loop = context.createBuffer(decoded.numberOfChannels, length, decoded.sampleRate);
    const join = length - overlap;
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const input = decoded.getChannelData(channel);
      const output = loop.getChannelData(channel);
      output.set(input.subarray(overlap, length));
      for (let i = 0; i < overlap; i++) {
        const mix = (1 - Math.cos(Math.PI * i / (overlap - 1))) / 2;
        output[join + i] = input[length + i] * (1 - mix) + input[i] * mix;
      }
    }
    return loop;
  }

  function loadTrack(name) {
    if (!buffers.has(name)) {
      const job = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          const response = await fetch(TRACKS[name], { signal: controller.signal });
          if (!response.ok) throw new Error('BGM: ' + response.status);
          const decoded = await context.decodeAudioData(await response.arrayBuffer());
          return prepareLoop(decoded);
        } finally { clearTimeout(timeout); }
      })().catch(error => { buffers.delete(name); throw error; });
      buffers.set(name, job);
    }
    return buffers.get(name);
  }

  function stopVoice(voice, fade = 0) {
    const now = context.currentTime;
    const gain = voice.gain.gain;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else { gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now); }
    if (fade) gain.linearRampToValueAtTime(0, now + fade);
    else gain.setValueAtTime(0, now);
    try { voice.source.stop(now + fade); } catch (_) {}
  }

  function pause(fade = 0) {
    revision++;
    pendingScene = null;
    if (current) {
      resumePosition = {
        scene: current.scene,
        offset: (current.offset + Math.max(0, context.currentTime - current.startedAt)) % current.source.buffer.duration
      };
    }
    for (const voice of voices) stopVoice(voice, voice === current ? fade : 0);
    current = null;
  }

  async function sync() {
    if (!context || context.state !== 'running' || !canPlay()) return;
    if (current?.scene === scene || pendingScene === scene) return;
    if ((retryAfter.get(scene) || 0) > Date.now()) return;
    const target = scene, token = ++revision;
    pendingScene = target;
    try {
      const buffer = await loadTrack(target);
      if (token !== revision || target !== scene || !canPlay() || context.state !== 'running') return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      gain.connect(master);
      const startedAt = context.currentTime;
      const offset = resumePosition?.scene === target ? resumePosition.offset % buffer.duration : 0;
      gain.gain.setValueAtTime(0, startedAt);
      gain.gain.linearRampToValueAtTime(1, startedAt + FADE_SECONDS);
      const voice = { scene: target, source, gain, offset, startedAt };
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        voices.delete(voice);
      };
      source.start(startedAt, offset);
      voices.add(voice);
      current = voice;
      resumePosition = null;
      retryAfter.delete(target);
    } catch (error) {
      if (token === revision && canPlay()) {
        retryAfter.set(target, Date.now() + 10000);
        console.warn('BGM could not be loaded:', target, error);
        controls?.onError?.('おんがくを よみこめませんでした。あそびは つづけられるよ');
      }
    } finally {
      if (token === revision) pendingScene = null;
    }
  }

  function activate() {
    if (!settings.enabled || document.hidden || pageHidden) return;
    try {
      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = settings.volume;
        master.connect(context.destination);
        context.addEventListener('statechange', () => {
          if (context.state === 'running') {
            if (canPlay()) void sync();
            else pause();
          }
        });
      }
      unlocked = true;
      updateControls();
      // Called directly in a tap/key handler so mobile browsers allow audio.
      const resumed = context.resume();
      resumed.then(() => { if (canPlay()) void sync(); }).catch(() => {});
    } catch (_) {
      controls?.onError?.('このブラウザでは おんがくを ながせません');
    }
  }

  function setScreen(screen) {
    const next = screen === 'quiz' ? 'quiz' : screen === 'town' ? 'town' : 'title';
    if (next === scene) return;
    pause(FADE_SECONDS);
    scene = next;
    resumePosition = null;
    void sync();
  }

  function updateVisibility() {
    if (document.hidden || pageHidden) {
      pause();
      if (context?.state === 'running') context.suspend().catch(() => {});
    } else if (unlocked) activate();
  }

  function init(options) {
    controls = options;
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (typeof saved?.enabled === 'boolean') settings.enabled = saved.enabled;
      if (typeof saved?.volume === 'number' && Number.isFinite(saved.volume)) settings.volume = Math.max(0, Math.min(1, saved.volume));
    } catch (_) {}
    updateControls();
    controls.toggle.addEventListener('click', () => {
      if (settings.enabled && !unlocked) { activate(); return; }
      settings.enabled = !settings.enabled;
      saveSettings();
      updateControls();
      if (settings.enabled) { retryAfter.delete(scene); activate(); }
      else pause(0.08);
    });
    controls.range.addEventListener('input', () => {
      settings.volume = Math.max(0, Math.min(1, Number(controls.range.value) / 100));
      if (master) master.gain.setTargetAtTime(settings.volume, context.currentTime, 0.025);
      saveSettings();
      updateControls();
      if (!settings.volume) pause(0.08);
      else activate();
    });
    const onGesture = event => {
      if (controls.toggle.contains(event.target)) return;
      if (event.type === 'keydown' && !['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      if (context?.state !== 'running' || !current) activate();
    };
    document.addEventListener('pointerup', onGesture, { capture: true, passive: true });
    document.addEventListener('keydown', onGesture, true);
    document.addEventListener('visibilitychange', updateVisibility);
    window.addEventListener('pagehide', () => { pageHidden = true; updateVisibility(); });
    window.addEventListener('pageshow', () => { pageHidden = false; updateVisibility(); });
  }

  window.HIRAGANA_BGM = Object.freeze({ init, setScreen });
})();
