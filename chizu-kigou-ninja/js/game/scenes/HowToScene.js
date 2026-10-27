(function () {
  "use strict";
  class HowToScene extends Phaser.Scene {
    constructor() { super({ key: "HowToScene" }); }
    init() { this.transitionLock = false; this.navigation = null; }
    create() {
      const UI = MapSymbolNinja.UI, keys = MapSymbolNinja.AssetKeys;
      window.__NINJA_QA.currentScene = "howto";
      UI.enterScene(this);
      UI.coverBackground(this, keys.TITLE_BACKGROUND, .48);
      UI.asset(this, keys.PANEL_LARGE, 683, 378, 980, 100);
      this.add.text(683, 108, "あそびかた", {
        fontFamily: UI.fontFamily, fontSize: "40px", fontStyle: "bold", color: "#123052"
      }).setOrigin(.5).setDepth(110);
      const steps = [
        "うえの おだいを みよう！",
        "おなじ ちずきごうを みつけよう！",
        "ゆびや マウスで シュッと きろう！",
        "ZONEに はいったら ぜんぶ きれ！"
      ];
      steps.forEach((text, index) => {
        const y = 222 + index * 91;
        this.add.circle(304, y, 25, 0x174d75).setDepth(110);
        this.add.text(304, y, String(index + 1), {
          fontFamily: UI.fontFamily, fontSize: "30px", fontStyle: "bold", color: "#f5fcff"
        }).setOrigin(.5).setDepth(111);
        this.add.text(350, y, text, {
          fontFamily: UI.fontFamily, fontSize: "31px", fontStyle: "bold", color: "#143250"
        }).setOrigin(0, .5).setDepth(110);
      });
      this.add.text(683, 552, "ちがう きごうは きれないよ", {
        fontFamily: UI.fontFamily, fontSize: "23px", color: "#48556a"
      }).setOrigin(.5).setDepth(110);
      const start = new MapSymbolNinja.UIButton(this, 551, 624, 325, "しゅぎょう開始",
        () => UI.transition(this, "TrainingSelectScene"), { fontSize: 30 });
      const back = new MapSymbolNinja.UIButton(this, 868, 624, 235, "もどる",
        () => UI.transition(this, "TitleScene"), { fontSize: 28 });
      const saveInfo = new MapSymbolNinja.UIButton(this, 683, 715, 310, "記録の保存",
        () => MapSymbolNinja.SaveInfoPanel.open(this), {fontSize:24});
      this.saveInfoButton = saveInfo;
      this.navigation = new MapSymbolNinja.UIButtonNavigation(this, [start, back, saveInfo]);
      UI.keepMenuTouchTargets(this, [saveInfo]);
      UI.createUtilityButtons(this);
      UI.announce("あそびかた。お題と同じ地図記号を、指やマウスで斬ろう。ZONEでは全部斬っていいよ。記録の保存から、共有端末や引きつぎの案内を読めます。");
    }
  }
  MapSymbolNinja.HowToScene = HowToScene;
})();
