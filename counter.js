(() => {
  'use strict';
  const counter = document.getElementById('access-counter');
  if (!counter || counter.dataset.loaded) return;
  const endpoint = counter.dataset.endpoint;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint || '')) return;
  const value = document.getElementById('access-count');
  const status = document.getElementById('access-count-status');
  if (!value || !status) return;
  counter.dataset.loaded = 'true';

  const READ_TIMEOUT_MS = 15000;
  const READ_RETRY_DELAY_MS = 1500;
  const MAX_READ_ATTEMPTS = 2;
  const WRITE_WAIT_MS = 6000;
  let request = null;
  let readTimer;
  let retryTimer;
  let firstReadStarted = false;
  let settled = false;
  let attempts = 0;

  const clearRead = () => {
    clearTimeout(readTimer);
    clearTimeout(retryTimer);
    if (request) {
      request.onload = null;
      request.onerror = null;
      request.remove();
      request = null;
    }
  };

  const showUnavailable = () => {
    settled = true;
    value.textContent = '—';
    status.textContent = 'アクセス数を読み込めませんでした。';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'もう一度読み込む';
    retry.style.cssText = 'font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:6px;padding:6px 12px;margin:6px 0 0 8px;cursor:pointer';
    retry.addEventListener('click', () => {
      if (!settled) return;
      settled = false;
      attempts = 0;
      status.textContent = 'アクセス数を読み込み中…';
      readTotal();
    });
    status.appendChild(retry);
  };

  const readFailed = () => {
    if (settled || !request) return;
    clearRead();
    if (attempts < MAX_READ_ATTEMPTS) {
      status.textContent = 'アクセス数を読み直しています…';
      retryTimer = setTimeout(readTotal, READ_RETRY_DELAY_MS);
    } else {
      showUnavailable();
    }
  };

  window.ksFactoryCounter = (data) => {
    if (settled || !firstReadStarted) return;
    if (data && data.ok === true && Number.isSafeInteger(data.total) && data.total >= 0) {
      settled = true;
      clearRead();
      value.textContent = data.total.toLocaleString('ja-JP');
      status.textContent = data.startedOn && /^\d{4}-\d{2}-\d{2}$/.test(data.startedOn)
        ? data.startedOn.replaceAll('-', '/') + ' からの合計'
        : '集計をはじめました';
    } else {
      readFailed();
    }
  };

  function readTotal() {
    if (settled) return;
    attempts += 1;
    const script = document.createElement('script');
    request = script;
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = endpoint + '?v=' + Date.now() + '-' + attempts;
    const failed = () => { if (request === script) readFailed(); };
    script.onerror = failed;
    // HTML等が返り、コールバックが呼ばれなかった場合も再試行します。
    script.onload = failed;
    readTimer = setTimeout(failed, READ_TIMEOUT_MS);
    document.head.appendChild(script);
  }

  const startReading = () => {
    if (firstReadStarted) return;
    firstReadStarted = true;
    clearTimeout(writeWaitTimer);
    status.textContent = 'アクセス数を読み込み中…';
    readTotal();
  };
  // 加算の応答が遅くても、合計の読み取りまで止めないようにします。
  const writeWaitTimer = setTimeout(startReading, WRITE_WAIT_MS);
  // 加算はこのページで1回だけ。応答が失われても届いている場合があるため、
  // 自動・手動の再試行は読み取りだけにして、二重加算を防ぎます。
  Promise.resolve().then(() => fetch(endpoint, {
    method: 'POST',
    mode: 'no-cors',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    body: new URLSearchParams({ action: 'visit' })
  })).then(startReading, startReading);
})();
