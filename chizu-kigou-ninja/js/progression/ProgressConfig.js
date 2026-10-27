(function () {
  "use strict";
  window.MapSymbolNinja = window.MapSymbolNinja || {};
  MapSymbolNinja.ProgressConfig = Object.freeze({
    SCHEMA_VERSION: 3,
    // 保存先を継続して旧記録を移す。v2表記は保存先の名前。
    STORAGE_KEY: "chizuKigouNinja_progress_v2",
    LEGACY_STORAGE_KEY: "chizuKigouNinja_progress_v1",
    DATABASE_NAME: "chizuKigouNinja_learning_v2",
    DISCOVER_THRESHOLD: 1,
    ACQUIRE_THRESHOLD: 3,
    MASTER_THRESHOLD: 10,
    RESULT_DELAY_MS: 500,
    UNLOCK_GAP_MS: 140,
    MASTERY_LABELS: Object.freeze({ unknown: "未発見", discovered: "発見", acquired: "会得", master: "極意" })
  });
})();
