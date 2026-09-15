

'use strict';

/*
 * ひっぱれ！けいさんバトル v1.2.0 共通音声基盤
 * 採用済み7曲を、遅延生成する1個のAudioContextとBGMバスへ統合する。
 */
window.HikippareAudio = (() => {
  const BGM_BUS_GAIN = 0.82;
  let context = null;
  let bgmBus = null;
  let sfxBus = null;
  let contextCount = 0;

  function createGraph() {
    if (context && context.state !== 'closed') return context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio APIに対応していないブラウザです。');
    context = new AudioContextClass();
    contextCount += 1;
    bgmBus = context.createGain();
    sfxBus = context.createGain();
    bgmBus.gain.setValueAtTime(BGM_BUS_GAIN, context.currentTime);
    sfxBus.gain.setValueAtTime(1, context.currentTime);
    bgmBus.connect(context.destination);
    sfxBus.connect(context.destination);
    return context;
  }

  async function ensureContext() {
    const ctx = createGraph();
    if (ctx.state === 'suspended' && !window.GameBGM?.getState?.().paused) await ctx.resume();
    return ctx;
  }

  function ensureContextSync() {
    const ctx = createGraph();
    if (ctx.state === 'suspended' && !window.GameBGM?.getState?.().paused) void ctx.resume();
    return ctx;
  }

  return Object.freeze({
    ensureContext,
    ensureContextSync,
    getBgmDestination: () => { createGraph(); return bgmBus; },
    getSfxDestination: () => { createGraph(); return sfxBus; },
    suspend: async () => { if (context?.state === 'running') await context.suspend(); },
    resume: async () => { const ctx = createGraph(); if (ctx.state === 'suspended') await ctx.resume(); return ctx; },
    getState: () => Object.freeze({
      audioContextCount: contextCount,
      audioContextState: context?.state || 'not-created',
      bgmBusGain: BGM_BUS_GAIN
    })
  });
})();

window.HikippareBGMHub = (() => {
  let active = null;
  let commandSerial = 0;
  return Object.freeze({
    ensureContext: () => window.HikippareAudio.ensureContext(),
    async activate(key, startCurrent, stopCurrent) {
      const command = ++commandSerial;
      if (active && active.key !== key) await active.stop({ fadeSeconds: 0.12, preserveRemaining: true });
      if (command !== commandSerial) return false;
      active = { key, stop: stopCurrent };
      try {
        await startCurrent();
        return command === commandSerial;
      } catch (error) {
        if (command === commandSerial && active?.key === key) active = null;
        throw error;
      }
    },
    release(key) { if (active?.key === key) active = null; },
    getState() {
      const audio = window.HikippareAudio.getState();
      return Object.freeze({ activeTrack: active?.key || null, ...audio });
    }
  });
})();


(() => {
'use strict';

  // ── 調整用設定（ゲーム本体へ組み込む際も、このブロックで微調整可能） ──
  const BGM_CONFIG = Object.freeze({
    loopDuration: 8.25,
    scheduleAhead: 2.5,
    schedulerIntervalMs: 120,
    startDelay: 0.08,
    startFade: 0.04,
    stopFade: 0.30,
    masterGain: 0.82,
    melodyGain: 0.085,
    introMelodyGains: Object.freeze([0.102, 0.104, 0.106, 0.105]),
    bassGain: 0.092,
    endingGainScale: 0.82,
    ornamentGainScale: 1.0,
    melodyAttack: 0.012,
    introAttack: 0.006,
    bassAttack: 0.016,
    ornamentAttack: 0.018,
    melodyRelease: 0.045,
    bassRelease: 0.060,
    endingRelease: 0.120,
    tailGainScale: 0.05,
    lowpassHz: 3900,
    minGain: 0.0001
  });

  const NOTE_FREQ = Object.freeze({
    C3: 130.81, E3: 164.81, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
    C6: 1046.50, R: 0
  });

  // 音列・各音の開始間隔は現行版を維持。末尾だけ余韻を0.10秒延長する。
  const SCORE = Object.freeze([
    { m: 'G4', b: 'C3', d: 0.25 }, { m: 'C5', b: 'G3', d: 0.25 },
    { m: 'E5', b: 'C3', d: 0.25 }, { m: 'G5', b: 'G3', d: 0.50 },
    { m: 'F5', b: 'G3', d: 0.25 }, { m: 'E5', b: 'G3', d: 0.25 },
    { m: 'D5', b: 'G3', d: 0.50 }, { m: 'C5', b: 'C3', d: 0.375 },
    { m: 'C5', b: 'C3', d: 0.125 }, { m: 'C5', b: 'G3', d: 0.25 },
    { m: 'D5', b: 'G3', d: 0.25 }, { m: 'E5', b: 'C3', d: 0.50 },
    { m: 'C5', b: 'G3', d: 0.50 }, { m: 'D5', b: 'G3', d: 0.375 },
    { m: 'D5', b: 'G3', d: 0.125 }, { m: 'D5', b: 'A3', d: 0.25 },
    { m: 'E5', b: 'B3', d: 0.25 }, { m: 'F5', b: 'G3', d: 0.50 },
    { m: 'D5', b: 'G3', d: 0.50 }, { m: 'E5', b: 'C3', d: 0.25 },
    { m: 'G5', b: 'E3', d: 0.25 }, { m: 'C5', b: 'G3', d: 0.25 },
    { m: 'D5', b: 'B3', d: 0.25 }, { m: 'C5', b: 'C3', d: 0.75, ending: true },
    { m: 'R',  b: 'R',  d: 0.25 }
  ]);

  // Bループ後半だけに入る、柔らかい短い装飾音。
  const B_ORNAMENTS = Object.freeze([
    { note: 'C6', offset: 6.50, duration: 0.13, gain: 0.018 },
    { note: 'A5', offset: 7.00, duration: 0.13, gain: 0.016 }
  ]);

  const startBtn = { disabled: false, addEventListener() {} };
  const stopBtn = { disabled: true, addEventListener() {} };
  const playStatus = { textContent: '停止中' };
  const loopStatus = { textContent: '次はAループ' };

  let audioCtx = null;
  let currentSession = null;
  let schedulerId = null;
  let pendingStop = Promise.resolve();
  let sessionSerial = 0;

  function createAudioContext() { return window.HikippareAudio.ensureContextSync(); }

  async function ensureAudioContext() { audioCtx = await window.HikippareAudio.ensureContext(); return audioCtx; }

  function createSession(ctx) {
    const bus = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(BGM_CONFIG.lowpassHz, ctx.currentTime);
    lowpass.Q.setValueAtTime(0.55, ctx.currentTime);
    bus.connect(lowpass);
    lowpass.connect(window.HikippareAudio.getBgmDestination());

    const now = ctx.currentTime;
    bus.gain.setValueAtTime(BGM_CONFIG.minGain, now);
    bus.gain.exponentialRampToValueAtTime(BGM_CONFIG.masterGain, now + BGM_CONFIG.startFade);

    return {
      id: ++sessionSerial,
      bus,
      lowpass,
      sources: new Set(),
      isPlaying: true,
      startTime: now + BGM_CONFIG.startDelay,
      nextLoopTime: now + BGM_CONFIG.startDelay,
      nextLoopIndex: 0
    };
  }

  function playVoice(session, { frequency, type, gainValue, startTime, duration, attack, release }) {
    if (!frequency || !session.isPlaying) return;
    const ctx = audioCtx;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    const safeDuration = Math.max(0.04, duration);
    const stopTime = startTime + safeDuration;
    const attackEnd = Math.min(stopTime - 0.012, startTime + attack);
    const releaseStart = Math.max(attackEnd, stopTime - release);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    envelope.gain.setValueAtTime(BGM_CONFIG.minGain, startTime);
    envelope.gain.linearRampToValueAtTime(gainValue, attackEnd);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(BGM_CONFIG.minGain, gainValue * BGM_CONFIG.tailGainScale),
      releaseStart
    );
    envelope.gain.exponentialRampToValueAtTime(BGM_CONFIG.minGain, stopTime);

    oscillator.connect(envelope);
    envelope.connect(session.bus);
    const source = { oscillator, envelope };
    session.sources.add(source);
    oscillator.onended = () => {
      session.sources.delete(source);
      try { oscillator.disconnect(); } catch (_) { /* 終了済み */ }
      try { envelope.disconnect(); } catch (_) { /* 終了済み */ }
    };
    oscillator.start(startTime);
    oscillator.stop(stopTime + 0.01);
  }

  function scheduleLoop(session, loopStart, isBLoop) {
    let offset = 0;
    SCORE.forEach((item, index) => {
      const startTime = loopStart + offset;
      if (item.m !== 'R') {
        const introGain = index < 4 ? BGM_CONFIG.introMelodyGains[index] : BGM_CONFIG.melodyGain;
        const gainValue = item.ending ? introGain * BGM_CONFIG.endingGainScale : introGain;
        playVoice(session, {
          frequency: NOTE_FREQ[item.m],
          type: 'square',
          gainValue,
          startTime,
          duration: item.d + (item.ending ? 0.10 : 0),
          attack: index < 4 ? BGM_CONFIG.introAttack : BGM_CONFIG.melodyAttack,
          release: item.ending ? BGM_CONFIG.endingRelease : BGM_CONFIG.melodyRelease
        });
      }
      if (item.b !== 'R') {
        playVoice(session, {
          frequency: NOTE_FREQ[item.b],
          type: 'triangle',
          gainValue: BGM_CONFIG.bassGain * (item.ending ? BGM_CONFIG.endingGainScale : 1),
          startTime,
          duration: item.d + (item.ending ? 0.10 : 0),
          attack: BGM_CONFIG.bassAttack,
          release: item.ending ? BGM_CONFIG.endingRelease : BGM_CONFIG.bassRelease
        });
      }
      offset += item.d;
    });

    if (isBLoop) {
      B_ORNAMENTS.forEach((ornament) => playVoice(session, {
        frequency: NOTE_FREQ[ornament.note],
        type: 'sine',
        gainValue: ornament.gain * BGM_CONFIG.ornamentGainScale,
        startTime: loopStart + ornament.offset,
        duration: ornament.duration,
        attack: BGM_CONFIG.ornamentAttack,
        release: 0.055
      }));
    }
  }

  function updateLoopDisplay(session) {
    if (!session || !session.isPlaying || session !== currentSession) return;
    const elapsed = Math.max(0, audioCtx.currentTime - session.startTime);
    const loopIndex = Math.floor(elapsed / BGM_CONFIG.loopDuration);
    loopStatus.textContent = `${loopIndex % 2 === 0 ? 'A' : 'B'}ループを再生中`;
  }

  function runScheduler(session) {
    if (!session.isPlaying || session !== currentSession) return;
    const horizon = audioCtx.currentTime + BGM_CONFIG.scheduleAhead;
    while (session.nextLoopTime < horizon) {
      scheduleLoop(session, session.nextLoopTime, session.nextLoopIndex % 2 === 1);
      session.nextLoopTime += BGM_CONFIG.loopDuration;
      session.nextLoopIndex += 1;
    }
    updateLoopDisplay(session);
    schedulerId = window.setTimeout(() => runScheduler(session), BGM_CONFIG.schedulerIntervalMs);
  }

  function setUiPlaying(playing) {
    startBtn.disabled = playing;
    stopBtn.disabled = !playing;
    playStatus.textContent = playing ? '磨き版を再生中' : '停止中';
    if (!playing) loopStatus.textContent = '次はAループ';
  }

  async function startBGM() {
    if (currentSession?.isPlaying) return;
    await pendingStop;
    const ctx = await ensureAudioContext();
    if (currentSession?.isPlaying) return;
    const session = createSession(ctx);
    currentSession = session;
    setUiPlaying(true);
    runScheduler(session);
  }

  function stopSession(session) {
    if (!session?.isPlaying) return Promise.resolve();
    session.isPlaying = false;
    if (schedulerId !== null) {
      clearTimeout(schedulerId);
      schedulerId = null;
    }
    const now = audioCtx.currentTime;
    const fadeEnd = now + BGM_CONFIG.stopFade;
    session.bus.gain.cancelScheduledValues(now);
    session.bus.gain.setValueAtTime(Math.max(BGM_CONFIG.minGain, session.bus.gain.value), now);
    session.bus.gain.exponentialRampToValueAtTime(BGM_CONFIG.minGain, fadeEnd);
    const sourcesToStop = Array.from(session.sources);

    return new Promise((resolve) => {
      window.setTimeout(() => {
        sourcesToStop.forEach(({ oscillator }) => {
          try { oscillator.stop(audioCtx.currentTime + 0.005); } catch (_) { /* 自然終了済み */ }
        });
        try { session.bus.disconnect(); } catch (_) { /* 切断済み */ }
        try { session.lowpass.disconnect(); } catch (_) { /* 切断済み */ }
        if (currentSession === session) currentSession = null;
        resolve();
      }, Math.ceil((BGM_CONFIG.stopFade + 0.04) * 1000));
    });
  }

  function stopBGM() {
    const session = currentSession;
    setUiPlaying(false);
    pendingStop = stopSession(session);
    return pendingStop;
  }

  // 背景タブから戻った直後、過去時刻へ予約しないよう再同期する。
  document.addEventListener('visibilitychange', () => {
    const session = currentSession;
    if (!session?.isPlaying || !audioCtx) return;
    if (document.hidden) {
      if (schedulerId !== null) clearTimeout(schedulerId);
      schedulerId = null;
      return;
    }
    if (schedulerId !== null) {
      clearTimeout(schedulerId);
      schedulerId = null;
    }
    if (session.nextLoopTime < audioCtx.currentTime + 0.05) {
      const elapsedLoops = Math.max(0, Math.floor((audioCtx.currentTime - session.startTime) / BGM_CONFIG.loopDuration) + 1);
      session.nextLoopIndex = elapsedLoops;
      session.nextLoopTime = audioCtx.currentTime + 0.05;
    }
    runScheduler(session);
  });

  // 回帰検査用。通常利用では参照しない。
  window.TitleBGM = Object.freeze({
    reset: stopBGM,
    start: startBGM,
    stop: stopBGM,
    getState: () => ({
      playing: Boolean(currentSession?.isPlaying),
      sessionId: currentSession?.id ?? null,
      nextLoopIndex: currentSession?.nextLoopIndex ?? 0,
      scheduledSources: currentSession?.sources.size ?? 0,
      audioContextState: audioCtx?.state ?? 'not-created',
      status: playStatus.textContent,
      loopStatus: loopStatus.textContent
    }),
    config: BGM_CONFIG,
    scoreDuration: SCORE.reduce((sum, item) => sum + item.d, 0),
    ornamentCount: B_ORNAMENTS.length
  });
  window.__TITLE_BGM_TEST__ = window.TitleBGM;
})();

