const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'apps.json'), 'utf8'));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const publicApps = data.apps.filter(app => app.status === 'published');
const upcomingApps = data.apps.filter(app => app.status === 'coming-soon');
const ids = new Set();
for (const app of publicApps) {
  if (ids.has(app.id)) throw new Error('Duplicate app ID: ' + app.id);
  ids.add(app.id);
  if (!app.title || !app.description || new URL(app.url).protocol !== 'https:') throw new Error('Invalid published app: ' + app.id);
  for (const image of [app.cover, app.logo].filter(Boolean)) {
    if (!/^[a-z0-9-]+\.(png|webp|jpg)$/.test(image) || !fs.existsSync(path.join(__dirname, image))) throw new Error('Missing image: ' + image);
  }
}
if (!publicApps.length) throw new Error('At least one published app is required.');
const cards = publicApps.map(app => `
      <article class="app-card${app.featured ? ' featured' : ''}" id="${escape(app.id)}">
        <div class="app-visual">
          <img class="app-cover" src="${escape(app.cover)}" alt="${escape(app.coverAlt)}" width="1024" height="768"${app.featured ? ' fetchpriority="high"' : ' loading="lazy"'}>
          ${app.logo ? `<div class="app-logo"><img src="${escape(app.logo)}" alt="" width="1100" height="346"></div>` : ''}
        </div>
        <div class="app-content">
          <p class="category">${escape(app.category)}</p>
          <h3>${escape(app.title)}</h3>
          <p class="app-lead">${escape(app.lead)}</p>
          <p class="app-description">${escape(app.description)}</p>
          <ul class="tags" aria-label="このアプリで楽しめること">${app.tags.map(tag => `<li>${escape(tag)}</li>`).join('')}</ul>
          <a class="play-button" href="${escape(app.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(app.title)}であそぶ（新しいタブ）">あそぶ <span aria-hidden="true">↗</span></a>
          <p class="requirements">${escape(app.requirements)}</p>
          ${app.note ? `<p class="app-note">${escape(app.note)}</p>` : ''}
        </div>
      </article>`).join('\n');
const upcoming = upcomingApps.length ? `<section class="upcoming" aria-labelledby="upcoming-title"><div class="upcoming-heading"><h3 id="upcoming-title">これから仲間入り</h3><p>公開できたアプリから、ここに追加していきます。</p></div><ul class="upcoming-list">${upcomingApps.map(app => `<li><span class="coming-mark" aria-hidden="true">＋</span><h4>${escape(app.title)}</h4><span class="coming-status">準備中</span></li>`).join('')}</ul></section>` : '';
const page = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(data.siteName)}｜遊んで学べる教育アプリ</title>
  <meta name="description" content="学校やおうちで使える教育アプリのポータルサイト。ことば探検タイピング村で、ローマ字入力・村づくり・試練の洞窟への挑戦を楽しもう。">
  <meta name="theme-color" content="#142b49">
  <link rel="canonical" href="${escape(data.siteUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ja_JP">
  <meta property="og:title" content="${escape(data.siteName)}｜遊んで学べる教育アプリ">
  <meta property="og:description" content="学校やおうちで使える、教育アプリの入り口です。今日の「やってみたい」を見つけよう。">
  <meta property="og:url" content="${escape(data.siteUrl)}">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <a class="skip-link" href="#apps">アプリ一覧へ進む</a>
  <header class="site-header">
    <a class="brand" href="./" aria-label="${escape(data.siteName)} ${escape(data.siteSubtitle)} ホーム"><span class="brand-mark" aria-hidden="true">K<span>’</span></span><span class="brand-name">${escape(data.siteName)}<small>${escape(data.siteSubtitle)}</small></span></a>
    <nav aria-label="メインナビゲーション"><a href="#apps">アプリ一覧</a><a href="#guide">使う方へ</a></nav>
  </header>
  <main>
    <section class="intro" aria-labelledby="intro-title">
      <p class="eyebrow"><span aria-hidden="true"></span> 遊んで、見つける。自分の「できた！」</p>
      <h1 id="intro-title">「やってみたい」が、<br><em>学びのはじまり。</em></h1>
      <p class="intro-text">学校やおうちで使える、教育アプリの入り口です。<br class="desktop-break">気になるアプリを選んで、さっそく遊んでみよう。</p>
      <a class="browse-link" href="#apps">アプリをえらぶ <span aria-hidden="true">↓</span></a>
    </section>
    <section class="app-section" id="apps" aria-labelledby="apps-title">
      <div class="section-heading"><div><p class="section-kicker">さあ、どれであそぶ？</p><h2 id="apps-title">アプリをえらぶ</h2></div><p class="app-count">公開中 <strong>${publicApps.length}</strong> 作品</p></div>
      <div class="app-grid">${cards}
      </div>
      ${upcoming}
    </section>
    <section class="guide" id="guide" aria-labelledby="guide-title">
      <div class="guide-title"><p class="section-kicker">学校でも、おうちでも</p><h2 id="guide-title">使う方へ</h2></div>
      <div class="guide-items">
        <div><h3>ボタンから、すぐに</h3><p>「あそぶ」を押すと、新しいタブでアプリが開きます。アプリごとの案内を読んで、遊びはじめてください。</p></div>
        <div><h3>記録はアプリごとに</h3><p>進み具合や記録の保存方法はアプリによって異なります。タイピング村では、同じ端末・同じブラウザで続きから遊べます。</p></div>
        <div><h3>授業の前にひと遊び</h3><p>学校の端末では、アクセスの制限がある場合があります。使う端末で、画面・入力・音の設定を先に確かめてください。</p></div>
      </div>
    </section>
  </main>
  <footer class="site-footer"><p class="footer-brand">${escape(data.siteName)} <span>${escape(data.siteSubtitle)}</span></p><p>この紹介ページでは、名前の入力や利用記録の収集を行いません。</p><a href="#">ページの上へ ↑</a></footer>
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'index.html'), page);
console.log(`Built portal: ${publicApps.length} published app(s), ${Buffer.byteLength(page)} bytes of HTML.`);
