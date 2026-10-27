(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};

  // Analytic curved blades, rotating wakes and thin streamlines; no textures.
  const fragmentSource = `
precision highp float;
varying vec2 outTexCoord;
uniform vec2 uSize;
uniform vec2 uAxis;
uniform vec2 uBounds;
uniform float uY;
uniform float uScale;
uniform float uProgress;
uniform float uSeed;
uniform float uDetail;
uniform float uOpacity;
const float TAU = 6.28318530718;

float glow(float distance, float width) {
  return exp2(-pow(distance / max(width, 0.25), 2.0));
}
void main() {
  vec2 world = vec2((outTexCoord.x - 0.5) * uSize.x, (0.5 - outTexCoord.y) * uSize.y);
  // Keep a one-pixel inset for rasterization of quads with odd dimensions.
  if (world.y + uY < uBounds.x + 1.0 || world.y + uY > uBounds.y - 1.0) discard;
  vec2 p = vec2(dot(world, uAxis), dot(world, vec2(-uAxis.y, uAxis.x))) / uScale;
  float t = uProgress;
  float travel = -70.0 + 180.0 * smoothstep(0.0, 0.32, t) + 60.0 * t;
  float height = 124.0 + 22.0 * sin(min(t / 0.4, 1.0) * 1.5708);
  float taper = pow(max(0.0, 1.0 - pow(p.y / height, 2.0)), 1.4);
  float blade = abs(p.x - travel + p.y * p.y / 205.0) / sqrt(1.0 + pow(p.y / 102.5, 2.0));
  float core = glow(blade, 0.65 + 2.2 * taper) * taper;
  float body = glow(blade, 2.0 + 7.0 * taper) * taper;
  float halo = glow(blade, 7.0 + 14.0 * taper) * taper * 0.48;

  // The wake keeps open gaps, with pointed heads rather than a filled disk.
  for (int i = 0; i < 3; i++) {
    float k = float(i);
    if (uDetail < 0.5 && i == 2) continue;
    vec2 radius = vec2(136.0 + k * 31.0 + t * 32.0, 48.0 + k * 26.0);
    vec2 q = (p - vec2(-8.0 + t * 56.0 - k * 12.0, 0.0)) / radius;
    float angle = mod(atan(q.y, q.x) - uSeed * 0.25 - k * 2.13 - t * 5.4 + TAU * 4.0, TAU);
    float arc = smoothstep(0.0, 0.38, angle) * (1.0 - smoothstep(3.4, 4.5, angle));
    float point = pow(max(sin(clamp(angle / 4.5, 0.0, 1.0) * 3.14159), 0.0), 0.7);
    float d = abs(length(q) - 1.0) * min(radius.x, radius.y);
    core += glow(d, 0.55 + 0.8 * point) * arc * 0.52;
    body += glow(d, 1.2 + 3.6 * point) * arc * 0.64;
    halo += glow(d, 5.0 + 4.0 * point) * arc * 0.20;
  }
  for (int i = 0; i < 8; i++) {
    if (uDetail < 0.5 && i >= 4) continue;
    float k = float(i), offset = (k - 3.5) * 22.0;
    float wave = sin(p.x * 0.015 + k * 1.7 + uSeed - t * 9.0);
    float curve = offset + wave * (9.0 + abs(offset) * 0.12);
    float lengthMask = smoothstep(-258.0 + k * 8.0, -200.0 + k * 8.0, p.x)
      * (1.0 - smoothstep(travel - 25.0 - k * 7.0, travel + 12.0 - k * 7.0, p.x));
    float d = abs(p.y - curve);
    core += glow(d, 0.65) * lengthMask * 0.30;
    body += glow(d, 1.8) * lengthMask * 0.18;
    halo += glow(d, 4.3) * lengthMask * 0.10;
  }
  float fade = smoothstep(0.0, 0.035, t) * pow(1.0 - t, 0.65) * (1.0 - smoothstep(0.52, 1.0, t));
  vec3 color = (vec3(0.18, 0.88, 0.64) * halo + vec3(0.42, 1.0, 0.76) * body
    + vec3(0.91, 1.0, 0.96) * core) * fade;
  float alpha = clamp((halo + body + core) * fade, 0.0, 1.0);
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(color * uOpacity, alpha * uOpacity);
}`;

  class ProceduralWindVFX {
    static supported(scene) {
      return Boolean(scene && scene.sys && scene.sys.renderer && scene.sys.renderer.gl && scene.add && scene.add.shader);
    }
    constructor(scene, quality, opacity = 1) {
      this.scene = scene; this.capacity = quality === "low" ? 2 : 3;
      this.opacity = opacity;
      this.low = quality === "low"; this.slots = []; this.quads = [];
      this.used = 0; this.draws = 0;
      try {
        for (let i = 0; i < this.capacity; i++) {
          const slot = { size: [1, 1], axis: [1, 0], bounds: [245, 690], y: 0,
            scale: 1, progress: 0, seed: 0, detail: 1 };
          // Phaser shares compiled programs by name; keep wind independent.
          const shader = scene.add.shader({ shaderName: "NinjaGaleWindV1", fragmentSource, setupUniforms: set => {
            set("uSize", slot.size); set("uAxis", slot.axis); set("uBounds", slot.bounds);
            set("uY", slot.y); set("uScale", slot.scale); set("uProgress", slot.progress);
            set("uSeed", slot.seed); set("uDetail", slot.detail);
            set("uOpacity", this.opacity);
          } }, 0, 0, 1, 1).setDepth(174).setBlendMode("ADD").setVisible(false);
          slot.shader = shader; this.slots.push(slot); this.quads.push(shader.renderNode);
        }
      } catch (error) { this.destroy(); throw error; }
    }
    beginFrame() {
      this.used = 0;
      for (const slot of this.slots) slot.shader.setVisible(false);
    }
    draw(p, bounds, pressure) {
      const slot = this.slots[this.used++ % this.capacity];
      const ux = Math.cos(p.cutAngle), uy = Math.sin(p.cutAngle), scale = p.size;
      slot.size[0] = Math.ceil((Math.abs(ux) * 580 + Math.abs(uy) * 344) * scale);
      slot.size[1] = Math.ceil((Math.abs(uy) * 580 + Math.abs(ux) * 344) * scale);
      slot.axis[0] = ux; slot.axis[1] = uy; slot.bounds[0] = bounds.top; slot.bounds[1] = bounds.bottom;
      slot.y = p.y; slot.scale = scale; slot.progress = p.age / p.life;
      slot.seed = p.phase; slot.detail = this.low || pressure ? 0 : 1;
      slot.shader.setPosition(p.x, p.y).setSize(slot.size[0], slot.size[1]).setOrigin(.5).setVisible(true);
      this.draws++;
    }
    reset() { this.beginFrame(); }
    getState() {
      return { mode: "gale-webgl", textures: 0, surfaceCapacity: this.capacity,
        visibleSurfaces: Math.min(this.used, this.capacity), draws: this.draws };
    }
    destroy() {
      if (!this.scene) return;
      const renderer = this.scene.sys.renderer;
      // Phaser 4.2.1 drops private quads during shutdown; release their VAO/VBO.
      // Shared compiled programs remain owned by Phaser's cache.
      for (const node of this.quads) {
        for (const suite of Object.values(node.programManager.programs)) {
          const vao = suite.vao, index = renderer.glVAOWrappers.indexOf(vao);
          if (index >= 0) renderer.glVAOWrappers.splice(index, 1);
          vao.destroy();
        }
        renderer.deleteBuffer(node.vertexBufferLayout.buffer);
      }
      for (const slot of this.slots) if (slot.shader.active) slot.shader.destroy();
      this.slots.length = 0; this.quads.length = 0; this.used = 0; this.scene = null;
    }
  }
  window.NinjaCore.ProceduralWindVFX = ProceduralWindVFX;
})();
