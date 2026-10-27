(function () {
  "use strict";
  const app = MapSymbolNinja;

  // 学習保存だけの非モーダル通知。得点・ゲーム時計・Sceneの入力を変更しない。
  class LearningSaveNotice {
    constructor(manager) {
      this.manager = manager; this.scene = null; this.hadFailure = false;
      this.recovering = false; this.retrying = false; this.timer = null; this.destroyed = false;
      this.root = document.createElement("aside"); this.root.id = "learning-save-notice";
      this.root.hidden = true; this.root.setAttribute("role", "status");
      this.root.setAttribute("aria-live", "polite"); this.root.setAttribute("aria-atomic", "true");
      this.root.setAttribute("aria-label", "学習記録の保存状態");
      this.root.innerHTML = '<div class="learning-save-heading"><strong data-save-title></strong>' +
        '<button type="button" data-save-retry aria-label="学習記録をもう一度保存する">もう一度保存</button></div>' +
        '<p data-save-description></p>';
      this.title = this.root.querySelector("[data-save-title]");
      this.description = this.root.querySelector("[data-save-description]");
      this.button = this.root.querySelector("[data-save-retry]");
      this.button.onclick = () => this.retry();
      for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "click", "keydown", "keyup"]) {
        this.root.addEventListener(type, event => event.stopPropagation());
      }
      document.body.append(this.root);
      this.resize = () => this._place(); window.addEventListener("resize", this.resize);
      // DOMのショップ・一ページ表示へは余白を確保して差し込み、操作ボタンを覆わない。
      if (window.MutationObserver) {
        this.observer = new window.MutationObserver(() => this._place());
        this.observer.observe(document.body, { childList: true });
      }
      this.unsubscribe = manager.subscribeSaveState(state => this.render(state));
    }

    setScene(scene) { this.scene = scene; this._place(); }
    _text(node, value) { if (node.textContent !== value) node.textContent = value; }
    _clearTimer() { if (this.timer !== null) window.clearTimeout(this.timer); this.timer = null; }

    render(state) {
      if (this.destroyed) return;
      this.state = state;
      if (state.status === "inactive") {
        this._clearTimer(); this.hadFailure = false; this.recovering = false; this.root.hidden = true;
      } else if (state.status === "failed") {
        this._clearTimer(); this.hadFailure = true; this.recovering = false; this.root.hidden = false;
      } else if (state.status === "saved" && !state.busy && this.hadFailure) {
        this.hadFailure = false; this.recovering = true; this.root.hidden = false;
        this._clearTimer(); this.timer = window.setTimeout(() => {
          this.timer = null; this.recovering = false; this.root.hidden = true; this._place();
        }, 3500);
      } else if (!this.hadFailure && !this.recovering) this.root.hidden = true;
      this.root.dataset.saveStatus = this.recovering ? "saved" : state.status;
      this._place();
    }

    _place() {
      if (this.destroyed || !this.state) return;
      const key = this.scene && this.scene.sys.settings.key;
      const reader = document.getElementById("ninjutsu-book-reader");
      const shop = key === "SwordSelectScene" && document.getElementById("sword-select");
      const parent = reader || shop || document.body;
      const inline = parent !== document.body;
      if (this.inlineParent && this.inlineParent !== parent) this.inlineParent.classList.remove("has-learning-save-notice");
      this.inlineParent = inline ? parent : null;
      if (inline) parent.classList.toggle("has-learning-save-notice", !this.root.hidden);
      if (this.root.parentNode !== parent) { if (inline) parent.prepend(this.root); else parent.append(this.root); }
      this.root.classList.toggle("learning-save-inline", inline);
      const game = key === "GameScene", result = key === "ResultScene";
      this.root.classList.toggle("learning-save-brief", !inline && (game || key === "NinjutsuBookScene"));
      const canvas = this.scene && this.scene.game && this.scene.game.canvas;
      const rect = canvas && canvas.getBoundingClientRect();
      const scale = rect && rect.width > 0 ? rect.width / NINJA_CONFIG.WIDTH : 1;
      const small = window.innerWidth <= 800;
      this.root.classList.toggle("learning-save-small", !inline && small);
      this.root.style.left = !inline && rect ? Math.max(8, rect.left + 12 * scale) + "px" : "";
      this.root.style.top = !inline && (game || result) ? Math.max(8, (rect ? rect.top : 0) + 118 * scale) + "px" : "";
      this.root.style.bottom = !inline && (game || result) ? "auto" : "";
      this.root.style.width = !inline && small && rect ? Math.max(142, Math.min(340, rect.width * .26)) + "px" : "";
      if (this.recovering) {
        this._text(this.title, small && !inline ? "記録を保存しました" : "学習記録を保存しました");
        this._text(this.description, "端末への保存を確認できました。"); this.button.hidden = true;
      } else {
        this._text(this.title, small && !inline ? "記録：未保存" : "学習記録：未保存");
        const unavailable = this.state.problem === "database-unavailable" || this.state.problem === "secure-id-unavailable";
        const unreadable = this.state.problem === "saved-data-unavailable" && !this.state.initialized;
        this._text(this.description, unavailable ? "この環境では学習記録を保存できません。先生やおうちの人に伝えてね。" :
          unreadable ? "前の記録を確認できません。画面をとじずに、先生やおうちの人に知らせてね。" :
          "保存をまだ確認できません。とじる前に「もう一度保存」を押してね。");
        this.button.hidden = unavailable;
        this.button.disabled = !this.state.canRetry || this.retrying;
        this._text(this.button, this.retrying ? "保存中…" : small && !inline ? "再保存" : "もう一度保存");
      }
    }

    async retry() {
      if (this.retrying || !this.state.canRetry) return;
      this.retrying = true; this._place();
      try { await this.manager.retrySave(); }
      finally { this.retrying = false; if (!this.destroyed) this.render(this.manager.getSaveState()); }
    }

    destroy() {
      this.destroyed = true; this._clearTimer(); this.unsubscribe();
      window.removeEventListener("resize", this.resize); if (this.observer) this.observer.disconnect();
      if (this.inlineParent) this.inlineParent.classList.remove("has-learning-save-notice");
      this.root.remove();
    }
  }
  app.LearningSaveNotice = LearningSaveNotice;
})();
