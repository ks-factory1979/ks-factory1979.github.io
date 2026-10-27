(function () {
  "use strict";
  const app = window.MapSymbolNinja = window.MapSymbolNinja || {};
  const key = "chizuKigouNinja_effects_v1";
  const profiles = Object.freeze([
    { id: "standard", name: "標準", description: "今の迫力で、刀の個性を楽しむ。", opacity: 1, heroes: 3 },
    { id: "clear", name: "見やすく", description: "光と重なりを控えて、札を見やすく。", opacity: .68, heroes: 1 },
    { id: "light", name: "軽く", description: "光と粒を減らして、軽い表示に。", opacity: .60, heroes: 1 }
  ].map(Object.freeze));
  let selected = "standard", persisted = true;
  const get = id => profiles.find(profile => profile.id === id) || profiles[0];
  app.EffectPreferences = Object.freeze({
    key, profiles, get,
    load() {
      if (!persisted) return get(selected);
      try {
        const raw = window.localStorage.getItem(key);
        try {
          const data = raw ? JSON.parse(raw) : null;
          selected = data && data.version === 1 ? get(data.profile).id : "standard";
        } catch (_error) { selected = "standard"; }
      } catch (_error) { /* Keep this session usable when storage is unavailable. */ }
      return get(selected);
    },
    choose(id) {
      if (!profiles.some(profile => profile.id === id)) return { profile: get(selected), persisted, changed: false };
      selected = id;
      try { window.localStorage.setItem(key, JSON.stringify({ version: 1, profile: id })); persisted = true; }
      catch (_error) { persisted = false; }
      return { profile: get(selected), persisted, changed: true };
    },
    vfx(base) {
      const profile = this.load();
      const options = Object.assign({}, base, { presentation: profile.id, effectOpacity: profile.opacity, heroLimit: profile.heroes });
      if (profile.id === "light") { options.quality = "low"; options.strength = "weak"; }
      return options;
    }
  });
})();
