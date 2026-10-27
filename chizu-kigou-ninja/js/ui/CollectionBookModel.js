(function () {
  "use strict";
  const app = MapSymbolNinja;
  const labels = app.ProgressConfig.MASTERY_LABELS;
  const order = ["unknown", "discovered", "acquired", "master"];
  const resultNumbers = ["score", "correctCount", "wrongCount", "accuracy", "maxCombo", "criticalCount",
    "oneStrokeCount", "zoneEnterCount", "zoneCuts", "zoneMaxChain", "zoneOneStrokeCount"];

  function stageState(selection) {
    if (selection.state === "locked" || selection.state === "preparing") return selection.state;
    if (selection.progress.completed) return "completed";
    return selection.progress.acquiredCount > 0 ? "in_progress" : "unlocked";
  }
  // Read methods only: viewing a page must never discover, finalize, save, or announce an unlock.
  function snapshot(manager, requestedRank) {
    const rank = app.StageData.availableRanks.includes(requestedRank) ? requestedRank : "genin";
    const items = app.MapSymbolData.entries.filter(e => e.rank === rank).map(entry => {
      const progress = manager.getSymbolProgress(entry.id);
      const state = manager.getMasteryState(entry.id);
      const level = order.indexOf(state);
      return Object.freeze(Object.assign({}, entry, {
        state, stateLabel: labels[state], concealed: state === "unknown",
        textureKey: state === "unknown" ? null : "card_" + entry.rendererId,
        sealKey: state === "unknown" ? null : app.AssetKeys["SEAL_" + state.toUpperCase()],
        successfulEncounters: progress.successfulEncounters, level
      }));
    });
    return Object.freeze({ rank, rankName: app.StageData.getRank(rank).name, items: Object.freeze(items), totals: Object.freeze({
      discovered: items.filter(e => e.level >= 1).length,
      acquired: items.filter(e => e.level >= 2).length,
      master: items.filter(e => e.level >= 3).length, total: items.length
    }) });
  }
  function resultSnapshot(source) {
    const input = source && typeof source === "object" ? source : {};
    const output = { rank: app.StageData.order.includes(input.rank) ? input.rank : "genin",
      stage: Number.isInteger(input.stage) && input.stage >= 1 && input.stage <= 4 ? input.stage : 1,
      progressEnabled: input.progressEnabled === true, returnedFromBook: true };
    if (typeof input.runId === "string") output.runId = input.runId;
    if (input.koban && typeof input.koban === "object") output.koban = Object.freeze(JSON.parse(JSON.stringify(input.koban)));
    resultNumbers.forEach(key => { output[key] = Number.isFinite(input[key]) ? Math.max(0, input[key]) : 0; });
    return Object.freeze(output);
  }
  function origin(data) {
    const from = data && data.from;
    if (from === "ResultScene") return Object.freeze({ scene: from, data: resultSnapshot(data.result) });
    return Object.freeze({ scene: from === "TrainingSelectScene" ? from : "TitleScene", data: from === "TrainingSelectScene" ?
      Object.freeze({ rank: app.StageData.availableRanks.includes(data.rank) ? data.rank : "genin" }) : undefined });
  }
  app.CollectionBookModel = Object.freeze({ snapshot, stageState, resultSnapshot, origin });
})();
