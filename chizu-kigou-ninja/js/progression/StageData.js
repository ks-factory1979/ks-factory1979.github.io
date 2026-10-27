(function () {
  "use strict";
  const names = ["其ノ一", "其ノ二", "其ノ三", "其ノ四"];
  const rankNames = { genin: "下忍の巻", chunin: "中忍の巻", jonin: "上忍の巻", kiwami: "極みの巻" };
  const order = Object.freeze(["genin", "chunin", "jonin", "kiwami"]);
  const ranks = {};
  for (const rank of order) {
    const stages = rank === "kiwami" ? [] : names.map((displayName, index) => {
      const symbolIds = MapSymbolNinja.MapSymbolData.entries
        .filter((entry) => entry.rank === rank && entry.stage === index + 1).map((entry) => entry.id);
      return Object.freeze({ id: rank + "_" + (index + 1), stageNumber: index + 1, displayName,
        expectedSymbols: 5, reserved: symbolIds.length !== 5, symbolIds: Object.freeze(symbolIds) });
    });
    ranks[rank] = Object.freeze({ id: rank, name: rankNames[rank], expectedSymbols: rank === "kiwami" ? 0 : 20,
      stages: Object.freeze(stages) });
  }
  // 実装がそろった巻だけ選択肢へ。極みの特殊ゲームは引き続き予約枠。
  const availableRanks = Object.freeze(order.filter(rank => ranks[rank].expectedSymbols === 20 &&
    ranks[rank].stages.length === 4 && ranks[rank].stages.every(stage => !stage.reserved &&
      stage.symbolIds.every(id => MapSymbolNinja.MapSymbolData.get(id).implemented))));
  MapSymbolNinja.StageData = Object.freeze({ order, availableRanks, ranks: Object.freeze(ranks),
    getRank: (rank) => ranks[rank] || null,
    getStage: (rank, stage) => ranks[rank] && ranks[rank].stages.find((item) => item.stageNumber === stage) || null
  });
})();
