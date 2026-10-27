(function () {
  "use strict";
  window.MapSymbolNinja = window.MapSymbolNinja || {};
  const KEY = "chizuNinjaDevSettings_v1";
  const clamp = (value, lower, upper, fallback) => Number.isFinite(Number(value))
    ? Math.max(lower, Math.min(upper, Number(value))) : fallback;
  const snap = (value, step) => Math.round(value / step) * step;
  const defaults = () => ({
    activeMs: NINJA_CONFIG.TARGET_ACTIVE_MS,
    noticeMs: NINJA_CONFIG.TARGET_NOTICE_MS,
    waves: NINJA_CONFIG.WAVES.map((wave) => ({ minCards: wave.minCards, maxCards: wave.maxCards })),
    issenChance: NINJA_CONFIG.CLIMAX_ISSEN_CHANCE,
    criticalCenterRatio: NINJA_CONFIG.CRITICAL_CENTER_RATIO,
    criticalMinSpeed: NINJA_CONFIG.CRITICAL_MIN_SPEED,
    zoneRequiredPoints: NINJA_CONFIG.ZONE_REQUIRED_POINTS,
    zoneDurationMs: NINJA_CONFIG.ZONE_DURATION_MS,
    zoneMaxActive: NINJA_CONFIG.ZONE_MAX_ACTIVE_CARDS,
    zoneVelocityScale: NINJA_CONFIG.ZONE_CARD_SPEED_SCALE,
    zoneIntervalScale: NINJA_CONFIG.ZONE_SPAWN_INTERVAL_SCALE,
    zoneIssenChance: NINJA_CONFIG.ZONE_ISSEN_CHANCE,
    zoneHitStopMs: NINJA_CONFIG.ZONE_HIT_STOP_MS,
    zoneBurstPreset: "standard",
    zoneSpawn: { threeWay: true, bottom: 50, left: 25, right: 25, sideSpeed: 1, angle: 54, height: .90, maxActive: 9 },
    vfx: { mode: "dynamic", quality: "standard", strength: "standard",
      speed: 1, life: 1, gravity: 1, spread: 1, waveDelay: 1 },
    // 演出のみ。公開版ではDEV_PANEL_ENABLED=falseにすると初期値へ戻る。
    special: { criticalTotalMs: 720, criticalHoldMs: 320, criticalEffectAlpha: .51,
      criticalPopScale: 1.08, issenTotalMs: 1000, issenHoldMs: 460,
      issenEffectAlpha: .56, issenEntryDistance: 65, issenExitDistance: 32,
      ringEnabled: true, secondRingEnabled: true, labelScale: 1.05 }
  });
  const centerChoices = [0.16, 0.23, 0.30];
  const speedChoices = [0.55, 0.95, 1.40];
  function closest(value, choices, fallback) {
    if (!Number.isFinite(Number(value))) return fallback;
    return choices.reduce((best, candidate) =>
      Math.abs(candidate - Number(value)) < Math.abs(best - Number(value)) ? candidate : best, fallback);
  }
  function normalize(value) {
    const source = value && typeof value === "object" ? value : {};
    const base = defaults();
    const waves = base.waves.map((wave, index) => {
      const given = Array.isArray(source.waves) ? source.waves[index] || {} : {};
      const minCards = snap(clamp(given.minCards, 1, 4, wave.minCards), 1);
      const maxCards = Math.max(minCards, snap(clamp(given.maxCards, 1, 4, wave.maxCards), 1));
      return { minCards, maxCards };
    });
    const s = source.special && typeof source.special === "object" ? source.special : {};
    const v = source.vfx && typeof source.vfx === "object" ? source.vfx : {};
    const z = source.zoneSpawn && typeof source.zoneSpawn === "object" ? source.zoneSpawn : {};
    let weights = ["bottom", "left", "right"].map(k => clamp(z[k], 0, 100, base.zoneSpawn[k]));
    if (!weights.some(w => w > 0)) weights = [50, 25, 25];
    const total = weights.reduce((a, b) => a + b, 0);
    const bottom = Math.round(weights[0] / total * 100), left = Math.round(weights[1] / total * 100);
    return {
      activeMs: snap(clamp(source.activeMs, 7000, 15000, base.activeMs), 500),
      noticeMs: snap(clamp(source.noticeMs, 400, 1200, base.noticeMs), 50),
      waves,
      zoneSpawn: { threeWay: typeof z.threeWay === "boolean" ? z.threeWay : true,
        bottom, left, right: 100 - bottom - left,
        sideSpeed: clamp(z.sideSpeed, .8, 1.2, 1), angle: clamp(z.angle, 42, 62, 54),
        height: clamp(z.height, .78, .96, .90), maxActive: snap(clamp(z.maxActive, 7, 10, source.zoneMaxActive || 9), 1) },
      issenChance: Math.round(snap(clamp(source.issenChance, 0, 1, base.issenChance), .05) * 100) / 100,
      criticalCenterRatio: closest(source.criticalCenterRatio, centerChoices, base.criticalCenterRatio),
      criticalMinSpeed: closest(source.criticalMinSpeed, speedChoices, base.criticalMinSpeed),
      zoneRequiredPoints: snap(clamp(source.zoneRequiredPoints, 10, 40, base.zoneRequiredPoints), 1),
      zoneDurationMs: snap(clamp(source.zoneDurationMs, 5000, 10000, base.zoneDurationMs), 500),
      zoneMaxActive: snap(clamp(source.zoneMaxActive, 7, 10, base.zoneMaxActive), 1),
      zoneVelocityScale: snap(clamp(source.zoneVelocityScale, .70, 1.1, base.zoneVelocityScale), .01),
      zoneIntervalScale: snap(clamp(source.zoneIntervalScale, .40, 1.20, base.zoneIntervalScale), .05),
      zoneIssenChance: snap(clamp(source.zoneIssenChance, 0, 1, base.zoneIssenChance), .05),
      zoneHitStopMs: snap(clamp(source.zoneHitStopMs, 35, 50, base.zoneHitStopMs), 1),
      zoneBurstPreset: ["previous", "standard", "reference"].includes(source.zoneBurstPreset)
        ? source.zoneBurstPreset : base.zoneBurstPreset,
      vfx: {
        mode: ["legacy", "dynamic"].includes(v.mode) ? v.mode : base.vfx.mode,
        quality: ["high", "standard", "low"].includes(v.quality) ? v.quality : "standard",
        strength: ["weak", "standard", "strong"].includes(v.strength) ? v.strength : "standard",
        speed: clamp(v.speed, .5, 1.5, 1), life: clamp(v.life, .5, 1.5, 1),
        gravity: clamp(v.gravity, .25, 2, 1), spread: clamp(v.spread, .5, 1.5, 1),
        waveDelay: clamp(v.waveDelay, .5, 2, 1)
      },
      special: {
        criticalTotalMs: snap(clamp(s.criticalTotalMs, 600, 900, base.special.criticalTotalMs), 20),
        criticalHoldMs: snap(clamp(s.criticalHoldMs, 300, 420, base.special.criticalHoldMs), 20),
        criticalEffectAlpha: snap(clamp(s.criticalEffectAlpha, .25, .8, base.special.criticalEffectAlpha), .01),
        criticalPopScale: snap(clamp(s.criticalPopScale, 1, 1.2, base.special.criticalPopScale), .02),
        issenTotalMs: snap(clamp(s.issenTotalMs, 850, 1250, base.special.issenTotalMs), 50),
        issenHoldMs: snap(clamp(s.issenHoldMs, 400, 650, base.special.issenHoldMs), 10),
        issenEffectAlpha: snap(clamp(s.issenEffectAlpha, .25, .8, base.special.issenEffectAlpha), .01),
        issenEntryDistance: snap(clamp(s.issenEntryDistance, 20, 90, base.special.issenEntryDistance), 5),
        issenExitDistance: snap(clamp(s.issenExitDistance, 10, 55, base.special.issenExitDistance), 5),
        ringEnabled: typeof s.ringEnabled === "boolean" ? s.ringEnabled : base.special.ringEnabled,
        secondRingEnabled: typeof s.secondRingEnabled === "boolean" ? s.secondRingEnabled : base.special.secondRingEnabled,
        labelScale: snap(clamp(s.labelScale, .95, 1.15, base.special.labelScale), .01)
      }
    };
  }
  let current = defaults();
  let loaded = false;
  let saveCount = 0;
  function load() {
    if (loaded) return snapshot();
    loaded = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) current = normalize(JSON.parse(raw));
    } catch (_error) {
      // file://等でStorageが使えなくてもゲームは続ける。
    }
    if (window.__NINJA_QA) window.__NINJA_QA.devSettingsLoaded = true;
    return snapshot();
  }
  function snapshot() {
    return normalize(current);
  }
  function save(value) {
    current = normalize(value);
    saveCount += 1;
    try { window.localStorage.setItem(KEY, JSON.stringify(current)); } catch (_error) { /* 同上 */ }
    if (window.__NINJA_QA) window.__NINJA_QA.devSettingsSaveCount = saveCount;
    return snapshot();
  }
  function forGame() {
    if (!NINJA_CONFIG.DEV_PANEL_ENABLED) return defaults();
    load();
    return snapshot();
  }
  window.MapSymbolNinja.DevSettings = { KEY, defaults, normalize, load, save, snapshot, forGame,
    centerChoices, speedChoices };
})();
