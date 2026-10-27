(function () {
  "use strict";

  window.NinjaCore = window.NinjaCore || {};

  class SwipeSlashSystem {
    constructor(scene, options) {
      this.scene = scene;
      this.getTargets = options.getTargets;
      this.getHitArea = options.getHitArea;
      this.onHit = options.onHit;
      this.onSwipeBegin = options.onSwipeBegin || function () {};
      this.onSwipeEnd = options.onSwipeEnd || function () {};
      this.onSlashTravel = options.onSlashTravel || function () {};
      this.fadeTime = options.fadeTime || 200;
      this.reducedMotion = Boolean(options.reducedMotion);
      const numeric = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
      this.speedWindowMs = Math.max(20, numeric(options.speedWindowMs, 55));
      this.speedSmoothing = Math.max(0, Math.min(1, numeric(options.speedSmoothing, 0.35)));
      this.speedMin = Math.max(0, numeric(options.speedMin, 0.35));
      this.speedMax = Math.max(this.speedMin + 0.01, numeric(options.speedMax, 2.2));
      this.widthSpeedBonus = Math.max(0, numeric(options.widthSpeedBonus, 0.20));
      this.glowSpeedBonus = Math.max(0, numeric(options.glowSpeedBonus, 0.18));
      this.trailSpeedBonusMs = Math.max(0, Math.min(300 - this.fadeTime, numeric(options.trailSpeedBonusMs, 60)));
      this.onSpeedSample = options.onSpeedSample || function () {};
      this.clock = options.clock || (() => performance.now());
      this.enabled = true;
      this.zoneVisual = false;
      this.active = false;
      this.pointerId = null;
      this.hitIds = new Set();
      this.segments = [];
      this.points = [];
      this.lastPoint = null;
      this.totalDistance = 0;
      this.travelSoundPlayed = false;
      this.speedSamples = [];
      this.rawSpeed = 0;
      this.smoothedSpeed = 0;
      this.visualIntensity = 0;
      this.speedValid = false;

      this.graphics = scene.add.graphics().setDepth(900);
      this.tipGraphics = scene.add.graphics().setDepth(901);

      this._downHandler = this._handleDown.bind(this);
      this._moveHandler = this._handleMove.bind(this);
      this._upHandler = this._handleUp.bind(this);

      scene.input.on("pointerdown", this._downHandler);
      scene.input.on("pointermove", this._moveHandler);
      scene.input.on("pointerup", this._upHandler);
      scene.input.on("pointerupoutside", this._upHandler);
    }

    setEnabled(value) {
      this.enabled = Boolean(value);
      if (!this.enabled && this.active) this._finishSwipe();
    }

    setZoneVisual(value) { this.zoneVisual = Boolean(value); }

    _handleDown(pointer) {
      if (!this.enabled || this.active) return;
      const point = { x: pointer.x, y: pointer.y };
      this.active = true;
      this.pointerId = pointer.id;
      this.hitIds.clear();
      this.points = [point];
      this.lastPoint = point;
      this.totalDistance = 0;
      this.travelSoundPlayed = false;
      this.speedSamples = [{ x: point.x, y: point.y, t: this.clock() }];
      this.rawSpeed = 0;
      this.smoothedSpeed = 0;
      this.visualIntensity = 0;
      this.speedValid = false;
      this.onSwipeBegin({ point });
    }

    _handleMove(pointer) {
      if (!this.enabled || !this.active || pointer.id !== this.pointerId || !pointer.isDown) return;
      this._processPoint({ x: pointer.x, y: pointer.y });
    }

    _handleUp(pointer) {
      if (!this.active || (pointer && pointer.id !== this.pointerId)) return;
      if (this.enabled && pointer) this._processPoint({ x: pointer.x, y: pointer.y });
      this._finishSwipe();
    }

    _processPoint(current) {
      const previous = this.lastPoint;
      if (!previous) {
        this.lastPoint = current;
        return;
      }

      this._sampleSpeed(current);
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 2) return;

      const steps = Math.max(1, Math.ceil(distance / 18));
      let segmentStart = previous;
      for (let i = 1; i <= steps; i += 1) {
        const segmentEnd = {
          x: previous.x + dx * (i / steps),
          y: previous.y + dy * (i / steps)
        };
        this._addTrailSegment(segmentStart, segmentEnd, this.visualIntensity);
        segmentStart = segmentEnd;
      }

      this.totalDistance += distance;
      if (!this.travelSoundPlayed && this.totalDistance >= 28) {
        this.travelSoundPlayed = true;
        this.onSlashTravel();
      }

      const targets = this.getTargets() || [];
      for (const target of targets) {
        if (!target || !target.active || target.__cut || this.hitIds.has(target.__ninjaId)) continue;
        const hit = this._segmentHitDetails(previous, current, target);
        if (hit) {
          this.hitIds.add(target.__ninjaId);
          this.onHit(target, {
            from: previous,
            to: current,
            vector: { x: dx, y: dy },
            angle: Math.atan2(dy, dx),
            hitPoint: hit.worldPoint,
            localHitPoint: hit.localPoint,
            localVector: hit.localVector,
            hitArea: hit.area,
            distance,
            totalDistance: this.totalDistance,
            speedIntensity: this.visualIntensity,
            swipeSpeed: this.smoothedSpeed
          });
        }
      }

      this.points.push(current);
      if (this.points.length > 28) this.points.shift();
      this.lastPoint = current;
    }

    _finishSwipe() {
      const payload = {
        points: this.points.slice(),
        hitCount: this.hitIds.size,
        totalDistance: this.totalDistance
      };
      this.active = false;
      this.pointerId = null;
      this.lastPoint = null;
      this.points = [];
      this.hitIds.clear();
      this.speedSamples = [];
      this.rawSpeed = 0;
      this.smoothedSpeed = 0;
      this.visualIntensity = 0;
      this.speedValid = false;
      this.onSwipeEnd(payload);
    }

    _sampleSpeed(point) {
      const now = this.clock();
      if (!Number.isFinite(now)) return;
      const samples = this.speedSamples;
      const last = samples[samples.length - 1];
      if (last && now < last.t) {
        samples.length = 0;
        this.speedValid = false;
        this.rawSpeed = 0;
        this.smoothedSpeed = 0;
        this.visualIntensity = 0;
      }
      if (last && now - last.t > this.speedWindowMs * 2) {
        this.speedValid = false;
        this.smoothedSpeed = 0;
      }
      samples.push({ x: point.x, y: point.y, t: now });
      while (samples.length > 2 && samples[1].t <= now - this.speedWindowMs) samples.shift();
      if (samples.length > 12) samples.shift();
      const first = samples[0];
      const elapsed = now - first.t;
      if (elapsed < 8) return;
      const raw = Math.min(this.speedMax, Math.hypot(point.x - first.x, point.y - first.y) / elapsed);
      this.rawSpeed = Number.isFinite(raw) ? raw : 0;
      this.smoothedSpeed = this.speedValid
        ? this.smoothedSpeed * (1 - this.speedSmoothing) + this.rawSpeed * this.speedSmoothing
        : this.rawSpeed;
      this.speedValid = true;
      this.visualIntensity = Math.max(0, Math.min(1,
        (this.smoothedSpeed - this.speedMin) / (this.speedMax - this.speedMin)
      ));
      this.onSpeedSample({ rawSpeed: this.rawSpeed, smoothedSpeed: this.smoothedSpeed, intensity: this.visualIntensity });
    }

    getCurrentSpeed() {
      return this.smoothedSpeed;
    }

    getVisualIntensity() {
      return this.visualIntensity;
    }

    _segmentHitsTarget(from, to, target) {
      return Boolean(this._segmentHitDetails(from, to, target));
    }

    _segmentHitDetails(from, to, target) {
      const area = this.getHitArea(target);
      if (!area) return null;
      const rotation = -(area.rotation || 0);
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const localA = this._toLocal(from, area.x, area.y, cos, sin);
      const localB = this._toLocal(to, area.x, area.y, cos, sin);
      const halfWidth = area.width / 2;
      const halfHeight = area.height / 2;
      const intersection = this._clipSegmentToAabb(
        localA,
        localB,
        -halfWidth,
        -halfHeight,
        halfWidth,
        halfHeight
      );
      if (!intersection) return null;

      const hitT = (intersection.tMin + intersection.tMax) / 2;
      const localPoint = {
        x: localA.x + (localB.x - localA.x) * hitT,
        y: localA.y + (localB.y - localA.y) * hitT
      };
      const worldRotation = area.rotation || 0;
      const worldCos = Math.cos(worldRotation);
      const worldSin = Math.sin(worldRotation);
      return {
        area,
        localPoint,
        localVector: {
          x: localB.x - localA.x,
          y: localB.y - localA.y
        },
        worldPoint: {
          x: area.x + localPoint.x * worldCos - localPoint.y * worldSin,
          y: area.y + localPoint.x * worldSin + localPoint.y * worldCos
        },
        tMin: intersection.tMin,
        tMax: intersection.tMax
      };
    }

    _toLocal(point, centerX, centerY, cos, sin) {
      const x = point.x - centerX;
      const y = point.y - centerY;
      return { x: x * cos - y * sin, y: x * sin + y * cos };
    }

    _segmentIntersectsAabb(a, b, minX, minY, maxX, maxY) {
      return Boolean(this._clipSegmentToAabb(a, b, minX, minY, maxX, maxY));
    }

    _clipSegmentToAabb(a, b, minX, minY, maxX, maxY) {
      let tMin = 0;
      let tMax = 1;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const checks = [
        [-dx, a.x - minX],
        [dx, maxX - a.x],
        [-dy, a.y - minY],
        [dy, maxY - a.y]
      ];

      for (const pair of checks) {
        const p = pair[0];
        const q = pair[1];
        if (Math.abs(p) < 1e-8) {
          if (q < 0) return null;
          continue;
        }
        const ratio = q / p;
        if (p < 0) {
          if (ratio > tMax) return null;
          if (ratio > tMin) tMin = ratio;
        } else {
          if (ratio < tMin) return null;
          if (ratio < tMax) tMax = ratio;
        }
      }
      return { tMin, tMax };
    }

    _addTrailSegment(from, to, intensity) {
      this.segments.push({
        x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        born: this.scene.time.now,
        intensity: Math.max(0, Math.min(1, Number(intensity) || 0))
      });
      if (this.segments.length > 72) this.segments.splice(0, this.segments.length - 72);
    }

    update(now) {
      const fade = (this.reducedMotion ? Math.min(130, this.fadeTime) : this.fadeTime) +
        (this.zoneVisual && !this.reducedMotion ? 35 : 0);
      this.segments = this.segments.filter((segment) =>
        now - segment.born < fade + (this.reducedMotion ? 0 : this.trailSpeedBonusMs * segment.intensity)
      );
      this.graphics.clear();
      this.tipGraphics.clear();

      for (let index = 0; index < this.segments.length; index += 1) {
        const segment = this.segments[index];
        const intensity = this.reducedMotion ? 0 : segment.intensity;
        const segmentFade = fade + this.trailSpeedBonusMs * intensity;
        const alpha = Math.max(0, 1 - (now - segment.born) / segmentFade);
        // 古い線分は細く薄く、指先に近い線分は太く明るい。軌跡・Hit履歴は変更しない。
        const recency = this.segments.length === 1 ? 1 : index / (this.segments.length - 1);
        const taper = (0.58 + recency * 0.42) * (0.72 + alpha * 0.28);
        const visualAlpha = alpha * (0.56 + recency * 0.44);
        if (!this.reducedMotion) {
          this.graphics.lineStyle(15 * taper * (1 + this.glowSpeedBonus * intensity) * (this.zoneVisual ? 1.26 : 1), 0x3ba8ff, visualAlpha * (this.zoneVisual ? .26 : .18) + visualAlpha * .05 * intensity);
          this.graphics.lineBetween(segment.x1, segment.y1, segment.x2, segment.y2);
          this.graphics.lineStyle(8 * taper * (1 + this.widthSpeedBonus * intensity) * (this.zoneVisual ? 1.2 : 1), 0xa7e7ff, visualAlpha * (this.zoneVisual ? .64 : .52) + visualAlpha * .10 * intensity);
          this.graphics.lineBetween(segment.x1, segment.y1, segment.x2, segment.y2);
        }
        this.graphics.lineStyle(Math.max(1.5, 3 * taper * (1 + this.widthSpeedBonus * intensity) * (this.zoneVisual ? 1.18 : 1)), 0xffffff, visualAlpha * (0.96 + 0.04 * intensity));
        this.graphics.lineBetween(segment.x1, segment.y1, segment.x2, segment.y2);
      }

      if (this.active && this.lastPoint) {
        this.tipGraphics.fillStyle(0xffffff, 0.9);
        this.tipGraphics.fillCircle(this.lastPoint.x, this.lastPoint.y, this.reducedMotion ? 3 : 5);
        if (!this.reducedMotion) {
          this.tipGraphics.lineStyle(2, 0x77d8ff, 0.55);
          this.tipGraphics.strokeCircle(this.lastPoint.x, this.lastPoint.y, 10);
        }
      }
    }

    destroy() {
      if (!this.scene) return;
      this.scene.input.off("pointerdown", this._downHandler);
      this.scene.input.off("pointermove", this._moveHandler);
      this.scene.input.off("pointerup", this._upHandler);
      this.scene.input.off("pointerupoutside", this._upHandler);
      if (this.graphics) this.graphics.destroy();
      if (this.tipGraphics) this.tipGraphics.destroy();
      this.segments = [];
      this.speedSamples = [];
      this.scene = null;
    }
  }

  window.NinjaCore.SwipeSlashSystem = SwipeSlashSystem;
})();
