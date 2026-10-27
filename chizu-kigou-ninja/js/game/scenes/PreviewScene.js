(function () {
  "use strict";
  window.MapSymbolNinja = window.MapSymbolNinja || {};

  // 本編と同じCutEffectSystem / ZoneVisualSystemで比較し、記録・ゲージには触れない。
  class PreviewScene extends Phaser.Scene {
    constructor() { super({ key: "PreviewScene" }); }
    init(data) {
      this.variant = data && data.variant || "normal";
      this.previewColorIndex = 0;
      this.zoneBurstPreset = "standard";
      this.vfxOptions = Object.assign({}, MapSymbolNinja.DevSettings.forGame().vfx, data && data.vfx);
      this.previewReducedMotion = typeof (data && data.reducedMotion) === "boolean" ? data.reducedMotion : Boolean(window.__NINJA_REDUCED_MOTION);
      this.statsElapsed = 0;
    }
    create() {
      const UI = MapSymbolNinja.UI;
      window.__NINJA_QA.currentScene = "preview";
      window.__NINJA_QA.previewVariant = this.variant;
      window.__NINJA_QA.latestPreviewAt = 0;
      window.__NINJA_QA.previewHitIndex = 0;
      window.__NINJA_QA.previewReleaseAt = 0;
      UI.drawBackground(this, { dim: .04 });
      this.add.text(683, 92, "演出確認", { fontFamily: UI.fontFamily, fontSize: "45px",
        fontStyle: "bold", color: "#fff5d8" }).setOrigin(.5);
      const descriptions = {
        normal: "通常斬撃", critical: "会心", issen: "一閃", compare_labels: "会心・一閃 比較",
        zone_enter: "ZONE 突入", zone_normal: "ZONE 通常斬撃", zone_issen: "ZONE 一閃",
        zone_critical: "ZONE 会心",
        zone_finish: "ZONE 終盤の締め", zone_world: "ZONE 世界の出入り"
      };
      this.add.text(683, 157, descriptions[this.variant] || "通常斬撃", {
        fontFamily: UI.fontFamily, fontSize: "31px", color: "#d5f3ff"
      }).setOrigin(.5).setVisible(this.variant !== "zone_enter");
      this.add.text(683, 208, "同じ札と斬撃角度で見比べられます。得点・記録は増えません。", {
        fontFamily: UI.fontFamily, fontSize: "20px", color: "#c2d5e4"
      }).setOrigin(.5).setVisible(this.variant !== "zone_enter");
      this.zone = this.variant.startsWith("zone_");
      this.zoneVisualSystem = new NinjaCore.ZoneVisualSystem(this, this.previewReducedMotion);
      if (this.zone) this.zoneVisualSystem.activate();
      if (this.variant === "zone_finish") this.zoneVisualSystem.setEndBuild(.78);
      this.cutOptions = {
        reducedMotion: this.previewReducedMotion,
        separationForce: NINJA_CONFIG.CUT_SEPARATION_FORCE,
        rotationMin: NINJA_CONFIG.CUT_ROTATION_MIN,
        rotationMax: NINJA_CONFIG.CUT_ROTATION_MAX,
        hitFlashMs: NINJA_CONFIG.HIT_FLASH_MS,
        hitRingMs: NINJA_CONFIG.HIT_RING_MS,
        baseSparkCount: NINJA_CONFIG.HIT_SPARK_COUNT,
        hitRingRadii: [41, 44, 47, 52], maxSparkCount: NINJA_CONFIG.HIT_SPARK_MAX,
        sparkSpeedBonusMax: NINJA_CONFIG.HIT_SPARK_SPEED_BONUS_MAX,
        maxHitSparks: NINJA_CONFIG.MAX_HIT_SPARKS,
        sparkVelocityBonus: NINJA_CONFIG.HIT_SPARK_VELOCITY_BONUS,
        flashSpeedBonus: NINJA_CONFIG.HIT_FLASH_SPEED_BONUS,
        maxImpactObjects: NINJA_CONFIG.MAX_IMPACT_OBJECTS,
        cutGlowDuration: NINJA_CONFIG.CUT_GLOW_DURATION_MS,
        cutGlowOuterWidth: NINJA_CONFIG.CUT_GLOW_OUTER_WIDTH,
        cutGlowMiddleWidth: NINJA_CONFIG.CUT_GLOW_MIDDLE_WIDTH,
        cutGlowCoreWidth: NINJA_CONFIG.CUT_GLOW_CORE_WIDTH
      };
      this.cutSystem = new NinjaCore.CutEffectSystem(this, this.cutOptions);
      this._createHitLabels();
      this.traceSystem = new NinjaCore.SlashTraceSystem(this, {
        vfx: this.vfxOptions,
        reducedMotion: this.previewReducedMotion,
        zoneBurstPreset: this.zoneBurstPreset,
        maxTrace: NINJA_CONFIG.SLASH_TRACE_MAX_ACTIVE,
        onState: (state) => {
          window.__NINJA_QA.previewTraceCount = state.active.trace;
          window.__NINJA_QA.previewInkCount = state.active.ink;
          window.__NINJA_QA.previewMistCount = state.active.mist;
          window.__NINJA_QA.previewHeavyDropletCount = state.active.droplet;
          window.__NINJA_QA.previewColorMistCount = state.colorMist.active;
          window.__NINJA_QA.previewColorMistPeak = state.colorMist.peak;
          window.__NINJA_QA.previewOmniHeavyCount = state.lastOmniHeavyCount;
          window.__NINJA_QA.previewOmniMistCount = state.lastOmniMistCount;
          window.__NINJA_QA.previewShakeCount = state.impact.shakeCount;
          window.__NINJA_QA.previewShakeType = state.impact.lastShake && state.impact.lastShake.kind;
          window.__NINJA_QA.previewBurstAccent = state.impact.lastAccent;
          window.__NINJA_QA.previewZoneBurstLast = state.zoneBurst.last;
          window.__NINJA_QA.previewZoneWaveCount = state.zoneBurst.waves.length;
          window.__NINJA_QA.previewZoneWaves = state.zoneBurst.waves;
          window.__NINJA_QA.previewMaterialFallbackCount = state.materialFallbackCount;
          window.__NINJA_QA.previewSplashCount = state.total.ink;
          window.__NINJA_QA.previewDropletCount = state.total.droplet;
          window.__NINJA_QA.previewSplashDelayMs = state.lastSplashDelayMs;
          window.__NINJA_QA.previewMainPushDistance = state.lastMainPushDistance;
          window.__NINJA_QA.previewMainExpandTo = state.lastMainExpandTo;
          window.__NINJA_QA.previewDropletTravelPx = state.lastDropletTravelPx;
          window.__NINJA_QA.previewDropletFanDeg = state.lastDropletFanDeg;
        }
      });
      this.colorButton = UI.createButton(this, 683, 594, 278, 51,
        "札色：" + MapSymbolNinja.CardPalette.COLORS[0].name + "　↻", () => {
          this.previewColorIndex = (this.previewColorIndex + 1) % MapSymbolNinja.CardPalette.COLORS.length;
          this.colorButton.setLabel("札色：" + MapSymbolNinja.CardPalette.COLORS[this.previewColorIndex].name + "　↻");
          this._play();
        }, { fontSize: 21, fill: 0x245476, hoverFill: 0x2f6f99 });
      this._createVfxControls();
      if (this.variant === "zone_issen" || this.variant === "zone_finish") {
        const names = { previous: "前版", standard: "標準", reference: "参考版級" };
        const order = ["previous", "standard", "reference"];
        this.zonePresetButton = UI.createButton(this, 1100, 594, 290, 51,
          "飛沫：" + names[this.zoneBurstPreset] + "　↻", () => {
            this.zoneBurstPreset = order[(order.indexOf(this.zoneBurstPreset) + 1) % order.length];
            this.zonePresetButton.setLabel("飛沫：" + names[this.zoneBurstPreset] + "　↻");
            this.traceSystem.zoneBurstPreset = this.zoneBurstPreset;
            this._play();
          }, { fontSize: 21, fill: 0x245476, hoverFill: 0x2f6f99 });
      }
      UI.createButton(this, 533, 677, 275, 65, "もう一度見る", () => this._play(), { fontSize: 25 });
      UI.createButton(this, 829, 677, 275, 65, "調整へ戻る", () => {
        window.__NINJA_OPEN_DEV_PANEL = true;
        this.scene.start("TitleScene");
      }, { fontSize: 25, fill: 0x245476, hoverFill: 0x2f6f99 });
      this.events.once("shutdown", () => {
        this.cutSystem.destroy(); this.traceSystem.destroy(); this.zoneVisualSystem.destroy();
        this.hitLabels.destroy();
        if (this.compareLabels) this.compareLabels.destroy();
      });
      this.time.delayedCall(400, () => this._play());
    }
    _play() {
      const qa = window.__NINJA_QA;
      const playToken = this.previewPlayToken = (this.previewPlayToken || 0) + 1;
      qa.previewHitIndex = 0;
      qa.latestPreviewAt = 0;
      qa.previewReleaseAt = 0;
      qa.previewZoneBurstPreset = this.zoneBurstPreset;
      qa.previewZoneBurstLast = null;
      qa.previewZoneWaveCount = 0;
      qa.previewRing1At = 0;
      qa.previewRing2At = 0;
      this.hitLabels.reset();
      if (this.compareLabels) { this.compareLabels.destroy(); this.compareLabels = null; }
      if (this.previewObjects && this.previewObjects.length) {
        this.cutSystem.destroy();
        this.cutSystem = new NinjaCore.CutEffectSystem(this, this.cutOptions);
        this.traceSystem.destroy();
        this.traceSystem = new NinjaCore.SlashTraceSystem(this, {
          vfx: this.vfxOptions,
          reducedMotion: this.previewReducedMotion,
          zoneBurstPreset: this.zoneBurstPreset, maxTrace: NINJA_CONFIG.SLASH_TRACE_MAX_ACTIVE,
          onState: (state) => {
            qa.previewTraceCount = state.active.trace;
            qa.previewInkCount = state.active.ink;
            qa.previewMistCount = state.active.mist;
            qa.previewHeavyDropletCount = state.active.droplet;
            qa.previewColorMistCount = state.colorMist.active;
            qa.previewColorMistPeak = state.colorMist.peak;
            qa.previewOmniHeavyCount = state.lastOmniHeavyCount;
            qa.previewOmniMistCount = state.lastOmniMistCount;
            qa.previewShakeCount = state.impact.shakeCount;
            qa.previewShakeType = state.impact.lastShake && state.impact.lastShake.kind;
            qa.previewBurstAccent = state.impact.lastAccent;
            qa.previewZoneBurstLast = state.zoneBurst.last;
            qa.previewZoneWaveCount = state.zoneBurst.waves.length;
            qa.previewZoneWaves = state.zoneBurst.waves;
            qa.previewMaterialFallbackCount = state.materialFallbackCount;
            qa.previewSplashCount = state.total.ink;
            qa.previewDropletCount = state.total.droplet;
            qa.previewSplashDelayMs = state.lastSplashDelayMs;
            qa.previewMainPushDistance = state.lastMainPushDistance;
            qa.previewMainExpandTo = state.lastMainExpandTo;
            qa.previewDropletTravelPx = state.lastDropletTravelPx;
            qa.previewDropletFanDeg = state.lastDropletFanDeg;
          }
        });
      }
      if (this.previewObjects) {
        for (const object of this.previewObjects) {
          if (object && object.active) { this.tweens.killTweensOf(object); object.destroy(); }
        }
      }
      this.previewObjects = [];
      const group = this.previewObjects;
      this.traceSystem.beginSwipe();
      if (this.variant === "compare_labels") {
        for (const x of [400, 965]) {
          const key = "card_police" + (NINJA_CONFIG.CARD_COLOR_ENABLED ? "_blue" : "");
          group.push(this.add.image(x, 440, key).setDisplaySize(138, 138).setDepth(50));
        }
        this.compareLabels = new NinjaCore.SpecialHitPresentationSystem(this, {
          reducedMotion: this.previewReducedMotion,
          tuning: MapSymbolNinja.DevSettings.forGame().special,
          onState: (state) => { qa.previewCompareLabelState = state; }
        });
        this.hitLabels.presentCritical({ x: 400, y: 310, swipeAngle: -.21 });
        this.compareLabels.presentIssen({ x: 965, y: 310, swipeAngle: -.21, hitCount: 3 });
        qa.previewHitIndex = 2;
        qa.latestPreviewAt = performance.now();
        return;
      }
      if (this.variant === "zone_world") {
        // 同じシステムで突入→継続→終盤→終了を確認。リプレイ時は旧Tweenを破棄。
        this.zoneVisualSystem.destroy();
        this.zoneVisualSystem = new NinjaCore.ZoneVisualSystem(this, this.previewReducedMotion);
        this.zoneVisualSystem.enter();
        qa.latestPreviewAt = performance.now();
        this.time.delayedCall(1750, () => {
          if (this.previewPlayToken !== playToken) return;
          this.zoneVisualSystem.setLate(true);
          this.zoneVisualSystem.setEndBuild(.85);
        });
        this.time.delayedCall(2850, () => {
          if (this.previewPlayToken === playToken) this.zoneVisualSystem.exit();
        });
        return;
      }
      if (this.variant === "zone_enter") {
        this.zoneVisualSystem.enter();
        qa.latestPreviewAt = performance.now();
        return;
      }
      const multiple = this.variant === "issen" || this.variant === "zone_issen" || this.variant === "zone_finish";
      if (this.variant === "zone_finish") {
        this.zoneVisualSystem.setEndBuild(.78);
        qa.previewEndBuildLevel = .78;
      }
      const centers = multiple ? [480, 683, 886] : [683];
      const at = (x) => ({ x, y: 410 - (x - 683) * .215 });
      const cards = centers.map((x, index) => {
        const center = at(x);
        const color = MapSymbolNinja.CardPalette.COLORS[
          (this.previewColorIndex + index) % MapSymbolNinja.CardPalette.COLORS.length];
        const key = "card_police" + (NINJA_CONFIG.CARD_COLOR_ENABLED ? "_" + color.id : "");
        const card = this.add.image(center.x, center.y, key)
          .setDisplaySize(138, 138).setDepth(50);
        card.cardColor = NINJA_CONFIG.CARD_COLOR_ENABLED ? color.value : 0xd8e5e3;
        card.cardColorId = NINJA_CONFIG.CARD_COLOR_ENABLED ? color.id : "neutral";
        group.push(card);
        return card;
      });
      const critical = this.variant === "critical" || this.variant === "zone_critical";
      const slash = this.add.graphics().setDepth(900);
      group.push(slash);
      // 中心札の位置・角度を固定。複数斬りは一つの線上に3枚を配置する。
      const first = at(centers[0] - 125);
      const last = at(centers[centers.length - 1] + 125);
      this.time.delayedCall(40, () => {
        if (this.previewPlayToken !== playToken) return;
        cards.forEach((card, index) => {
          this.time.delayedCall(index * 45, () => {
            if (this.previewPlayToken !== playToken) return;
            if (!card || !card.active) return;
            const center = at(centers[index]);
            const from = at(centers[index] - 125);
            const to = at(centers[index] + 125);
            const report = this.cutSystem.split(card, { from, to,
              vector: { x: to.x - from.x, y: to.y - from.y }, hitPoint: center }, {
              textureWidth: 180, textureHeight: 180,
              flight: { vx: 0, vy: -170 }, combo: multiple ? index + 1 : 1,
              speedIntensity: .7, critical: critical && !this.zone, zone: this.zone,
              multiHit: multiple && index >= 1,
              criticalGlowBonus: NINJA_CONFIG.CRITICAL_GLOW_BONUS,
              criticalSparkBonus: NINJA_CONFIG.CRITICAL_SPARK_BONUS,
              deferMovement: true
            });
            if (!report) return;
            this.traceSystem.hit(report, this.variant === "zone_finish" ? .78 : 0,
              this.variant === "zone_finish" && index === cards.length - 1, card.cardColor);
            qa.previewCardColor = card.cardColorId;
            qa.lastSplashColor = card.cardColor;
            card.destroy();
            if (index === 0) {
              // 実ゲームと同じ古→新の視覚テーパー。ここもHit判定は行わない。
              for (let step = 0; step < 16; step += 1) {
                const t0 = step / 16, t1 = (step + 1) / 16;
                const a = { x: first.x + (last.x - first.x) * t0,
                  y: first.y + (last.y - first.y) * t0 };
                const b = { x: first.x + (last.x - first.x) * t1,
                  y: first.y + (last.y - first.y) * t1 };
                const taper = .5 + .5 * t1;
                slash.lineStyle((this.zone ? 24 : 15) * taper, 0x3ba8ff, .11 + .23 * t1);
                slash.lineBetween(a.x, a.y, b.x, b.y);
                slash.lineStyle((this.zone ? 10 : 8) * taper, 0xa7e7ff, .25 + .45 * t1);
                slash.lineBetween(a.x, a.y, b.x, b.y);
                slash.lineStyle((this.zone ? 3.8 : 3) * taper, 0xffffff, .47 + .53 * t1);
                slash.lineBetween(a.x, a.y, b.x, b.y);
              }
              this.tweens.add({ targets: slash, alpha: 0, duration: this.zone ? 260 : 220 });
            }
            this.time.delayedCall(this.zone ? 40 : 35, () => {
              if (this.previewPlayToken === playToken) this.cutSystem.releasePendingCuts();
            });
            qa.latestPreviewAt = performance.now();
            qa.previewHitIndex = index + 1;
            qa.lastVisualType = report.visualType;
            qa.previewTiming = report.timing;
            if (this.zone) this.zoneVisualSystem.reactHit(false);
            if (critical && index === 0) this.hitLabels.presentCritical({
              x: 840, y: 312, swipeAngle: -.21, cardColor: card.cardColor,
              zoneActive: this.zone });
            if (this.variant === "zone_issen" && index === 1) this.zoneVisualSystem.anticipateRelease();
            if (multiple && index === cards.length - 1) {
              const delay = this.zone ? NINJA_CONFIG.ZONE_ISSEN_RELEASE_MS : 0;
              this.cutSystem.playIssenFlow([first, last], this.zone, delay);
              this.traceSystem.flow([first, last], this.zone, delay,
                this.variant === "zone_finish" ? .78 : 0, card.cardColor);
              this.time.delayedCall(delay, () => {
                if (this.previewPlayToken !== playToken) return;
                if (this.zone) this.zoneVisualSystem.reactHit(true);
                qa.previewReleaseAt = performance.now();
              });
              this.hitLabels.presentIssen({ x: 683, y: 287, swipeAngle: -.21,
                hitCount: cards.length, zoneActive: this.zone,
                subtitle: this.zone ? "ZONE 一閃！" : "三連斬！" });
            }
            if (index === cards.length - 1) {
              this.traceSystem.endSwipe({ releaseDelayMs:
                multiple && this.zone ? NINJA_CONFIG.ZONE_ISSEN_RELEASE_MS : 0 });
            }
          });
        });
      });
    }
    _createHitLabels() {
      this.hitLabels = new NinjaCore.SpecialHitPresentationSystem(this, {
        reducedMotion: this.previewReducedMotion,
        tuning: MapSymbolNinja.DevSettings.forGame().special,
        onState: (state) => {
          window.__NINJA_QA.previewLabelState = state;
          if (state.phase === "ring1") window.__NINJA_QA.previewRing1At = state.at;
          if (state.phase === "ring2") window.__NINJA_QA.previewRing2At = state.at;
        }
      });
    }
    _createVfxControls() {
      const UI = MapSymbolNinja.UI;
      const control = (x, y, key, names, title) => {
        const order = Object.keys(names);
        const label = () => title + names[this.vfxOptions[key] || order[0]] + " ↻";
        const button = UI.createButton(this, x, y, 278, 48, label(), () => {
          this.vfxOptions[key] = order[(order.indexOf(this.vfxOptions[key]) + 1) % order.length];
          button.setLabel(label()); this._play();
        }, { fontSize: 20, fill: 0x245476, hoverFill: 0x2f6f99 });
      };
      control(285, 531, "mode", { legacy: "従来版", dynamic: "動的版" }, "方式：");
      control(683, 531, "element", { none: "なし", fire: "炎", lightning: "雷", ice: "氷", wind: "風" }, "属性：");
      control(1100, 531, "strength", { weak: "弱", standard: "標準", strong: "強" }, "強度：");
      control(285, 594, "quality", { low: "低負荷", standard: "標準", high: "高品質" }, "品質：");
      this.vfxStats = this.add.text(683, 735, "", { fontFamily: UI.fontFamily, fontSize: "16px", color: "#c2d5e4" }).setOrigin(.5).setDepth(950);
    }
    update(_time, delta) {
      if (this.hitLabels) this.hitLabels.update(delta);
      if (this.compareLabels) this.compareLabels.update(delta);
      if (this.traceSystem) this.traceSystem.update(delta);
      if (this.zoneVisualSystem) this.zoneVisualSystem.update(delta);
      this.statsElapsed += delta;
      if (this.statsElapsed >= 200 && this.traceSystem) {
        this.statsElapsed = 0;
        const state = this.traceSystem.getState(), d = state.dynamic;
        window.__NINJA_QA.previewDynamicVFX = d;
        window.__NINJA_QA.previewVfxMode = state.vfxMode;
        this.vfxStats.setText(state.vfxMode + " / " + (this.previewReducedMotion ? "動きを減らす / " : "") +
          "FPS " + Math.round(this.game.loop.actualFps) + "　粒 " +
          (d ? d.active : state.active.droplet + state.colorMist.active) +
          (d ? " / 上限232　VFX Graphics 3　Texture 0" + (d.pressure ? "　負荷軽減中" : "") : "　従来版"));
      }
    }
  }
  window.MapSymbolNinja.PreviewScene = PreviewScene;
})();
