(function () {
  "use strict";
  window.MapSymbolNinja = window.MapSymbolNinja || {};

  // タイトルで開いた時だけDOMを作り、閉じる時にListenerごと破棄する。
  function open(scene) {
    if (!NINJA_CONFIG.DEV_PANEL_ENABLED || document.getElementById("ninja-dev-backdrop")) return;
    const settings = MapSymbolNinja.DevSettings;
    scene.input.enabled = false;
    let draft = settings.load();
    let previewElement = "none";
    let previewReducedMotion = Boolean(window.__NINJA_REDUCED_MOTION);
    let progressSandbox = MapSymbolNinja.ProgressDevTools.createSandbox(MapSymbolNinja.progress.getSnapshot());
    let confirmingReset = false;
    const backdrop = document.createElement("div");
    backdrop.id = "ninja-dev-backdrop";
    backdrop.className = "ninja-dev-backdrop";
    backdrop.innerHTML = '<section class="ninja-dev-panel" role="dialog" aria-modal="true" aria-labelledby="dev-panel-title">' +
      '<header><h2 id="dev-panel-title">⚙ 設定（開発用）</h2><button type="button" class="dev-close" data-action="close" aria-label="閉じる">×</button></header>' +
      '<div class="dev-panel-scroll"></div><footer class="dev-panel-footer"></footer></section>';
    document.body.appendChild(backdrop);
    const scroll = backdrop.querySelector(".dev-panel-scroll");
    const footer = backdrop.querySelector(".dev-panel-footer");

    function row(label, key, value, unit, waveIndex) {
      const wave = waveIndex === undefined ? "" : ` data-wave="${waveIndex}"`;
      return `<div class="dev-row"><span class="dev-label">${label}</span><div class="dev-stepper">` +
        `<button type="button" data-action="minus" data-key="${key}"${wave} aria-label="${label}を減らす">－</button>` +
        `<output>${value}${unit}</output>` +
        `<button type="button" data-action="plus" data-key="${key}"${wave} aria-label="${label}を増やす">＋</button>` +
        `</div></div>`;
    }
    function render() {
      const previousTop = scroll.scrollTop;
      scroll.innerHTML = '<h3>音・ZONE</h3><div class="dev-preview-grid"><button type="button" data-action="zone-audio" style="grid-column:1/-1">属性音の聴き比べ・三方向ZONE</button></div>' +
        '<h3>忍術帖</h3><div class="dev-preview-grid">' +
        '<button type="button" data-action="book-layout" style="grid-column: 1 / -1">忍術帖のレイアウト調整</button></div>' +
        '<p class="dev-hint">忍術帖を開いて、文字・記号・印の配置を調整します。</p>' +
        '<h3>刀ショップ</h3><div class="dev-preview-grid"><button type="button" data-action="shop-layout" style="grid-column:1/-1">ショップのレイアウト調整</button></div>' +
        '<h3>お題・テンポ</h3>' +
        row("お題実プレイ時間", "activeMs", (draft.activeMs / 1000).toFixed(1), "秒") +
        row("お題通知時間", "noticeMs", (draft.noticeMs / 1000).toFixed(2), "秒") +
        '<h3>Wave 札数</h3>' + draft.waves.map((wave, index) =>
          `<div class="dev-wave"><strong>Wave ${index + 1}</strong>` +
          row("最小札数", "minCards", wave.minCards, "枚", index) +
          row("最大札数", "maxCards", wave.maxCards, "枚", index) + '</div>').join("") +
        '<h3>一閃チャンス</h3>' + row("Wave4 の一閃配置", "issenChance", Math.round(draft.issenChance * 100), "％") +
        '<h3>会心調整</h3>' +
        row("中心判定", "criticalCenterRatio",
          ["きびしい", "ふつう", "やさしい"][settings.centerChoices.indexOf(draft.criticalCenterRatio)], "") +
        row("速度判定", "criticalMinSpeed",
          ["ゆるい", "ふつう", "速い"][settings.speedChoices.indexOf(draft.criticalMinSpeed)], "") +
        '<h3>ZONE 調整</h3>' +
        row("必要ポイント", "zoneRequiredPoints", draft.zoneRequiredPoints, "") +
        row("ZONE 時間", "zoneDurationMs", (draft.zoneDurationMs / 1000).toFixed(1), "秒") +
        row("同時表示上限", "zoneMaxActive", draft.zoneMaxActive, "枚") +
        row("札の速さ", "zoneVelocityScale", Math.round(draft.zoneVelocityScale * 100), "％") +
        row("出現間隔", "zoneIntervalScale", Math.round(draft.zoneIntervalScale * 100), "％") +
        row("一閃配置", "zoneIssenChance", Math.round(draft.zoneIssenChance * 100), "％") +
        row("ヒットストップ", "zoneHitStopMs", draft.zoneHitStopMs, "ms") +
        row("ZONE一閃 飛沫", "zoneBurstPreset",
          { previous: "前版相当", standard: "標準", reference: "参考版級" }[draft.zoneBurstPreset], "") +
        '<h3>会心・一閃の表示（演出のみ）</h3>' +
        row("会心 総時間", "special.criticalTotalMs", draft.special.criticalTotalMs, "ms") +
        row("会心 静止", "special.criticalHoldMs", draft.special.criticalHoldMs, "ms") +
        row("会心 素材濃度", "special.criticalEffectAlpha", Math.round(draft.special.criticalEffectAlpha * 100), "％") +
        row("会心 ポップ倍率", "special.criticalPopScale", draft.special.criticalPopScale.toFixed(2), "倍") +
        row("一閃 総時間", "special.issenTotalMs", draft.special.issenTotalMs, "ms") +
        row("一閃 静止", "special.issenHoldMs", draft.special.issenHoldMs, "ms") +
        row("一閃 素材濃度", "special.issenEffectAlpha", Math.round(draft.special.issenEffectAlpha * 100), "％") +
        row("一閃 走り込み", "special.issenEntryDistance", draft.special.issenEntryDistance, "px") +
        row("一閃 抜け距離", "special.issenExitDistance", draft.special.issenExitDistance, "px") +
        row("リング", "special.ringEnabled", draft.special.ringEnabled ? "ON" : "OFF", "") +
        row("二段目リング", "special.secondRingEnabled", draft.special.secondRingEnabled ? "ON" : "OFF", "") +
        row("文字倍率", "special.labelScale", draft.special.labelScale.toFixed(2), "倍") +
        '<h3>動的VFX 比較（演出のみ）</h3>' +
        choice("エフェクト方式", "mode", [["legacy", "従来版"], ["dynamic", "動的版"]], draft.vfx.mode) +
        choice("試作の刀属性", "element", [["none", "なし"], ["fire", "炎"], ["lightning", "雷"], ["ice", "氷"], ["wind", "風"]], previewElement) +
        choice("演出強度", "strength", [["weak", "弱"], ["standard", "標準"], ["strong", "強"]], draft.vfx.strength) +
        choice("描画品質", "quality", [["low", "低負荷"], ["standard", "標準"], ["high", "高品質"]], draft.vfx.quality) +
        '<label class="dev-row"><span>動きを減らす（確認用）</span><input type="checkbox" data-vfx="reducedMotion"' +
        (previewReducedMotion ? ' checked' : '') + '></label>' +
        '<details><summary>VFX 詳細設定</summary>' +
        row("粒の速度", "vfx.speed", draft.vfx.speed.toFixed(2), "倍") +
        row("粒の寿命", "vfx.life", draft.vfx.life.toFixed(2), "倍") +
        row("重力", "vfx.gravity", draft.vfx.gravity.toFixed(2), "倍") +
        row("飛散角度", "vfx.spread", draft.vfx.spread.toFixed(2), "倍") +
        row("二段発射の間隔", "vfx.waveDelay", draft.vfx.waveDelay.toFixed(2), "倍") +
        '</details><p class="dev-hint">ここでの刀属性は比較用です。本編の装備はタイトルの「刀えらび」で保存できます。</p>' +
        '<h3>演出確認</h3><div class="dev-preview-grid">' +
        [["normal", "通常"], ["critical", "会心"], ["issen", "一閃"],
          ["compare_labels", "会心・一閃比較"], ["zone_critical", "ZONE会心"],
          ["zone_enter", "ZONE突入"], ["zone_normal", "ZONE通常"], ["zone_issen", "ZONE一閃"],
          ["zone_finish", "ZONE締め"], ["zone_world", "ZONE世界の出入り"],
          ["unlock_stage", "修行解放の巻物"], ["unlock_rank", "巻解放の巻物"]]
          .map(([id, label]) => `<button type="button" data-action="preview" data-variant="${id}">${label}</button>`).join("") +
        '</div><p class="dev-hint">変更は次のプレイから適用。演出確認は得点・記録を変更しません。</p>' +
        '<h3>保存済みの学習進行（見るだけ）</h3>' + progressRows(MapSymbolNinja.progress) +
        '<h3>進行確認（保存しない）</h3>' + progressRows(progressSandbox) +
        '<div class="dev-preview-grid">' +
        [["discover", "警察署を発見"], ["near_acquire", "警察署を会得直前"],
          ["acquire_all", "5記号すべて会得"], ["reset", "確認データ初期化"]]
          .map(([id, label]) => `<button type="button" data-action="progress-scenario" data-variant="${id}">${label}</button>`).join("") +
        '<button type="button" data-action="progress-preview">解放した巻物を確認</button></div>' +
        '<p class="dev-hint">其ノ二：' + (progressSandbox.isStageUnlocked("genin", 2) ? "解放成立" : "まだ未解放") +
        '。この欄とDevプレイでは児童の進行を保存しません。通常の修行では下忍・中忍・上忍の60種類を学べます。</p>';
      scroll.scrollTop = previousTop;
      footer.innerHTML = confirmingReset
        ? '<span class="dev-confirm">初期値にもどしますか？</span><button type="button" data-action="reset-yes">もどす</button><button type="button" data-action="reset-no">やめる</button>'
        : '<button type="button" class="dev-reset" data-action="reset">初期値にもどす</button><button type="button" class="dev-save" data-action="save">この設定でプレイ</button>';
    }
    function progressRows(manager) {
      return manager.getSymbolsWithProgress("genin", 1).map((entry) =>
        '<div class="dev-row"><span class="dev-label">' + entry.officialName + '</span><output>' +
        MapSymbolNinja.ProgressConfig.MASTERY_LABELS[entry.masteryState] + '　成功 ' + entry.successfulEncounters +
        ' / ' + (entry.masteryState === "acquired" || entry.masteryState === "master" ? 10 : 3) + '</output></div>').join("");
    }
    function choice(label, key, choices, value) {
      return '<label class="dev-row"><span class="dev-label">' + label + '</span><select data-vfx="' + key + '">' +
        choices.map(([id, name]) => '<option value="' + id + '"' + (id === value ? ' selected' : '') + '>' + name + '</option>').join('') +
        '</select></label>';
    }
    function handleChange(event) {
      const key = event.target.dataset.vfx;
      if (key === "element") previewElement = event.target.value;
      else if (key === "reducedMotion") previewReducedMotion = event.target.checked;
      else if (["mode", "strength", "quality"].includes(key)) draft.vfx[key] = event.target.value;
    }
    function adjust(button, direction) {
      const key = button.dataset.key;
      if (key && key.startsWith("vfx.")) {
        const name = key.slice(4);
        const bounds = name === "gravity" ? [.25, 2] : name === "waveDelay" ? [.5, 2] : [.5, 1.5];
        draft.vfx[name] = Math.round(Math.max(bounds[0], Math.min(bounds[1], draft.vfx[name] + direction * .1)) * 100) / 100;
      } else if (key && key.startsWith("special.")) {
        const name = key.slice(8);
        const bounds = { criticalTotalMs: [600, 900, 20], criticalHoldMs: [300, 420, 20],
          criticalEffectAlpha: [.25, .8, .05], criticalPopScale: [1, 1.2, .02],
          issenTotalMs: [850, 1250, 50], issenHoldMs: [400, 650, 10],
          issenEffectAlpha: [.25, .8, .05], issenEntryDistance: [20, 90, 5],
          issenExitDistance: [10, 55, 5], labelScale: [.95, 1.15, .01] }[name];
        if (name === "ringEnabled" || name === "secondRingEnabled") draft.special[name] = !draft.special[name];
        else if (bounds) draft.special[name] = Math.round(Math.max(bounds[0], Math.min(bounds[1],
          draft.special[name] + direction * bounds[2])) * 100) / 100;
        else return;
      } else if (key === "minCards" || key === "maxCards") {
        const wave = draft.waves[Number(button.dataset.wave)];
        if (!wave) return;
        wave[key] = Math.max(1, Math.min(4, wave[key] + direction));
        if (wave.minCards > wave.maxCards) wave[key === "minCards" ? "maxCards" : "minCards"] = wave[key];
      } else if (key === "criticalCenterRatio" || key === "criticalMinSpeed") {
        const choices = key === "criticalCenterRatio" ? settings.centerChoices : settings.speedChoices;
        const index = Math.max(0, choices.indexOf(draft[key]));
        draft[key] = choices[Math.max(0, Math.min(choices.length - 1, index + direction))];
      } else if (key === "zoneBurstPreset") {
        const choices = ["previous", "standard", "reference"];
        const index = Math.max(0, choices.indexOf(draft[key]));
        draft[key] = choices[Math.max(0, Math.min(choices.length - 1, index + direction))];
      } else {
        const bounds = { activeMs: [7000, 15000, 500], noticeMs: [400, 1200, 50],
          issenChance: [0, 1, .05], zoneRequiredPoints: [10, 40, 1],
          zoneDurationMs: [5000, 10000, 500], zoneMaxActive: [7, 10, 1],
          zoneVelocityScale: [.70, 1.10, .01], zoneIntervalScale: [.40, 1.20, .05],
          zoneIssenChance: [0, 1, .05], zoneHitStopMs: [35, 50, 1] }[key];
        if (!bounds) return;
        draft[key] = Math.max(bounds[0], Math.min(bounds[1],
          Math.round((draft[key] + direction * bounds[2]) / bounds[2]) * bounds[2]));
      }
      if (key === "zoneMaxActive") draft.zoneSpawn.maxActive = draft.zoneMaxActive;
      render();
    }
    function close() {
      backdrop.removeEventListener("click", handleClick);
      backdrop.removeEventListener("change", handleChange);
      document.removeEventListener("keydown", handleKey);
      scene.events.off("shutdown", close);
      backdrop.remove();
      window.setTimeout(() => {
        if (scene.sys.isActive() && !document.getElementById("zone-audio-panel")) scene.input.enabled = true;
      }, 60);
    }
    function handleKey(event) {
      if (event.key === "Escape") close();
    }
    function handleClick(event) {
      const button = event.target.closest("button[data-action]");
      if (!button || !backdrop.contains(button)) return;
      switch (button.dataset.action) {
        case "zone-audio":
          settings.save(draft);
          close();
          MapSymbolNinja.ZoneAudioPanel.open(scene, previewElement);
          break;
        case "shop-layout":
          if (scene.transitionLock || !NINJA_CONFIG.DEV_PANEL_ENABLED) break;
          close();
          scene.scene.start("SwordSelectScene", { openLayoutEditor: true });
          break;
        case "book-layout":
          if (scene.transitionLock || !NINJA_CONFIG.DEV_PANEL_ENABLED) break;
          close();
          scene.scene.start("NinjutsuBookScene", { from: "TitleScene", openLayoutEditor: true });
          break;
        case "progress-scenario":
          progressSandbox = MapSymbolNinja.ProgressDevTools.scenario(progressSandbox, button.dataset.variant);
          render();
          break;
        case "progress-preview":
          if (progressSandbox.getPendingUnlocks().length) {
            close(); scene.scene.start("UnlockPreviewScene", { variant: "unlock_stage" });
          } else MapSymbolNinja.UI.announce("先に、5記号すべて会得の確認ボタンを押してください。");
          break;
        case "close": close(); break;
        case "preview": {
          const variant = button.dataset.variant;
          close();
          scene.scene.start(variant.startsWith("unlock_") ? "UnlockPreviewScene" : "PreviewScene", {
            variant, vfx: Object.assign({}, draft.vfx, { element: previewElement }), reducedMotion: previewReducedMotion });
          break;
        }
        case "plus": adjust(button, 1); break;
        case "minus": adjust(button, -1); break;
        case "save":
          settings.save(draft);
          MapSymbolNinja.UI.announce("開発設定を保存しました。次の修行から反映します。");
          close();
          break;
        case "reset": confirmingReset = true; render(); break;
        case "reset-no": confirmingReset = false; render(); break;
        case "reset-yes":
          draft = settings.save(settings.defaults());
          confirmingReset = false;
          render();
          break;
      }
    }
    backdrop.addEventListener("click", handleClick);
    backdrop.addEventListener("change", handleChange);
    document.addEventListener("keydown", handleKey);
    scene.events.once("shutdown", close);
    render();
    backdrop.querySelector(".dev-close").focus();
  }
  window.MapSymbolNinja.DevPanel = { open };
})();