(() => {
'use strict';

// ゲーム本体へ移植するときに調整する値をここへ集約する。
const MENU_BGM_CONFIG = Object.freeze({
  loopSeconds: 8.000,
  pairSeconds: 16.000,
  startLeadSeconds: 0.080,
  lookAheadSeconds: 0.800,
  schedulerIntervalMs: 120,
  masterGain: 0.700,
  startFadeSeconds: 0.400,
  stopFadeSeconds: 0.300,
  minGain: 0.0001,
  melody: Object.freeze({
    triangleGain: 0.046,
    squareGain: 0.012,
    highNoteScale: 0.86,
    triangleLowpassHz: 4200,
    squareLowpassHz: 2850,
    filterQ: 0.50,
    attackSeconds: 0.020,
    releaseSeconds: 0.080,
    decayScale: 0.72
  }),
  bass: Object.freeze({
    triangleGain: 0.032,
    lowpassHz: 1250,
    filterQ: 0.55,
    attackSeconds: 0.025,
    releaseSeconds: 0.100,
    decayScale: 0.78
  }),
  ornament: Object.freeze({
    sineGain: 0.0075,
    lowpassHz: 4200,
    filterQ: 0.45,
    attackSeconds: 0.018,
    releaseSeconds: 0.055,
    decayScale: 0.60
  }),
  compressor: Object.freeze({
    threshold: -10,
    knee: 6,
    ratio: 2,
    attack: 0.008,
    release: 0.150
  })
});

const MENU_NOTE_FREQ = Object.freeze({
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00,
  G4: 392.00, A4: 440.00, C5: 523.25, D5: 587.33, E5: 659.25,
  F5: 698.46, G5: 783.99, A5: 880.00
});

// A前半：G4→C5→E5→G5（引く）／G5→E5→D5（押し返される）。
const MENU_MELODY_A = Object.freeze([
  { offset: 0.000, note: 'G4', duration: 0.420 },
  { offset: 0.500, note: 'C5', duration: 0.420 },
  { offset: 1.000, note: 'E5', duration: 0.420 },
  { offset: 1.500, note: 'G5', duration: 0.460 },
  { offset: 2.750, note: 'G5', duration: 0.350 },
  { offset: 3.250, note: 'E5', duration: 0.350 },
  { offset: 3.750, note: 'D5', duration: 0.450 },
  { offset: 5.000, note: 'C5', duration: 0.450 },
  { offset: 5.500, note: 'E5', duration: 0.450 },
  { offset: 6.000, note: 'A4', duration: 0.450 },
  { offset: 6.500, note: 'C5', duration: 0.450 },
  { offset: 7.000, note: 'D5', duration: 0.400 },
  { offset: 7.500, note: 'C5', duration: 0.420 }
]);

// Bは前半と5.0秒のC5まで共通。後半5音だけを変え、Gの機能でAへ戻す。
const MENU_MELODY_B = Object.freeze([
  ...MENU_MELODY_A.slice(0, 8).map(event => Object.freeze({ ...event })),
  { offset: 5.500, note: 'A4', duration: 0.450 },
  { offset: 6.000, note: 'C5', duration: 0.450 },
  { offset: 6.500, note: 'E5', duration: 0.450 },
  { offset: 7.000, note: 'G5', duration: 0.400 },
  { offset: 7.500, note: 'D5', duration: 0.420 }
]);

const MENU_BASS_A = Object.freeze([
  { offset: 0.000, note: 'C3', duration: 0.720 }, { offset: 1.000, note: 'G3', duration: 0.720 },
  { offset: 2.000, note: 'G3', duration: 0.720 }, { offset: 3.000, note: 'D3', duration: 0.720 },
  { offset: 4.000, note: 'A3', duration: 0.720 }, { offset: 5.000, note: 'E3', duration: 0.720 },
  { offset: 6.000, note: 'F3', duration: 0.720 }, { offset: 7.000, note: 'C3', duration: 0.720 }
]);

const MENU_BASS_B = Object.freeze([
  { offset: 0.000, note: 'A3', duration: 0.720 }, { offset: 1.000, note: 'E3', duration: 0.720 },
  { offset: 2.000, note: 'F3', duration: 0.720 }, { offset: 3.000, note: 'C3', duration: 0.720 },
  { offset: 4.000, note: 'C3', duration: 0.720 }, { offset: 5.000, note: 'G3', duration: 0.720 },
  { offset: 6.000, note: 'G3', duration: 0.720 }, { offset: 7.000, note: 'D3', duration: 0.720 }
]);

const MENU_ORNAMENT_B = Object.freeze([
  { offset: 6.875, note: 'A5', duration: 0.125 }
]);

function buildMenuScore(melody, bass, ornaments = []) {
  return Object.freeze([
    ...melody.map(event => Object.freeze({ ...event, part: 'melody' })),
    ...bass.map(event => Object.freeze({ ...event, part: 'bass' })),
    ...ornaments.map(event => Object.freeze({ ...event, part: 'ornament' }))
  ].sort((a, b) => a.offset - b.offset || (a.part > b.part ? 1 : -1)));
}

const MENU_SCORE_A = buildMenuScore(MENU_MELODY_A, MENU_BASS_A);
const MENU_SCORE_B = buildMenuScore(MENU_MELODY_B, MENU_BASS_B, MENU_ORNAMENT_B);

for (const [name, score] of [['A', MENU_SCORE_A], ['B', MENU_SCORE_B]]) {
  const end = Math.max(...score.map(event => event.offset + event.duration));
  if (end > MENU_BGM_CONFIG.loopSeconds + 1e-9 || MENU_BGM_CONFIG.loopSeconds !== 8) {
    throw new Error(`${name}ループが8.000秒の範囲に収まっていません。`);
  }
}

function holdMenuAudioParam(param, atTime) {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(atTime);
  } else {
    const value = Math.max(MENU_BGM_CONFIG.minGain, param.value || MENU_BGM_CONFIG.minGain);
    param.cancelScheduledValues(atTime);
    param.setValueAtTime(value, atTime);
  }
}

class MenuBGMEngine {
  constructor(options = {}) {
    this.audioContext = options.audioContext || null;
    this.destination = options.destination || null;
    this.onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : () => {};
    this.currentSession = null;
    this.sessionSerial = 0;
    this.commandSerial = 0;
    this.pendingStop = Promise.resolve();
    this.pendingStops = new Set();
    this.visibilityHandler = () => this.handleVisibilityChange();
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  async ensureAudioContext() {
    this.audioContext = await window.HikippareAudio.ensureContext();
    return this.audioContext;
  }

  createSession(ctx, fadeInSeconds) {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    const c = MENU_BGM_CONFIG.compressor;
    compressor.threshold.setValueAtTime(c.threshold, now);
    compressor.knee.setValueAtTime(c.knee, now);
    compressor.ratio.setValueAtTime(c.ratio, now);
    compressor.attack.setValueAtTime(c.attack, now);
    compressor.release.setValueAtTime(c.release, now);
    master.connect(compressor);
    compressor.connect(window.HikippareAudio.getBgmDestination());
    master.gain.setValueAtTime(MENU_BGM_CONFIG.minGain, now);
    master.gain.linearRampToValueAtTime(MENU_BGM_CONFIG.masterGain, now + fadeInSeconds);

    const startTime = now + MENU_BGM_CONFIG.startLeadSeconds;
    return {
      id: ++this.sessionSerial,
      closed: false,
      master,
      compressor,
      nodes: new Set(),
      timerId: null,
      startTime,
      wallStartedAt: performance.now() + MENU_BGM_CONFIG.startLeadSeconds * 1000,
      loopNumber: 0,
      loopStartTime: startTime,
      eventIndex: 0
    };
  }

  async start(options = {}) {
    if (this.currentSession && !this.currentSession.closed) return this.getState();
    const command = ++this.commandSerial;
    await this.pendingStop;
    if (command !== this.commandSerial) return this.getState();
    const ctx = await this.ensureAudioContext();
    if (command !== this.commandSerial) return this.getState();
    const fadeIn = Math.max(0.01, Number(options.fadeInSeconds ?? MENU_BGM_CONFIG.startFadeSeconds));
    const session = this.createSession(ctx, fadeIn);
    this.currentSession = session;
    this.schedulerTick(session);
    this.emitState();
    return this.getState();
  }

  async stop(options = {}) {
    const fadeOut = Math.max(0.01, Number(options.fadeOutSeconds ?? MENU_BGM_CONFIG.stopFadeSeconds));
    ++this.commandSerial;
    const session = this.currentSession;
    if (!session || session.closed) {
      await this.pendingStop;
      this.emitState();
      return this.getState();
    }
    this.currentSession = null;
    const operation = this.stopSession(session, fadeOut);
    this.pendingStops.add(operation);
    this.pendingStop = operation.finally(() => this.pendingStops.delete(operation));
    this.emitState();
    await this.pendingStop;
    this.emitState();
    return this.getState();
  }

  reset() {
    return this.stop({ fadeOutSeconds: MENU_BGM_CONFIG.stopFadeSeconds });
  }

  stopSession(session, fadeOut) {
    session.closed = true;
    if (session.timerId !== null) {
      clearTimeout(session.timerId);
      session.timerId = null;
    }
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const fadeEnd = now + fadeOut;
    holdMenuAudioParam(session.master.gain, now);
    session.master.gain.linearRampToValueAtTime(MENU_BGM_CONFIG.minGain, fadeEnd);
    for (const record of [...session.nodes]) {
      try { record.oscillator.stop(fadeEnd + 0.012); } catch (_) {}
    }
    return new Promise(resolve => {
      setTimeout(() => {
        for (const record of [...session.nodes]) this.disconnectRecord(session, record);
        try { session.master.disconnect(); } catch (_) {}
        try { session.compressor.disconnect(); } catch (_) {}
        resolve();
      }, Math.ceil((fadeOut + 0.045) * 1000));
    });
  }

  getState() {
    const session = this.currentSession;
    let loop = null;
    if (session && !session.closed) {
      const elapsed = Math.max(0, (performance.now() - session.wallStartedAt) / 1000);
      loop = Math.floor(elapsed / MENU_BGM_CONFIG.loopSeconds) % 2 === 0 ? 'A' : 'B';
    }
    return {
      playing: Boolean(session && !session.closed),
      loop,
      sessionId: session && !session.closed ? session.id : null,
      audioContextState: this.audioContext ? this.audioContext.state : 'not-created',
      scheduledNodes: session && !session.closed ? session.nodes.size : 0,
      pendingStops: this.pendingStops.size
    };
  }

  schedulerTick(session) {
    if (session !== this.currentSession || session.closed) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const score = () => session.loopNumber % 2 === 0 ? MENU_SCORE_A : MENU_SCORE_B;
    const next = score()[session.eventIndex];
    if (next && session.loopStartTime + next.offset < now - 0.120) this.resyncSession(session);
    const horizon = ctx.currentTime + MENU_BGM_CONFIG.lookAheadSeconds;

    while (session === this.currentSession && !session.closed) {
      const currentScore = score();
      const event = currentScore[session.eventIndex];
      if (!event) {
        session.loopNumber += 1;
        session.loopStartTime += MENU_BGM_CONFIG.loopSeconds;
        session.eventIndex = 0;
        continue;
      }
      const eventTime = session.loopStartTime + event.offset;
      if (eventTime >= horizon) break;
      if (eventTime >= ctx.currentTime - 0.025) {
        this.scheduleEvent(session, event, Math.max(eventTime, ctx.currentTime + 0.004));
      }
      session.eventIndex += 1;
    }

    this.emitState();
    session.timerId = setTimeout(() => this.schedulerTick(session), MENU_BGM_CONFIG.schedulerIntervalMs);
  }

  scheduleEvent(session, event, atTime) {
    if (event.part === 'melody') {
      const highScale = MENU_NOTE_FREQ[event.note] >= MENU_NOTE_FREQ.G5 ? MENU_BGM_CONFIG.melody.highNoteScale : 1;
      this.scheduleVoice(session, {
        ...event, atTime, type: 'triangle', gain: MENU_BGM_CONFIG.melody.triangleGain * highScale,
        filterHz: MENU_BGM_CONFIG.melody.triangleLowpassHz, filterQ: MENU_BGM_CONFIG.melody.filterQ,
        attack: MENU_BGM_CONFIG.melody.attackSeconds, release: MENU_BGM_CONFIG.melody.releaseSeconds,
        decayScale: MENU_BGM_CONFIG.melody.decayScale, kind: 'melody-triangle'
      });
      this.scheduleVoice(session, {
        ...event, atTime, type: 'square', gain: MENU_BGM_CONFIG.melody.squareGain * highScale,
        filterHz: MENU_BGM_CONFIG.melody.squareLowpassHz, filterQ: MENU_BGM_CONFIG.melody.filterQ,
        attack: MENU_BGM_CONFIG.melody.attackSeconds, release: MENU_BGM_CONFIG.melody.releaseSeconds,
        decayScale: 0.66, kind: 'melody-square'
      });
    } else if (event.part === 'bass') {
      this.scheduleVoice(session, {
        ...event, atTime, type: 'triangle', gain: MENU_BGM_CONFIG.bass.triangleGain,
        filterHz: MENU_BGM_CONFIG.bass.lowpassHz, filterQ: MENU_BGM_CONFIG.bass.filterQ,
        attack: MENU_BGM_CONFIG.bass.attackSeconds, release: MENU_BGM_CONFIG.bass.releaseSeconds,
        decayScale: MENU_BGM_CONFIG.bass.decayScale, kind: 'bass'
      });
    } else {
      this.scheduleVoice(session, {
        ...event, atTime, type: 'sine', gain: MENU_BGM_CONFIG.ornament.sineGain,
        filterHz: MENU_BGM_CONFIG.ornament.lowpassHz, filterQ: MENU_BGM_CONFIG.ornament.filterQ,
        attack: MENU_BGM_CONFIG.ornament.attackSeconds, release: MENU_BGM_CONFIG.ornament.releaseSeconds,
        decayScale: MENU_BGM_CONFIG.ornament.decayScale, kind: 'ornament'
      });
    }
  }

  scheduleVoice(session, voice) {
    if (session !== this.currentSession || session.closed) return;
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const end = voice.atTime + voice.duration;
    const attackEnd = Math.min(end - 0.012, voice.atTime + voice.attack);
    const releaseStart = Math.max(attackEnd, end - voice.release);
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(MENU_NOTE_FREQ[voice.note], voice.atTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(voice.filterHz, voice.atTime);
    filter.Q.setValueAtTime(voice.filterQ, voice.atTime);
    gain.gain.setValueAtTime(MENU_BGM_CONFIG.minGain, voice.atTime);
    gain.gain.linearRampToValueAtTime(voice.gain, attackEnd);
    gain.gain.exponentialRampToValueAtTime(Math.max(MENU_BGM_CONFIG.minGain, voice.gain * voice.decayScale), releaseStart);
    gain.gain.exponentialRampToValueAtTime(MENU_BGM_CONFIG.minGain, end);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(session.master);
    const record = { oscillator, filter, gain, startTime: voice.atTime, stopTime: end, kind: voice.kind };
    session.nodes.add(record);
    oscillator.onended = () => this.disconnectRecord(session, record);
    oscillator.start(voice.atTime);
    oscillator.stop(end + 0.006);
  }

  disconnectRecord(session, record) {
    session.nodes.delete(record);
    try { record.oscillator.disconnect(); } catch (_) {}
    try { record.filter.disconnect(); } catch (_) {}
    try { record.gain.disconnect(); } catch (_) {}
  }

  resyncSession(session) {
    if (session !== this.currentSession || session.closed) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    for (const record of [...session.nodes]) {
      try {
        holdMenuAudioParam(record.gain.gain, now);
        record.gain.gain.linearRampToValueAtTime(MENU_BGM_CONFIG.minGain, now + 0.035);
        record.oscillator.stop(now + 0.040);
      } catch (_) {}
    }
    const logicalElapsed = Math.max(0, (performance.now() - session.wallStartedAt) / 1000);
    const loopNumber = Math.floor(logicalElapsed / MENU_BGM_CONFIG.loopSeconds);
    const loopOffset = logicalElapsed - loopNumber * MENU_BGM_CONFIG.loopSeconds;
    const currentScore = loopNumber % 2 === 0 ? MENU_SCORE_A : MENU_SCORE_B;
    let eventIndex = currentScore.findIndex(event => event.offset >= loopOffset - 0.010);
    if (eventIndex < 0) eventIndex = currentScore.length;
    session.loopNumber = loopNumber;
    session.eventIndex = eventIndex;
    session.loopStartTime = ctx.currentTime + MENU_BGM_CONFIG.startLeadSeconds - loopOffset;
  }

  handleVisibilityChange() {
    const session = this.currentSession;
    if (!session || session.closed) return;
    if (document.hidden) {
      if (session.timerId !== null) clearTimeout(session.timerId);
      session.timerId = null;
      return;
    }
    this.resyncSession(session);
    this.schedulerTick(session);
  }

  emitState() {
    this.onStateChange(this.getState());
  }
}

const MenuBGM = new MenuBGMEngine();
window.MenuBGM = Object.freeze({
  start: options => MenuBGM.start(options),
  stop: options => MenuBGM.stop(options),
  reset: () => MenuBGM.reset(),
  getState: () => MenuBGM.getState()
});
})();

(() => {
'use strict';

// ── 調整値はここへ集約 ──────────────────────────────────────────
const BATTLE_BGM_CONFIG = Object.freeze({
  stepSeconds: 0.1875,
  loopSeconds: 6.9375,
  startLeadSeconds: 0.08,
  lookAheadSeconds: 0.65,
  schedulerIntervalMs: 120,
  masterGain: 0.82,
  startFadeSeconds: 0.025,
  stopFadeSeconds: 0.30,
  finishFadeSeconds: 0.30,
  stateFadeSeconds: 0.18,
  finalThreeScale: 0.30,
  melody: Object.freeze({
    sawGain: 0.060,
    triangleGain: 0.018,
    highNoteScale: 0.82,
    lowpassHz: 3400,
    filterQ: 0.65,
    attackSeconds: 0.012,
    releaseSeconds: 0.040,
    decayScale: 0.48
  }),
  bass: Object.freeze({
    squareGain: 0.048,
    triangleGain: 0.030,
    lowpassHz: 1150,
    filterQ: 0.55,
    attackSeconds: 0.010,
    releaseSeconds: 0.050,
    decayScale: 0.62
  }),
  ornament: Object.freeze({
    sineGain: 0.010,
    lowpassHz: 4200,
    attackSeconds: 0.008,
    releaseSeconds: 0.045
  }),
  finalTenAccent: Object.freeze({
    gain: 0.012,
    everySteps: 8,
    durationSeconds: 0.070,
    startHz: 880,
    endHz: 659.25
  }),
  compressor: Object.freeze({
    threshold: -8,
    knee: 5,
    ratio: 3,
    attack: 0.004,
    release: 0.12
  })
});

const NOTE_FREQ = Object.freeze({
  A2: 110.00, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00,
  B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  'G#4': 415.30, A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
  F5: 698.46, G5: 783.99, A5: 880.00, R: 0
});

// Aループは元ファイルの34イベントをそのまま保持。
const SCORE_A_RAW = [
  { m: 'A4', b: 'A2', d: 0.1875 }, { m: 'C5', b: 'A2', d: 0.1875 }, { m: 'E5', b: 'E3', d: 0.1875 }, { m: 'A5', b: 'E3', d: 0.1875 },
  { m: 'G5', b: 'G3', d: 0.1875 }, { m: 'E5', b: 'G3', d: 0.1875 }, { m: 'C5', b: 'E3', d: 0.1875 }, { m: 'B4', b: 'E3', d: 0.1875 },
  { m: 'A4', b: 'A2', d: 0.1875 }, { m: 'A4', b: 'A3', d: 0.1875 }, { m: 'C5', b: 'A2', d: 0.1875 }, { m: 'D5', b: 'A3', d: 0.1875 },
  { m: 'E5', b: 'A2', d: 0.3750 }, { m: 'E5', b: 'E3', d: 0.1875 }, { m: 'D5', b: 'E3', d: 0.1875 },
  { m: 'C5', b: 'F3', d: 0.1875 }, { m: 'C5', b: 'F3', d: 0.1875 }, { m: 'D5', b: 'G3', d: 0.1875 }, { m: 'E5', b: 'G3', d: 0.1875 },
  { m: 'B4', b: 'E3', d: 0.3750 }, { m: 'R', b: 'E3', d: 0.1875 }, { m: 'G#4', b: 'E3', d: 0.1875 },
  { m: 'A4', b: 'A2', d: 0.1875 }, { m: 'C5', b: 'A3', d: 0.1875 }, { m: 'E5', b: 'A2', d: 0.1875 }, { m: 'A5', b: 'A3', d: 0.1875 },
  { m: 'G5', b: 'G3', d: 0.1875 }, { m: 'F5', b: 'F3', d: 0.1875 }, { m: 'E5', b: 'E3', d: 0.1875 }, { m: 'D5', b: 'D3', d: 0.1875 },
  { m: 'C5', b: 'F3', d: 0.1875 }, { m: 'B4', b: 'G3', d: 0.1875 }, { m: 'A4', b: 'A2', d: 0.3750 }, { m: 'R', b: 'R', d: 0.1875 }
];

// Bループは後半だけを小さく変化。長さと低音進行はAと同じ。
const SCORE_B_RAW = [
  ...SCORE_A_RAW.slice(0, 29).map(item => ({ ...item })),
  { m: 'C5', b: 'D3', d: 0.1875, ornament: 'A5' }, // A: D5
  { m: 'D5', b: 'F3', d: 0.1875 },                 // A: C5
  { m: 'C5', b: 'G3', d: 0.1875 },                 // A: B4
  { m: 'A4', b: 'A2', d: 0.1875 },
  { m: 'G#4', b: 'A2', d: 0.1875 },                // A: A4の後半
  { m: 'R', b: 'R', d: 0.1875 }
];

function withOffsets(rawScore) {
  let offset = 0;
  return rawScore.map(item => {
    const event = Object.freeze({ ...item, offset });
    offset += item.d;
    return event;
  });
}

function scoreDuration(rawScore) {
  return rawScore.reduce((sum, item) => sum + item.d, 0);
}

const SCORE_A = Object.freeze(withOffsets(SCORE_A_RAW));
const SCORE_B = Object.freeze(withOffsets(SCORE_B_RAW));
if (Math.abs(scoreDuration(SCORE_A_RAW) - BATTLE_BGM_CONFIG.loopSeconds) > 1e-9 ||
    Math.abs(scoreDuration(SCORE_B_RAW) - BATTLE_BGM_CONFIG.loopSeconds) > 1e-9) {
  throw new Error('A/Bループ長が6.9375秒ではありません。');
}

function holdAudioParam(param, atTime) {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(atTime);
  } else {
    const value = param.value;
    param.cancelScheduledValues(atTime);
    param.setValueAtTime(value, atTime);
  }
}

class BattleBGMEngine {
  constructor(onStateChange = () => {}) {
    this.audioContext = null;
    this.currentSession = null;
    this.pendingStops = new Set();
    this.sessionSerial = 0;
    this.commandSerial = 0;
    this.remainingSeconds = 60;
    this.urgency = 'normal';
    this.onStateChange = onStateChange;
    this.visibilityHandler = () => this.handleVisibilityChange();
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  async ensureAudioContext() {
    this.audioContext = await window.HikippareAudio.ensureContext();
    return this.audioContext;
  }

  createSession(ctx) {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    const c = BATTLE_BGM_CONFIG.compressor;
    compressor.threshold.setValueAtTime(c.threshold, now);
    compressor.knee.setValueAtTime(c.knee, now);
    compressor.ratio.setValueAtTime(c.ratio, now);
    compressor.attack.setValueAtTime(c.attack, now);
    compressor.release.setValueAtTime(c.release, now);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(BATTLE_BGM_CONFIG.masterGain, now + BATTLE_BGM_CONFIG.startFadeSeconds);
    master.connect(compressor);
    compressor.connect(window.HikippareAudio.getBgmDestination());

    const startTime = now + BATTLE_BGM_CONFIG.startLeadSeconds;
    return {
      id: ++this.sessionSerial,
      master,
      compressor,
      nodes: new Set(),
      closed: false,
      hidden: false,
      timerId: null,
      startTime,
      wallStartedAt: performance.now() + BATTLE_BGM_CONFIG.startLeadSeconds * 1000,
      loopNumber: 0,
      loopStartTime: startTime,
      eventIndex: 0,
      nextAccentTime: Infinity
    };
  }

  async start() {
    if (this.currentSession && !this.currentSession.closed) return this.getState();
    const command = ++this.commandSerial;
    if (this.pendingStops.size) await Promise.allSettled([...this.pendingStops]);
    const ctx = await this.ensureAudioContext();
    if (command !== this.commandSerial) return this.getState();

    if (this.remainingSeconds <= 0) this.remainingSeconds = 60;
    this.urgency = this.remainingSeconds <= 3 ? 'final3' : this.remainingSeconds <= 10 ? 'final10' : 'normal';
    const session = this.createSession(ctx);
    this.currentSession = session;
    this.applyUrgencyGain(session, true);
    this.prepareAccentClock(session);
    this.schedulerTick(session);
    this.emitState();
    return this.getState();
  }

  updateRemaining(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value)) return this.getState();
    this.remainingSeconds = Math.max(0, value);
    const nextUrgency = this.remainingSeconds <= 0 ? 'finished' : this.remainingSeconds <= 3 ? 'final3' : this.remainingSeconds <= 10 ? 'final10' : 'normal';
    const changed = nextUrgency !== this.urgency;
    this.urgency = nextUrgency;

    const session = this.currentSession;
    if (session && !session.closed) {
      if (nextUrgency === 'finished') {
        void this.stop({ fadeSeconds: BATTLE_BGM_CONFIG.finishFadeSeconds, preserveRemaining: true });
      } else {
        this.applyUrgencyGain(session, false);
        if (changed) {
          if (nextUrgency === 'final10') this.prepareAccentClock(session);
          if (nextUrgency !== 'final10') this.cancelAccentNodes(session);
        }
      }
    }
    this.emitState();
    return this.getState();
  }

  reset() {
    this.remainingSeconds = 60;
    this.urgency = 'normal';
    const session = this.currentSession;
    if (session && !session.closed) {
      this.cancelAccentNodes(session);
      this.applyUrgencyGain(session, false);
    }
    this.emitState();
    return this.getState();
  }

  async stop(options = {}) {
    const fadeSeconds = Math.max(0.01, Number(options.fadeSeconds ?? BATTLE_BGM_CONFIG.stopFadeSeconds));
    const preserveRemaining = Boolean(options.preserveRemaining);
    const command = ++this.commandSerial;
    const session = this.currentSession;
    if (!session || session.closed) {
      if (!preserveRemaining && this.remainingSeconds <= 0) this.reset();
      this.emitState();
      return this.getState();
    }

    this.currentSession = null;
    session.closed = true;
    if (session.timerId !== null) clearTimeout(session.timerId);
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    holdAudioParam(session.master.gain, now);
    session.master.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);

    for (const record of [...session.nodes]) {
      try { record.oscillator.stop(now + fadeSeconds + 0.012); } catch (_) {}
    }

    const stopPromise = new Promise(resolve => {
      setTimeout(() => {
        for (const record of [...session.nodes]) this.disconnectRecord(session, record);
        try { session.master.disconnect(); } catch (_) {}
        try { session.compressor.disconnect(); } catch (_) {}
        resolve();
      }, Math.ceil((fadeSeconds + 0.05) * 1000));
    });
    this.pendingStops.add(stopPromise);
    stopPromise.finally(() => this.pendingStops.delete(stopPromise));

    if (!preserveRemaining && this.remainingSeconds <= 0) {
      this.remainingSeconds = 60;
      this.urgency = 'normal';
    }
    this.emitState();
    await stopPromise;
    if (command === this.commandSerial) this.emitState();
    return this.getState();
  }

  getState() {
    const session = this.currentSession;
    const audibleLoopNumber = session && !session.closed
      ? Math.max(0, Math.floor(((this.audioContext.currentTime - session.startTime)) / BATTLE_BGM_CONFIG.loopSeconds))
      : 0;
    return Object.freeze({
      playing: Boolean(session && !session.closed),
      loop: session && !session.closed ? (audibleLoopNumber % 2 === 0 ? 'A' : 'B') : null,
      urgency: this.urgency,
      remainingSeconds: this.remainingSeconds,
      sessionId: session && !session.closed ? session.id : null
    });
  }

  emitState() {
    this.onStateChange(this.getState());
  }

  applyUrgencyGain(session, immediate) {
    if (!this.audioContext || session.closed) return;
    const now = this.audioContext.currentTime;
    const scale = this.urgency === 'final3' ? BATTLE_BGM_CONFIG.finalThreeScale : 1;
    holdAudioParam(session.master.gain, now);
    const target = Math.max(0.0001, BATTLE_BGM_CONFIG.masterGain * scale);
    if (immediate) {
      session.master.gain.setValueAtTime(0.0001, now);
      session.master.gain.linearRampToValueAtTime(target, now + BATTLE_BGM_CONFIG.startFadeSeconds);
    } else {
      session.master.gain.linearRampToValueAtTime(target, now + BATTLE_BGM_CONFIG.stateFadeSeconds);
    }
  }

  prepareAccentClock(session) {
    if (!this.audioContext || session.closed || this.urgency !== 'final10') {
      session.nextAccentTime = Infinity;
      return;
    }
    const interval = BATTLE_BGM_CONFIG.stepSeconds * BATTLE_BGM_CONFIG.finalTenAccent.everySteps;
    const now = this.audioContext.currentTime + 0.04;
    const elapsed = Math.max(0, now - session.startTime);
    session.nextAccentTime = session.startTime + Math.ceil(elapsed / interval) * interval;
  }

  cancelAccentNodes(session) {
    session.nextAccentTime = Infinity;
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    for (const record of [...session.nodes]) {
      if (record.kind !== 'accent') continue;
      try {
        holdAudioParam(record.gain.gain, now);
        record.gain.gain.linearRampToValueAtTime(0.0001, now + 0.035);
        record.oscillator.stop(now + 0.045);
      } catch (_) {}
    }
  }

  schedulerTick(session) {
    if (session.closed || this.currentSession !== session || !this.audioContext) return;
    if (document.hidden) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const horizon = now + BATTLE_BGM_CONFIG.lookAheadSeconds;
    const score = () => session.loopNumber % 2 === 0 ? SCORE_A : SCORE_B;
    let nextEvent = score()[session.eventIndex];

    if (nextEvent && session.loopStartTime + nextEvent.offset < now - 0.10) {
      this.resyncSession(session);
    }

    while (!session.closed) {
      const currentScore = score();
      const event = currentScore[session.eventIndex];
      const eventTime = session.loopStartTime + event.offset;
      if (eventTime >= horizon) break;
      if (eventTime >= now - 0.025) this.scheduleEvent(session, event, eventTime);

      session.eventIndex += 1;
      if (session.eventIndex >= currentScore.length) {
        session.eventIndex = 0;
        session.loopNumber += 1;
        session.loopStartTime += BATTLE_BGM_CONFIG.loopSeconds;
      }
    }

    if (this.urgency === 'final10') {
      const interval = BATTLE_BGM_CONFIG.stepSeconds * BATTLE_BGM_CONFIG.finalTenAccent.everySteps;
      while (session.nextAccentTime < horizon) {
        if (session.nextAccentTime >= now - 0.025) this.scheduleFinalTenAccent(session, session.nextAccentTime);
        session.nextAccentTime += interval;
      }
    }

    this.emitState();
    session.timerId = setTimeout(() => this.schedulerTick(session), BATTLE_BGM_CONFIG.schedulerIntervalMs);
  }

  resyncSession(session) {
    const ctx = this.audioContext;
    const logicalElapsed = Math.max(0, (this.audioContext.currentTime - session.startTime));
    const loopNumber = Math.floor(logicalElapsed / BATTLE_BGM_CONFIG.loopSeconds);
    const loopOffset = logicalElapsed - loopNumber * BATTLE_BGM_CONFIG.loopSeconds;
    const currentScore = loopNumber % 2 === 0 ? SCORE_A : SCORE_B;
    let eventIndex = currentScore.findIndex(event => event.offset >= loopOffset - 0.01);
    if (eventIndex < 0) eventIndex = 0;
    session.loopNumber = loopNumber;
    session.eventIndex = eventIndex;
    session.loopStartTime = ctx.currentTime - loopOffset + BATTLE_BGM_CONFIG.startLeadSeconds;
    if (this.urgency === 'final10') this.prepareAccentClock(session);
  }

  scheduleEvent(session, event, atTime) {
    if (event.m !== 'R') {
      const highScale = NOTE_FREQ[event.m] >= NOTE_FREQ.A5 ? BATTLE_BGM_CONFIG.melody.highNoteScale : 1;
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.m], type: 'sawtooth', gain: BATTLE_BGM_CONFIG.melody.sawGain * highScale,
        atTime, duration: event.d, filterHz: BATTLE_BGM_CONFIG.melody.lowpassHz, filterQ: BATTLE_BGM_CONFIG.melody.filterQ,
        attack: BATTLE_BGM_CONFIG.melody.attackSeconds, release: BATTLE_BGM_CONFIG.melody.releaseSeconds,
        decayScale: BATTLE_BGM_CONFIG.melody.decayScale, kind: 'melody'
      });
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.m], type: 'triangle', gain: BATTLE_BGM_CONFIG.melody.triangleGain * highScale,
        atTime, duration: event.d, filterHz: 4200, filterQ: 0.45,
        attack: BATTLE_BGM_CONFIG.melody.attackSeconds, release: BATTLE_BGM_CONFIG.melody.releaseSeconds,
        decayScale: 0.56, kind: 'melody-rounding'
      });
    }
    if (event.b !== 'R') {
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.b], type: 'square', gain: BATTLE_BGM_CONFIG.bass.squareGain,
        atTime, duration: event.d, filterHz: BATTLE_BGM_CONFIG.bass.lowpassHz, filterQ: BATTLE_BGM_CONFIG.bass.filterQ,
        attack: BATTLE_BGM_CONFIG.bass.attackSeconds, release: BATTLE_BGM_CONFIG.bass.releaseSeconds,
        decayScale: BATTLE_BGM_CONFIG.bass.decayScale, kind: 'bass'
      });
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.b], type: 'triangle', gain: BATTLE_BGM_CONFIG.bass.triangleGain,
        atTime, duration: event.d, filterHz: 1700, filterQ: 0.45,
        attack: BATTLE_BGM_CONFIG.bass.attackSeconds, release: BATTLE_BGM_CONFIG.bass.releaseSeconds,
        decayScale: 0.72, kind: 'bass-foundation'
      });
    }
    if (event.ornament) {
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.ornament], type: 'sine', gain: BATTLE_BGM_CONFIG.ornament.sineGain,
        atTime, duration: BATTLE_BGM_CONFIG.stepSeconds / 2, filterHz: BATTLE_BGM_CONFIG.ornament.lowpassHz,
        filterQ: 0.45, attack: BATTLE_BGM_CONFIG.ornament.attackSeconds,
        release: BATTLE_BGM_CONFIG.ornament.releaseSeconds, decayScale: 0.50, kind: 'ornament'
      });
    }
  }

  scheduleVoice(session, voice) {
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const end = voice.atTime + voice.duration;
    const releaseStart = Math.max(voice.atTime + voice.attack, end - voice.release);
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.frequency, voice.atTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(voice.filterHz, voice.atTime);
    filter.Q.setValueAtTime(voice.filterQ, voice.atTime);
    gain.gain.setValueAtTime(0.0001, voice.atTime);
    gain.gain.linearRampToValueAtTime(voice.gain, voice.atTime + voice.attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, voice.gain * voice.decayScale), releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, end - 0.002);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(session.master);
    oscillator.start(voice.atTime);
    oscillator.stop(end);
    this.trackNode(session, { oscillator, gain, filter, kind: voice.kind });
  }

  scheduleFinalTenAccent(session, atTime) {
    const ctx = this.audioContext;
    const c = BATTLE_BGM_CONFIG.finalTenAccent;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(c.startHz, atTime);
    oscillator.frequency.exponentialRampToValueAtTime(c.endHz, atTime + c.durationSeconds);
    gain.gain.setValueAtTime(0.0001, atTime);
    gain.gain.linearRampToValueAtTime(c.gain, atTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + c.durationSeconds);
    oscillator.connect(gain);
    gain.connect(session.master);
    oscillator.start(atTime);
    oscillator.stop(atTime + c.durationSeconds + 0.004);
    this.trackNode(session, { oscillator, gain, filter: null, kind: 'accent' });
  }

  trackNode(session, record) {
    session.nodes.add(record);
    record.oscillator.onended = () => this.disconnectRecord(session, record);
  }

  disconnectRecord(session, record) {
    if (!session.nodes.has(record)) return;
    session.nodes.delete(record);
    try { record.oscillator.disconnect(); } catch (_) {}
    try { record.filter?.disconnect(); } catch (_) {}
    try { record.gain.disconnect(); } catch (_) {}
  }

  handleVisibilityChange() {
    const session = this.currentSession;
    if (!session || session.closed || !this.audioContext) return;
    if (document.hidden) {
      session.hidden = true;
      if (session.timerId !== null) clearTimeout(session.timerId);
      const now = this.audioContext.currentTime;
      for (const record of [...session.nodes]) {
        try {
          holdAudioParam(record.gain.gain, now);
          record.gain.gain.linearRampToValueAtTime(0.0001, now + 0.035);
          record.oscillator.stop(now + 0.04);
        } catch (_) {}
      }
      return;
    }
    if (!session.hidden) return;
    session.hidden = false;
    void this.audioContext.resume().then(() => {
      if (this.currentSession !== session || session.closed) return;
      this.resyncSession(session);
      this.schedulerTick(session);
    });
  }
}

