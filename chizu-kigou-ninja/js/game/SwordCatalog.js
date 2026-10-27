(function () {
  "use strict";
  const app = MapSymbolNinja;
  const names = { none: "基本の刀", fire: "炎の刀", lightning: "雷の刀", ice: "氷の刀", wind: "風の刀" };
  const items = Object.freeze(app.SwordPreferences.swords.map(sword => Object.freeze(Object.assign({}, sword, {
    name: names[sword.id], element: sword.id, price: sword.id === "none" ? 0 : 60,
    initiallyOwned: sword.id === "none", imageKey: "sword_" + (sword.id === "none" ? "basic" : sword.id),
    displayScale: 1, offsetX: 0, offsetY: 0
  }))));
  app.SwordCatalog = Object.freeze({ items,
    has(id) { return items.some(i => i.id === id); },
    get(id) { return items.find(i => i.id === id) || items[0]; }
  });
})();

