(function () {
  "use strict";
  const app = MapSymbolNinja, clone = v => JSON.parse(JSON.stringify(v));
  const KEY = "chizu-kigou-ninja.shop-layout.v0317";
  function validate(raw) {
    const base = app.ShopLayoutConfig;
    function visit(value, template, path) {
      if (template && typeof template === "object") {
        if (!value || typeof value !== "object" || Array.isArray(value) ||
          Object.keys(value).length !== Object.keys(template).length || Object.keys(value).some(k => !Object.hasOwn(template,k))) throw Error("項目が違います: " + path);
        return Object.fromEntries(Object.keys(template).map(k => [k, visit(value[k],template[k],path+"."+k)]));
      }
      if (typeof value !== typeof template) throw Error("型が違います: " + path);
      if (typeof value === "number") {
        if (!Number.isFinite(value)) throw Error("有限の数値が必要です: " + path);
        const key = path.split(".").pop();
        const range = /[Ss]cale$/.test(key) ? [.4,1.6] : key === "fontSize" ? [12,48] : key === "margin" ? [0,100] : [-1366,1366];
        if (value < range[0] || value > range[1]) throw Error("範囲外です: " + path);
      }
      return value;
    }
    const next = visit(raw,base,"shop");
    if (next.version !== base.version || next.scene !== base.scene || next.canvas.width !== 1366 || next.canvas.height !== 768 || ![10,20,50].includes(next.grid.size)) throw Error("v0.3.17のショップ配置JSONを使ってください。");
    return next;
  }
  class ShopLayoutModel {
    constructor(storage) { this.storage=storage;this.value=clone(app.ShopLayoutConfig);this.history=[]; }
    checkpoint() { this.history.push(clone(this.value));if(this.history.length>50)this.history.shift(); }
    change(section,id,values,record=true) {
      const next=clone(this.value), target=id ? next[section] && next[section][id] : next[section];
      if(!target)throw Error("対象が見つかりません。");
      Object.keys(values).forEach(k=>{if(!Object.hasOwn(target,k))throw Error("不明な設定です。");target[k]=values[k];});
      const checked=validate(next);if(record)this.checkpoint();this.value=checked;
    }
    reset(section,id) { this.checkpoint();if(section)this.value[section][id]=clone(app.ShopLayoutConfig[section][id]);else this.value=clone(app.ShopLayoutConfig); }
    undo() { if(this.history.length)this.value=this.history.pop(); }
    export() { return JSON.stringify(this.value,null,2); }
    import(text) { const checked=validate(JSON.parse(text));this.checkpoint();this.value=checked; }
    save() { try { if(!this.storage)throw Error();this.storage.setItem(KEY,this.export());return true; }catch(_){return false;} }
    load() { try { const text=this.storage && this.storage.getItem(KEY);if(!text)return false;const checked=validate(JSON.parse(text));this.value=checked;return true; }catch(_){return false;} }
  }
  ShopLayoutModel.validate=validate;ShopLayoutModel.STORAGE_KEY=KEY;app.ShopLayoutModel=ShopLayoutModel;
  app.ShopViewState = function(sword,state,busy) {
    const owned=state.ownedSwords.includes(sword.id),equipped=state.equippedSword===sword.id,shortfall=Math.max(0,sword.price-state.wallet);
    const kind=busy || state.checking ? "busy" : state.problem ? "problem" : equipped ? "equipped" : owned ? "owned" : shortfall ? "shortage" : "ready";
    const labels={busy:"処理中…",problem:"保存を確認してね",equipped:"装備中",owned:"装備する",shortage:"小判が たりない",ready:"購入する"};
    return {owned,equipped,shortfall,kind,label:labels[kind],disabled:!["owned","ready"].includes(kind)};
  };
})();
