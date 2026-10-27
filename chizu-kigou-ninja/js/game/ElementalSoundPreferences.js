(function () {
  "use strict";
  const KEY = "chizuNinjaElementalSoundDev_v1";
  const defaults = () => ({ candidates: { fire: "A", lightning: "A", ice: "A", wind: "A" }, volume: .85, slashVolume: .42, balanceVersion: 2 });
  function normalize(value) {
    const v = value && typeof value === "object" ? value : {}, result = defaults();
    for (const id of Object.keys(result.candidates)) {
      const c = v.candidates && v.candidates[id];
      if (MapSymbolNinja.ElementalAudioData[id][c]) result.candidates[id] = c;
    }
    if (Number.isFinite(Number(v.volume))) result.volume = Math.max(0, Math.min(1, Number(v.volume)));
    // Carry A/B/C choices forward, and upgrade the previous unmodified default balance.
    if (v.balanceVersion !== 2 && v.volume === .65) result.volume = .85;
    if (Number.isFinite(Number(v.slashVolume))) result.slashVolume = Math.max(0, Math.min(1, Number(v.slashVolume)));
    return result;
  }
  let current = defaults(), loaded = false;
  function load() {
    if (!loaded) {
      loaded = true;
      try { current = normalize(JSON.parse(window.localStorage.getItem(KEY))); } catch (_) { /* session defaults */ }
    }
    return normalize(current);
  }
  function save(value) {
    current = normalize(value); loaded = true;
    try { window.localStorage.setItem(KEY, JSON.stringify(current)); } catch (_) { /* retain in memory */ }
    return load();
  }
  function forGame() { return NINJA_CONFIG.DEV_PANEL_ENABLED ? load() : defaults(); }
  MapSymbolNinja.ElementalSoundPreferences = { KEY, load, save, defaults, normalize, forGame };
})();
