(function () {
  "use strict";

  window.NinjaCore = window.NinjaCore || {};

  // 制限時間と汎用リザルト値だけを扱い、学習内容には依存しません。
  class RoundSystem {
    constructor(options) {
      const settings = options || {};
      this.durationMs = Math.max(1000, Number(settings.durationSeconds || 60) * 1000);
      this.warningMs = Math.max(0, Number(settings.warningSeconds || 10) * 1000);
      this.maxDeltaMs = Math.max(16, Number(settings.maxDeltaMs || 80));
      this.reset();
    }

    reset() {
      this.remainingMs = this.durationMs;
      this.ended = false;
      this.warningSent = false;
    }

    update(deltaMs) {
      const previousSeconds = this.getSeconds();
      const consumedMs = this.ended ? 0 : Math.min(this.maxDeltaMs, Math.max(0, Number(deltaMs) || 0));
      this.remainingMs = Math.max(0, this.remainingMs - consumedMs);
      const seconds = this.getSeconds();
      const warningStarted = !this.warningSent && this.remainingMs <= this.warningMs;
      if (warningStarted) this.warningSent = true;
      const expired = this.remainingMs <= 0;
      if (expired) this.ended = true;

      return {
        consumedMs,
        remainingMs: this.remainingMs,
        seconds,
        secondChanged: seconds !== previousSeconds,
        warningStarted,
        expired
      };
    }

    getSeconds() {
      return Math.max(0, Math.ceil(this.remainingMs / 1000));
    }

    finish(stats) {
      const values = stats || {};
      const correctCount = this._count(values.correctCount);
      const wrongCount = this._count(values.wrongCount);
      const attempts = correctCount + wrongCount;
      this.ended = true;
      this.remainingMs = 0;

      return {
        score: this._count(values.score),
        correctCount,
        wrongCount,
        accuracy: attempts > 0 ? Math.round((correctCount / attempts) * 100) : 0,
        maxCombo: this._count(values.maxCombo),
        oneStrokeCount: this._count(values.oneStrokeCount)
      };
    }

    _count(value) {
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
    }
  }

  window.NinjaCore.RoundSystem = RoundSystem;
})();
