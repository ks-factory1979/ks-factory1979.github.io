(() => {
  'use strict';
  const counter = document.getElementById('access-counter');
  if (!counter || counter.dataset.loaded) return;
  const endpoint = counter.dataset.endpoint;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint || '')) return;
  counter.dataset.loaded = 'true';
  const value = document.getElementById('access-count');
  const status = document.getElementById('access-count-status');
  const request = document.createElement('script');
  let finished = false;
  const finish = (data) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    request.remove();
    if (data && data.ok === true && Number.isSafeInteger(data.total) && data.total >= 0) {
      value.textContent = data.total.toLocaleString('ja-JP');
      status.textContent = data.startedOn && /^\d{4}-\d{2}-\d{2}$/.test(data.startedOn)
        ? data.startedOn.replaceAll('-', '/') + ' からの合計'
        : '集計をはじめました';
    } else {
      value.textContent = '—';
      status.textContent = 'ただいま集計を確認できません';
    }
  };
  window.ksFactoryCounter = finish;
  const timer = setTimeout(() => finish(null), 20000);
  // 加算リクエストでは、個人を識別する情報や保存済みのCookieを送信しません。
  // 更新の完了後、公開用の合計だけを別の読み取り口から取得します。
  fetch(endpoint, {
    method: 'POST',
    mode: 'no-cors',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    body: new URLSearchParams({ action: 'visit' })
  }).then(() => {
    if (finished) return;
    request.async = true;
    request.referrerPolicy = 'no-referrer';
    request.src = endpoint + '?v=' + Date.now();
    request.onerror = () => finish(null);
    document.head.appendChild(request);
  }).catch(() => finish(null));
})();