// 将来のゲーム本体から使う公開API。
const BattleBGM = new BattleBGMEngine(() => {});
window.BattleBGM = Object.freeze({
  start: () => BattleBGM.start(),
  updateRemaining: seconds => BattleBGM.updateRemaining(seconds),
  stop: options => BattleBGM.stop(options),
  reset: () => BattleBGM.reset(),
  getState: () => BattleBGM.getState()
});
})();

(() => {
'use strict';
const TRACK_KEY = 'lion';
function getSharedBGMHub() {
  if (window.HikippareBGMHub) return window.HikippareBGMHub;
  let audioContext = null;
  let active = null;
  let commandSerial = 0;
  const hub = {
    async ensureContext() {
      if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error('Web Audio APIに対応していないブラウザです。');
        audioContext = new AudioContextClass();
      }
      if (audioContext.state === 'suspended') await audioContext.resume();
      return audioContext;
    },
    async activate(key, startCurrent, stopCurrent) {
      const command = ++commandSerial;
      if (active && active.key !== key) {
        await active.stop({ fadeSeconds: 0.12, preserveRemaining: true });
      }
      if (command !== commandSerial) return false;
      active = { key, stop: stopCurrent };
      try {
        await startCurrent();
        return command === commandSerial;
      } catch (error) {
        if (command === commandSerial && active?.key === key) active = null;
        throw error;
      }
    },
    release(key) {
      if (active?.key === key) active = null;
    },
    getState() {
      return Object.freeze({ activeTrack: active?.key || null, audioContextCount: audioContext ? 1 : 0, audioContextState: audioContext?.state || 'not-created' });
    }
  };
  window.HikippareBGMHub = hub;
  return hub;
}
const BGM_HUB = getSharedBGMHub();

// ── ライオン戦向け調整値 ──────────────────────────────────────────
const BATTLE_BGM_CONFIG = Object.freeze({
  stepSeconds: 0.171875, // テンポを若干上げて緊張感を向上
  loopSeconds: 6.359375,
  startLeadSeconds: 0.08,
  lookAheadSeconds: 0.65,
  schedulerIntervalMs: 120,
  masterGain: 0.62,
  startFadeSeconds: 0.025,
  stopFadeSeconds: 0.30,
  finishFadeSeconds: 0.30,
  stateFadeSeconds: 0.18,
  finalThreeScale: 0.30,
  melody: Object.freeze({
    sawGain: 0.075,
    triangleGain: 0.025,
    highNoteScale: 0.85,
    lowpassHz: 2800, // 重厚感を出すため少し抑えめ
    filterQ: 1.2,
    attackSeconds: 0.010,
    releaseSeconds: 0.050,
    decayScale: 0.50
  }),
  bass: Object.freeze({
    squareGain: 0.065,
    triangleGain: 0.045,
    lowpassHz: 800,
    filterQ: 0.85,
    attackSeconds: 0.008,
    releaseSeconds: 0.060,
    decayScale: 0.70
  }),
  ornament: Object.freeze({
    sineGain: 0.015,
    lowpassHz: 3500,
    attackSeconds: 0.005,
    releaseSeconds: 0.040
  }),
  finalTenAccent: Object.freeze({
    gain: 0.012,
    everySteps: 8,
    durationSeconds: 0.080,
    startHz: 987.77,
    endHz: 493.88
  }),
  compressor: Object.freeze({
    threshold: -10,
    knee: 4,
    ratio: 4,
    attack: 0.003,
    release: 0.10
  })
});

const NOTE_FREQ = Object.freeze({
  E2: 82.41, G2: 98.00, A2: 110.00, B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81, 
  F3: 174.61, G3: 196.00, 'G#3': 207.65, A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, 
  'D#4': 311.13, E4: 329.63, F4: 349.23, G4: 392.00, 'G#4': 415.30, A4: 440.00, 
  B4: 493.88, C5: 523.25, D5: 587.33, 'D#5': 622.25, E5: 659.25, F5: 698.46, G5: 783.99, R: 0
});

// ライオン戦用（ホ長調/短調風重厚メロディ）
const SCORE_A_RAW = [
  { m: 'E4', b: 'E2', d: 0.171875 }, { m: 'G4', b: 'E2', d: 0.171875 }, { m: 'B4', b: 'E3', d: 0.171875 }, { m: 'E5', b: 'E3', d: 0.171875 },
  { m: 'D5', b: 'G2', d: 0.171875 }, { m: 'B4', b: 'G2', d: 0.171875 }, { m: 'G4', b: 'G3', d: 0.171875 }, { m: 'F4', b: 'G3', d: 0.171875 },
  { m: 'E4', b: 'A2', d: 0.171875 }, { m: 'A4', b: 'A2', d: 0.171875 }, { m: 'C5', b: 'A3', d: 0.171875 }, { m: 'B4', b: 'A3', d: 0.171875 },
  { m: 'G#4', b: 'E2', d: 0.343750 }, { m: 'B4', b: 'E3', d: 0.171875 }, { m: 'E5', b: 'E3', d: 0.171875 },
  { m: 'D5', b: 'C3', d: 0.171875 }, { m: 'C5', b: 'C3', d: 0.171875 }, { m: 'B4', b: 'D3', d: 0.171875 }, { m: 'A4', b: 'D3', d: 0.171875 },
  { m: 'G#4', b: 'E2', d: 0.343750 }, { m: 'R', b: 'E2', d: 0.171875 }, { m: 'E4', b: 'E3', d: 0.171875 },
  { m: 'E5', b: 'E2', d: 0.171875 }, { m: 'D#5', b: 'E2', d: 0.171875 }, { m: 'D5', b: 'E3', d: 0.171875 }, { m: 'C5', b: 'E3', d: 0.171875 },
  { m: 'B4', b: 'G2', d: 0.171875 }, { m: 'A4', b: 'A2', d: 0.171875 }, { m: 'G#4', b: 'B2', d: 0.171875 }, { m: 'F4', b: 'B2', d: 0.171875 },
  { m: 'E4', b: 'E2', d: 0.171875 }, { m: 'G4', b: 'E2', d: 0.171875 }, { m: 'E4', b: 'E2', d: 0.343750 }, { m: 'R', b: 'R', d: 0.171875 }
];

const SCORE_B_RAW = [
  ...SCORE_A_RAW.slice(0, 22).map(item => ({ ...item })),
  { m: 'E5', b: 'C3', d: 0.171875, ornament: 'G5' },
  { m: 'F5', b: 'C3', d: 0.171875 },
  { m: 'E5', b: 'D3', d: 0.171875 },
  { m: 'D5', b: 'D3', d: 0.171875 },
  { m: 'C5', b: 'E2', d: 0.171875 },
  { m: 'B4', b: 'E2', d: 0.171875 },
  { m: 'A4', b: 'B2', d: 0.171875 },
  { m: 'G#4', b: 'B2', d: 0.171875 },
  { m: 'E4', b: 'E2', d: 0.171875 },
  { m: 'B4', b: 'E2', d: 0.171875 },
  { m: 'E5', b: 'E2', d: 0.343750 },
  { m: 'R', b: 'R', d: 0.171875 }
];

function withOffsets(rawScore) {
  let offset = 0;
  return rawScore.map(item => {
    const event = Object.freeze({ ...item, offset });
    offset += item.d;
    return event;
  });
}

function scoreDuration(rawScore) {
  return rawScore.reduce((sum, item) => sum + item.d, 0);
}

const SCORE_A = Object.freeze(withOffsets(SCORE_A_RAW));
const SCORE_B = Object.freeze(withOffsets(SCORE_B_RAW));

for (const [name, raw] of [['A', SCORE_A_RAW], ['B', SCORE_B_RAW]]) {
  const duration = scoreDuration(raw);
  if (Math.abs(duration - BATTLE_BGM_CONFIG.loopSeconds) > 1e-9) throw new Error(`${name}ループ長が設定値と一致しません。`);
  for (const event of raw) {
    for (const note of [event.m, event.b, event.ornament]) {
      if (note && note !== 'R' && !Number.isFinite(NOTE_FREQ[note])) throw new Error(`${name}ループに未定義音程があります: ${note}`);
    }
  }
}

function holdAudioParam(param, atTime) {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(atTime);
  } else {
    const value = param.value;
    param.cancelScheduledValues(atTime);
    param.setValueAtTime(value, atTime);
  }
}

