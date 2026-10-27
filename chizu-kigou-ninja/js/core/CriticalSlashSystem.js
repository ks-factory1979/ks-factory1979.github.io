(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};

  // 判定は正解Hit後に呼ぶ。札の意味・得点・コンボは知らない。
  class CriticalSlashSystem {
    static evaluate(options) {
      const start = options.cutLineStart;
      const end = options.cutLineEnd;
      const center = options.cardCenter;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const t = lengthSquared > 0
        ? Math.max(0, Math.min(1, ((center.x - start.x) * dx + (center.y - start.y) * dy) / lengthSquared))
        : 0;
      const distance = Math.hypot(center.x - (start.x + dx * t), center.y - (start.y + dy * t));
      const shortSide = Math.max(1, Math.min(options.cardSize.width, options.cardSize.height));
      const centerRatio = distance / shortSide;
      const speed = Number(options.swipeSpeed) || 0;
      const isCritical = Boolean(options.enabled) &&
        centerRatio <= options.maxCenterRatio && speed >= options.minSpeed;
      return { isCritical, centerDistance: distance, centerRatio, swipeSpeed: speed };
    }
  }

  window.NinjaCore.CriticalSlashSystem = CriticalSlashSystem;
})();
