(function () {
  "use strict";

  window.NinjaCore = window.NinjaCore || {};

  class ComboSystem {
    constructor(options) {
      this.timeout = options.comboTimeout;
      this.reset();
    }

    reset() {
      this.combo = 0;
      this.maxCombo = 0;
      this.lastCorrectAt = -Infinity;
      this.swipeHits = 0;
      this.swipeHadWrong = false;
      this.oneStrokeCount = 0;
    }

    beginSwipe() {
      this.swipeHits = 0;
      this.swipeHadWrong = false;
    }

    recordCorrect(now) {
      if (now - this.lastCorrectAt > this.timeout) this.combo = 0;
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.lastCorrectAt = now;
      this.swipeHits += 1;

      if (this.combo === 10) return "awaken";
      if (this.combo === 5) return "good";
      if (this.combo === 3) return "spark";
      return null;
    }

    recordWrong() {
      this.combo = 0;
      this.swipeHadWrong = true;
    }

    finishSwipe() {
      const hits = this.swipeHits;
      const clean = !this.swipeHadWrong;
      this.swipeHits = 0;
      this.swipeHadWrong = false;

      if (!clean || hits < 2) return { hits, bonus: 0, label: "" };
      this.oneStrokeCount += 1;

      if (hits === 2) return { hits, bonus: 150, label: "二連斬！" };
      if (hits === 3) return { hits, bonus: 350, label: "三連斬！" };
      return { hits, bonus: 600 + (hits - 4) * 150, label: "一閃コンボ！" };
    }

    update(now) {
      if (this.combo > 0 && now - this.lastCorrectAt > this.timeout) {
        this.combo = 0;
        return true;
      }
      return false;
    }
  }

  window.NinjaCore.ComboSystem = ComboSystem;
})();
