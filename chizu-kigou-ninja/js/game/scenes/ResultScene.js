(function () {
  "use strict";
  class ResultScene extends Phaser.Scene {
    constructor() { super({ key: "ResultScene" }); }
    init(data) {
      this.transitionLock = false; this.navigation = null; this.unlockScroll = null;
      this.unlockPresenter = null;
      this.result = Object.assign({ rank: "genin", stage: 1, score: 0, correctCount: 0, wrongCount: 0,
        accuracy: 0, maxCombo: 0, criticalCount: 0, oneStrokeCount: 0,
        zoneEnterCount: 0, zoneCuts: 0, zoneMaxChain: 0 }, data || {});
      this.result.unlockPresentations = MapSymbolNinja.UI.copyUnlockRequests(data && data.unlockPresentations);
      this.result.progressEnabled = Boolean(data && data.progressEnabled === true);
      this.returnedFromBook = Boolean(data && data.returnedFromBook === true);
    }
    create() {
      const UI = MapSymbolNinja.UI, keys = MapSymbolNinja.AssetKeys;
      const result = this.result;
      window.__NINJA_QA.currentScene = "result";
      window.__NINJA_QA.resultsShown += 1;
      UI.enterScene(this);
      UI.coverBackground(this, keys.GAME_BACKGROUND, .48);
      UI.asset(this, keys.RESULT_FRAME, 683, 382, 555, 100);
      this.add.text(683, 132, "しゅぎょう けっか", {
        fontFamily: UI.fontFamily, fontSize: "36px", fontStyle: "bold", color: "#15334f"
      }).setOrigin(.5).setDepth(110);
      this.add.text(683, 207, result.score.toLocaleString("ja-JP") + " 点", {
        fontFamily: UI.fontFamily, fontSize: "58px", fontStyle: "bold", color: "#155880"
      }).setOrigin(.5).setDepth(110);
      const rows = [
        ["せいかい", result.correctCount + " かい"],
        ["さいだいコンボ", result.maxCombo + ""],
        ["会心", result.criticalCount + " かい"],
        ["一閃", result.oneStrokeCount + " かい"]
      ];
      rows.forEach(([label, value], index) => {
        const y = 270 + index * 42;
        if (index % 2 === 0) this.add.rectangle(683, y, 414, 43, 0x2d759b, .065).setDepth(105);
        this.add.text(484, y, label, {
          fontFamily: UI.fontFamily, fontSize: "25px", fontStyle: "bold", color: "#23394a"
        }).setOrigin(0, .5).setDepth(110);
        this.add.text(882, y, value, {
          fontFamily: UI.fontFamily, fontSize: "28px", fontStyle: "bold", color: "#174c70"
        }).setOrigin(1, .5).setDepth(110);
      });
      this.add.text(683, 445, "ZONE " + result.zoneEnterCount + " かい   ／   CUTS " + result.zoneCuts, {
        fontFamily: UI.fontFamily, fontSize: "21px", fontStyle: "bold", color: "#286083"
      }).setOrigin(.5).setDepth(110);
      this.kobanPresentation = MapSymbolNinja.economy ? new MapSymbolNinja.KobanPresentation(this, result) : null;
      const training = MapSymbolNinja.StageData.getStage(result.rank, result.stage);
      this.add.text(683, 93, training ? MapSymbolNinja.StageData.getRank(result.rank).name + "・" + training.displayName : "", {
        fontFamily: UI.fontFamily, fontSize: "23px", fontStyle: "bold", color: "#e9f4ff"
      }).setOrigin(.5).setDepth(110);
      const retry = new MapSymbolNinja.UIButton(this, 207, 675, 218, "もういちど",
        () => UI.transition(this, "GameScene", { rank: result.rank, stage: result.stage, progressEnabled: result.progressEnabled }), { fontSize: 25 });
      const select = new MapSymbolNinja.UIButton(this, 445, 675, 218, "修行をえらぶ",
        () => UI.transition(this, "TrainingSelectScene", { rank: result.rank }), { fontSize: 25 });
      const book = new MapSymbolNinja.UIButton(this, 683, 675, 218, "忍術帖", () =>
        UI.transition(this, "NinjutsuBookScene", { from: "ResultScene", rank: result.rank, stage: result.stage,
          result: MapSymbolNinja.CollectionBookModel.resultSnapshot(result) }), { fontSize: 25 });
      const title = new MapSymbolNinja.UIButton(this, 1159, 675, 218, "タイトルへ",
        () => UI.transition(this, "TitleScene"), { fontSize: 23 });
      const shop = new MapSymbolNinja.UIButton(this, 921, 675, 218, "刀ショップ", () =>
        UI.transition(this, "SwordSelectScene", { from: "ResultScene", result: MapSymbolNinja.CollectionBookModel.resultSnapshot(result) }), { fontSize: 24 });
      this.navigation = new MapSymbolNinja.BookButtonNavigation(this, [retry, select, book, shop, title]);
      UI.keepMenuTouchTargets(this, [retry, select, book, shop, title]);
      UI.attachUnlockScroll(this);
      UI.createUtilityButtons(this);
      window.ninjaAudio.play("result");
      UI.announce("しゅぎょう、おつかれさま。得点" + result.score + "点。せいかい" + result.correctCount + "回。");
      const showUnlocks = () => {
        if (!this.scene.isActive() || this.transitionLock) return;
      if (result.unlockPresentations.length) UI.presentUnlocks(this, result.unlockPresentations);
      else if (!this.returnedFromBook && result.progressEnabled && MapSymbolNinja.progress.progressEnabled) {
        this.unlockPresenter = new MapSymbolNinja.ResultUnlockPresenter(this, MapSymbolNinja.progress);
        this.unlockPresenter.start();
        this.events.once("shutdown", () => { this.unlockPresenter = null; });
      }
      };
      const delay = this.kobanPresentation ? this.kobanPresentation.duration : 0;
      // create中はSceneがまだactiveではない。小判演出がない場合も次の更新まで待つ。
      const timer = this.time.delayedCall(delay, showUnlocks);
      this.events.once("shutdown", () => timer.remove(false));
    }
  }
  MapSymbolNinja.ResultScene = ResultScene;
})();
