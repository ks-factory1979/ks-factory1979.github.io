(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};

  // ZONEの出現時刻と軌道だけ。何を斬るかはゲーム側で決める。
  class ZoneSpawnSystem {
    constructor(options) {
      this.options = options;
      this.queue = [];
      this.elapsedMs = 0;
      this.wave = 0;
      this.cancelled = true;
      this.finisherHandled = false;
      this.directionDeck = [];
      this.directionKey = "";
    }
    start() {
      this.cancel();
      this.cancelled = false;
      const o = this.options;
      this.finisherHandled = false;
      const bounds = [[3, 4], [4, 5], [5, 6], [6, 7]];
      for (let index = 0; index < 4; index += 1) {
        const start = index * o.durationMs / 4;
        const end = (index + 1) * o.durationMs / 4;
        const count = bounds[index][0] + (Math.random() < .5 ? 0 : 1);
        const issen = index === 3 && Math.random() < o.issenChance;
        const interval = Math.max(95, Math.min(440 * o.intervalScale,
          (end - start - 575) / Math.max(1, count - 1)));
        for (let i = 0; i < count; i += 1) {
          const atMs = start + (this._tuning().threeWay ? 275 : 75) + i * (issen ? interval * .25 : interval);
          if (atMs >= Math.min(end + 180, o.durationMs - 500)) break;
          const lane = issen ? [.24, .50, .76, .35, .65, .17, .83][i] :
            [.20, .50, .80, .34, .66, .14, .86][(i + index) % 7];
          const vx = lane < .4 ? 160 : lane > .6 ? -160 : 0;
          this.queue.push({
            atMs, latestMs: Math.min(end + 400, o.durationMs - 501), wave: index + 1,
            pattern: issen ? "zone_issen" : "zone_arc",
            launch: this._bottomLaunch({ laneRatio: lane, vx: vx * o.velocityScale,
              vy: (issen ? -885 : -790 - (i % 3) * 55) * o.velocityScale })
          });
        }
      }
      this.queue.sort((a, b) => a.atMs - b.atMs);
    }
    update(deltaMs, remainingMs) {
      if (this.cancelled) return;
      this.elapsedMs += Math.min(80, Math.max(0, Number(deltaMs) || 0));
      const o = this.options;
      const nextWave = Math.min(4, Math.floor(this.elapsedMs / (o.durationMs / 4)) + 1);
      if (nextWave !== this.wave) { this.wave = nextWave; o.onWaveChange(nextWave); }
      // HitStop中もZONE時計は進むため、締めだけは時計の残り時間を優先する。
      const finisherClock = Number.isFinite(remainingMs) ? o.durationMs - remainingMs : this.elapsedMs;
      if (!this.finisherHandled && finisherClock >= o.durationMs - (o.finisherLeadMs || 1250)) {
        // 通常Waveとは別の一度だけの締め。札の種類は呼び出し側が決める。
        this.finisherHandled = true;
        if (o.onFinisher) o.onFinisher({
          atMs: this.elapsedMs, wave: 4, pattern: "zone_finisher", finisher: true,
          launch: this._bottomLaunch({ laneRatio: .39, y: 630, vx: 35, vy: -400 * o.velocityScale }),
          companionLaunch: this._bottomLaunch({ laneRatio: .61, y: 660, vx: -35, vy: -465 * o.velocityScale })
        });
      }
      if (this.elapsedMs >= o.durationMs - 500) { this.queue.length = 0; return; }
      let burst = 0;
      while (this.queue.length && this.queue[0].atMs <= this.elapsedMs && burst < 3) {
        const entry = this.queue[0];
        if (this.elapsedMs > entry.latestMs) { this.queue.shift(); continue; }
        if (o.getActiveCount() >= this._tuning().maxActive) break;
        // Select at dispatch time so a live setting change also affects queued cards.
        const launchEntry = this._directionalEntry(entry);
        if (o.onSpawn(launchEntry) === false) break;
        this.queue.shift();
        burst += 1;
      }
    }
    _bottomLaunch(launch) {
      const height = this.options.height || 768;
      const gravity = this.options.gravity || 820;
      const startY = Number.isFinite(launch.y) ? launch.y : height + 82;
      // Bottom cards pop into the middle of the playfield, below the prompt.
      // Keep slower saved presets cuttable too; the closing pair uses the same arc guard.
      const lowerApex = Math.min(startY - 1, height * .56);
      const upperApex = Math.min(lowerApex, height * .47);
      const minRiseSpeed = Math.sqrt(2 * gravity * (startY - lowerApex));
      const maxRiseSpeed = Math.sqrt(2 * gravity * (startY - upperApex));
      const boostedSpeed = Math.abs(launch.vy) * 1.2;
      return Object.assign({}, launch, {
        vy: -Math.max(minRiseSpeed, Math.min(maxRiseSpeed, boostedSpeed))
      });
    }

    _tuning() {
      const live = this.options.getTuning ? this.options.getTuning() : {};
      return Object.assign({ threeWay: false, bottom: 50, left: 25, right: 25,
        sideSpeed: 1, angle: 54, height: .90, maxActive: this.options.maxActive }, live);
    }
    _directionalEntry(entry) {
      const t = this._tuning();
      if (!t.threeWay) return Object.assign({}, entry, { direction: "bottom" });
      const key = [t.bottom, t.left, t.right].join(":");
      if (key !== this.directionKey) { this.directionKey = key; this.directionDeck.length = 0; }
      if (!this.directionDeck.length) {
        // A shuffled 12-card deck uses largest remainders; 50:25:25 is exactly 6:3:3.
        const weights = [t.bottom, t.left, t.right];
        const sum = weights.reduce((a, b) => a + b, 0) || 100;
        const quotas = weights.map(w => w / sum * 12);
        const counts = quotas.map(Math.floor);
        const order = [0, 1, 2].sort((a, b) => (quotas[b] - counts[b]) - (quotas[a] - counts[a]));
        const missing = 12 - counts.reduce((a, b) => a + b, 0);
        for (let n = 0; n < missing; n++) counts[order[n]]++;
        counts.forEach((count, i) => { for (let n = 0; n < count; n++) this.directionDeck.push(["bottom", "left", "right"][i]); });
        for (let i = this.directionDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [this.directionDeck[i], this.directionDeck[j]] = [this.directionDeck[j], this.directionDeck[i]];
        }
      }
      const direction = this.directionDeck.pop();
      if (direction === "bottom") return Object.assign({}, entry, { direction });
      const o = this.options, width = o.width || 1366, height = o.height || 768;
      const gravity = o.gravity || 820;
      const y = height * t.height + (Math.random() - .5) * 68;
      const vx = 510 * t.sideSpeed * (.91 + Math.random() * .18);
      const angle = (t.angle + (Math.random() - .5) * 8) * Math.PI / 180;
      // Keep the apex below the prompt/HUD, even at the largest tuning values.
      const vy = -Math.min(vx * Math.tan(angle), Math.sqrt(2 * gravity * Math.max(1, y - 280)));
      return Object.assign({}, entry, { direction, launch: {
        x: direction === "left" ? -110 : width + 110, y,
        vx: direction === "left" ? vx : -vx, vy,
        angularVelocity: (Math.random() - .5) * .85
      } });
    }
    cancel() { this.queue.length = 0; this.directionDeck.length = 0; this.directionKey = ""; this.elapsedMs = 0; this.wave = 0; this.cancelled = true; this.finisherHandled = false; }
    destroy() { this.cancel(); this.options = null; }
  }
  window.NinjaCore.ZoneSpawnSystem = ZoneSpawnSystem;
})();
