(function () {
  "use strict";

  window.NinjaCore = window.NinjaCore || {};

  // 学習内容やGame Objectを知らず、「何ms止めるか」だけを管理する。
  // Scene自体はPauseしないため、PointerとAudioは通常どおり動き続ける。
  class HitStopSystem {
    constructor(options) {
      const settings = options || {};
      this.normalDuration = Math.max(0, Number(settings.normalDuration || 35));
      this.multiHitStep = Math.max(0, Number(settings.multiHitStep || 5));
      this.maxDuration = Math.max(this.normalDuration, Number(settings.maxDuration || 50));
      this.activeUntil = 0;
      this.swipeStopStartedAt = null;
      this.swipeHits = 0;
      this.swipeGrantedDuration = 0;
      this.lastDuration = 0;
      this.requestCount = 0;
    }

    beginSwipe() {
      this.swipeStopStartedAt = null;
      this.swipeHits = 0;
      this.swipeGrantedDuration = 0;
      this.lastDuration = 0;
    }

    request(now, hitIndex, baseDuration) {
      const requestedAt = Number.isFinite(Number(now)) ? Number(now) : 0;
      const hits = Math.max(1, Math.floor(Number(hitIndex) || (this.swipeHits + 1)));
      if (this.swipeStopStartedAt === null) this.swipeStopStartedAt = requestedAt;
      this.swipeHits = Math.max(this.swipeHits, hits);

      const duration = Math.min(
        this.maxDuration,
        (Number.isFinite(Number(baseDuration)) ? Number(baseDuration) : this.normalDuration) +
          (this.swipeHits - 1) * this.multiHitStep
      );
      // 2枚目以降へ追加するのは段階差の5msだけ。同じスワイプで
      // 35msを何度も足さず、実際に与える停止時間の総量を最大50msにする。
      const additionalDuration = Math.max(0, duration - this.swipeGrantedDuration);
      if (additionalDuration > 0) {
        this.activeUntil = Math.max(this.activeUntil, requestedAt) + additionalDuration;
        this.swipeGrantedDuration = duration;
      }
      this.lastDuration = duration;
      this.requestCount += 1;

      return {
        duration,
        activeUntil: this.activeUntil,
        remaining: Math.max(0, this.activeUntil - requestedAt),
        hits: this.swipeHits,
        additionalDuration
      };
    }

    endSwipe() {
      // Pointer Upで停止を打ち切らない。短い停止だけは予定どおり完了させる。
    }

    isActive(now) {
      const current = Number.isFinite(Number(now)) ? Number(now) : 0;
      return current < this.activeUntil;
    }

    getRemaining(now) {
      const current = Number.isFinite(Number(now)) ? Number(now) : 0;
      return Math.max(0, this.activeUntil - current);
    }

    destroy() {
      this.activeUntil = 0;
      this.swipeStopStartedAt = null;
      this.swipeHits = 0;
      this.swipeGrantedDuration = 0;
      this.lastDuration = 0;
      this.requestCount = 0;
    }
  }

  window.NinjaCore.HitStopSystem = HitStopSystem;
})();
