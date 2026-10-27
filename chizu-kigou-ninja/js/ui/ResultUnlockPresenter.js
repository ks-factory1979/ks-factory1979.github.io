(function () {
  "use strict";
  // Resultだけで未告知の解放を順に表示。巻物の描画・時間構造は既存Coreへ委ねる。
  class ResultUnlockPresenter {
    constructor(scene, progress) {
      this.scene = scene; this.progress = progress;
      this.active = false; this.destroyed = false; this.timer = null; this.savedInput = null;
      this.queue = []; this._onShutdown = () => this.destroy();
      scene.events.once("shutdown", this._onShutdown);
    }
    start() {
      if (this.destroyed || this.active || !this.progress.progressEnabled || this.scene.transitionLock) return false;
      this.queue = this.progress.getPendingUnlocks();
      if (!this.queue.length) return false;
      this.active = true;
      const scene = this.scene, nav = scene.navigation;
      this.savedInput = { enabled: scene.input.enabled,
        keyboard: scene.input.keyboard && scene.input.keyboard.enabled,
        navigation: nav && nav.enabled, buttons: nav ? nav.buttons.map((button) => button.enabled) : [] };
      scene.input.enabled = false;
      if (scene.input.keyboard) { scene.input.keyboard.enabled = false; if (scene.input.keyboard.resetKeys) scene.input.keyboard.resetKeys(); }
      if (nav) nav.setEnabled(false);
      this._later(MapSymbolNinja.ProgressConfig.RESULT_DELAY_MS, () => this._next());
      return true;
    }
    _later(delay, action) {
      this.timer = this.scene.time.delayedCall(delay, () => {
        this.timer = null;
        if (!this.destroyed && this.active) action();
      });
    }
    _next() {
      if (!this.progress.progressEnabled) { this._finish(); return; }
      const event = this.queue.shift();
      if (!event) { this._finish(); return; }
      const presentation = this.progress.getUnlockPresentation(event);
      const system = MapSymbolNinja.UI.attachUnlockScroll(this.scene);
      try {
        // Overlayも入力をロックする。キュー側のfalseを保存するので間の140msも操作は復帰しない。
        if (!presentation || !system.show(Object.assign(presentation, { onComplete: () => {
          if (this.destroyed || !this.active) return;
          this.progress.markUnlockAnnounced(event.id);
          window.__NINJA_QA.unlockScrollCompleteCount += 1;
          if (this.queue.length) this._later(MapSymbolNinja.ProgressConfig.UNLOCK_GAP_MS, () => this._next());
          else this._finish();
        } }))) this._finish();
      } catch (_error) {
        system.reset();
        console.warn("[Progress] unlock presentation unavailable; retry on next result");
        this._finish();
      }
    }
    _finish() {
      this.active = false; this.queue.length = 0;
      const scene = this.scene, saved = this.savedInput;
      if (scene && saved) {
        scene.input.enabled = saved.enabled;
        if (scene.input.keyboard) {
          if (scene.input.keyboard.resetKeys) scene.input.keyboard.resetKeys();
          scene.input.keyboard.enabled = saved.keyboard;
        }
        if (scene.navigation) {
          scene.navigation.enabled = saved.navigation;
          scene.navigation.buttons.forEach((button, index) => { if (button.scene) button.setEnabled(Boolean(saved.buttons[index])); });
        }
      }
      this.savedInput = null;
    }
    destroy() {
      if (this.destroyed) return;
      if (this.timer) { this.timer.remove(false); this.timer = null; }
      if (this.active && this.scene && this.scene.unlockScroll) this.scene.unlockScroll.reset();
      this._finish(); this.destroyed = true;
      if (this.scene) this.scene.events.off("shutdown", this._onShutdown);
      this.scene = null; this.progress = null;
    }
  }
  MapSymbolNinja.ResultUnlockPresenter = ResultUnlockPresenter;
})();
