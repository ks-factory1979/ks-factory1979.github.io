(function () {
  "use strict";
  const app = MapSymbolNinja;
  function progress() {
    return app.ProgressManager.isDevelopmentMode() && app.trainingSandbox ? app.trainingSandbox : app.progress;
  }
  function resolve(manager, rank, stage) {
    const valid = typeof rank === "string" && app.StageData.order.includes(rank) && Number.isInteger(stage) && app.StageData.getStage(rank, stage);
    const entries = valid ? app.MapSymbolData.getPlayable(rank, stage) : [];
    const symbols = entries.map((entry) => app.SYMBOLS.find((symbol) => symbol.id === entry.rendererId));
    const status = valid && manager ? manager.getStageProgress(rank, stage) : null;
    const ready = Boolean(valid && status && status.playable && entries.length === 5 &&
      symbols.every((symbol) => symbol && typeof app.SymbolRenderers[symbol.id] === "function"));
    const unlocked = Boolean(valid && manager && manager.isStageUnlocked(rank, stage));
    const state = !unlocked ? "locked" : ready ? "playable" : "preparing";
    return { rank, stage, valid: Boolean(valid), entries, symbols, progress: status,
      state, playable: state === "playable", unlocked, ready };
  }
  function enableDevPreview() {
    if (!app.ProgressManager.isDevelopmentMode()) return false;
    const sandbox = app.ProgressDevTools.createSandbox();
    const snapshot = sandbox.getSnapshot();
    for (const entry of app.MapSymbolData.entries) snapshot.symbols[entry.id] = {
      totalCorrectCuts: 3, successfulEncounters: 3, firstDiscoveredAt: new Date().toISOString()
    };
    app.trainingSandbox = app.ProgressDevTools.createSandbox(snapshot);
    return true;
  }
  app.TrainingSelection = Object.freeze({ progress, resolve, enableDevPreview });
})();
