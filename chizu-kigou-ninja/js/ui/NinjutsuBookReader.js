(function () {
  "use strict";
  const app = MapSymbolNinja;
  class NinjutsuBookReader {
    constructor(scene) { this.scene = scene; this.imageCache = new Map(); this.lastItem = null; this.lastMode = null; }
    start() {
      const s = this.scene;
      this.abort = new AbortController(); this.inputEnabled = s.input.enabled;
      this.navigationEnabled = s.navigation.enabled; this.keyboardEnabled = s.input.keyboard && s.input.keyboard.enabled;
      s.input.enabled = false; s.navigation.enabled = false; if (s.input.keyboard) s.input.keyboard.enabled = false;
      this.canvasAria = s.game.canvas.getAttribute("aria-hidden"); s.game.canvas.setAttribute("aria-hidden", "true");
      this.panel = document.createElement("section"); this.panel.id = "ninjutsu-book-reader"; this.panel.className = "book-reader";
      this.panel.setAttribute("aria-label", "忍術帖 一ページ表示");
      this.panel.innerHTML = `<header class="book-reader-toolbar"><strong>忍術帖</strong>
        <label class="sr-only" for="book-reader-stage">修行を選ぶ</label><select id="book-reader-stage" data-reader-stage></select>
        <button type="button" data-reader-action="spread">見開き</button><button type="button" data-reader-action="sound"></button>
        <button type="button" class="book-reader-fullscreen" data-reader-action="fullscreen">全画面</button>
        <button type="button" class="book-reader-back" data-reader-action="back"></button></header>
        <article class="book-reader-page" tabindex="0" aria-label="記号のページ。上下にスクロールできます">
          <div class="book-reader-content"><div class="book-reader-summary">
            <div class="book-reader-glyph-wrap"><img class="book-reader-glyph" alt="" data-reader-glyph hidden>
              <span class="book-reader-unknown" data-reader-unknown aria-label="まだ見つけていない記号">？</span>
              <img class="book-reader-seal" alt="" data-reader-seal hidden></div>
            <p class="book-reader-state" data-reader-state></p><p data-reader-success></p><p data-reader-progress></p>
          </div><div class="book-reader-detail"><h1 tabindex="-1" data-reader-title></h1>
            <div class="book-reader-modes" aria-label="読む内容"><button type="button" data-reader-action="explanation">きごうの せつめい</button>
              <button type="button" data-reader-action="secret">ひみつを知る</button></div>
            <h2 data-reader-secret-title hidden></h2><p class="book-reader-body" data-reader-body></p>
          </div></div><p class="book-reader-totals" data-reader-totals></p>
        </article><footer class="book-reader-pages"><button type="button" data-reader-action="previous">← 前の記号</button>
          <output data-reader-page aria-live="polite"></output><button type="button" data-reader-action="next">次の記号 →</button></footer>`;
      const stage = this.panel.querySelector("[data-reader-stage]");
      app.StageData.availableRanks.forEach(rank => [1, 2, 3, 4].forEach(n => {
        const option = document.createElement("option"); option.value = rank + ":" + n;
        option.textContent = app.StageData.getRank(rank).name.replace("の巻", "") + "・" + app.StageData.getStage(rank, n).displayName; stage.append(option);
      }));
      stage.addEventListener("change", () => { if (!s.transitionLock) { const [rank, n] = stage.value.split(":"); s.showRank(rank, Number(n)); } }, { signal: this.abort.signal });
      this.panel.addEventListener("click", e => this.click(e), { signal: this.abort.signal });
      this.panel.addEventListener("keydown", e => {
        e.stopPropagation(); if (["SELECT", "INPUT", "TEXTAREA"].includes(e.target.tagName) || s.transitionLock) return;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); if (!e.repeat) this.move(e.key === "ArrowLeft" ? -1 : 1); }
        else if (e.key === "Escape") { e.preventDefault(); s.closeReader(); }
      }, { signal: this.abort.signal });
      document.body.append(this.panel); document.body.classList.add("is-book-reading");
      window.__NINJA_QA.bookReaderOpen = true; this.refresh(); this.panel.querySelector("[data-reader-title]").focus({ preventScroll: true });
    }
    imageUrl(key) {
      if (!this.imageCache.has(key)) {
        const source = this.scene.textures.get(key).getSourceImage();
        this.imageCache.set(key, typeof source.toDataURL === "function" ? source.toDataURL("image/png") : source.src);
      }
      return this.imageCache.get(key);
    }
    refresh() {
      if (!this.panel) return;
      const s = this.scene, item = s.items.find(i => i.id === s.selectedId), secret = s.mode === "secret" && !item.concealed;
      const text = (name, value) => { this.panel.querySelector("[data-reader-" + name + "]").textContent = value; };
      this.panel.querySelector("[data-reader-stage]").value = s.rank + ":" + s.stage;
      text("title", item.officialName); text("state", s.detailState.text); text("success", s.success.text); text("progress", s.progressText.text.replace("　", "\n"));
      // The reader reflows for its own CSS width, independently of the spread's Canvas line breaks.
      text("body", secret ? s.secretBody.__ninjaSourceText : s.body.__ninjaSourceText); text("secret-title", secret ? s.secretTitle.__ninjaSourceText : "");
      this.panel.querySelector("[data-reader-secret-title]").hidden = !secret;
      const glyph = this.panel.querySelector("[data-reader-glyph]"), seal = this.panel.querySelector("[data-reader-seal]");
      glyph.hidden = item.concealed; this.panel.querySelector("[data-reader-unknown]").hidden = !item.concealed;
      if (item.concealed) { glyph.removeAttribute("src"); glyph.alt = ""; } else { glyph.src = this.imageUrl(item.textureKey); glyph.alt = item.officialName + "の地図記号"; }
      seal.hidden = !item.sealKey; if (item.sealKey) { seal.src = this.imageUrl(item.sealKey); seal.alt = item.stateLabel + "の印"; } else { seal.removeAttribute("src"); seal.alt = ""; }
      const explanation = this.panel.querySelector('[data-reader-action="explanation"]'), secretButton = this.panel.querySelector('[data-reader-action="secret"]');
      explanation.setAttribute("aria-pressed", String(!secret)); secretButton.setAttribute("aria-pressed", String(secret)); secretButton.disabled = item.concealed;
      const page = s.book.items.findIndex(i => i.id === item.id);
      text("page", (page + 1) + " / " + s.book.items.length); this.panel.querySelector('[data-reader-action="previous"]').disabled = page === 0;
      this.panel.querySelector('[data-reader-action="next"]').disabled = page === s.book.items.length - 1;
      text("totals", s.totalsLabel());
      this.panel.querySelector('[data-reader-action="back"]').textContent = s.back.text.text;
      this.panel.querySelector('[data-reader-action="sound"]').textContent = window.ninjaAudio.isMuted() ? "音OFF" : "音ON";
      if (this.lastItem !== item.id || this.lastMode !== s.mode) this.panel.querySelector(".book-reader-page").scrollTop = 0;
      this.lastItem = item.id; this.lastMode = s.mode;
      window.__NINJA_QA.bookReaderState = { rank: s.rank, selectedId: item.id, state: item.state, page: page + 1, mode: s.mode, concealed: item.concealed };
    }
    move(direction) {
      const s = this.scene; if (s.transitionLock) return;
      const index = s.book.items.findIndex(i => i.id === s.selectedId), item = s.book.items[index + direction];
      if (!item) return;
      if (item.stage !== s.stage) s.showStage(item.stage, item.id); else s.selectItem(s.items.findIndex(i => i.id === item.id));
    }
    click(event) {
      const button = event.target.closest("[data-reader-action]"); if (!button || button.disabled || this.scene.transitionLock) return;
      const s = this.scene;
      switch (button.dataset.readerAction) {
        case "previous": this.move(-1); break;
        case "next": this.move(1); break;
        case "explanation": s.setMode("explanation"); break;
        case "secret": s.setMode("secret"); break;
        case "spread": s.closeReader(); break;
        case "back":
          s.input.enabled = this.inputEnabled;
          if (app.UI.transition(s, s.origin.scene, s.origin.data)) { this.panel.classList.add("is-leaving"); this.panel.querySelectorAll("button,select").forEach(control => { control.disabled = true; }); }
          else s.input.enabled = false;
          break;
        case "sound":
          try { const ready = Promise.resolve(window.ninjaAudio.unlock()).catch(() => {}); const muted = window.ninjaAudio.toggle(); if (!muted) ready.then(() => window.ninjaAudio.play("ui")).catch(() => {}); } catch (_) { /* Reading stays available without audio. */ }
          this.refresh(); break;
        case "fullscreen": {
          const element = document.documentElement, request = element.requestFullscreen || element.webkitRequestFullscreen;
          if (request) { try { Promise.resolve(request.call(element)).catch(() => {}); } catch (_) { /* Browser may decline fullscreen. */ } }
          break;
        }
      }
    }
    destroy() {
      if (!this.panel) return;
      const s = this.scene; this.abort.abort(); this.panel.remove(); this.panel = null; this.imageCache.clear(); document.body.classList.remove("is-book-reading");
      if (this.canvasAria === null) s.game.canvas.removeAttribute("aria-hidden"); else s.game.canvas.setAttribute("aria-hidden", this.canvasAria);
      if (s.input.keyboard) s.input.keyboard.enabled = this.keyboardEnabled;
      if (!s.transitionLock && s.sys.isActive()) { s.input.enabled = this.inputEnabled; s.navigation.enabled = this.navigationEnabled; }
      window.__NINJA_QA.bookReaderOpen = false; window.__NINJA_QA.bookReaderState = null;
    }
  }
  app.NinjutsuBookReader = NinjutsuBookReader;
})();
