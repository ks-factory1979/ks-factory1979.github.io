(function () {
  "use strict";

  window.NinjaCore = window.NinjaCore || {};

  let systemSerial = 0;
  const EPSILON = 1e-7;

  function polygonArea(points) {
    let sum = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      sum += current.x * next.y - next.x * current.y;
    }
    return Math.abs(sum) / 2;
  }

  function signedDistance(point, linePoint, direction) {
    return direction.x * (point.y - linePoint.y) - direction.y * (point.x - linePoint.x);
  }

  function clipHalfPlane(points, linePoint, direction, keepPositive) {
    const output = [];
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const currentDistance = signedDistance(current, linePoint, direction);
      const nextDistance = signedDistance(next, linePoint, direction);
      const currentInside = keepPositive ? currentDistance >= -EPSILON : currentDistance <= EPSILON;
      const nextInside = keepPositive ? nextDistance >= -EPSILON : nextDistance <= EPSILON;

      if (currentInside) output.push({ x: current.x, y: current.y });
      if (currentInside === nextInside) continue;

      const denominator = currentDistance - nextDistance;
      if (Math.abs(denominator) < EPSILON) continue;
      const ratio = currentDistance / denominator;
      output.push({
        x: current.x + (next.x - current.x) * ratio,
        y: current.y + (next.y - current.y) * ratio
      });
    }
    return output;
  }

  function lineRectangleIntersections(width, height, point, direction) {
    const intersections = [];
    const add = (x, y, parameter) => {
      if (x < -EPSILON || x > width + EPSILON || y < -EPSILON || y > height + EPSILON) return;
      const candidate = {
        x: Math.max(0, Math.min(width, x)),
        y: Math.max(0, Math.min(height, y)),
        parameter
      };
      if (intersections.some((other) => Math.hypot(other.x - candidate.x, other.y - candidate.y) < 1e-5)) return;
      intersections.push(candidate);
    };

    if (Math.abs(direction.x) > EPSILON) {
      let parameter = (0 - point.x) / direction.x;
      add(0, point.y + direction.y * parameter, parameter);
      parameter = (width - point.x) / direction.x;
      add(width, point.y + direction.y * parameter, parameter);
    }
    if (Math.abs(direction.y) > EPSILON) {
      let parameter = (0 - point.y) / direction.y;
      add(point.x + direction.x * parameter, 0, parameter);
      parameter = (height - point.y) / direction.y;
      add(point.x + direction.x * parameter, height, parameter);
    }

    intersections.sort((first, second) => first.parameter - second.parameter);
    if (intersections.length < 2) return null;
    return {
      start: { x: intersections[0].x, y: intersections[0].y },
      end: {
        x: intersections[intersections.length - 1].x,
        y: intersections[intersections.length - 1].y
      }
    };
  }

  function splitRectangleByLine(width, height, requestedPoint, requestedDirection, minAreaRatio) {
    const safeWidth = Math.max(1, Number(width) || 1);
    const safeHeight = Math.max(1, Number(height) || 1);
    const directionLength = Math.hypot(requestedDirection.x, requestedDirection.y);
    const direction = directionLength > EPSILON
      ? { x: requestedDirection.x / directionLength, y: requestedDirection.y / directionLength }
      : { x: 1, y: 0 };
    const normal = { x: -direction.y, y: direction.x };
    const rectangle = [
      { x: 0, y: 0 },
      { x: safeWidth, y: 0 },
      { x: safeWidth, y: safeHeight },
      { x: 0, y: safeHeight }
    ];
    const point = {
      x: Number.isFinite(requestedPoint.x) ? requestedPoint.x : safeWidth / 2,
      y: Number.isFinite(requestedPoint.y) ? requestedPoint.y : safeHeight / 2
    };
    const minimumArea = safeWidth * safeHeight * Math.max(0, Math.min(0.20, Number(minAreaRatio) || 0));

    const build = (linePoint) => {
      const first = clipHalfPlane(rectangle, linePoint, direction, true);
      const second = clipHalfPlane(rectangle, linePoint, direction, false);
      const firstArea = first.length >= 3 ? polygonArea(first) : 0;
      const secondArea = second.length >= 3 ? polygonArea(second) : 0;
      return { first, second, firstArea, secondArea };
    };

    let adjustedPoint = point;
    let result = build(adjustedPoint);
    if (minimumArea > 0 && Math.min(result.firstArea, result.secondArea) < minimumArea) {
      const center = { x: safeWidth / 2, y: safeHeight / 2 };
      const offsetToCenter = (center.x - point.x) * normal.x + (center.y - point.y) * normal.y;
      let low = 0;
      let high = 1;
      for (let iteration = 0; iteration < 16; iteration += 1) {
        const ratio = (low + high) / 2;
        const candidate = {
          x: point.x + normal.x * offsetToCenter * ratio,
          y: point.y + normal.y * offsetToCenter * ratio
        };
        const candidateResult = build(candidate);
        if (Math.min(candidateResult.firstArea, candidateResult.secondArea) >= minimumArea) high = ratio;
        else low = ratio;
      }
      adjustedPoint = {
        x: point.x + normal.x * offsetToCenter * high,
        y: point.y + normal.y * offsetToCenter * high
      };
      result = build(adjustedPoint);
    }

    const cutLine = lineRectangleIntersections(safeWidth, safeHeight, adjustedPoint, direction);
    return {
      point: adjustedPoint,
      requestedPoint: point,
      direction,
      normal,
      first: result.first,
      second: result.second,
      firstArea: result.firstArea,
      secondArea: result.secondArea,
      minimumArea,
      lineStart: cutLine ? cutLine.start : null,
      lineEnd: cutLine ? cutLine.end : null
    };
  }

  class CutEffectSystem {
    constructor(scene, options) {
      const settings = options || {};
      this.scene = scene;
      this.reducedMotion = Boolean(settings.reducedMotion);
      this.pieceDepth = settings.pieceDepth || 170;
      this.flashDepth = settings.flashDepth || 180;
      this.cutDuration = Number(settings.cutDuration || 560);
      this.separationForce = Number(settings.separationForce || 78);
      this.rotationMin = Number(settings.rotationMin || 10);
      this.rotationMax = Number(settings.rotationMax || 18);
      this.hitFlashMs = Number(settings.hitFlashMs || 85);
      this.hitRingMs = Number(settings.hitRingMs || 210);
      this.baseSparkCount = Number(settings.baseSparkCount || 8);
      const configuredRadii = Array.isArray(settings.hitRingRadii) ? settings.hitRingRadii : [41, 44, 47, 52];
      this.hitRingRadii = [0, 1, 2, 3].map((index) => Number(configuredRadii[index] || [41, 44, 47, 52][index]));
      this.maxSparkCount = Math.max(this.baseSparkCount, Number(settings.maxSparkCount || 12));
      const numeric = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
      this.sparkSpeedBonusMax = Math.max(0, numeric(settings.sparkSpeedBonusMax, 4));
      this.maxHitSparks = Math.max(this.maxSparkCount, numeric(settings.maxHitSparks, 16));
      this.sparkVelocityBonus = Math.max(0, numeric(settings.sparkVelocityBonus, 0.12));
      this.flashSpeedBonus = Math.max(0, numeric(settings.flashSpeedBonus, 0.12));
      this.cutGlowDuration = Number(settings.cutGlowDuration || 110);
      this.cutGlowOuterWidth = Number(settings.cutGlowOuterWidth || 12);
      this.cutGlowMiddleWidth = Number(settings.cutGlowMiddleWidth || 6);
      this.cutGlowCoreWidth = Number(settings.cutGlowCoreWidth || 2.5);
      this.maxActivePieces = Number(settings.maxActivePieces || 24);
      this.maxImpactObjects = Math.max(12, Number(settings.maxImpactObjects || 72));
      this.onImpactState = typeof settings.onImpactState === "function" ? settings.onImpactState : null;
      this.systemId = ++systemSerial;
      this.nextTextureId = 1;
      this.activePieces = new Map();
      this.pendingMoves = [];
      this.activeEffects = new Set();
      this.activeImpactEffects = new Set();
      this.maxObservedImpactObjects = 0;
      this.dynamicTextureKeys = new Set();
      this.pendingStageTimers = new Set();
    }

    // 斬撃の意味ごとに、光の「形」を変える。判定や得点には一切使わない。
    _visualType(settings) {
      if (settings.zone) return settings.multiHit ? "zone_issen" : "zone_normal";
      if (settings.multiHit) return "issen";
      return settings.critical ? "critical" : "normal";
    }

    // 予兆→着弾→余韻の時間だけを定義。斬撃の判定・得点・音の開始時刻は変えない。
    _timingProfile(type) {
      const profiles = {
        normal: { anticipationMs: 0, flashMs: 85, glowMs: this.cutGlowDuration, accentMs: 0 },
        critical: { anticipationMs: 24, flashMs: 66, glowMs: this.cutGlowDuration + 30, accentMs: 145 },
        issen: { anticipationMs: 0, flashMs: 85, glowMs: this.cutGlowDuration + 46, accentMs: 240 },
        zone_normal: { anticipationMs: 0, flashMs: 94, glowMs: this.cutGlowDuration + 68, accentMs: 225 },
        zone_issen: { anticipationMs: this.reducedMotion ? 0 : 42,
          flashMs: 100, glowMs: this.cutGlowDuration + 92, accentMs: 250 }
      };
      return profiles[type] || profiles.normal;
    }

    split(target, slash, options) {
      if (!this.scene || !target || !target.texture) return null;
      const settings = options || {};
      const slashData = slash && slash.vector ? slash : { vector: slash || { x: 1, y: 0 } };
      const worldVector = slashData.vector || { x: 1, y: 0 };
      const textureWidth = Math.max(1, Number(settings.textureWidth || 180));
      const textureHeight = Math.max(1, Number(settings.textureHeight || 180));
      const displayWidth = Math.max(1, Number(target.displayWidth || textureWidth));
      const displayHeight = Math.max(1, Number(target.displayHeight || textureHeight));
      const rotation = Number(target.rotation || 0);
      const sourceTexture = this.scene.textures.get(target.texture.key);
      const source = sourceTexture && sourceTexture.getSourceImage();
      if (!source) return null;

      const localVector = slashData.localVector || this._rotateVector(worldVector, -rotation);
      const localHitPoint = slashData.localHitPoint || this._worldHitToLocal(slashData.hitPoint, target, rotation);
      const texturePoint = {
        x: textureWidth / 2 + (localHitPoint.x / displayWidth) * textureWidth,
        y: textureHeight / 2 + (localHitPoint.y / displayHeight) * textureHeight
      };
      const textureDirection = {
        x: (localVector.x / displayWidth) * textureWidth,
        y: (localVector.y / displayHeight) * textureHeight
      };
      const geometry = splitRectangleByLine(
        textureWidth,
        textureHeight,
        texturePoint,
        textureDirection,
        settings.minPieceAreaRatio === undefined ? 0.05 : settings.minPieceAreaRatio
      );
      if (geometry.first.length < 3 || geometry.second.length < 3) return null;

      this._makePieceRoom(2);
      const firstTextureKey = this._createClippedTexture(source, textureWidth, textureHeight, geometry.first);
      let secondTextureKey;
      try {
        secondTextureKey = this._createClippedTexture(source, textureWidth, textureHeight, geometry.second);
      } catch (error) {
        this._removeTexture(firstTextureKey);
        throw error;
      }

      const x = Number(target.x || 0);
      const y = Number(target.y || 0);
      const first = this._piece(x, y, firstTextureKey, displayWidth, displayHeight, rotation);
      const second = this._piece(x, y, secondTextureKey, displayWidth, displayHeight, rotation);
      const vectorLength = Math.max(EPSILON, Math.hypot(worldVector.x, worldVector.y));
      const worldNormal = {
        x: -worldVector.y / vectorLength,
        y: worldVector.x / vectorLength
      };
      const flight = settings.flight || { vx: 0, vy: 0 };
      const duration = this.reducedMotion ? Math.min(360, this.cutDuration) : this.cutDuration;
      const force = this.reducedMotion ? this.separationForce * 0.55 : this.separationForce;
      const inheritedX = (Number(flight.vx) || 0) * 0.22;
      const inheritedY = (Number(flight.vy) || 0) * 0.16;
      const gravityDrop = this.reducedMotion ? 70 : 105;
      const baseAngle = Number(target.angle || (rotation * 180) / Math.PI || 0);
      const rotationAmount = this.reducedMotion ? 0 : this._between(this.rotationMin, this.rotationMax);

      const firstDestination = {
        x: x + inheritedX + worldNormal.x * force,
        y: y + inheritedY + gravityDrop + worldNormal.y * force,
        angle: baseAngle - rotationAmount
      };
      const secondDestination = {
        x: x + inheritedX - worldNormal.x * force,
        y: y + inheritedY + gravityDrop - worldNormal.y * force,
        angle: baseAngle + rotationAmount
      };
      if (settings.deferMovement) {
        this.pendingMoves.push(
          { piece: first, textureKey: firstTextureKey, destination: firstDestination, duration },
          { piece: second, textureKey: secondTextureKey, destination: secondDestination, duration }
        );
      } else {
        this._drop(first, firstTextureKey, firstDestination, duration);
        this._drop(second, secondTextureKey, secondDestination, duration);
      }

      const adjustedLocalPoint = {
        x: ((geometry.point.x - textureWidth / 2) / textureWidth) * displayWidth,
        y: ((geometry.point.y - textureHeight / 2) / textureHeight) * displayHeight
      };
      const adjustedWorldPoint = this._localToWorld(adjustedLocalPoint, target, rotation);
      const lineStartLocal = this._textureToLocal(geometry.lineStart, textureWidth, textureHeight, displayWidth, displayHeight);
      const lineEndLocal = this._textureToLocal(geometry.lineEnd, textureWidth, textureHeight, displayWidth, displayHeight);
      const lineStartWorld = this._localToWorld(lineStartLocal, target, rotation);
      const lineEndWorld = this._localToWorld(lineEndLocal, target, rotation);
      const visualType = this._visualType(settings);
      const timing = this._timingProfile(visualType);
      this._cutGlow(lineStartWorld, lineEndWorld, visualType, settings.criticalGlowBonus, timing);
      if (visualType !== "normal") this._strikeAccent(adjustedWorldPoint, worldVector, visualType, timing);
      const impact = settings.impact !== false
        ? this._impact(adjustedWorldPoint.x, adjustedWorldPoint.y, worldVector, Number(settings.combo || 1),
          settings.speedIntensity, visualType, settings.criticalSparkBonus, timing)
        : null;
      const requestedWorldPoint = slashData.hitPoint && Number.isFinite(slashData.hitPoint.x) && Number.isFinite(slashData.hitPoint.y)
        ? { x: slashData.hitPoint.x, y: slashData.hitPoint.y }
        : this._localToWorld(localHitPoint, target, rotation);
      if (impact) impact.requestedPoint = requestedWorldPoint;
      const shakeTriggered = settings.specialShake
        ? this.shake(settings.shakeDuration, settings.shakeIntensity)
        : false;

      return {
        angle: Math.atan2(worldVector.y, worldVector.x),
        localHitPoint,
        adjustedLocalHitPoint: adjustedLocalPoint,
        worldHitPoint: adjustedWorldPoint,
        geometry,
        textureKeys: [firstTextureKey, secondTextureKey],
        pieces: [first, second],
        normal: worldNormal,
        impact,
        visualType,
        timing,
        shakeTriggered,
        cutLine: {
          textureStart: geometry.lineStart,
          textureEnd: geometry.lineEnd,
          localStart: lineStartLocal,
          localEnd: lineEndLocal,
          worldStart: lineStartWorld,
          worldEnd: lineEndWorld
        }
      };
    }

    releasePendingCuts() {
      if (!this.scene || this.pendingMoves.length === 0) return 0;
      const pending = this.pendingMoves.splice(0);
      let released = 0;
      for (const move of pending) {
        if (!this.activePieces.has(move.piece) || !move.piece || move.piece.active === false) continue;
        this._drop(move.piece, move.textureKey, move.destination, move.duration);
        released += 1;
      }
      return released;
    }

    shake(duration, intensity) {
      if (this.reducedMotion || !this.scene || !this.scene.cameras || !this.scene.cameras.main) return false;
      this.scene.cameras.main.shake(Number(duration || 65), Number(intensity || 0.0015));
      return true;
    }

    _createClippedTexture(source, width, height, polygon) {
      const key = "__ninja_cut_" + this.systemId + "_" + this.nextTextureId++;
      const texture = this.scene.textures.createCanvas(key, width, height);
      if (!texture) throw new Error("切断片Canvas Textureを作成できませんでした");
      this.dynamicTextureKeys.add(key);
      const canvas = texture.getSourceImage();
      const context = canvas && canvas.getContext("2d");
      if (!context) {
        this._removeTexture(key);
        throw new Error("切断片Canvasの2D Contextを取得できませんでした");
      }

      context.clearRect(0, 0, width, height);
      context.save();
      context.beginPath();
      context.moveTo(polygon[0].x, polygon[0].y);
      for (let index = 1; index < polygon.length; index += 1) context.lineTo(polygon[index].x, polygon[index].y);
      context.closePath();
      context.clip();
      context.drawImage(source, 0, 0, width, height);
      context.restore();
      if (typeof texture.update === "function") texture.update();
      if (typeof texture.refresh === "function") texture.refresh();
      return key;
    }

    _piece(x, y, textureKey, width, height, rotation) {
      const piece = this.scene.add.image(x, y, textureKey)
        .setDisplaySize(width, height)
        .setRotation(rotation)
        .setDepth(this.pieceDepth);
      this.activePieces.set(piece, textureKey);
      return piece;
    }

    _drop(piece, textureKey, destination, duration) {
      this.scene.tweens.add({
        targets: piece,
        x: destination.x,
        y: destination.y,
        angle: destination.angle,
        alpha: 0,
        duration,
        ease: "Quad.easeIn",
        onComplete: () => this._releasePiece(piece, textureKey, false)
      });
    }

    _makePieceRoom(quantity) {
      while (this.activePieces.size + quantity > this.maxActivePieces) {
        const oldest = this.activePieces.entries().next().value;
        if (!oldest) break;
        this._releasePiece(oldest[0], oldest[1], true);
      }
    }

    _releasePiece(piece, textureKey, killTween) {
      if (killTween && this.scene && this.scene.tweens && typeof this.scene.tweens.killTweensOf === "function") {
        this.scene.tweens.killTweensOf(piece);
      }
      this.activePieces.delete(piece);
      this.pendingMoves = this.pendingMoves.filter((move) => move.piece !== piece);
      if (piece && typeof piece.destroy === "function" && piece.active !== false) piece.destroy();
      this._removeTexture(textureKey);
    }

    _removeTexture(key) {
      if (!key || !this.scene || !this.scene.textures) return;
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      this.dynamicTextureKeys.delete(key);
    }

    _cutGlow(start, end, type, bonus, timing) {
      if (typeof type === "boolean") type = type ? "critical" : "normal";
      type = type || "normal";
      const glow = this.scene.add.graphics().setDepth(901);
      const critical = type === "critical";
      const zone = type.startsWith("zone_");
      const issen = type.endsWith("issen");
      const boost = critical ? Math.max(.16, Math.min(.2, Number(bonus) || 0)) :
        type === "zone_issen" ? .52 : zone ? .34 : issen ? .22 : 0;
      glow.lineStyle(this.cutGlowOuterWidth * (1 + boost), zone ? 0x8ce6ff : 0x63cfff, 0.24 + boost * .24);
      glow.lineBetween(start.x, start.y, end.x, end.y);
      if (critical || zone) {
        glow.lineStyle((critical ? 2.5 : zone ? 3.5 : 2), 0xffecc0, critical ? .85 : .63);
        glow.lineBetween(start.x, start.y - (critical ? 5 : 8), end.x, end.y - (critical ? 5 : 8));
      }
      glow.lineStyle(this.cutGlowMiddleWidth * (1 + boost * .5), 0xb9efff, 0.68);
      glow.lineBetween(start.x, start.y, end.x, end.y);
      glow.lineStyle(this.cutGlowCoreWidth * (critical ? 1.25 : zone ? 1.4 : 1), 0xffffff, 1);
      glow.lineBetween(start.x, start.y, end.x, end.y);
      if (critical) {
        // 芯を長く、細く伸ばし、豪快な爆発でなく正確な一線に見せる。
        const dx = end.x - start.x, dy = end.y - start.y;
        glow.lineStyle(1.6, 0xffffff, .94);
        glow.lineBetween(start.x - dx * .22, start.y - dy * .22, end.x + dx * .22, end.y + dy * .22);
      }
      this._trackEffect(glow, false);
      this.scene.tweens.add({
        targets: glow,
        alpha: 0,
        duration: timing ? timing.glowMs : this.cutGlowDuration + (critical ? 75 : 0) + (zone ? 65 : 0) + (issen ? 55 : 0),
        ease: "Quad.easeOut",
        onComplete: () => this._releaseEffect(glow)
      });
    }

    _strikeAccent(point, vector, type, timing) {
      timing = timing || this._timingProfile(type);
      const length = Math.max(1, Math.hypot(vector.x, vector.y));
      const ux = vector.x / length, uy = vector.y / length;
      const nx = -uy, ny = ux;
      const zone = type.startsWith("zone_");
      const critical = type === "critical";
      const span = critical ? 156 : type === "zone_issen" ? 190 : zone ? 166 : 142;
      const accent = this.scene.add.graphics().setDepth(902);
      const line = (offset, width, color, alpha) => {
        accent.lineStyle(width, color, alpha);
        accent.lineBetween(point.x - ux * span + nx * offset, point.y - uy * span + ny * offset,
          point.x + ux * span + nx * offset, point.y + uy * span + ny * offset);
      };
      if (zone) line(0, type === "zone_issen" ? 29 : 23, 0x6cdcff, .22);
      if (critical) line(0, 14, 0xffecc5, .22);
      line(critical ? -5 : -9, critical ? 2.5 : zone ? 4 : 2, 0xffe8ae, critical ? .9 : .7);
      line(0, critical ? 3.5 : zone ? 4.3 : 3, 0xffffff, .96);
      if (critical) {
        accent.fillStyle(0xfff1ce, .9);
        accent.fillCircle(point.x - ux * span, point.y - uy * span, 3);
        accent.fillCircle(point.x + ux * span, point.y + uy * span, 3);
      }
      this._trackEffect(accent, false);
      const fade = () => {
        if (!this.scene || !accent.active) return;
        this.scene.tweens.add({ targets: accent, alpha: 0,
          duration: this.reducedMotion ? 100 : timing ? timing.accentMs : 175,
          ease: "Quad.easeOut", onComplete: () => this._releaseEffect(accent) });
      };
      if (critical && !this.reducedMotion) {
        // 白芯を24msだけ中央へ収束させてから開く。音と切断は命中時のまま。
        accent.setAlpha(.33);
        this.scene.tweens.add({ targets: accent, alpha: 1,
          duration: timing.anticipationMs, ease: "Quad.easeIn", onComplete: fade });
      } else fade();
    }

    _impact(x, y, vector, combo, speedIntensity, type, sparkBonus, timing) {
      if (typeof type === "boolean") type = type ? "critical" : "normal";
      type = type || "normal";
      timing = timing || this._timingProfile(type);
      const intensity = this.reducedMotion ? 0 : Math.max(0, Math.min(1, Number(speedIntensity) || 0));
      const profile = this._impactProfile(combo, intensity, type, sparkBonus);
      const halo = this.scene.add.circle(x, y, profile.flashRadius, type === "critical" ? 0xffefc8 : 0xb9efff, profile.haloAlpha).setDepth(this.flashDepth + 4);
      this._trackEffect(halo, true);
      this.scene.tweens.add({
        targets: halo,
        scale: type === "critical" ? 1.35 : profile.flashScale,
        alpha: 0,
        duration: this.reducedMotion ? 65 : timing ? timing.flashMs : this.hitFlashMs,
        ease: "Quad.easeOut",
        onComplete: () => this._releaseEffect(halo)
      });

      const core = this.scene.add.circle(x, y, profile.flashRadius * 0.43, 0xffffff, 0.98).setDepth(this.flashDepth + 5);
      this._trackEffect(core, true);
      const releaseCore = () => {
        if (!this.scene || !core.active) return;
        this.scene.tweens.add({ targets: core, scale: 1.55, alpha: 0,
          duration: this.reducedMotion ? 48 : Math.max(40, Math.round((timing ? timing.flashMs : this.hitFlashMs) * .62)),
          ease: "Quad.easeOut", onComplete: () => this._releaseEffect(core) });
      };
      if (type === "critical" && !this.reducedMotion) {
        core.setScale(.56).setAlpha(.35);
        this.scene.tweens.add({ targets: core, scale: 1, alpha: .98,
          duration: timing.anticipationMs, ease: "Quad.easeIn", onComplete: releaseCore });
      } else releaseCore();

      for (let index = 0; index < profile.ringRadii.length; index += 1) {
        const startRadius = 10 + index * 3;
        const ring = this.scene.add.circle(x, y, startRadius, 0x8edfff, 0)
          .setStrokeStyle(type === "critical" ? 2.1 : index === 0 ? 4 : 2,
            type === "critical" ? 0xfff0c7 : index === 0 ? 0xbcefff : 0x60c7ff, 0.92 - index * 0.20)
          .setDepth(this.flashDepth + 2);
        this._trackEffect(ring, true);
        this.scene.tweens.add({
          targets: ring,
          scale: profile.ringRadii[index] / startRadius,
          alpha: 0,
          delay: index * 28,
          duration: this.reducedMotion ? 150 : type === "critical" ? 165 : this.hitRingMs,
          ease: "Quad.easeOut",
          onComplete: () => this._releaseEffect(ring)
        });
      }

      const vectorX = Number(vector && vector.x) || 0;
      const vectorY = Number(vector && vector.y) || 0;
      const slashAngle = Math.atan2(vectorY, vectorX);
      const directionalSparkCount = Math.max(0, profile.sparkCount - 2);
      const fanPairs = Math.max(1, Math.ceil(directionalSparkCount / 2));
      for (let index = 0; index < profile.sparkCount; index += 1) {
        let angle;
        if (index < directionalSparkCount) {
          const pairIndex = Math.floor(index / 2);
          const side = index % 2 === 0 ? -1 : 1;
          const fanRatio = fanPairs <= 1 ? 0 : pairIndex / (fanPairs - 1) - 0.5;
          angle = slashAngle + side * Math.PI / 2 + fanRatio * profile.sparkFan + this._between(-0.12, 0.12);
        } else {
          angle = slashAngle + (index % 2 === 0 ? 0 : Math.PI) + this._between(-0.16, 0.16);
        }
        const distance = this._between(profile.sparkDistanceMin, profile.sparkDistanceMax) * (1 + this.sparkVelocityBonus * intensity);
        const color = (type === "critical" && index % 3 === 0) || (type.startsWith("zone_") && index % 4 === 0)
          ? 0xffe7af : index % 3 === 0 ? 0xffffff : index % 3 === 1 ? 0xb9edff : 0x65c9ff;
        const spark = this.scene.add.rectangle(x, y, this._between(13, 24) * profile.sparkLength, profile.sparkWidth, color, 0.96)
          .setRotation(angle)
          .setDepth(this.flashDepth + 3);
        this._trackEffect(spark, true);
        this.scene.tweens.add({
          targets: spark,
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance,
          alpha: 0,
          scaleX: 0.35,
          duration: this.reducedMotion ? 120 : this._between(145, 225),
          ease: "Quad.easeOut",
          onComplete: () => this._releaseEffect(spark)
        });
      }

      return {
        stage: profile.stage,
        point: { x, y },
        ringCount: profile.ringRadii.length,
        ringRadii: profile.ringRadii.slice(),
        sparkCount: profile.sparkCount,
        flashCount: 2,
        directionAngle: slashAngle,
        speedIntensity: intensity,
        flashRadius: profile.flashRadius,
        sparkVelocityMultiplier: 1 + this.sparkVelocityBonus * intensity,
        visualType: type
      };
    }

    _impactProfile(combo, speedIntensity, type, sparkBonus) {
      if (typeof type === "boolean") type = type ? "critical" : "normal";
      type = type || "normal";
      const safeCombo = Math.max(0, Number(combo) || 0);
      const stage = safeCombo >= 10 ? 4 : safeCombo >= 5 ? 3 : safeCombo >= 3 ? 2 : 1;
      const critical = type === "critical";
      const zone = type.startsWith("zone_");
      const issen = type.endsWith("issen");
      if (this.reducedMotion) {
        return {
          stage,
          flashRadius: 12,
          flashScale: 1.7,
          ringRadii: [34],
          sparkCount: Math.min(4, this.baseSparkCount),
          sparkDistanceMin: 28, sparkDistanceMax: 48,
          sparkFan: .72, sparkWidth: 2.2, sparkLength: 1, haloAlpha: .42
        };
      }

      const flashRadii = [14, 16, 18, 20];
      const flashScales = [2, 2.15, 2.3, 2.4];
      const primaryRingRadius = this.hitRingRadii[stage - 1];
      let ringRadii = stage >= 3
        ? [primaryRingRadius, Math.max(34, primaryRingRadius - (stage === 4 ? 7 : 6))]
        : [primaryRingRadius];
      if (critical) ringRadii = [primaryRingRadius * .95];
      else if (type === "zone_issen") ringRadii = [primaryRingRadius * 1.48, primaryRingRadius * 1.08];
      else if (zone) ringRadii = ringRadii.map((radius) => radius * 1.28);
      else if (issen) ringRadii = [primaryRingRadius * 1.2, primaryRingRadius * .82];
      const sparkBoost = stage === 2 ? 2 : stage >= 3 ? 4 : 0;
      const minimumDistances = [38, 42, 48, 52];
      const maximumDistances = [72, 76, 82, 88];
      const intensity = Math.max(0, Math.min(1, Number(speedIntensity) || 0));
      return {
        stage,
        flashRadius: flashRadii[stage - 1] * (1 + this.flashSpeedBonus * intensity) * (issen ? 1.18 : zone ? 1.13 : 1),
        flashScale: flashScales[stage - 1],
        haloAlpha: zone ? .57 : critical ? .38 : .42,
        ringRadii,
        sparkCount: Math.min(this.maxHitSparks + 3,
          Math.min(this.maxSparkCount, this.baseSparkCount + sparkBoost) + Math.round(this.sparkSpeedBonusMax * intensity) +
          (critical ? Math.max(2, Math.min(3, Math.round(Number(sparkBonus) || 0))) : 0) +
          (zone ? 3 : 0) + (issen ? 2 : 0)
        ),
        sparkDistanceMin: minimumDistances[stage - 1] * (critical ? 1.18 : issen ? 1.3 : zone ? 1.12 : 1),
        sparkDistanceMax: maximumDistances[stage - 1] * (critical ? 1.18 : issen ? 1.3 : zone ? 1.12 : 1),
        sparkFan: critical ? .26 : issen ? .52 : .72,
        sparkWidth: critical ? 1.35 : zone ? 2.6 : 2.2,
        sparkLength: critical ? 1.4 : issen ? 1.2 : 1
      };
    }

    // 一本のスワイプの全軌跡を結び、複数Hitの「流れ」を見せる。
    // 同じGraphicsを重ね描きするので追加粒子の増殖がない。
    playIssenFlow(points, zone, releaseDelayMs) {
      if (!this.scene || !points || points.length < 2) return false;
      const first = points[0], last = points[points.length - 1];
      if (Math.hypot(last.x - first.x, last.y - first.y) < 65) return false;
      const delay = this.reducedMotion ? 0 : Math.max(0, Math.min(60, Number(releaseDelayMs) || 0));
      if (delay > 0) {
        const saved = points.slice();
        const timer = this.scene.time.delayedCall(delay, () => {
          this.pendingStageTimers.delete(timer);
          if (this.scene) this.playIssenFlow(saved, zone, 0);
        });
        this.pendingStageTimers.add(timer);
        return true;
      }
      const gold = Boolean(zone);
      const stream = this.scene.add.graphics().setDepth(903);
      const stroke = (width, color, alpha, offsetY) => {
        stream.lineStyle(width, color, alpha);
        for (let i = 1; i < points.length; i += 1) {
          stream.lineBetween(points[i - 1].x, points[i - 1].y + offsetY, points[i].x, points[i].y + offsetY);
        }
      };
      stroke(gold ? 45 : 27, gold ? 0x7fe9ff : 0x42afff, gold ? .22 : .19, 0);
      stroke(gold ? 23 : 13, 0xb9efff, gold ? .47 : .36, 0);
      if (gold) {
        stroke(7, 0xffe6aa, .80, -11);
        stroke(3, 0xfff3d0, .67, 15);
      } else stroke(2.4, 0x85dfff, .55, -9);
      stroke(gold ? 5.2 : 3.4, 0xffffff, .96, 0);
      // 刃の後ろへ短い流線を引き、別の刀には見せない。
      stroke(gold ? 2.5 : 1.6, gold ? 0xffe9b0 : 0xa9eaff, gold ? .58 : .4, -16);
      stream.fillStyle(0xffffff, gold ? .84 : .70);
      stream.fillCircle(last.x, last.y, gold ? 9 : 6);
      if (gold) {
        stream.lineStyle(2.6, 0xffe7af, .74);
        stream.strokeCircle(last.x, last.y, 22);
      }
      this._trackEffect(stream, false);
      this.scene.tweens.add({ targets: stream, alpha: 0,
        duration: this.reducedMotion ? 150 : gold ? 470 : 390,
        ease: "Quad.easeOut", onComplete: () => this._releaseEffect(stream) });
      return true;
    }

    _trackEffect(object, isImpact) {
      while (this.activeEffects.size >= this.maxImpactObjects) {
        const oldest = this.activeEffects.values().next().value;
        if (!oldest) break;
        if (this.scene && this.scene.tweens && typeof this.scene.tweens.killTweensOf === "function") {
          this.scene.tweens.killTweensOf(oldest);
        }
        this._releaseEffect(oldest);
      }
      this.activeEffects.add(object);
      if (isImpact) {
        this.activeImpactEffects.add(object);
        this.maxObservedImpactObjects = Math.max(this.maxObservedImpactObjects, this.activeImpactEffects.size);
        this._notifyImpactState();
      }
    }

    _releaseEffect(object) {
      this.activeEffects.delete(object);
      const wasImpact = this.activeImpactEffects.delete(object);
      if (object && typeof object.destroy === "function" && object.active !== false) object.destroy();
      if (wasImpact) this._notifyImpactState();
    }

    getImpactState() {
      return {
        active: this.activeImpactEffects.size,
        maximumObserved: this.maxObservedImpactObjects,
        limit: this.maxImpactObjects
      };
    }

    _notifyImpactState() {
      if (!this.onImpactState) return;
      try {
        this.onImpactState(this.getImpactState());
      } catch (_error) {
        // QA用コールバックの失敗でゲーム本体を止めない。
      }
    }

    _worldHitToLocal(hitPoint, target, rotation) {
      if (!hitPoint) return { x: 0, y: 0 };
      const dx = hitPoint.x - target.x;
      const dy = hitPoint.y - target.y;
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
    }

    _localToWorld(localPoint, target, rotation) {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      return {
        x: target.x + localPoint.x * cos - localPoint.y * sin,
        y: target.y + localPoint.x * sin + localPoint.y * cos
      };
    }

    _textureToLocal(texturePoint, textureWidth, textureHeight, displayWidth, displayHeight) {
      if (!texturePoint) return { x: 0, y: 0 };
      return {
        x: ((texturePoint.x - textureWidth / 2) / textureWidth) * displayWidth,
        y: ((texturePoint.y - textureHeight / 2) / textureHeight) * displayHeight
      };
    }

    _rotateVector(vector, angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: vector.x * cos - vector.y * sin,
        y: vector.x * sin + vector.y * cos
      };
    }

    _between(min, max) {
      return min + Math.random() * (max - min);
    }

    destroy() {
      if (!this.scene) return;
      for (const timer of this.pendingStageTimers) timer.remove(false);
      this.pendingStageTimers.clear();
      for (const [piece, textureKey] of Array.from(this.activePieces.entries())) {
        this._releasePiece(piece, textureKey, true);
      }
      this.pendingMoves.length = 0;
      for (const effect of Array.from(this.activeEffects)) {
        if (this.scene.tweens && typeof this.scene.tweens.killTweensOf === "function") this.scene.tweens.killTweensOf(effect);
        this._releaseEffect(effect);
      }
      this.activeImpactEffects.clear();
      this._notifyImpactState();
      for (const key of Array.from(this.dynamicTextureKeys)) this._removeTexture(key);
      this.scene = null;
    }

    static splitRectangleByLine(width, height, point, direction, minAreaRatio) {
      return splitRectangleByLine(width, height, point, direction, minAreaRatio);
    }

    static polygonArea(points) {
      return polygonArea(points);
    }

    static lineRectangleIntersections(width, height, point, direction) {
      return lineRectangleIntersections(width, height, point, direction);
    }
  }

  window.NinjaCore.CutEffectSystem = CutEffectSystem;
})();
