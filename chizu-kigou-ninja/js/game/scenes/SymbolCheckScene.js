(function () {
  "use strict";

  window.MapSymbolNinja = window.MapSymbolNinja || {};

  class SymbolCheckScene extends Phaser.Scene {
    constructor() {
      super({ key: "SymbolCheckScene" });
    }

    init(data) { this.stage = data && [1, 2, 3, 4].includes(data.stage) ? data.stage : 1; }

    create() {
      const UI = MapSymbolNinja.UI;
      window.__NINJA_QA.currentScene = "symbol-check";
      window.__NINJA_QA.symbolCheckSceneShown = true;
      UI.drawBackground(this, { dim: 0.2 });

      this.add.text(NINJA_CONFIG.WIDTH / 2, 78, "地図記号 表示確認", {
        fontFamily: UI.fontFamily,
        fontSize: "46px",
        fontStyle: "bold",
        color: "#fff3c4",
        stroke: "#06101e",
        strokeThickness: 8
      }).setOrigin(0.5);

      this.add.text(NINJA_CONFIG.WIDTH / 2, 137, "5枚すべてに、濃い黒の記号が見えればOKです", {
        fontFamily: UI.fontFamily,
        fontSize: "23px",
        color: "#cfeaff"
      }).setOrigin(0.5);

      [1, 2, 3, 4].forEach((stage, index) => UI.createButton(this, 293 + 260 * index, 205, 230, 58,
        MapSymbolNinja.StageData.getStage("genin", stage).displayName + (stage === this.stage ? " ●" : ""),
        () => this.scene.restart({ stage }), { fontSize: 24 }));
      const stageSymbols = MapSymbolNinja.SYMBOLS.filter((symbol) => symbol.rank === "genin" && symbol.stage === this.stage);
      window.__NINJA_QA.symbolCheckStage = this.stage;
      window.__NINJA_QA.symbolCheckIds = stageSymbols.map((symbol) => symbol.id);
      const startX = 179;
      const spacing = 252;
      stageSymbols.forEach((symbol, index) => {
        const x = startX + spacing * index;
        const renderCheck = window.__NINJA_QA.symbolRenderCheck[symbol.id];
        const cardCreated = window.__NINJA_QA.cardTexturesCreated[symbol.id];
        const passed = Boolean(cardCreated && renderCheck && renderCheck.visiblePixels);

        this.add.image(x, 340, "card_" + symbol.id).setDisplaySize(170, 170).setDepth(20);
        this.add.text(x, 461, symbol.officialName, {
          fontFamily: UI.fontFamily,
          fontSize: symbol.name.length > 15 ? "18px" : symbol.name.length > 9 ? "21px" : "25px",
          wordWrap: { width: 235, useAdvancedWrap: true },
          fontStyle: "bold",
          color: "#fff5c7",
          align: "center"
        }).setOrigin(0.5);
        this.add.text(x, 521, symbol.id, {
          fontFamily: "monospace",
          fontSize: "14px",
          wordWrap: { width: 235, useAdvancedWrap: true },
          color: "#a9cae5"
        }).setOrigin(0.5);
        this.add.text(x, 553, passed ? "● PIXEL OK" : "● PIXEL NG", {
          fontFamily: "monospace",
          fontSize: "16px",
          fontStyle: "bold",
          color: passed ? "#83efb1" : "#ff9c8f"
        }).setOrigin(0.5);
      });

      UI.createButton(this, NINJA_CONFIG.WIDTH / 2, 657, 300, 72, "タイトルへ", () => {
        window.ninjaAudio.unlock();
        window.ninjaAudio.play("ui");
        this.scene.start("TitleScene");
      });
    }
  }

  window.MapSymbolNinja.SymbolCheckScene = SymbolCheckScene;
})();
