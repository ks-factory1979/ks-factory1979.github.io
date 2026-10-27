(function () {
  "use strict";
  const app = MapSymbolNinja;
  class TrainingSelectScene extends Phaser.Scene {
    constructor() { super({ key: "TrainingSelectScene" }); }
    init(data) { this.notice = data && data.notice || ""; this.rank = app.StageData.availableRanks.includes(data && data.rank) ? data.rank : "genin"; this.transitionLock = false; this.navigation = null; }
    create() {
      const UI = app.UI, manager = app.TrainingSelection.progress();
      window.__NINJA_QA.currentScene = "training-select";
      UI.enterScene(this);
      UI.coverBackground(this, app.AssetKeys.GAME_BACKGROUND, .42);
      const text = (x, y, value, size, paper) => this.add.text(x, y, value, {
        fontFamily: UI.fontFamily, fontSize: size + "px", fontStyle: "bold", color: paper ? "#243c4b" : "#fff0b7",
        align: "center", stroke: paper ? undefined : "#07182c", strokeThickness: paper ? 0 : 4
      }).setOrigin(.5).setDepth(110);
      text(683, 53, "修行をえらぶ", 42);
      const previousRank = app.StageData.order[app.StageData.order.indexOf(this.rank) - 1];
      const previousName = previousRank ? app.StageData.getRank(previousRank).name.replace("の巻", "") : "";
      this.rankButtons = app.StageData.availableRanks.map((rank, i) => {
        const label = app.StageData.getRank(rank).name + (rank === this.rank ? " ✓" : "") + (manager.isRankUnlocked(rank) ? "" : "（未解放）");
        const button = new app.UIButton(this, 350 + i * 333, 124, 300, label, () => {
          if (rank !== this.rank && !this.transitionLock) this.scene.restart({ rank });
        }, { fontSize: 24 });
        button.text.setColor(rank === this.rank ? "#ffe89a" : "#f4fcff"); return button;
      });
      this.stageStates = [1, 2, 3, 4].map(stage => app.TrainingSelection.resolve(manager, this.rank, stage));
      this.stageButtons = []; this.stageCards = [];
      const enabled = [], labels = { locked: "まだ あいていないよ", unlocked: "挑戦できるよ", in_progress: "修行中",
        completed: "修了！", preparing: "じゅんびちゅう" };
      this.stageStates.forEach((selection, index) => {
        const x = index % 2 ? 966 : 400, y = index < 2 ? 270 : 532;
        const state = app.CollectionBookModel.stageState(selection);
        const card = UI.asset(this, app.AssetKeys.TRAINING_STAGE_CARD, x, y, 450, 100);
        if (state === "locked") card.setTint(0xa3aab2);
        else if (state === "preparing") card.setTint(0xd0dce8);
        this.stageCards.push(card);
        text(x, y - 70, app.StageData.getStage(this.rank, selection.stage).displayName, 34, true);
        text(x, y - 27, labels[state], 25, true);
        text(x, y + 7, "会得 " + selection.progress.acquiredCount + " / 5", 26, true);
        if (state === "locked") {
          const lock = this.add.graphics().setDepth(110);
          lock.lineStyle(4, 0x344d62).strokeRoundedRect(x - 170, y - 41, 22, 24, 10);
          lock.fillStyle(0x344d62).fillRoundedRect(x - 175, y - 27, 32, 25, 4);
          lock.fillStyle(0xe7e0bd).fillCircle(x - 159, y - 17, 3);
        } else if (state === "completed") {
          this.add.image(x + 154, y - 45, app.AssetKeys.SEAL_ACQUIRED).setDisplaySize(62, 62).setDepth(110);
        }
        const label = selection.playable ? state === "completed" ? "もういちど修行する" : "この修行をする" :
          state === "locked" ? !manager.isRankUnlocked(this.rank) ? previousName + "を会得しよう" : "前の修行を会得しよう" : "じゅんびちゅう";
        const button = new app.UIButton(this, x, y + 70, 310, label, () =>
          UI.transition(this, "GameScene", { rank: this.rank, stage: selection.stage }), { fontSize: 25 });
        button.setEnabled(selection.playable);
        this.stageButtons.push(button);
        if (selection.playable) enabled.push(button);
      });
      const future = app.StageData.order.filter(rank => !app.StageData.availableRanks.includes(rank)).map(rank => {
        const selection = app.TrainingSelection.resolve(manager, rank, 1);
        if (rank === "chunin") this.chuninState = selection.state;
        return app.StageData.getRank(rank).name + "　" + (manager.isRankUnlocked(rank) ? "じゅんびちゅう" : "未解放");
      });
      this.chuninState = app.TrainingSelection.resolve(manager, "chunin", 1).state;
      const hint = this.notice || (manager.isRankUnlocked(this.rank) ? "5種類を会得すると 次の修行へ！" : previousName + "の20種類を会得すると " + app.StageData.getRank(this.rank).name + "が開くよ！");
      text(683, 670, hint + "　｜　" + future.join("　｜　"), 20);
      const book = new app.UIButton(this, 510, 720, 290, "忍術帖", () =>
        UI.transition(this, "NinjutsuBookScene", { from: "TrainingSelectScene", rank: this.rank }), { fontSize: 30 });
      const back = new app.UIButton(this, 856, 720, 290, "もどる", () => UI.transition(this, "TitleScene"), { fontSize: 30 });
      enabled.unshift(...this.rankButtons); enabled.push(book, back);
      this.navigation = new app.BookButtonNavigation(this, enabled);
      UI.keepMenuTouchTargets(this, [...this.rankButtons, ...this.stageButtons, book, back]);
      UI.createUtilityButtons(this);
      if (UI.devVisible()) {
        UI.createButton(this, 163, 720, 290, 44, app.trainingSandbox ? "Dev確認中・保存なし" : "Dev：全修行を確認", () => {
          if (app.TrainingSelection.enableDevPreview()) this.scene.restart({ rank: this.rank });
        }, { fontSize: 18, depth: 950 });
      }
      window.__NINJA_QA.trainingStates = this.stageStates.map(s => ({ rank: s.rank, stage: s.stage,
        state: s.state, displayState: app.CollectionBookModel.stageState(s) }));
      UI.announce(this.notice || app.StageData.getRank(this.rank).name + "。しゅぎょうをえらぼう。");
    }
  }
  app.TrainingSelectScene = TrainingSelectScene;
})();
