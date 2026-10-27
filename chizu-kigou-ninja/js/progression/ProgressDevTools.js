(function () {
  "use strict";
  // 開発パネル専用の独立データ。正式ManagerにもlocalStorageにも書き込まない。
  function createSandbox(snapshot) {
    const manager = new MapSymbolNinja.ProgressManager({ storage: null });
    manager.load(snapshot); manager.beginSession(true);
    return manager;
  }
  function scenario(manager, name) {
    const snapshot = manager.getSnapshot();
    const current = MapSymbolNinja.MapSymbolData.getPlayable("genin", 1);
    if (name === "reset") return createSandbox();
    if (name === "discover" || name === "near_acquire") {
      const id = current[0].id;
      snapshot.symbols[id] = { totalCorrectCuts: name === "discover" ? 1 : 2,
        successfulEncounters: name === "discover" ? 0 : 2, firstDiscoveredAt: new Date().toISOString() };
    } else if (name === "acquire_all") {
      for (const entry of current) snapshot.symbols[entry.id] = {
        totalCorrectCuts: 3, successfulEncounters: 3, firstDiscoveredAt: new Date().toISOString()
      };
      snapshot.announcedUnlocks = [];
    }
    return createSandbox(snapshot);
  }
  MapSymbolNinja.ProgressDevTools = Object.freeze({ createSandbox, scenario });
})();
