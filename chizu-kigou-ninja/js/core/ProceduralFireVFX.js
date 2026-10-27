(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};
  let serial = 0;

  // Adapted from Phaser's MIT-licensed "fire with simplex noise" example.
  // See THIRD_PARTY_NOTICES.md. No example image assets are used.
  class ProceduralFireVFX {
    static supported(scene) {
      return Boolean(scene && scene.sys && scene.sys.renderer && scene.sys.renderer.gl &&
        scene.add && scene.add.noisesimplex2d && scene.add.gradient && scene.add.renderTexture);
    }

    constructor(scene, quality, opacity = 1) {
      this.scene = scene;
      this.opacity = opacity;
      this.size = quality === "low" ? 96 : 160;
      this.capacity = quality === "low" ? 24 : 32;
      this.interval = quality === "low" ? 1000 / 30 : 1000 / 60;
      this.prefix = "ninja-fire-" + (++serial) + "-";
      this.objects = []; this.quads = []; this.sprites = []; this.keys = [];
      this.used = 0; this.updates = 0; this.lastUpdate = -Infinity;
      try { this.create(); }
      catch (error) { this.destroy(); throw error; }
    }

    keep(object) {
      this.objects.push(object);
      if (object.renderNode && object.renderNode.vertexBufferLayout) this.quads.push(object.renderNode);
      return object;
    }
    key(name) { const key = this.prefix + name; this.keys.push(key); return key; }

    create() {
      const scene = this.scene, s = this.size;
      const maskKey = this.key("mask"), noiseKey = this.key("noise");
      const warpKey = this.key("warp"), fireKey = this.key("surface");
      this.mask = this.keep(scene.add.gradient({
        bands: { colorStart: 0xffffff, colorEnd: 0x000000 },
        shapeMode: 2, start: { x: .5, y: .5 }, shape: { x: .5, y: 0 }
      }, 0, 0, s, s)).setRenderToTexture(maskKey).setVisible(false);
      this.noise = this.keep(scene.add.noisesimplex2d({
        noiseCells: [4, 4], noiseIterations: 3, noiseValueAdd: .2
      }, 0, 0, s, s)).setRenderToTexture(noiseKey).setVisible(false);
      this.warp = this.keep(scene.add.noisesimplex2d({
        noiseCells: [2, 2], noiseSeed: [11, 12], noiseIterations: 3,
        noiseNormalMap: true, noiseNormalScale: 2
      }, 0, 0, s, s)).setRenderToTexture(warpKey).setVisible(false);
      this.material = this.keep(scene.add.image(0, 0, noiseKey))
        .setOrigin(0).setVisible(false).enableFilters();
      this.material.filters.internal.addBlend(maskKey, Phaser.BlendModes.MULTIPLY);
      this.material.filters.internal.addDisplacement(warpKey, 1, 1);
      this.colorMap = this.material.filters.internal.addGradientMap({ ramp: [
        { colorStart: [0, 0, 0, 0], colorEnd: [.65, .035, .002, .15], size: .12 },
        { colorStart: [.65, .035, .002, .15], colorEnd: [1, .24, .005, .85], size: .18 },
        { colorStart: [1, .24, .005, .85], colorEnd: [1, .83, .12, 1], size: .32 },
        { colorStart: [1, .83, .12, 1], colorEnd: [1, .98, .73, 1], size: .38 }
      ] });
      // Explicit rendering lets us stop all noise/filter passes when no flame is alive.
      const renderer = scene.sys.renderer, existing = new Set(renderer.glTextureWrappers);
      this.surface = this.keep(scene.add.renderTexture(0, 0, s, s)).setVisible(false);
      // DynamicTexture in bundled 4.2.1 replaces its initial TextureSource allocation.
      // Discard only the unreferenced placeholder created by this constructor.
      const target = this.surface.texture.drawingContext.texture;
      for (const texture of renderer.glTextureWrappers.slice()) {
        if (!existing.has(texture) && texture !== target &&
          !this.surface.texture.source.some(source => source.glTexture === texture)) renderer.deleteTexture(texture);
      }
      this.surface.saveTexture(fireKey);
      for (let i = 0; i < this.capacity; i++) {
        this.sprites.push(scene.add.image(0, 0, fireKey).setOrigin(.5, 1)
          .setDepth(175).setVisible(false));
      }
      this.onRestore = () => { this.mask.renderImmediate(); this.lastUpdate = -Infinity; };
      scene.sys.renderer.on("restorewebgl", this.onRestore);
    }

    beginFrame() {
      this.used = 0;
      for (const sprite of this.sprites) sprite.setVisible(false);
    }

    draw(x, y, width, height, phase, alpha, bounds) {
      alpha *= this.opacity;
      if (height <= 0 || width <= 0 || alpha <= .005) return;
      const top = y - height;
      const first = Math.max(0, Math.ceil((bounds.top - top) / height * this.size));
      const last = Math.min(this.size, Math.floor((bounds.bottom - top) / height * this.size));
      if (last <= first) return;
      // Reuse the oldest drawing slot so a new hit keeps its flame in a crowd.
      const sprite = this.sprites[this.used++ % this.capacity];
      // Unrotated texture flames rise upward; their bases follow the swipe angle.
      sprite.setPosition(x, y).setDisplaySize(width, height).setAlpha(alpha)
        .setFlipX(Math.sin(phase) < 0).setCrop(0, first, this.size, last - first).setVisible(true);
    }

    endFrame(clock, pressure) {
      if (!this.used || this.scene.sys.renderer.contextLost ||
        clock - this.lastUpdate < (pressure ? 1000 / 30 : this.interval)) return;
      const t = clock / 1000;
      this.noise.noiseOffset[1] = -t * 6; this.noise.noiseFlow = t * 2;
      this.warp.noiseOffset[1] = -t * 2; this.warp.noiseFlow = t * 2;
      this.noise.renderImmediate(); this.warp.renderImmediate();
      this.surface.clear().draw(this.material).render();
      this.lastUpdate = clock; this.updates++;
    }

    reset() { this.beginFrame(); this.lastUpdate = -Infinity; }
    getState() {
      return { mode: "noise-webgl", textureSize: this.size, textures: this.keys.length + 2, sharedSurfaces: this.keys.length,
        spriteCapacity: this.capacity, visibleSprites: Math.min(this.used, this.capacity), textureUpdates: this.updates };
    }
    destroy() {
      if (!this.scene) return;
      const renderer = this.scene.sys.renderer;
      if (this.onRestore) renderer.off("restorewebgl", this.onRestore);
      if (this.colorMap && this.colorMap.ramp && this.colorMap.ramp.dataTexture.manager) this.colorMap.ramp.destroy();
      for (const sprite of this.sprites) if (sprite.active) sprite.destroy();
      // Remove texture consumers before their source Shader/DynamicTexture objects.
      // Keep these references even if Scene shutdown has already destroyed display objects.
      // Phaser 4.2.1 Shader.preDestroy drops its private ShaderQuad reference.
      // Its VAOs/buffer are ours; compiled programs remain in Phaser's shared cache.
      for (const node of this.quads) {
        for (const suite of Object.values(node.programManager.programs)) {
          const vao = suite.vao, index = renderer.glVAOWrappers.indexOf(vao);
          if (index >= 0) renderer.glVAOWrappers.splice(index, 1);
          vao.destroy();
        }
        renderer.deleteBuffer(node.vertexBufferLayout.buffer);
      }
      for (let i = this.objects.length - 1; i >= 0; i--) {
        const object = this.objects[i];
        if (object.active) object.destroy();
      }
      for (const key of this.keys) if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      this.sprites.length = 0; this.objects.length = 0; this.quads.length = 0; this.keys.length = 0;
      this.used = 0; this.scene = null;
    }
  }
  window.NinjaCore.ProceduralFireVFX = ProceduralFireVFX;
})();