class BattleBGMEngine {
  constructor(onStateChange = () => {}) {
    this.audioContext = null;
    this.currentSession = null;
    this.pendingStops = new Set();
    this.sessionSerial = 0;
    this.commandSerial = 0;
    this.remainingSeconds = 60;
    this.urgency = 'normal';
    this.onStateChange = onStateChange;
    this.visibilityHandler = () => this.handleVisibilityChange();
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  async ensureAudioContext() {
    this.audioContext = await BGM_HUB.ensureContext();
    return this.audioContext;
  }

  createSession(ctx) {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    const c = BATTLE_BGM_CONFIG.compressor;
    compressor.threshold.setValueAtTime(c.threshold, now);
    compressor.knee.setValueAtTime(c.knee, now);
    compressor.ratio.setValueAtTime(c.ratio, now);
    compressor.attack.setValueAtTime(c.attack, now);
    compressor.release.setValueAtTime(c.release, now);
    master.gain.setValueAtTime(0.0001, now);
    master.connect(compressor);
    compressor.connect(window.HikippareAudio.getBgmDestination());

    const startTime = now + BATTLE_BGM_CONFIG.startLeadSeconds;
    return {
      id: ++this.sessionSerial,
      master,
      compressor,
      nodes: new Set(),
      closed: false,
      hidden: false,
      timerId: null,
      startTime,
      wallStartedAt: performance.now() + BATTLE_BGM_CONFIG.startLeadSeconds * 1000,
      loopNumber: 0,
      loopStartTime: startTime,
      eventIndex: 0,
      nextAccentTime: Infinity
    };
  }

  async start() {
    if (this.currentSession && !this.currentSession.closed) return this.getState();
    const command = ++this.commandSerial;
    if (this.pendingStops.size) await Promise.allSettled([...this.pendingStops]);
    const ctx = await this.ensureAudioContext();
    if (command !== this.commandSerial) return this.getState();

    if (this.remainingSeconds <= 0) this.remainingSeconds = 60;
    this.urgency = this.remainingSeconds <= 3 ? 'final3' : this.remainingSeconds <= 10 ? 'final10' : 'normal';
    const session = this.createSession(ctx);
    this.currentSession = session;
    this.applyUrgencyGain(session, true);
    this.prepareAccentClock(session);
    this.schedulerTick(session);
    this.emitState();
    return this.getState();
  }

  updateRemaining(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value)) return this.getState();
    this.remainingSeconds = Math.max(0, value);
    const nextUrgency = this.remainingSeconds <= 0 ? 'finished' : this.remainingSeconds <= 3 ? 'final3' : this.remainingSeconds <= 10 ? 'final10' : 'normal';
    const changed = nextUrgency !== this.urgency;
    this.urgency = nextUrgency;

