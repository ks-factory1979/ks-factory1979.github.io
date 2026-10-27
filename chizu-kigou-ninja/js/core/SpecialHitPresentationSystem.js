(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};

  // 判定結果を受け取って見せるだけのSystem。ゲーム時計・得点・入力・物理には触れない。
  class SpecialHitPresentationSystem {
    constructor(scene, options) {
      this.scene = scene;
      this.options = options || {};
      this.entries = [];
      this.rings = [];
      this.peak = 0;
      this.lastState = null;
      this.sequence = 0;
    }

    _state(entry, phase) {
      const state = { type: entry.type, phase, label: entry.label,
        active: this.entries.length, criticalActive: this.entries.filter((e) => e.type === "critical").length,
        issenActive: this.entries.filter((e) => e.type === "issen").length,
        rings: this.rings.length, peak: this.peak,
        at: typeof performance !== "undefined" ? performance.now() : 0 };
      this.lastState = state;
      if (typeof this.options.onState === "function") this.options.onState(state);
    }

    _later(entry, delay, action) {
      let timer;
      timer = this.scene.time.delayedCall(delay, () => {
        entry.timers.delete(timer);
        if (this.scene && this.entries.includes(entry)) action();
      });
      entry.timers.add(timer);
    }

    _tween(entry, settings) {
      let tween;
      const onComplete = settings.onComplete;
      tween = this.scene.tweens.add(Object.assign({}, settings, {
        onComplete: () => {
          entry.tweens.delete(tween);
          if (onComplete && this.entries.includes(entry)) onComplete();
        }
      }));
      entry.tweens.add(tween);
    }

    _removeRing(entry, ring) {
      const index = this.rings.indexOf(ring);
      if (index !== -1) this.rings.splice(index, 1);
      entry.rings.delete(ring);
      if (ring.active) ring.destroy();
    }

    _ring(entry, x, y, second) {
      if (!this.scene || !this.entries.includes(entry)) return;
      const limit = NINJA_CONFIG.SPECIAL_PRESENTATION.maxRings;
      while (this.rings.length >= limit) {
        const old = this.rings[0];
        const owner = this.entries.find((e) => e.rings.has(old));
        if (owner) this._removeRing(owner, old);
        else this.rings.shift();
      }
      const critical = entry.type === "critical";
      const ring = this.scene.add.graphics().setPosition(x, y).setDepth((this.options.depth || 650) - 5);
      ring.lineStyle(second ? 1.35 : critical ? 2.1 : 2.4,
        critical ? 0xffe6a6 : 0xa6efff, second ? .40 : critical ? .73 : .68);
      ring.strokeCircle(0, 0, second ? 42 : critical ? 32 : 36);
      ring.setScale(second ? .92 : .78);
      this.rings.push(ring);
      entry.rings.add(ring);
      this._state(entry, second ? "ring2" : "ring1");
      this._tween(entry, { targets: ring, scale: second ? 1.6 : critical ? 1.42 : 1.55,
        alpha: 0, duration: second ? 255 : 215, ease: "Quad.easeOut",
        onComplete: () => this._removeRing(entry, ring) });
    }

    _remove(entry) {
      const index = this.entries.indexOf(entry);
      if (index < 0) return;
      this.entries.splice(index, 1);
      for (const timer of entry.timers) timer.remove(false);
      entry.timers.clear();
      for (const tween of entry.tweens) tween.stop();
      entry.tweens.clear();
      for (const ring of Array.from(entry.rings)) this._removeRing(entry, ring);
      for (const object of entry.objects) if (object && object.active) object.destroy();
      this._state(entry, "end");
    }

    _position(type, opts, offset) {
      const x = Number.isFinite(Number(opts.x)) ? Number(opts.x) : NINJA_CONFIG.WIDTH / 2;
      const y = Number.isFinite(Number(opts.y)) ? Number(opts.y) : 285;
      const displacedX = x + (offset ? (offset % 2 ? 20 : -20) : 0);
      const displacedY = y + (offset ? (offset % 2 ? -18 : 16) : 0);
      const safeTopY = Math.max(205, Math.min(NINJA_CONFIG.HEIGHT - 165,
        Number(this.options.safeTopY) || 205));
      return { x: Math.max(type === "issen" ? 252 : 155,
        Math.min(NINJA_CONFIG.WIDTH - (type === "issen" ? 252 : 155), displacedX)),
      y: Math.max(safeTopY, Math.min(NINJA_CONFIG.HEIGHT - 165, displacedY)) };
    }

    _present(type, input) {
      if (!this.scene) return false;
      const opts = input || {};
      const zone = Boolean(opts.zoneActive);
      const priority = type === "critical" ? 1 : zone ? 3 : 2;
      if (type === "critical" && this.entries.some((entry) => entry.priority >= 2)) return false;
      if (type === "issen") {
        for (const entry of this.entries.slice()) {
          if (entry.priority > priority) return false;
          this._remove(entry); // 一閃は同じスワイプの会心より優先。新しい一閃は古い表示を整理。
        }
      } else {
        const criticals = this.entries.filter((entry) => entry.type === "critical");
        if (criticals.length >= NINJA_CONFIG.SPECIAL_PRESENTATION.maxCritical) this._remove(criticals[0]);
      }
      while (this.entries.length >= NINJA_CONFIG.SPECIAL_PRESENTATION.maxLabels) this._remove(this.entries[0]);
      const reduced = opts.reducedMotion == null ? Boolean(this.options.reducedMotion) : Boolean(opts.reducedMotion);
      const base = type === "critical" ? NINJA_CONFIG.HIT_LABEL_CRITICAL : NINJA_CONFIG.HIT_LABEL_ISSEN;
      const tuning = this.options.tuning || {};
      const total = type === "critical" ? tuning.criticalTotalMs : tuning.issenTotalMs;
      const hold = type === "critical" ? tuning.criticalHoldMs : tuning.issenHoldMs;
      const cfg = { width: base.width, height: base.height, entryMs: base.entryMs,
        holdMs: Number.isFinite(hold) ? hold : base.holdMs,
        alpha: Number.isFinite(type === "critical" ? tuning.criticalEffectAlpha : tuning.issenEffectAlpha)
          ? (type === "critical" ? tuning.criticalEffectAlpha : tuning.issenEffectAlpha) : base.alpha };
      cfg.exitMs = Math.max(60, (Number.isFinite(total) ? total : base.entryMs + base.holdMs + base.exitMs) -
        cfg.entryMs - cfg.holdMs);
      const pos = this._position(type, opts, type === "critical" ? this.sequence % 2 : 0);
      const angle = Number.isFinite(opts.swipeAngle) ? opts.swipeAngle : 0;
      const ux = Math.cos(angle), uy = Math.sin(angle);
      const entryDistance = reduced ? 7 : Number.isFinite(tuning.issenEntryDistance) ?
        tuning.issenEntryDistance : NINJA_CONFIG.SPECIAL_PRESENTATION.entryDistance;
      const startX = type === "issen" ? pos.x - ux * entryDistance : pos.x;
      const startY = type === "issen" ? pos.y - uy * entryDistance : pos.y;
      const key = "hit_label_" + type;
      let image = null;
      if (this.scene.textures.exists(key)) {
        image = this.scene.add.image(startX, startY, key).setOrigin(.5)
          .setDisplaySize(cfg.width, cfg.height).setAlpha(0).setDepth((this.options.depth || 650) - 7);
        // setDisplaySizeで決めた倍率を保持する。setScale(.72)単独では原寸へ戻ってしまう。
        const baseX = image.scaleX, baseY = image.scaleY;
        image.setScale(baseX * (reduced ? 1 : type === "critical" ? .72 : .91),
          baseY * (reduced ? 1 : type === "critical" ? .72 : .91));
        if (type === "issen") image.setRotation(angle);
        image.__baseScale = { x: baseX, y: baseY };
      }
      const title = this.scene.add.text(startX, startY,
        type === "critical" ? "会心！" : "一閃！", {
          fontFamily: window.MapSymbolNinja.UI.fontFamily,
          fontSize: type === "critical" ? "42px" : zone ? "47px" : "52px",
          fontStyle: "bold", color: type === "critical" ? "#fff5cf" : "#f1fdff",
          stroke: type === "critical" ? "#422819" : "#071c34",
          strokeThickness: type === "critical" ? 9 : 11
        }).setOrigin(.5).setAlpha(0).setScale(reduced ? 1 : type === "critical" ? .8 : .85).setDepth(this.options.depth || 650);
      const subtitle = opts.subtitle ? this.scene.add.text(startX, startY + 52,
        String(opts.subtitle), { fontFamily: window.MapSymbolNinja.UI.fontFamily,
          fontSize: "22px", fontStyle: "bold", color: type === "critical" ? "#ffe9a8" : "#c9f3ff",
          stroke: "#071b31", strokeThickness: 6 }).setOrigin(.5).setAlpha(0).setDepth((this.options.depth || 650) + 1) : null;
      const entry = { id: ++this.sequence, type, priority, label: title.text,
        objects: [image, title, subtitle].filter(Boolean), rings: new Set(),
        timers: new Set(), tweens: new Set() };
      this.entries.push(entry);
      this.peak = Math.max(this.peak, this.entries.length);
      this._state(entry, "entry");
      if (image) this._tween(entry, { targets: image, alpha: cfg.alpha * (zone ? .8 : 1),
        x: pos.x, y: pos.y,
        scaleX: image.__baseScale.x * (type === "critical" && !reduced ?
          (Number.isFinite(tuning.criticalPopScale) ? tuning.criticalPopScale : 1.08) : 1),
        scaleY: image.__baseScale.y * (type === "critical" && !reduced ?
          (Number.isFinite(tuning.criticalPopScale) ? tuning.criticalPopScale : 1.08) : 1),
        duration: cfg.entryMs, ease: "Quad.easeOut" });
      this._tween(entry, { targets: title, alpha: 1, x: pos.x, y: pos.y,
        scale: reduced ? 1 : Number.isFinite(tuning.labelScale) ? tuning.labelScale : 1.05,
        duration: cfg.entryMs, ease: "Quad.easeOut" });
      if (subtitle) this._tween(entry, { targets: subtitle, alpha: 1, x: pos.x,
        y: pos.y + 52, duration: cfg.entryMs });
      if (tuning.ringEnabled !== false) this._later(entry, type === "critical" ? 60 : 55,
        () => this._ring(entry, pos.x, pos.y, false));
      if (type === "issen" && !reduced && tuning.ringEnabled !== false &&
        tuning.secondRingEnabled !== false) this._later(entry, 130,
        () => this._ring(entry, pos.x, pos.y, true));
      this._later(entry, cfg.entryMs, () => this._state(entry, "hold"));
      this._later(entry, cfg.entryMs + cfg.holdMs, () => {
        this._state(entry, "exit");
        const drift = reduced ? 6 : type === "issen" ?
          (Number.isFinite(tuning.issenExitDistance) ? tuning.issenExitDistance :
            NINJA_CONFIG.SPECIAL_PRESENTATION.exitDistance) : 8;
        for (const object of entry.objects) {
          this._tween(entry, { targets: object, alpha: 0,
            x: object.x + (type === "issen" ? ux * drift : 0),
            y: object.y + (type === "issen" ? uy * drift : -drift),
            duration: cfg.exitMs, ease: "Quad.easeIn" });
        }
      });
      this._later(entry, cfg.entryMs + cfg.holdMs + cfg.exitMs, () => this._remove(entry));
      return true;
    }

    presentCritical(options) { return this._present("critical", options); }
    presentIssen(options) { return this._present("issen", options); }
    update(_delta) { /* PhaserのScene Timer/Tweenで進む。世界のHitStop更新とは独立。 */ }
    reset() {
      for (const entry of this.entries.slice()) this._remove(entry);
      this.rings.length = 0;
      this.peak = 0;
    }
    destroy() {
      this.reset();
      this.scene = null;
      this.options = null;
    }
  }
  window.NinjaCore.SpecialHitPresentationSystem = SpecialHitPresentationSystem;
})();
