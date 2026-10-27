(function () {
  "use strict";
  window.MapSymbolNinja = window.MapSymbolNinja || {};
  const keys = {};
  const specs = [
    ["TITLE_LOGO", "assets/title/title_logo.png", [12, 86, 1972, 636]],
    ["TITLE_BACKGROUND", "assets/backgrounds/title_background.png"],
    ["GAME_BACKGROUND", "assets/backgrounds/game_background.png"],
    ["BUTTON_NORMAL", "assets/ui/button_normal.png"],
    ["BUTTON_SELECTED", "assets/ui/button_selected.png"],
    ["BUTTON_PRESSED", "assets/ui/button_pressed.png"],
    ["MISSION_FRAME", "assets/ui/mission_frame.png", [18, 174, 2023, 384]],
    ["PANEL_LARGE", "assets/ui/panel_large.png", [43, 45, 1451, 926]],
    ["PANEL_SMALL", "assets/ui/panel_small.png", [49, 146, 1718, 552]],
    ["RESULT_FRAME", "assets/ui/result_frame.png", [15, 18, 1092, 1333]],
    ["UNLOCK_SCROLL_LEFT", "assets/unlock/scroll_left.png", [395, 70, 475, 1110]],
    ["UNLOCK_SCROLL_CENTER", "assets/unlock/scroll_center.png", [45, 170, 1898, 455]],
    ["UNLOCK_SCROLL_RIGHT", "assets/unlock/scroll_right.png", [410, 68, 480, 1110]],
    ["UNLOCK_STAMP", "assets/unlock/unlock_stamp.png", [40, 44, 1177, 1165]],
    ["TRAINING_STAGE_CARD", "assets/collection/training_stage_card.png"],
    ["NINJUTSU_BOOK_SPREAD", "assets/collection/ninjutsu_book_spread.png"],
    ["SEAL_DISCOVERED", "assets/collection/seal_discovered.png"],
    ["SEAL_ACQUIRED", "assets/collection/seal_acquired.png"],
    ["SEAL_MASTER", "assets/collection/seal_master.png"]
  ].map(([name, path, frame]) => {
    const key = "ui_" + name.toLowerCase();
    keys[name] = key;
    return Object.freeze({ key, path, frame });
  });
  MapSymbolNinja.AssetKeys = Object.freeze(keys);
  MapSymbolNinja.UIAssetSpecs = Object.freeze(specs);
  // 既存Coreのdepthに合わせる。HUDより上に認識用の文字を置く。
  MapSymbolNinja.Depth = Object.freeze({
    BACKGROUND: -100, WORLD: 0, CARDS: 50, CUT_PIECES: 170,
    HIT_EFFECTS: 180, ZONE_WORLD: 171, ZONE_INTRO: 840, HUD: 700, QUESTION: 760,
    SLASH: 900, SPECIAL_TEXT: 930, MODAL: 980, TRANSITION: 1100, UNLOCK: 2000
  });
  MapSymbolNinja.GamePhase = Object.freeze({
    READY: "READY", COUNTDOWN: "COUNTDOWN", PLAYING: "PLAYING", ENDING: "ENDING"
  });
})();
