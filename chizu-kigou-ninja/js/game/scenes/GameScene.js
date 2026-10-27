(function () {
  "use strict";

  window.MapSymbolNinja = window.MapSymbolNinja || {};

  class GameScene extends Phaser.Scene {
    constructor() {
      super({ key: "GameScene" });
    }

    init(data) {
      this.rank = data && data.rank !== undefined ? data.rank : "genin";
      this.devElement = NINJA_CONFIG.DEV_PANEL_ENABLED && data && ["none", "fire", "lightning", "ice", "wind"].includes(data.devElement) ? data.devElement : null;
      this.devForceZone = Boolean(NINJA_CONFIG.DEV_PANEL_ENABLED && data && data.devForceZone);
      this.stage = data && data.stage !== undefined ? data.stage : 1;
      this.progressManager = null;
      this.targetDeck = null;
      this.progressEnabled = !MapSymbolNinja.ProgressManager.isDevelopmentMode() && !(data && data.progressEnabled === false);
      this.gamePhase = MapSymbolNinja.GamePhase.READY;
      this.scoringLocked = true;
      this.transitionLock = false;
      this.finishSnapshot = null;
      this.economyRun = null; this.naturalRoundEnd = false; this.rewardSettlement = null;
      this.bgmSession = null;
      this.bgmUnsubscribe = null;
      this.flowTimers = new Set();
      this.countdownLabel = null;
      this.currentQuestion = null;
      this.zoneStartedAt = 0;
      this.zoneSymbolBag = [];
      this.score = 0;
      this.correctCount = 0;
      this.wrongCount = 0;
      this.targetPhase = "notice";
      this.targetNoticeRemainingMs = 0;
      this.targetActiveElapsedMs = 0;
      this.targetDrainElapsedMs = 0;
      this.targetGapRemainingMs = 0;
      this.finalHold = false;
      this.ending = false;
      this.hitStopActive = false;
      this.criticalShownForSwipe = false;
      this.zoneVisualSystem = null;
      this.hitLabels = null;
      this.zoneChainHighlightUntil = 0;
      this.zoneEndBuildHits = 0;
      this.zoneEndBuildLevel = 0;
      this.lastSwipeColor = null;
      this.feedbackObjects = new Set();
      this.questionNoticeObjects = new Set();
      if (window.__NINJA_QA) {
        Object.assign(window.__NINJA_QA, { gamePhase: this.gamePhase, scoringLocked: true,
          countdownText: null, activeObjects: 0, remainingSeconds: NINJA_CONFIG.GAME_TIME });
        window.__NINJA_QA.lastImpactStage = null;
        window.__NINJA_QA.lastImpactPoint = null;
        window.__NINJA_QA.lastImpactRequestedPoint = null;
        window.__NINJA_QA.lastImpactRingCount = 0;
        window.__NINJA_QA.lastImpactSparkCount = 0;
        window.__NINJA_QA.activeImpactObjects = 0;
        window.__NINJA_QA.lastSwipeSpeed = 0;
        window.__NINJA_QA.lastSwipeRawSpeed = 0;
        window.__NINJA_QA.lastSwipeIntensity = 0;
        window.__NINJA_QA.maxSwipeSpeed = 0;
        window.__NINJA_QA.speedEffectCount = 0;
        window.__NINJA_QA.lastHitIntensity = 0;
        window.__NINJA_QA.targetChangeCount = 0;
        window.__NINJA_QA.currentWave = 0;
        window.__NINJA_QA.waveSpawnCount = 0;
        window.__NINJA_QA.lastWavePattern = null;
        window.__NINJA_QA.targetActiveElapsedMs = 0;
        window.__NINJA_QA.targetDrainCount = 0;
        window.__NINJA_QA.forcedDrainCount = 0;
        window.__NINJA_QA.pendingSpawnCount = 0;
        window.__NINJA_QA.maxActiveCards = 0;
        window.__NINJA_QA.targetHistory = [];
        window.__NINJA_QA.criticalCount = 0;
        window.__NINJA_QA.criticalLabelCount = 0;
        window.__NINJA_QA.lastCriticalDistance = null;
        window.__NINJA_QA.lastCriticalRatio = null;
        window.__NINJA_QA.lastCriticalSpeed = null;
        window.__NINJA_QA.lastCriticalResult = false;
        window.__NINJA_QA.issenLabelCount = 0;
        window.__NINJA_QA.hitLabelState = null;
        window.__NINJA_QA.hitLabelPeak = 0;
        Object.assign(window.__NINJA_QA, {
          zoneState: "normal", zonePoints: 0, zoneRequiredPoints: 0, zoneRemainingMs: 0,
          zoneActiveCards: 0, zoneMaxObservedCards: 0, zoneWave: 0,
          zoneCuts: 0, zoneChain: 0, zoneMaxChain: 0, zoneOneStrokeCount: 0,
          zoneEnterCount: 0, zoneExitCount: 0, zoneNormalPaused: false,
          zoneSwipeDeferred: false, zoneHitCount: 0, zoneSpawnCount: 0,
          zoneLastPattern: null, zoneSpawnIds: []
        });
        Object.assign(window.__NINJA_QA, {
          lastVisualType: "normal", zoneLateVisual: false, issenFlowCount: 0,
          zoneChainMilestoneCount: 0, lastImpactType: "normal",
          criticalTightnessLevel: 0, issenTrailLevel: 0,
          zoneWorldReactLevel: 0, zoneIssenSlowApplied: 0,
          zoneFinisherTriggered: false, zoneFinisherSpawned: false,
          zoneFinisherCards: 0, zoneFinisherSuccess: false,
          zoneEndBuildTriggered: false, zoneEndBuildMaxLevel: 0,
          slashTracePeak: 0, inkSplatterPeak: 0, mistPeak: 0,
          slashTraceCount: 0, inkSplatterCount: 0, mistCount: 0
        });
        Object.assign(window.__NINJA_QA, { cardColorCounts: {}, cardColorBySymbol: {},
          lastCutCardColor: null, lastSplashColor: null, lastSplashDelayMs: null,
          splashPeak: 0, dropletPeak: 0, splashCount: 0, dropletCount: 0,
          lastMainSplashPushDistance: 0, lastMainSplashExpandTo: 1,
          lastDropletTravelPx: 0, lastDropletFanDeg: 0,
          heavyDropletPeak: 0, colorMistPeak: 0, heavyDropletCount: 0,
          colorMistCount: 0, impactShakeCount: 0, impactShakeSuppressed: 0,
          lastShakeType: null, lastShakeDuration: 0, lastShakeIntensity: 0,
          lastOmniHeavyCount: 0, lastOmniMistCount: 0,
          lastBurstRings: 0, lastBurstStreaks: 0, lastBurstBlobs: 0,
          activeImpactBursts: 0, zoneBurstLast: null, zoneBurstWaveCount: 0,
          zoneBurstHeavyTotal: 0, zoneBurstMistTotal: 0 });
        Object.assign(window.__NINJA_QA, {
          zoneWorldActive: false, zoneWorldObjects: 0, zoneWorldEndLevel: 0,
          zoneWorldAuraAlpha: 0, zoneWorldLinesAlpha: 0, zoneWorldEntryObjects: 0
        });
      }
    }

    create() {
      if (window.ninjaBGM) window.ninjaBGM.enterScene(this);
      const UI = MapSymbolNinja.UI;
      if (MapSymbolNinja.learningSaveNotice) MapSymbolNinja.learningSaveNotice.setScene(this);
      if (MapSymbolNinja.economySaveNotice) MapSymbolNinja.economySaveNotice.setScene(this);
      const manager = MapSymbolNinja.TrainingSelection.progress();
      const selection = MapSymbolNinja.TrainingSelection.resolve(manager, this.rank, this.stage);
      if (!selection.playable) {
        this.scene.start("TrainingSelectScene", { notice: selection.state === "preparing" ?
          "この しゅぎょうは じゅんびちゅうだよ" : "あいている しゅぎょうを えらんでね" });
        return;
      }
      window.__NINJA_QA.selectedTraining = { rank: this.rank, stage: this.stage,
        ids: selection.symbols.map((symbol) => symbol.id) };
      window.__NINJA_QA.currentScene = "game";
      this.input.enabled = true;
      window.__NINJA_QA.gamesStarted += 1;
      // タイトルで保存した設定を1ゲームにつき1回だけスナップショットする。
      this.tuning = MapSymbolNinja.DevSettings.forGame();
      this.equippedSword = MapSymbolNinja.SwordPreferences.load().id;
      if (this.devElement !== null) this.equippedSword = this.devElement;
      window.__NINJA_QA.equippedSword = this.equippedSword;
      window.__NINJA_QA.gameSettings = this.tuning;
      UI.drawBackground(this, { dim: 0 });
      this.gameModel = new MapSymbolNinja.MapSymbolGame(selection.symbols);
      this.progressManager = manager;
      this.progressManager.beginSession(this.progressEnabled);
      if (MapSymbolNinja.economy) this.economyRun = MapSymbolNinja.economy.beginRun(
        this.progressEnabled && this.devElement === null && !this.devForceZone);
      this.targetDeck = new MapSymbolNinja.TargetDeck(
        selection.entries.map((entry) => entry.id));
      this.cardPalette = new MapSymbolNinja.CardPalette();
      this.comboSystem = new NinjaCore.ComboSystem({ comboTimeout: NINJA_CONFIG.COMBO_TIMEOUT });
      this.roundSystem = new NinjaCore.RoundSystem({
        durationSeconds: NINJA_CONFIG.GAME_TIME,
        warningSeconds: 10,
        maxDeltaMs: 80
      });
      this.hitStopSystem = new NinjaCore.HitStopSystem({
        normalDuration: NINJA_CONFIG.NORMAL_HIT_STOP_MS,
        multiHitStep: NINJA_CONFIG.MULTI_HIT_STOP_STEP_MS,
        maxDuration: NINJA_CONFIG.MAX_HIT_STOP_MS
      });
      this.zoneSystem = new NinjaCore.ZoneSystem({
        required: this.tuning.zoneRequiredPoints,
        durationMs: this.tuning.zoneDurationMs,
        enterMs: NINJA_CONFIG.ZONE_ENTER_MS,
        recoveryMs: NINJA_CONFIG.ZONE_RECOVERY_MS
      });
      this.zoneSpawnSystem = new NinjaCore.ZoneSpawnSystem({
        durationMs: this.tuning.zoneDurationMs,
        maxActive: this.tuning.zoneMaxActive,
        velocityScale: this.tuning.zoneVelocityScale,
        intervalScale: this.tuning.zoneIntervalScale,
        issenChance: this.tuning.zoneIssenChance,
        finisherLeadMs: NINJA_CONFIG.ZONE_FINISHER_LEAD_MS,
        width: NINJA_CONFIG.WIDTH, height: NINJA_CONFIG.HEIGHT, gravity: NINJA_CONFIG.GRAVITY,
        getTuning: () => MapSymbolNinja.DevSettings.forGame().zoneSpawn,
        getActiveCount: () => this.spawnSystem.getActive().length,
        onSpawn: (entry) => this._spawnZoneSymbol(entry),
        onFinisher: (entry) => this._spawnZoneFinisher(entry),
        onWaveChange: (wave) => { window.__NINJA_QA.zoneWave = wave; }
      });
      this.spawnSystem = new NinjaCore.SpawnSystem(this, {
        width: NINJA_CONFIG.WIDTH,
        height: NINJA_CONFIG.HEIGHT,
        gravity: NINJA_CONFIG.GRAVITY,
        velocityXMin: NINJA_CONFIG.LAUNCH_VELOCITY_X_MIN,
        velocityXMax: NINJA_CONFIG.LAUNCH_VELOCITY_X_MAX,
        velocityYMin: NINJA_CONFIG.LAUNCH_VELOCITY_Y_MIN,
        velocityYMax: NINJA_CONFIG.LAUNCH_VELOCITY_Y_MAX,
        margin: 190
      });
      this.waveSystem = new NinjaCore.WaveSpawnSystem({
        durationMs: this.tuning.activeMs,
        cutoffMs: NINJA_CONFIG.TARGET_SPAWN_CUTOFF_MS,
        waves: NINJA_CONFIG.WAVES.map((wave, index) => Object.assign({}, wave, this.tuning.waves[index])),
        maxActive: NINJA_CONFIG.MAX_ACTIVE_OBJECTS,
        correctRate: NINJA_CONFIG.CORRECT_SPAWN_RATE,
        issenChance: this.tuning.issenChance,
        getActiveCount: () => this.spawnSystem.getActive().length,
        onSpawn: (entry) => this._spawnSymbol(entry),
        onWaveChange: (wave) => {
          window.__NINJA_QA.currentWave = wave;
          if (NINJA_CONFIG.DEBUG_MODE) console.info("WAVE", wave);
        }
      });
      this.cutEffectSystem = new NinjaCore.CutEffectSystem(this, {
        reducedMotion: window.__NINJA_REDUCED_MOTION,
        separationForce: NINJA_CONFIG.CUT_SEPARATION_FORCE,
        rotationMin: NINJA_CONFIG.CUT_ROTATION_MIN,
        rotationMax: NINJA_CONFIG.CUT_ROTATION_MAX,
        hitFlashMs: NINJA_CONFIG.HIT_FLASH_MS,
        hitRingMs: NINJA_CONFIG.HIT_RING_MS,
        baseSparkCount: NINJA_CONFIG.HIT_SPARK_COUNT,
        hitRingRadii: [
          NINJA_CONFIG.HIT_RING_RADIUS_STAGE_1,
          NINJA_CONFIG.HIT_RING_RADIUS_STAGE_2,
          NINJA_CONFIG.HIT_RING_RADIUS_STAGE_3,
          NINJA_CONFIG.HIT_RING_RADIUS_STAGE_4
        ],
        maxSparkCount: NINJA_CONFIG.HIT_SPARK_MAX,
        sparkSpeedBonusMax: NINJA_CONFIG.HIT_SPARK_SPEED_BONUS_MAX,
        maxHitSparks: NINJA_CONFIG.MAX_HIT_SPARKS,
        sparkVelocityBonus: NINJA_CONFIG.HIT_SPARK_VELOCITY_BONUS,
        flashSpeedBonus: NINJA_CONFIG.HIT_FLASH_SPEED_BONUS,
        maxImpactObjects: NINJA_CONFIG.MAX_IMPACT_OBJECTS,
        cutGlowDuration: NINJA_CONFIG.CUT_GLOW_DURATION_MS,
        cutGlowOuterWidth: NINJA_CONFIG.CUT_GLOW_OUTER_WIDTH,
        cutGlowMiddleWidth: NINJA_CONFIG.CUT_GLOW_MIDDLE_WIDTH,
        cutGlowCoreWidth: NINJA_CONFIG.CUT_GLOW_CORE_WIDTH,
        onImpactState: (state) => {
          if (!window.__NINJA_QA) return;
          window.__NINJA_QA.activeImpactObjects = state.active;
          window.__NINJA_QA.maxObservedImpactObjects = Math.max(
            Number(window.__NINJA_QA.maxObservedImpactObjects) || 0,
            state.maximumObserved
          );
        }
      });
      this.slashTraceSystem = new NinjaCore.SlashTraceSystem(this, {
        vfx: MapSymbolNinja.EffectPreferences.vfx(Object.assign({}, this.tuning.vfx, { element: this.equippedSword })),
        reducedMotion: window.__NINJA_REDUCED_MOTION,
        maxTrace: NINJA_CONFIG.SLASH_TRACE_MAX_ACTIVE,
        zoneBurstPreset: this.tuning.zoneBurstPreset,
        onState: (state) => {
          const qa = window.__NINJA_QA;
          if (!qa) return;
          qa.dynamicVFX = state.dynamic;
          qa.vfxMode = state.vfxMode;
          qa.slashTraceCount = state.active.trace;
          qa.inkSplatterCount = state.active.ink;
          qa.mistCount = state.active.mist;
          qa.slashTracePeak = state.peak.trace;
          qa.inkSplatterPeak = state.peak.ink;
          qa.splashPeak = state.peak.ink;
          qa.dropletPeak = state.peak.droplet;
          qa.heavyDropletPeak = state.peak.droplet;
          qa.heavyDropletCount = state.active.droplet;
          qa.colorMistPeak = state.colorMist.peak;
          qa.colorMistCount = state.colorMist.active;
          qa.splashCount = state.total.ink;
          qa.dropletCount = state.total.droplet;
          qa.lastSplashDelayMs = state.lastSplashDelayMs;
          qa.lastMainSplashPushDistance = state.lastMainPushDistance;
          qa.lastMainSplashExpandTo = state.lastMainExpandTo;
          qa.lastDropletTravelPx = state.lastDropletTravelPx;
          qa.lastDropletFanDeg = state.lastDropletFanDeg;
          qa.lastOmniHeavyCount = state.lastOmniHeavyCount;
          qa.lastOmniMistCount = state.lastOmniMistCount;
          qa.impactShakeCount = state.impact.shakeCount;
          qa.impactShakeSuppressed = state.impact.suppressed;
          qa.lastShakeType = state.impact.lastShake && state.impact.lastShake.kind;
          qa.lastShakeDuration = state.impact.lastShake ? state.impact.lastShake.duration : 0;
          qa.lastShakeIntensity = state.impact.lastShake ? state.impact.lastShake.intensity : 0;
          qa.lastBurstRings = state.impact.lastAccent ? state.impact.lastAccent.rings : 0;
          qa.lastBurstStreaks = state.impact.lastAccent ? state.impact.lastAccent.streaks : 0;
          qa.lastBurstBlobs = state.impact.lastAccent ? state.impact.lastAccent.blobs : 0;
          qa.activeImpactBursts = state.impact.activeBursts;
          qa.zoneBurstLast = state.zoneBurst.last;
          qa.zoneBurstWaveCount = state.zoneBurst.waves.length;
          qa.zoneBurstHeavyTotal = state.zoneBurst.totalHeavy;
          qa.zoneBurstMistTotal = state.zoneBurst.totalMist;
          qa.mistPeak = state.peak.mist;
          qa.brushTracePeak = state.peak.trace;
          qa.materialPeakTotal = Math.max(qa.materialPeakTotal || 0,
            state.active.trace + state.active.ink + state.active.droplet +
            state.active.mist + state.colorMist.active);
          qa.materialFallbackCount = state.materialFallbackCount;
        }
      });

      this.hitLabels = new NinjaCore.SpecialHitPresentationSystem(this, {
        reducedMotion: window.__NINJA_REDUCED_MOTION,
        depth: MapSymbolNinja.Depth.SPECIAL_TEXT,
        safeTopY: 245,
        tuning: this.tuning.special,
        onState: (state) => {
          window.__NINJA_QA.hitLabelState = state;
          window.__NINJA_QA.hitLabelPeak = Math.max(window.__NINJA_QA.hitLabelPeak || 0, state.peak);
        }
      });

      this._createHud();
      this._advanceQuestion(true, true);

      this.slashSystem = new NinjaCore.SwipeSlashSystem(this, {
        getTargets: () => this.spawnSystem.getActive(),
        getHitArea: (target) => ({
          x: target.x,
          y: target.y,
          width: target.displayWidth * 0.88,
          height: target.displayHeight * 0.88,
          rotation: target.rotation || 0
        }),
        onHit: (target, slash) => this._handleHit(target, slash),
        onSwipeBegin: () => {
          this.criticalShownForSwipe = false;
          this.lastSwipeColor = null;
          this.slashTraceSystem.beginSwipe();
          if (this.zoneSystem.state === "active") this.zoneSystem.beginSwipe();
          else this.comboSystem.beginSwipe();
          this.hitStopSystem.beginSwipe();
          window.ninjaAudio.beginSwipe();
        },
        onSpeedSample: (sample) => {
          const qa = window.__NINJA_QA;
          if (!qa) return;
          qa.lastSwipeRawSpeed = sample.rawSpeed;
          qa.lastSwipeSpeed = sample.smoothedSpeed;
          qa.lastSwipeIntensity = sample.intensity;
          qa.maxSwipeSpeed = Math.max(qa.maxSwipeSpeed, sample.smoothedSpeed);
        },
        onSwipeEnd: (swipe) => this._finishSwipe(swipe),
        onSlashTravel: () => window.ninjaAudio.play("swipe"),
        fadeTime: NINJA_CONFIG.SLASH_FADE_TIME,
        reducedMotion: window.__NINJA_REDUCED_MOTION,
        speedWindowMs: NINJA_CONFIG.SPEED_SAMPLE_WINDOW_MS,
        speedSmoothing: NINJA_CONFIG.SPEED_SMOOTHING,
        speedMin: NINJA_CONFIG.SPEED_VISUAL_MIN,
        speedMax: NINJA_CONFIG.SPEED_VISUAL_MAX,
        widthSpeedBonus: NINJA_CONFIG.SLASH_WIDTH_SPEED_BONUS,
        glowSpeedBonus: NINJA_CONFIG.SLASH_GLOW_SPEED_BONUS,
        trailSpeedBonusMs: NINJA_CONFIG.SLASH_TRAIL_SPEED_BONUS_MS
      });

      this.events.once("shutdown", this._shutdown, this);
      const bgm = window.ninjaBGM;
      if (bgm) {
        this.onBGMPause = () => bgm.pauseScene(this.bgmSession, "scene", true);
        this.onBGMResume = () => bgm.pauseScene(this.bgmSession, "scene", false);
        this.events.on("pause", this.onBGMPause); this.events.on("sleep", this.onBGMPause);
        this.events.on("resume", this.onBGMResume); this.events.on("wake", this.onBGMResume);
        const prefs = MapSymbolNinja.audioPreferences;
        this.bgmButton = new MapSymbolNinja.UIButton(this, 1230, 720, 180, "", () => {
          window.ninjaAudio.unlock().catch(() => false); bgm.prepare().catch(() => false);
          prefs.set({ bgmEnabled: !prefs.get().bgmEnabled });
        }, { fontSize: 20, depth: 950 });
        const refreshBGM = () => this.bgmButton.setLabel(prefs.get().bgmEnabled ? "♪ BGM ON" : "♪ BGM OFF");
        this.bgmUnsubscribe = prefs.subscribe(refreshBGM); refreshBGM();
        UI.keepMenuTouchTargets(this, [this.bgmButton]);
      }
      if (NINJA_CONFIG.DEV_PANEL_ENABLED) {
        this.devAudioButton = new MapSymbolNinja.UIButton(this, 122, 720, 202, "⚙ 音・ZONE",
          () => MapSymbolNinja.ZoneAudioPanel.open(this), { fontSize: 20, depth: 950 });
        const startDevZone = () => {
          if (this.devForceZone && this.gamePhase === MapSymbolNinja.GamePhase.PLAYING && !this.scoringLocked) {
            this.devForceZone = false;
            this.zoneSystem.points = this.zoneSystem.required;
            this._enterZone(false);
          }
        };
        this.events.on("update", startDevZone);
        this.events.once("shutdown", () => this.events.off("update", startDevZone));
      }
      this.slashSystem.setEnabled(false);
      this.cameras.main.fadeIn(window.__NINJA_REDUCED_MOTION ? 100 : 180, 0, 0, 0);
      this._beginCountdown();
    }

    _setPhase(phase) {
      this.gamePhase = phase;
      window.__NINJA_QA.gamePhase = phase;
      window.__NINJA_QA.scoringLocked = this.scoringLocked;
      if (NINJA_CONFIG.DEBUG_MODE) console.info("GAME PHASE", phase);
    }

    _flowLater(delay, action) {
      let timer;
      timer = this.time.delayedCall(delay, () => {
        this.flowTimers.delete(timer);
        action();
      });
      this.flowTimers.add(timer);
      return timer;
    }

    _beginCountdown() {
      this._setPhase(MapSymbolNinja.GamePhase.COUNTDOWN);
      this.countdownLabel = this.add.text(683, 384, "", {
        fontFamily: MapSymbolNinja.UI.fontFamily, fontSize: "156px", fontStyle: "bold",
        color: "#f5fcff", stroke: "#102c51", strokeThickness: 10,
        shadow: { offsetX: 0, offsetY: 5, color: "#030916", blur: 12, fill: true }
      }).setOrigin(.5).setDepth(MapSymbolNinja.Depth.TRANSITION);
      ["3", "2", "1", "はじめ！"].forEach((label, index) => {
        const show = () => {
          if (this.gamePhase !== MapSymbolNinja.GamePhase.COUNTDOWN) return;
          const text = this.countdownLabel;
          this.tweens.killTweensOf(text);
          text.setText(label).setFontSize(index === 3 ? 104 : 156).setAlpha(0)
            .setScale(window.__NINJA_REDUCED_MOTION ? 1 : .75);
          this.tweens.add({ targets: text, alpha: 1, scale: 1, duration: 160, ease: "Quad.easeOut" });
          window.__NINJA_QA.countdownText = label;
          MapSymbolNinja.UI.announce(label);
          this._flowLater(index === 3 ? 230 : 620, () => {
            if (text.active) this.tweens.add({ targets: text, alpha: 0, duration: 140 });
          });
        };
        if (index === 0) show();
        else this._flowLater(index * 800, show);
      });
      this._flowLater(2800, () => this._startPlaying());
    }

    _startPlaying() {
      if (this.gamePhase !== MapSymbolNinja.GamePhase.COUNTDOWN) return;
      if (this.countdownLabel) {
        this.tweens.killTweensOf(this.countdownLabel);
        this.countdownLabel.destroy();
        this.countdownLabel = null;
      }
      this.scoringLocked = false;
      if (MapSymbolNinja.economy && this.economyRun) MapSymbolNinja.economy.startRun(this.economyRun);
      this._setPhase(MapSymbolNinja.GamePhase.PLAYING);
      if (window.ninjaBGM) this.bgmSession = window.ninjaBGM.begin();
      window.__NINJA_QA.countdownText = null;
      this._showQuestionNotice(true);
      window.__NINJA_QA.questionNoticesShown += 1;
      this.slashSystem.setEnabled(true);
      MapSymbolNinja.UI.announce(this.currentQuestion.kana + "を斬ってください。残り60秒です。");
    }

    update(time, delta) {
      if (this.hitLabels) this.hitLabels.update(delta);
      if (this.slashTraceSystem) this.slashTraceSystem.update(delta);
      if (this.zoneVisualSystem) this.zoneVisualSystem.update(delta);
      if (this.gamePhase !== MapSymbolNinja.GamePhase.PLAYING) {
        if (this.slashSystem) this.slashSystem.update(time);
        return;
      }

      // Scene自体はPauseせず、ゲーム世界の更新だけを短く止める。
      // Pointerの更新と発光Tweenはこの下でも動く。
      const hitStopActive = this.hitStopSystem && this.hitStopSystem.isActive(time);
      this.hitStopActive = Boolean(hitStopActive);
      if (!hitStopActive && this.cutEffectSystem) this.cutEffectSystem.releasePendingCuts();
      if (this.zoneSystem.isPaused()) {
        const transition = this.zoneSystem.update(delta);
        if (transition === "start") this._startZonePlay();
        else if (transition === "end") this._endZonePlay();
        else if (transition && transition.resumed) this._resumeNormalPlay(transition.pausedMs);
        if (this.zoneSystem.state === "active") {
          const step = Math.min(80, Math.max(0, Number(delta) || 0));
          this.spawnSystem.update(hitStopActive ? 0 : step);
          if (!hitStopActive) this.zoneSpawnSystem.update(step, this.zoneSystem.remainingMs);
        }
        this.slashSystem.update(time);
        this._updateZoneHud();
        return;
      }
      const playable = this.targetPhase === "active" || this.targetPhase === "drain";
      const worldPaused = !playable || hitStopActive;

      const roundState = this.roundSystem.update(worldPaused ? 0 : delta);
      const safeDelta = roundState.consumedMs;
      if (MapSymbolNinja.economy && this.economyRun) MapSymbolNinja.economy.advanceRun(this.economyRun, safeDelta);
      // 0秒が確定したフレームはPointer補完より先にロックする。
      if (roundState.expired) {
        this.naturalRoundEnd = true;
        this._endGame();
        return;
      }

      this.spawnSystem.update(worldPaused ? 0 : safeDelta);
      this.slashSystem.update(time);
      if (this.comboSystem.update(time)) this._updateComboHud();

      if (roundState.secondChanged) {
        this.timerText.setText("のこり  " + roundState.seconds);
      }
      window.__NINJA_QA.remainingSeconds = roundState.seconds;

      if (roundState.warningStarted) {
        this.timerText.setColor("#ffd27a");
        window.ninjaAudio.play("tenSeconds");
        if (!window.__NINJA_REDUCED_MOTION) {
          this.tweens.add({ targets: this.timerText, scale: 1.13, duration: 170, yoyo: true, repeat: 1 });
        }
      }

      if (this.targetPhase === "notice") {
        this.targetNoticeRemainingMs = Math.max(0, this.targetNoticeRemainingMs - Math.min(100, Math.max(0, Number(delta) || 0)));
        if (this.targetNoticeRemainingMs === 0) this._beginTargetPlay();
      } else if (this.targetPhase === "active" && !hitStopActive) {
        this.targetActiveElapsedMs += safeDelta;
        this.waveSystem.update(this.targetActiveElapsedMs);
        if (!this.finalHold && this.targetActiveElapsedMs >= this.tuning.activeMs) {
          // 残札待機の後、次のお題を遊べる時間が3秒未満なら切り替えない。
          if (this.roundSystem.remainingMs <= 3000 + NINJA_CONFIG.TARGET_DRAIN_MAX_MS) {
            this.finalHold = true;
            this.waveSystem.extendFinalStretch(this.targetActiveElapsedMs, this.roundSystem.remainingMs);
          } else {
            this._beginTargetDrain();
          }
        }
      } else if (this.targetPhase === "drain" && !hitStopActive) {
        this.targetDrainElapsedMs += safeDelta;
        if (this.spawnSystem.getActive().length === 0) {
          this._beginTargetGap();
        } else if (this.targetDrainElapsedMs >= NINJA_CONFIG.TARGET_DRAIN_MAX_MS) {
          this.spawnSystem.clear(140);
          window.__NINJA_QA.forcedDrainCount += 1;
          this._beginTargetGap();
        }
      } else if (this.targetPhase === "gap") {
        this.targetGapRemainingMs = Math.max(0, this.targetGapRemainingMs - Math.min(100, Math.max(0, Number(delta) || 0)));
        if (this.targetGapRemainingMs === 0) this._advanceQuestion(false, true);
      }

      const qa = window.__NINJA_QA;
      qa.activeObjects = this.spawnSystem.getActive().length;
      qa.maxActiveCards = Math.max(qa.maxActiveCards, qa.activeObjects);
      qa.currentTarget = this.currentQuestion.id;
      qa.targetElapsedMs = Math.round(this.targetActiveElapsedMs);
      qa.targetActiveElapsedMs = Math.round(this.targetActiveElapsedMs);
      qa.targetRemainingMs = Math.max(0, Math.round(this.tuning.activeMs - this.targetActiveElapsedMs));
      qa.pendingSpawnCount = this.waveSystem.getPendingCount();
      qa.drainState = this.targetPhase;
      this._updateZoneHud();
    }

    _createHud() {
      const UI = MapSymbolNinja.UI;
      const hud = this.add.graphics().setDepth(MapSymbolNinja.Depth.HUD);
      hud.fillStyle(0x030b15, 0.78);
      hud.fillRoundedRect(30, 28, 235, 76, 18);
      hud.fillRoundedRect(1101, 28, 235, 76, 18);
      this.missionFrame = UI.asset(this, MapSymbolNinja.AssetKeys.MISSION_FRAME,
        683, 64, 600, MapSymbolNinja.Depth.HUD);
      this.missionHeader = this.add.text(683, 38, "おだい", {
        fontFamily: UI.fontFamily, fontSize: "16px", fontStyle: "bold", color: "#395374"
      }).setOrigin(.5).setDepth(MapSymbolNinja.Depth.HUD + 10);

      this.timerText = this.add.text(147, 66, "のこり  " + this.roundSystem.getSeconds(), {
        fontFamily: UI.fontFamily,
        fontSize: "31px",
        fontStyle: "bold",
        color: "#f5fbff"
      }).setOrigin(0.5).setDepth(MapSymbolNinja.Depth.HUD + 10);

      this.promptText = this.add.text(683, 74, "", {
        fontFamily: UI.fontFamily,
        fontSize: "42px",
        fontStyle: "bold",
        color: "#24170d",
        align: "center"
      }).setOrigin(0.5).setDepth(MapSymbolNinja.Depth.HUD + 10);

      this.comboText = this.add.text(1218, 57, "0 COMBO", {
        fontFamily: UI.fontFamily,
        fontSize: "27px",
        fontStyle: "bold",
        color: "#bfeaff"
      }).setOrigin(0.5).setDepth(MapSymbolNinja.Depth.HUD + 10);

      this.scoreText = this.add.text(1218, 88, "0 点", {
        fontFamily: UI.fontFamily,
        fontSize: "19px",
        color: "#fff2b7"
      }).setOrigin(0.5).setDepth(MapSymbolNinja.Depth.HUD + 10);

      // お題の下に置き、通常の読み取りや札の軌道を塞がない。
      this.zoneGauge = this.add.graphics().setDepth(MapSymbolNinja.Depth.HUD + 8);
      this.zoneGaugeText = this.add.text(683, 157, "ZONE  0 / " + this.zoneSystem.required, {
        fontFamily: UI.fontFamily, fontSize: "17px", fontStyle: "bold", color: "#d5f3ff"
      }).setOrigin(.5).setDepth(MapSymbolNinja.Depth.HUD + 10);
      this.zoneStatusText = this.add.text(683, 183, "", {
        fontFamily: UI.fontFamily, fontSize: "22px", fontStyle: "bold", color: "#d8f6ff",
        stroke: "#102b49", strokeThickness: 4
      }).setOrigin(.5).setDepth(MapSymbolNinja.Depth.HUD + 10);
      this._updateZoneHud();
    }

    _setMissionPrompt() {
      this.missionHeader.setText("おだい");
      const label = this.currentQuestion.promptName || this.currentQuestion.name;
      // Inner paper only: the illustration's rollers and curled ends are not text space.
      const layout = MapSymbolNinja.JapaneseTextLayout;
      let result = layout.fit(this.promptText,label,{width:448,height:54,fontSize:44,minFontSize:32,lineSpacing:0,maxLines:1});
      if (!result.fits) result=layout.fit(this.promptText,label,{width:448,height:76,fontSize:32,minFontSize:26,lineSpacing:2,maxLines:2});
      const twoLines = result.lines.length > 1;
      this.missionHeader.setVisible(!twoLines);
      this.promptText.setPosition(683,twoLines?64:76);
    }

    _advanceQuestion(initial, officialTransition) {
      if (!officialTransition) this._disableProgress("forced_target");
      if (this.progressManager) this.progressManager.cancelEncounter("target_changed");
      this.waveSystem.cancel();
      const entry = MapSymbolNinja.MapSymbolData.get(this.targetDeck.draw());
      this.currentQuestion = this.gameModel.byId.get(entry.rendererId);
      this.targetPhase = "notice";
      this.targetNoticeRemainingMs = this.tuning.noticeMs;
      this.targetActiveElapsedMs = 0;
      this.targetDrainElapsedMs = 0;
      this.finalHold = false;
      this._setMissionPrompt();
      if (this.gamePhase === MapSymbolNinja.GamePhase.PLAYING) {
        this._showQuestionNotice(initial);
        window.__NINJA_QA.questionNoticesShown += 1;
      }
      if (!initial) window.ninjaAudio.play("questionChange");
      if (!initial) window.__NINJA_QA.targetChangeCount += 1;
      if (NINJA_CONFIG.DEBUG_MODE) console.info("TARGET NOTICE:", this.currentQuestion.id);
      MapSymbolNinja.UI.announce(this.currentQuestion.kana + "を斬ってください。");
    }

    _beginTargetPlay() {
      if (this.gamePhase !== MapSymbolNinja.GamePhase.PLAYING || this.ending || this.targetPhase !== "notice") return;
      this.targetPhase = "active";
      this.targetActiveElapsedMs = 0;
      if (this.progressManager) this.progressManager.startEncounter(this.currentQuestion.id);
      this.waveSystem.start();
      window.__NINJA_QA.currentWave = 0;
      window.__NINJA_QA.targetHistory.push({
        id: this.currentQuestion.id,
        startedAtRemainingMs: Math.round(this.roundSystem.remainingMs),
        waveSpawns: [0, 0, 0, 0]
      });
      if (NINJA_CONFIG.DEBUG_MODE) console.info("TARGET START:", this.currentQuestion.id);
    }

    _beginTargetDrain() {
      this.targetPhase = "drain";
      this.targetDrainElapsedMs = 0;
      this.waveSystem.cancel();
      window.__NINJA_QA.targetDrainCount += 1;
      window.__NINJA_QA.currentWave = 0;
      if (NINJA_CONFIG.DEBUG_MODE) console.info("DRAIN START");
    }

    _beginTargetGap() {
      if (this.targetPhase === "gap") return;
      if (this.progressManager) this.progressManager.finalizeEncounter("target_end");
      this.targetPhase = "gap";
      this.targetGapRemainingMs = NINJA_CONFIG.TARGET_TRANSITION_GAP_MS;
      const history = window.__NINJA_QA.targetHistory;
      if (history.length) history[history.length - 1].endedAtRemainingMs = Math.round(this.roundSystem.remainingMs);
    }

    _showQuestionNotice(initial) {
      const UI = MapSymbolNinja.UI;
      const centerX = NINJA_CONFIG.WIDTH / 2;
      const centerY = 338;
      const noticeDuration = this.tuning.noticeMs;
      const container = this.add.container(centerX, centerY).setDepth(MapSymbolNinja.Depth.QUESTION).setAlpha(0);
      const startScale = window.__NINJA_REDUCED_MOTION ? 1 : 0.82;
      container.setScale(startScale);

      const shadow = this.add.graphics();
      shadow.fillStyle(0x02070d, 0.42);
      shadow.fillRoundedRect(-278, -76, 556, 154, 24);

      const paper = this.add.graphics();
      paper.fillStyle(0xf3dfaa, 0.99);
      paper.fillRoundedRect(-270, -84, 540, 154, 22);
      paper.lineStyle(3, 0x79502a, 0.92);
      paper.strokeRoundedRect(-270, -84, 540, 154, 22);
      paper.fillStyle(0xc99a4d, 1);
      paper.fillRoundedRect(-291, -92, 582, 22, 11);
      paper.fillRoundedRect(-291, 56, 582, 22, 11);
      paper.fillStyle(0x7d542c, 0.95);
      paper.fillCircle(-282, -81, 8);
      paper.fillCircle(282, -81, 8);
      paper.fillCircle(-282, 67, 8);
      paper.fillCircle(282, 67, 8);

      const heading = this.add.text(0, -47, initial ? "最初のお題" : "つぎのお題", {
        fontFamily: UI.fontFamily,
        fontSize: "21px",
        fontStyle: "bold",
        color: "#8b2e25",
        letterSpacing: 3
      }).setOrigin(0.5);
      const prompt = this.add.text(0, 16, "", {
        fontFamily: UI.fontFamily,
        fontSize: "42px",
        fontStyle: "bold",
        color: "#21150d",
        align: "center"
      }).setOrigin(0.5);
      const noticeLabel = (this.currentQuestion.promptKana || this.currentQuestion.kana) + "！";
      const noticeLayout = MapSymbolNinja.JapaneseTextLayout;
      let noticeFit = noticeLayout.fit(prompt,noticeLabel,{width:492,height:76,fontSize:42,minFontSize:32,lineSpacing:2,maxLines:1});
      if (!noticeFit.fits) noticeLayout.fit(prompt,noticeLabel,{width:492,height:76,fontSize:32,minFontSize:28,lineSpacing:2,maxLines:2});

      container.add([shadow, paper, heading, prompt]);
      this.questionNoticeObjects.add(container);
      this.tweens.add({
        targets: container,
        alpha: 1,
        scale: 1,
        duration: window.__NINJA_REDUCED_MOTION ? 90 : 135,
        ease: window.__NINJA_REDUCED_MOTION ? "Linear" : "Back.easeOut"
      });

      this.time.delayedCall(Math.max(180, noticeDuration - 230), () => {
        if (!container.active) return;
        this.tweens.add({
          targets: container,
          y: window.__NINJA_REDUCED_MOTION ? centerY - 12 : 126,
          scale: window.__NINJA_REDUCED_MOTION ? 0.96 : 0.56,
          alpha: 0,
          duration: Math.min(230, noticeDuration),
          ease: "Quad.easeIn",
          onComplete: () => {
            this.questionNoticeObjects.delete(container);
            container.destroy(true);
          }
        });
      });
    }

    _spawnSymbol(entry) {
      const symbol = this.gameModel.pickSpawnSymbol(
        this.currentQuestion.id,
        entry.correct,
        entry.correct ? 1 : 0
      );

      const card = this._createSymbolCard(symbol);
      card.symbolData = symbol;
      card.spawnQuestionId = this.currentQuestion.id;
      card.__wrongCooldownUntil = 0;
      this.spawnSystem.launch(card, entry.launch);
      const qa = window.__NINJA_QA;
      qa.waveSpawnCount += 1;
      qa.lastWavePattern = entry.pattern;
      const history = qa.targetHistory[qa.targetHistory.length - 1];
      if (history) history.waveSpawns[entry.wave - 1] += 1;

      if (!window.__NINJA_REDUCED_MOTION) {
        card.setScale(card.scaleX * 0.90, card.scaleY * 0.90);
        this.tweens.add({ targets: card, scaleX: NINJA_CONFIG.SYMBOL_BASE_SIZE / card.width, scaleY: NINJA_CONFIG.SYMBOL_BASE_SIZE / card.height, duration: 110, ease: "Back.easeOut" });
      }
      return true;
    }

    _spawnZoneSymbol(entry) {
      if (this.zoneSystem.state !== "active") return false;
      const symbols = this.gameModel.symbols;
      if (!this.zoneSymbolBag || !this.zoneSymbolBag.length) {
        this.zoneSymbolBag = symbols.slice();
        for (let i = this.zoneSymbolBag.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [this.zoneSymbolBag[i], this.zoneSymbolBag[j]] = [this.zoneSymbolBag[j], this.zoneSymbolBag[i]];
        }
      }
      const symbol = this.zoneSymbolBag.pop();
      const card = this._createSymbolCard(symbol);
      card.symbolData = symbol;
      card.__zoneCard = true;
      card.__zoneFinisher = Boolean(entry.finisher);
      card.__spawnDirection = entry.direction || "bottom";
      this.spawnSystem.launch(card, entry.launch);
      const qa = window.__NINJA_QA;
      qa.zoneSpawnCount = (qa.zoneSpawnCount || 0) + 1;
      qa.zoneLastPattern = entry.pattern;
      qa.zoneLastDirection = card.__spawnDirection;
      qa.zoneDirectionCounts = qa.zoneDirectionCounts || { bottom: 0, left: 0, right: 0 };
      qa.zoneDirectionCounts[card.__spawnDirection]++;
      qa.zoneSpawnIds.push(symbol.id);
      if (entry.finisher) {
        qa.zoneFinisherSpawned = true;
        qa.zoneFinisherCards += 1;
      }
      return true;
    }

    _createSymbolCard(symbol) {
      const color = this.cardPalette.next();
      const key = "card_" + symbol.id +
        (NINJA_CONFIG.CARD_COLOR_ENABLED ? "_" + color.id : "");
      const card = this.add.image(0, 0, key)
        .setDisplaySize(NINJA_CONFIG.SYMBOL_BASE_SIZE, NINJA_CONFIG.SYMBOL_BASE_SIZE)
        .setDepth(50);
      card.cardColor = NINJA_CONFIG.CARD_COLOR_ENABLED ? color.value : 0xd8e5e3;
      card.cardColorId = NINJA_CONFIG.CARD_COLOR_ENABLED ? color.id : "neutral";
      const qa = window.__NINJA_QA;
      qa.cardColorCounts[card.cardColorId] = (qa.cardColorCounts[card.cardColorId] || 0) + 1;
      const seen = qa.cardColorBySymbol[symbol.id] || (qa.cardColorBySymbol[symbol.id] = {});
      seen[card.cardColorId] = (seen[card.cardColorId] || 0) + 1;
      return card;
    }

    _spawnZoneFinisher(entry) {
      const qa = window.__NINJA_QA;
      qa.zoneFinisherTriggered = true;
      if (this.zoneSystem.state !== "active") return false;
      // 二枚が終盤でほぼ同じ高さになる軌道。満杯でも二枠だけ入れ替える。
      const launches = [entry.launch, entry.companionLaunch].filter(Boolean);
      for (const launch of launches) {
        const active = this.spawnSystem.getActive();
        if (active.length >= this.zoneSpawnSystem._tuning().maxActive) {
          const farthest = active.reduce((a, b) =>
            Math.abs(a.y - 420) > Math.abs(b.y - 420) ? a : b);
          this.spawnSystem.remove(farthest, false);
          this.tweens.add({ targets: farthest, alpha: 0, duration: 95,
            onComplete: () => farthest.active && farthest.destroy() });
        }
        this._spawnZoneSymbol(Object.assign({}, entry, { launch }));
      }
      return true;
    }

    _handleHit(target, slash) {
      if (this.gamePhase !== MapSymbolNinja.GamePhase.PLAYING || this.scoringLocked ||
          this.ending || !target.active || target.__cut) return;
      if (this.zoneSystem.state === "active") {
        if (target.__zoneCard) this._handleZoneHit(target, slash);
        return;
      }
      if (this.zoneSystem.isPaused()) return;
      if (target.__wrongCooldownUntil > this.time.now) return;

      const symbol = target.symbolData;
      const correct = this.gameModel.isCorrect(symbol.id, target.spawnQuestionId);
      if (correct) {
        const critical = NinjaCore.CriticalSlashSystem.evaluate({
          enabled: NINJA_CONFIG.CRITICAL_ENABLED,
          cardCenter: { x: target.x, y: target.y },
          cutLineStart: slash.from,
          cutLineEnd: slash.to,
          swipeSpeed: slash.swipeSpeed,
          cardSize: { width: target.displayWidth, height: target.displayHeight },
          maxCenterRatio: this.tuning.criticalCenterRatio,
          minSpeed: this.tuning.criticalMinSpeed
        });
        const qa = window.__NINJA_QA;
        qa.lastCriticalDistance = critical.centerDistance;
        qa.lastCriticalRatio = critical.centerRatio;
        qa.lastCriticalSpeed = critical.swipeSpeed;
        qa.lastCriticalResult = critical.isCritical;
        if (NINJA_CONFIG.DEBUG_MODE) console.info("CRITICAL", critical);
        target.__cut = true;
        const inheritedFlight = target.__flight
          ? { vx: target.__flight.vx, vy: target.__flight.vy }
          : { vx: 0, vy: 0 };
        this.spawnSystem.remove(target, false);
        const milestone = this.comboSystem.recordCorrect(this.time.now);
        this.correctCount += 1;
        if (this.progressManager) this.progressManager.recordCorrectHit(symbol.id);
        this.score += NINJA_CONFIG.SCORE_PER_CORRECT;
        this.zoneSystem.addCorrect(this.comboSystem.combo);
        window.ninjaAudio.play("slash", {
          element: this.equippedSword,
          zone: false,
          combo: this.comboSystem.combo,
          multiHitIndex: this.comboSystem.swipeHits,
          x: target.x,
          viewportWidth: NINJA_CONFIG.WIDTH
        });
        const hitStop = this.hitStopSystem.request(this.time.now, this.comboSystem.swipeHits);
        this.hitStopActive = true;
        window.__NINJA_QA.hitStopCount += 1;
        window.__NINJA_QA.lastHitStopMs = hitStop.duration;
        this._createCutEffect(target, slash, inheritedFlight, this.comboSystem.combo, milestone === "awaken", critical.isCritical);
        if (critical.isCritical) {
          qa.criticalCount += 1;
          if (!this.criticalShownForSwipe) {
            this.criticalShownForSwipe = true;
            this._showCritical(slash.hitPoint.x, slash.hitPoint.y, slash.angle, target.cardColor, false, true);
          }
        }
        this._createSymbolEffect(symbol.effect, target.x, target.y);
        this._showFeedback((symbol.feedbackKana || symbol.kana) + "！", target.x, target.y - 80, "#fff5b8", 430);
        target.destroy();
        this._updateScoreHud();
        this._updateComboHud();
        if (milestone) this._showComboMilestone(milestone);
      } else {
        target.__wrongCooldownUntil = this.time.now + 240;
        this.comboSystem.recordWrong();
        this.wrongCount += 1;
        if (this.progressManager) this.progressManager.recordWrongAttempt(symbol.id);
        window.ninjaAudio.play("wrong");
        this._showWrongEffect(target.x, target.y);
        this._showFeedback("カンッ！", target.x, target.y - 18, "#ffd08a", 300);
        this._showFeedback("これは " + (symbol.feedbackKana || symbol.kana) + "！", target.x, target.y - 82, "#ffd8a6", NINJA_CONFIG.WRONG_FEEDBACK_TIME);
        const originalX = target.x;
        if (target.__flight) {
          target.__flight.vx *= -0.42;
          target.__flight.vy -= 55;
        }
        target.setTint(0xffd2a0);
        this.tweens.add({
          targets: target,
          x: originalX + 11,
          duration: 44,
          yoyo: true,
          repeat: 2,
          onComplete: () => target.active && target.clearTint()
        });
        this._updateComboHud();
      }
    }

    _finishSwipe(swipe) {
      window.ninjaAudio.endSwipe();
      if (this.gamePhase !== MapSymbolNinja.GamePhase.PLAYING || this.scoringLocked || this.ending || !this.comboSystem) return;
      if (this.zoneSystem.isPaused()) {
        const hits = this.zoneSystem.finishSwipe();
        if (this.hitStopSystem) this.hitStopSystem.endSwipe();
        if (this.slashTraceSystem) this.slashTraceSystem.endSwipe({
          releaseDelayMs: hits >= 2 ? NINJA_CONFIG.ZONE_ISSEN_RELEASE_MS : 0
        });
        if (hits >= 2) {
          const delay = NINJA_CONFIG.ZONE_ISSEN_RELEASE_MS;
          if (this.cutEffectSystem.playIssenFlow(swipe.points, true, delay)) {
            if (this.slashTraceSystem) this.slashTraceSystem.flow(swipe.points, true, delay,
              this.zoneEndBuildLevel, this.lastSwipeColor);
            window.__NINJA_QA.issenFlowCount += 1;
            window.__NINJA_QA.zoneIssenSlowApplied += 1;
            this.time.delayedCall(delay, () => {
              if (this.zoneVisualSystem) this.zoneVisualSystem.reactHit(true);
            });
          }
          this._showIssen(swipe, hits, true,
            hits >= 3 ? "ZONE 一閃！" : "ZONE 二連斬！", true);
        }
        this._updateZoneHud();
        return;
      }
      const result = this.comboSystem.finishSwipe();
      if (this.hitStopSystem) this.hitStopSystem.endSwipe();
      if (this.slashTraceSystem) this.slashTraceSystem.endSwipe();
      if (result.hits >= 2 && this.cutEffectSystem.playIssenFlow(swipe.points, false)) {
        if (this.slashTraceSystem) this.slashTraceSystem.flow(swipe.points, false, 0, 0, this.lastSwipeColor);
        window.__NINJA_QA.issenFlowCount += 1;
        window.__NINJA_QA.lastVisualType = "issen";
      }
      if (result.label) {
        this.zoneSystem.addSwipeBonus(result.hits);
        this.score += result.bonus;
        this._updateScoreHud();
      }
      if (result.label) this._showIssen(swipe, result.hits, false, result.label, true);
      if (this.zoneSystem.ready()) this._enterZone(true);
      else this._updateZoneHud();
    }

    _createCutEffect(target, slash, flight, combo, specialShake, critical, zone) {
      const report = this.cutEffectSystem.split(target, slash, {
        textureWidth: 180,
        textureHeight: 180,
        flight,
        combo,
        speedIntensity: slash.speedIntensity,
        critical,
        zone: Boolean(zone),
        multiHit: zone ? Boolean(this.zoneSystem && this.zoneSystem.swipeHits >= 2) :
          Boolean(this.comboSystem && this.comboSystem.swipeHits >= 2),
        criticalGlowBonus: NINJA_CONFIG.CRITICAL_GLOW_BONUS,
        criticalSparkBonus: NINJA_CONFIG.CRITICAL_SPARK_BONUS,
        deferMovement: true,
        // 段階的な揺れはSlashTraceSystemが一本のスワイプ単位で発動する。
        specialShake: false
      });
      if (!report) return;
      if (window.ninjaBGM) window.ninjaBGM.duck();
      this.lastSwipeColor = target.cardColor;
      if (this.slashTraceSystem) this.slashTraceSystem.hit(report, zone ? this.zoneEndBuildLevel : 0,
        Boolean(zone && target.__zoneFinisher), target.cardColor);
      // Attribute audio uses the very same confirmed cut report as the VFX, without a timer.
      if (window.ninjaAudio.playElementHit) window.ninjaAudio.playElementHit({ element: this.equippedSword, type: report.visualType });
      const qa = window.__NINJA_QA;
      if (!qa) return;
      qa.lastCutCardColor = target.cardColorId;
      qa.lastSplashColor = target.cardColor;
      qa.cutGlowCount += 1;
      qa.lastVisualType = report.visualType;
      qa.lastImpactType = report.visualType;
      qa.criticalTightnessLevel = report.timing.anticipationMs;
      qa.issenTrailLevel = report.visualType.endsWith("issen") ? (zone ? 470 : 390) : 0;
      qa.lastCutGlowAngle = Math.round((report.angle * 180 / Math.PI) * 10) / 10;
      qa.lastCut = {
        angleDegrees: Math.round((report.angle * 180 / Math.PI) * 10) / 10,
        requestedLocalPoint: {
          x: Math.round(report.localHitPoint.x * 10) / 10,
          y: Math.round(report.localHitPoint.y * 10) / 10
        },
        adjustedLocalPoint: {
          x: Math.round(report.adjustedLocalHitPoint.x * 10) / 10,
          y: Math.round(report.adjustedLocalHitPoint.y * 10) / 10
        },
        pieceAreas: [Math.round(report.geometry.firstArea), Math.round(report.geometry.secondArea)],
        glowWorldLine: {
          start: {
            x: Math.round(report.cutLine.worldStart.x * 10) / 10,
            y: Math.round(report.cutLine.worldStart.y * 10) / 10
          },
          end: {
            x: Math.round(report.cutLine.worldEnd.x * 10) / 10,
            y: Math.round(report.cutLine.worldEnd.y * 10) / 10
          }
        }
      };
      if (report.impact) {
        const roundPoint = (point) => ({
          x: Math.round(point.x * 10) / 10,
          y: Math.round(point.y * 10) / 10
        });
        qa.impactEffectCount = (Number(qa.impactEffectCount) || 0) + 1;
        qa.lastImpactStage = report.impact.stage;
        qa.lastImpactPoint = roundPoint(report.impact.point);
        qa.lastImpactRequestedPoint = roundPoint(report.impact.requestedPoint);
        qa.lastImpactRingCount = report.impact.ringCount;
        qa.lastImpactSparkCount = report.impact.sparkCount;
        qa.lastHitIntensity = report.impact.speedIntensity;
        if (report.impact.speedIntensity > 0) qa.speedEffectCount += 1;
      }
    }

    _handleZoneHit(target, slash) {
      // ZONE中も精密な斬り方への表示だけは返す。得点・CHAIN・切断判定は変えない。
      const critical = NinjaCore.CriticalSlashSystem.evaluate({
        enabled: NINJA_CONFIG.CRITICAL_ENABLED,
        cardCenter: { x: target.x, y: target.y },
        cutLineStart: slash.from, cutLineEnd: slash.to,
        swipeSpeed: slash.swipeSpeed,
        cardSize: { width: target.displayWidth, height: target.displayHeight },
        maxCenterRatio: this.tuning.criticalCenterRatio,
        minSpeed: this.tuning.criticalMinSpeed
      });
      target.__cut = true;
      const flight = target.__flight
        ? { vx: target.__flight.vx, vy: target.__flight.vy } : { vx: 0, vy: 0 };
      this.spawnSystem.remove(target, false);
      const hitIndex = this.zoneSystem.recordCut();
      if (this.zoneSystem.remainingMs <= NINJA_CONFIG.ZONE_END_BUILDUP_START_MS) {
        this.zoneEndBuildHits += 1;
      }
      if (target.__zoneFinisher) window.__NINJA_QA.zoneFinisherSuccess = true;
      window.ninjaAudio.play("slash", {
        element: this.equippedSword,
        zone: true,
        combo: hitIndex >= 3 ? 3 : Math.min(9, Math.max(3, this.zoneSystem.chain)),
        multiHitIndex: hitIndex,
        x: target.x, viewportWidth: NINJA_CONFIG.WIDTH
      });
      const stop = this.hitStopSystem.request(this.time.now, hitIndex, this.tuning.zoneHitStopMs);
      window.__NINJA_QA.hitStopCount += 1;
      window.__NINJA_QA.lastHitStopMs = stop.duration;
      this._createCutEffect(target, slash, flight, Math.min(9, Math.max(3, this.zoneSystem.chain)), false, false, true);
      if (critical.isCritical && !this.criticalShownForSwipe) {
        this.criticalShownForSwipe = true;
        this._showCritical(slash.hitPoint.x, slash.hitPoint.y, slash.angle, target.cardColor, true, true);
      }
      this._createSymbolEffect(target.symbolData.effect, target.x, target.y);
      this._showFeedback((target.symbolData.feedbackKana || target.symbolData.kana) + "！", target.x, target.y - 80, "#d9f8ff", 400);
      target.destroy();
      window.__NINJA_QA.zoneHitCount += 1;
      this._updateZoneHud();
      if (this.zoneVisualSystem) {
        this.zoneVisualSystem.reactHit(Boolean(target.__zoneFinisher));
        window.__NINJA_QA.zoneWorldReactLevel += 1;
        if (hitIndex === 2) this.zoneVisualSystem.anticipateRelease();
      }
      if (![5, 10, 20, 30].includes(this.zoneSystem.chain)) {
        this.tweens.killTweensOf(this.zoneStatusText);
        this.zoneStatusText.setScale(1.055);
        this.tweens.add({ targets: this.zoneStatusText, scale: 1,
          duration: 135, ease: "Quad.easeOut" });
      }
      if ([5, 10, 20, 30].includes(this.zoneSystem.chain)) this._pulseZoneChain();
    }

    _enterZone(officialTransition) {
      if (!this.zoneSystem.enter()) return;
      if (window.ninjaBGM) window.ninjaBGM.zone(this.bgmSession, true);
      if (!officialTransition) this._disableProgress("forced_zone");
      if (this.progressManager) this.progressManager.pauseEncounter();
      this.zoneStartedAt = this.time.now;
      this.zoneSymbolBag = [];
      this.zoneEndBuildHits = 0;
      this.zoneEndBuildLevel = 0;
      const qa = window.__NINJA_QA;
      qa.zoneFinisherTriggered = false;
      qa.zoneFinisherSpawned = false;
      qa.zoneFinisherCards = 0;
      qa.zoneFinisherSuccess = false;
      qa.zoneEndBuildTriggered = false;
      qa.zoneEndBuildMaxLevel = 0;
      qa.zoneSwipeDeferred = !this.slashSystem.active;
      this.spawnSystem.clear(120);
      this.slashSystem.setEnabled(false);
      this.missionHeader.setText("ZONE");
      this.missionHeader.setVisible(true);
      this.promptText.setPosition(683,76).setLineSpacing(0).setFontSize(38).setText("ぜんぶ きれ！");
      this.zoneVisualSystem = new NinjaCore.ZoneVisualSystem(this, window.__NINJA_REDUCED_MOTION);
      this.zoneVisualSystem.enter();
      this._updateZoneHud();
      MapSymbolNinja.UI.announce("ZONE！ ぜんぶ切ろう！");
    }

    _startZonePlay() {
      this.zoneSpawnSystem.start();
      this.slashSystem.setZoneVisual(true);
      this.slashSystem.setEnabled(true);
      this._updateZoneHud();
    }

    _endZonePlay() {
      if (window.ninjaBGM) window.ninjaBGM.zone(this.bgmSession, false);
      this.slashSystem.setEnabled(false);
      this.slashSystem.setZoneVisual(false);
      this.zoneSpawnSystem.cancel();
      this.spawnSystem.clear(130);
      if (this.zoneVisualSystem) this.zoneVisualSystem.exit();
      this._setMissionPrompt();
      this._updateZoneHud();
    }

    _resumeNormalPlay(pausedMs) {
      if (this.progressManager) this.progressManager.resumeEncounter();
      if (Number.isFinite(this.comboSystem.lastCorrectAt)) {
        this.comboSystem.lastCorrectAt += Math.max(pausedMs, this.time.now - this.zoneStartedAt);
      }
      this.slashSystem.setEnabled(true);
      this._updateZoneHud();
    }

    _updateZoneHud() {
      if (!this.zoneGauge) return;
      const z = this.zoneSystem;
      const active = z.state !== "normal";
      this.zoneGauge.clear();
      this.zoneGauge.fillStyle(0x071b31, .86);
      this.zoneGauge.fillRoundedRect(453, 124, 460, 20, 10);
      const filledWidth = (active ? 1 : z.points / z.required) * 452;
      if (filledWidth > 0) {
        this.zoneGauge.fillStyle(active ? 0x9feaff : 0x4bc6ff, .95);
        this.zoneGauge.fillRoundedRect(457, 128, filledWidth, 12, 6);
      }
      this.zoneGaugeText.setText(active
        ? "ZONE  " + (z.remainingMs / 1000).toFixed(1) + "秒"
        : "ZONE  " + z.points + " / " + z.required);
      this.zoneStatusText.setText(active ? "ZONE CHAIN " + z.chain + "   ｜   CUTS " + z.cuts : "");
      this.zoneGaugeText.setColor(active ? "#fff0c6" : "#d5f3ff");
      this.zoneStatusText.setColor(active && (z.remainingMs <= 1000 || this.time.now < this.zoneChainHighlightUntil)
        ? "#fff1c8" : "#d8f6ff");
      if (this.zoneVisualSystem) this.zoneVisualSystem.setLate(z.state === "active" && z.remainingMs <= 1000);
      if (z.state === "active" && z.remainingMs <= NINJA_CONFIG.ZONE_END_BUILDUP_START_MS) {
        const progress = 1 - z.remainingMs / NINJA_CONFIG.ZONE_END_BUILDUP_START_MS;
        this.zoneEndBuildLevel = Math.min(1,
          .08 + .22 * progress + .19 * Math.min(3, this.zoneEndBuildHits) +
          (window.__NINJA_QA.zoneFinisherSuccess ? .1 : 0));
        if (this.zoneVisualSystem) this.zoneVisualSystem.setEndBuild(this.zoneEndBuildLevel);
        window.__NINJA_QA.zoneEndBuildTriggered = true;
        window.__NINJA_QA.zoneEndBuildMaxLevel = Math.max(
          window.__NINJA_QA.zoneEndBuildMaxLevel, this.zoneEndBuildLevel);
      }
      const qa = window.__NINJA_QA;
      Object.assign(qa, {
        zoneState: z.state, zonePoints: z.points, zoneRequiredPoints: z.required,
        zoneRemainingMs: Math.round(z.remainingMs), zoneActiveCards: active ? this.spawnSystem.getActive().length : 0,
        zoneWave: active ? this.zoneSpawnSystem.wave : 0, zoneCuts: z.cuts,
        zoneChain: z.chain, zoneMaxChain: z.maxChain, zoneOneStrokeCount: z.oneStrokeCount,
        zoneEnterCount: z.enterCount, zoneExitCount: z.exitCount,
        zoneNormalPaused: z.isPaused(), activeObjects: this.spawnSystem.getActive().length,
        remainingSeconds: this.roundSystem.getSeconds()
      });
      if (active) qa.zoneMaxObservedCards = Math.max(qa.zoneMaxObservedCards, qa.zoneActiveCards);
      qa.zoneLateVisual = z.state === "active" && z.remainingMs <= 1000;
    }

    _pulseZoneChain() {
      const text = this.zoneStatusText;
      if (!text || !text.active) return;
      this.tweens.killTweensOf(text);
      this.zoneChainHighlightUntil = this.time.now + 280;
      const chain = this.zoneSystem.chain;
      text.setScale(chain >= 30 ? 1.20 : chain >= 20 ? 1.16 : chain >= 10 ? 1.13 : 1.10)
        .setColor("#fff0b8");
      this.tweens.add({ targets: text, scale: 1, duration: 240, ease: "Quad.easeOut" });
      window.__NINJA_QA.zoneChainMilestoneCount += 1;
    }

    _createSymbolEffect(effect, x, y) {
      switch (effect) {
        case "policeFlash":
          this._ringBurst(x, y, 0x78d9ff);
          this._dotBurst(x, y, 10, [0x66c9ff, 0xeafaff], "circle");
          break;
        case "waterSplash":
          this._dotBurst(x, y, 12, [0x4dc9ff, 0xa8eeff, 0x268fd3], "water");
          break;
        case "hospitalGlow":
          this._ringBurst(x, y, 0xfff6cf);
          this._dotBurst(x, y, 9, [0xffffff, 0xffefaf], "circle");
          break;
        case "postalPaper":
          this._dotBurst(x, y, 9, [0xfff2c9, 0xe7c47a, 0xffffff], "paper");
          break;
        case "schoolSakura":
          this._dotBurst(x, y, 11, [0xffb7ce, 0xffd6e3, 0xffffff], "petal");
          break;
        default:
          this._dotBurst(x, y, 8, [0xffffff, 0x8edfff], "circle");
          break;
      }
    }

    _dotBurst(x, y, count, colors, shape) {
      const actualCount = Math.min(window.__NINJA_REDUCED_MOTION ? 6 : 12, count);
      for (let i = 0; i < actualCount; i += 1) {
        const color = colors[i % colors.length];
        let particle;
        if (shape === "paper") {
          particle = this.add.rectangle(x, y, 15, 10, color, 0.96).setAngle(Phaser.Math.Between(-25, 25));
        } else if (shape === "petal") {
          particle = this.add.ellipse(x, y, 12, 7, color, 0.96).setAngle(Phaser.Math.Between(-60, 60));
        } else if (shape === "water") {
          particle = this.add.ellipse(x, y, 8, 17, color, 0.92).setAngle(Phaser.Math.Between(-70, 70));
        } else {
          particle = this.add.circle(x, y, Phaser.Math.Between(3, 7), color, 0.94);
        }
        particle.setDepth(190);
        const angle = Phaser.Math.FloatBetween(-Math.PI * 0.92, -Math.PI * 0.08);
        const distance = Phaser.Math.Between(48, 118);
        const targetX = x + Math.cos(angle) * distance;
        const targetY = y + Math.sin(angle) * distance + Phaser.Math.Between(12, 68);
        this.tweens.add({
          targets: particle,
          x: targetX,
          y: targetY,
          angle: particle.angle + Phaser.Math.Between(-100, 100),
          alpha: 0,
          scale: 0.45,
          duration: window.__NINJA_REDUCED_MOTION ? 320 : Phaser.Math.Between(430, 650),
          ease: "Quad.easeOut",
          onComplete: () => particle.destroy()
        });
      }
    }

    _ringBurst(x, y, color) {
      const ring = this.add.circle(x, y, 32, color, 0).setStrokeStyle(5, color, 0.85).setDepth(185);
      this.tweens.add({ targets: ring, scale: 2.3, alpha: 0, duration: window.__NINJA_REDUCED_MOTION ? 260 : 430, onComplete: () => ring.destroy() });
    }

    _showWrongEffect(x, y) {
      for (let i = 0; i < (window.__NINJA_REDUCED_MOTION ? 4 : 7); i += 1) {
        const spark = this.add.rectangle(x, y, Phaser.Math.Between(10, 18), 3, 0xffbf66, 0.95).setDepth(195).setAngle(Phaser.Math.Between(0, 180));
        this.tweens.add({
          targets: spark,
          x: x + Phaser.Math.Between(-55, 55),
          y: y + Phaser.Math.Between(-48, 48),
          alpha: 0,
          duration: 220,
          onComplete: () => spark.destroy()
        });
      }
    }

    _showFeedback(message, x, y, color, duration) {
      const label = this.add.text(x, y, message, {
        fontFamily: MapSymbolNinja.UI.fontFamily,
        fontSize: "25px",
        fontStyle: "bold",
        color,
        stroke: "#06101e",
        strokeThickness: 6,
        align: "center"
      }).setOrigin(0.5).setDepth(400);
      this.feedbackObjects.add(label);
      this.tweens.add({
        targets: label,
        y: y - 34,
        alpha: 0,
        duration,
        ease: "Quad.easeOut",
        onComplete: () => {
          this.feedbackObjects.delete(label);
          label.destroy();
        }
      });
    }

    _showCritical(x, y, swipeAngle, cardColor, zoneActive, officialHit) {
      if (!officialHit) this._disableProgress("forced_critical");
      // 記号名のフィードバックと重ならないよう、札の横・少し上へ置く。
      if (!this.hitLabels || !this.hitLabels.presentCritical({
        x: x + (x > 1010 ? -150 : 150), y: y - 90, swipeAngle, cardColor,
        zoneActive, reducedMotion: window.__NINJA_REDUCED_MOTION
      })) return;
      window.__NINJA_QA.criticalLabelCount += 1;
    }

    _showIssen(swipe, hitCount, zoneActive, subtitle, officialHit) {
      if (!officialHit) this._disableProgress("forced_issen");
      const points = swipe.points || [];
      const first = points[0], last = points[points.length - 1];
      const angle = first && last ? Math.atan2(last.y - first.y, last.x - first.x) : 0;
      if (!this.hitLabels || !this.hitLabels.presentIssen({
        x: 683, y: 265, swipeAngle: angle, hitCount, zoneActive,
        finisher: zoneActive && Boolean(window.__NINJA_QA.zoneFinisherSuccess),
        subtitle, reducedMotion: window.__NINJA_REDUCED_MOTION
      })) return;
      window.__NINJA_QA.issenLabelCount += 1;
    }

    _showCenterCallout(message, color, duration) {
      const text = this.add.text(NINJA_CONFIG.WIDTH / 2, 205, message, {
        fontFamily: MapSymbolNinja.UI.fontFamily,
        fontSize: "47px",
        fontStyle: "bold",
        color,
        stroke: "#06101e",
        strokeThickness: 10
      }).setOrigin(0.5).setDepth(650).setScale(0.76);
      this.tweens.add({
        targets: text,
        scale: 1.08,
        alpha: { from: 1, to: 0 },
        y: 184,
        duration,
        ease: "Back.easeOut",
        onComplete: () => text.destroy()
      });
    }

    _showComboMilestone(type) {
      if (type === "spark") {
        const glow = this.add.circle(1218, 65, 32, 0x76d9ff, 0.16).setDepth(MapSymbolNinja.Depth.HUD + 5);
        this.tweens.add({ targets: glow, scale: 2.2, alpha: 0, duration: 360, onComplete: () => glow.destroy() });
      } else if (type === "good") {
        this._showCenterCallout("好調！", "#fff0a8", 640);
      } else if (type === "awaken") {
        this._showCenterCallout("忍者覚醒！", "#8ce8ff", 880);
        const aura = this.add.circle(NINJA_CONFIG.WIDTH / 2, 370, 80, 0x48bfff, 0.10).setDepth(2);
        this.tweens.add({ targets: aura, scale: 4.8, alpha: 0, duration: 700, onComplete: () => aura.destroy() });
      }
    }

    _updateScoreHud() {
      this.scoreText.setText(this.score.toLocaleString("ja-JP") + " 点");
    }

    _updateComboHud() {
      this.comboText.setText(this.comboSystem.combo + " COMBO");
      this.comboText.setColor(this.comboSystem.combo >= 10 ? "#fff09a" : this.comboSystem.combo >= 5 ? "#91eeff" : "#bfeaff");
    }

    _endGame() {
      if (this.gamePhase !== MapSymbolNinja.GamePhase.PLAYING || this.ending) return;
      if (window.ninjaBGM && this.bgmSession) {
        window.ninjaBGM.complete(this.bgmSession, this.naturalRoundEnd);
        window.ninjaBGM.end(this.bgmSession);
      }
      if (this.roundSystem.remainingMs > 0) this._disableProgress("forced_game_end");
      if (this.progressManager) this.progressManager.finalizeEncounter("game_end");
      this.ending = true;
      this.scoringLocked = true;
      this.transitionLock = true;
      this._setPhase(MapSymbolNinja.GamePhase.ENDING);
      // 入力を無効化する前に結果を固定。pointerupの一閃ボーナスも追加しない。
      const result = this.roundSystem.finish({
        score: this.score,
        correctCount: this.correctCount,
        wrongCount: this.wrongCount,
        maxCombo: this.comboSystem.maxCombo,
        oneStrokeCount: this.comboSystem.oneStrokeCount
      });
      Object.assign(result, {
        rank: this.rank, stage: this.stage,
        progressEnabled: Boolean(this.progressEnabled && this.progressManager && this.progressManager.progressEnabled),
        criticalCount: window.__NINJA_QA.criticalCount,
        zoneEnterCount: this.zoneSystem.enterCount,
        zoneCuts: this.zoneSystem.cuts,
        zoneMaxChain: this.zoneSystem.maxChain,
        zoneOneStrokeCount: this.zoneSystem.oneStrokeCount
      });
      this.finishSnapshot = Object.freeze(result);
      const run = this.economyRun;
      const progressSettlement = this.progressManager ? this.progressManager.whenSaved() : Promise.resolve(false);
      this.rewardSettlement = (MapSymbolNinja.economy ? MapSymbolNinja.economy.finishRun(run, result.score,
        this.naturalRoundEnd && result.progressEnabled) : Promise.resolve({ status: "ineligible", amount: 0 }))
        .then(async koban => {
          await progressSettlement;
          const snapshot = Object.freeze(Object.assign({}, result, { runId: run && run.id, koban: Object.freeze(koban) }));
          if (this.economyRun === run) { this.finishSnapshot = snapshot; window.__NINJA_QA.lastResult = Object.assign({}, snapshot); }
          return snapshot;
        });
      window.__NINJA_QA.lastResult = Object.assign({}, result);
      window.__NINJA_QA.gameEndCount = (window.__NINJA_QA.gameEndCount || 0) + 1;
      window.__NINJA_QA.remainingSeconds = 0;
      this.timerText.setText("のこり  0");
      this.missionHeader.setText("おつかれさま！");
      this.promptText.setFontSize(38).setText("しゅぎょう おわり！");
      this.waveSystem.cancel();
      this.zoneSpawnSystem.cancel();
      window.__NINJA_QA.pendingSpawnCount = 0;
      window.__NINJA_QA.currentWave = 0;
      window.__NINJA_QA.drainState = "ended";
      this.spawnSystem.clear(180);
      this.slashSystem.setEnabled(false);
      window.ninjaAudio.play("finish");
      MapSymbolNinja.UI.announce("修行終了です。結果を表示します。");

      window.__NINJA_QA.activeObjects = 0;
      this._flowLater(260, () => {
        this.cameras.main.fadeOut(280, 0, 0, 0);
        this._flowLater(280, () => {
          Promise.resolve(this.rewardSettlement).then(snapshot => {
            if (this.economyRun === run && this.scene.isActive()) this.scene.start("ResultScene", Object.assign({}, snapshot));
          });
        });
      });
    }

    _disableProgress(reason) {
      if (MapSymbolNinja.economy && this.economyRun) MapSymbolNinja.economy.cancelRun(this.economyRun);
      this.progressEnabled = false;
      if (this.progressManager) this.progressManager.invalidateSession(reason);
    }

    _shutdown() {
      if (window.ninjaBGM && this.bgmSession) window.ninjaBGM.end(this.bgmSession);
      this.bgmSession = null;
      if (this.bgmUnsubscribe) this.bgmUnsubscribe();
      this.bgmUnsubscribe = null;
      this.events.off("pause", this.onBGMPause); this.events.off("sleep", this.onBGMPause);
      this.events.off("resume", this.onBGMResume); this.events.off("wake", this.onBGMResume);
      if (MapSymbolNinja.economy && this.economyRun) MapSymbolNinja.economy.cancelRun(this.economyRun);
      this.economyRun = null;
      if (window.ninjaAudio.stopAttributeSounds) window.ninjaAudio.stopAttributeSounds();
      if (this.progressManager) this.progressManager.cancelEncounter("shutdown");
      this.progressManager = null;
      if (this.targetDeck) this.targetDeck.destroy();
      this.targetDeck = null;
      this.progressEnabled = false;
      this.scoringLocked = true;
      this.ending = true;
      this.gamePhase = MapSymbolNinja.GamePhase.ENDING;
      for (const timer of this.flowTimers || []) timer.remove(false);
      if (this.flowTimers) this.flowTimers.clear();
      if (this.countdownLabel && this.countdownLabel.active) {
        this.tweens.killTweensOf(this.countdownLabel);
        this.countdownLabel.destroy();
      }
      this.countdownLabel = null;
      if (window.ninjaAudio && typeof window.ninjaAudio.endSwipe === "function") {
        window.ninjaAudio.endSwipe();
      }
      if (this.slashSystem) {
        this.slashSystem.destroy();
        this.slashSystem = null;
      }
      if (this.spawnSystem) {
        this.spawnSystem.destroy();
        this.spawnSystem = null;
      }
      if (this.waveSystem) {
        this.waveSystem.destroy();
        this.waveSystem = null;
      }
      if (this.zoneSpawnSystem) { this.zoneSpawnSystem.destroy(); this.zoneSpawnSystem = null; }
      if (this.cutEffectSystem) {
        this.cutEffectSystem.destroy();
        this.cutEffectSystem = null;
      }
      if (this.slashTraceSystem) {
        this.slashTraceSystem.destroy();
        this.slashTraceSystem = null;
      }
      if (this.zoneVisualSystem) {
        this.zoneVisualSystem.destroy();
        this.zoneVisualSystem = null;
      }
      if (this.hitLabels) { this.hitLabels.destroy(); this.hitLabels = null; }
      if (this.hitStopSystem) {
        this.hitStopSystem.destroy();
        this.hitStopSystem = null;
      }
      this.hitStopActive = false;
      this.roundSystem = null;
      for (const object of this.feedbackObjects || []) {
        if (object && object.active) object.destroy();
      }
      if (this.feedbackObjects) this.feedbackObjects.clear();
      for (const object of this.questionNoticeObjects || []) {
        if (object && object.active) object.destroy(true);
      }
      if (this.questionNoticeObjects) this.questionNoticeObjects.clear();
      this.comboSystem = null;
      this.zoneSystem = null;
      this.gameModel = null;
      this.cardPalette = null;
      this.currentQuestion = null;
      this.zoneSymbolBag = [];
      this.finishSnapshot = null;
      this.tuning = null;
      for (const key of ["missionFrame", "missionHeader", "promptText", "timerText", "comboText",
        "scoreText", "zoneGauge", "zoneGaugeText", "zoneStatusText"]) this[key] = null;
      Object.assign(window.__NINJA_QA, { activeObjects: 0, pendingSpawnCount: 0,
        activeImpactObjects: 0, slashTraceCount: 0, inkSplatterCount: 0, mistCount: 0 });
      window.__NINJA_QA.gameShutdownCount = (window.__NINJA_QA.gameShutdownCount || 0) + 1;
    }
  }

  window.MapSymbolNinja.GameScene = GameScene;
})();
