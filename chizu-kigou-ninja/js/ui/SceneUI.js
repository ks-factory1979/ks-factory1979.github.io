(function () {
  "use strict";
  const UI = MapSymbolNinja.UI;

  UI.asset = function (scene, key, x, y, width, depth) {
    const texture = scene.textures.get(key);
    const frame = texture.has("content") ? "content" : undefined;
    const image = scene.add.image(x, y, key, frame).setDepth(depth === undefined ? 100 : depth);
    const scale = width / image.width;
    return image.setScale(scale);
  };

  UI.coverBackground = function (scene, key, dim) {
    const image = scene.add.image(NINJA_CONFIG.WIDTH / 2, NINJA_CONFIG.HEIGHT / 2, key)
      .setDepth(MapSymbolNinja.Depth.BACKGROUND);
    image.setScale(Math.max(NINJA_CONFIG.WIDTH / image.width, NINJA_CONFIG.HEIGHT / image.height));
    if (dim) scene.add.rectangle(683, 384, 1366, 768, 0x020710, dim)
      .setDepth(MapSymbolNinja.Depth.BACKGROUND + 1);
    return image;
  };

  UI.enterScene = function (scene) {
    if (MapSymbolNinja.learningSaveNotice) MapSymbolNinja.learningSaveNotice.setScene(scene);
    if (MapSymbolNinja.economySaveNotice) MapSymbolNinja.economySaveNotice.setScene(scene);
    if (window.ninjaBGM) window.ninjaBGM.enterScene(scene);
    scene.transitionLock = false;
    scene.input.enabled = true;
    scene.cameras.main.fadeIn(window.__NINJA_REDUCED_MOTION ? 100 : 180, 0, 0, 0);
  };

  UI.transition = function (scene, next, data) {
    if (scene.transitionLock || !scene.input.enabled) return false;
    scene.transitionLock = true;
    if (scene.navigation) scene.navigation.setEnabled(false);
    // Audioの復号やresumeの失敗が画面遷移を止めない。
    try {
      Promise.resolve(window.ninjaAudio.unlock()).catch(() => {});
      if (window.ninjaBGM) window.ninjaBGM.prepare().catch(() => false);
      window.ninjaAudio.play("ui");
    } catch (_error) { /* 無音でも遊べる。 */ }
    const duration = window.__NINJA_REDUCED_MOTION ? 100 : 220;
    scene.cameras.main.fadeOut(duration, 0, 0, 0);
    const timer = scene.time.delayedCall(duration, () => scene.scene.start(next, data));
    scene.events.once("shutdown", () => timer.remove(false));
    return true;
  };

  UI.devVisible = function () {
    return NINJA_CONFIG.DEV_PANEL_ENABLED &&
      (NINJA_CONFIG.DEBUG_MODE || new URLSearchParams(window.location.search).get("dev") === "1");
  };

  // Keep small menu hit areas at least 44 CSS pixels without stretching their artwork.
  // Game cards and the swipe canvas use their original hit detection.
  UI.keepMenuTouchTargets = function (scene, buttons) {
    const originals = buttons.map(button => {
      const area = button.container.input && button.container.input.hitArea;
      return area ? { button, x: area.x, y: area.y, width: area.width, height: area.height } : null;
    }).filter(Boolean);
    let frame = null;
    const update = () => {
      frame = null;
      const rect = scene.game.canvas.getBoundingClientRect(), scale = rect.width / NINJA_CONFIG.WIDTH;
      if (!(scale > 0)) return;
      originals.forEach(base => {
        const area = base.button.container.input && base.button.container.input.hitArea;
        if (!area) return;
        const dx = Math.max(0, 44 / scale - base.width), dy = Math.max(0, 44 / scale - base.height);
        area.setTo(base.x - dx / 2, base.y - dy / 2, base.width + dx, base.height + dy);
      });
    };
    const resize = () => { if (frame !== null) window.cancelAnimationFrame(frame); frame = window.requestAnimationFrame(update); };
    window.addEventListener("resize", resize, { passive: true }); scene.scale.on("resize", resize);
    scene.events.once("shutdown", () => {
      window.removeEventListener("resize", resize); scene.scale.off("resize", resize);
      if (frame !== null) window.cancelAnimationFrame(frame);
    });
    update();
  };
})();
