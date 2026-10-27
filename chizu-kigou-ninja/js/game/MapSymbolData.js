(function () {
  "use strict";
  const app = MapSymbolNinja;
  const aliases = { police: "police_station", school: "elementary_junior_high_school" };
  // 描画IDは改名せず、保存には従来のcanonical IDを使用。名称・修行・実装状態はSYMBOLSが唯一の参照元。
  const entries = Object.freeze(app.SYMBOLS.map((symbol) => Object.freeze({
    id: aliases[symbol.id] || symbol.id,
    officialName: symbol.officialName, displayName: symbol.displayName,
    rank: symbol.rank, stage: symbol.stage, implemented: symbol.implemented,
    rendererId: symbol.rendererId, learningDescription: symbol.learningDescription || "", listName: symbol.listName || symbol.officialName
  })));
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const byRenderer = new Map(entries.map((entry) => [entry.rendererId, entry]));
  app.MapSymbolData = Object.freeze({
    entries,
    get: (id) => byId.get(id) || byRenderer.get(id) || null,
    canonicalId: (id) => { const entry = byId.get(id) || byRenderer.get(id); return entry ? entry.id : null; },
    getPlayable: (rank, stage) => entries.filter((entry) => entry.rank === rank && entry.stage === stage && entry.implemented)
  });
})();
