(function () {
  "use strict";
  const app = MapSymbolNinja;
  app.SaveInfoPanel = {
    open(scene) {
      if (document.getElementById("save-info") || document.getElementById("sound-settings") || scene.transitionLock) return;
      const previousFocus = document.activeElement, wasInput = scene.input.enabled;
      const navigation = scene.navigation, wasNavigation = navigation && navigation.enabled;
      scene.input.enabled = false;
      if (navigation) navigation.setEnabled(false);
      const shade = document.createElement("div"); shade.id = "save-info";
      shade.innerHTML = `<section class="save-info-card" role="dialog" aria-modal="true" aria-labelledby="save-info-heading" aria-describedby="save-info-intro">
        <header><h2 id="save-info-heading" tabindex="-1">記録の保存について</h2><button type="button" data-save-info-close aria-label="記録の保存の案内を閉じる">×</button></header>
        <div class="save-info-body" tabindex="0" aria-label="保存の案内。上下にスクロールできます">
          <p id="save-info-intro">学習記録・小判・買った刀は、この端末のブラウザーに保存されるよ。</p>
          <section><h3>みんなで使う端末では</h3><p>同じ端末・同じブラウザーの同じ利用者設定では、記録をいっしょに使うよ。ひとりずつ自動で分かれるしくみはないよ。学校の端末では、先生と使い方を決めてね。</p></section>
          <section><h3>端末やブラウザーをかえると</h3><p>別の端末・ブラウザー・利用者設定には、自動で引きつがれないよ。クラウド同期はしていないよ。</p></section>
          <section><h3>URLや開き方をかえると</h3><p>公開するサイトや開き方が変わると、前の記録が見えなくなることがあるよ。同じサイト内では、フォルダーや「?」以降を変えるだけでは、別の人の記録に分けられないよ。</p></section>
          <section><h3>データを消すまえに</h3><p>ブラウザーの「サイトデータ」を消すと、学習記録・小判・買った刀の記録も失われることがあるよ。シークレット・プライベートで開くと、閉じたあとに記録が残らないことがあるよ。</p></section>
          <details><summary>先生・おうちの人へ</summary><p>利用者設定（プロファイル）が同じなら、児童が交代してもこのゲームの記録は共通です。氏名や児童別アカウントを入力して分ける機能はありません。</p>
            <p>Web版の保存範囲は、通信方法（http / https）・ホスト名・ポートが同じサイトごとです。同じサイト内のパス・クエリー・#以降は、保存先の区切りになりません。</p>
            <p>ダウンロードしたファイルを直接開く版（file://）と、公開版（https://）の記録は自動で移りません。file://での保存はブラウザーやファイルの場所によって異なり、同じ記録を使える保証はありません。</p>
            <p>URLを変えて記録が見えなくても、元の保存場所の記録が消えたとは限りません。元の端末・ブラウザー・利用者設定・開き方を確認してください。保存場所の変更前に利用方法を決め、保存の警告が出ている場合は画面を閉じる前に確認してください。</p>
          </details>
        </div><footer><p>この案内を開いたり閉じたりしても、記録は変わりません。</p><button type="button" data-save-info-close>わかった、とじる</button></footer></section>`;
      // 背後のゲーム・通知を操作させず、閉じたら元の状態を戻す。
      const siblings = Array.from(document.body.children).map(element => ({element, inert:element.inert}));
      siblings.forEach(({element}) => { element.inert = true; });
      let closed = false;
      const close = (restore) => {
        if (closed) return; closed = true; shade.remove();
        siblings.forEach(({element,inert}) => { element.inert = inert; });
        scene.events.off("shutdown", shutdown);
        if (restore) {
          scene.input.enabled = wasInput;
          if (navigation) navigation.setEnabled(wasNavigation !== false);
          if (previousFocus && previousFocus.isConnected && previousFocus.focus) previousFocus.focus({preventScroll:true});
        }
      };
      const shutdown = () => close(false);
      shade.querySelectorAll("[data-save-info-close]").forEach(button => { button.onclick = () => close(true); });
      shade.addEventListener("keydown", event => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); close(true); return; }
        if (event.key !== "Tab") return;
        const targets = Array.from(shade.querySelectorAll("button,summary,.save-info-body")), index = targets.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0 || !event.shiftKey && index === targets.length - 1) {
          event.preventDefault(); targets[event.shiftKey ? targets.length - 1 : 0].focus();
        }
      });
      for (const type of ["pointerdown","pointermove","pointerup","click","keyup"]) shade.addEventListener(type, event => event.stopPropagation());
      scene.events.once("shutdown", shutdown); document.body.append(shade);
      shade.querySelector("h2").focus({preventScroll:true});
    }
  };
})();
