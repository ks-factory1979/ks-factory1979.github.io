(function () {
  "use strict";

  window.__NINJA_QA = {
    appVersion: "0.4.9",
    progressState: null,
    lastProgressEvent: null,
    unlockScrollState: { active: false, phase: "idle" },
    unlockScrollOpenCount: 0,
    unlockScrollStampCount: 0,
    unlockScrollCompleteCount: 0,
    phaserVersion: typeof Phaser !== "undefined" ? Phaser.VERSION : "missing",
    currentScene: "initializing",
    assetsLoaded: false,
    gamesStarted: 0,
    resultsShown: 0,
    activeObjects: 0,
    remainingSeconds: 0,
    lastResult: null,
    pausedForPortrait: false,
    assetLoadErrors: [],
    inkMaterialLoaded: {},
    inkMaterialPixels: {},
    inkMaterialErrors: [],
    splashMaterialLoaded: {},
    splashMaterialPixels: {},
    splashMaterialErrors: [],
    zoneWorldLoaded: {},
    zoneWorldPixels: {},
    zoneWorldErrors: [],
    hitLabelLoaded: {},
    hitLabelPixels: {},
    hitLabelErrors: [],
    zoneWorldActive: false,
    zoneWorldObjects: 0,
    zoneWorldEndLevel: 0,
    cardColorCounts: {},
    cardColorBySymbol: {},
    lastCutCardColor: null,
    lastSplashColor: null,
    lastSplashDelayMs: null,
    splashPeak: 0,
    dropletPeak: 0,
    splashCount: 0,
    dropletCount: 0,
    brushTracePeak: 0,
    materialPeakTotal: 0,
    materialFallbackCount: 0,
    symbolTexturesLoaded: {},
    cardTexturesCreated: {},
    symbolRenderCheck: {},
    symbolCheckSceneShown: false,
    questionNoticesShown: 0,
    targetChangeCount: 0,
    currentTarget: null,
    currentWave: 0,
    waveSpawnCount: 0,
    lastWavePattern: null,
    targetElapsedMs: 0,
    targetActiveElapsedMs: 0,
    targetRemainingMs: 0,
    targetDrainCount: 0,
    forcedDrainCount: 0,
    pendingSpawnCount: 0,
    drainState: "notice",
    maxActiveCards: 0,
    targetHistory: [],
    lastCut: null,
    hitStopCount: 0,
    lastHitStopMs: 0,
    cutGlowCount: 0,
    lastCutGlowAngle: null,
    impactEffectCount: 0,
    lastImpactStage: null,
    lastImpactPoint: null,
    lastImpactRequestedPoint: null,
    lastImpactRingCount: 0,
    lastImpactSparkCount: 0,
    impactShakeCount: 0,
    activeImpactObjects: 0,
    maxObservedImpactObjects: 0,
    lastSwipeRawSpeed: 0,
    lastSwipeSpeed: 0,
    lastSwipeIntensity: 0,
    maxSwipeSpeed: 0,
    lastHitIntensity: 0,
    speedEffectCount: 0,
    criticalCount: 0,
    criticalLabelCount: 0,
    lastCriticalDistance: null,
    lastCriticalRatio: null,
    lastCriticalSpeed: null,
    lastCriticalResult: false,
    devSettingsLoaded: false,
    devSettingsSaveCount: 0,
    slashAudioReady: false,
    slashAudioMode: "pending",
    slashAudioError: null,
    slashDecodeCount: 0,
    lastSlashVariant: null,
    slashNormalCount: 0,
    slashStrongCount: 0,
    slashIssenCount: 0,
    audioFallbackCount: 0,
    activeSlashVoices: 0,
    runtimeErrors: []
  };

  window.addEventListener("error", (event) => {
    window.__NINJA_QA.runtimeErrors.push(String(event.message || "Unknown error"));
    if (MapSymbolNinja.progress) MapSymbolNinja.progress.invalidateSession("error");
  });
  window.addEventListener("unhandledrejection", (event) => {
    window.__NINJA_QA.runtimeErrors.push(String(event.reason || "Unhandled promise rejection"));
    if (MapSymbolNinja.progress) MapSymbolNinja.progress.invalidateSession("error");
  });

  // 1起動につき1回load。Scene再プレイではEncounterだけをリセットする。
  const progress = new MapSymbolNinja.ProgressManager({
    readOnly: MapSymbolNinja.ProgressManager.isDevelopmentMode(),
    onEvent: (event) => {
      window.__NINJA_QA.lastProgressEvent = event;
      window.__NINJA_QA.progressState = progress.getDebugState();
      if (NINJA_CONFIG.DEBUG_MODE) console.info("PROGRESS", event);
    }
  });
  MapSymbolNinja.progress = progress;
  MapSymbolNinja.learningSaveNotice = new MapSymbolNinja.LearningSaveNotice(progress);
  progress.load();
  MapSymbolNinja.economy = new MapSymbolNinja.EconomyManager({
    development: MapSymbolNinja.ProgressManager.isDevelopmentMode()
  });
  MapSymbolNinja.economySaveNotice = new MapSymbolNinja.EconomySaveNotice(MapSymbolNinja.economy);
  MapSymbolNinja.economy.checkAvailability();
  window.__NINJA_QA.progressState = progress.getDebugState();

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  window.__NINJA_REDUCED_MOTION = reducedMotionQuery.matches;
  const onMotionChange = (event) => { window.__NINJA_REDUCED_MOTION = event.matches; };
  if (typeof reducedMotionQuery.addEventListener === "function") reducedMotionQuery.addEventListener("change", onMotionChange);

  MapSymbolNinja.audioPreferences = new NinjaCore.AudioPreferences();
  window.ninjaAudio = new NinjaCore.AudioManager("chizu-kigou-ninja-muted", {
    slashAudioData: MapSymbolNinja.SlashAudioData,
    maxSlashVoices: 5,
    effectsEnabled: MapSymbolNinja.audioPreferences.get().sfxEnabled
  });

  MapSymbolNinja.audioPreferences.subscribe(value => window.ninjaAudio.setEffectsEnabled(value.sfxEnabled));
  window.ninjaBGM = new NinjaCore.BGMManager(window.ninjaAudio, MapSymbolNinja.BGMAudioData, MapSymbolNinja.audioPreferences);

  // 最初の操作で現在画面の曲を有効化。復号完了を画面操作の条件にしない。
  const unlockCurrentMusic = () => {
    if (window.ninjaAudio.isMuted()) return;
    try {
      const ready = window.ninjaAudio.unlock();
      window.ninjaBGM.prepare().catch(() => false);
      Promise.resolve(ready).then(() => window.ninjaBGM.prepare()).catch(() => false);
    } catch (_error) { /* 音声非対応でも画面は操作できる。 */ }
  };
  document.addEventListener("pointerdown", unlockCurrentMusic, { capture: true, passive: true });
  document.addEventListener("keydown", unlockCurrentMusic, { capture: true });

  let pausedForPortrait = false;
  const updateOrientation = () => {
    const portrait = window.innerHeight > window.innerWidth;
    window.ninjaBGM.setPaused("portrait", portrait);
    document.body.classList.toggle("is-portrait", portrait);
    const game = window.ninjaGame;
    if (!game || !game.loop) return;

    if (portrait && !pausedForPortrait) {
      game.loop.sleep();
      pausedForPortrait = true;
    } else if (!portrait && pausedForPortrait) {
      game.loop.wake();
      pausedForPortrait = false;
    }
    window.__NINJA_QA.pausedForPortrait = pausedForPortrait;
  };
  updateOrientation();
  window.addEventListener("resize", updateOrientation, { passive: true });
  window.addEventListener("orientationchange", updateOrientation, { passive: true });
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  if (typeof Phaser === "undefined") {
    document.getElementById("game-container").textContent = "ゲームの読み込みに失敗しました。";
    return;
  }

  const gameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: NINJA_CONFIG.WIDTH,
    height: NINJA_CONFIG.HEIGHT,
    backgroundColor: "#071426",
    render: {
      antialias: true,
      roundPixels: true,
      powerPreference: "high-performance"
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: NINJA_CONFIG.WIDTH,
      height: NINJA_CONFIG.HEIGHT
    },
    input: {
      activePointers: 3,
      smoothFactor: 0
    },
    scene: [
      MapSymbolNinja.BootScene,
      MapSymbolNinja.PreloadScene,
      ...(NINJA_CONFIG.DEV_PANEL_ENABLED ? [MapSymbolNinja.SymbolCheckScene] : []),
      MapSymbolNinja.TitleScene,
      MapSymbolNinja.SwordSelectScene,
      MapSymbolNinja.TrainingSelectScene,
      MapSymbolNinja.NinjutsuBookScene,
      MapSymbolNinja.HowToScene,
      ...(NINJA_CONFIG.DEV_PANEL_ENABLED ? [MapSymbolNinja.PreviewScene, MapSymbolNinja.UnlockPreviewScene] : []),
      MapSymbolNinja.GameScene,
      MapSymbolNinja.ResultScene
    ]
  };

  window.ninjaGame = new Phaser.Game(gameConfig);
  window.setTimeout(updateOrientation, 0);
})();

