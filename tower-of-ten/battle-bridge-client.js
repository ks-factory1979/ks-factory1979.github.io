// Battle transport only. Existing battleApiOnce owns retries, sequence and session guards.
(() => {
  'use strict';
  const protocol = 'ten-tower-battle-bridge-v1';
  const methods = new Set(['createBattleRoom', 'joinBattleRoom', 'selectBattleCharacter', 'setBattleReady', 'startBattleMatch', 'syncBattle', 'requestBattleRematch', 'leaveBattleRoom', 'reportBattleClientDiagnostics']);
  const publicOrigin = 'https://ks-factory1979.github.io';
  const localOrigin = origin => /^http:\/\/(?:127\.0\.0\.1|localhost):[1-9]\d{0,4}$/.test(origin);
  const error = code => Object.assign(new Error(code), {code});
  class BattleGasBridgeClient {
    constructor(url, options = {}) {
      this.url = url;
      this.timeoutMs = options.timeoutMs ?? 15000;
      this.connectTimeoutMs = options.connectTimeoutMs ?? 8000;
      this.pending = new Map(); this.sequence = 0;
      this.listener = event => this.receive(event);
      window.addEventListener('message', this.listener);
    }
    isBridgeOrigin(origin) {
      return /^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin);
    }
    isBridgeWindow(source) {
      try {
        for (let depth = 0, current = source; current && depth < 6; depth++) {
          if (current === this.frame.contentWindow) return true;
          const parent = current.parent; if (parent === current) break; current = parent;
        }
      } catch (_) {}
      return false;
    }
    connect() {
      if (this.closed) return Promise.reject(error('BRIDGE_CLOSED'));
      if (this.connecting) return this.connecting;
      this.connecting = new Promise((resolve, reject) => {
        const origin = location.origin;
        if ((origin !== publicOrigin && !localOrigin(origin)) || window.top !== window || new URLSearchParams(location.search).get('layout') === 'edit') {
          reject(error('BRIDGE_ORIGIN_NOT_ALLOWED')); return;
        }
        let url;
        try { url = new URL(this.url); } catch (_) { reject(error('BRIDGE_NOT_CONFIGURED')); return; }
        if (url.origin !== 'https://script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) || url.username || url.password || url.hash) {
          reject(error('BRIDGE_INVALID_URL')); return;
        }
        this.channel = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
        this.resolveConnection = resolve; this.rejectConnection = reject;
        this.frame = document.createElement('iframe'); this.frame.hidden = true;
        this.frame.title = 'みんなの対戦への接続'; this.frame.tabIndex = -1;
        this.frame.setAttribute('aria-hidden', 'true');
        url.searchParams.set('mode', 'battle-bridge'); url.searchParams.set('channel', this.channel);
        url.searchParams.set('parentOrigin', origin); this.frame.src = url.href;
        this.connectTimer = setTimeout(() => this.reset(error('BRIDGE_CONNECT_TIMEOUT')), this.connectTimeoutMs);
        document.body.appendChild(this.frame);
      });
      const connection = this.connecting;
      connection.catch(() => { if (this.connecting === connection && !this.frame) this.connecting = null; });
      return connection;
    }
    receive(event) {
      const data = event.data;
      if (!this.frame || !this.isBridgeOrigin(event.origin) || !data || data.protocol !== protocol || data.channel !== this.channel) return;
      if (data.type === 'ready' && !this.bridgeWindow) {
        if (!this.isBridgeWindow(event.source)) return;
        this.bridgeWindow = event.source; this.bridgeOrigin = event.origin;
        clearTimeout(this.connectTimer); this.resolveConnection(); return;
      }
      if (event.source !== this.bridgeWindow || event.origin !== this.bridgeOrigin || data.type !== 'response') return;
      const task = this.pending.get(data.requestId); if (!task) return;
      clearTimeout(task.timer); this.pending.delete(data.requestId);
      if (data.ok === true) task.resolve(data.result);
      else task.reject(error(typeof data.error === 'string' ? data.error : 'BRIDGE_ERROR'));
    }
    async call(method, args, options = {}) {
      if (!methods.has(method)) throw error('BRIDGE_METHOD_NOT_ALLOWED');
      const deadline = Date.now() + Math.max(1000, Math.min(15000, Number(options.timeoutMs) || this.timeoutMs));
      await this.connect();
      const remaining = deadline - Date.now(); if (remaining <= 0) throw error('BRIDGE_REQUEST_TIMEOUT');
      return new Promise((resolve, reject) => {
        const requestId = `${this.channel}:${++this.sequence}`;
        const timer = setTimeout(() => {
          this.pending.delete(requestId); reject(error('BRIDGE_REQUEST_TIMEOUT'));
          // Do not replay requests. Existing battle retry logic retains requestId and clientSequence.
          if (this.pending.size === 0) this.reset();
        }, remaining);
        this.pending.set(requestId, {resolve, reject, timer});
        try { this.bridgeWindow.postMessage({protocol, channel:this.channel, type:'request', requestId, method, args}, this.bridgeOrigin); }
        catch (_) { clearTimeout(timer); this.pending.delete(requestId); reject(error('BRIDGE_SEND_FAILED')); }
      });
    }
    reset(reason) {
      clearTimeout(this.connectTimer);
      if (reason && this.rejectConnection) this.rejectConnection(reason);
      for (const task of this.pending.values()) { clearTimeout(task.timer); task.reject(reason || error('BRIDGE_CLOSED')); }
      this.pending.clear(); this.frame?.remove(); this.frame = null;
      this.bridgeWindow = null; this.bridgeOrigin = null; this.connecting = null;
      this.resolveConnection = null; this.rejectConnection = null;
    }
    destroy() { this.closed = true; this.reset(error('BRIDGE_CLOSED')); window.removeEventListener('message', this.listener); }
  }
  let client;
  window.TowerBattleGasBridgeClient = BattleGasBridgeClient;
  window.TowerBattleTransport = Object.freeze({
    isConfigured() {
      return !!window.TowerOfTenConfig?.battleGasWebAppUrl && window.top === window && new URLSearchParams(location.search).get('layout') !== 'edit';
    },
    call(method, args, options = {}) {
      if (!this.isConfigured()) return Promise.reject(error('BRIDGE_NOT_CONFIGURED'));
      client ??= new BattleGasBridgeClient(TowerOfTenConfig.battleGasWebAppUrl);
      return client.call(method, args, options).catch(cause => {
        const codes = {BRIDGE_CONNECT_TIMEOUT:'CLIENT_TIMEOUT',BRIDGE_REQUEST_TIMEOUT:'CLIENT_TIMEOUT',
          BRIDGE_SEND_FAILED:'GOOGLE_SERVER_ERROR',BRIDGE_SERVER_ERROR:'GOOGLE_SERVER_ERROR',BRIDGE_BUSY:'LOCK_BUSY',
          BRIDGE_CLOSED:'CLIENT_CANCELLED'};
        throw Object.assign(new Error('つうしんできなかったよ'), {code:codes[cause.code] || 'SCRIPT_RUN_FAILURE'});
      });
    },
    destroy() { client?.destroy(); client = null; }
  });
  window.addEventListener('pagehide', () => TowerBattleTransport.destroy());
})();
