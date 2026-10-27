(function () {
  "use strict";
  const app = window.MapSymbolNinja = window.MapSymbolNinja || {};
  const key = "chizuKigouNinja_sword_v1";
  const swords = Object.freeze([
    { id: "none", name: "ふつうの刀", shortName: "ふつう", mark: "刀", color: "#cbe7ff", description: "すっと光る、いつもの刀。" },
    { id: "fire", name: "炎の刀", shortName: "炎", mark: "炎", color: "#ffab57", description: "ゆれる炎の尾と、舞い上がる火の粉。" },
    { id: "lightning", name: "雷の刀", shortName: "雷", mark: "雷", color: "#d4b9ff", description: "枝分かれする稲妻が、ぱっと走る。" },
    { id: "ice", name: "氷の刀", shortName: "氷", mark: "氷", color: "#a5eaff", description: "広がる霜と白いひび、外へ弾ける氷のかけら。" },
    { id: "wind", name: "風の刀", shortName: "風", mark: "風", color: "#aaf2d5", description: "走る風の刃と、あとを追う渦と気流。" }
  ].map(Object.freeze));
  const valid = id => swords.some(sword => sword.id === id);
  let selected = "none";
  let persisted = true;
  app.SwordPreferences = Object.freeze({
    key, swords,
    get(id) { return swords.find(sword => sword.id === id) || swords[0]; },
    load() {
      if (app.economy) return this.get(app.economy.getState().equippedSword);
      if (!persisted) return this.get(selected);
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) selected = "none";
        else {
          try {
            const data = JSON.parse(raw);
            selected = data && data.version === 1 && valid(data.element) ? data.element : "none";
          } catch (_error) { selected = "none"; }
        }
        persisted = true;
      } catch (_error) { /* Storageが使えない場合も、この起動中の選択は使える。 */ }
      return this.get(selected);
    },
    equip(id) {
      if (app.economy) return app.economy.equip(id).then(result => ({
        sword: this.get(result.state.equippedSword), persisted: result.persisted, changed: result.status === "equipped"
      }));
      if (!valid(id)) return { sword: this.get(selected), persisted, changed: false };
      selected = id;
      try {
        window.localStorage.setItem(key, JSON.stringify({ version: 1, element: selected }));
        persisted = true;
      } catch (_error) { persisted = false; }
      return { sword: this.get(selected), persisted, changed: true };
    }
  });
})();
