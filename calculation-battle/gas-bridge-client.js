/* HKB: transport only. Gameplay and durable result queues live elsewhere. */
(() => {
  'use strict';
  const protocol = 'hkb-bridge-v1';
  const allowed = new Set(['ping', 'getAppBootstrap', 'getMonthlyGhost', 'submitOfficialResult']);
  const parentOrigin = 'https://ks-factory1979.github.io';
  class GasBridgeClient {
    constructor(url, options = {}) {
      this.url = url;
      this.timeoutMs = options.timeoutMs || 25000;
      this.connectTimeoutMs = options.connectTimeoutMs || 20000;
      this.pending = new Map();
      this.sequence = 0;
      this.listener = event => this.receive(event);
      window.addEventListener('message', this.listener);
    }
    isBridgeOrigin(origin) {
      return /^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin);
    }
    isBridgeWindow(source) {
      try {
        let current = source;
        for (let depth = 0; current && depth < 6; depth++) {
          if (current === this.frame.contentWindow) return true;
          const parent = current.parent;
          if (parent === current) break;
          current = parent;
        }
      } catch (_) { return false; }
      return false;
    }
    connect() {
      if (this.connecting) return this.connecting;
      this.connecting = new Promise((resolve, reject) => {
        if (window.location.origin !== parentOrigin || window.top !== window) {
          reject(new Error('BRIDGE_ORIGIN_NOT_ALLOWED')); return;
        }
        let url;
        try { url = new URL(this.url); } catch (_) { reject(new Error('BRIDGE_NOT_CONFIGURED')); return; }
        if (url.origin !== 'https://script.google.com' || !/\/exec$/.test(url.pathname)) {
          reject(new Error('BRIDGE_INVALID_URL')); return;
        }
        this.channel = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join('');
        this.resolveConnection = resolve;
        this.rejectConnection = reject;
        this.frame = document.createElement('iframe');
        this.frame.hidden = true;
        this.frame.title = '共有記録への接続';
        this.frame.setAttribute('aria-hidden', 'true');
        this.frame.tabIndex = -1;
        url.searchParams.set('mode', 'bridge');
        url.searchParams.set('channel', this.channel);
        this.frame.src = url.href;
        this.connectTimer = setTimeout(() => {
          reject(new Error('[HKB_RETRY:BRIDGE_CONNECT_TIMEOUT]'));
          this.reset();
        }, this.connectTimeoutMs);
        document.body.appendChild(this.frame);
      });
      // A synchronous validation failure must also permit a later retry.
      this.connecting.catch(() => { if (!this.frame) this.connecting = null; });
      return this.connecting;
    }
    receive(event) {
      const data = event.data;
      if (!this.frame || !this.isBridgeOrigin(event.origin) || !data || data.protocol !== protocol || data.channel !== this.channel) return;
      if (data.type === 'ready' && !this.bridgeWindow) {
        if (!this.isBridgeWindow(event.source)) return;
        this.bridgeWindow = event.source;
        this.bridgeOrigin = event.origin;
        clearTimeout(this.connectTimer);
        this.resolveConnection();
        return;
      }
      if (event.source !== this.bridgeWindow || event.origin !== this.bridgeOrigin || data.type !== 'response') return;
      const task = this.pending.get(data.requestId);
      if (!task) return;
      clearTimeout(task.timer);
      this.pending.delete(data.requestId);
      if (data.ok === true) task.resolve(data.result);
      else task.reject(new Error(typeof data.error === 'string' ? data.error : 'BRIDGE_ERROR'));
    }
    async call(method, payload = {}) {
      if (!allowed.has(method)) throw new Error('BRIDGE_METHOD_NOT_ALLOWED');
      await this.connect();
      return new Promise((resolve, reject) => {
        const requestId = `${this.channel}:${++this.sequence}`;
        const timer = setTimeout(() => {
          this.pending.delete(requestId);
          reject(new Error('[HKB_RETRY:BRIDGE_REQUEST_TIMEOUT]'));
          // Never automatically replay a write; the durable queue owns retry identity.
          if (this.pending.size === 0) this.reset();
        }, this.timeoutMs);
        this.pending.set(requestId, {resolve, reject, timer});
        try {
          this.bridgeWindow.postMessage({protocol, channel:this.channel, type:'request', requestId, method, payload}, this.bridgeOrigin);
        } catch (error) {
          clearTimeout(timer); this.pending.delete(requestId); reject(error);
        }
      });
    }
    reset() {
      clearTimeout(this.connectTimer);
      if (this.frame) this.frame.remove();
      this.frame = null;
      this.bridgeWindow = null;
      this.bridgeOrigin = null;
      this.connecting = null;
    }
    destroy() {
      if (this.rejectConnection) this.rejectConnection(new Error('BRIDGE_CLOSED'));
      for (const task of this.pending.values()) { clearTimeout(task.timer); task.reject(new Error('BRIDGE_CLOSED')); }
      this.pending.clear();
      this.reset();
      window.removeEventListener('message', this.listener);
    }
  }
  window.HkbGasBridgeClient = GasBridgeClient;
})();
