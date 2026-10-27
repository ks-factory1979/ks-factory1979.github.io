(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};

  const TAU = Math.PI * 2;
  const TYPES = ["normal", "critical", "issen", "zone_normal", "zone_issen"];
  const ELEMENTS = ["none", "fire", "lightning", "ice", "wind"];
  const random = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const partition = (n, a, b) => { const x = Math.round(n * a), y = Math.round(n * b); return [x, y, n - x - y]; };

  // 確定したHitの見た目だけを担当。粒子と炎の描画面を再利用、Graphicsは3枚固定。
  // Phaser 4.2.1同梱版のGraphics APIを使用。入力・Clock・ProgressManagerには触れない。
  class DynamicSlashVFXSystem {
    constructor(scene, options) {
      this.scene = scene;
      this.options = Object.assign({ quality: "standard", strength: "standard", element: "none",
        speed: 1, life: 1, gravity: 1, spread: 1, waveDelay: 1 }, options || {});
      this.reducedMotion = Boolean(this.options.reducedMotion);
      this.bounds = { top: 245, bottom: 690 };
      this.limits = { heavy: NINJA_CONFIG.MAX_SPLASH_DROPLETS,
        fine: NINJA_CONFIG.MAX_COLOR_MIST_PARTICLES, element: 24 };
      this.active = { heavy: [], fine: [], element: [] };
      this.free = {};
      for (const kind of Object.keys(this.limits)) {
        this.free[kind] = Array.from({ length: this.limits[kind] }, () => ({
          trailX: new Float32Array(5), trailY: new Float32Array(5),
          boltX: new Float32Array(7), boltY: new Float32Array(7)
        }));
      }
      this.body = scene.add.graphics().setDepth(176);
      this.light = scene.add.graphics().setDepth(177);
      this.flow = scene.add.graphics().setDepth(173);
      this.light.setBlendMode("ADD");
      this.graphics = [this.body, this.light, this.flow];
      this.opacity = clamp(Number.isFinite(this.options.effectOpacity) ? this.options.effectOpacity : 1, .2, 1);
      this.heroLimit = clamp(Math.floor(Number(this.options.heroLimit) || 3), 1, 3);
      this.visibleHeroes = 0; this.suppressedHeroes = 0;
      if (this.opacity !== 1) for (const graphic of this.graphics) graphic.setAlpha(this.opacity);
      this.jobs = [];
      this.clock = 0;
      this.peak = 0;
      this.emitted = { heavy: 0, fine: 0, element: 0 };
      this.evicted = 0;
      this.droppedJobs = 0;
      this.slowFrames = 0;
      this.load = 16.7;
      this.pressure = false;
      this.lastHit = null;
      this.waves = [];
      this.fire = null; this.fireUnavailable = false; this.fireError = null;
      this.lightning = null; this.lightningUnavailable = false; this.lightningError = null;
      this.ice = null; this.iceUnavailable = false; this.iceError = null;
      this.wind = null; this.windUnavailable = false; this.windError = null;
    }

    _take(group) {
      const list = this.active[group];
      let p = this.free[group].pop();
      if (!p) { p = list.shift(); this.evicted++; }
      // Every field used by any shape is reset, including delayed activation and trails.
      Object.assign(p, { group, shape: "dot", age: 0, delay: 0, life: 350,
        x: 0, y: 0, vx: 0, vy: 0, gravity: 0, drag: 0, radius: 2,
        rotation: 0, spin: 0, alpha: .7, color: 0xffffff, tail: 0,
        curve: 0, phase: random(0, TAU), flash: false, branch: false, trailCount: 0, detail: "", reduced: false,
        hero: false, cutAngle: 0, size: 1 });
      list.push(p);
      this.emitted[group]++;
      this.peak = Math.max(this.peak, this.count());
      return p;
    }

    _queue(delay, action) {
      if (delay <= 0) { action(); return; }
      // A burst has at most three waves. Old decoration yields before game input does.
      if (this.jobs.length >= 24) { this.jobs.shift(); this.droppedJobs++; }
      this.jobs.push({ due: this.clock + delay, action });
    }

    playHit(event) {
      if (!this.scene || !event || !Number.isFinite(event.x) || !Number.isFinite(event.y)) return false;
      const type = TYPES.includes(event.hitType) ? event.hitType : event.zoneActive ? "zone_normal" : "normal";
      const zone = type === "zone_issen";
      const layer = event.layer || NINJA_CONFIG.SPLASH_LAYERS[type];
      const reduced = this.reducedMotion || Boolean(event.reducedMotion);
      const ordinal = Math.max(1, Number(event.ordinal || event.comboCount) || 1);
      const steps = NINJA_CONFIG.ZONE_ISSEN_MULTI_SCALES;
      const multi = zone ? (event.finisher ? Math.max(.9, steps[Math.min(ordinal - 1, 3)]) :
        steps[Math.min(ordinal - 1, 3)]) : ordinal > 1 ?
          (event.finisher ? .8 : NINJA_CONFIG.MULTI_HIT_SPLASH_SCALE) : 1;
      const strength = { weak: .72, standard: 1, strong: 1.15 }[this.options.strength] || 1;
      const quality = this.options.quality === "low" ? .55 : 1;
      const extra = zone && event.finisher ? NINJA_CONFIG.ZONE_ISSEN_FINISHER_EXTRA : { heavy: 0, mist: 0 };
      const heavy = event.elementOnly ? 0 : reduced ? 2 : Math.round((layer.heavyCount + extra.heavy) * multi * strength * quality);
      const fine = event.elementOnly ? 0 : reduced ? 4 : Math.round((layer.mistCount + extra.mist) * multi * strength * quality * (this.pressure ? .7 : 1));
      const element = ELEMENTS.includes(event.element) ? event.element :
        ELEMENTS.includes(this.options.element) ? this.options.element : "none";
      const e = { x: event.x, y: event.y, angle: Number(event.swipeAngle) || 0,
        color: Number.isFinite(event.cardColor) ? event.cardColor : 0x398aca,
        type, zone, layer, reduced, ordinal, finisher: Boolean(event.finisher), element,
        speed: clamp(Number(this.options.speed) || 1, .5, 1.5) *
          ({ weak: .9, standard: 1, strong: 1.12 }[this.options.strength] || 1),
        life: clamp(Number(this.options.life) || 1, .5, 1.5),
        gravity: clamp(Number(this.options.gravity) || 1, .25, 2),
        spread: clamp(Number(this.options.spread) || 1, .5, 1.5) };
      const heavyWaves = zone ? partition(heavy, .225, .575) : partition(heavy, .45, .4);
      const fineWaves = zone ? partition(fine, .08, .58) : partition(fine, .3, .4);
      const omniHeavy = reduced ? 0 : Math.round(heavy * layer.heavyOmni / layer.heavyCount);
      const omniFine = reduced ? 0 : Math.round(fine * layer.mistOmni / layer.mistCount);
      const delays = reduced ? [0, 0, 0] : (zone ? NINJA_CONFIG.ZONE_ISSEN_WAVE_DELAYS_MS : [0, 32, 74]);
      this.lastHit = { type, color: e.color, heavy, fine, omniHeavy, omniFine, ordinal,
        finisher: e.finisher, element, reducedMotion: reduced };
      let hi = 0, fi = 0;
      for (let wave = 0; wave < (event.elementOnly ? 0 : 3); wave++) {
        const hStart = hi, fStart = fi;
        hi += heavyWaves[wave]; fi += fineWaves[wave];
        this._queue(delays[wave] * clamp(Number(this.options.waveDelay) || 1, .5, 2), () => {
          this._emit(e, "heavy", heavyWaves[wave], hStart, heavy, omniHeavy, wave);
          this._emit(e, "fine", fineWaves[wave], fStart, fine, omniFine, wave);
          this.waves.push({ at: this.clock, type, ordinal, wave, heavy: heavyWaves[wave], fine: fineWaves[wave] });
          if (this.waves.length > 24) this.waves.shift();
        });
      }
      if (element !== "none") {
        this._element(e, false);
        if (!reduced) this._signature(e);
        if (!reduced) this._queue(element === "lightning" ? 48 : 68, () => this._element(e, true));
      }
      return true;
    }

    _emit(e, group, amount, start, total, omniTotal, wave) {
      const heavy = group === "heavy", layer = e.layer;
      const speedRange = heavy ? layer.heavySpeed : layer.mistSpeed;
      for (let i = 0; i < amount; i++) {
        const index = start + i;
        // Distribute the omni particles across all waves and all four quadrants.
        const omniBefore = Math.floor(index * omniTotal / Math.max(1, total));
        const omni = Math.floor((index + 1) * omniTotal / Math.max(1, total)) > omniBefore;
        const fan = (heavy ? layer.heavyFanDeg : layer.mistFanDeg) * Math.PI / 180 * e.spread;
        const angle = omni ? e.angle + (omniBefore + random(.32, .68)) / Math.max(1, omniTotal) * TAU :
          e.angle + random(-fan, fan) * (e.type === "critical" ? .7 : 1);
        const p = this._take(group);
        const tier = (index * 7 + 19) % 20;
        const large = tier >= 15;
        const speed = (e.reduced ? heavy ? 120 : 75 : random(speedRange[0], speedRange[1])) * e.speed *
          (e.type === "critical" ? 1.14 : 1) * (large ? 1.06 : 1);
        p.x = e.x + Math.cos(angle) * random(3, 13);
        p.y = e.y + Math.sin(angle) * random(3, 13);
        p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
        p.gravity = (e.reduced ? heavy ? 160 : 30 : heavy ? layer.heavyGravity : layer.mistGravity) * e.gravity;
        p.drag = e.reduced ? 4 : heavy ? random(.35, 1.0) : random(1.1, 2.4);
        p.rotation = angle + random(-.22, .22);
        p.spin = e.reduced ? 0 : random(-2.4, 2.4) * (large ? .75 : 1);
        p.radius = heavy ? (tier < 7 ? random(3.5, 5.8) : tier < 15 ? random(6, 9.5) :
          tier < 19 ? random(11, 16) : random(18, 23)) * (e.zone ? 1.16 : 1) : random(.8, 2.4);
        p.life = (e.reduced ? heavy ? 145 : 135 : (heavy ? layer.heavyLifeMs : layer.mistLifeMs) *
          random(.88, 1.13) * (!heavy && wave === 2 ? 1.35 : 1)) * e.life;
        p.alpha = e.reduced ? .4 : heavy ? random(.76, .91) : random(.32, .58);
        p.color = e.color;
        p.shape = heavy ? "drop" : "dot";
        p.tail = e.reduced ? 0 : heavy ? random(12, e.zone ? 75 : 38) : random(4, 17);
        if (e.type === "critical") { p.radius *= .7; p.tail *= 1.35; }
        p.omni = omni; p.wave = wave; p.tier = tier;
      }
    }

    _element(e, second) {
      const count = e.reduced ? 2 : Math.max(2, Math.round((e.element === "lightning" ? 3 :
        e.element === "wind" ? 5 : 9) * (second ? .55 : 1) *
        (this.options.quality === "low" || this.pressure ? .55 : 1)));
      for (let i = 0; i < count; i++) {
        const p = this._take("element");
        const a = e.angle + random(-.9, .9);
        const along = e.reduced ? random(-8, 8) : random(-80, 80);
        p.x = e.x + Math.cos(e.angle) * along + random(-9, 9);
        p.y = e.y + Math.sin(e.angle) * along + random(-9, 9);
        p.vx = Math.cos(a) * random(100, 330) * e.speed;
        p.vy = Math.sin(a) * random(100, 330) * e.speed;
        p.rotation = a; p.radius = random(2, 5); p.alpha = e.reduced ? .35 : .7;
        p.life = (e.reduced ? 140 : random(340, 550)) * e.life;
        p.drag = 1.3; p.tail = e.reduced ? 0 : 35;
        p.shape = e.element;
        p.reduced = e.reduced;
        if (e.element === "fire") {
          p.detail = !e.reduced && i % 2 === 0 ? "flame" : "ember";
          p.color = i % 3 ? 0xffa632 : 0xff5530;
          p.gravity = -random(450, 670); p.curve = random(45, 90); p.vy -= e.reduced ? 85 : 145;
          if (!e.reduced) { p.vx *= .3; p.vy = -random(110, 230) * e.speed; }
          p.radius = p.detail === "flame" ? random(8, 14) : random(2.2, 4.5);
          p.tail = e.reduced ? 0 : p.detail === "flame" ? random(75, 130) : random(18, 38);
          p.alpha = e.reduced ? .3 : p.detail === "flame" ? .76 : .9;
          if (!e.reduced) p.life = random(480, 640) * e.life;
        } else if (e.element === "lightning") {
          p.color = 0xd8bdff; p.life = e.reduced ? 70 : random(80, 145);
          p.flash = false; p.branch = !e.reduced && i % 2 === 0;
          p.vx *= .12; p.vy *= .12;
          const length = e.reduced ? 36 : random(100, 175);
          for (let j = 0; j < 7; j++) {
            const t = j / 6, offset = j === 0 || j === 6 ? 0 : random(-17, 17);
            p.boltX[j] = Math.cos(a) * t * length - Math.sin(a) * offset;
            p.boltY[j] = Math.sin(a) * t * length + Math.cos(a) * offset;
          }
        } else if (e.element === "ice") {
          p.detail = !e.reduced && i % 4 === 0 ? "cold-mist" : i % 2 ? "diamond" : "crystal";
          p.color = i % 2 ? 0xa5eaff : 0xe1faff;
          p.radius = e.reduced ? random(3, 5) : p.detail === "cold-mist" ? random(18, 28) : random(8, 16);
          p.spin = e.reduced || p.detail === "cold-mist" ? 0 : random(-7, 7);
          p.gravity = p.detail === "cold-mist" ? -35 : 540;
          p.drag = p.detail === "cold-mist" ? 2.3 : .6; p.tail = e.reduced ? 0 : 8;
          if (p.detail === "cold-mist") { p.alpha = .13; p.vx *= .3; p.vy *= .3; p.tail = 0; }
        } else if (e.element === "wind") {
          p.color = 0xa0ffda; p.radius = random(1, 2.2); p.curve = e.reduced ? 0 : random(140, 230);
          p.tail = e.reduced ? 9 : random(160, 220); p.drag = .8;
          p.life = e.reduced ? 160 : random(420, 620);
        }
      }
    }

    setBounds(top, bottom) {
      const first = clamp(Number(top) || 245, 245, 650);
      this.bounds = { top: first, bottom: clamp(Number(bottom) || 690, first + 40, 690) };
    }

    _signature(e) {
      // The large attribute shape shares the 24-slot pool and yields to later hits.
      const p = this._take("element");
      p.hero = true; p.shape = e.element; p.x = e.x; p.y = e.y; p.cutAngle = e.angle;
      p.life = ({ fire: 720, lightning: 320, ice: 610, wind: 630 }[e.element] || 500) * e.life;
      p.size = e.type === "critical" ? 1.08 : e.type.includes("issen") ? 1.15 : e.zone ? 1.12 : 1;
      if (e.element === "ice" || e.element === "wind") p.size *= Math.min(1,
        (this.bounds.bottom - this.bounds.top) / (e.element === "ice" ? 400 : 300));
      p.alpha = 1; p.tail = 180; p.curve = .01; p.gravity = e.element === "fire" ? -.01 : 0;
      if (e.element === "lightning") for (let j = 0; j < 7; j++) {
        const along = (j / 6 - .5) * 380 * p.size;
        const across = j === 0 || j === 6 ? 0 : random(-32, 32) * p.size;
        p.boltX[j] = Math.cos(e.angle) * along - Math.sin(e.angle) * across;
        p.boltY[j] = Math.sin(e.angle) * along + Math.cos(e.angle) * across;
      }
    }

    _flame(g, x, y, width, height, lean, phase, color, alpha) {
      // Rising, tapering tongues. Clip each horizontal strip before drawing its fill.
      const start = clamp((y - this.bounds.bottom) / height, 0, 1);
      const end = clamp((y - this.bounds.top) / height, 0, 1);
      const steps = this.pressure || this.options.quality === "low" ? 6 : 10;
      const slice = t => ({ x: x + lean * t * t + Math.sin(phase + t * 9) * width * .38 * t,
        y: clamp(y - height * t, this.bounds.top, this.bounds.bottom),
        width: width * Math.pow(Math.max(0, Math.sin(Math.pow(t, .45) * Math.PI)), .8) });
      g.fillStyle(color, alpha);
      for (let i = 0; i < steps; i++) {
        const lo = Math.max(start, i / steps), hi = Math.min(end, (i + 1) / steps);
        if (lo >= hi) continue;
        const from = slice(lo), to = slice(hi);
        g.fillTriangle(from.x - from.width, from.y, from.x + from.width, from.y, to.x - to.width, to.y);
        g.fillTriangle(from.x + from.width, from.y, to.x + to.width, to.y, to.x - to.width, to.y);
      }
    }

    _prepareFire() {
      if (this.fire) return true;
      const Fire = window.NinjaCore.ProceduralFireVFX;
      if (this.fireUnavailable || !Fire || !Fire.supported(this.scene)) return false;
      try { this.fire = new Fire(this.scene, this.options.quality, this.opacity); }
      catch (error) {
        this.fireUnavailable = true; this.fireError = String(error.message || error);
      }
      return Boolean(this.fire);
    }

    _prepareLightning() {
      if (this.lightning) return true;
      const Lightning = window.NinjaCore.ProceduralLightningVFX;
      if (this.lightningUnavailable || !Lightning || !Lightning.supported(this.scene)) return false;
      try { this.lightning = new Lightning(this.scene, this.options.quality, this.opacity); }
      catch (error) {
        this.lightningUnavailable = true; this.lightningError = String(error.message || error);
      }
      return Boolean(this.lightning);
    }

    _prepareIce() {
      if (this.ice) return true;
      const Ice = window.NinjaCore.ProceduralIceVFX;
      if (this.iceUnavailable || !Ice || !Ice.supported(this.scene)) return false;
      try { this.ice = new Ice(this.scene, this.options.quality, this.opacity); }
      catch (error) {
        this.iceUnavailable = true; this.iceError = String(error.message || error);
      }
      return Boolean(this.ice);
    }

    _prepareWind() {
      if (this.wind) return true;
      const Wind = window.NinjaCore.ProceduralWindVFX;
      if (this.windUnavailable || !Wind || !Wind.supported(this.scene)) return false;
      try { this.wind = new Wind(this.scene, this.options.quality, this.opacity); }
      catch (error) {
        this.windUnavailable = true; this.windError = String(error.message || error);
      }
      return Boolean(this.wind);
    }

    _fireSignature(p, progress) {
      const alpha = Math.pow(1 - progress, .72), size = p.size;
      const heightScale = Math.min(1, (this.bounds.bottom - this.bounds.top) / 300);
      const growth = .72 + .28 * Math.sin(Math.min(1, progress / .18) * Math.PI / 2);
      const count = this.pressure || this.options.quality === "low" ? 7 : 11;
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1), along = (t - .5) * 280 * size;
        const phase = p.phase + i * 2.37 + progress * 18;
        const taper = Math.sin(t * Math.PI);
        const x = p.x + Math.cos(p.cutAngle) * along + Math.sin(p.phase + i * 2.3) * 9 * size;
        const y = p.y + Math.sin(p.cutAngle) * along +
          (34 - progress * 20 + Math.sin(p.phase + i * 2.4 + progress * 3) * 13) * size * heightScale;
        const width = (22 + 12 * taper) * size * growth;
        const height = (90 + 100 * taper) * size * heightScale * growth * (1 + .13 * Math.sin(phase));
        const lean = (Math.sin(phase * .7) * 34 + Math.cos(p.cutAngle) * 15) * size;
        if (this._prepareFire()) {
          this.fire.draw(x + lean * .2, y, width * 2.8, height * 1.2, phase, alpha * .86, this.bounds);
          continue;
        }
        this._flame(this.body, x, y, width, height, lean, phase, 0xda3009, alpha * .7);
        this._flame(this.body, x, y, width * .78, height * .82, lean * .7, phase + .6, 0xff7010, alpha * .92);
        this._flame(this.body, x, y, width * .48, height * .53, lean * .4, phase + 1.2, 0xffcd36, alpha * .95);
        this._flame(this.light, x, y, width * .23, height * .3, lean * .2, phase, 0xffefad, alpha * .65);
      }
    }

    _signatureDraw(p, progress) {
      const alpha = Math.pow(1 - progress, .7), size = p.size, a = p.cutAngle;
      const ux = Math.cos(a), uy = Math.sin(a), x = p.x, y = p.y;
      const at = (along, across) => ({ x: x + ux * along - uy * across, y: y + uy * along + ux * across });
      const stroke = (g, from, to, width, color, opacity) =>
        this._line(g, from.x, from.y, to.x, to.y, width, color, opacity * alpha, width / 2);
      const segments = this.pressure || this.options.quality === "low" ? 14 : 22;
      if (p.shape === "fire") {
        this._fireSignature(p, progress);
      } else if (p.shape === "lightning") {
        if (this._prepareLightning()) { this.lightning.draw(p, this.bounds, this.pressure); return; }
        for (let j = 1; j < 7; j++) {
          const from = { x: x + p.boltX[j - 1], y: y + p.boltY[j - 1] }, to = { x: x + p.boltX[j], y: y + p.boltY[j] };
          stroke(this.light, from, to, 24 * size, 0xb384ff, .19);
          stroke(this.body, from, to, 7 * size, 0xb28aff, .95);
          stroke(this.light, from, to, 2.4 * size, 0xffffff, .95);
          if (j > 1 && j < 6) {
            const side = j % 2 ? 1 : -1, start = to;
            const fork = { x: start.x + ux * 28 - uy * side * 60 * size, y: start.y + uy * 28 + ux * side * 60 * size };
            const tip = { x: fork.x - ux * 22 - uy * side * 48 * size, y: fork.y - uy * 22 + ux * side * 48 * size };
            for (const pair of [[start, fork], [fork, tip]]) {
              stroke(this.light, pair[0], pair[1], 10, 0xb384ff, .2);
              stroke(this.light, pair[0], pair[1], 2.6, 0xe9ddff, .8);
            }
          }
        }
      } else if (p.shape === "ice") {
        if (this._prepareIce()) this.ice.draw(p, this.bounds, this.pressure);
        const growth = clamp(progress / .18, 0, 1);
        const burst = Math.pow(clamp((progress - .18) / .62, 0, 1), .8);
        for (let j = 0; j < 8; j++) {
          const angle = a + j * TAU / 8 + p.phase * .15, vx = Math.cos(angle), vy = Math.sin(angle);
          const distance = (36 + 125 * burst) * size;
          const length = (j % 3 ? 23 : 36) * size * (.35 + .65 * growth) * (1 - progress * .25);
          const center = { x: x + vx * distance, y: y + vy * distance };
          const tip = { x: center.x + vx * length * 1.5, y: center.y + vy * length * 1.5 };
          const back = { x: center.x - vx * length, y: center.y - vy * length };
          const left = { x: center.x - vy * length * .42, y: center.y + vx * length * .42 };
          const right = { x: center.x + vy * length * .42, y: center.y - vx * length * .42 };
          if ([tip, back, left, right].every(q => q.y >= this.bounds.top && q.y <= this.bounds.bottom)) {
            this.body.fillStyle(0x4dc9ef, alpha * .68).fillTriangle(tip.x, tip.y, left.x, left.y, back.x, back.y);
            this.body.fillStyle(0xc9faff, alpha * .8).fillTriangle(tip.x, tip.y, right.x, right.y, back.x, back.y);
          }
          stroke(this.light, back, tip, 2, 0xeaffff, .95);
          stroke(this.light, { x: x + vx * 20, y: y + vy * 20 }, back, 4, 0x77e8ff, .25);
          const cross = { x: tip.x + vx * 9, y: tip.y + vy * 9 };
          stroke(this.light, { x: cross.x - 5, y: cross.y }, { x: cross.x + 5, y: cross.y }, 1.5, 0xffffff, .8);
          stroke(this.light, { x: cross.x, y: cross.y - 5 }, { x: cross.x, y: cross.y + 5 }, 1.5, 0xffffff, .8);
        }
      } else if (p.shape === "wind") {
        if (this._prepareWind()) { this.wind.draw(p, this.bounds, this.pressure); return; }
        for (let band = 0; band < 3; band++) {
          const rx = (108 + band * 36) * size * (1 + progress * .2), ry = (51 + band * 23) * size;
          const start = a + band * 1.8 + progress * 2.4;
          let previous = null;
          for (let j = 0; j <= segments; j++) {
            const t = j / segments, angle = start + t * Math.PI * 1.48;
            const point = at(Math.cos(angle) * rx, Math.sin(angle) * ry);
            if (previous) {
              const width = (1.5 + 9 * Math.sin(t * Math.PI)) * size;
              stroke(this.light, previous, point, width + 10, 0x74ffc7, .12);
              stroke(this.flow, previous, point, width, 0x77f6bd, .75);
              stroke(this.light, previous, point, Math.max(1, width * .22), 0xd7ffee, .8);
            }
            previous = point;
          }
        }
      }
    }

    playFlow(points, zone, color) {
      if (!this.scene || !points || points.length < 2) return;
      const count = this.reducedMotion ? 3 : this.options.quality === "low" ? 7 : zone ? 16 : 12;
      // Travel follows the actual polyline, including a curved swipe, once per swipe.
      const lengths = [0];
      for (let i = 1; i < points.length; i++) lengths[i] = lengths[i - 1] +
        Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      for (let i = 0; i < count; i++) {
        const d = lengths[lengths.length - 1] * i / count;
        let j = 1;
        while (j < points.length - 1 && lengths[j] < d) j++;
        const from = points[j - 1], to = points[j], t = (d - lengths[j - 1]) / Math.max(1, lengths[j] - lengths[j - 1]);
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const p = this._take("fine");
        p.x = from.x + (to.x - from.x) * t; p.y = from.y + (to.y - from.y) * t + random(-6, 6);
        const speed = random(300, zone ? 620 : 470);
        p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
        p.color = color; p.shape = "stream"; p.radius = random(1, 2);
        p.life = this.reducedMotion ? 130 : random(260, 440);
        p.delay = this.reducedMotion ? 0 : i % 2 ? 35 : 0;
        p.tail = this.reducedMotion ? 9 : random(35, 90); p.drag = 2; p.alpha = .58;
      }
    }

    count() { return this.active.heavy.length + this.active.fine.length + this.active.element.length; }

    update(delta) {
      if (!this.scene) return;
      const raw = Math.max(0, Number(delta) || 0), step = Math.min(50, raw), dt = step / 1000;
      this.load += (raw - this.load) * .025;
      this.slowFrames = this.load > 27 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 2);
      this.pressure = this.slowFrames > 45;
      this.clock += step;
      // Remove before invoking: callbacks may enqueue another job.
      for (let i = this.jobs.length - 1; i >= 0; i--) {
        if (this.jobs[i].due <= this.clock) { const job = this.jobs.splice(i, 1)[0]; job.action(); }
      }
      for (const group of Object.keys(this.active)) {
        const list = this.active[group];
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          if (p.delay > 0) { p.delay -= step; continue; }
          p.age += step;
          if (p.age >= p.life) { this.free[group].push(p); list.splice(i, 1); continue; }
          for (let j = 4; j > 0; j--) { p.trailX[j] = p.trailX[j - 1]; p.trailY[j] = p.trailY[j - 1]; }
          p.trailX[0] = p.x; p.trailY[0] = p.y;
          p.trailCount = Math.min(5, p.trailCount + 1);
          const drag = Math.exp(-p.drag * dt);
          p.vx *= drag; p.vy = p.vy * drag + p.gravity * dt;
          const sway = p.curve * Math.sin(p.phase + p.age * .012);
          p.x += (p.vx - Math.sin(p.rotation) * sway) * dt;
          p.y += (p.vy + Math.cos(p.rotation) * sway) * dt;
          p.rotation += p.spin * dt;
        }
      }
      this._draw();
    }

    _line(g, x1, y1, x2, y2, width, color, alpha, inset) {
      // Clip decoration to the play field so it cannot cover the question/timer/buttons.
      const top = this.bounds.top + (inset || 0), bottom = this.bounds.bottom - (inset || 0);
      if (top >= bottom) return;
      if (y1 < top && y2 < top || y1 > bottom && y2 > bottom) return;
      if (y1 < top || y1 > bottom) { const y = clamp(y1, top, bottom); x1 += (x2 - x1) * (y - y1) / (y2 - y1); y1 = y; }
      if (y2 < top || y2 > bottom) { const y = clamp(y2, top, bottom); x2 = x1 + (x2 - x1) * (y - y1) / (y2 - y1); y2 = y; }
      g.lineStyle(width, color, alpha).lineBetween(x1, y1, x2, y2);
    }

    _draw() {
      for (const graphic of this.graphics) graphic.clear();
      if (this.fire) this.fire.beginFrame();
      if (this.lightning) this.lightning.beginFrame();
      if (this.ice) this.ice.beginFrame();
      if (this.wind) this.wind.beginFrame();
      // Draw only the newest large effects; particle physics and hit results continue.
      const heroes = this.active.element.reduce((n, p) => n + (p.hero && p.delay <= 0 ? 1 : 0), 0);
      const budget = this.pressure ? 1 : Math.min(this.heroLimit, this.options.quality === "low" ? 2 : 3);
      let skip = Math.max(0, heroes - budget);
      this.visibleHeroes = 0; this.suppressedHeroes = skip;
      const trails = !this.pressure && this.options.quality !== "low";
      for (const group of Object.keys(this.active)) for (const p of this.active[group]) {
        if (p.delay > 0) continue;
        const progress = p.age / p.life, alpha = p.alpha * Math.pow(1 - progress, .85);
        if (p.hero) {
          if (skip > 0) { skip--; continue; }
          this.visibleHeroes++; this._signatureDraw(p, progress); continue;
        }
        const r = p.radius * (1 - .35 * progress), x = p.x, y = p.y;
        if (p.shape === "lightning") {
          if (!p.reduced && this._prepareLightning()) { this.lightning.draw(p, this.bounds, this.pressure); continue; }
          for (let j = 1; j < 7; j++) {
            this._line(this.light, x + p.boltX[j - 1], y + p.boltY[j - 1], x + p.boltX[j], y + p.boltY[j], 5, p.color, alpha * .14);
            this._line(this.light, x + p.boltX[j - 1], y + p.boltY[j - 1], x + p.boltX[j], y + p.boltY[j], 2.1, p.color, alpha);
            this._line(this.light, x + p.boltX[j - 1], y + p.boltY[j - 1], x + p.boltX[j], y + p.boltY[j], .7, 0xffffff, alpha * .85);
            if (p.branch && j === 3) this._line(this.light, x + p.boltX[j], y + p.boltY[j],
              x + p.boltX[j] + p.boltY[5] * .35, y + p.boltY[j] - p.boltX[5] * .35, 1.2, p.color, alpha * .65);
          }
          continue;
        }
        const tail = p.tail * (1 - progress * .6);
        const a = Math.atan2(p.vy, p.vx), cx = Math.cos(p.rotation), sy = Math.sin(p.rotation);
        const g = p.shape === "fire" ? this.body : group === "element" || p.shape === "stream" ? this.light : this.body;
        if (tail > 0 && p.shape !== "wind" && p.detail !== "flame") this._line(p.shape === "drop" ? this.flow : g,
          x, y, x - Math.cos(a) * tail, y - Math.sin(a) * tail,
          p.shape === "drop" ? Math.max(1, r * .75) : Math.max(.7, r * .8), p.color, alpha * .45);
        if (p.shape === "wind") {
          let tx = x, ty = y;
          for (let j = 1; j <= 8; j++) {
            const t = j / 8, bend = Math.sin(t * Math.PI) * (p.reduced ? 0 : 32 + 12 * Math.sin(p.phase + progress * 3));
            const nx = x - Math.cos(a) * tail * t - Math.sin(a) * bend;
            const ny = y - Math.sin(a) * tail * t + Math.cos(a) * bend;
            this._line(this.flow, tx, ty, nx, ny, Math.max(.7, 2.3 * (1 - t * .65)), p.color, alpha * (1 - t * .75));
            tx = nx; ty = ny;
          }
        }
        if (trails && this.options.quality === "high" && p.shape === "drop" && r > 7) {
          for (let j = 1; j < p.trailCount; j++) this._line(this.flow,
            p.trailX[j - 1], p.trailY[j - 1], p.trailX[j], p.trailY[j],
            r * .42, p.color, alpha * .18 * (1 - j / 6));
        }
        if (trails && p.shape === "wind") {
          for (let j = 1; j < p.trailCount; j++) this._line(this.flow,
            p.trailX[j - 1], p.trailY[j - 1], p.trailX[j], p.trailY[j], 1.2, p.color, alpha * (1 - j / 6));
        }
        const extent = p.detail === "cold-mist" ? r * (1 + progress) : p.shape === "ice" ? r * 1.7 : r;
        if (y - extent < this.bounds.top || y + extent > this.bounds.bottom || x < -40 || x > 1406) continue;
        g.fillStyle(p.color, alpha);
        if (p.detail === "flame") {
          const height = tail * .65, lean = Math.sin(p.phase + progress * 12) * r * 1.3;
          if (this._prepareFire()) this.fire.draw(x + lean * .2, y, r * 3.2, height * 1.2, p.phase, alpha, this.bounds);
          else {
            this._flame(g, x, y, r, height, lean, p.phase + progress * 14, p.color, alpha);
            this._flame(this.light, x, y, r * .45, height * .5, lean * .4, p.phase, 0xffe69a, alpha * .7);
          }
        } else if (p.detail === "cold-mist") {
          g.fillCircle(x, y, r * (1 + progress));
        } else if (p.shape === "ice") {
          g.fillTriangle(x + cx * r * 1.7, y + sy * r * 1.7,
            x - sy * r, y + cx * r, x + sy * r, y - cx * r);
          if (p.detail === "diamond") g.fillTriangle(x - cx * r * 1.2, y - sy * r * 1.2,
            x - sy * r, y + cx * r, x + sy * r, y - cx * r);
          this._line(this.light, x, y, x + cx * r, y + sy * r, .8, 0xffffff, alpha);
        } else if (p.shape === "drop") {
          g.fillCircle(x - cx * r * .3, y - sy * r * .3, r * .76);
          g.fillTriangle(x + cx * r * 1.6, y + sy * r * 1.6,
            x - cx * r * .3 - sy * r * .7, y - sy * r * .3 + cx * r * .7,
            x - cx * r * .3 + sy * r * .7, y - sy * r * .3 - cx * r * .7);
          if (r > 8) this._line(this.light, x - cx * r * .2, y - sy * r * .2,
            x + cx * r * .6, y + sy * r * .6, 1, p.color, alpha * .32);
        } else g.fillCircle(x, y, r);
      }
      if (this.fire) this.fire.endFrame(this.clock, this.pressure);
    }

    getState() {
      return { active: this.count(), heavy: this.active.heavy.length, fine: this.active.fine.length,
        element: this.active.element.length, limits: Object.assign({}, this.limits), peak: this.peak,
        emitted: Object.assign({}, this.emitted), evicted: this.evicted, jobs: this.jobs.length,
        droppedJobs: this.droppedJobs, graphics: this.scene ? 3 : 0, textures: this.fire ? this.fire.getState().textures : 0,
        fire: this.fire ? this.fire.getState() : { mode: this.fireError ? "fallback" : "graphics", visibleSprites: 0 },
        fireError: this.fireError,
        lightning: this.lightning ? this.lightning.getState() : { mode: "graphics", visibleShaders: 0 },
        lightningError: this.lightningError,
        ice: this.ice ? this.ice.getState() : { mode: "graphics", visibleSurfaces: 0 },
        iceError: this.iceError,
        wind: this.wind ? this.wind.getState() : { mode: "graphics", visibleSurfaces: 0 },
        windError: this.windError,
        presentation: { profile: this.options.presentation || "standard", opacity: this.opacity,
          heroLimit: this.heroLimit, visibleHeroes: this.visibleHeroes, suppressedHeroes: this.suppressedHeroes },
        quality: this.options.quality, pressure: this.pressure, lastHit: this.lastHit, waves: this.waves.slice() };
    }

    reset() {
      this.jobs.length = 0;
      for (const kind of Object.keys(this.active)) {
        this.free[kind].push(...this.active[kind]); this.active[kind].length = 0;
      }
      for (const graphic of this.graphics) if (graphic.active) graphic.clear();
      this.waves.length = 0; this.lastHit = null;
      this.clock = 0; this.load = 16.7; this.slowFrames = 0; this.pressure = false;
      this.visibleHeroes = 0; this.suppressedHeroes = 0;
      if (this.fire) this.fire.reset();
      if (this.lightning) this.lightning.reset();
      if (this.ice) this.ice.reset();
      if (this.wind) this.wind.reset();
    }

    destroy() {
      if (!this.scene) return;
      this.reset();
      if (this.fire) { this.fire.destroy(); this.fire = null; }
      if (this.lightning) { this.lightning.destroy(); this.lightning = null; }
      if (this.ice) { this.ice.destroy(); this.ice = null; }
      if (this.wind) { this.wind.destroy(); this.wind = null; }
      for (const graphic of this.graphics) if (graphic.active) graphic.destroy();
      this.graphics.length = 0;
      for (const kind of Object.keys(this.free)) this.free[kind].length = 0;
      this.scene = null;
    }
  }
  DynamicSlashVFXSystem.TYPES = TYPES;
  DynamicSlashVFXSystem.ELEMENTS = ELEMENTS;
  window.NinjaCore.DynamicSlashVFXSystem = DynamicSlashVFXSystem;
})();