    const session = this.currentSession;
    if (session && !session.closed) {
      if (nextUrgency === 'finished') {
        void this.stop({ fadeSeconds: BATTLE_BGM_CONFIG.finishFadeSeconds, preserveRemaining: true });
      } else if (changed) {
        this.applyUrgencyGain(session, false);
        if (nextUrgency === 'final10') this.prepareAccentClock(session);
        if (nextUrgency !== 'final10') this.cancelAccentNodes(session);
      }
    }
    this.emitState();
    return this.getState();
  }

  reset() {
    this.remainingSeconds = 60;
    this.urgency = 'normal';
    const session = this.currentSession;
    if (session && !session.closed) {
      this.cancelAccentNodes(session);
      this.applyUrgencyGain(session, false);
    }
    this.emitState();
    return this.getState();
  }

  async stop(options = {}) {
    const fadeSeconds = Math.max(0.01, Number(options.fadeSeconds ?? BATTLE_BGM_CONFIG.stopFadeSeconds));
    const preserveRemaining = Boolean(options.preserveRemaining);
    const command = ++this.commandSerial;
    const session = this.currentSession;
    BGM_HUB.release(TRACK_KEY);
    if (!session || session.closed) {
      if (!preserveRemaining && this.remainingSeconds <= 0) this.reset();
      this.emitState();
      return this.getState();
    }

    this.currentSession = null;
    session.closed = true;
    if (session.timerId !== null) clearTimeout(session.timerId);
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    holdAudioParam(session.master.gain, now);
    session.master.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);

    for (const record of [...session.nodes]) {
      try { record.oscillator.stop(now + fadeSeconds + 0.012); } catch (_) {}
    }

    const stopPromise = new Promise(resolve => {
      setTimeout(() => {
        for (const record of [...session.nodes]) this.disconnectRecord(session, record);
        try { session.master.disconnect(); } catch (_) {}
        try { session.compressor.disconnect(); } catch (_) {}
        resolve();
      }, Math.ceil((fadeSeconds + 0.05) * 1000));
    });
    this.pendingStops.add(stopPromise);
    stopPromise.finally(() => this.pendingStops.delete(stopPromise));

    if (!preserveRemaining && this.remainingSeconds <= 0) {
      this.remainingSeconds = 60;
      this.urgency = 'normal';
    }
    this.emitState();
    await stopPromise;
    if (command === this.commandSerial) this.emitState();
    return this.getState();
  }

  getState() {
    const session = this.currentSession;
    const audibleLoopNumber = session && !session.closed
      ? Math.max(0, Math.floor(((this.audioContext.currentTime - session.startTime)) / BATTLE_BGM_CONFIG.loopSeconds))
      : 0;
    return Object.freeze({
      playing: Boolean(session && !session.closed),
      loop: session && !session.closed ? (audibleLoopNumber % 2 === 0 ? 'A' : 'B') : null,
      urgency: this.urgency,
      remainingSeconds: this.remainingSeconds,
      sessionId: session && !session.closed ? session.id : null,
      audioContextState: this.audioContext?.state || 'not-created',
      scheduledNodes: session && !session.closed ? session.nodes.size : 0,
      pendingStops: this.pendingStops.size
    });
  }

  emitState() {
    this.onStateChange(this.getState());
  }

  applyUrgencyGain(session, immediate) {
    if (!this.audioContext || session.closed) return;
    const now = this.audioContext.currentTime;
    const scale = this.urgency === 'final3' ? BATTLE_BGM_CONFIG.finalThreeScale : 1;
    holdAudioParam(session.master.gain, now);
    const target = Math.max(0.0001, BATTLE_BGM_CONFIG.masterGain * scale);
    if (immediate) {
      session.master.gain.setValueAtTime(0.0001, now);
      session.master.gain.linearRampToValueAtTime(target, now + BATTLE_BGM_CONFIG.startFadeSeconds);
    } else {
      session.master.gain.linearRampToValueAtTime(target, now + BATTLE_BGM_CONFIG.stateFadeSeconds);
    }
  }

  prepareAccentClock(session) {
    if (!this.audioContext || session.closed || this.urgency !== 'final10') {
      session.nextAccentTime = Infinity;
      return;
    }
    const interval = BATTLE_BGM_CONFIG.stepSeconds * BATTLE_BGM_CONFIG.finalTenAccent.everySteps;
    const now = this.audioContext.currentTime + 0.04;
    const elapsed = Math.max(0, now - session.startTime);
    session.nextAccentTime = session.startTime + Math.ceil(elapsed / interval) * interval;
  }

  cancelAccentNodes(session) {
    session.nextAccentTime = Infinity;
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    for (const record of [...session.nodes]) {
      if (record.kind !== 'accent') continue;
      try {
        holdAudioParam(record.gain.gain, now);
        record.gain.gain.linearRampToValueAtTime(0.0001, now + 0.035);
        record.oscillator.stop(now + 0.045);
      } catch (_) {}
    }
  }

  schedulerTick(session) {
    if (session.closed || this.currentSession !== session || !this.audioContext) return;
    if (document.hidden) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const horizon = now + BATTLE_BGM_CONFIG.lookAheadSeconds;
    const score = () => session.loopNumber % 2 === 0 ? SCORE_A : SCORE_B;
    let nextEvent = score()[session.eventIndex];

    if (nextEvent && session.loopStartTime + nextEvent.offset < now - 0.10) {
      this.resyncSession(session);
    }

    while (!session.closed) {
      const currentScore = score();
      const event = currentScore[session.eventIndex];
      if (!event) {
        session.eventIndex = 0;
        session.loopNumber += 1;
        session.loopStartTime += BATTLE_BGM_CONFIG.loopSeconds;
        continue;
      }
      const eventTime = session.loopStartTime + event.offset;
      if (eventTime >= horizon) break;
      if (eventTime >= now - 0.025) this.scheduleEvent(session, event, eventTime);

      session.eventIndex += 1;
      if (session.eventIndex >= currentScore.length) {
        session.eventIndex = 0;
        session.loopNumber += 1;
        session.loopStartTime += BATTLE_BGM_CONFIG.loopSeconds;
      }
    }

    if (this.urgency === 'final10') {
      const interval = BATTLE_BGM_CONFIG.stepSeconds * BATTLE_BGM_CONFIG.finalTenAccent.everySteps;
      while (session.nextAccentTime < horizon) {
        if (session.nextAccentTime >= now - 0.025) this.scheduleFinalTenAccent(session, session.nextAccentTime);
        session.nextAccentTime += interval;
      }
    }

    this.emitState();
    session.timerId = setTimeout(() => this.schedulerTick(session), BATTLE_BGM_CONFIG.schedulerIntervalMs);
  }

  resyncSession(session) {
    const ctx = this.audioContext;
    const logicalElapsed = Math.max(0, (this.audioContext.currentTime - session.startTime));
    const loopNumber = Math.floor(logicalElapsed / BATTLE_BGM_CONFIG.loopSeconds);
    const loopOffset = logicalElapsed - loopNumber * BATTLE_BGM_CONFIG.loopSeconds;
    const currentScore = loopNumber % 2 === 0 ? SCORE_A : SCORE_B;
    let eventIndex = currentScore.findIndex(event => event.offset >= loopOffset - 0.01);
    if (eventIndex < 0) eventIndex = currentScore.length;
    session.loopNumber = loopNumber;
    session.eventIndex = eventIndex;
    session.loopStartTime = ctx.currentTime - loopOffset;
    if (this.urgency === 'final10') this.prepareAccentClock(session);
  }

  scheduleEvent(session, event, atTime) {
    if (event.m !== 'R') {
      const highScale = NOTE_FREQ[event.m] >= NOTE_FREQ.E5 ? BATTLE_BGM_CONFIG.melody.highNoteScale : 1;
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.m], type: 'sawtooth', gain: BATTLE_BGM_CONFIG.melody.sawGain * highScale,
        atTime, duration: event.d, filterHz: BATTLE_BGM_CONFIG.melody.lowpassHz, filterQ: BATTLE_BGM_CONFIG.melody.filterQ,
        attack: BATTLE_BGM_CONFIG.melody.attackSeconds, release: BATTLE_BGM_CONFIG.melody.releaseSeconds,
        decayScale: BATTLE_BGM_CONFIG.melody.decayScale, kind: 'melody'
      });
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.m], type: 'triangle', gain: BATTLE_BGM_CONFIG.melody.triangleGain * highScale,
        atTime, duration: event.d, filterHz: 3600, filterQ: 0.55,
        attack: BATTLE_BGM_CONFIG.melody.attackSeconds, release: BATTLE_BGM_CONFIG.melody.releaseSeconds,
        decayScale: 0.60, kind: 'melody-rounding'
      });
    }
    if (event.b !== 'R') {
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.b], type: 'square', gain: BATTLE_BGM_CONFIG.bass.squareGain,
        atTime, duration: event.d, filterHz: BATTLE_BGM_CONFIG.bass.lowpassHz, filterQ: BATTLE_BGM_CONFIG.bass.filterQ,
        attack: BATTLE_BGM_CONFIG.bass.attackSeconds, release: BATTLE_BGM_CONFIG.bass.releaseSeconds,
        decayScale: BATTLE_BGM_CONFIG.bass.decayScale, kind: 'bass'
      });
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.b], type: 'triangle', gain: BATTLE_BGM_CONFIG.bass.triangleGain,
        atTime, duration: event.d, filterHz: 1200, filterQ: 0.50,
        attack: BATTLE_BGM_CONFIG.bass.attackSeconds, release: BATTLE_BGM_CONFIG.bass.releaseSeconds,
        decayScale: 0.75, kind: 'bass-foundation'
      });
    }
    if (event.ornament) {
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.ornament], type: 'sine', gain: BATTLE_BGM_CONFIG.ornament.sineGain,
        atTime, duration: BATTLE_BGM_CONFIG.stepSeconds / 2, filterHz: BATTLE_BGM_CONFIG.ornament.lowpassHz,
        filterQ: 0.50, attack: BATTLE_BGM_CONFIG.ornament.attackSeconds,
        release: BATTLE_BGM_CONFIG.ornament.releaseSeconds, decayScale: 0.50, kind: 'ornament'
      });
    }
  }

  scheduleVoice(session, voice) {
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const end = voice.atTime + voice.duration;
    const releaseStart = Math.max(voice.atTime + voice.attack, end - voice.release);
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.frequency, voice.atTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(voice.filterHz, voice.atTime);
    filter.Q.setValueAtTime(voice.filterQ, voice.atTime);
    gain.gain.setValueAtTime(0.0001, voice.atTime);
    gain.gain.linearRampToValueAtTime(voice.gain, voice.atTime + voice.attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, voice.gain * voice.decayScale), releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, end - 0.002);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(session.master);
    oscillator.start(voice.atTime);
    oscillator.stop(end);
    this.trackNode(session, { oscillator, gain, filter, kind: voice.kind });
  }

  scheduleFinalTenAccent(session, atTime) {
    const ctx = this.audioContext;
    const c = BATTLE_BGM_CONFIG.finalTenAccent;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(c.startHz, atTime);
    oscillator.frequency.exponentialRampToValueAtTime(c.endHz, atTime + c.durationSeconds);
    gain.gain.setValueAtTime(0.0001, atTime);
    gain.gain.linearRampToValueAtTime(c.gain, atTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + c.durationSeconds);
    oscillator.connect(gain);
    gain.connect(session.master);
    oscillator.start(atTime);
    oscillator.stop(atTime + c.durationSeconds + 0.004);
    this.trackNode(session, { oscillator, gain, filter: null, kind: 'accent' });
  }

  trackNode(session, record) {
    session.nodes.add(record);
    record.oscillator.onended = () => this.disconnectRecord(session, record);
  }

  disconnectRecord(session, record) {
    if (!session.nodes.has(record)) return;
    session.nodes.delete(record);
    try { record.oscillator.disconnect(); } catch (_) {}
    try { record.filter?.disconnect(); } catch (_) {}
    try { record.gain.disconnect(); } catch (_) {}
  }

  handleVisibilityChange() {
    const session = this.currentSession;
    if (!session || session.closed || !this.audioContext) return;
    if (document.hidden) {
      session.hidden = true;
      if (session.timerId !== null) clearTimeout(session.timerId);
      const now = this.audioContext.currentTime;
      for (const record of [...session.nodes]) {
        try {
          holdAudioParam(record.gain.gain, now);
          record.gain.gain.linearRampToValueAtTime(0.0001, now + 0.035);
          record.oscillator.stop(now + 0.04);
        } catch (_) {}
      }
      return;
    }
    if (!session.hidden) return;
    session.hidden = false;
    void this.audioContext.resume().then(() => {
      if (this.currentSession !== session || session.closed) return;
      this.resyncSession(session);
      this.schedulerTick(session);
    });
  }
}

const BattleBGM = new BattleBGMEngine(() => {});
const LionOfficialBGM = Object.freeze({
  start: async () => {
    await BGM_HUB.activate(TRACK_KEY, () => BattleBGM.start(), options => BattleBGM.stop(options));
    return BattleBGM.getState();
  },
  updateRemaining: seconds => BattleBGM.updateRemaining(seconds),
  stop: options => BattleBGM.stop(options),
  reset: () => BattleBGM.reset(),
  getState: () => BattleBGM.getState()
});
window.LionOfficialBGM = LionOfficialBGM;
})();

(() => {
'use strict';
const TRACK_KEY = 'ghost';
function getSharedBGMHub() {
  if (window.HikippareBGMHub) return window.HikippareBGMHub;
  let audioContext = null;
  let active = null;
  let commandSerial = 0;
  const hub = {
    async ensureContext() {
      if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error('Web Audio APIに対応していないブラウザです。');
        audioContext = new AudioContextClass();
      }
      if (audioContext.state === 'suspended') await audioContext.resume();
      return audioContext;
    },
    async activate(key, startCurrent, stopCurrent) {
      const command = ++commandSerial;
      if (active && active.key !== key) {
        await active.stop({ fadeSeconds: 0.12, preserveRemaining: true });
      }
      if (command !== commandSerial) return false;
      active = { key, stop: stopCurrent };
      try {
        await startCurrent();
        return command === commandSerial;
      } catch (error) {
        if (command === commandSerial && active?.key === key) active = null;
        throw error;
      }
    },
    release(key) {
      if (active?.key === key) active = null;
    },
    getState() {
      return Object.freeze({ activeTrack: active?.key || null, audioContextCount: audioContext ? 1 : 0, audioContextState: audioContext?.state || 'not-created' });
    }
  };
  window.HikippareBGMHub = hub;
  return hub;
}
const BGM_HUB = getSharedBGMHub();

// ── 裏・最強王者（ドラゴン等）向け超高難易度調整値 ──────────────────
const BATTLE_BGM_CONFIG = Object.freeze({
  stepSeconds: 0.14, // テンポ超高速化（16分音符感覚の0.14秒）
  loopSeconds: 5.32,
  startLeadSeconds: 0.08,
  lookAheadSeconds: 0.65,
  schedulerIntervalMs: 100,
  masterGain: 0.62,
  startFadeSeconds: 0.025,
  stopFadeSeconds: 0.30,
  finishFadeSeconds: 0.30,
  stateFadeSeconds: 0.18,
  finalThreeScale: 0.30,
  melody: Object.freeze({
    sawGain: 0.080,
    triangleGain: 0.030,
    highNoteScale: 0.90,
    lowpassHz: 3100,
    filterQ: 0.75,
    attackSeconds: 0.005, // アタックを超高速にして鋭く
    releaseSeconds: 0.035,
    decayScale: 0.45
  }),
  bass: Object.freeze({
    squareGain: 0.075,
    triangleGain: 0.050,
    lowpassHz: 1100,
    filterQ: 1.2,
    attackSeconds: 0.005,
    releaseSeconds: 0.045,
    decayScale: 0.65
  }),
  ornament: Object.freeze({
    sineGain: 0.010,
    lowpassHz: 3300,
    attackSeconds: 0.004,
    releaseSeconds: 0.030
  }),
  finalTenAccent: Object.freeze({
    gain: 0.010,
    everySteps: 8,
    durationSeconds: 0.060,
    startHz: 1046.50, // C6
    endHz: 523.25     // C5
  }),
  compressor: Object.freeze({
    threshold: -12,
    knee: 3,
    ratio: 5,
    attack: 0.002,
    release: 0.08
  })
});

const NOTE_FREQ = Object.freeze({
  C2: 65.41, 'C#2': 69.30, D2: 73.42, 'D#2': 77.78, E2: 82.41, F2: 87.31, 'F#2': 92.50, G2: 98.00, 'G#2': 103.83, A2: 110.00, 'A#2': 116.54, B2: 123.47,
  C3: 130.81, 'C#3': 138.59, D3: 146.83, 'D#3': 155.56, E3: 164.81, F3: 174.61, 'F#3': 185.00, G3: 196.00, 'G#3': 207.65, A3: 220.00, 'A#3': 233.08, B3: 246.94,
  C4: 261.63, 'C#4': 277.18, D4: 293.66, 'D#4': 311.13, E4: 329.63, F4: 349.23, 'F#4': 369.99, G4: 392.00, 'G#4': 415.30, A4: 440.00, 'A#4': 466.16, B4: 493.88,
  C5: 523.25, 'C#5': 554.37, D5: 587.33, 'D#5': 622.25, E5: 659.25, F5: 698.46, 'F#5': 739.99, G5: 783.99, 'G#5': 830.61, A5: 880.00, 'A#5': 932.33, B5: 987.77,
  C6: 1046.50, 'D#6': 1244.51, 'F#6': 1479.98, A6: 1760.00, R: 0
});

// 最強王者用（ハ短調/不協和音・半音階多用の緊迫フレーズ）
const SCORE_A_RAW = [
  { m: 'C5', b: 'C2', d: 0.14 }, { m: 'D#5', b: 'C2', d: 0.14 }, { m: 'F#5', b: 'C3', d: 0.14 }, { m: 'G5', b: 'C3', d: 0.14 },
  { m: 'G#5', b: 'G#2', d: 0.14 }, { m: 'G5', b: 'G#2', d: 0.14 }, { m: 'F#5', b: 'G#3', d: 0.14 }, { m: 'F5', b: 'G#3', d: 0.14 },
  { m: 'D#5', b: 'A#2', d: 0.14 }, { m: 'D5', b: 'A#2', d: 0.14 }, { m: 'C#5', b: 'A#3', d: 0.14 }, { m: 'C5', b: 'A#3', d: 0.14 },
  { m: 'B4', b: 'G2', d: 0.28 }, { m: 'D5', b: 'G3', d: 0.14 }, { m: 'F5', b: 'G3', d: 0.14 },
  { m: 'D#5', b: 'C2', d: 0.14 }, { m: 'D5', b: 'C2', d: 0.14 }, { m: 'C#5', b: 'C3', d: 0.14 }, { m: 'C5', b: 'C3', d: 0.14 },
  { m: 'B4', b: 'G2', d: 0.28 }, { m: 'R', b: 'G2', d: 0.14 }, { m: 'G4', b: 'G3', d: 0.14 },
  { m: 'C5', b: 'C2', d: 0.14 }, { m: 'B4', b: 'C2', d: 0.14 }, { m: 'A#4', b: 'C3', d: 0.14 }, { m: 'A4', b: 'C3', d: 0.14 },
  { m: 'G#4', b: 'G#2', d: 0.14 }, { m: 'G4', b: 'G#2', d: 0.14 }, { m: 'F#4', b: 'G#3', d: 0.14 }, { m: 'F4', b: 'G#3', d: 0.14 },
  { m: 'D#4', b: 'G2', d: 0.14 }, { m: 'D4', b: 'G2', d: 0.14 }, { m: 'G4', b: 'G3', d: 0.14 }, { m: 'B4', b: 'G3', d: 0.14 },
  { m: 'C5', b: 'C2', d: 0.28 }
];

const SCORE_B_RAW = [
  ...SCORE_A_RAW.slice(0, 22).map(item => ({ ...item })),
  { m: 'C5', b: 'C2', d: 0.14, ornament: 'C6' },
  { m: 'D#5', b: 'C2', d: 0.14, ornament: 'D#6' },
  { m: 'F#5', b: 'C3', d: 0.14, ornament: 'F#6' },
  { m: 'A5', b: 'C3', d: 0.14, ornament: 'A6' },
  { m: 'G#5', b: 'G#2', d: 0.14 },
  { m: 'F5', b: 'G#2', d: 0.14 },
  { m: 'D#5', b: 'G2', d: 0.14 },
  { m: 'D5', b: 'G2', d: 0.14 },
  { m: 'C5', b: 'C2', d: 0.14 },
  { m: 'G4', b: 'C2', d: 0.14 },
  { m: 'C5', b: 'C2', d: 0.28 },
  { m: 'R', b: 'R', d: 0.28 }
];

function withOffsets(rawScore) {
  let offset = 0;
  return rawScore.map(item => {
    const event = Object.freeze({ ...item, offset });
    offset += item.d;
    return event;
  });
}

const SCORE_A = Object.freeze(withOffsets(SCORE_A_RAW));
const SCORE_B = Object.freeze(withOffsets(SCORE_B_RAW));

for (const [name, raw] of [['A', SCORE_A_RAW], ['B', SCORE_B_RAW]]) {
  const duration = raw.reduce((sum, event) => sum + event.d, 0);
  if (Math.abs(duration - BATTLE_BGM_CONFIG.loopSeconds) > 1e-9) throw new Error(`${name}ループ長が設定値と一致しません。`);
  for (const event of raw) {
    for (const note of [event.m, event.b, event.ornament]) {
      if (note && note !== 'R' && !Number.isFinite(NOTE_FREQ[note])) throw new Error(`${name}ループに未定義音程があります: ${note}`);
    }
  }
}

function holdAudioParam(param, atTime) {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(atTime);
  } else {
    const value = param.value;
    param.cancelScheduledValues(atTime);
    param.setValueAtTime(value, atTime);
  }
}

