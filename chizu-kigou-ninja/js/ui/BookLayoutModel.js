(function () {
  "use strict";
  const app = MapSymbolNinja, clone = value => JSON.parse(JSON.stringify(value));
  const KEY = "chizu-kigou-ninja.book-layout.v037";
  function validate(raw) {
    const base = app.NinjutsuBookLayoutConfig;
    if (!raw || raw.version !== base.version || raw.scene !== base.scene) throw new Error("v0.3.7の忍術帖JSONを使ってください。");
    const visit = (value, template, path) => {
      if (typeof template === "object") {
        if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== Object.keys(template).length ||
          Object.keys(value).some(k => !Object.prototype.hasOwnProperty.call(template, k))) throw new Error("項目が違います: " + path);
        const out = {};
        for (const key of Object.keys(template)) out[key] = visit(value[key], template[key], path + "." + key);
        return out;
      }
      if (typeof value !== typeof template) throw new Error("型が違います: " + path);
      const key = path.split(".").pop();
      if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("有限の数値が必要です: " + path);
        let min = -2732, max = 2732;
        if (["width", "height", "size"].includes(key)) { min = 1; max = 2000; }
        if (key === "fontSize") { min = 12; max = 96; }
        if (key === "scale") { min = .1; max = 4; }
        if (key === "gap") { min = 10; max = 250; }
        if (key === "lineSpacing") { min = 0; max = 40; }
        if (key === "originX" || key === "originY") { min = 0; max = 1; }
        if (value < min || value > max) throw new Error("範囲外です: " + path);
      }
      if (key === "align" && !["left", "center", "right"].includes(value)) throw new Error("文字揃えが不正です。");
      return value;
    };
    const result = visit(raw, base, "layout");
    if (![10, 20, 50].includes(result.grid.size) || result.canvas.width !== 1366 || result.canvas.height !== 768) throw new Error("グリッドまたは画面サイズが不正です。");
    return result;
  }
  class BookLayoutModel {
    constructor(storage) { this.storage = storage; this.value = clone(app.NinjutsuBookLayoutConfig); this.history = []; this.message = "標準配置"; }
    checkpoint() { this.history.push(clone(this.value)); if (this.history.length > 50) this.history.shift(); }
    edit(id, values, record = true) {
      const next = clone(this.value); if (!Object.prototype.hasOwnProperty.call(next.elements, id)) throw new Error("不明な対象です。");
      for (const key of Object.keys(values)) {
        if (!Object.prototype.hasOwnProperty.call(next.elements[id], key)) throw new Error("不明な設定です。");
        next.elements[id][key] = values[key];
      }
      const checked = validate(next); if (record) this.checkpoint(); this.value = checked;
    }
    options(section, values) {
      const next = clone(this.value);
      for (const key of Object.keys(values)) {
        if (!next[section] || !Object.prototype.hasOwnProperty.call(next[section], key)) throw new Error("不明な設定です。");
        next[section][key] = values[key];
      }
      const checked = validate(next); this.checkpoint(); this.value = checked;
    }
    reset(id) { this.checkpoint(); if (id) this.value.elements[id] = clone(app.NinjutsuBookLayoutConfig.elements[id]); else this.value = clone(app.NinjutsuBookLayoutConfig); }
    undo() { if (!this.history.length) return false; this.value = this.history.pop(); return true; }
    import(text) { const next = validate(JSON.parse(text)); this.checkpoint(); this.value = next; }
    export() { return JSON.stringify(this.value, null, 2); }
    save() { try { if (!this.storage) throw new Error(); this.storage.setItem(KEY, this.export()); this.message = "配置を保存しました（学習記録とは別）。"; return true; } catch (_) { this.message = "保存できません。JSONを書き出して保管してください。"; return false; } }
    load(record = true) {
      try { if (!this.storage) throw new Error(); const raw = this.storage.getItem(KEY); if (!raw) { this.message = "保存済み配置はありません。"; return false; }
        const next = validate(JSON.parse(raw)); if (record) this.checkpoint(); this.value = next; this.message = "保存済み配置を読み込みました。"; return true;
      } catch (_) { this.message = "保存済み配置を読み込めません。標準配置またはJSONを使ってください。"; return false; }
    }
  }
  app.BookLayoutModel = BookLayoutModel; app.BookLayoutModel.validate = validate; app.BookLayoutModel.STORAGE_KEY = KEY;
})();
