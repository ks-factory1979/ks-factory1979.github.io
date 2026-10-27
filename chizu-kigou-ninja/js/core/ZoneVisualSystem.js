(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};

  // ZONEの背景と短い突入演出。札・問題・スコアには触れない。
  class ZoneVisualSystem {
    constructor(scene, reducedMotion) {
      this.scene = scene;
      this.reducedMotion = Boolean(reducedMotion);
      this.objects = [];
      this.entryObjects = new Set();
      this.active = false;
      this.late = false;
      this.lastReactAt = -Infinity;
      this.endBuildLevel = 0;
      this.elapsedMs = 0;
      this.linePhase = 0;
      this.worldReaction = 0;
    }

    _image(name, depth, width, height) {
      const key = "zone_world_" + name;
      if (!this.scene.textures.exists(key)) return null;
      const image = this.scene.add.image(683, 384, key)
        .setOrigin(.5).setDisplaySize(width, height).setDepth(depth);
      image.__baseScaleX = image.scaleX;
      image.__baseScaleY = image.scaleY;
      this.objects.push(image);
      return image;
    }

    activate() {
      if (this.active) return;
      this.active = true;
      const scene = this.scene;
      const background = scene.add.graphics().setDepth(4);
      background.fillStyle(0x4cbfff, .10);
      background.fillRect(0, 0, 1366, 768);
      background.fillStyle(0x91e8ff, .10);
      background.fillEllipse(683, 390, 1030, 690);
      background.fillStyle(0xffeac0, .055);
      background.fillEllipse(682, 635, 1220, 240);
      background.lineStyle(4, 0x9ceaff, .38);
      background.strokeRoundedRect(19, 18, 1328, 732, 29);
      background.lineStyle(2, 0xffe5a8, .49);
      background.strokeRoundedRect(31, 30, 1304, 708, 24);
      background.lineStyle(2, 0xb2eeff, .20);
      for (let i = 0; i < 7; i += 1) {
        const x = 85 + i * 196;
        background.lineBetween(x, 245, x + 116, 155);
        background.lineBetween(x + 55, 682, x + 169, 597);
      }
      this.objects.push(background);
      // 流線は札の奥、外周オーラは札の上・斬撃とHUDの下。
      this.speedLines = this._image("zone_speed_lines", 3, 1450, 816);
      this.edgeAura = this._image("zone_edge_aura", 171, 1366, 768);
      this.aura = scene.add.ellipse(683, 465, 930, 520, 0x89ddff, .065).setDepth(5);
      this.objects.push(this.aura);
      // 単一の短命パルスを再利用し、多Hitでも背景オブジェクトを増やさない。
      this.hitPulse = scene.add.ellipse(683, 465, 1040, 560, 0xb8edff, .11).setDepth(6).setAlpha(0);
      this.objects.push(this.hitPulse);
      this.endGlow = scene.add.ellipse(683, 450, 1130, 590, 0xffe5b5, .09)
        .setDepth(6).setAlpha(0);
      this.objects.push(this.endGlow);
      if (!this.reducedMotion) {
        scene.tweens.add({ targets: this.aura, alpha: .57, scale: 1.06,
          duration: 1100, yoyo: true, repeat: -1 });
      }
      this.update(0);
      this._report();
    }

    // 一枚ずつ再利用。ゲーム座標で軽い数値計算のみ行う。
    update(delta) {
      if (!this.active) return;
      const step = Math.min(80, Math.max(0, Number(delta) || 0));
      this.elapsedMs += step;
      this.worldReaction = Math.max(0, this.worldReaction - step / 200);
      const cfg = NINJA_CONFIG.ZONE_WORLD;
      if (this.edgeAura && this.edgeAura.active) {
        const breathe = this.reducedMotion ? 0 :
          (1 - Math.cos(this.elapsedMs * 2 * Math.PI / cfg.auraPeriodMs)) / 2;
        this.edgeAura.setAlpha(Math.min(.43,
          (this.reducedMotion ? .22 : cfg.auraAlpha) + cfg.auraPulseAlpha * breathe +
          cfg.endAuraBonus * this.endBuildLevel + .025 * this.worldReaction));
        const zoom = 1 + (this.reducedMotion ? 0 : cfg.auraScaleBonus * breathe);
        this.edgeAura.setScale(this.edgeAura.__baseScaleX * zoom,
          this.edgeAura.__baseScaleY * zoom);
      }
      if (this.speedLines && this.speedLines.active) {
        this.speedLines.setAlpha(this.reducedMotion ? .09 : Math.min(.25,
          cfg.linesAlpha + cfg.endLinesBonus * this.endBuildLevel + .015 * this.worldReaction));
        if (!this.reducedMotion) {
          // 画面より大きい一枚を小さく往復。端の露出や継ぎ目は作らない。
          this.linePhase += step / 1000 * cfg.linesDriftPxPerSec / 28 *
            (1 + .55 * this.endBuildLevel);
          this.speedLines.setPosition(683 + 28 * Math.sin(this.linePhase),
            384 + 11 * Math.sin(this.linePhase + .45));
        }
      }
      this._report();
    }

    enter() {
      this.activate();
      for (const object of [...this.entryObjects]) this._release(object);
      const scene = this.scene;
      const flash = scene.add.rectangle(683, 384, 1366, 768, 0xd8f7ff, .19).setDepth(840);
      this._trackEntry(flash);
      scene.tweens.add({ targets: flash, alpha: 0, duration: 150,
        onComplete: () => this._release(flash) });
      const ring = scene.add.circle(683, 340, 80, 0x95e7ff, 0)
        .setStrokeStyle(6, 0xffe7ad, .72).setDepth(845);
      this._trackEntry(ring);
      scene.tweens.add({ targets: ring, scale: 5.2, alpha: 0,
        duration: this.reducedMotion ? 190 : 400,
        onComplete: () => this._release(ring) });
      const seal = this._image("zone_ninjutsu_seal", 847, 575, 575);
      if (seal) {
        this.entryObjects.add(seal);
        seal.setPosition(683, 348)
          .setScale(seal.__baseScaleX * (this.reducedMotion ? 1 : .76),
            seal.__baseScaleY * (this.reducedMotion ? 1 : .76)).setAlpha(.90);
        if (!this.reducedMotion) scene.tweens.add({ targets: seal,
          scaleX: seal.__baseScaleX, scaleY: seal.__baseScaleY, rotation: .13,
          duration: 190, ease: "Quad.easeOut" });
        scene.tweens.add({ targets: seal, alpha: 0,
          delay: this.reducedMotion ? 130 : 210, duration: this.reducedMotion ? 230 : 350,
          onComplete: () => this._release(seal) });
      }
      const title = this._image("zone_logo", 850, 650, 217) || scene.add.text(683, 292, "ZONE", {
        fontFamily: MapSymbolNinja.UI.fontFamily, fontSize: "100px", fontStyle: "bold",
        color: "#ffffff", stroke: "#309cce", strokeThickness: 11
      }).setOrigin(.5).setScale(.82).setDepth(850);
      if (!this.objects.includes(title)) this.objects.push(title);
      this.entryObjects.add(title);
      title.setPosition(683, 313);
      if (title.__baseScaleX) title.setScale(
        title.__baseScaleX * (this.reducedMotion ? 1 : .80),
        title.__baseScaleY * (this.reducedMotion ? 1 : .80));
      const sub = scene.add.text(683, 433, "ぜんぶ きれ！", {
        fontFamily: MapSymbolNinja.UI.fontFamily, fontSize: "37px", fontStyle: "bold",
        color: "#fff0cd", stroke: "#22517a", strokeThickness: 7
      }).setOrigin(.5).setDepth(852);
      this._trackEntry(sub);
      if (!this.reducedMotion) scene.tweens.add({ targets: title,
        scaleX: title.__baseScaleX || 1, scaleY: title.__baseScaleY || 1,
        duration: 145, ease: "Back.easeOut" });
      scene.tweens.add({ targets: title, alpha: 0,
        delay: this.reducedMotion ? 160 : 320, duration: this.reducedMotion ? 230 : 360,
        onComplete: () => this._release(title) });
      scene.tweens.add({ targets: sub, y: 417, alpha: 0,
        delay: this.reducedMotion ? 160 : 320, duration: this.reducedMotion ? 230 : 360,
        onComplete: () => this._release(sub) });
      this._report();
    }

    _trackEntry(object) { this.objects.push(object); this.entryObjects.add(object); }

    setLate(value) {
      if (!this.active || this.late === Boolean(value)) return;
      this.late = Boolean(value);
      if (this.aura && this.aura.active) {
        this.aura.setFillStyle(this.late ? 0xffe9b0 : 0x89ddff, this.late ? .10 : .065);
      }
    }

    setEndBuild(level) {
      if (!this.active || !this.endGlow || !this.endGlow.active) return;
      this.endBuildLevel = Math.max(0, Math.min(1, Number(level) || 0));
      this.endGlow.setAlpha(this.reducedMotion ? .014 * this.endBuildLevel : .085 * this.endBuildLevel)
        .setScale(1 + .045 * this.endBuildLevel);
      this._report();
    }

    reactHit(strong) {
      if (!this.active || !this.hitPulse || !this.hitPulse.active) return;
      const now = this.scene.time.now;
      if (!strong && now - this.lastReactAt < 55) return;
      this.lastReactAt = now;
      this.worldReaction = Math.max(this.worldReaction, strong ? 1 : .55);
      const pulse = this.hitPulse;
      this.scene.tweens.killTweensOf(pulse);
      pulse.setFillStyle(this.late || strong ? 0xffebc2 : 0xb8edff, .11)
        .setAlpha(this.reducedMotion ? .035 : strong ? .095 + .025 * this.endBuildLevel : .055 + .02 * this.endBuildLevel).setScale(1);
      this.scene.tweens.add({ targets: pulse, alpha: 0, scale: strong ? 1.055 : 1.025,
        duration: this.reducedMotion ? 85 : strong ? 230 : 155, ease: "Quad.easeOut" });
    }

    // 一閃の予兆は環境光のみ。一切のPointer・飛翔・AudioContextを停止しない。
    anticipateRelease() {
      if (!this.active || this.reducedMotion || !this.hitPulse || !this.hitPulse.active) return;
      this.scene.tweens.killTweensOf(this.hitPulse);
      this.hitPulse.setFillStyle(0x9fe5ff, .10).setAlpha(.025).setScale(.96);
    }

    exit() {
      if (!this.active) return;
      this.active = false;
      this.late = false;
      this.endBuildLevel = 0;
      for (const object of [...this.objects]) {
        if (!object || !object.active) continue;
        this.scene.tweens.killTweensOf(object);
        this.scene.tweens.add({ targets: object, alpha: 0,
          duration: this.reducedMotion ? 80 : 220,
          onComplete: () => this._release(object) });
      }
      this.edgeAura = null;
      this.speedLines = null;
      this.aura = null;
      this.hitPulse = null;
      this.endGlow = null;
      this._report();
    }

    _release(object) {
      const index = this.objects.indexOf(object);
      if (index >= 0) this.objects.splice(index, 1);
      this.entryObjects.delete(object);
      if (object && object.active) {
        if (this.scene) this.scene.tweens.killTweensOf(object);
        object.destroy();
      }
      this._report();
    }

    _report() {
      const qa = typeof window !== "undefined" && window.__NINJA_QA;
      if (!qa) return;
      qa.zoneWorldActive = this.active;
      qa.zoneWorldObjects = this.objects.filter((object) => object && object.active).length;
      qa.zoneWorldEndLevel = this.endBuildLevel;
      qa.zoneWorldAuraAlpha = this.edgeAura && this.edgeAura.active ? this.edgeAura.alpha : 0;
      qa.zoneWorldLinesAlpha = this.speedLines && this.speedLines.active ? this.speedLines.alpha : 0;
      qa.zoneWorldEntryObjects = this.entryObjects.size;
    }

    destroy() {
      if (!this.scene) return;
      for (const object of this.objects) {
        if (object && object.active) {
          this.scene.tweens.killTweensOf(object);
          object.destroy();
        }
      }
      this.objects = [];
      this.entryObjects.clear();
      this.active = false;
      this.edgeAura = null;
      this.speedLines = null;
      this.aura = null;
      this.hitPulse = null;
      this.endGlow = null;
      this._report();
      this.scene = null;
    }
  }

  window.NinjaCore.ZoneVisualSystem = ZoneVisualSystem;
})();
