(function () {
  "use strict";
  window.MapSymbolNinja = window.MapSymbolNinja || {};

  // 画像と文字をまとめる。PNGの透明余白は押せる範囲に含めない。
  class UIButton {
    constructor(scene, x, y, width, label, onClick, options) {
      const opts = options || {};
      const keys = MapSymbolNinja.AssetKeys;
      this.scene = scene;
      this.onClick = onClick;
      this.x = x; this.y = y; this.width = width;
      this.height = width * 490 / 1930;
      this.enabled = true; this.pressed = false; this.focused = false; this.hovered = false;
      this.container = scene.add.container(x, y).setDepth(opts.depth || MapSymbolNinja.Depth.HUD);
      this.plate = scene.add.image(0, 0, keys.BUTTON_NORMAL);
      this.text = scene.add.text(0, 0, label, {
        fontFamily: MapSymbolNinja.UI.fontFamily, fontSize: (opts.fontSize || 32) + "px",
        fontStyle: "bold", color: "#f4fcff", stroke: "#092345", strokeThickness: 4,
        align: "center"
      }).setOrigin(.5);
      this.visual = scene.add.container(0, 0).add([this.plate, this.text]);
      this.container.add(this.visual).setSize(this.width, this.height);
      this.container.setInteractive(
        new Phaser.Geom.Rectangle(-6, -4, this.width + 12, this.height + 8),
        Phaser.Geom.Rectangle.Contains
      );
      this.container.input.cursor = "pointer";
      this.container.on("pointerover", () => { this.hovered = true; this._draw(); });
      this.container.on("pointerout", () => { this.hovered = false; this.pressed = false; this._draw(); });
      this.container.on("pointerdown", () => {
        if (!this.enabled || scene.transitionLock) return;
        this.pressed = true; this._draw();
      });
      this.container.on("pointerup", () => {
        const activate = this.pressed;
        this.pressed = false; this._draw();
        if (activate) this.activate();
      });
      this.releaseOutside = () => { this.pressed = false; this._draw(); };
      scene.input.on("pointerup", this.releaseOutside);
      scene.input.on("pointerupoutside", this.releaseOutside);
      this.onShutdown = () => this.destroy();
      scene.events.once("shutdown", this.onShutdown);
      this._draw();
    }

    _draw() {
      if (!this.scene || !this.plate.active) return;
      const k = MapSymbolNinja.AssetKeys;
      this.plate.setTexture(this.pressed ? k.BUTTON_PRESSED :
        this.focused || this.hovered ? k.BUTTON_SELECTED : k.BUTTON_NORMAL);
      // 各状態は同じ本体サイズに合わせる。素材自体は変形・加工しない。
      const source = this.plate.texture.getSourceImage();
      const scale = this.width / 1930;
      this.plate.setScale(scale).setPosition(0, (source.height / 2 - 356) * scale);
      // 押下中もHitAreaは固定。見た目だけを沈ませ、端のタップを取りこぼさない。
      this.visual.setScale(this.pressed ? .97 : 1).setY(this.pressed ? 3 : 0);
      this.container.setAlpha(this.enabled ? 1 : .72);
    }

    setFocused(value) { this.focused = Boolean(value); this._draw(); return this; }
    setEnabled(value) {
      this.enabled = Boolean(value); this.pressed = false;
      if (this.container.input) this.container.input.enabled = this.enabled;
      this._draw(); return this;
    }
    setLabel(value) { this.text.setText(value); return this; }
    activate() {
      if (!this.enabled || !this.scene || !this.scene.input.enabled || this.scene.transitionLock) return;
      this.onClick();
    }
    destroy() {
      if (!this.scene) return;
      this.scene.input.off("pointerup", this.releaseOutside);
      this.scene.input.off("pointerupoutside", this.releaseOutside);
      this.scene.events.off("shutdown", this.onShutdown);
      if (this.container.active) this.container.destroy(true);
      this.scene = null; this.onClick = null;
    }
  }

  class UIButtonNavigation {
    constructor(scene, buttons) {
      this.scene = scene; this.buttons = buttons; this.index = 0;
      this.enabled = true;
      this.onKey = (event) => {
        if (!this.enabled || !scene.input.enabled || scene.transitionLock || event.repeat) return;
        if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Enter", " "].includes(event.key)) {
          event.preventDefault();
          if (event.key === "Enter" || event.key === " ") this.buttons[this.index].activate();
          else this.select(this.index + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1));
        }
      };
      if (scene.input.keyboard) scene.input.keyboard.on("keydown", this.onKey);
      this.onShutdown = () => this.destroy();
      scene.events.once("shutdown", this.onShutdown);
      this.select(0);
    }
    select(index) {
      this.index = (index + this.buttons.length) % this.buttons.length;
      this.buttons.forEach((button, i) => button.setFocused(i === this.index));
    }
    setEnabled(value) { this.enabled = Boolean(value); this.buttons.forEach((b) => b.setEnabled(value)); }
    destroy() {
      if (!this.scene) return;
      if (this.scene.input.keyboard) this.scene.input.keyboard.off("keydown", this.onKey);
      this.scene.events.off("shutdown", this.onShutdown);
      this.buttons.forEach((b) => b.destroy());
      this.buttons = []; this.scene = null;
    }
  }
  MapSymbolNinja.UIButton = UIButton;
  MapSymbolNinja.UIButtonNavigation = UIButtonNavigation;
})();
