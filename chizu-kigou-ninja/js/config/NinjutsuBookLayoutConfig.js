(function () {
  "use strict";
  const text = (x, y, fontSize, width, extra) => Object.assign({ x, y, fontSize, width,
    originX: .5, originY: .5, align: "center", lineSpacing: 5, visible: true }, extra);
  const image = (x, y, size) => ({ x, y, size, scale: 1, originX: .5, originY: .5, visible: true });
  const box = (x, y, width, height) => ({ x, y, width, height, visible: true });
  const defaults = {
    version: "0.3.7", scene: "NinjutsuBookScene", canvas: { width: 1366, height: 768 },
    grid: { visible: true, size: 20, snap: false }, guides: { safe: true, spine: true },
    elements: {
      spread: image(683, 429, 1220), title: text(683, 39, 38, 700), totals: text(683, 85, 24, 1000),
      // Measured against the inner paper, excluding artwork margins and the binding.
      leftSafe: box(174, 203, 458, 480), rightSafe: box(732, 188, 470, 494), spine: box(650, 122, 66, 567),
      tab1: box(269, 180, 100, 30), tab2: box(546, 180, 100, 30),
      tab3: box(830, 180, 100, 30), tab4: box(1087, 180, 100, 30), tabLabel: text(0, 0, 24, 202),
      list: Object.assign(box(407, 246, 450, 76), { gap: 82 }),
      rowGlyph: image(-181, 0, 66), rowName: text(-17, -15, 27, 290),
      rowState: text(-17, 18, 21, 290), rowSeal: image(177, 0, 56),
      hint: text(407, 658, 21, 450), back: box(683, 720, 310, 79), backLabel: text(0, 0, 25, 300),
      detailTitle: text(967, 225, 28, 440), detailGlyph: image(934, 328, 132), detailSeal: image(1134, 328, 76),
      detailState: text(967, 418, 24, 448), success: text(967, 453, 24, 448), progress: text(967, 488, 23, 448),
      explanationButton: box(855, 530, 214, 46), secretButton: box(1081, 530, 214, 46),
      toggleLabel: text(0, 0, 21, 210), descriptionBox: box(746, 566, 442, 112),
      body: text(967, 566, 23, 430, { originY: 0 }),
      secretTitle: text(967, 566, 21, 430, { originY: 0 }),
      secretBody: text(967, 592, 22, 430, { originY: 0, lineSpacing: 4 })
    }
  };
  const freeze = value => { Object.values(value).forEach(v => { if (v && typeof v === "object") freeze(v); }); return Object.freeze(value); };
  MapSymbolNinja.NinjutsuBookLayoutConfig = freeze(defaults);
})();
