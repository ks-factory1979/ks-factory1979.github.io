(function () {
  "use strict";
  const elements = [["fire", "炎"], ["lightning", "雷"], ["ice", "氷"], ["wind", "風"]];
  function open(scene, initialElement) {
    if (!NINJA_CONFIG.DEV_PANEL_ENABLED || document.getElementById("zone-audio-panel")) return;
    const game = scene.sys.settings.key === "GameScene";
    const wasInputEnabled = game ? scene.input.enabled : true;
    let element = elements.some(([id]) => id === initialElement) ? initialElement : game && scene.equippedSword !== "none" ? scene.equippedSword : "fire";
    let sounds = MapSymbolNinja.ElementalSoundPreferences.load();
    let tuning = MapSymbolNinja.DevSettings.load(), type = "normal", closed = false;
    const previouslyFocused = document.activeElement;
    if (game) scene.scene.pause();
    scene.input.enabled = false;
    const back = document.createElement("div");
    back.id = "zone-audio-panel"; back.className = "ninja-dev-backdrop";
    back.innerHTML = '<section class="ninja-dev-panel zone-audio-panel" role="dialog" aria-modal="true" aria-labelledby="zone-audio-title">' +
      '<header><h2 id="zone-audio-title">属性音・三方向ZONE</h2><button class="dev-close" data-close aria-label="閉じる">×</button></header>' +
      '<div class="dev-panel-scroll"></div><footer class="dev-panel-footer"><span data-status role="status"></span><button data-close>閉じる</button></footer></section>';
    document.body.appendChild(back);
    const body = back.querySelector(".dev-panel-scroll"), status = back.querySelector("[data-status]");
    function select(label, key, choices, value) {
      return '<label class="dev-row"><span>' + label + '</span><select data-field="' + key + '">' + choices.map(([id, name]) => '<option value="' + id + '"' + (value === id ? ' selected' : '') + '>' + name + '</option>').join("") + '</select></label>';
    }
    function number(label, key, value, min, max, step, unit) {
      return '<label class="dev-row"><span>' + label + '</span><span><input type="number" data-field="' + key + '" value="' + value + '" min="' + min + '" max="' + max + '" step="' + step + '"> ' + unit + '</span></label>';
    }
    function render() {
      const scrollTop = body.scrollTop, z = tuning.zoneSpawn;
      body.innerHTML = '<p class="dev-hint">開発用。候補はすべて外部CC0素材の編集音です。試作既定は各属性A。正式採用は聴き比べ後に決めます。</p>' +
        select("刀の属性（VFX・音）", "element", elements, element) +
        select("斬撃の種類", "type", [["normal", "通常"], ["critical", "会心"], ["issen", "一閃"], ["zone_issen", "ZONE一閃"]], type) +
        number("属性音量", "volume", Math.round(sounds.volume * 100), 0, 100, 5, "％") +
        number("斬撃音量（属性刀）", "slashVolume", Math.round(sounds.slashVolume * 100), 0, 100, 5, "％") +
        '<p class="dev-hint">属性音を主役にしたバランスです。ZONE一閃の主音は従来の音量を保ちます。</p>' +
        '<p>現在の候補：<strong>' + sounds.candidates[element] + '</strong>（比較用に保存）</p>' +
        Object.entries(MapSymbolNinja.ElementalAudioData[element]).map(([id, clip]) => '<div class="audio-candidate"><strong>' + id + '：' + clip.label + '</strong><div>' +
          '<button data-listen="' + id + '">単独</button><button data-mix="' + id + '">斬撃と合成</button><button data-use="' + id + '" aria-pressed="' + (sounds.candidates[element] === id) + '">この候補を使う</button></div></div>').join("") +
        '<h3>三方向ZONE（変更は即時反映）</h3>' +
        select("出現方式", "threeWay", [["on", "三方向"], ["off", "従来の下のみ"]], z.threeWay ? "on" : "off") +
        number("下の割合", "bottom", z.bottom, 0, 100, 5, "％") + number("左の割合", "left", z.left, 0, 100, 5, "％") + number("右の割合", "right", z.right, 0, 100, 5, "％") +
        '<p class="dev-hint">合計100％に自動調整。締めの二枚は従来の下から出現します。</p>' +
        number("左右の速度", "sideSpeed", z.sideSpeed, .8, 1.2, .05, "倍") +
        number("左右の打ち上げ角度", "angle", z.angle, 42, 62, 2, "度") +
        number("出現高さ（画面上から）", "height", Math.round(z.height * 100), 78, 96, 2, "％") +
        number("同時表示上限", "maxActive", z.maxActive, 7, 10, 1, "枚") +
        '<div class="dev-preview-grid"><button data-play="normal">この属性で修行</button><button data-play="zone">この属性でZONE</button></div>' +
        '<p class="dev-hint">確認プレイは学習記録を保存しません。プレイ中の「⚙ 音・ZONE」で候補を切替できます。開いている間はゲームを一時停止します。</p>';
      body.scrollTop = scrollTop;
    }
    function persist() {
      sounds = MapSymbolNinja.ElementalSoundPreferences.save(sounds);
      tuning.zoneMaxActive = tuning.zoneSpawn.maxActive;
      tuning = MapSymbolNinja.DevSettings.save(tuning);
      if (game) {
        scene.equippedSword = element;
        if (scene.slashTraceSystem) {
          if (!scene.slashTraceSystem.dynamicVFX) scene.slashTraceSystem.dynamicVFX = new NinjaCore.DynamicSlashVFXSystem(scene,
            MapSymbolNinja.EffectPreferences.vfx(Object.assign({}, scene.tuning.vfx, { element, reducedMotion: window.__NINJA_REDUCED_MOTION, elementOnly: scene.slashTraceSystem.vfxMode === "legacy" })));
          else scene.slashTraceSystem.dynamicVFX.options.element = element;
        }
        scene._disableProgress("audio_comparison");
      }
      status.textContent = "比較設定を保存・反映しました";
    }
    function close() {
      if (closed) return; closed = true;
      window.ninjaAudio.stopAttributeSounds();
      document.removeEventListener("keydown", onKey);
      scene.events.off("shutdown", close); back.remove();
      if (game) scene.scene.resume();
      if (scene.sys.isActive() || scene.sys.isPaused()) scene.input.enabled = wasInputEnabled;
      if (previouslyFocused && previouslyFocused.isConnected) previouslyFocused.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "Tab") {
        const all = Array.from(back.querySelectorAll("button,select,input")), first = all[0], last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    back.addEventListener("change", e => {
      const k = e.target.dataset.field; if (!k) return;
      if (k === "type") type = e.target.value;
      else if (k === "element") element = e.target.value;
      else if (k === "volume") sounds.volume = Number(e.target.value) / 100;
      else if (k === "slashVolume") sounds.slashVolume = Number(e.target.value) / 100;
      else tuning.zoneSpawn[k] = k === "threeWay" ? e.target.value === "on" : k === "height" ? Number(e.target.value) / 100 : Number(e.target.value);
      if (k !== "type") persist(); render();
    });
    back.addEventListener("click", async e => {
      const button = e.target.closest("button"); if (!button) return;
      if (button.hasAttribute("data-close")) { close(); return; }
      if (button.dataset.use) { sounds.candidates[element] = button.dataset.use; persist(); render(); return; }
      const candidate = button.dataset.listen || button.dataset.mix;
      if (candidate) {
        const played = await window.ninjaAudio.elemental.preview(element, candidate, type, Boolean(button.dataset.mix));
        if (closed) { window.ninjaAudio.stopAttributeSounds(); return; }
        status.textContent = played ? "候補 " + candidate + " を再生しました" : window.ninjaAudio.isMuted() ? "音声がOFFです。画面の音ボタンでONにしてください" : "音声の読み込みに失敗しました（基本音は保護）";
      }
      if (button.dataset.play) {
        persist(); const force = button.dataset.play === "zone";
        close();
        if (game && force && scene.zoneSystem.state === "normal" && !scene.scoringLocked) {
          scene.zoneSystem.points = scene.zoneSystem.required;
          scene._enterZone(false);
        }
        else scene.scene.start("GameScene", { rank: "genin", stage: 1, progressEnabled: false, devElement: element, devForceZone: force });
      }
    });
    document.addEventListener("keydown", onKey); scene.events.once("shutdown", close);
    render(); back.querySelector("[data-close]").focus();
  }
  MapSymbolNinja.ZoneAudioPanel = { open };
})();
