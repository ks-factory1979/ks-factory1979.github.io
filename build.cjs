const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'apps.json'), 'utf8'));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const publicApps = data.apps.filter(app => app.status === 'published');
const upcomingApps = data.apps.filter(app => app.status === 'coming-soon');
const siteUrl = new URL(data.siteUrl);
if(siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) throw new Error('Use the canonical HTTPS site root.');
const pageTitle = data.pageTitle || `${data.siteName}｜遊んで学べる教育アプリ`;
const description = data.description || '学校やおうちで使える教育アプリのポータルサイト。';
const websiteSchema = JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:data.siteName,alternateName:`${data.siteName} ${data.siteSubtitle}`,url:data.siteUrl,inLanguage:'ja',description}).replace(/</g,'\\u003c');
const verificationMeta = data.googleSiteVerification ? `<meta name="google-site-verification" content="${escape(data.googleSiteVerification)}" />` : '';
const counterUrl = data.counterUrl || '';
if (counterUrl && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(counterUrl)) throw new Error('Invalid counter URL.');
if (counterUrl && !fs.existsSync(path.join(__dirname, 'counter.js'))) throw new Error('Missing counter.js');
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
  <title>${escape(pageTitle)}</title>
  <meta name="description" content="${escape(description)}">
  ${verificationMeta}
  <meta name="theme-color" content="#142b49">
  <link rel="canonical" href="${escape(data.siteUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ja_JP">
  <meta property="og:title" content="${escape(pageTitle)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${escape(data.siteUrl)}">
  <link rel="stylesheet" href="styles.css">
  <script type="application/ld+json">${websiteSchema}</script>
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
      <p class="intro-text">小学生が遊びながら学べる、無料の教育アプリ。<br class="desktop-break">学校でも、おうちでも。気になるアプリで遊んでみよう。</p>
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
    ${counterUrl ? `<aside class="visit-count" id="access-counter" data-endpoint="${escape(counterUrl)}" aria-label="累計アクセス数">
      <div class="visit-count-heading"><p class="visit-count-label">累計アクセス</p><p class="visit-count-number" aria-live="polite"><strong id="access-count">—</strong><span>回</span></p></div>
      <div class="visit-count-note"><p id="access-count-status" role="status">集計中…</p><p>ページを開いた回数です。再読み込みも含みます。</p><noscript><p>カウンターの表示にはJavaScriptが必要です。</p></noscript></div>
    </aside>` : ''}
  </main>
  <footer class="site-footer"><p class="footer-brand">${escape(data.siteName)} <span>${escape(data.siteSubtitle)}</span></p><p>${counterUrl ? 'アクセス数は合計だけを集計し、名前や利用者IDは保存しません。' : 'この紹介ページでは、名前の入力や利用記録の収集を行いません。'}</p><a href="#">ページの上へ ↑</a></footer>
  ${counterUrl ? '<script src="counter.js" defer></script>' : ''}
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'index.html'), page);
fs.writeFileSync(path.join(__dirname, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml',data.siteUrl).href}\n`);
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${escape(data.siteUrl)}</loc></url>\n</urlset>\n`);
console.log(`Built portal: ${publicApps.length} published app(s), ${Buffer.byteLength(page)} bytes of HTML; robots.txt and sitemap.xml ready.`);
