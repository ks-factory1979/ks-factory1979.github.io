(function () {
  "use strict";
  const app = MapSymbolNinja;
  // Use gameplay VFX above product art, preserving the procedural shader camera.
  class ShopPreviewSurface {
    constructor(parent, onReady, onResize) {
      this.parent = parent; this.scene = null; this.disposed = false; this.onResize = onResize;
      this.mount = document.createElement("div"); this.mount.className = "shop-preview-surface";
      this.mount.setAttribute("aria-hidden", "true"); parent.append(this.mount);
      const owner = this;
      class PreviewScene extends Phaser.Scene {
        constructor() { super({ key: "ShopPreviewSurface" }); }
        create() {
          if (owner.disposed) return;
          owner.scene = this; this.input.enabled = false;
          owner.fit(); onReady(this);
        }
      }
      this.game = new Phaser.Game({
        type: Phaser.AUTO, parent: this.mount, width: 1366,
        height: 768, transparent: true, banner: false,
        audio: { noAudio: true }, input: { keyboard: false, mouse: false, touch: false, gamepad: false },
        render: { antialias: true, transparent: true }, scale: { mode: Phaser.Scale.NONE },
        scene: [PreviewScene]
      });
      this.observer = new ResizeObserver(() => this.fit()); this.observer.observe(parent);
    }
    fit() {
      if (this.disposed || !this.scene) return;
      const rect = this.parent.getBoundingClientRect(), width = Math.max(1, Math.round(this.parent.clientWidth || rect.width)),
        height = Math.max(1, Math.round(this.parent.clientHeight || rect.height));
      const scale = Math.min(width / 800, height / 445);
      this.scene.previewScale = scale;
      this.scene.game.canvas.style.transform = "translate(" + (width / 2 - 683 * scale) + "px," +
        (height / 2 - 467.5 * scale) + "px) scale(" + scale + ")";
      if (this.onResize) this.onResize();
    }
    destroy() {
      if (this.disposed) return;
      this.disposed = true; this.observer.disconnect(); this.game.destroy(true); this.mount.remove();
      this.scene = null;
    }
  }
  app.ShopPreviewSurface = ShopPreviewSurface;
})();
