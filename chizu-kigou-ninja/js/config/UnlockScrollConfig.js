(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};
  // 元PNGの紙帯を基準に合わせる。ピクセル加工や動的Texture生成はしない。
  NinjaCore.UnlockScrollConfig = Object.freeze({
    depth: 2000,
    parts: Object.freeze({
      left: { width: 475, height: 1110, originX: 191 / 475, originY: 557.5 / 1110 },
      right: { width: 480, height: 1110, originX: 273 / 480, originY: 558 / 1110 },
      center: { width: 1898, height: 455, originX: .5, originY: 226 / 455 },
      rollerPaperHeight: 570.5, centerPaperHeight: 422
    }),
    profiles: Object.freeze({
      stage: { paperWidth: 820, paperHeight: 230, dimAlpha: .58, dimMs: 150,
        openMs: 520, titleAt: 430, subtitleAt: 510, stampAt: 700, stampMs: 130,
        holdMs: 550, exitMs: 170, stampWidth: 90, titleSize: 42, subtitleSize: 50 },
      rank: { paperWidth: 920, paperHeight: 260, dimAlpha: .66, dimMs: 170,
        openMs: 580, titleAt: 490, subtitleAt: 570, stampAt: 840, stampMs: 140,
        holdMs: 800, exitMs: 240, stampWidth: 110, titleSize: 46, subtitleSize: 54 }
    })
  });
})();
