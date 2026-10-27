(function () {
  "use strict";
  // A whole paper row/tab is the hit target; shares keyboard navigation with the image buttons.
  class BookItemButton {
    constructor(scene, x, y, width, height, onClick) {
      this.scene = scene; this.onClick = onClick; this.enabled = true;
      this.selected = false; this.focused = false; this.hovered = false; this.pressed = false;
      this.container = scene.add.container(x, y).setDepth(110).setSize(width, height);
      this.back = scene.add.rectangle(0, 0, width, height, 0x2f6885, .03);
      this.container.add(this.back).setInteractive();
      this.container.input.cursor = "pointer";
      this.container.on("pointerover", () => { this.hovered = true; this.draw(); });
      this.container.on("pointerout", () => { this.hovered = false; this.pressed = false; this.draw(); });
      this.container.on("pointerdown", () => { if (this.enabled && !scene.transitionLock) { this.pressed = true; this.draw(); } });
      this.container.on("pointerup", () => { const pressed = this.pressed; this.pressed = false; this.draw(); if (pressed) this.activate(); });
      this.release = () => { this.pressed = false; this.draw(); };
      scene.input.on("pointerup", this.release); scene.input.on("pointerupoutside", this.release);
      this.shutdown = () => this.destroy(); scene.events.once("shutdown", this.shutdown);
      this.draw();
    }
    add(objects) { this.container.add(objects); return this; }
    draw() {
      if (!this.scene || !this.back.active) return;
      this.back.setFillStyle(0x3d7b98, this.pressed ? .25 : this.selected ? .15 : this.hovered ? .1 : .025)
        .setStrokeStyle(this.focused || this.selected ? 3 : 1, this.focused ? 0x145f8e : 0x877657, this.focused || this.selected ? .9 : .25);
    }
    setSelected(value) { this.selected = Boolean(value); this.draw(); return this; }
    setFocused(value) { this.focused = Boolean(value); this.draw(); return this; }
    setEnabled(value) { this.enabled = Boolean(value); if (this.container.input) this.container.input.enabled = this.enabled; return this; }
    activate() { if (this.enabled && this.scene && this.scene.input.enabled && !this.scene.transitionLock) this.onClick(); }
    destroy() {
      if (!this.scene) return;
      this.scene.input.off("pointerup", this.release); this.scene.input.off("pointerupoutside", this.release);
      this.scene.events.off("shutdown", this.shutdown);
      if (this.container.active) this.container.destroy(true);
      this.scene = null; this.onClick = null;
    }
  }
  class BookButtonNavigation extends MapSymbolNinja.UIButtonNavigation {
    constructor(scene, buttons) {
      super(scene, buttons);
      // Phaser may deliver the same native key event again from its queued input.
      // Handle each browser event once without changing the protected shared button code.
      if (scene.input.keyboard) {
        scene.input.keyboard.off("keydown", this.onKey);
        const handle = this.onKey, seen = new WeakSet();
        this.onKey = event => {
          if (seen.has(event)) return;
          seen.add(event); handle(event);
        };
        scene.input.keyboard.on("keydown", this.onKey);
      }
    }
  }
  MapSymbolNinja.BookItemButton = BookItemButton;
  MapSymbolNinja.BookButtonNavigation = BookButtonNavigation;
})();
