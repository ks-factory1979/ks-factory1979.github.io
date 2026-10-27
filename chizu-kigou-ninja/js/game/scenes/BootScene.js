(function () {
  "use strict";
  window.MapSymbolNinja = window.MapSymbolNinja || {};
  class BootScene extends Phaser.Scene {
    constructor() { super({ key: "BootScene" }); }
    create() {
      window.__NINJA_QA.currentScene = "boot";
      this.cameras.main.setBackgroundColor("#071426");
      this.scene.start("PreloadScene");
    }
  }
  MapSymbolNinja.BootScene = BootScene;
})();
