(function () {
  "use strict";
  const app = MapSymbolNinja;
  class SwordSelectScene extends Phaser.Scene {
    constructor() { super({ key: "SwordSelectScene" }); }
    init(data) {
      this.layoutEditingAllowed = Boolean(NINJA_CONFIG.DEV_PANEL_ENABLED && (app.UI.devVisible() || data && data.openLayoutEditor === true));
      this.autoOpenLayoutEditor = this.layoutEditingAllowed && Boolean(data && data.openLayoutEditor);
      this.editor = null;
      this.returnResult = data && data.from === "ResultScene" ? app.CollectionBookModel.resultSnapshot(data.result) : null;
    }
    create() {
      app.UI.enterScene(this);
      window.__NINJA_QA.currentScene = "sword-select";
      const saved = app.economy.load();
      this.selected = saved.equippedSword; this.equipped = this.selected;
      this.practicing = false; this.busy = false; this.purchaseAnimating = false;
      this.effectsDialog = null; this.purchaseDialog = null; this.presentationTweens = []; this.presentationNodes = [];
      this.colorIndex = 0; this.lastPlay = -1000; this.lastPointerPlay = -1000;
      this.abort = new AbortController(); this.textureKeys = [];
      this.vfx = null; this.cutSystem = null; this.swing = null; this.previewScene = null; this.auraRemaining = 0;
      app.UI.drawBackground(this, { dim: .28 });
      this.input.keyboard.enabled = false;
      this.oldCanvasAria = this.game.canvas.getAttribute("aria-hidden");
      this.game.canvas.setAttribute("aria-hidden", "true");
      this.panel = document.createElement("section");
      this.panel.id = "sword-select"; this.panel.setAttribute("aria-label", "刀ショップ");
      this.panel.innerHTML = `<header class="sword-header"><div class="shop-heading"><h1>刀ショップ</h1>
        <span class="shop-wallet"><img alt="忍小判" src="${app.ShopAssetData.ninja_koban_front}"><strong data-wallet></strong><span>枚</span></span></div><div>
        <button type="button" data-sword-action="layout" hidden>配置調整</button><button type="button" data-sword-action="effects" aria-haspopup="dialog"></button>
        <button type="button" data-sword-action="sound"></button><button type="button" data-sword-action="back">もどる</button></div></header>
        <div class="shop-body"><div class="sword-choices" role="group" aria-label="刀を選ぶ"></div>
        <section class="shop-detail" aria-label="選んだ刀"><div class="shop-visual"><div class="shop-product"><img class="shop-art" data-shop-art alt=""></div>
        <button type="button" class="sword-preview" data-sword-action="preview" hidden aria-label="ためし斬り。タップかスワイプ、Enterキーで斬れます"><span class="sword-preview-hint">タップ・スワイプで ためしぎり</span></button></div>
        <div class="shop-information"><h2 data-shop-name></h2><p class="sword-description" data-sword-description></p>
        <div class="shop-price"><img src="${app.ShopAssetData.ninja_koban_front}" alt="忍小判"><strong data-shop-price data-price-copy></strong><span data-shop-owned></span></div>
        <p class="shop-guidance" data-shop-guidance></p></div>
        <div class="shop-actions"><button type="button" data-sword-action="practice">ためしぎり（無料）</button>
        <button type="button" class="sword-equip" data-sword-action="equip"></button>
        <button type="button" data-sword-action="color" hidden>札の色をかえる</button></div></section></div>
        <footer class="sword-footer"><p data-sword-status role="status" aria-live="polite"></p>
        <p class="sword-note">どの刀でも、強さは同じだよ。</p></footer>`;
      this.panel.querySelector(".shop-visual").append(this.panel.querySelector('[data-sword-action="color"]'));
      const choices = this.panel.querySelector(".sword-choices");
      app.SwordCatalog.items.forEach(sword => {
        const button = document.createElement("button"); button.type = "button";
        button.dataset.swordId = sword.id; button.style.setProperty("--sword-color", sword.color);
        button.setAttribute("aria-label", sword.name);
        button.innerHTML = `<span class="shop-choice-thumb"><img alt="" src="${app.ShopAssetData[sword.imageKey]}"><span class="shop-selected">えらんでいる</span></span><span class="shop-choice-copy"><strong>${sword.name}</strong><span class="shop-choice-price"><img src="${app.ShopAssetData.ninja_koban_front}" alt="忍小判"><span>${sword.price ? sword.price + "枚" : "無料"}</span></span><span class="sword-choice-state"></span></span>`;
        choices.append(button);
      });
      if (app.economy.development) {
        const dev = document.createElement("details"); dev.className = "shop-dev";
        dev.innerHTML = '<summary>開発用・別の小判データ</summary><div>' + [0,59,60,120].map(n =>
          '<button type="button" data-dev-wallet="' + n + '">' + n + '枚</button>').join("") +
          '<button type="button" data-dev-all>全刀を所持</button></div>';
        this.panel.append(dev);
      }
      document.body.append(this.panel);
      let layoutStorage = null; try { if (this.layoutEditingAllowed) layoutStorage = window.localStorage; } catch (_) {}
      this.layoutModel = new app.ShopLayoutModel(layoutStorage);
      if (this.layoutEditingAllowed) this.layoutModel.load();
      this.layoutController = new app.ShopLayoutController(this);
      this.panel.querySelector('[data-sword-action="layout"]').hidden = !this.layoutEditingAllowed;
      const signal = this.abort.signal;
      this.panel.addEventListener("click", event => {
        const profile = event.target.closest("[data-effect-profile]");
        if (profile && !this.transitionLock) { this.chooseEffect(profile.dataset.effectProfile); return; }
        const devWallet = event.target.closest("[data-dev-wallet]");
        if (devWallet && app.economy.development) { app.economy.devSet(Number(devWallet.dataset.devWallet), []); return; }
        if (event.target.closest("[data-dev-all]") && app.economy.development) { app.economy.devSet(120, app.SwordCatalog.items.map(i => i.id)); return; }
        const choice = event.target.closest("[data-sword-id]");
        if (choice) { this.choose(choice.dataset.swordId); return; }
        const button = event.target.closest("[data-sword-action]");
        if (!button || this.transitionLock) return;
        switch (button.dataset.swordAction) {
          case "layout": this.openLayoutEditor(); break;
          case "preview": if (event.detail === 0 || performance.now() - this.lastPointerPlay > 350) this.play(); break;
          case "practice": this.practice(); break;
          case "color": this.colorIndex = (this.colorIndex + 1) % app.CardPalette.COLORS.length; this.lastPlay = -1000; this.play(); break;
          case "equip": this.equip(); break;
          case "sound": window.ninjaAudio.toggle(); this.refresh(); break;
          case "effects": if (!this.purchaseDialog) this.openEffects(); break;
          case "effects-close": this.closeEffects(); break;
          case "purchase-cancel": this.closePurchase(); break;
          case "purchase-confirm": this.confirmPurchase(); break;
          case "back": this.back(); break;
        }
      }, { signal });
      const preview = this.panel.querySelector(".sword-preview");
      preview.addEventListener("pointerdown", event => {
        if (!event.isPrimary || event.button !== 0) return;
        this.pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
        preview.setPointerCapture(event.pointerId);
        try { Promise.resolve(window.ninjaAudio.unlock()).catch(() => {}); } catch (_) {}
      }, { signal });
      preview.addEventListener("pointerup", event => {
        const from = this.pointerStart; this.pointerStart = null;
        if (!from || from.id !== event.pointerId) return;
        const dx = event.clientX - from.x, dy = event.clientY - from.y;
        this.lastPointerPlay = performance.now();
        this.play(Math.hypot(dx, dy) > 12 ? Math.atan2(dy, dx) : undefined);
      }, { signal });
      preview.addEventListener("pointercancel", () => { this.pointerStart = null; }, { signal });
      this.panel.addEventListener("keydown", event => {
        event.stopPropagation();
        const dialog = this.purchaseDialog || this.effectsDialog;
        if (event.key === "Escape" && !event.repeat) {
          event.preventDefault();
          if (this.purchaseDialog) this.closePurchase(); else if (this.effectsDialog) this.closeEffects(); else this.back();
        }
        if (event.key === "Tab" && dialog) {
          const buttons = [...dialog.querySelectorAll("button:not(:disabled)")], index = buttons.indexOf(document.activeElement);
          if (buttons.length && (event.shiftKey && index <= 0 || !event.shiftKey && index === buttons.length - 1)) {
            event.preventDefault(); buttons[event.shiftKey ? buttons.length - 1 : 0].focus();
          }
        }
      }, { signal });
      this.resize = () => { this.layoutController.apply(); if (!this.vfx) return; this.vfx.reset(); this.auraRemaining = 0; this.cutSystem.destroy(); this.cutSystem = this.createCutSystem(); this.showCard(); };
      window.addEventListener("resize", this.resize, { signal });
      this.previewSurface = new app.ShopPreviewSurface(this.panel.querySelector(".shop-product"), renderScene => {
        if (!this.panel.isConnected) return;
        this.previewScene = renderScene; this.vfx = this.createVFX(); this.cutSystem = this.createCutSystem();
        this.swing = renderScene.add.graphics().setDepth(179);
        this.createCardTextures(); this.showCard(); this.refresh();
        if (this.autoOpenLayoutEditor) this.openLayoutEditor();
      }, () => { if (this.card && this.card.active) this.sizeCard(); });
      this.refresh();
      this.unsubscribe = app.economy.subscribe(() => this.refresh());
      this.panel.querySelector(`[data-sword-id="${this.selected}"]`).focus({ preventScroll: true });
      this.events.once("shutdown", () => {
        if (this.editor) this.editor.destroy();
        this.unsubscribe(); this.effectsDialog = null; this.purchaseDialog = null;
        this.presentationTweens.forEach(t => t.stop()); this.presentationNodes.forEach(n => n.remove());
        if (window.ninjaAudio.stopAttributeSounds) window.ninjaAudio.stopAttributeSounds();
        window.ninjaAudio.endSwipe();
        this.abort.abort(); this.panel.remove(); if (this.vfx) this.vfx.destroy(); if (this.cutSystem) this.cutSystem.destroy();
        if (this.card) this.card.destroy();
        if (this.resetTimer) this.resetTimer.remove(false);
        this.previewSurface.destroy(); this.previewScene = null;
        if (this.oldCanvasAria === null) this.game.canvas.removeAttribute("aria-hidden");
        else this.game.canvas.setAttribute("aria-hidden", this.oldCanvasAria);
      });
    }
    openLayoutEditor() {
      if (!NINJA_CONFIG.DEV_PANEL_ENABLED || !this.layoutEditingAllowed || this.editor || !this.vfx || this.purchaseDialog || this.effectsDialog) return;
      if (this.practicing) this.practice();
      this.editor = new app.ShopLayoutEditor(this); this.editor.start();
    }
    createCutSystem() {
      return new NinjaCore.CutEffectSystem(this.previewScene, { reducedMotion: Boolean(window.__NINJA_REDUCED_MOTION) });
    }
    createVFX() {
      return new NinjaCore.DynamicSlashVFXSystem(this.previewScene, app.EffectPreferences.vfx({ element: this.selected,
        reducedMotion: Boolean(window.__NINJA_REDUCED_MOTION) }));
    }
    openEffects() {
      if (this.effectsDialog || !this.vfx) return;
      if (this.resetTimer) { this.resetTimer.remove(false); this.resetTimer = null; }
      this.vfx.reset(); this.cutSystem.destroy(); this.cutSystem = this.createCutSystem();
      this.tweens.killTweensOf(this.swing); this.swing.clear(); this.showCard();
      const backdrop = document.createElement("div"); backdrop.className = "sword-effects-backdrop";
      const current = app.EffectPreferences.load();
      backdrop.innerHTML = `<section class="sword-effects-dialog" role="dialog" aria-modal="true" aria-labelledby="sword-effects-title" aria-describedby="sword-effects-help">
        <header><h2 id="sword-effects-title">演出の設定</h2><button type="button" data-sword-action="effects-close">とじる</button></header>
        <p id="sword-effects-help">選ぶと保存され、ためし斬りと本編に反映されるよ。</p>
        <div class="sword-effects-choices">${app.EffectPreferences.profiles.map(profile =>
          `<button type="button" data-effect-profile="${profile.id}" aria-pressed="${profile.id === current.id}"><strong>${profile.name}</strong><span>${profile.description}</span></button>`).join("")}</div>
        <p class="sword-effects-note">どの設定でも、刀の強さと学習記録は同じだよ。</p></section>`;
      this.effectsDialog = backdrop;
      [...this.panel.children].forEach(child => { child.inert = true; });
      this.panel.append(backdrop);
      backdrop.querySelector(`[data-effect-profile="${current.id}"]`).focus();
    }
    closeEffects() {
      if (!this.effectsDialog) return;
      this.effectsDialog.remove(); this.effectsDialog = null;
      [...this.panel.children].forEach(child => { child.inert = false; });
      this.panel.querySelector('[data-sword-action="effects"]').focus({ preventScroll: true });
    }
    chooseEffect(id) {
      const result = app.EffectPreferences.choose(id);
      if (!result.changed) return;
      this.closeEffects(); this.vfx.destroy(); this.vfx = this.createVFX();
      this.refresh(result.profile.name + (result.persisted ? "の演出にしたよ！" : "の演出にしたよ。この起動中だけ使えるよ。"));
      this.lastPlay = -1000; this.play();
      this.auraRemaining = 0;
    }
    createCardTextures() {
      app.CardPalette.COLORS.forEach(color => {
        const key = "sword-practice-" + color.id;
        const texture = this.previewScene.textures.createCanvas(key, 180, 180), ctx = texture.context;
        ctx.fillStyle = "#fff7e6"; ctx.fillRect(13, 13, 154, 154);
        ctx.lineWidth = 8; ctx.strokeStyle = color.hex; ctx.strokeRect(13, 13, 154, 154);
        ctx.lineWidth = 2; ctx.strokeStyle = "#d8c08b"; ctx.strokeRect(25, 25, 130, 130);
        ctx.font = 'bold 82px "Yu Gothic", "Meiryo", sans-serif'; ctx.textAlign = "center";
        ctx.textBaseline = "middle"; ctx.fillStyle = "#21384a"; ctx.fillText("忍", 90, 96);
        texture.refresh(); this.textureKeys.push(key);
      });
    }
    showCard() {
      if (this.card) this.card.destroy();
      this.card = null;
      if (!this.practicing || !this.previewScene) return;
      this.center = { x: 683, y: 467.5 };
      this.card = this.previewScene.add.image(this.center.x, this.center.y, "sword-practice-" + app.CardPalette.COLORS[this.colorIndex].id)
        .setDepth(50);
      this.sizeCard();
    }
    sizeCard() {
      const height = this.panel.querySelector(".shop-visual").getBoundingClientRect().height;
      const size = Math.min(130, Math.max(30, height * .48)) / this.previewScene.previewScale;
      this.card.setDisplaySize(size, size);
    }
    choose(id) {
      if (this.transitionLock || this.purchaseDialog || this.effectsDialog || this.busy || this.purchaseAnimating || !app.SwordCatalog.has(id)) return;
      const cardButton = this.panel.querySelector(`[data-sword-id="${id}"]`);
      if (cardButton && !window.__NINJA_REDUCED_MOTION) { cardButton.classList.remove("shop-card-feedback"); void cardButton.offsetWidth; cardButton.classList.add("shop-card-feedback"); }
      this.selected = id; this.auraRemaining = 0;
      if (this.vfx) { this.vfx.options.element = id; this.vfx.reset(); }
      if (window.ninjaAudio.stopAttributeSounds) window.ninjaAudio.stopAttributeSounds();
      this.refresh(); this.showCard(); this.lastPlay = -1000;
      if (this.practicing) this.play();
    }
    practice() {
      if (this.busy || this.purchaseDialog || this.effectsDialog || !this.vfx) return;
      this.practicing = !this.practicing;
      if (window.ninjaBGM) window.ninjaBGM.pauseShop(this.practicing);
      this.panel.querySelector(".shop-art").hidden = this.practicing;
      this.panel.querySelector(".sword-preview").hidden = !this.practicing;
      this.panel.querySelector('[data-sword-action="color"]').hidden = !this.practicing;
      this.panel.querySelector('[data-sword-action="practice"]').textContent = this.practicing ? "刀の絵にもどる" : "ためしぎり（無料）";
      this.panel.classList.toggle("is-practicing", this.practicing);
      this.vfx.reset(); this.cutSystem.destroy(); this.cutSystem = this.createCutSystem();
      this.tweens.killTweensOf(this.swing); this.swing.clear();
      if (this.resetTimer) this.resetTimer.remove(false);
      if (window.ninjaAudio.stopAttributeSounds) window.ninjaAudio.stopAttributeSounds();
      this.showCard(); this.lastPlay = -1000;
      this.auraRemaining = 0;
      this.layoutController.apply();
      if (this.practicing) this.play();
    }
    refresh(message) {
      if (!this.panel || !this.panel.isConnected) return;
      const sword = app.SwordCatalog.get(this.selected), state = app.economy.getState();
      this.equipped = state.equippedSword;
      const owned = state.ownedSwords.includes(sword.id), active = sword.id === state.equippedSword;
      this.panel.querySelector("[data-wallet]").textContent = state.wallet.toLocaleString("ja-JP");
      this.panel.querySelector("[data-shop-name]").textContent = sword.name;
      this.panel.querySelector("[data-sword-description]").textContent = sword.description;
      const art = this.panel.querySelector("[data-shop-art]");
      art.src = app.ShopAssetData[sword.imageKey]; art.alt = sword.name;
      art.style.setProperty("--art-scale", sword.displayScale); art.style.setProperty("--art-x", sword.offsetX + "px"); art.style.setProperty("--art-y", sword.offsetY + "px");
      this.panel.querySelector("[data-shop-price]").textContent = sword.price ? sword.price + "枚" : "無料";
      this.panel.querySelector("[data-shop-price]").hidden = owned;
      this.panel.querySelector(".shop-price>img").hidden = owned;
      this.panel.querySelector("[data-shop-owned]").textContent = active ? "装備中" : owned ? "購入済み" : "未購入";
      this.panel.querySelector("[data-shop-guidance]").textContent = state.problem ? "保存環境を確認してね。無料のためし斬りは遊べるよ！" : owned ? "好きな刀で 修行しよう！" :
        state.wallet < sword.price ? "あと" + (sword.price - state.wallet) + "枚！ 修行して あつめよう！" : "小判で この刀を てにいれよう！";
      this.panel.querySelectorAll("[data-sword-id]").forEach(button => {
        const item = app.SwordCatalog.get(button.dataset.swordId), has = state.ownedSwords.includes(item.id);
        button.setAttribute("aria-pressed", String(item.id === this.selected));
        button.querySelector(".sword-choice-state").textContent = item.id === this.equipped ? "装備中" : has ? "購入済み" : "未購入";
        button.dataset.ownership = item.id === this.equipped ? "equipped" : has ? "owned" : "unowned";
        button.querySelector(".shop-choice-price").hidden = has;
      });
      const action = this.panel.querySelector('[data-sword-action="equip"]');
      const view = app.ShopViewState(sword, state, this.busy);
      action.textContent = view.label; action.dataset.purchaseState = view.kind;
      action.disabled = view.disabled; action.setAttribute("aria-disabled", String(view.disabled));
      this.panel.querySelector('[data-sword-action="sound"]').textContent = window.ninjaAudio.isMuted() ? "音OFF" : "音ON";
      this.panel.querySelector('[data-sword-action="effects"]').textContent = "演出：" + app.EffectPreferences.load().name;
      this.panel.querySelector('[data-sword-action="effects"]').disabled = !this.vfx;
      this.panel.querySelector('[data-sword-action="practice"]').disabled = !this.vfx;
      this.panel.querySelector("[data-sword-status]").textContent = state.problem || message ||
        (state.development ? "開発用データで確認中。通常の小判とは別です。" : "装備中：" + app.SwordCatalog.get(this.equipped).name);
      window.__NINJA_QA.swordSelection = { selected: this.selected, equipped: this.equipped, practicing: this.practicing,
        effects: app.EffectPreferences.load().id, wallet: state.wallet, owned: state.ownedSwords };
      this.layoutController.apply();
    }
    async equip() {
      if (this.busy || this.purchaseDialog || this.editor || this.transitionLock) return;
      const state = app.economy.getState();
      if (app.ShopViewState(app.SwordCatalog.get(this.selected), state, this.busy).disabled) return;
      if (!state.ownedSwords.includes(this.selected)) { this.openPurchase(); return; }
      this.busy = true; this.refresh();
      const result = await app.economy.equip(this.selected);
      this.busy = false;
      this.refresh(result.persisted && result.status === "equipped" ?
        app.SwordCatalog.get(result.id).name + "を装備したよ！" : "装備の保存を確認できませんでした。保存環境を確認してね。");
    }
    openPurchase() {
      const state = app.economy.getState(), item = app.SwordCatalog.get(this.selected);
      if (this.purchaseDialog || this.busy || state.problem || state.ownedSwords.includes(item.id) || state.wallet < item.price) return;
      this.confirmId = item.id;
      const backdrop = document.createElement("div"); backdrop.className = "sword-effects-backdrop shop-confirm";
      backdrop.innerHTML = `<section class="sword-effects-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
        <h2 id="purchase-title">${item.name}を かう？</h2><img class="shop-confirm-art" src="${app.ShopAssetData[item.imageKey]}" alt="${item.name}">
        <p class="shop-confirm-price"><img src="${app.ShopAssetData.ninja_koban_front}" alt="忍小判"> ${item.price}枚</p>
        <p>買った刀は、いつでも自由に使えるよ。</p><div class="shop-confirm-actions">
        <button type="button" data-sword-action="purchase-cancel">やめる</button><button type="button" class="sword-equip" data-sword-action="purchase-confirm">かう！</button></div></section>`;
      [...this.panel.children].forEach(child => { child.inert = true; });
      this.purchaseDialog = backdrop; this.panel.append(backdrop);
      backdrop.querySelector('[data-sword-action="purchase-cancel"]').focus();
    }
    closePurchase() {
      if (!this.purchaseDialog || this.busy) return;
      this.purchaseDialog.remove(); this.purchaseDialog = null; this.confirmId = null;
      [...this.panel.children].forEach(child => { child.inert = false; });
      this.panel.querySelector('[data-sword-action="equip"]').focus({ preventScroll: true });
    }
    async confirmPurchase() {
      if (this.busy || !this.purchaseDialog || !this.confirmId) return;
      const id = this.confirmId;
      this.busy = true; this.purchaseDialog.querySelectorAll("button").forEach(b => { b.disabled = true; }); this.refresh();
      const result = await app.economy.purchase(id);
      this.busy = false;
      if (!this.panel.isConnected) return;
      this.closePurchase(); this.refresh();
      if (result.status === "purchased") {
        this.refresh(app.SwordCatalog.get(id).name + "を てにいれた！ 装備したよ！");
        this.presentPurchase(id); app.UI.announce(app.SwordCatalog.get(id).name + "を手に入れました。");
      } else this.refresh(result.status === "save-failed" ? "購入の保存を確認できませんでした。保存環境と所持数を確認してね。" : "所持数と購入済みの刀を確認してね。");
    }
    presentPurchase(id) {
      this.purchaseAnimating = true;
      if (this.practicing) this.practice();
      const art = this.panel.querySelector("[data-shop-art]"), wallet = this.panel.querySelector(".shop-wallet").getBoundingClientRect(), box = art.getBoundingClientRect();
      const pose = { scale: 1, shine: 1 };
      const tween = this.tweens.add({ targets: pose, scale: 1.075, shine: 1.7, duration: 320, yoyo: true, ease: "Sine.easeInOut",
        onUpdate: () => { art.style.filter = "brightness(" + pose.shine + ")"; art.style.transform = "scale(" + pose.scale + ")"; },
        onComplete: () => { art.style.filter = ""; art.style.transform = ""; this.purchaseAnimating = false; } });
      this.presentationTweens.push(tween);
      for (let i = 0; i < 3; i++) {
        const image = document.createElement("img"); image.src = app.ShopAssetData.ninja_koban_tilt; image.alt = ""; image.className = "shop-flying-coin";
        this.panel.append(image); this.presentationNodes.push(image);
        const p = { x: wallet.x + 20, y: wallet.y + 20, angle: -15, scale: .6, alpha: 1 };
        this.presentationTweens.push(this.tweens.add({ targets: p, x: box.x + box.width * .5 + (i-1)*20,
          y: box.y + box.height * .45, angle: 18, scale: 1.15, alpha: 0, duration: 620, delay: i * 45, ease: "Cubic.easeIn",
          onUpdate: () => { image.style.left = p.x + "px"; image.style.top = p.y + "px"; image.style.opacity = p.alpha; image.style.transform = "rotate(" + p.angle + "deg) scale(" + p.scale + ")"; },
          onComplete: () => image.remove() }));
      }
      window.__NINJA_QA.shopPurchasePresentation = { id, coins: 3, duration: 710 };
    }
    play(angle) {
      if (!this.vfx || !this.practicing || this.effectsDialog || this.purchaseDialog || this.transitionLock || performance.now() - this.lastPlay < 160) return;
      this.lastPlay = performance.now();
      if (this.resetTimer) this.resetTimer.remove(false);
      this.showCard();
      const at = this.center, a = Number.isFinite(angle) ? angle : -.28;
      const from = { x: at.x - Math.cos(a) * 145, y: at.y - Math.sin(a) * 145 };
      const to = { x: at.x + Math.cos(a) * 145, y: at.y + Math.sin(a) * 145 };
      const color = app.CardPalette.COLORS[this.colorIndex];
      this.cutSystem.split(this.card, { from, to, vector: { x: to.x - from.x, y: to.y - from.y }, hitPoint: at },
        { textureWidth: 180, textureHeight: 180, speedIntensity: .7, flight: { vx: 0, vy: -90 } });
      this.card.destroy(); this.card = null;
      this.vfx.playHit({ x: at.x, y: at.y, swipeAngle: a, cardColor: color.value, hitType: "normal" });
      const previewElement = this.selected;
      const tint = parseInt(app.SwordPreferences.get(this.selected).color.slice(1), 16);
      this.tweens.killTweensOf(this.swing); this.swing.clear().setAlpha(1);
      this.swing.lineStyle(11, tint, .22).lineBetween(from.x, from.y, to.x, to.y);
      this.swing.lineStyle(2, 0xffffff, .85).lineBetween(from.x, from.y, to.x, to.y);
      this.tweens.add({ targets: this.swing, alpha: 0, duration: window.__NINJA_REDUCED_MOTION ? 90 : 190 });
      try { Promise.resolve(window.ninjaAudio.unlock()).then(() => {
        if (!this.panel.isConnected || !this.practicing || this.selected !== previewElement) return;
        window.ninjaAudio.beginSwipe();
        window.ninjaAudio.play("slash", { element: previewElement });
        window.ninjaAudio.playElementHit({ element: previewElement, type: "normal" });
        window.ninjaAudio.endSwipe();
      }).catch(() => {}); } catch (_error) { /* 無音でも試せる。 */ }
      this.resetTimer = this.time.delayedCall(650, () => this.showCard());
      window.__NINJA_QA.swordPreviewHits = (window.__NINJA_QA.swordPreviewHits || 0) + 1;
    }
    back() {
      if (this.purchaseDialog) { this.closePurchase(); return; }
      if (!app.UI.transition(this, this.returnResult ? "ResultScene" : "TitleScene", this.returnResult || undefined)) return;
      this.panel.querySelectorAll("button").forEach(button => { button.disabled = true; });
    }
    update(_time, delta) {
      if (!this.vfx) return;
      if (!this.practicing && !this.effectsDialog && !this.purchaseDialog && !this.transitionLock && this.selected !== "none") {
        this.auraRemaining -= Math.min(50, delta);
        if (this.auraRemaining <= 0) {
          this.vfx.playHit({ x: 683, y: 467.5, swipeAngle: -.42, cardColor: 0xffffff,
            element: this.selected, elementOnly: true, hitType: "normal" });
          this.auraRemaining = window.__NINJA_REDUCED_MOTION ? 2400 : this.selected === "lightning" ? 620 : 1000;
        }
      }
      this.vfx.update(delta);
      window.__NINJA_QA.swordPreviewVFX = this.vfx.getState();
    }
  }
  app.SwordSelectScene = SwordSelectScene;
})();
