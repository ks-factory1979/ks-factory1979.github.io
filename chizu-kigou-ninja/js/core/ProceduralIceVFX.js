(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};

  // Coverage, cracks and highlights reference the Ice Covering concept by
  // Nathanael C. Fritz (MIT). All cells/noise are generated here without assets.
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

vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))) + uSeed) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i).x, hash2(i + vec2(1.0, 0.0)).x, f.x),
             mix(hash2(i + vec2(0.0, 1.0)).x, hash2(i + 1.0).x, f.x), f.y);
}
vec3 cells(vec2 p) {
  vec2 cell = floor(p), local = fract(p);
  float first = 10.0, second = 10.0, id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 randomPoint = hash2(cell + offset);
      vec2 delta = offset + 0.2 + randomPoint * 0.6 - local;
      float d = dot(delta, delta);
      if (d < first) { second = first; first = d; id = randomPoint.x; }
      else if (d < second) second = d;
    }
  }
  return vec3(sqrt(first), sqrt(second) - sqrt(first), id);
}
void main() {
  vec2 world = vec2((outTexCoord.x - 0.5) * uSize.x, (0.5 - outTexCoord.y) * uSize.y);
  float worldY = world.y + uY;
  if (worldY < uBounds.x || worldY > uBounds.y) discard;
  vec2 p = vec2(dot(world, uAxis), dot(world, vec2(-uAxis.y, uAxis.x))) / uScale;
  vec2 uv = p / vec2(174.0, 106.0);
  float growth = 0.10 + 0.90 * smoothstep(0.0, 0.28, uProgress);
  float grain = noise(p * 0.065);
  float outline = length(uv) + (grain - 0.5) * 0.17;
  float coverage = 1.0 - smoothstep(growth - 0.035, growth + 0.025, outline);
  if (coverage < 0.001) discard;
  vec3 cell = cells(p / 42.0);
  float crackGrowth = smoothstep(0.10, 0.34, uProgress);
  float breakup = smoothstep(0.40, 0.91, uProgress);
  float gap = 0.014 + breakup * 0.14;
  float edge = exp2(-pow((cell.y - gap - 0.038) / 0.038, 2.0)) * crackGrowth;
  float split = mix(1.0, smoothstep(gap, gap + 0.018, cell.y), crackGrowth);
  float frostRim = exp2(-pow((outline - growth + 0.028) / 0.065, 2.0));
  float shine = exp2(-pow((uv.x * 0.6 + uv.y * 0.8 + 0.8 - uProgress * 2.4) / 0.18, 2.0));
  float facet = 0.20 + cell.z * 0.30 + cell.x * 0.16;
  float frost = pow(grain, 3.0) * 0.7;
  if (uDetail > 0.5) frost += pow(noise(p * 0.28), 8.0) * 0.6;
  vec3 color = mix(vec3(0.10, 0.48, 0.71), vec3(0.56, 0.91, 1.0), facet + frost);
  color = mix(color, vec3(0.88, 0.98, 1.0), clamp(edge * 0.9 + frostRim * 0.55 + shine * 0.52, 0.0, 1.0));
  float alpha = (0.26 + facet * 0.24 + frost * 0.30 + edge * 0.48 + frostRim * 0.32 + shine * 0.18);
  float fade = pow(1.0 - uProgress, 0.65) * (1.0 - smoothstep(0.56 + cell.z * 0.16, 1.0, uProgress));
  alpha = clamp(alpha, 0.0, 0.92) * coverage * split * fade * uOpacity;
  gl_FragColor = vec4(color * alpha, alpha);
}`;

  class ProceduralIceVFX {
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
          // Phaser caches programs by name, rather than fragment-source contents.
          // A distinct name keeps ice independent of the lightning ShaderQuad.
          const shader = scene.add.shader({ shaderName: "NinjaIceFrostV1", fragmentSource, setupUniforms: set => {
            set("uSize", slot.size); set("uAxis", slot.axis); set("uBounds", slot.bounds);
            set("uY", slot.y); set("uScale", slot.scale); set("uProgress", slot.progress);
            set("uSeed", slot.seed); set("uDetail", slot.detail);
            set("uOpacity", this.opacity);
          } }, 0, 0, 1, 1).setDepth(174).setBlendMode("NORMAL").setVisible(false);
          slot.shader = shader; this.slots.push(slot); this.quads.push(shader.renderNode);
        }
      } catch (error) { this.destroy(); throw error; }
    }
    beginFrame() {
      this.used = 0;
      for (const slot of this.slots) slot.shader.setVisible(false);
    }
    draw(p, bounds, pressure) {
      // Newest hits replace older decoration when all drawing slots are in use.
      const slot = this.slots[this.used++ % this.capacity];
      const ux = Math.cos(p.cutAngle), uy = Math.sin(p.cutAngle), scale = p.size;
      slot.size[0] = Math.ceil((Math.abs(ux) * 380 + Math.abs(uy) * 244) * scale);
      slot.size[1] = Math.ceil((Math.abs(uy) * 380 + Math.abs(ux) * 244) * scale);
      slot.axis[0] = ux; slot.axis[1] = uy; slot.bounds[0] = bounds.top; slot.bounds[1] = bounds.bottom;
      slot.y = p.y; slot.scale = scale; slot.progress = p.age / p.life;
      slot.seed = p.phase; slot.detail = this.low || pressure ? 0 : 1;
      slot.shader.setPosition(p.x, p.y).setSize(slot.size[0], slot.size[1]).setOrigin(.5).setVisible(true);
      this.draws++;
    }
    reset() { this.beginFrame(); }
    getState() {
      return { mode: "frost-webgl", textures: 0, surfaceCapacity: this.capacity,
        visibleSurfaces: Math.min(this.used, this.capacity), draws: this.draws };
    }
    destroy() {
      if (!this.scene) return;
      const renderer = this.scene.sys.renderer;
      // Retain private quads across Phaser 4.2.1 scene shutdown for VAO/VBO cleanup.
      // The compiled program is shared and stays in Phaser's cache.
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
  window.NinjaCore.ProceduralIceVFX = ProceduralIceVFX;
})();
