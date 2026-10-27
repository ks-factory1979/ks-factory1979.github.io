(function () {
  "use strict";
  const app = MapSymbolNinja;
  class EconomySaveNotice {
    constructor(manager) {
      this.manager = manager; this.scene = null; this.failed = false; this.timer = null;
      this.root = document.createElement("aside"); this.root.id = "economy-save-notice"; this.root.hidden = true;
      this.root.setAttribute("role", "status"); this.root.setAttribute("aria-live", "polite");
      this.root.setAttribute("aria-atomic", "true"); this.root.setAttribute("aria-label", "小判の保存状態");
      this.root.innerHTML = '<div class="economy-save-heading"><strong data-economy-title></strong><button type="button" data-economy-check>保存環境を確認</button></div><p data-economy-description></p>';
      this.title = this.root.querySelector("strong"); this.description = this.root.querySelector("p"); this.button = this.root.querySelector("button");
      this.button.onclick = () => manager.checkAvailability();
      for (const type of ["pointerdown", "pointermove", "pointerup", "click", "keydown", "keyup"]) this.root.addEventListener(type, e => e.stopPropagation());
      document.body.append(this.root);
      this.unsubscribe = manager.subscribe(() => this.render());
      this.unsubscribeLearning = app.progress.subscribeSaveState(() => this.place());
      this.resize = () => this.place(); window.addEventListener("resize", this.resize);
      if (window.ResizeObserver) this.canvasObserver = new window.ResizeObserver(() => this.place());
      if (window.MutationObserver) {
        this.observer = new MutationObserver(() => this.place()); this.observer.observe(document.body, {childList:true});
        const learning = document.getElementById("learning-save-notice");
        if (learning) this.observer.observe(learning, {attributes:true, attributeFilter:["hidden"]});
      }
      this.render();
    }
    text(node, value) { if (node.textContent !== value) node.textContent = value; }
    setScene(scene) {
      this.scene = scene;
      const canvas = scene.game.canvas;
      if (this.canvasObserver && this.observedCanvas !== canvas) {
        if (this.observedCanvas) this.canvasObserver.unobserve(this.observedCanvas);
        this.observedCanvas = canvas; this.canvasObserver.observe(canvas);
      }
      this.render();
    }
    render() {
      const state = this.manager.getState();
      if (state.problem) {
        if (this.timer !== null) window.clearTimeout(this.timer); this.timer = null;
        this.failed = true; this.recovered = false;
        this.text(this.title, "小判を保存できません"); this.text(this.description, state.problem + " 修行と無料のためし斬りは遊べます。");
      } else if (this.failed && !state.checking) {
        this.failed = false; this.recovered = true;
        this.text(this.title, "小判の保存環境を確認できました");
        this.text(this.description, this.manager.claims.size ? "未保存のごほうびは、結果画面で保存してね。" : "刀の購入・装備変更を利用できます。");
        this.timer = window.setTimeout(() => { this.timer = null; this.recovered = false; this.place(); }, 3500);
      }
      this.root.dataset.status = state.problem ? "failed" : "ready";
      this.button.hidden = !state.problem;
      this.button.disabled = state.checking;
      this.text(this.button, state.checking ? "確認中…" : "保存環境を確認");
      this.place();
    }
    place() {
      if (!this.root) return;
      const key = this.scene && this.scene.sys.settings.key;
      this.root.hidden = !["TitleScene", "SwordSelectScene", "ResultScene"].includes(key) || !(this.manager.problem || this.recovered);
      const shop = key === "SwordSelectScene" && document.getElementById("sword-select");
      const parent = shop || document.body;
      if (this.inlineParent && this.inlineParent !== parent) this.inlineParent.classList.remove("has-economy-save-notice");
      this.inlineParent = shop || null;
      if (shop) shop.classList.toggle("has-economy-save-notice", !this.root.hidden);
      if (this.root.parentNode !== parent) { if (shop) parent.prepend(this.root); else parent.append(this.root); }
      this.root.classList.toggle("economy-save-inline", Boolean(shop));
      const canvas = this.scene && this.scene.game.canvas, rect = canvas && canvas.getBoundingClientRect();
      const scale = rect && rect.width > 0 ? rect.width / NINJA_CONFIG.WIDTH : 1;
      const learning = document.getElementById("learning-save-notice");
      const extra = learning && !learning.hidden && learning.parentNode === document.body ? learning.getBoundingClientRect().height + 8 : 0;
      const result = key === "ResultScene", top = result || key === "TitleScene";
      this.root.style.left = rect ? Math.max(8, rect.left + 12 * scale) + "px" : "8px";
      this.root.style.top = top ? Math.max(8, (rect ? rect.top : 0) + 118 * scale + (result ? extra : 0)) + "px" : "";
      this.root.style.bottom = top ? "auto" : Math.max(8, extra + 8) + "px";
      this.root.style.width = window.innerWidth <= 800 && rect ? Math.max(160, Math.min(360, rect.width * .30)) + "px" : "";
    }
    destroy() {
      if (this.timer !== null) window.clearTimeout(this.timer);
      this.unsubscribe(); this.unsubscribeLearning(); window.removeEventListener("resize", this.resize);
      if (this.observer) this.observer.disconnect();
      if (this.canvasObserver) this.canvasObserver.disconnect();
      if (this.inlineParent) this.inlineParent.classList.remove("has-economy-save-notice");
      this.root.remove();
    }
  }
  app.EconomySaveNotice = EconomySaveNotice;
})();
