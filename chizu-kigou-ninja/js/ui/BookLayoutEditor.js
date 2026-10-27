(function () {
  "use strict";
  const app = MapSymbolNinja;
  class BookLayoutEditor {
    constructor(scene) { this.scene = scene; this.model = scene.layoutModel; this.selected = "detailTitle"; this.drag = null; this.dock = 0; }
    start() {
      if (!NINJA_CONFIG.DEV_PANEL_ENABLED || !this.scene.layoutEditingAllowed) return false;
      const s = this.scene; this.abort = new AbortController(); this.navigationEnabled = s.navigation.enabled; s.navigation.enabled = false;
      this.keyboardEnabled = s.input.keyboard && s.input.keyboard.enabled; if (s.input.keyboard) s.input.keyboard.enabled = false;
      if (s.editButton) s.editButton.setVisible(false);
      this.graphics = s.add.graphics().setDepth(1000);
      this.label = s.add.text(0, 0, "", { fontFamily: app.UI.fontFamily, fontSize: "18px", color: "#fff", backgroundColor: "#9b420b", padding: { x: 4, y: 2 } }).setDepth(1001);
      this.guideLabels = ["左ページ 安全範囲", "右ページ 安全範囲", "背表紙 禁止", "説明枠"].map(text => s.add.text(0, 0, text,
        { fontFamily: app.UI.fontFamily, fontSize: "14px", color: "#ffffff", backgroundColor: "#135f50", padding: { x: 3, y: 1 } }).setDepth(1001));
      this.panel = document.createElement("aside"); this.panel.id = "book-layout-editor"; this.panel.setAttribute("aria-label", "忍術帖レイアウト調整");
      this.panel.innerHTML = `<header><strong>レイアウト調整</strong><button data-action="collapse">たたむ</button><button data-action="dock">位置</button><button data-action="finish">終了</button></header>
        <div class="book-editor-content"><p>1366×768の論理座標。行の子要素は行からの相対座標。ドラッグは移動量を保ちます。</p>
        <label>対象 <select data-control="target"></select></label><div data-fields></div>
        <div class="book-editor-nudges">X <button data-nudge="x:-10">−10</button><button data-nudge="x:-1">−1</button><button data-nudge="x:1">＋1</button><button data-nudge="x:10">＋10</button><br>
        Y <button data-nudge="y:-10">−10</button><button data-nudge="y:-1">−1</button><button data-nudge="y:1">＋1</button><button data-nudge="y:10">＋10</button></div>
        <label><input type="checkbox" data-option="grid:visible">グリッド</label><label>間隔 <select data-option="grid:size"><option>10</option><option>20</option><option>50</option></select> px</label>
        <label><input type="checkbox" data-option="grid:snap">ドラッグをスナップ（表示とは独立）</label>
        <label><input type="checkbox" data-option="guides:safe">安全範囲・説明枠</label><label><input type="checkbox" data-option="guides:spine">背表紙の禁止範囲</label>
        <label>修行 <select data-control="stage"><option value="1">其ノ一</option><option value="2">其ノ二</option><option value="3">其ノ三</option><option value="4">其ノ四</option></select></label>
        <label>記号 <select data-control="item"></select></label>
        <label>表示だけの状態 <select data-control="preview"><option value="saved">保存した学習状態</option><option value="unknown">未発見</option><option value="discovered">発見</option><option value="acquired">会得</option><option value="master">極意</option></select></label>
        <label>説明枠 <select data-control="mode"><option value="explanation">きごうの せつめい</option><option value="secret">ひみつを知る</option></select></label>
        <div><button data-action="undo">元に戻す</button><button data-action="reset">選択を標準へ</button><button data-action="resetAll">全体を標準へ</button></div>
        <div><button data-action="save">配置保存</button><button data-action="load">保存を再読込</button></div>
        <div><button data-action="export">JSON表示</button><button data-action="copy">コピー</button><button data-action="download">ダウンロード</button><button data-action="import">JSON読込</button></div>
        <textarea data-json aria-label="配置JSON" spellcheck="false" placeholder="JSONの書き出し・貼り付け読込"></textarea>
        <p data-status role="status"></p><div data-warnings aria-live="polite"></div></div>`;
      document.body.append(this.panel);
      const options = [...s.registry.map(entry => ({ id: entry.id, name: entry.id + " → " + entry.configId })), ...["leftSafe", "rightSafe", "spine", "descriptionBox"].map(id => ({ id, name: id }))];
      const target = this.panel.querySelector('[data-control="target"]');
      options.forEach(entry => { const o = document.createElement("option"); o.value = entry.id; o.textContent = entry.name; target.append(o); });
      this.listen(this.panel, "click", e => this.click(e)); this.listen(this.panel, "change", e => this.change(e));
      // DOM inputs keep their ordinary keyboard behavior; Phaser shortcuts stay suspended until exit.
      this.listen(this.panel, "keydown", e => e.stopPropagation());
      const canvas = s.game.canvas;
      this.listen(canvas, "pointerdown", e => this.pointerDown(e), true);
      this.listen(window, "pointermove", e => this.pointerMove(e), true);
      this.listen(window, "pointerup", e => this.pointerUp(e), true);
      this.listen(window, "pointercancel", e => this.pointerUp(e), true);
      this.listen(window, "blur", () => { this.drag = null; });
      this.setSelected(this.selected); window.__NINJA_QA.bookLayoutEditing = true;
    }
    listen(target, type, handler, capture = false) { target.addEventListener(type, handler, { capture, signal: this.abort.signal }); }
    getEntry(id = this.selected) {
      const entry = this.scene.registry.find(entry => entry.id === id);
      if (entry) return entry;
      const c = this.model.value.elements[id];
      return { id, configId: id, visible: () => true, bounds: () => new Phaser.Geom.Rectangle(c.x, c.y, c.width, c.height) };
    }
    setSelected(id) {
      this.selected = id; this.panel.querySelector('[data-control="target"]').value = id;
      const c = this.model.value.elements[this.getEntry().configId], fields = this.panel.querySelector('[data-fields]'); fields.replaceChildren();
      Object.keys(c).forEach(key => {
        const label = document.createElement("label"); label.textContent = key + " ";
        const input = document.createElement(key === "align" ? "select" : "input"); input.dataset.field = key; input.setAttribute("aria-label", key);
        if (key === "align") ["left", "center", "right"].forEach(value => { const o = document.createElement("option"); o.value = value; o.textContent = value; input.append(o); });
        else if (typeof c[key] === "boolean") input.type = "checkbox";
        else { input.type = "number"; input.step = ["scale", "originX", "originY"].includes(key) ? ".1" : "1"; }
        label.append(input); fields.append(label);
      }); this.refresh();
    }
    status(message) { this.panel.querySelector('[data-status]').textContent = message; }
    apply(action) {
      try { action(); this.scene.applyLayout(); this.scene.publishQA(); } catch (error) { this.status(error.message); this.refresh(); }
    }
    change(e) {
      const t = e.target;
      if (t.dataset.field && t.type === "number" && t.value.trim() === "") {
        t.value = this.model.value.elements[this.getEntry().configId][t.dataset.field]; this.status("数値を入力してください。"); return;
      }
      if (t.dataset.field) this.apply(() => this.model.edit(this.getEntry().configId, { [t.dataset.field]: t.type === "checkbox" ? t.checked : t.tagName === "SELECT" ? t.value : Number(t.value) }));
      if (t.dataset.option) { const [section, key] = t.dataset.option.split(":"); this.apply(() => this.model.options(section, { [key]: t.type === "checkbox" ? t.checked : Number(t.value) })); }
      const control = t.dataset.control;
      if (control === "target") this.setSelected(t.value);
      if (control === "stage") this.scene.showStage(Number(t.value));
      if (control === "item") this.scene.selectItem(Number(t.value));
      if (control === "preview") { this.scene.previewState = t.value; this.scene.showStage(this.scene.stage, this.scene.selectedId); }
      if (control === "mode") { this.scene.setMode(t.value); this.refresh(); }
    }
    async click(e) {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.nudge) { const [axis, step] = t.dataset.nudge.split(":"); this.apply(() => this.model.edit(this.getEntry().configId, { [axis]: this.model.value.elements[this.getEntry().configId][axis] + Number(step) })); return; }
      const action = t.dataset.action;
      if (action === "finish") { this.destroy(); return; }
      if (action === "collapse") { this.panel.classList.toggle("collapsed"); t.textContent = this.panel.classList.contains("collapsed") ? "ひらく" : "たたむ"; return; }
      if (action === "dock") { this.dock = (this.dock + 1) % 4; this.panel.dataset.dock = this.dock; return; }
      if (action === "undo") this.apply(() => { this.model.undo(); });
      if (action === "reset") this.apply(() => this.model.reset(this.getEntry().configId));
      if (action === "resetAll") this.apply(() => this.model.reset());
      if (action === "save") { this.model.save(); this.status(this.model.message); }
      if (action === "load") { this.apply(() => this.model.load()); this.status(this.model.message); }
      if (["export", "copy", "download"].includes(action)) {
        const text = this.model.export(); this.panel.querySelector('[data-json]').value = text;
        if (action === "copy") {
          try { await navigator.clipboard.writeText(text); if (this.panel) this.status("JSONをコピーしました。"); }
          catch (_) { if (this.panel) { this.panel.querySelector('[data-json]').select(); this.status("コピーできません。表示したJSONを手動でコピーしてください。"); } }
        }
        if (action === "download") {
          const url = URL.createObjectURL(new Blob([text], { type: "application/json" })), a = document.createElement("a");
          a.href = url; a.download = "ninjutsu-book-layout-v0.3.7.json"; a.click(); URL.revokeObjectURL(url); this.status("JSONを書き出しました。");
        }
      }
      if (action === "import") this.apply(() => { this.model.import(this.panel.querySelector('[data-json]').value); this.status("JSONを読み込みました。"); });
    }
    point(e) {
      const b = this.scene.game.canvas.getBoundingClientRect(); return { x: (e.clientX - b.left) * 1366 / b.width, y: (e.clientY - b.top) * 768 / b.height };
    }
    pointerDown(e) {
      if (e.button !== 0) return; e.preventDefault(); e.stopImmediatePropagation(); const p = this.point(e);
      // Prefer a small, actual displayed object over its parent row or artwork.
      const entries = this.scene.registry.filter(entry => entry.id !== "spread" && entry.visible() && (!entry.object.parentContainer || entry.object.parentContainer.visible));
      const candidates = entries.filter(entry => entry.bounds().contains(p.x, p.y)).sort((a, b) => { const x = a.bounds(), y = b.bounds(); return x.width * x.height - y.width * y.height; });
      const selected = this.getEntry();
      const entry = !selected.object && selected.bounds().contains(p.x, p.y) ? selected : candidates[0];
      if (!entry) return; this.setSelected(entry.id); const c = this.model.value.elements[entry.configId];
      this.model.checkpoint(); this.drag = { pointerId: e.pointerId, x: p.x, y: p.y, startX: c.x, startY: c.y, configId: entry.configId };
      try { this.scene.game.canvas.setPointerCapture(e.pointerId); } catch (_) { /* Window listeners also handle release. */ }
    }
    pointerMove(e) {
      if (!this.drag || e.pointerId !== this.drag.pointerId) return; e.preventDefault(); e.stopImmediatePropagation();
      const d = this.drag, p = this.point(e), grid = this.model.value.grid;
      let x = d.startX + p.x - d.x, y = d.startY + p.y - d.y;
      if (grid.snap) { x = Math.round(x / grid.size) * grid.size; y = Math.round(y / grid.size) * grid.size; }
      else { x = Math.round(x); y = Math.round(y); }
      this.apply(() => this.model.edit(d.configId, { x, y }, false));
    }
    pointerUp(e) {
      if (!this.drag || e.pointerId !== this.drag.pointerId) return; e.preventDefault(); e.stopImmediatePropagation();
      try { this.scene.game.canvas.releasePointerCapture(e.pointerId); } catch (_) { /* Already released. */ } this.drag = null; this.refresh();
    }
    refresh() {
      if (!this.panel) return;
      const s = this.scene, value = this.model.value, c = value.elements[this.getEntry().configId];
      this.panel.querySelectorAll('[data-field]').forEach(input => { if (document.activeElement !== input) { if (input.type === "checkbox") input.checked = c[input.dataset.field]; else input.value = c[input.dataset.field]; } });
      this.panel.querySelectorAll('[data-option]').forEach(input => { const [section, key] = input.dataset.option.split(":"); if (input.type === "checkbox") input.checked = value[section][key]; else input.value = value[section][key]; });
      this.panel.querySelector('[data-control="stage"]').value = s.stage; this.panel.querySelector('[data-control="preview"]').value = s.previewState; this.panel.querySelector('[data-control="mode"]').value = s.mode;
      const itemSelect = this.panel.querySelector('[data-control="item"]');
      if (itemSelect.dataset.stage !== String(s.stage)) { itemSelect.replaceChildren(); s.items.forEach((item, i) => { const o = document.createElement("option"); o.value = i; o.textContent = item.officialName; itemSelect.append(o); }); itemSelect.dataset.stage = s.stage; }
      itemSelect.value = s.items.findIndex(item => item.id === s.selectedId);
      const warnings = s.layoutWarnings(); this.panel.querySelector('[data-warnings]').textContent = warnings.length ? warnings.map(w => w.id + ": " + w.reason).join("\n") : "安全範囲内（表示中の要素）";
      this.draw(warnings); window.__NINJA_QA.bookLayoutWarnings = warnings;
    }
    draw(warnings) {
      const g = this.graphics, value = this.model.value, e = value.elements; g.clear();
      if (value.grid.visible) { g.lineStyle(1, 0x46add7, .3); for (let x = 0; x <= 1366; x += value.grid.size) g.lineBetween(x,0,x,768); for (let y=0;y<=768;y+=value.grid.size)g.lineBetween(0,y,1366,y); }
      const rect = (c, color, alpha) => { g.fillStyle(color, alpha).fillRect(c.x,c.y,c.width,c.height); g.lineStyle(2,color,.85).strokeRect(c.x,c.y,c.width,c.height); };
      if (value.guides.safe) { rect(e.leftSafe,0x14b77a,.05); rect(e.rightSafe,0x14b77a,.05); rect(e.descriptionBox,0x318eda,.06); }
      if (value.guides.spine) rect(e.spine,0xe44e65,.18);
      [e.leftSafe, e.rightSafe, e.spine, e.descriptionBox].forEach((c, i) => this.guideLabels[i]
        .setPosition(c.x, Math.max(0, c.y - 19)).setVisible(i === 2 ? value.guides.spine : value.guides.safe));
      for (const w of warnings) { const entry = this.scene.registry.find(entry => entry.id === w.id); if (entry) { const b=entry.bounds();g.lineStyle(3,0xff3558,1).strokeRect(b.x,b.y,b.width,b.height); } }
      const entry = this.getEntry(), b = entry.bounds(); g.lineStyle(3,0xff8a21,1).strokeRect(b.x-2,b.y-2,b.width+4,b.height+4);
      const c = e[entry.configId]; this.label.setText(entry.id+"  X:"+c.x+" Y:"+c.y).setPosition(Math.min(1060,Math.max(0,b.x)),Math.min(740,Math.max(0,b.y-27)));
    }
    destroy() {
      if (!this.panel) return; const s = this.scene;
      if (this.drag) { try { s.game.canvas.releasePointerCapture(this.drag.pointerId); } catch (_) { /* Capture may already have ended. */ } }
      this.abort.abort(); this.drag = null; this.panel.remove(); this.panel = null; this.graphics.destroy(); this.label.destroy();
      this.guideLabels.forEach(label => label.destroy());
      s.navigation.enabled = this.navigationEnabled; if (s.input.keyboard) s.input.keyboard.enabled = this.keyboardEnabled;
      if (s.editButton && s.editButton.active) s.editButton.setVisible(true);
      s.editor = null; s.previewState = "saved";
      if (s.sys.isActive()) s.showStage(s.stage, s.selectedId);
      window.__NINJA_QA.bookLayoutEditing = false; window.__NINJA_QA.bookLayoutWarnings = [];
    }
  }
  app.BookLayoutEditor = BookLayoutEditor;
})();
