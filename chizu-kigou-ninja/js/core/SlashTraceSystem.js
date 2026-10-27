(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};

  // 命中後の色飛沫と筆跡。Pointer判定・切断・得点には触れない。
  class SlashTraceSystem {
    constructor(scene, options) {
      this.scene = scene;
      this.reducedMotion = Boolean(options && options.reducedMotion);
      this.vfxMode = options && options.vfx && options.vfx.mode === "dynamic" ? "dynamic" : "legacy";
      this.dynamicVFX = this.vfxMode === "dynamic" || options && options.vfx &&
        ["fire", "lightning", "ice", "wind"].includes(options.vfx.element) ? new NinjaCore.DynamicSlashVFXSystem(scene,
        Object.assign({}, options.vfx, { reducedMotion: this.reducedMotion })) : null;
      this.zoneBurstPreset = options && ["previous", "reference"].includes(options.zoneBurstPreset)
        ? options.zoneBurstPreset : "standard";
      this.onState = options && options.onState;
      this.traces = new Set();
      this.inks = new Set(); // 主飛沫。旧QA名との互換を維持。
      this.droplets = new Set();
      this.mists = new Set();
      this.heavyMotions = new Map();
      this.colorMistParticles = [];
      this.colorMistGraphics = null;
      this.colorMistPeak = 0;
      this.colorMistTotal = 0;
      this.impactBursts = new Set();
      this.impactSwipe = null;
      this.impactSerial = 0;
      this.shakeCount = 0;
      this.shakeSuppressed = 0;
      this.activeShakeUntil = -1;
      this.activeShakeRank = 0;
      this.lastShake = null;
      this.lastAccent = null;
      this.timers = new Set();
      this.peak = { trace: 0, ink: 0, droplet: 0, mist: 0 };
      this.total = { trace: 0, ink: 0, droplet: 0, mist: 0 };
      this.limits = { trace: Math.max(4, Number(options && options.maxTrace) || 12), ink: 12,
        droplet: NINJA_CONFIG.MAX_SPLASH_DROPLETS, mist: 4 };
      this.materialFallbackCount = 0;
      this.sequence = 0;
      this.lastColor = 0x398aca;
      this.lastSplashDelayMs = 0;
      this.lastMaterial = null;
      this.lastBurstType = null;
      this.lastMainPushDistance = 0;
      this.lastMainExpandTo = 1;
      this.lastDropletTravelPx = 0;
      this.lastDropletFanDeg = 0;
      this.lastHeavySpeed = 0;
      this.lastMistSpeed = 0;
      this.lastOmniHeavyCount = 0;
      this.lastOmniMistCount = 0;
      this.lastZoneBurst = null;
      this.zoneWaveEmissions = [];
      this.zoneWaveHeavyTotal = 0;
      this.zoneWaveMistTotal = 0;
    }

    _profile(type) {
      const profiles = {
        normal: { duration: 205, size: 126, main: 1, brush: 25 },
        critical: { duration: 225, size: 120, main: 1, brush: 20 },
        issen: { duration: 360, size: 168, main: 1, brush: 31 },
        zone_normal: { duration: 300, size: 158, main: 1, brush: 29 },
        zone_issen: { duration: 465, size: 205, main: 2, brush: 38 }
      };
      return profiles[type] || profiles.normal;
    }

    // Hit中は最高ランクだけを記録。一本を斬り終えた時、飛沫初動に一度だけ合わせる。
    beginSwipe() {
      this.impactSwipe = { id: ++this.impactSerial, hits: 0, best: null, lastHitAt: 0,
        zoneBurstOrdinal: 0, firstZone: null };
    }

    endSwipe(options) {
      const swipe = this.impactSwipe;
      this.impactSwipe = null;
      if (!this.scene || !swipe || !swipe.best) return false;
      const releaseDelay = Math.max(0, Number(options && options.releaseDelayMs) || 0);
      const due = Math.max(swipe.lastHitAt + (this.reducedMotion ? 0 : NINJA_CONFIG.COLOR_SPLASH_DELAY_MS),
        this.scene.time.now + releaseDelay);
      this._later(Math.max(0, due - this.scene.time.now), () => this._playImpact(swipe.best));
      return true;
    }

    _rememberImpact(type, point, angle, color, finisher) {
      if (!this.impactSwipe) this.beginSwipe();
      const swipe = this.impactSwipe;
      const kind = finisher ? "finisher" : (NINJA_CONFIG.IMPACT_SHAKE[type] ? type : "normal");
      const ranks = { normal: 1, critical: 2, issen: 3, zone_normal: 4,
        zone_issen: 5, finisher: 6 };
      swipe.hits++;
      swipe.lastHitAt = this.scene.time.now;
      if (!swipe.best || ranks[kind] >= ranks[swipe.best.kind]) {
        swipe.best = { kind, x: point.x, y: point.y, angle, color };
      }
      return swipe.hits;
    }

    _playImpact(impact) {
      if (!this.scene) return;
      const profiles = NINJA_CONFIG.IMPACT_SHAKE;
      const profile = profiles[impact.kind] || profiles.normal;
      const rank = ["normal", "critical", "issen", "zone_normal", "zone_issen", "finisher"]
        .indexOf(impact.kind) + 1;
      const now = this.scene.time.now;
      const camera = this.scene.cameras && this.scene.cameras.main;
      // 同時に発生する別スワイプも加算せず、発生中の最上位だけを採用。
      if (!this.reducedMotion && camera && typeof camera.shake === "function" &&
        (now >= this.activeShakeUntil || rank > this.activeShakeRank)) {
        const upgrade = now < this.activeShakeUntil && rank > this.activeShakeRank;
        camera.shake(profile.duration, profile.intensity, upgrade);
        this.activeShakeUntil = now + profile.duration;
        this.activeShakeRank = rank;
        this.shakeCount++;
        this.lastShake = { kind: impact.kind, duration: profile.duration,
          intensity: profile.intensity };
      } else {
        this.shakeSuppressed++;
      }
      this._impactAccent(impact);
      this._notify();
    }

    _impactAccent(impact) {
      if (!this.scene.add || typeof this.scene.add.graphics !== "function") return;
      if (!this.reducedMotion && this.zoneBurstPreset !== "previous" &&
        (impact.kind === "zone_issen" || impact.kind === "finisher")) {
        this._zoneImpactAccent(impact);
        return;
      }
      const rings = this.reducedMotion ? Math.min(1, NINJA_CONFIG.IMPACT_RINGS[impact.kind]) :
        NINJA_CONFIG.IMPACT_RINGS[impact.kind];
      const oldZoneStreaks = this.zoneBurstPreset === "previous" && impact.kind === "zone_issen" ? 8 :
        this.zoneBurstPreset === "previous" && impact.kind === "finisher" ? 9 :
          NINJA_CONFIG.IMPACT_STREAKS[impact.kind];
      const streaks = this.reducedMotion ? Math.min(2, oldZoneStreaks) : oldZoneStreaks;
      const blobs = this.reducedMotion ? 0 : impact.kind === "finisher" ? 3 :
        impact.kind === "zone_issen" ? 2 : impact.kind === "zone_normal" ? 1 : 0;
      while (this.impactBursts.size >= NINJA_CONFIG.MAX_IMPACT_BURSTS) {
        this._releaseImpactBurst(this.impactBursts.values().next().value);
      }
      const graphic = this.scene.add.graphics().setPosition(impact.x, impact.y).setDepth(174);
      for (let i = 0; i < rings; i++) {
        graphic.lineStyle(i ? 1.5 : 2.5, impact.color, i ? .32 : .50);
        graphic.strokeCircle(0, 0, i ? 24 : 14);
      }
      const directed = Math.max(1, streaks - Math.floor(streaks / 4));
      for (let i = 0; i < streaks; i++) {
        const direction = i < directed
          ? impact.angle + (i - (directed - 1) / 2) / Math.max(1, directed - 1) * 1.15
          : impact.angle + Math.PI + (i - directed) * 2.1;
        const length = (impact.kind.startsWith("zone") || impact.kind === "finisher" ? 56 : 40) *
          (.78 + (i % 3) * .13);
        graphic.lineStyle(i < directed ? 2.2 : 1.4, impact.color, i < directed ? .50 : .30);
        graphic.lineBetween(Math.cos(direction) * 12, Math.sin(direction) * 12,
          Math.cos(direction) * length, Math.sin(direction) * length);
      }
      // ZONEだけ小さく薄い付着粒。上部のお題UIには描かない。
      for (let i = 0; i < blobs; i++) {
        const direction = impact.angle + (i + 1) * 2.25;
        const x = Math.cos(direction) * (125 + i * 35);
        const y = Math.sin(direction) * (95 + i * 24);
        if (impact.y + y < 245 || impact.y + y > 680) continue;
        graphic.fillStyle(impact.color, .18);
        graphic.fillCircle(x, y, 6 + i * 2);
      }
      this.impactBursts.add(graphic);
      const life = this.reducedMotion ? 170 : impact.kind === "zone_issen" || impact.kind === "finisher" ?
        320 : impact.kind === "normal" ? 175 : 245;
      this.scene.tweens.add({ targets: graphic, scaleX: 1.5, scaleY: 1.5,
        alpha: 0, duration: life, ease: "Quad.easeOut",
        onComplete: () => this._releaseImpactBurst(graphic) });
      this.lastAccent = { kind: impact.kind, rings, streaks, blobs, duration: life };
    }

    _zoneImpactAccent(impact) {
      const finisher = impact.kind === "finisher";
      const streaks = this.zoneBurstPreset === "reference" ? 12 :
        NINJA_CONFIG.IMPACT_STREAKS[impact.kind];
      const main = this.scene.add.graphics().setPosition(impact.x, impact.y).setDepth(174);
      // 内側のリングは速く締まる。放射線は刀方向を主に、少数だけ反対へ抜く。
      main.lineStyle(3, impact.color, .66).strokeCircle(0, 0, 14);
      const directed = Math.ceil(streaks * .75);
      for (let i = 0; i < streaks; i++) {
        const direction = i < directed
          ? impact.angle + (i - (directed - 1) / 2) / Math.max(1, directed - 1) * 1.8
          : impact.angle + Math.PI + (i - directed + .25) * Math.PI * .55;
        const length = i === 0 ? 245 : 100 + ((i * 37) % 121);
        const width = i % 6 === 0 ? 4 : i % 3 === 0 ? 2.5 : 1.3;
        main.lineStyle(width, impact.color, i < directed ? .64 : .43);
        main.lineBetween(Math.cos(direction) * 13, Math.sin(direction) * 13,
          Math.cos(direction) * length, Math.sin(direction) * length);
      }
      this._trackImpactGraphic(main, { scaleX: 1.55, scaleY: 1.55, alpha: 0,
        duration: 205, ease: "Quad.easeOut" });
      const outer = this.scene.add.graphics().setPosition(impact.x, impact.y).setDepth(173);
      outer.lineStyle(1.8, impact.color, .31).strokeCircle(0, 0, 24);
      this._trackImpactGraphic(outer, { scaleX: 3.2, scaleY: 3.2, alpha: 0,
        delay: 24, duration: 340, ease: "Quad.easeOut" });
      // 飛沫はフィールド内だけに薄く付着。問題文・タイマー付近には描かない。
      const stains = this.scene.add.graphics().setPosition(impact.x, impact.y).setDepth(172);
      const offsets = [[-170, -70], [175, 95], [-300, 160], [315, -45], [0, 210], [-60, -190]];
      const desired = finisher || this.zoneBurstPreset === "reference" ? 6 : 5;
      for (let i = 0; i < desired; i++) {
        const x = Math.max(45, Math.min(1321, impact.x + offsets[i][0]));
        const y = Math.max(260, Math.min(675, impact.y + offsets[i][1]));
        stains.fillStyle(impact.color, .11 + (i % 3) * .018);
        stains.fillCircle(x - impact.x, y - impact.y, 6 + (i % 4) * 3);
      }
      this._trackImpactGraphic(stains, { alpha: 0, duration: 470,
        ease: "Quad.easeOut" });
      this.lastAccent = { kind: impact.kind, rings: 2, streaks, blobs: desired,
        duration: 470, ringFastMs: 205, ringSlowMs: 364 };
    }

    _trackImpactGraphic(graphic, tween) {
      while (this.impactBursts.size >= NINJA_CONFIG.MAX_IMPACT_BURSTS) {
        this._releaseImpactBurst(this.impactBursts.values().next().value);
      }
      this.impactBursts.add(graphic);
      this.scene.tweens.add(Object.assign({ targets: graphic,
        onComplete: () => this._releaseImpactBurst(graphic) }, tween));
    }

    _releaseImpactBurst(graphic) {
      if (!this.impactBursts.delete(graphic)) return;
      if (this.scene) this.scene.tweens.killTweensOf(graphic);
      if (graphic.active) graphic.destroy();
      this._notify();
    }

    hit(report, buildLevel, finisher, cardColor) {
      if (!this.scene || !report || !report.cutLine) return;
      const type = report.visualType;
      const profile = this._profile(type);
      const start = report.cutLine.worldStart, end = report.cutLine.worldEnd;
      const point = report.worldHitPoint;
      const color = Number.isFinite(cardColor) ? cardColor : this.lastColor;
      this.lastColor = color;
      const duration = Math.min(490, profile.duration + (finisher ? 20 : 0) +
        Math.round(20 * Math.max(0, Math.min(1, Number(buildLevel) || 0))));
      if (!point) return;
      const vector = { x: end.x - start.x, y: end.y - start.y };
      const hitIndex = this._rememberImpact(type, point, Math.atan2(vector.y, vector.x), color,
        Boolean(finisher));
      const swipe = this.impactSwipe;
      const enhancedZone = !this.reducedMotion && this.zoneBurstPreset !== "previous";
      let firstZone = null;
      let zoneOrdinal = 0;
      if (enhancedZone && type === "zone_normal" && hitIndex === 1 && !finisher) {
        firstZone = swipe.firstZone = { upgraded: false, emitted: false, upgradedAt: 0 };
      } else if (enhancedZone && (type === "zone_issen" || (finisher && type === "zone_normal"))) {
        if (swipe.firstZone && !swipe.firstZone.emitted && !swipe.firstZone.upgraded) {
          swipe.firstZone.upgraded = true;
          swipe.firstZone.upgradedAt = this.scene.time.now;
          swipe.zoneBurstOrdinal = 1; // 初札を一閃の第1爆散へ昇格。
        }
        zoneOrdinal = ++swipe.zoneBurstOrdinal;
      }
      const hasNew = this.dynamicVFX || this._hasMaterial("splash_material_splash_main_01") &&
        this._hasMaterial("splash_material_droplet_01") &&
        this._hasMaterial("splash_material_brush_trace_short") &&
        this._hasMaterial("splash_material_brush_trace_long");
      if (!hasNew) {
        this.materialFallbackCount++;
        this._fallback(point, vector, start, end, type, duration);
        return;
      }
      const hitAt = this.scene.time.now;
      // 光と切断はGameSceneで即時。飛沫→筆跡だけを遅らせて識別しやすくする。
      this._later(this.reducedMotion ? 0 : NINJA_CONFIG.COLOR_SPLASH_DELAY_MS, () => {
        const splash = (visual, ordinal) => {
          this.lastSplashDelayMs = this.scene.time.now - hitAt;
          this._splash(point, vector, visual, this._profile(visual), color,
            Boolean(finisher), hitIndex, ordinal);
        };
        if (firstZone && firstZone.upgraded) {
          firstZone.emitted = true;
          const remaining = Math.max(0, firstZone.upgradedAt + NINJA_CONFIG.COLOR_SPLASH_DELAY_MS -
            this.scene.time.now);
          this._later(remaining, () => splash("zone_issen", 1));
        } else {
          if (firstZone) firstZone.emitted = true;
          splash(finisher && enhancedZone && type === "zone_normal" ? "zone_issen" : type,
            zoneOrdinal);
        }
      });
      this._later(this.reducedMotion ? 0 : NINJA_CONFIG.COLOR_BRUSH_DELAY_MS, () => {
        this._trace([start, end], type, profile.brush, duration, false, color);
        if (this.vfxMode === "legacy" && (type === "zone_issen" || finisher)) this._mist(point, duration);
      });
    }

    flow(points, zone, delayMs, buildLevel, cardColor) {
      if (!this.scene || !points || points.length < 2) return false;
      const first = points[0], last = points[points.length - 1];
      if (Math.hypot(last.x - first.x, last.y - first.y) < 65) return false;
      const type = zone ? "zone_issen" : "issen";
      const color = Number.isFinite(cardColor) ? cardColor : this.lastColor;
      const draw = () => {
        if (this.dynamicVFX && this.vfxMode === "dynamic") this.dynamicVFX.playFlow(points, zone, color);
        const profile = this._profile(type);
        const duration = Math.min(490, profile.duration + Math.round(20 * (Number(buildLevel) || 0)));
        this._trace(points, type, profile.brush, duration, true, color);
        // 一閃の一本線の芯だけを細→太へ。ブラシ飛沫・切断・Hit履歴には触れない。
        if (!this.reducedMotion && this.scene) {
          const line = this.scene.add.graphics().setDepth(175);
          const dx = last.x - first.x, dy = last.y - first.y;
          for (let index = 0; index < 14; index += 1) {
            const a = index / 14, b = (index + 1) / 14;
            line.lineStyle(1.2 + 5.4 * b, 0xe4faff, .09 + .43 * b);
            line.lineBetween(first.x + dx * a, first.y + dy * a,
              first.x + dx * b, first.y + dy * b);
          }
          this._track(line, "trace", Math.min(duration, zone ? 345 : 315));
        }
      };
      // 既存のZONE Slow→Releaseを保ち、その後に筆跡の余韻を置く。
      this._later((this.reducedMotion ? 0 : Math.max(0, Math.min(60, Number(delayMs) || 0))) +
        (this.reducedMotion ? 0 : NINJA_CONFIG.COLOR_BRUSH_DELAY_MS), draw);
      return true;
    }

    _later(delay, action) {
      if (!delay) { action(); return; }
      const timer = this.scene.time.delayedCall(delay, () => {
        this.timers.delete(timer);
        if (this.scene) action();
      });
      this.timers.add(timer);
    }

    _splash(point, vector, type, profile, color, finisher, hitIndex, zoneOrdinal) {
      if (!this.scene) return;
      const len = Math.max(1, Math.hypot(vector.x, vector.y));
      const ux = vector.x / len, uy = vector.y / len, px = -uy, py = ux;
      const angle = Math.atan2(uy, ux);
      const motion = NINJA_CONFIG.SPLASH_BURST[type] || NINJA_CONFIG.SPLASH_BURST.normal;
      const layer = type === "zone_issen" && NINJA_CONFIG.ZONE_ISSEN_PRESETS[this.zoneBurstPreset]
        ? NINJA_CONFIG.ZONE_ISSEN_PRESETS[this.zoneBurstPreset] :
        (NINJA_CONFIG.SPLASH_LAYERS[type] || NINJA_CONFIG.SPLASH_LAYERS.normal);
      if (this.dynamicVFX) {
        this.lastBurstType = type;
        this.dynamicVFX.playHit({ x: point.x, y: point.y, swipeAngle: angle,
          cardColor: color, hitType: type, zoneActive: type.startsWith("zone_"),
          finisher, comboCount: hitIndex, ordinal: type === "zone_issen" ? zoneOrdinal || 1 : hitIndex,
          layer, reducedMotion: this.reducedMotion, elementOnly: this.vfxMode === "legacy" });
        const hit = this.dynamicVFX.lastHit;
        this.lastOmniHeavyCount = hit.omniHeavy;
        this.lastOmniMistCount = hit.omniFine;
        this._notify();
        if (this.vfxMode === "dynamic") return;
      }
      const zoneExplosion = type === "zone_issen" && !this.reducedMotion &&
        this.zoneBurstPreset !== "previous";
      // 既存の面素材は短命な芯へ下げ、雫と微粒子の運動を主役にする。
      const push = this.reducedMotion ? 8 :
        (motion.push + (finisher && type !== "zone_issen" ? 7 : 0)) * .72;
      const expand = this.reducedMotion ? 1.04 : 1.15;
      this.lastBurstType = type;
      this.lastMainPushDistance = push;
      this.lastMainExpandTo = expand;
      this.lastDropletFanDeg = layer.heavyFanDeg;
      const wanted = Math.min(2, profile.main + (finisher && type !== "zone_issen" ? 1 : 0));
      for (let i = 0; i < wanted; i++) {
        const variants = type === "issen" || type === "zone_issen" ? ["02", "03"] :
          type === "critical" ? ["03", "01"] : ["01", "02", "03"];
        const variant = variants[(this.sequence++ + Math.floor(Math.random() * variants.length)) % variants.length];
        const key = "splash_material_splash_main_" + variant;
        if (!this._hasMaterial(key)) { this.materialFallbackCount++; continue; }
        this.lastMaterial = variant;
        const source = this.scene.textures.get(key).getSourceImage();
        const width = profile.size * .74 * (0.92 + Math.random() * .16) *
          (finisher ? 1.08 : 1) * (zoneExplosion ? .88 : 1);
        const offset = 24 + i * 18;
        const x = point.x + ux * offset + px * (i ? -16 : 8);
        const y = point.y + uy * offset + py * (i ? -16 : 8);
        const mark = this.scene.add.image(x, y, key).setOrigin(.5)
          .setDepth(175 + i).setDisplaySize(width, width * source.height / source.width)
          .setRotation(angle + (Math.random() - .5) * .24)
          .setTint(color).setAlpha(this.reducedMotion ? .53 :
            (zoneExplosion ? .43 : .54) + Math.random() * .05);
        if (this.reducedMotion) {
          this._track(mark, "ink", 140, { x: x + ux * push, y: y + uy * push,
            scaleX: mark.scaleX * expand, scaleY: mark.scaleY * expand });
        } else {
          const life = Math.round(motion.lifeMs * .72);
          this._burst(mark, push, expand, Math.min(motion.burstMs, Math.round(life * .68)), life,
            ux, uy, .18);
        }
      }
      if (zoneExplosion) {
        this._zoneExplosion(point, angle, layer, color, finisher, zoneOrdinal || 1);
        return;
      }
      const scale = hitIndex > 1 ? (finisher ? .8 : NINJA_CONFIG.MULTI_HIT_SPLASH_SCALE) : 1;
      const drops = this.reducedMotion ? 2 :
        Math.min(24, Math.max(4, Math.round((layer.heavyCount + (finisher ? 1 : 0)) * scale)));
      const omniCount = this.reducedMotion ? 0 : Math.round(drops * layer.heavyOmni / layer.heavyCount);
      const directionalCount = drops - omniCount;
      this.lastOmniHeavyCount = omniCount;
      const key = "splash_material_droplet_01";
      for (let i = 0; i < drops; i++) {
        const omni = i >= directionalCount;
        const spread = omni ? 0 : (i - (directionalCount - 1) / 2) / Math.max(1, directionalCount - 1);
        const direction = omni ? angle + ((i - directionalCount) + Math.random()) / omniCount * Math.PI * 2 :
          angle + (spread * layer.heavyFanDeg + (Math.random() - .5) * 6) * Math.PI / 180;
        const speed = this.reducedMotion ? 120 : layer.heavySpeed[0] +
          Math.random() * (layer.heavySpeed[1] - layer.heavySpeed[0]);
        const life = this.reducedMotion ? 145 : layer.heavyLifeMs * (.88 + Math.random() * .24);
        // 小4割・中4割・大2割。方向とサイズも少しずつ変えてスタンプ感を減らす。
        const sizeClass = i % 5;
        const size = (sizeClass < 2 ? 32 + Math.random() * 13 :
          sizeClass < 4 ? 49 + Math.random() * 15 : 72 + Math.random() * 20) *
          (type.startsWith("zone_") ? 1.08 : 1);
        const dot = this.scene.add.image(point.x + ux * 16 + px * spread * 12,
          point.y + uy * 16 + py * spread * 12, key)
          .setOrigin(.5).setDepth(176).setDisplaySize(size * 1.18, size * .86)
          .setRotation(direction + (Math.random() - .5) * .3).setTint(color)
          .setAlpha(this.reducedMotion ? .55 : .78 + Math.random() * .13);
        const velocityX = Math.cos(direction) * speed, velocityY = Math.sin(direction) * speed;
        this._retain(dot, "droplet");
        this.heavyMotions.set(dot, { x: dot.x, y: dot.y, vx: velocityX, vy: velocityY,
          gravity: this.reducedMotion ? 160 : layer.heavyGravity, age: 0, life,
          scaleX: dot.scaleX, scaleY: dot.scaleY, alpha: dot.alpha,
          rotationOffset: dot.rotation - direction });
        this.lastHeavySpeed = speed;
        this.lastDropletTravelPx = speed * life / 1000;
      }
      this._sprayColorMist(point, angle, ux, uy, px, py, layer, color, finisher, scale);
      this._notify();
    }

    // ZONE一閃専用：初弾を厚くし、30/65ms後へ全方位粒と霧を分ける。
    _zoneExplosion(point, angle, layer, color, finisher, ordinal) {
      const steps = NINJA_CONFIG.ZONE_ISSEN_MULTI_SCALES;
      const scale = finisher ? Math.max(.9, steps[Math.min(ordinal - 1, steps.length - 1)]) :
        steps[Math.min(ordinal - 1, steps.length - 1)];
      const heavy = Math.round((layer.heavyCount + (finisher ?
        NINJA_CONFIG.ZONE_ISSEN_FINISHER_EXTRA.heavy : 0)) * scale);
      const mist = Math.round((layer.mistCount + (finisher ?
        NINJA_CONFIG.ZONE_ISSEN_FINISHER_EXTRA.mist : 0)) * scale);
      const heavyOmni = Math.round(heavy * layer.heavyOmni / layer.heavyCount);
      const mistOmni = Math.round(mist * layer.mistOmni / layer.mistCount);
      this.lastOmniHeavyCount = heavyOmni;
      this.lastOmniMistCount = mistOmni;
      this.lastZoneBurst = { preset: this.zoneBurstPreset, ordinal, heavy, mist,
        heavyOmni, mistOmni, color, finisher };
      const heavyWaves = this._zoneWaveCounts(heavy, [.225, .575]);
      const mistWaves = this._zoneWaveCounts(mist, [.08, .58]);
      const heavyOmniWaves = this._zoneOmniWaves(heavyOmni, heavyWaves);
      const mistOmniWaves = this._zoneOmniWaves(mistOmni, mistWaves);
      let heavyIndex = 0, mistIndex = 0, omniHeavyIndex = 0, omniMistIndex = 0;
      NINJA_CONFIG.ZONE_ISSEN_WAVE_DELAYS_MS.forEach((delay, wave) => {
        const startHeavy = heavyIndex, startMist = mistIndex;
        const startOmniHeavy = omniHeavyIndex, startOmniMist = omniMistIndex;
        heavyIndex += heavyWaves[wave]; mistIndex += mistWaves[wave];
        omniHeavyIndex += heavyOmniWaves[wave]; omniMistIndex += mistOmniWaves[wave];
        this._later(delay, () => {
          this._emitZoneWave(point, angle, layer, color, ordinal, wave,
            heavyWaves[wave], mistWaves[wave], heavyOmniWaves[wave], mistOmniWaves[wave],
            startHeavy, startMist, startOmniHeavy, startOmniMist,
            heavyOmni, mistOmni);
        });
      });
    }

    _zoneWaveCounts(total, fractions) {
      const first = Math.round(total * fractions[0]);
      const second = Math.round(total * fractions[1]);
      return [first, second, total - first - second];
    }

    _zoneOmniWaves(total, waves) {
      const second = Math.min(waves[1], Math.round(total * .72));
      const third = Math.min(waves[2], total - second);
      return [total - second - third, second, third];
    }

    _zoneSpeed(range, index) {
      // 低速2：中速5：高速3。後半に抜ける粒を残す。
      const band = index % 10;
      const t = band < 2 ? Math.random() * .24 :
        band < 7 ? .24 + Math.random() * .43 : .67 + Math.random() * .33;
      return range[0] + (range[1] - range[0]) * t;
    }

    _emitZoneWave(point, angle, layer, color, ordinal, wave, heavyCount, mistCount,
      omniHeavyCount, omniMistCount, heavyStart, mistStart, omniHeavyStart, omniMistStart,
      omniHeavyTotal, omniMistTotal) {
      if (!this.scene) return;
      const directedHeavy = heavyCount - omniHeavyCount;
      const directedMist = mistCount - omniMistCount;
      const heavyDirectedStart = heavyStart - omniHeavyStart;
      const mistDirectedStart = mistStart - omniMistStart;
      for (let i = 0; i < heavyCount; i++) {
        const omni = i >= directedHeavy;
        const index = omni ? omniHeavyStart + i - directedHeavy : heavyDirectedStart + i;
        const direction = omni
          ? angle + ((index + .5 + (Math.random() - .5) * .3) / Math.max(1, omniHeavyTotal)) * Math.PI * 2
          : angle + (Math.random() * 2 - 1) * layer.heavyFanDeg * Math.PI / 180;
        const speed = this._zoneSpeed(layer.heavySpeed, heavyStart + i);
        const life = layer.heavyLifeMs * (.88 + Math.random() * .24);
        const sizeClass = ((heavyStart + i) * 7 + 19) % 20;
        const size = sizeClass < 7 ? 32 + Math.random() * 13 :
          sizeClass < 15 ? 50 + Math.random() * 16 :
          sizeClass < 19 ? 76 + Math.random() * 20 : 112 + Math.random() * 14;
        const x = point.x + Math.cos(direction) * 10 + (Math.random() - .5) * 13;
        const y = point.y + Math.sin(direction) * 10 + (Math.random() - .5) * 13;
        const dot = this.scene.add.image(x, y, "splash_material_droplet_01")
          .setOrigin(.5).setDepth(176).setDisplaySize(size * 1.18, size * .86)
          .setRotation(direction + (Math.random() - .5) * .3).setTint(color)
          .setAlpha(.77 + Math.random() * .12);
        dot.__zoneWave = wave; dot.__zoneOmni = omni; dot.__zoneSizeClass = sizeClass;
        this._retain(dot, "droplet");
        this.heavyMotions.set(dot, { x, y, vx: Math.cos(direction) * speed,
          vy: Math.sin(direction) * speed, gravity: layer.heavyGravity, age: 0,
          life, scaleX: dot.scaleX, scaleY: dot.scaleY, alpha: dot.alpha,
          rotationOffset: dot.rotation - direction });
        this.lastHeavySpeed = speed;
        this.lastDropletTravelPx = speed * life / 1000;
      }
      if (!this.colorMistGraphics) this.colorMistGraphics = this.scene.add.graphics().setDepth(173);
      for (let i = 0; i < mistCount; i++) {
        const omni = i >= directedMist;
        const index = omni ? omniMistStart + i - directedMist : mistDirectedStart + i;
        const direction = omni
          ? angle + ((index + .5 + (Math.random() - .5) * .3) / Math.max(1, omniMistTotal)) * Math.PI * 2
          : angle + (Math.random() * 2 - 1) * layer.mistFanDeg * Math.PI / 180;
        const speed = this._zoneSpeed(layer.mistSpeed, mistStart + i);
        const core = wave === 1 && i % 3 !== 0;
        const particle = {
          x: point.x + (Math.random() - .5) * (core ? 14 : 26),
          y: point.y + (Math.random() - .5) * (core ? 14 : 26),
          vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed,
          gravity: layer.mistGravity,
          life: layer.mistLifeMs * (.85 + Math.random() * .30), age: 0,
          radius: (mistStart + i) % 12 === 0 ? 3 + Math.random() * .7 :
            .8 + Math.random() * 1.7,
          alpha: core ? .44 + Math.random() * .12 : .28 + Math.random() * .16,
          color, zoneWave: wave, omni };
        if (this.colorMistParticles.length >= NINJA_CONFIG.MAX_COLOR_MIST_PARTICLES) {
          this.colorMistParticles.shift();
        }
        this.colorMistParticles.push(particle);
        this.colorMistTotal++;
        this.lastMistSpeed = speed;
      }
      this.zoneWaveHeavyTotal += heavyCount;
      this.zoneWaveMistTotal += mistCount;
      this.zoneWaveEmissions.push({ at: this.scene.time.now, ordinal, wave,
        heavy: heavyCount, mist: mistCount,
        omniHeavy: omniHeavyCount, omniMist: omniMistCount, color });
      if (this.zoneWaveEmissions.length > 24) this.zoneWaveEmissions.shift();
      this.colorMistPeak = Math.max(this.colorMistPeak, this.colorMistParticles.length);
      this._drawColorMist();
      this._notify();
    }

    _sprayColorMist(point, angle, ux, uy, px, py, layer, color, finisher, scale) {
      if (!this.scene.add || typeof this.scene.add.graphics !== "function") return;
      if (!this.colorMistGraphics) this.colorMistGraphics = this.scene.add.graphics().setDepth(173);
      const amount = this.reducedMotion ? 4 : Math.min(46,
        Math.max(7, Math.round((layer.mistCount + (finisher ? 2 : 0)) * scale)));
      const omniCount = this.reducedMotion ? 0 : Math.round(amount * layer.mistOmni / layer.mistCount);
      const directionalCount = amount - omniCount;
      this.lastOmniMistCount = omniCount;
      for (let i = 0; i < amount; i++) {
        const omni = i >= directionalCount;
        const spread = omni ? 0 : (i - (directionalCount - 1) / 2) / Math.max(1, directionalCount - 1);
        const direction = omni ? angle + ((i - directionalCount) + Math.random()) / omniCount * Math.PI * 2 :
          angle + (spread * layer.mistFanDeg + (Math.random() - .5) * 10) * Math.PI / 180;
        const speed = this.reducedMotion ? 75 : layer.mistSpeed[0] +
          Math.random() * (layer.mistSpeed[1] - layer.mistSpeed[0]);
        const particle = { x: point.x + ux * 21 + px * spread * 12,
          y: point.y + uy * 21 + py * spread * 12,
          vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed,
          gravity: this.reducedMotion ? 30 : layer.mistGravity,
          life: this.reducedMotion ? 135 : layer.mistLifeMs * (.85 + Math.random() * .30),
          age: 0, radius: i % 11 === 0 && (finisher || layer.mistCount >= 40)
            ? 3.0 + Math.random() * .8 : .8 + Math.random() * 1.7,
          alpha: this.reducedMotion ? .25 : .30 + Math.random() * .19, color };
        if (this.colorMistParticles.length >= NINJA_CONFIG.MAX_COLOR_MIST_PARTICLES) {
          this.colorMistParticles.shift();
        }
        this.colorMistParticles.push(particle);
        this.colorMistTotal++;
        this.lastMistSpeed = speed;
      }
      this.colorMistPeak = Math.max(this.colorMistPeak, this.colorMistParticles.length);
      this._drawColorMist();
    }

    // 重い雫と軽いミストを別重力で更新。全粒でGraphicsは1枚だけ使い回す。
    update(delta) {
      if (!this.scene) return;
      if (this.dynamicVFX) { this.dynamicVFX.update(delta); this._notify(); }
      const step = Math.min(50, Math.max(0, Number(delta) || 0));
      if (!step) return;
      for (const [dot, motion] of this.heavyMotions) {
        motion.age += step;
        if (!dot.active || motion.age >= motion.life) { this._release(dot, "droplet"); continue; }
        const seconds = motion.age / 1000, progress = motion.age / motion.life;
        dot.x = motion.x + motion.vx * seconds;
        dot.y = motion.y + motion.vy * seconds + .5 * motion.gravity * seconds * seconds;
        dot.rotation = Math.atan2(motion.vy + motion.gravity * seconds, motion.vx) + motion.rotationOffset;
        const shrink = 1 - .38 * progress;
        dot.scaleX = motion.scaleX * shrink;
        dot.scaleY = motion.scaleY * shrink;
        dot.alpha = motion.alpha * Math.pow(1 - progress, .72);
      }
      if (!this.colorMistParticles.length) return;
      const previousCount = this.colorMistParticles.length;
      for (let i = this.colorMistParticles.length - 1; i >= 0; i--) {
        const particle = this.colorMistParticles[i];
        particle.age += step;
        if (particle.age >= particle.life) this.colorMistParticles.splice(i, 1);
      }
      this._drawColorMist();
      if (this.colorMistParticles.length !== previousCount) this._notify();
    }

    _drawColorMist() {
      const graphics = this.colorMistGraphics;
      if (!graphics || !graphics.active) return;
      graphics.clear();
      for (const particle of this.colorMistParticles) {
        const seconds = particle.age / 1000, progress = particle.age / particle.life;
        const x = particle.x + particle.vx * seconds;
        const y = particle.y + particle.vy * seconds + .5 * particle.gravity * seconds * seconds;
        graphics.fillStyle(particle.color, particle.alpha * Math.pow(1 - progress, 1.1));
        graphics.fillCircle(x, y, particle.radius * (1 + progress * .18));
      }
    }

    _trace(points, type, width, duration, isFlow, color) {
      const long = type === "issen" || type === "zone_issen";
      const key = "splash_material_brush_trace_" + (long ? "long" : "short");
      if (!this._hasMaterial(key)) { this.materialFallbackCount++; return; }
      const first = points[0], last = points[points.length - 1];
      const dx = last.x - first.x, dy = last.y - first.y, len = Math.hypot(dx, dy);
      if (len < 1) return;
      const zone = type.startsWith("zone_");
      const img = this.scene.add.image((first.x + last.x) / 2, (first.y + last.y) / 2, key)
        .setOrigin(.5).setDepth(isFlow ? 174 : 49)
        .setDisplaySize(len + (long ? 36 : 18), width)
        .setRotation(Math.atan2(dy, dx))
        .setTint(Number.isFinite(color) ? color : this.lastColor)
        .setAlpha(isFlow ? .55 : type === "critical" ? .62 : zone ? .58 : .48);
      this._track(img, "trace", this.reducedMotion ? Math.min(duration, 175) : duration);
    }

    _fallback(point, vector, start, end, type, duration) {
      const ink = this.scene.add.graphics().setDepth(49);
      ink.lineStyle(type.startsWith("zone") ? 6 : 4, 0xcadbe2, .58);
      ink.lineBetween(start.x, start.y, end.x, end.y);
      this._track(ink, "trace", duration);
      const mark = this.scene.add.graphics().setDepth(174);
      mark.fillStyle(0xd8e5e3, .48);
      mark.fillCircle(point.x + vector.x * .14, point.y + vector.y * .14, 12);
      this._track(mark, "ink", 205);
    }

    _mist(point, duration) {
      const haze = this.scene.add.ellipse(point.x, point.y, 100, 33, 0xb5c6c8,
        this.reducedMotion ? .035 : .055).setDepth(170);
      this._track(haze, "mist", this.reducedMotion ? 130 : Math.min(310, duration), { y: point.y - 17 });
    }

    _hasMaterial(key) {
      return Boolean(this.scene && this.scene.textures && this.scene.textures.exists(key) &&
        this.scene.add && typeof this.scene.add.image === "function");
    }

    _group(kind) { return kind === "trace" ? this.traces : kind === "ink" ? this.inks :
      kind === "droplet" ? this.droplets : this.mists; }
    _retain(object, kind) {
      const group = this._group(kind);
      while (group.size >= this.limits[kind]) this._release(group.values().next().value, kind);
      group.add(object);
      this.total[kind]++;
      this.peak[kind] = Math.max(this.peak[kind], group.size);
      this._notify();
    }
    _burst(object, push, expand, burstMs, lifeMs, ux, uy, fadeAlpha) {
      this._retain(object, "ink");
      const endX = object.x + ux * push, endY = object.y + uy * push;
      this.scene.tweens.add({ targets: object, x: endX, y: endY,
        scaleX: object.scaleX * expand, scaleY: object.scaleY * expand,
        alpha: fadeAlpha === undefined ? .46 : fadeAlpha,
        duration: burstMs, ease: "Cubic.easeOut", onComplete: () => {
          if (!this.scene || !object.active || !this.inks.has(object)) return;
          this.scene.tweens.add({ targets: object, x: endX + ux * 8, y: endY + uy * 8,
            alpha: 0, duration: lifeMs - burstMs, ease: "Quad.easeOut",
            onComplete: () => this._release(object, "ink") });
        } });
    }
    _track(object, kind, duration, extra) {
      this._retain(object, kind);
      this.scene.tweens.add(Object.assign({ targets: object, alpha: 0, duration,
        ease: "Quad.easeOut", onComplete: () => this._release(object, kind) }, extra || {}));
    }
    _release(object, kind) {
      const group = this._group(kind);
      if (!group.delete(object)) return;
      if (kind === "droplet") this.heavyMotions.delete(object);
      if (this.scene) this.scene.tweens.killTweensOf(object);
      if (object && object.active) object.destroy();
      this._notify();
    }
    getState() {
      return { vfxMode: this.vfxMode, dynamic: this.dynamicVFX ? this.dynamicVFX.getState() : null,
      active: { trace: this.traces.size, ink: this.inks.size,
        droplet: this.droplets.size, mist: this.mists.size, colorMist: this.colorMistParticles.length },
      peak: Object.assign({}, this.peak), total: Object.assign({}, this.total),
      limits: Object.assign({}, this.limits), materialFallbackCount: this.materialFallbackCount,
      lastSplashDelayMs: this.lastSplashDelayMs, lastMaterial: this.lastMaterial,
      lastBurstType: this.lastBurstType, lastMainPushDistance: this.lastMainPushDistance,
      lastMainExpandTo: this.lastMainExpandTo, lastDropletTravelPx: this.lastDropletTravelPx,
      lastDropletFanDeg: this.lastDropletFanDeg,
      lastOmniHeavyCount: this.lastOmniHeavyCount,
      lastOmniMistCount: this.lastOmniMistCount,
      zoneBurst: { last: this.lastZoneBurst, waves: this.zoneWaveEmissions.slice(),
        totalHeavy: this.zoneWaveHeavyTotal, totalMist: this.zoneWaveMistTotal,
        preset: this.zoneBurstPreset },
      colorMist: { active: this.colorMistParticles.length, peak: this.colorMistPeak,
        total: this.colorMistTotal, limit: NINJA_CONFIG.MAX_COLOR_MIST_PARTICLES },
      lastHeavySpeed: this.lastHeavySpeed, lastMistSpeed: this.lastMistSpeed,
      impact: { shakeCount: this.shakeCount, suppressed: this.shakeSuppressed,
        lastShake: this.lastShake, lastAccent: this.lastAccent,
        activeBursts: this.impactBursts.size, limit: NINJA_CONFIG.MAX_IMPACT_BURSTS } };
    }
    _notify() { if (this.onState) this.onState(this.getState()); }
    destroy() {
      if (!this.scene) return;
      if (this.dynamicVFX) { this.dynamicVFX.destroy(); this.dynamicVFX = null; }
      for (const timer of this.timers) timer.remove(false);
      this.timers.clear();
      for (const [kind, group] of [["trace", this.traces], ["ink", this.inks],
        ["droplet", this.droplets], ["mist", this.mists]]) {
        for (const object of Array.from(group)) this._release(object, kind);
      }
      this.heavyMotions.clear();
      this.colorMistParticles.length = 0;
      this.zoneWaveEmissions.length = 0;
      if (this.colorMistGraphics && this.colorMistGraphics.active) this.colorMistGraphics.destroy();
      this.colorMistGraphics = null;
      for (const burst of Array.from(this.impactBursts)) this._releaseImpactBurst(burst);
      this.impactSwipe = null;
      this._notify();
      this.scene = null;
    }
  }
  window.NinjaCore.SlashTraceSystem = SlashTraceSystem;
})();
