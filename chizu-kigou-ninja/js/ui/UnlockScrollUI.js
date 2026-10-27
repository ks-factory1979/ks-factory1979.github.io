(function () {
  "use strict";
  const UI = MapSymbolNinja.UI;

  UI.copyUnlockRequests = function (events) {
    if (!Array.isArray(events)) return [];
    // SceneデータにSystem、関数、Spriteを持ち込まない。
    return events.slice(0, 6).filter((item) => item && typeof item === "object").map((item) => {
      const result = { title: String(item.title || "あらたな修行").slice(0, 60),
        subtitle: String(item.subtitle || "かいほう！").slice(0, 60),
        variant: item.variant === "rank" ? "rank" : "stage" };
      for (const key of ["stampTint", "stampRotation", "holdDuration"]) {
        if (Number.isFinite(item[key])) result[key] = item[key];
      }
      return result;
    });
  };

  UI.attachUnlockScroll = function (scene) {
    if (scene.unlockScroll && !scene.unlockScroll.destroyed) return scene.unlockScroll;
    const keys = MapSymbolNinja.AssetKeys;
    scene.unlockScroll = new NinjaCore.UnlockScrollOverlay(scene, {
      width: NINJA_CONFIG.WIDTH, height: NINJA_CONFIG.HEIGHT,
      depth: MapSymbolNinja.Depth.UNLOCK, fontFamily: UI.fontFamily,
      reducedMotion: window.__NINJA_REDUCED_MOTION,
      keys: { left: keys.UNLOCK_SCROLL_LEFT, center: keys.UNLOCK_SCROLL_CENTER,
        right: keys.UNLOCK_SCROLL_RIGHT, stamp: keys.UNLOCK_STAMP },
      onOpen: (payload) => {
        window.__NINJA_QA.unlockScrollOpenCount += 1;
        // 将来の「しゅるるっ」SEを接続する位置。新音声は追加しない。
        scene.events.emit("unlockscroll:open", payload);
      },
      onStamp: (payload) => {
        window.__NINJA_QA.unlockScrollStampCount += 1;
        // 将来の「ぽん／どん」SEを接続する位置。
        scene.events.emit("unlockscroll:stamp", payload);
      },
      onState: (state) => { window.__NINJA_QA.unlockScrollState = Object.assign({}, state); }
    });
    scene.showUnlockScroll = (options) => UI.showUnlockScroll(scene, options);
    scene.events.once("shutdown", () => { scene.unlockScroll = null; scene.showUnlockScroll = null; });
    return scene.unlockScroll;
  };

  UI.showUnlockScroll = function (scene, options) {
    // 本編の時計やZONEを止める新ルールは作らない。ごほうびはタイトル／結果で表示する。
    if (scene.gamePhase || scene.transitionLock || !scene.input.enabled) return false;
    const system = UI.attachUnlockScroll(scene);
    return system.show(Object.assign({ reducedMotion: window.__NINJA_REDUCED_MOTION }, options || {}));
  };

  UI.presentUnlocks = function (scene, events) {
    const queue = UI.copyUnlockRequests(events);
    if (!queue.length) return false;
    let cancelled = false;
    const stop = () => { cancelled = true; queue.length = 0; };
    scene.events.once("shutdown", stop);
    const next = () => {
      if (cancelled) return;
      if (!queue.length) { scene.events.off("shutdown", stop); return; }
      const request = queue.shift();
      if (!UI.showUnlockScroll(scene, Object.assign(request, { onComplete: () => {
        window.__NINJA_QA.unlockScrollCompleteCount += 1; next();
      } }))) { stop(); scene.events.off("shutdown", stop); }
    };
    next();
    return !cancelled;
  };
})();
