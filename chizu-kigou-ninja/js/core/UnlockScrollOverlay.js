(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fraction = (t, start, duration) => clamp((t - start) / duration, 0, 1);
  const out = (p) => 1 - Math.pow(1 - p, 3); // Cubic.Out
  const numeric = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;

  // Cosmetic専用。スコア・解放条件・タイマー・物理・Spawnを変更しない。
  // 自前Tween/DelayedCallを持たず、Sceneのupdateで短いタイムラインを進める。
  class UnlockScrollOverlay {
    constructor(scene, options) {
      this.scene = scene;
      this.options = options || {};
      this.active = false;
      this.destroyed = false;
      this._onUpdate = (_time, delta) => this.update(delta);
      this._onShutdown = () => this.destroy();
      scene.events.once("shutdown", this._onShutdown);
      scene.events.once("destroy", this._onShutdown);
    }

    show(options) {
      if (this.destroyed || this.active || !this.scene || this.scene.transitionLock) return false;
      const opts = options || {}, cfg = NinjaCore.UnlockScrollConfig;
      this.variant = opts.variant === "rank" ? "rank" : "stage";
      this.profile = Object.assign({}, cfg.profiles[this.variant]);
      this.profile.holdMs = clamp(numeric(opts.holdDuration, this.profile.holdMs), 400, 3000);
      this.reducedMotion = Boolean(opts.reducedMotion === undefined ? this.options.reducedMotion : opts.reducedMotion);
      this.request = Object.assign({}, opts, {
        title: String(opts.title || "あらたな修行").replace(/[\r\n]/g, " ").slice(0, 60),
        subtitle: String(opts.subtitle || "かいほう！").replace(/[\r\n]/g, " ").slice(0, 60)
      });
      this.autoClose = opts.autoClose !== false;
      this.elapsed = 0; this.closingAt = null; this.openNotified = false; this.stampNotified = false;
      this.closeAt = this.profile.stampAt + this.profile.stampMs + this.profile.holdMs;
      try { this._create(); }
      catch (error) { this._disposeObjects(); this.request = null; throw error; }
      this.active = true;
      this._lockInput();
      this.scene.events.on("update", this._onUpdate);
      this._render(0);
      return true;
    }

    _image(key) {
      const texture = this.scene.textures.get(key);
      if (!this.scene.textures.exists(key)) throw new Error("巻物素材がありません: " + key);
      return this.scene.add.image(0, 0, key, texture.has("content") ? "content" : undefined);
    }

    _create() {
      const cfg = NinjaCore.UnlockScrollConfig, p = cfg.parts, profile = this.profile;
      const scene = this.scene, keys = this.options.keys;
      const width = numeric(this.options.width, 1366), height = numeric(this.options.height, 768);
      this.root = scene.add.container(0, 0).setDepth(numeric(this.options.depth, cfg.depth));
      this.dim = scene.add.rectangle(0, 0, width, height, 0x030a18, 1).setOrigin(0, 0);
      this.scroll = scene.add.container(width / 2, height / 2);
      this.root.add([this.dim, this.scroll]);
      this.paper = this._image(keys.center).setOrigin(p.center.originX, p.center.originY);
      this.left = this._image(keys.left).setOrigin(p.left.originX, p.left.originY);
      this.right = this._image(keys.right).setOrigin(p.right.originX, p.right.originY);
      this.rollerScale = profile.paperHeight / p.rollerPaperHeight;
      this.left.setScale(this.rollerScale); this.right.setScale(this.rollerScale);
      this.paperDisplayHeight = profile.paperHeight * p.center.height / p.centerPaperHeight;
      const outerWidth = profile.paperWidth + 2 * 205 * this.rollerScale;
      this.layoutScale = Math.min(1, width * .88 / outerWidth, height * .76 / (1110 * this.rollerScale));
      const style = { fontFamily: this.options.fontFamily || "sans-serif", fontStyle: "bold",
        color: "#172b43", stroke: "#fff2d7", strokeThickness: 2, align: "center" };
      this.title = scene.add.text(0, -profile.paperHeight * .20, this.request.title,
        Object.assign({}, style, { fontSize: profile.titleSize + "px" })).setOrigin(.5);
      this.subtitle = scene.add.text(-24, profile.paperHeight * .13, this.request.subtitle,
        Object.assign({}, style, { fontSize: profile.subtitleSize + "px", color: "#742a24" })).setOrigin(.5);
      this._fitText(this.title, profile.titleSize, profile.paperWidth - 130);
      this._fitText(this.subtitle, profile.subtitleSize, profile.paperWidth - 240);
      this.titleY = this.title.y; this.subtitleY = this.subtitle.y;
      this.stamp = this._image(keys.stamp);
      this.stampScale = profile.stampWidth / this.stamp.width;
      this.stamp.setPosition(profile.paperWidth / 2 - profile.stampWidth * .68, profile.paperHeight * .28);
      this.stamp.setRotation(clamp(numeric(this.request.stampRotation, -.10), -.35, .35));
      if (Number.isFinite(this.request.stampTint)) this.stamp.setTint(this.request.stampTint);
      this.halo = scene.add.ellipse(this.stamp.x, this.stamp.y, profile.stampWidth * 1.55,
        profile.stampWidth * 1.55, 0xffd680, 1);
      this.scroll.add([this.paper, this.halo, this.left, this.right, this.title, this.subtitle, this.stamp]);
    }

    _fitText(text, initialSize, maxWidth) {
      let size = initialSize;
      while (text.width > maxWidth && size > 28) text.setFontSize(--size);
      // 極端に長い呼び出しも枠内に保つ。通常の文言では縮小しない。
      if (text.width > maxWidth) text.setScale(maxWidth / text.width);
    }

    _lockInput() {
      const scene = this.scene, navigation = scene.navigation;
      this.inputState = { input: scene.input.enabled,
        keyboard: scene.input.keyboard ? scene.input.keyboard.enabled : undefined,
        navigation: navigation ? navigation.enabled : undefined,
        buttons: navigation ? navigation.buttons.map((button) => button.enabled) : [] };
      scene.input.enabled = false;
      if (scene.input.keyboard) {
        scene.input.keyboard.enabled = false;
        if (scene.input.keyboard.resetKeys) scene.input.keyboard.resetKeys();
      }
      if (navigation) navigation.setEnabled(false); // 押下途中の状態も解消する。
    }

    _restoreInput() {
      const scene = this.scene, saved = this.inputState;
      if (!scene || !saved) return;
      scene.input.enabled = saved.input;
      if (scene.input.keyboard) {
        if (scene.input.keyboard.resetKeys) scene.input.keyboard.resetKeys();
        scene.input.keyboard.enabled = saved.keyboard;
      }
      if (scene.navigation) {
        scene.navigation.enabled = saved.navigation;
        scene.navigation.buttons.forEach((button, i) => {
          if (button.scene) button.setEnabled(Boolean(saved.buttons[i]));
        });
      }
      this.inputState = null;
    }

    update(delta) {
      if (!this.active) return;
      this.elapsed += Math.max(0, numeric(delta, 0));
      const p = this.profile;
      if (this.closingAt === null) {
        if (!this.openNotified && this.elapsed >= p.dimMs) {
          this.openNotified = true; this._hook("open");
        }
        if (!this.active) return;
        if (!this.stampNotified && this.elapsed >= p.stampAt) {
          this.stampNotified = true; this._hook("stamp");
        }
        if (!this.active) return;
        if (this.autoClose && this.elapsed >= this.closeAt) this.closingAt = this.closeAt;
      }
      this._render(this.elapsed);
      if (this.closingAt !== null && this.elapsed >= this.closingAt + p.exitMs) this._finish();
    }

    _render(elapsed) {
      const cfg = NinjaCore.UnlockScrollConfig, p = this.profile;
      const t = this.closingAt === null ? elapsed : Math.min(elapsed, this.closingAt);
      const exit = this.closingAt === null ? 0 : fraction(elapsed, this.closingAt, p.exitMs);
      this.root.setAlpha(1 - exit);
      this.dim.setAlpha(p.dimAlpha * fraction(t, 0, p.dimMs));
      const open = out(fraction(t, p.dimMs, p.openMs));
      const paperWidth = 40 + (p.paperWidth - 40) * open;
      this.paper.setDisplaySize(paperWidth, this.paperDisplayHeight);
      this.left.x = -paperWidth / 2; this.right.x = paperWidth / 2;
      // 閉じた時に、片方の紙の舌がもう一方の木軸を覆うことを防ぐ。
      const leftCut = Math.min(cfg.parts.left.width, 191 + paperWidth / 2 / this.rollerScale);
      const rightCut = Math.max(0, 273 - paperWidth / 2 / this.rollerScale);
      this.left.setCrop(0, 0, leftCut, cfg.parts.left.height);
      this.right.setCrop(rightCut, 0, cfg.parts.right.width - rightCut, cfg.parts.right.height);
      const entry = this.reducedMotion ? 1 : .94 + .06 * out(fraction(t, p.dimMs, 110));
      this.scroll.setScale(this.layoutScale * entry * (this.reducedMotion ? 1 : 1 - exit * .025));
      this.title.setAlpha(fraction(t, p.titleAt, 130));
      this.subtitle.setAlpha(fraction(t, p.subtitleAt, 140));
      this.title.y = this.titleY + (this.reducedMotion ? 0 : 5 * (1 - this.title.alpha));
      this.subtitle.y = this.subtitleY + (this.reducedMotion ? 0 : 5 * (1 - this.subtitle.alpha));
      const stampAge = t - p.stampAt, hit = clamp(stampAge / p.stampMs, 0, 1);
      let stampPop = hit < .55 ? 1.25 + (.92 - 1.25) * out(hit / .55) :
        .92 + .08 * out((hit - .55) / .45);
      if (this.reducedMotion) stampPop = 1;
      this.stamp.setScale(this.stampScale * stampPop).setAlpha(fraction(t, p.stampAt, 55));
      this.halo.setAlpha(this.reducedMotion || stampAge < 0 ? 0 :
        (this.variant === "rank" ? .14 : .08) * Math.max(0, 1 - stampAge / 150));
      this._publish({ active: true, variant: this.variant, elapsedMs: elapsed,
        phase: exit > 0 ? "exit" : t < p.dimMs ? "entry" : t < p.dimMs + p.openMs ? "opening" :
          t < p.stampAt ? "text" : t < p.stampAt + p.stampMs ? "stamp" : "hold",
        paperWidth, leftX: this.left.x, rightX: this.right.x,
        titleAlpha: this.title.alpha, subtitleAlpha: this.subtitle.alpha,
        stampAlpha: this.stamp.alpha, stampScale: stampPop,
        totalMs: this.closeAt + p.exitMs, inputBlocked: !this.scene.input.enabled });
    }

    _call(fn, payload) {
      if (typeof fn !== "function") return;
      try {
        const result = fn(payload);
        if (result && typeof result.catch === "function") result.catch((error) => console.error("巻物演出フック:", error));
      } catch (error) { console.error("巻物演出フック:", error); }
    }
    _hook(name) {
      const payload = { variant: this.variant, title: this.request.title, elapsedMs: this.elapsed };
      this._call(this.request[name === "open" ? "onOpen" : "onStamp"] || this.options[name === "open" ? "onOpen" : "onStamp"], payload);
    }
    _publish(state) { this.lastState = state; this._call(this.options && this.options.onState, state); }
    close() { if (!this.active) return false; if (this.closingAt === null) this.closingAt = this.elapsed; return true; }
    _finish() {
      const callback = this.request && this.request.onComplete;
      const result = { variant: this.variant, status: "completed" };
      this.reset();
      this._call(callback, result);
    }
    _disposeObjects() {
      if (this.root && this.root.active) this.root.destroy(true);
      for (const key of ["root", "dim", "scroll", "paper", "left", "right", "title", "subtitle", "stamp", "halo"]) {
        if (this[key] && this[key].active) this[key].destroy(); // 作成途中の失敗にも対応。
        this[key] = null;
      }
    }
    reset() {
      if (this.scene) this.scene.events.off("update", this._onUpdate);
      this.active = false;
      this._disposeObjects(); this._restoreInput();
      this.request = null; this.profile = null; this.closingAt = null;
      this._publish({ active: false, phase: "idle" });
    }
    destroy() {
      if (this.destroyed) return;
      this.reset(); this.destroyed = true;
      this.scene.events.off("shutdown", this._onShutdown);
      this.scene.events.off("destroy", this._onShutdown);
      this.scene = null; this.options = null;
    }
  }
  NinjaCore.UnlockScrollOverlay = UnlockScrollOverlay;
})();
