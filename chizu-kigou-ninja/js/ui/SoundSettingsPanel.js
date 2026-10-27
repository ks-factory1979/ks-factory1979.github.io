(function () {
  "use strict";
  window.MapSymbolNinja = window.MapSymbolNinja || {};
  MapSymbolNinja.SoundSettingsPanel = {
    open(scene) {
      if (document.getElementById("sound-settings")) return;
      const audio = window.ninjaAudio, prefs = MapSymbolNinja.audioPreferences;
      const previousFocus = document.activeElement, wasInput = scene.input.enabled;
      scene.input.enabled = false;
      if (scene.navigation) scene.navigation.setEnabled(false);
      const shade = document.createElement("div"); shade.id = "sound-settings";
      shade.innerHTML = '<section class="sound-card" role="dialog" aria-modal="true" aria-labelledby="sound-heading">' +
        '<h2 id="sound-heading">音のせってい</h2><p>ゲームの音を、じぶんに合わせよう</p>' +
        '<button type="button" data-sound="master"></button>' +
        '<button type="button" data-sound="bgm"></button>' +
        '<button type="button" data-sound="sfx"></button>' +
        '<label class="sound-volume">BGMの大きさ <output></output><input type="range" min="0" max="50" step="1" aria-label="BGMの大きさ"></label>' +
        '<p class="sound-note">画面に合う音楽が流れるよ。<br>「音 OFF」のときは、すべての音が止まるよ。</p>' +
        '<button type="button" data-sound="close" class="sound-close">とじる</button></section>';
      const master = shade.querySelector('[data-sound="master"]');
      const bgm = shade.querySelector('[data-sound="bgm"]');
      const sfx = shade.querySelector('[data-sound="sfx"]');
      const slider = shade.querySelector("input"), output = shade.querySelector("output");
      const refresh = () => {
        const value = prefs.get();
        master.textContent = "すべての音 " + (audio.isMuted() ? "OFF" : "ON");
        bgm.textContent = "BGM " + (value.bgmEnabled ? "ON" : "OFF");
        sfx.textContent = "効果音 " + (value.sfxEnabled ? "ON" : "OFF");
        master.setAttribute("aria-pressed", String(!audio.isMuted()));
        bgm.setAttribute("aria-pressed", String(value.bgmEnabled));
        sfx.setAttribute("aria-pressed", String(value.sfxEnabled));
        slider.value = Math.round(value.bgmVolume * 100); output.textContent = slider.value + "%";
        if (scene.utilityButtons && scene.utilityButtons.sound) scene.utilityButtons.sound.setLabel(audio.isMuted() ? "音 OFF" : "音 ON");
      };
      const unlock = () => {
        try { audio.unlock().catch(() => false); window.ninjaBGM.prepare().catch(() => false); } catch (_error) { /* 無音でも閉じられる。 */ }
      };
      master.onclick = () => { unlock(); audio.toggle(); refresh(); };
      bgm.onclick = () => { unlock(); prefs.set({ bgmEnabled: !prefs.get().bgmEnabled }); };
      sfx.onclick = () => { unlock(); prefs.set({ sfxEnabled: !prefs.get().sfxEnabled }); audio.play("ui"); };
      slider.oninput = () => prefs.set({ bgmVolume: Number(slider.value) / 100 });
      slider.onpointerdown = unlock;
      const unPrefs = prefs.subscribe(refresh), unMute = audio.subscribeMute(refresh);
      let closed = false;
      const close = () => {
        if (closed) return; closed = true; unPrefs(); unMute(); shade.remove();
        scene.events.off("shutdown", close);
        scene.input.enabled = wasInput;
        if (scene.navigation) scene.navigation.setEnabled(true);
        if (previousFocus && previousFocus.focus) previousFocus.focus();
      };
      shade.querySelector('[data-sound="close"]').onclick = close;
      shade.addEventListener("keydown", event => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); close(); }
        if (event.key === "Tab") {
          const targets = Array.from(shade.querySelectorAll("button,input")), index = targets.indexOf(document.activeElement);
          if ((event.shiftKey && index === 0) || (!event.shiftKey && index === targets.length - 1)) {
            event.preventDefault(); targets[event.shiftKey ? targets.length - 1 : 0].focus();
          }
        }
      });
      scene.events.once("shutdown", close); document.body.appendChild(shade); refresh(); master.focus();
    }
  };
})();
