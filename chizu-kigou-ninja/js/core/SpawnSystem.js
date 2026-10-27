(function () {
  "use strict";

  window.NinjaCore = window.NinjaCore || {};

  class SpawnSystem {
    constructor(scene, options) {
      this.scene = scene;
      this.width = options.width;
      this.height = options.height;
      this.gravity = options.gravity;
      this.velocityXMin = options.velocityXMin;
      this.velocityXMax = options.velocityXMax;
      this.velocityYMin = options.velocityYMin;
      this.velocityYMax = options.velocityYMax;
      this.margin = options.margin || 180;
      this.activeObjects = new Set();
      this.nextId = 1;
      this.lanes = [0.20, 0.50, 0.80];
    }

    launch(gameObject, overrides) {
      const options = overrides || {};
      const laneRatio = options.laneRatio !== undefined ? options.laneRatio : this._pick(this.lanes);
      const x = options.x !== undefined ? options.x : this.width * laneRatio;
      const y = options.y !== undefined ? options.y : this.height + 82;
      const speedX = this._between(this.velocityXMin, this.velocityXMax);
      let vx;

      if (laneRatio < 0.34) vx = speedX;
      else if (laneRatio > 0.66) vx = -speedX;
      else vx = this._between(-speedX * 0.48, speedX * 0.48);

      gameObject.setPosition(x, y);
      gameObject.__ninjaId = this.nextId;
      gameObject.__flight = {
        vx: options.vx !== undefined ? options.vx : vx,
        vy: options.vy !== undefined ? options.vy : -this._between(this.velocityYMin, this.velocityYMax)
      };
      gameObject.__cut = false;
      if (Number.isFinite(options.angularVelocity)) gameObject.__flight.angularVelocity = options.angularVelocity;
      this.nextId += 1;
      this.activeObjects.add(gameObject);
      return gameObject;
    }

    update(deltaMs) {
      const dt = Math.min(0.034, Math.max(0, deltaMs / 1000));
      for (const object of Array.from(this.activeObjects)) {
        if (!object || !object.active || !object.__flight) {
          this.activeObjects.delete(object);
          continue;
        }

        object.x += object.__flight.vx * dt;
        object.y += object.__flight.vy * dt;
        object.__flight.vy += this.gravity * dt;
        if (object.__flight.angularVelocity) object.rotation += object.__flight.angularVelocity * dt;

        const outsideBottom = object.y > this.height + this.margin && object.__flight.vy > 0;
        const outsideSide = object.x < -this.margin || object.x > this.width + this.margin;
        if (outsideBottom || outsideSide) this.remove(object, true);
      }
    }

    getActive() {
      return Array.from(this.activeObjects).filter((object) => object && object.active && !object.__cut);
    }

    remove(object, destroyObject) {
      if (!object) return;
      this.activeObjects.delete(object);
      object.__flight = null;
      if (destroyObject && object.active) object.destroy();
    }

    clear(fadeTime) {
      const duration = Number(fadeTime) || 0;
      for (const object of Array.from(this.activeObjects)) {
        this.activeObjects.delete(object);
        object.__flight = null;
        if (!object.active) continue;
        if (duration > 0) {
          this.scene.tweens.add({
            targets: object,
            alpha: 0,
            scaleX: object.scaleX * 0.86,
            scaleY: object.scaleY * 0.86,
            duration,
            ease: "Quad.easeIn",
            onComplete: () => object.active && object.destroy()
          });
        } else {
          object.destroy();
        }
      }
    }

    destroy() {
      this.clear(0);
      this.scene = null;
    }

    _pick(values) {
      return values[Math.floor(Math.random() * values.length)];
    }

    _between(min, max) {
      return min + Math.random() * (max - min);
    }
  }

  window.NinjaCore.SpawnSystem = SpawnSystem;
})();