class BattleBGMEngine {
  constructor(onStateChange = () => {}) {
    this.audioContext = null;
    this.currentSession = null;
    this.pendingStops = new Set();
    this.sessionSerial = 0;
    this.commandSerial = 0;
    this.remainingSeconds = 60;
    this.urgency = 'normal';
    this.onStateChange = onStateChange;
    this.visibilityHandler = () => this.handleVisibilityChange();
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  async ensureAudioContext() {
    this.audioContext = await BGM_HUB.ensureContext();
    return this.audioContext;
  }

  createSession(ctx) {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    const c = BATTLE_BGM_CONFIG.compressor;
    compressor.threshold.setValueAtTime(c.threshold, now);
    compressor.knee.setValueAtTime(c.knee, now);
    compressor.ratio.setValueAtTime(c.ratio, now);
    compressor.attack.setValueAtTime(c.attack, now);
    compressor.release.setValueAtTime(c.release, now);
    master.gain.setValueAtTime(0.0001, now);
    master.connect(compressor);
    compressor.connect(window.HikippareAudio.getBgmDestination());

    const startTime = now + BATTLE_BGM_CONFIG.startLeadSeconds;
    return {
      id: ++this.sessionSerial,
      master,
      compressor,
      nodes: new Set(),
      closed: false,
      hidden: false,
      timerId: null,
      startTime,
      wallStartedAt: performance.now() + BATTLE_BGM_CONFIG.startLeadSeconds * 1000,
      loopNumber: 0,
      loopStartTime: startTime,
      eventIndex: 0,
      nextAccentTime: Infinity
    };
  }

  async start() {
    if (this.currentSession && !this.currentSession.closed) return this.getState();
    const command = ++this.commandSerial;
    if (this.pendingStops.size) await Promise.allSettled([...this.pendingStops]);
    const ctx = await this.ensureAudioContext();
    if (command !== this.commandSerial) return this.getState();

    if (this.remainingSeconds <= 0) this.remainingSeconds = 60;
    this.urgency = this.remainingSeconds <= 3 ? 'final3' : this.remainingSeconds <= 10 ? 'final10' : 'normal';
    const session = this.createSession(ctx);
    this.currentSession = session;
    this.applyUrgencyGain(session, true);
    this.prepareAccentClock(session);
    this.schedulerTick(session);
    this.emitState();
    return this.getState();
  }

  updateRemaining(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value)) return this.getState();
    this.remainingSeconds = Math.max(0, value);
    const nextUrgency = this.remainingSeconds <= 0 ? 'finished' : this.remainingSeconds <= 3 ? 'final3' : this.remainingSeconds <= 10 ? 'final10' : 'normal';
    const changed = nextUrgency !== this.urgency;
    this.urgency = nextUrgency;

    const session = this.currentSession;
    if (session && !session.closed) {
      if (nextUrgency === 'finished') {
        void this.stop({ fadeSeconds: BATTLE_BGM_CONFIG.finishFadeSeconds, preserveRemaining: true });
      } else if (changed) {
        this.applyUrgencyGain(session, false);
        if (nextUrgency === 'final10') this.prepareAccentClock(session);
        if (nextUrgency !== 'final10') this.cancelAccentNodes(session);
      }
    }
    this.emitState();
    return this.getState();
  }

  reset() {
    this.remainingSeconds = 60;
    this.urgency = 'normal';
    const session = this.currentSession;
    if (session && !session.closed) {
      this.cancelAccentNodes(session);
      this.applyUrgencyGain(session, false);
    }
    this.emitState();
    return this.getState();
  }

  async stop(options = {}) {
    const fadeSeconds = Math.max(0.01, Number(options.fadeSeconds ?? BATTLE_BGM_CONFIG.stopFadeSeconds));
    const preserveRemaining = Boolean(options.preserveRemaining);
    const command = ++this.commandSerial;
    const session = this.currentSession;
    BGM_HUB.release(TRACK_KEY);
    if (!session || session.closed) {
      if (!preserveRemaining && this.remainingSeconds <= 0) this.reset();
      this.emitState();
      return this.getState();
    }

    this.currentSession = null;
    session.closed = true;
    if (session.timerId !== null) clearTimeout(session.timerId);
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    holdAudioParam(session.master.gain, now);
    session.master.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);

    for (const record of [...session.nodes]) {
      try { record.oscillator.stop(now + fadeSeconds + 0.012); } catch (_) {}
    }

    const stopPromise = new Promise(resolve => {
      setTimeout(() => {
        for (const record of [...session.nodes]) this.disconnectRecord(session, record);
        try { session.master.disconnect(); } catch (_) {}
        try { session.compressor.disconnect(); } catch (_) {}
        resolve();
      }, Math.ceil((fadeSeconds + 0.05) * 1000));
    });
    this.pendingStops.add(stopPromise);
    stopPromise.finally(() => this.pendingStops.delete(stopPromise));

    if (!preserveRemaining && this.remainingSeconds <= 0) {
      this.remainingSeconds = 60;
      this.urgency = 'normal';
    }
    this.emitState();
    await stopPromise;
    if (command === this.commandSerial) this.emitState();
    return this.getState();
  }

  getState() {
    const session = this.currentSession;
    const audibleLoopNumber = session && !session.closed
      ? Math.max(0, Math.floor(((this.audioContext.currentTime - session.startTime)) / BATTLE_BGM_CONFIG.loopSeconds))
      : 0;
    return Object.freeze({
      playing: Boolean(session && !session.closed),
      loop: session && !session.closed ? (audibleLoopNumber % 2 === 0 ? 'A' : 'B') : null,
      urgency: this.urgency,
      remainingSeconds: this.remainingSeconds,
      sessionId: session && !session.closed ? session.id : null,
      audioContextState: this.audioContext?.state || 'not-created',
      scheduledNodes: session && !session.closed ? session.nodes.size : 0,
      pendingStops: this.pendingStops.size
    });
  }

  emitState() {
    this.onStateChange(this.getState());
  }

  applyUrgencyGain(session, immediate) {
    if (!this.audioContext || session.closed) return;
    const now = this.audioContext.currentTime;
    const scale = this.urgency === 'final3' ? BATTLE_BGM_CONFIG.finalThreeScale : 1;
    holdAudioParam(session.master.gain, now);
    const target = Math.max(0.0001, BATTLE_BGM_CONFIG.masterGain * scale);
    if (immediate) {
      session.master.gain.setValueAtTime(0.0001, now);
      session.master.gain.linearRampToValueAtTime(target, now + BATTLE_BGM_CONFIG.startFadeSeconds);
    } else {
      session.master.gain.linearRampToValueAtTime(target, now + BATTLE_BGM_CONFIG.stateFadeSeconds);
    }
  }

  prepareAccentClock(session) {
    if (!this.audioContext || session.closed || this.urgency !== 'final10') {
      session.nextAccentTime = Infinity;
      return;
    }
    const interval = BATTLE_BGM_CONFIG.stepSeconds * BATTLE_BGM_CONFIG.finalTenAccent.everySteps;
    const now = this.audioContext.currentTime + 0.04;
    const elapsed = Math.max(0, now - session.startTime);
    session.nextAccentTime = session.startTime + Math.ceil(elapsed / interval) * interval;
  }

  cancelAccentNodes(session) {
    session.nextAccentTime = Infinity;
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    for (const record of [...session.nodes]) {
      if (record.kind !== 'accent') continue;
      try {
        holdAudioParam(record.gain.gain, now);
        record.gain.gain.linearRampToValueAtTime(0.0001, now + 0.035);
        record.oscillator.stop(now + 0.045);
      } catch (_) {}
    }
  }

  schedulerTick(session) {
    if (session.closed || this.currentSession !== session || !this.audioContext) return;
    if (document.hidden) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const horizon = now + BATTLE_BGM_CONFIG.lookAheadSeconds;
    const score = () => session.loopNumber % 2 === 0 ? SCORE_A : SCORE_B;
    let nextEvent = score()[session.eventIndex];

    if (nextEvent && session.loopStartTime + nextEvent.offset < now - 0.10) {
      this.resyncSession(session);
    }

    while (!session.closed) {
      const currentScore = score();
      const event = currentScore[session.eventIndex];
      if (!event) {
        session.eventIndex = 0;
        session.loopNumber += 1;
        session.loopStartTime += BATTLE_BGM_CONFIG.loopSeconds;
        continue;
      }
      const eventTime = session.loopStartTime + event.offset;
      if (eventTime >= horizon) break;
      if (eventTime >= now - 0.025) this.scheduleEvent(session, event, eventTime);

      session.eventIndex += 1;
      if (session.eventIndex >= currentScore.length) {
        session.eventIndex = 0;
        session.loopNumber += 1;
        session.loopStartTime += BATTLE_BGM_CONFIG.loopSeconds;
      }
    }

    if (this.urgency === 'final10') {
      const interval = BATTLE_BGM_CONFIG.stepSeconds * BATTLE_BGM_CONFIG.finalTenAccent.everySteps;
      while (session.nextAccentTime < horizon) {
        if (session.nextAccentTime >= now - 0.025) this.scheduleFinalTenAccent(session, session.nextAccentTime);
        session.nextAccentTime += interval;
      }
    }

    this.emitState();
    session.timerId = setTimeout(() => this.schedulerTick(session), BATTLE_BGM_CONFIG.schedulerIntervalMs);
  }

  resyncSession(session) {
    const ctx = this.audioContext;
    const logicalElapsed = Math.max(0, (this.audioContext.currentTime - session.startTime));
    const loopNumber = Math.floor(logicalElapsed / BATTLE_BGM_CONFIG.loopSeconds);
    const loopOffset = logicalElapsed - loopNumber * BATTLE_BGM_CONFIG.loopSeconds;
    const currentScore = loopNumber % 2 === 0 ? SCORE_A : SCORE_B;
    let eventIndex = currentScore.findIndex(event => event.offset >= loopOffset - 0.01);
    if (eventIndex < 0) eventIndex = currentScore.length;
    session.loopNumber = loopNumber;
    session.eventIndex = eventIndex;
    session.loopStartTime = ctx.currentTime - loopOffset;
    if (this.urgency === 'final10') this.prepareAccentClock(session);
  }

  scheduleEvent(session, event, atTime) {
    if (event.m !== 'R') {
      const highScale = NOTE_FREQ[event.m] >= NOTE_FREQ.C5 ? BATTLE_BGM_CONFIG.melody.highNoteScale : 1;
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.m], type: 'sawtooth', gain: BATTLE_BGM_CONFIG.melody.sawGain * highScale,
        atTime, duration: event.d, filterHz: BATTLE_BGM_CONFIG.melody.lowpassHz, filterQ: BATTLE_BGM_CONFIG.melody.filterQ,
        attack: BATTLE_BGM_CONFIG.melody.attackSeconds, release: BATTLE_BGM_CONFIG.melody.releaseSeconds,
        decayScale: BATTLE_BGM_CONFIG.melody.decayScale, kind: 'melody'
      });
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.m], type: 'square', gain: BATTLE_BGM_CONFIG.melody.triangleGain * highScale,
        atTime, duration: event.d, filterHz: 3400, filterQ: 0.65,
        attack: BATTLE_BGM_CONFIG.melody.attackSeconds, release: BATTLE_BGM_CONFIG.melody.releaseSeconds,
        decayScale: 0.60, kind: 'melody-rounding'
      });
    }
    if (event.b !== 'R') {
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.b], type: 'sawtooth', gain: BATTLE_BGM_CONFIG.bass.squareGain,
        atTime, duration: event.d, filterHz: BATTLE_BGM_CONFIG.bass.lowpassHz, filterQ: BATTLE_BGM_CONFIG.bass.filterQ,
        attack: BATTLE_BGM_CONFIG.bass.attackSeconds, release: BATTLE_BGM_CONFIG.bass.releaseSeconds,
        decayScale: BATTLE_BGM_CONFIG.bass.decayScale, kind: 'bass'
      });
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.b], type: 'triangle', gain: BATTLE_BGM_CONFIG.bass.triangleGain,
        atTime, duration: event.d, filterHz: 1500, filterQ: 0.60,
        attack: BATTLE_BGM_CONFIG.bass.attackSeconds, release: BATTLE_BGM_CONFIG.bass.releaseSeconds,
        decayScale: 0.80, kind: 'bass-foundation'
      });
    }
    if (event.ornament) {
      this.scheduleVoice(session, {
        frequency: NOTE_FREQ[event.ornament], type: 'sine', gain: BATTLE_BGM_CONFIG.ornament.sineGain,
        atTime, duration: BATTLE_BGM_CONFIG.stepSeconds / 2, filterHz: BATTLE_BGM_CONFIG.ornament.lowpassHz,
        filterQ: 1.0, attack: BATTLE_BGM_CONFIG.ornament.attackSeconds,
        release: BATTLE_BGM_CONFIG.ornament.releaseSeconds, decayScale: 0.50, kind: 'ornament'
      });
    }
  }

  scheduleVoice(session, voice) {
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const end = voice.atTime + voice.duration;
    const releaseStart = Math.max(voice.atTime + voice.attack, end - voice.release);
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.frequency, voice.atTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(voice.filterHz, voice.atTime);
    filter.Q.setValueAtTime(voice.filterQ, voice.atTime);
    gain.gain.setValueAtTime(0.0001, voice.atTime);
    gain.gain.linearRampToValueAtTime(voice.gain, voice.atTime + voice.attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, voice.gain * voice.decayScale), releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, end - 0.002);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(session.master);
    oscillator.start(voice.atTime);
    oscillator.stop(end);
    this.trackNode(session, { oscillator, gain, filter, kind: voice.kind });
  }

  scheduleFinalTenAccent(session, atTime) {
    const ctx = this.audioContext;
    const c = BATTLE_BGM_CONFIG.finalTenAccent;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(c.startHz, atTime);
    oscillator.frequency.exponentialRampToValueAtTime(c.endHz, atTime + c.durationSeconds);
    gain.gain.setValueAtTime(0.0001, atTime);
    gain.gain.linearRampToValueAtTime(c.gain, atTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + c.durationSeconds);
    oscillator.connect(gain);
    gain.connect(session.master);
    oscillator.start(atTime);
    oscillator.stop(atTime + c.durationSeconds + 0.004);
    this.trackNode(session, { oscillator, gain, filter: null, kind: 'accent' });
  }

  trackNode(session, record) {
    session.nodes.add(record);
    record.oscillator.onended = () => this.disconnectRecord(session, record);
  }

  disconnectRecord(session, record) {
    if (!session.nodes.has(record)) return;
    session.nodes.delete(record);
    try { record.oscillator.disconnect(); } catch (_) {}
    try { record.filter?.disconnect(); } catch (_) {}
    try { record.gain.disconnect(); } catch (_) {}
  }

  handleVisibilityChange() {
    const session = this.currentSession;
    if (!session || session.closed || !this.audioContext) return;
    if (document.hidden) {
      session.hidden = true;
      if (session.timerId !== null) clearTimeout(session.timerId);
      const now = this.audioContext.currentTime;
      for (const record of [...session.nodes]) {
        try {
          holdAudioParam(record.gain.gain, now);
          record.gain.gain.linearRampToValueAtTime(0.0001, now + 0.035);
          record.oscillator.stop(now + 0.04);
        } catch (_) {}
      }
      return;
    }
    if (!session.hidden) return;
    session.hidden = false;
    void this.audioContext.resume().then(() => {
      if (this.currentSession !== session || session.closed) return;
      this.resyncSession(session);
      this.schedulerTick(session);
    });
  }
}

