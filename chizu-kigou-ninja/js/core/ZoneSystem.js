(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};

  // 学習内容を知らない、通常時とは独立したゲージと短いボーナス時間。
  class ZoneSystem {
    constructor(options) {
      this.required = options.required;
      this.durationMs = options.durationMs;
      this.enterMs = options.enterMs;
      this.recoveryMs = options.recoveryMs;
      this.points = 0;
      this.state = "normal";
      this.remainingMs = 0;
      this.phaseRemainingMs = 0;
      this.enterCount = 0;
      this.exitCount = 0;
      this.cuts = 0;
      this.chain = 0;
      this.maxChain = 0;
      this.swipeHits = 0;
      this.oneStrokeCount = 0;
      this.pausedMs = 0;
    }

    addCorrect(combo) {
      if (this.state !== "normal") return;
      this.points = Math.min(this.required, this.points + 1 + (combo >= 3 ? 1 : 0));
    }

    addSwipeBonus(hits) {
      if (this.state !== "normal" || hits < 2) return;
      this.points = Math.min(this.required, this.points + (hits >= 3 ? 3 : 2));
    }

    ready() { return this.state === "normal" && this.points >= this.required; }
    enter() {
      if (!this.ready()) return false;
      this.state = "entering";
      this.points = 0;
      this.phaseRemainingMs = this.enterMs;
      this.enterCount += 1;
      this.chain = 0;
      this.swipeHits = 0;
      this.pausedMs = 0;
      return true;
    }
    beginSwipe() { this.swipeHits = 0; }
    recordCut() {
      if (this.state !== "active") return 0;
      this.cuts += 1;
      this.chain += 1;
      this.maxChain = Math.max(this.maxChain, this.chain);
      return ++this.swipeHits;
    }
    finishSwipe() {
      const hits = this.swipeHits;
      if (hits >= 2) this.oneStrokeCount += 1;
      this.swipeHits = 0;
      return hits;
    }
    update(delta) {
      if (this.state === "normal") return null;
      const ms = Math.min(100, Math.max(0, Number(delta) || 0));
      this.pausedMs += ms;
      if (this.state === "entering") {
        this.phaseRemainingMs = Math.max(0, this.phaseRemainingMs - ms);
        if (this.phaseRemainingMs === 0) {
          this.state = "active";
          this.remainingMs = this.durationMs;
          return "start";
        }
      } else if (this.state === "active") {
        this.remainingMs = Math.max(0, this.remainingMs - ms);
        if (this.remainingMs === 0) {
          this.state = "recovery";
          this.phaseRemainingMs = this.recoveryMs;
          this.exitCount += 1;
          return "end";
        }
      } else {
        this.phaseRemainingMs = Math.max(0, this.phaseRemainingMs - ms);
        if (this.phaseRemainingMs === 0) {
          this.state = "normal";
          const pausedMs = this.pausedMs;
          this.pausedMs = 0;
          return { resumed: true, pausedMs };
        }
      }
      return null;
    }
    isPaused() { return this.state !== "normal"; }
  }
  window.NinjaCore.ZoneSystem = ZoneSystem;
})();
