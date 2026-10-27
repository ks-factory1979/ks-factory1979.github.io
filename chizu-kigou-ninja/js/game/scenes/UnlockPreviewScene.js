(function () {
  "use strict";
  class UnlockPreviewScene extends Phaser.Scene {
    constructor() { super({ key: "UnlockPreviewScene" }); }
    init(data) {
      this.variant = data && data.variant === "unlock_rank" ? "rank" : "stage";
      this.navigation = null; this.unlockScroll = null; this.transitionLock = false;
    }
    create() {
      const UI = MapSymbolNinja.UI;
      UI.enterScene(this);
      window.__NINJA_QA.currentScene = "unlock-preview";
      UI.coverBackground(this, MapSymbolNinja.AssetKeys.GAME_BACKGROUND, .14);
      this.add.text(683, 90, "巻物解放 演出確認", { fontFamily: UI.fontFamily, fontSize: "42px",
        fontStyle: "bold", color: "#fff3d6" }).setOrigin(.5);
      this.add.text(683, 152, "表示確認専用。得点・修行の解放状態は変わりません。", {
        fontFamily: UI.fontFamily, fontSize: "24px", color: "#d0eaff" }).setOrigin(.5);
      const stage = new MapSymbolNinja.UIButton(this, 392, 684, 290, "修行解放を見る", () => this._play("stage"), { fontSize: 26 });
      const rank = new MapSymbolNinja.UIButton(this, 720, 684, 290, "巻解放を見る", () => this._play("rank"), { fontSize: 26 });
      const back = new MapSymbolNinja.UIButton(this, 1095, 684, 230, "調整へ戻る", () => {
        window.__NINJA_OPEN_DEV_PANEL = true; UI.transition(this, "TitleScene");
      }, { fontSize: 25 });
      this.navigation = new MapSymbolNinja.UIButtonNavigation(this, [stage, rank, back]);
      UI.attachUnlockScroll(this);
      const timer = this.time.delayedCall(250, () => this._play(this.variant));
      this.events.once("shutdown", () => timer.remove(false));
    }
    _play(variant) {
      this.variant = variant;
      const rank = variant === "rank";
      const started = this.showUnlockScroll({ title: rank ? "下忍 修了" : "下忍・其ノ二",
        subtitle: rank ? "中忍の巻 解放！" : "かいほう！", variant,
        onComplete: () => { window.__NINJA_QA.unlockScrollCompleteCount += 1; } });
      if (started) {
        window.__NINJA_QA.unlockPreviewVariant = variant;
        MapSymbolNinja.UI.announce(rank ? "下忍 修了。中忍の巻、解放！" : "下忍・其ノ二、かいほう！");
      }
      return started;
    }
  }
  MapSymbolNinja.UnlockPreviewScene = UnlockPreviewScene;
})();