const BattleBGM = new BattleBGMEngine(() => {});
const GhostChallengeBGM = Object.freeze({
  start: async () => {
    await BGM_HUB.activate(TRACK_KEY, () => BattleBGM.start(), options => BattleBGM.stop(options));
    return BattleBGM.getState();
  },
  updateRemaining: seconds => BattleBGM.updateRemaining(seconds),
  stop: options => BattleBGM.stop(options),
  reset: () => BattleBGM.reset(),
  getState: () => BattleBGM.getState()
});
window.GhostChallengeBGM = GhostChallengeBGM;
})();

(() => {
'use strict';
const TRACK_KEY = 'pvp';
function getSharedBGMHub() {
  if (window.HikippareBGMHub) return window.HikippareBGMHub;
  let audioContext = null, active = null, commandSerial = 0;
  const hub = {
    async ensureContext() {
      if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error('Web Audio APIに対応していないブラウザです。');
        audioContext = new AudioContextClass();
      }
      if (audioContext.state === 'suspended') await audioContext.resume();
      return audioContext;
    },
    async activate(key, startCurrent, stopCurrent) {
      const command = ++commandSerial;
      if (active && active.key !== key) await active.stop({ fadeSeconds:.12, preserveRemaining:true });
      if (command !== commandSerial) return false;
      active = { key, stop:stopCurrent };
      try { await startCurrent(); return command === commandSerial; }
      catch (error) { if (command === commandSerial && active?.key === key) active = null; throw error; }
    },
    release(key) { if (active?.key === key) active = null; },
    getState() { return Object.freeze({ activeTrack:active?.key||null, audioContextCount:audioContext?1:0, audioContextState:audioContext?.state||'not-created' }); }
  };
  window.HikippareBGMHub = hub;
  return hub;
}
const BGM_HUB = getSharedBGMHub();

const PVP_BGM_CONFIG = Object.freeze({
  bpm:160,
  stepSeconds:0.09375,
  stepsPerLoop:32,
  loopSeconds:3.000,
  pairSeconds:6.000,
  startLeadSeconds:0.080,
  lookAheadSeconds:0.650,
  schedulerIntervalMs:80,
  masterGain:0.47,
  startFadeSeconds:0.060,
  stopFadeSeconds:0.300,
  finishFadeSeconds:0.300,
  stateFadeSeconds:0.180,
  finalThreeScale:0.300,
  lead:Object.freeze({ gain:0.070, duration:0.150, lowpassHz:3200, attack:0.008, release:0.040 }),
  bass:Object.freeze({ gain:0.075, duration:0.200, lowpassHz:1050, attack:0.010, release:0.055 }),
  kick:Object.freeze({ gain:0.16, duration:0.100, startHz:120, endHz:45 }),
  snare:Object.freeze({ gain:0.080, duration:0.150, startHz:250, endHz:95 }),
  finalTen:Object.freeze({ gain:0.008, intervalSteps:8, duration:0.050, startHz:880, endHz:440 }),
  compressor:Object.freeze({ threshold:-9, knee:5, ratio:3, attack:0.004, release:0.120 })
});

const NOTE_FREQ = Object.freeze({
  A2:110.00,C3:130.81,D3:146.83,E3:164.81,F2:87.31,G2:98.00,G3:196.00,
  A3:220.00,C4:261.63,D4:293.66,E4:329.63,G4:392.00,A4:440.00,
  C5:523.25,D5:587.33,E5:659.25,G5:783.99,A5:880.00
});

const LEAD_PATTERN = Object.freeze([
  'A4','A4','C5','A4','D5','A4','E5','D5','A4','A4','G5','E5','D5','C5','D5','E5',
  'A4','A4','C5','A4','D5','A4','E5','D5','G5','E5','D5','C5','A4','G4','A4',null,
  'A4','A4','C5','A4','D5','A4','E5','D5','A4','A4','G5','E5','D5','C5','D5','E5',
  'A5','G5','E5','D5','E5','D5','C5','A4','C5','D5','E5','G5','A5',null,null,null
]);
const BASS_PATTERN = Object.freeze([
  'A2',null,'A2','A2','A2',null,'A2','A2','F2',null,'F2','F2','G2',null,'G2','G2',
  'A2',null,'A2','A2','A2',null,'A2','A2','F2',null,'F2','F2','G2',null,'G2','G2',
  'A2',null,'A2','A2','A2',null,'A2','A2','F2',null,'F2','F2','G2',null,'G2','G2',
  'F2','F2','F2','F2','G2','G2','G2','G2','A2',null,'A2',null,'A2',null,'A2',null
]);

function makeScore(startStep) {
  return Object.freeze(Array.from({ length:PVP_BGM_CONFIG.stepsPerLoop }, (_, index) => {
    const globalStep = startStep + index;
    return Object.freeze({ offset:index*PVP_BGM_CONFIG.stepSeconds, lead:LEAD_PATTERN[globalStep], bass:BASS_PATTERN[globalStep], globalStep });
  }));
}
const SCORE_A = makeScore(0), SCORE_B = makeScore(32);
if (LEAD_PATTERN.length !== 64 || BASS_PATTERN.length !== 64 || PVP_BGM_CONFIG.stepsPerLoop*PVP_BGM_CONFIG.stepSeconds !== PVP_BGM_CONFIG.loopSeconds) throw new Error('対人戦BGMのループ定義が不正です。');
for (const note of [...LEAD_PATTERN,...BASS_PATTERN]) if (note && !Number.isFinite(NOTE_FREQ[note])) throw new Error(`未定義音程があります: ${note}`);

function holdParam(param, atTime) {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(atTime);
  else { const value=param.value; param.cancelScheduledValues(atTime); param.setValueAtTime(value,atTime); }
}

class PvpBGMEngine {
  constructor(onStateChange=()=>{}) {
    this.audioContext=null; this.currentSession=null; this.pendingStops=new Set(); this.sessionSerial=0; this.commandSerial=0;
    this.remainingSeconds=60; this.urgency='normal'; this.onStateChange=onStateChange;
    document.addEventListener('visibilitychange',()=>this.handleVisibilityChange());
  }
  async ensureAudioContext() { this.audioContext=await BGM_HUB.ensureContext(); return this.audioContext; }
  createSession(ctx) {
    const now=ctx.currentTime, master=ctx.createGain(), compressor=ctx.createDynamicsCompressor(), c=PVP_BGM_CONFIG.compressor;
    compressor.threshold.setValueAtTime(c.threshold,now); compressor.knee.setValueAtTime(c.knee,now); compressor.ratio.setValueAtTime(c.ratio,now); compressor.attack.setValueAtTime(c.attack,now); compressor.release.setValueAtTime(c.release,now);
    master.gain.setValueAtTime(.0001,now); master.connect(compressor); compressor.connect(window.HikippareAudio.getBgmDestination());
    const startTime=now+PVP_BGM_CONFIG.startLeadSeconds;
    return { id:++this.sessionSerial, master, compressor, nodes:new Set(), closed:false, hidden:false, timerId:null, startTime, wallStartedAt:performance.now()+PVP_BGM_CONFIG.startLeadSeconds*1000, loopNumber:0, loopStartTime:startTime, eventIndex:0, nextAccentTime:Infinity };
  }
  async start() {
    if (this.currentSession&&!this.currentSession.closed) return this.getState();
    const command=++this.commandSerial; if(this.pendingStops.size) await Promise.allSettled([...this.pendingStops]);
    const ctx=await this.ensureAudioContext(); if(command!==this.commandSerial)return this.getState();
    if(this.remainingSeconds<=0)this.remainingSeconds=60;
    this.urgency=this.remainingSeconds<=3?'final3':this.remainingSeconds<=10?'final10':'normal';
    const session=this.createSession(ctx); this.currentSession=session; this.applyUrgencyGain(session,true); this.prepareAccentClock(session); this.schedulerTick(session); this.emitState(); return this.getState();
  }
  updateRemaining(seconds) {
    const value=Number(seconds); if(!Number.isFinite(value))return this.getState();
    this.remainingSeconds=Math.max(0,value); const next=this.remainingSeconds<=0?'finished':this.remainingSeconds<=3?'final3':this.remainingSeconds<=10?'final10':'normal'; const changed=next!==this.urgency; this.urgency=next;
    const session=this.currentSession;
    if(session&&!session.closed){ if(next==='finished')void this.stop({fadeSeconds:PVP_BGM_CONFIG.finishFadeSeconds,preserveRemaining:true}); else if(changed){this.applyUrgencyGain(session,false);if(next==='final10')this.prepareAccentClock(session);if(next!=='final10')this.cancelAccentNodes(session);} }
    this.emitState(); return this.getState();
  }
  reset() { this.remainingSeconds=60;this.urgency='normal';const s=this.currentSession;if(s&&!s.closed){this.cancelAccentNodes(s);this.applyUrgencyGain(s,false);}this.emitState();return this.getState(); }
  async stop(options={}) {
    const fadeSeconds=Math.max(.01,Number(options.fadeSeconds??PVP_BGM_CONFIG.stopFadeSeconds)),preserveRemaining=Boolean(options.preserveRemaining),command=++this.commandSerial,session=this.currentSession;
    BGM_HUB.release(TRACK_KEY);
    if(!session||session.closed){if(!preserveRemaining&&this.remainingSeconds<=0)this.reset();this.emitState();return this.getState();}
    this.currentSession=null;session.closed=true;if(session.timerId!==null)clearTimeout(session.timerId);
    const now=this.audioContext.currentTime;holdParam(session.master.gain,now);session.master.gain.linearRampToValueAtTime(.0001,now+fadeSeconds);
    for(const record of [...session.nodes])try{record.oscillator.stop(now+fadeSeconds+.012);}catch(_){}
    const stopPromise=new Promise(resolve=>setTimeout(()=>{for(const record of [...session.nodes])this.disconnectRecord(session,record);try{session.master.disconnect();}catch(_){}try{session.compressor.disconnect();}catch(_){}resolve();},Math.ceil((fadeSeconds+.05)*1000)));
    this.pendingStops.add(stopPromise);stopPromise.finally(()=>this.pendingStops.delete(stopPromise));
    if(!preserveRemaining&&this.remainingSeconds<=0){this.remainingSeconds=60;this.urgency='normal';}this.emitState();await stopPromise;if(command===this.commandSerial)this.emitState();return this.getState();
  }
  getState() {
    const s=this.currentSession,n=s&&!s.closed?Math.max(0,Math.floor(((this.audioContext.currentTime-s.startTime))/PVP_BGM_CONFIG.loopSeconds)):0;
    return Object.freeze({playing:Boolean(s&&!s.closed),loop:s&&!s.closed?(n%2===0?'A':'B'):null,urgency:this.urgency,remainingSeconds:this.remainingSeconds,sessionId:s&&!s.closed?s.id:null,audioContextState:this.audioContext?.state||'not-created',scheduledNodes:s&&!s.closed?s.nodes.size:0,pendingStops:this.pendingStops.size});
  }
  emitState(){this.onStateChange(this.getState());}
  applyUrgencyGain(s,immediate){if(!this.audioContext||s.closed)return;const now=this.audioContext.currentTime,target=PVP_BGM_CONFIG.masterGain*(this.urgency==='final3'?PVP_BGM_CONFIG.finalThreeScale:1);holdParam(s.master.gain,now);if(immediate){s.master.gain.setValueAtTime(.0001,now);s.master.gain.linearRampToValueAtTime(target,now+PVP_BGM_CONFIG.startFadeSeconds);}else s.master.gain.linearRampToValueAtTime(target,now+PVP_BGM_CONFIG.stateFadeSeconds);}
  prepareAccentClock(s){if(!this.audioContext||s.closed||this.urgency!=='final10'){s.nextAccentTime=Infinity;return;}const interval=PVP_BGM_CONFIG.stepSeconds*PVP_BGM_CONFIG.finalTen.intervalSteps,now=this.audioContext.currentTime+.04,elapsed=Math.max(0,now-s.startTime);s.nextAccentTime=s.startTime+Math.ceil(elapsed/interval)*interval;}
  cancelAccentNodes(s){s.nextAccentTime=Infinity;if(!this.audioContext)return;const now=this.audioContext.currentTime;for(const record of [...s.nodes])if(record.kind==='accent')try{holdParam(record.gain.gain,now);record.gain.gain.linearRampToValueAtTime(.0001,now+.035);record.oscillator.stop(now+.045);}catch(_){}}
  schedulerTick(s){
    if(s.closed||this.currentSession!==s||!this.audioContext)return;if(document.hidden)return;
    const now=this.audioContext.currentTime,horizon=now+PVP_BGM_CONFIG.lookAheadSeconds,score=()=>s.loopNumber%2===0?SCORE_A:SCORE_B;
    const next=score()[s.eventIndex];if(next&&s.loopStartTime+next.offset<now-.10)this.resyncSession(s);
    while(!s.closed){const current=score(),event=current[s.eventIndex];if(!event){s.eventIndex=0;s.loopNumber++;s.loopStartTime+=PVP_BGM_CONFIG.loopSeconds;continue;}const at=s.loopStartTime+event.offset;if(at>=horizon)break;if(at>=now-.025)this.scheduleEvent(s,event,at);s.eventIndex++;}
    if(this.urgency==='final10'){const interval=PVP_BGM_CONFIG.stepSeconds*PVP_BGM_CONFIG.finalTen.intervalSteps;while(s.nextAccentTime<horizon){if(s.nextAccentTime>=now-.025)this.scheduleGlide(s,s.nextAccentTime,PVP_BGM_CONFIG.finalTen,'accent');s.nextAccentTime+=interval;}}
    this.emitState();s.timerId=setTimeout(()=>this.schedulerTick(s),PVP_BGM_CONFIG.schedulerIntervalMs);
  }
  resyncSession(s){const elapsed=Math.max(0,(this.audioContext.currentTime-s.startTime)),n=Math.floor(elapsed/PVP_BGM_CONFIG.loopSeconds),offset=elapsed-n*PVP_BGM_CONFIG.loopSeconds,current=n%2===0?SCORE_A:SCORE_B;let index=current.findIndex(event=>event.offset>=offset-.01);if(index<0)index=current.length;s.loopNumber=n;s.eventIndex=index;s.loopStartTime=this.audioContext.currentTime-offset;if(this.urgency==='final10')this.prepareAccentClock(s);}
  scheduleEvent(s,event,at){
    if(event.lead)this.scheduleVoice(s,{at,frequency:NOTE_FREQ[event.lead],type:'sawtooth',duration:PVP_BGM_CONFIG.lead.duration,gain:PVP_BGM_CONFIG.lead.gain,filterHz:PVP_BGM_CONFIG.lead.lowpassHz,attack:PVP_BGM_CONFIG.lead.attack,release:PVP_BGM_CONFIG.lead.release,kind:'lead'});
    if(event.bass)this.scheduleVoice(s,{at,frequency:NOTE_FREQ[event.bass],type:'square',duration:PVP_BGM_CONFIG.bass.duration,gain:PVP_BGM_CONFIG.bass.gain,filterHz:PVP_BGM_CONFIG.bass.lowpassHz,attack:PVP_BGM_CONFIG.bass.attack,release:PVP_BGM_CONFIG.bass.release,kind:'bass'});
    if(event.globalStep%4===0)this.scheduleGlide(s,at,PVP_BGM_CONFIG.kick,'kick');
    if(event.globalStep%8===4)this.scheduleGlide(s,at,PVP_BGM_CONFIG.snare,'snare');
  }
  scheduleVoice(s,v){const ctx=this.audioContext,osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),end=v.at+v.duration,releaseStart=Math.max(v.at+v.attack,end-v.release);osc.type=v.type;osc.frequency.setValueAtTime(v.frequency,v.at);filter.type='lowpass';filter.frequency.setValueAtTime(v.filterHz,v.at);filter.Q.setValueAtTime(.65,v.at);gain.gain.setValueAtTime(.0001,v.at);gain.gain.linearRampToValueAtTime(v.gain,v.at+v.attack);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,v.gain*.62),releaseStart);gain.gain.exponentialRampToValueAtTime(.0001,end-.002);osc.connect(filter);filter.connect(gain);gain.connect(s.master);osc.start(v.at);osc.stop(end);this.trackNode(s,{oscillator:osc,gain,filter,kind:v.kind});}
  scheduleGlide(s,at,c,kind){const ctx=this.audioContext,osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),end=at+c.duration;osc.type=kind==='snare'?'triangle':'sine';osc.frequency.setValueAtTime(c.startHz,at);osc.frequency.exponentialRampToValueAtTime(c.endHz,end);filter.type='lowpass';filter.frequency.setValueAtTime(kind==='accent'?2200:1000,at);gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(c.gain,at+.006);gain.gain.exponentialRampToValueAtTime(.0001,end);osc.connect(filter);filter.connect(gain);gain.connect(s.master);osc.start(at);osc.stop(end+.004);this.trackNode(s,{oscillator:osc,gain,filter,kind});}
  trackNode(s,record){s.nodes.add(record);record.oscillator.onended=()=>this.disconnectRecord(s,record);}
  disconnectRecord(s,record){if(!s.nodes.has(record))return;s.nodes.delete(record);try{record.oscillator.disconnect();}catch(_){}try{record.filter?.disconnect();}catch(_){}try{record.gain.disconnect();}catch(_){}}
  handleVisibilityChange(){const s=this.currentSession;if(!s||s.closed||!this.audioContext)return;if(document.hidden){s.hidden=true;if(s.timerId!==null)clearTimeout(s.timerId);const now=this.audioContext.currentTime;for(const record of [...s.nodes])try{holdParam(record.gain.gain,now);record.gain.gain.linearRampToValueAtTime(.0001,now+.035);record.oscillator.stop(now+.04);}catch(_){}return;}if(!s.hidden)return;s.hidden=false;void this.audioContext.resume().then(()=>{if(this.currentSession!==s||s.closed)return;this.resyncSession(s);this.schedulerTick(s);});}
}

