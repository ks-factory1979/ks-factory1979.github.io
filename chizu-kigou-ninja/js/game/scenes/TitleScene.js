(function () {
  "use strict";
  class TitleScene extends Phaser.Scene {
    constructor() { super({ key: "TitleScene" }); }
    init(data) {
      this.transitionLock = false; this.navigation = null; this.unlockScroll = null;
      this.unlockPresentations = MapSymbolNinja.UI.copyUnlockRequests(data && data.unlockPresentations);
    }
    create() {
      const UI = MapSymbolNinja.UI, keys = MapSymbolNinja.AssetKeys;
      window.__NINJA_QA.currentScene = "title";
      UI.enterScene(this);
      UI.coverBackground(this, keys.TITLE_BACKGROUND, .08);
      const logo = UI.asset(this, keys.TITLE_LOGO, 683, 275, 880, 100);
      if (!window.__NINJA_REDUCED_MOTION) {
        const scale = logo.scaleX;
        logo.setAlpha(0).setScale(scale * .96);
        this.tweens.add({ targets: logo, alpha: 1, scale, duration: 300, ease: "Quad.easeOut" });
      }
      const start = new MapSymbolNinja.UIButton(this, 683, 521, 440, "はじめる",
        () => UI.transition(this, "TrainingSelectScene"), { fontSize: 40 });
      const book = new MapSymbolNinja.UIButton(this, 366, 653, 250, "忍術帖",
        () => UI.transition(this, "NinjutsuBookScene", { from: "TitleScene" }), { fontSize: 32 });
      const sword = new MapSymbolNinja.UIButton(this, 683, 653, 250, "刀ショップ",
        () => UI.transition(this, "SwordSelectScene"), { fontSize: 32 });
      this.swordButton = sword;
      const howto = new MapSymbolNinja.UIButton(this, 1000, 653, 250, "あそびかた",
        () => UI.transition(this, "HowToScene"), { fontSize: 32 });
      const soundSettings = new MapSymbolNinja.UIButton(this, 1230, 720, 202, "♪ 音の設定",
        () => MapSymbolNinja.SoundSettingsPanel.open(this), { fontSize: 22, depth: 950 });
      const saveInfo = new MapSymbolNinja.UIButton(this, 150, 40, 240, "記録の保存",
        () => MapSymbolNinja.SaveInfoPanel.open(this), { fontSize: 23, depth: 950 });
      this.saveInfoButton = saveInfo;
      this.add.text(683, 592, "みんなで使う端末は「記録の保存」を見てね", {
        fontFamily:UI.fontFamily, fontSize:"18px", color:"#f4f2d4", stroke:"#07182c", strokeThickness:3
      }).setOrigin(.5).setDepth(110);
      const buttons = [start, book, sword, howto, saveInfo, soundSettings];
      if (NINJA_CONFIG.DEV_PANEL_ENABLED) {
        this.settingsButton = new MapSymbolNinja.UIButton(this, 122, 720, 202, "⚙ 設定",
          () => MapSymbolNinja.DevPanel.open(this), { fontSize: 22, depth: 950 });
        buttons.push(this.settingsButton);
      } else this.settingsButton = null;
      // 忍術帖と同じ重複キー対策で、設定も1回のキー操作で選べる。
      this.navigation = new MapSymbolNinja.BookButtonNavigation(this, buttons);
      UI.keepMenuTouchTargets(this, buttons);
      UI.attachUnlockScroll(this);
      this.utilityButtons = UI.createUtilityButtons(this);
      // 解放Overlayへ開発DOMを重ねない。通常の調整画面への戻り方は維持する。
      if (window.__NINJA_OPEN_DEV_PANEL && NINJA_CONFIG.DEV_PANEL_ENABLED && !this.unlockPresentations.length) {
        window.__NINJA_OPEN_DEV_PANEL = false;
        this.time.delayedCall(80, () => MapSymbolNinja.DevPanel.open(this));
      }
      this.add.text(1340, 744, "v0.4.9", {
        fontFamily: UI.fontFamily, fontSize: "15px", color: "#bdd0df"
      }).setOrigin(1, .5);
      UI.announce("地図記号忍者。はじめる、忍術帖、刀ショップ、あそびかたを選んでね。みんなで使う端末は、記録の保存から案内を読んでね。");
      UI.presentUnlocks(this, this.unlockPresentations);
    }
  }
  MapSymbolNinja.TitleScene = TitleScene;
})();