const engine=new PvpBGMEngine(() => {});
const PvpBattleBGM=Object.freeze({
  start:async()=>{await BGM_HUB.activate(TRACK_KEY,()=>engine.start(),options=>engine.stop(options));return engine.getState();},
  updateRemaining:seconds=>engine.updateRemaining(seconds),stop:options=>engine.stop(options),reset:()=>engine.reset(),getState:()=>engine.getState()
});
window.PvpBattleBGM=PvpBattleBGM;
})();


(() => {
  const RESULT_CONFIG = Object.freeze({
    // 元HTMLの各ボイスgainを維持し、全曲共通のBGMバス(0.82)だけで余裕を確保する。
    masterGain: 1.00,
    startLeadSeconds: 0.08,
    stopFadeSeconds: 0.20,
    minGain: 0.0001,
    compressor: Object.freeze({ threshold: -10, knee: 6, ratio: 2, attack: 0.008, release: 0.15 })
  });
  const NOTE_FREQ = Object.freeze({
    C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,
    C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880,C6:1046.50,R:0
  });
  const SCORE = Object.freeze([
    {m:'C5',b:'C4',d:.2},{m:'E5',b:'G4',d:.2},{m:'G5',b:'C5',d:.2},{m:'C6',b:'E5',d:.6},
    {m:'R',b:'R',d:.2},{m:'G5',b:'C4',d:.25},{m:'F5',b:'D4',d:.25},{m:'E5',b:'E4',d:.25},
    {m:'D5',b:'F4',d:.25},{m:'C5',b:'G4',d:.5},{m:'E5',b:'G4',d:.5},{m:'C5',b:'C4',d:.8}
  ]);

  class ResultBGMEngine {
    constructor() { this.currentSession=null; this.sessionSerial=0; this.pendingStops=new Set(); }
    async start() {
      if (this.currentSession && !this.currentSession.closed) return this.getState();
      if (this.pendingStops.size) await Promise.allSettled([...this.pendingStops]);
      const ctx=await window.HikippareAudio.ensureContext(), now=ctx.currentTime;
      const master=ctx.createGain(), compressor=ctx.createDynamicsCompressor(), c=RESULT_CONFIG.compressor;
      compressor.threshold.setValueAtTime(c.threshold,now); compressor.knee.setValueAtTime(c.knee,now);
      compressor.ratio.setValueAtTime(c.ratio,now); compressor.attack.setValueAtTime(c.attack,now); compressor.release.setValueAtTime(c.release,now);
      master.gain.setValueAtTime(RESULT_CONFIG.minGain,now); master.gain.linearRampToValueAtTime(RESULT_CONFIG.masterGain,now+.05);
      master.connect(compressor); compressor.connect(window.HikippareAudio.getBgmDestination());
      const session={id:++this.sessionSerial,closed:false,master,compressor,nodes:new Set(),startTime:now+RESULT_CONFIG.startLeadSeconds,endTimer:null};
      this.currentSession=session;
      let cursor=session.startTime;
      for(const event of SCORE){
        if(event.m!=='R')this.voice(ctx,session,NOTE_FREQ[event.m],'square',.12,cursor,event.d);
        if(event.b!=='R')this.voice(ctx,session,NOTE_FREQ[event.b],'triangle',.15,cursor,event.d);
        cursor+=event.d;
      }
      session.endTimer=setTimeout(()=>this.finishNatural(session),Math.ceil((cursor-now+.08)*1000));
      return this.getState();
    }
    voice(ctx,session,frequency,type,gainValue,start,duration){
      const oscillator=ctx.createOscillator(),gain=ctx.createGain(),end=start+duration;
      oscillator.type=type; oscillator.frequency.setValueAtTime(frequency,start);
      gain.gain.setValueAtTime(RESULT_CONFIG.minGain,start); gain.gain.linearRampToValueAtTime(gainValue,start+.012);
      gain.gain.exponentialRampToValueAtTime(RESULT_CONFIG.minGain,Math.max(start+.02,end-.012));
      oscillator.connect(gain); gain.connect(session.master);
      const record={oscillator,gain}; session.nodes.add(record);
      oscillator.onended=()=>this.disconnect(session,record); oscillator.start(start); oscillator.stop(end);
    }
    disconnect(session,record){session.nodes.delete(record);try{record.oscillator.disconnect();}catch(_){}try{record.gain.disconnect();}catch(_){}}
    finishNatural(session){
      if(this.currentSession===session)this.currentSession=null;
      session.closed=true; for(const record of [...session.nodes])this.disconnect(session,record);
      try{session.master.disconnect();}catch(_){}try{session.compressor.disconnect();}catch(_){}
    }
    async stop(options={}){
      const session=this.currentSession;if(!session||session.closed)return this.getState();
      this.currentSession=null;session.closed=true;if(session.endTimer!==null)clearTimeout(session.endTimer);
      const ctx=await window.HikippareAudio.ensureContext(),now=ctx.currentTime,fade=Math.max(.01,Number(options.fadeSeconds??RESULT_CONFIG.stopFadeSeconds));
      session.master.gain.cancelScheduledValues(now);session.master.gain.setValueAtTime(Math.max(RESULT_CONFIG.minGain,session.master.gain.value),now);
      session.master.gain.linearRampToValueAtTime(RESULT_CONFIG.minGain,now+fade);
      for(const record of [...session.nodes])try{record.oscillator.stop(now+fade+.01);}catch(_){}
      const promise=new Promise(resolve=>setTimeout(()=>{for(const record of [...session.nodes])this.disconnect(session,record);try{session.master.disconnect();}catch(_){}try{session.compressor.disconnect();}catch(_){}resolve();},Math.ceil((fade+.04)*1000)));
      this.pendingStops.add(promise);promise.finally(()=>this.pendingStops.delete(promise));await promise;return this.getState();
    }
    reset(){return this.stop();}
    getState(){const s=this.currentSession;return Object.freeze({playing:Boolean(s&&!s.closed),loop:null,urgency:'normal',remainingSeconds:null,sessionId:s&&!s.closed?s.id:null,scheduledNodes:s&&!s.closed?s.nodes.size:0,pendingStops:this.pendingStops.size,durationSeconds:4.2,c6Hz:NOTE_FREQ.C6});}
  }
  const engine=new ResultBGMEngine();
  window.ResultBGM=Object.freeze({start:()=>engine.start(),stop:options=>engine.stop(options),reset:()=>engine.reset(),getState:()=>engine.getState()});
})();



(() => {
  const TRACK_KEYS=Object.freeze(['title','menu','cpu','lion','ghost','pvp','result']);
  const BATTLE_KEYS=new Set(['cpu','lion','ghost','pvp']);
  const MENU_SCREENS=new Set(['mode','solo-type','character','cpu','level']);
  const engines=Object.freeze({
    title:window.TitleBGM,menu:window.MenuBGM,cpu:window.BattleBGM,lion:window.LionOfficialBGM,
    ghost:window.GhostChallengeBGM,pvp:window.PvpBattleBGM,result:window.ResultBGM
  });
  let activeTrack=null,desiredTrack='title',enabled=true,paused=false,unlocked=false,resultSuppressed=false,resultPresented=false;
  let commandSerial=0,resultTimer=null,resultQueued=false,stateReader=null,lastRemainingBucket=null;
  let transitionTail=Promise.resolve();

  function engineFor(key){if(!TRACK_KEYS.includes(key))throw new Error('未定義のBGMです: '+key);return engines[key];}
  function clearResultTimer(){if(resultTimer!==null){clearTimeout(resultTimer);resultTimer=null;}resultQueued=false;}
  function normalizedStopOptions(key,options={}){
    const fade=Math.max(.01,Number(options.fadeSeconds??.2));
    return key==='menu'?{fadeOutSeconds:fade}:{fadeSeconds:fade,preserveRemaining:Boolean(options.preserveRemaining)};
  }
  function queueTransition(task){const run=transitionTail.then(task,task);transitionTail=run.catch(()=>{});return run;}
  function start(key,options={}){
    desiredTrack=key;clearResultTimer();const command=++commandSerial;
    if(!enabled||!unlocked)return Promise.resolve(getState());
    return queueTransition(async()=>{
      if(command!==commandSerial||!enabled)return getState();
      const engine=engineFor(key),currentState=engine.getState?.()||{};
      if(activeTrack===key&&currentState.playing){if(Number.isFinite(options.remaining))updateRemaining(options.remaining);return getState();}
      const oldKey=activeTrack;activeTrack=null;
      if(oldKey)await engineFor(oldKey).stop(normalizedStopOptions(oldKey,{fadeSeconds:options.switchFadeSeconds??.16,preserveRemaining:true}));
      if(command!==commandSerial||!enabled)return getState();
      if(options.reset!==false)await engine.reset?.();
      if(command!==commandSerial||!enabled)return getState();
      if(Number.isFinite(options.remaining))engine.updateRemaining?.(options.remaining);
      await engine.start(options);
      if(command!==commandSerial||!enabled){await engine.stop(normalizedStopOptions(key,{fadeSeconds:.04,preserveRemaining:true}));return getState();}
      activeTrack=key;lastRemainingBucket=null;return getState();
    });
  }
  function stop(options={}){
    clearResultTimer();const command=++commandSerial;
    if(options.clearDesired!==false)desiredTrack=null;
    return queueTransition(async()=>{
      const key=activeTrack;activeTrack=null;
      if(key)await engineFor(key).stop(normalizedStopOptions(key,options));
      if(command===commandSerial)lastRemainingBucket=null;return getState();
    });
  }
  function updateRemaining(seconds){
    const value=Number(seconds);if(!Number.isFinite(value)||!activeTrack||!BATTLE_KEYS.has(activeTrack))return getState();
    const bucket=value<=0?'finished':value<=3?'final3':value<=10?'final10':Math.ceil(value);
    if(bucket===lastRemainingBucket)return getState();lastRemainingBucket=bucket;
    engineFor(activeTrack).updateRemaining?.(Math.max(0,value));return getState();
  }
  async function pause(){if(paused)return getState();paused=true;await window.HikippareAudio.suspend();return getState();}
  async function resume(){if(!paused)return getState();paused=false;await window.HikippareAudio.resume();if(!activeTrack&&enabled)return syncToGameState();return getState();}
  async function reset(){
    await stop({fadeSeconds:.08});for(const engine of Object.values(engines))await engine.reset?.();
    desiredTrack='title';paused=false;lastRemainingBucket=null;return getState();
  }
  async function setEnabled(value){
    enabled=Boolean(value);
    if(!enabled){
      const snapshot=stateReader?.();
      if(desiredTrack==='result'||snapshot?.screen==='result'||snapshot?.screen==='duo-result')resultSuppressed=true;
      if(paused){paused=false;await window.HikippareAudio.resume();}
      await stop({fadeSeconds:.08,clearDesired:false});return getState();
    }
    return syncToGameState();
  }
  function notifyUserGesture(){unlocked=true;void window.HikippareAudio.resume();}
  function battleKey(snapshot){if(snapshot?.mode==='duo')return'pvp';if(snapshot?.playType==='official')return'lion';if(snapshot?.playType==='ghost')return'ghost';return'cpu';}
  function scheduleResult(delayMs=550){
    resultPresented=true;
    if(activeTrack==='result'&&engineFor('result').getState?.().playing)return getState();
    if(resultTimer!==null)return getState();
    clearResultTimer();desiredTrack='result';const request=++commandSerial;
    if(!enabled){resultSuppressed=true;desiredTrack=null;return getState();}
    if(!unlocked)return getState();
    resultQueued=true;const requestedAt=Date.now();
    void queueTransition(async()=>{
      if(request!==commandSerial||!enabled){resultQueued=false;return;}
      const old=activeTrack;activeTrack=null;
      if(old)await engineFor(old).stop(normalizedStopOptions(old,{fadeSeconds:.12,preserveRemaining:true}));
      if(request!==commandSerial||!enabled){resultQueued=false;return;}
      const waitMs=Math.max(0,Math.max(0,delayMs)-(Date.now()-requestedAt));
      resultTimer=setTimeout(()=>{resultTimer=null;resultQueued=false;if(request!==commandSerial||!enabled||resultSuppressed)return;void start('result',{reset:true,switchFadeSeconds:.05});},waitMs);
    });
    return getState();
  }
  function onScreenChange(name){
    if(name!=='result'&&name!=='duo-result'){resultSuppressed=false;resultPresented=false;}
    if(name==='title')return start('title',{switchFadeSeconds:.18});
    if(MENU_SCREENS.has(name))return start('menu',{switchFadeSeconds:.18});
    if(name==='result'||name==='duo-result')return resultPresented?getState():scheduleResult(550);
    if(name==='battle')return stop({fadeSeconds:.18});
    if(name==='duo'){
      const snapshot=stateReader?.();
      if(snapshot?.duo?.phase==='ready'||snapshot?.duo?.phase==='idle')return start('menu',{switchFadeSeconds:.18});
      return stop({fadeSeconds:.18});
    }
    return getState();
  }
  function startBattle(snapshot,remaining=60){return start(battleKey(snapshot),{remaining,reset:true,switchFadeSeconds:.12});}
  async function syncToGameState(){
    const snapshot=stateReader?.();if(!snapshot)return getState();enabled=Boolean(snapshot.soundOn);
    if(!enabled)return stop({fadeSeconds:.08,clearDesired:false});
    const soloPaused=snapshot.screen==='battle'&&snapshot.phase==='playing'&&snapshot.paused;
    const duoPaused=snapshot.screen==='duo'&&['paused','resume-countdown'].includes(snapshot.duo?.phase);
    if(soloPaused||duoPaused){desiredTrack=battleKey(snapshot);paused=true;await window.HikippareAudio.suspend();return getState();}
    if(snapshot.screen==='title')return start('title');
    if(MENU_SCREENS.has(snapshot.screen))return start('menu');
    if(snapshot.screen==='result'||snapshot.screen==='duo-result')return resultSuppressed||resultPresented?getState():scheduleResult(550);
    if(snapshot.screen==='battle'&&snapshot.phase==='playing')return start(battleKey(snapshot),{remaining:snapshot.remaining,reset:false});
    if(snapshot.screen==='duo'&&snapshot.duo?.phase==='playing')return start('pvp',{remaining:snapshot.duo.remaining,reset:false});
    if(snapshot.screen==='duo'&&['ready','idle'].includes(snapshot.duo?.phase))return start('menu');
    return getState();
  }
  function getState(){
    const trackState=activeTrack?engineFor(activeTrack).getState?.()||{}:{};
    const audio=window.HikippareAudio.getState();
    return Object.freeze({activeTrack,desiredTrack,playing:Boolean(activeTrack&&trackState.playing),paused,enabled,unlocked,
      loop:trackState.loop??null,urgency:trackState.urgency??'normal',remainingSeconds:trackState.remainingSeconds??null,
      sessionId:trackState.sessionId??null,scheduledNodes:trackState.scheduledNodes??trackState.scheduledSources??0,
      pendingStops:trackState.pendingStops??0,resultScheduled:resultTimer!==null||resultQueued,resultSuppressed,resultPresented,...audio});
  }
  function setStateReader(reader){stateReader=typeof reader==='function'?reader:null;}
  const api=Object.freeze({start,updateRemaining,pause,resume,stop,reset,setEnabled,syncToGameState,getState,onScreenChange,startBattle,scheduleResult,notifyUserGesture,setStateReader,battleKey});
  window.GameBGM=api;window.__GAME_BGM_TEST__=api;
  document.addEventListener('pointerdown',notifyUserGesture,{capture:true,passive:true});
  document.addEventListener('keydown',notifyUserGesture,{capture:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&paused)return;});
  window.addEventListener('pagehide',()=>{void stop({fadeSeconds:.03});});
})();

