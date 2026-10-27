(function () {
  "use strict";
  window.NinjaCore = window.NinjaCore || {};

  // Moving noise bends a luminous core; forks are generated analytically.
  // Reference: lumenfruit's MIT electric-arc shader (THIRD_PARTY_NOTICES.md).
  // This is a Phaser 4 shader, with no external textures or offscreen passes.
  const fragmentSource = `
precision highp float;
varying vec2 outTexCoord;
uniform vec2 uSize;
uniform vec2 uAxis;
uniform vec2 uBounds;
uniform float uY;
uniform float uLength;
uniform float uScale;
uniform float uTime;
uniform float uSeed;
uniform float uAlpha;
uniform float uBranches;

float hash(float n) { return fract(sin(n * 12.9898 + 7.23) * 43758.5453); }
float movingNode(float n, float seed) {
  float clock = uTime * 9.0, tick = floor(clock), f = fract(clock);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash(n + seed * 31.0 + tick * 17.0),
             hash(n + seed * 31.0 + (tick + 1.0) * 17.0), f) * 2.0 - 1.0;
}
float zig(float t, float seed) {
  float n = floor(t);
  return mix(movingNode(n, seed), movingNode(n + 1.0, seed), fract(t));
}
float path(float t) {
  t = clamp(t, 0.0, 1.0);
  return sin(t * 3.14159265) * uScale *
    (zig(t * 14.0, uSeed) * 23.0 + zig(t * 37.0, uSeed + 8.0) * 4.5);
}
vec3 glow(float d, float scale) {
  float core = exp2(-d * d / (1.6 * scale * scale));
  float edge = exp2(-d / (3.2 * scale));
  float halo = exp2(-d / (13.0 * scale));
  return vec3(1.25, 1.35, 1.45) * core + vec3(0.13, 0.48, 1.0) * edge +
         vec3(0.19, 0.08, 0.52) * halo * 0.48;
}
void main() {
  vec2 world = vec2((outTexCoord.x - 0.5) * uSize.x, (0.5 - outTexCoord.y) * uSize.y);
  float worldY = world.y + uY;
  if (worldY < uBounds.x || worldY > uBounds.y) discard;
  vec2 p = vec2(dot(world, uAxis), dot(world, vec2(-uAxis.y, uAxis.x)));
  float t = p.x / uLength + 0.5;
  float endFade = smoothstep(0.0, 0.035, t) * (1.0 - smoothstep(0.965, 1.0, t));
  vec3 color = glow(abs(p.y - path(t)), uScale) * endFade;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= uBranches) break;
    float f = float(i), seed = uSeed + f * 3.7;
    float rootT = 0.13 + f * 0.14 + (hash(seed) - 0.5) * 0.045;
    vec2 root = vec2((rootT - 0.5) * uLength, path(rootT));
    float side = mod(f, 2.0) * 2.0 - 1.0;
    vec2 reach = vec2((hash(seed + 4.0) - 0.35) * 85.0,
                     side * (57.0 + hash(seed + 5.0) * 48.0)) * uScale;
    float len = length(reach);
    vec2 axis = reach / len, q = p - root;
    float s = dot(q, axis) / len;
    float bend = zig(s * 7.0, seed + 13.0) * sin(clamp(s, 0.0, 1.0) * 3.14159265) * 9.0 * uScale;
    float distance = abs(dot(q, vec2(-axis.y, axis.x)) - bend);
    float ends = smoothstep(-0.02, 0.025, s) * (1.0 - smoothstep(0.80, 1.0, s));
    color += glow(distance, uScale * 0.58) * ends * 0.72;
  }
  // Fade continuously: no alternating full-screen or bolt flashes.
  float opacity = uAlpha * (0.94 + 0.06 * sin(uTime * 25.0 + uSeed));
  gl_FragColor = vec4(color * opacity, opacity);
}`;

  class ProceduralLightningVFX {
    static supported(scene) {
      return Boolean(scene && scene.sys && scene.sys.renderer && scene.sys.renderer.gl && scene.add && scene.add.shader);
    }

    constructor(scene, quality, opacity = 1) {
      this.scene = scene;
      this.opacity = opacity;
      this.heroCapacity = quality === "low" ? 2 : 3;
      this.capacity = quality === "low" ? 4 : 6;
      this.low = quality === "low";
      this.slots = []; this.quads = [];
      this.heroes = 0; this.arcs = 0; this.draws = 0;
      try {
        for (let i = 0; i < this.capacity; i++) {
          const slot = { size: [1, 1], axis: [1, 0], bounds: [245, 690], y: 0,
            length: 1, scale: 1, time: 0, seed: 0, alpha: 0, branches: 0 };
          const shader = scene.add.shader({ fragmentSource, setupUniforms: set => {
            set("uSize", slot.size); set("uAxis", slot.axis); set("uBounds", slot.bounds);
            set("uY", slot.y); set("uLength", slot.length); set("uScale", slot.scale);
            set("uTime", slot.time); set("uSeed", slot.seed); set("uAlpha", slot.alpha);
            set("uBranches", slot.branches);
          } }, 0, 0, 1, 1).setDepth(177).setBlendMode("ADD").setVisible(false);
          slot.shader = shader; this.slots.push(slot); this.quads.push(shader.renderNode);
        }
      } catch (error) { this.destroy(); throw error; }
    }

    beginFrame() {
      this.heroes = 0; this.arcs = 0;
      for (const slot of this.slots) slot.shader.setVisible(false);
    }

    draw(p, bounds, pressure) {
      const hero = p.hero;
      // Separate reservations keep the main stroke visible in a crowded burst.
      const limit = hero ? this.heroCapacity : this.capacity - this.heroCapacity;
      const used = hero ? this.heroes : this.arcs;
      if (used >= limit) return;
      const slot = this.slots[hero ? this.heroes++ : this.heroCapacity + this.arcs++];
      const angle = hero ? p.cutAngle : p.rotation, ux = Math.cos(angle), uy = Math.sin(angle);
      const length = hero ? 380 * p.size : Math.hypot(p.boltX[6], p.boltY[6]);
      const scale = hero ? p.size : .48;
      const span = 260 * scale, margin = 72 * scale;
      slot.size[0] = Math.ceil(Math.abs(ux) * length + Math.abs(uy) * span + margin);
      slot.size[1] = Math.ceil(Math.abs(uy) * length + Math.abs(ux) * span + margin);
      slot.axis[0] = ux; slot.axis[1] = uy;
      slot.bounds[0] = bounds.top; slot.bounds[1] = bounds.bottom;
      const x = p.x + (hero ? 0 : ux * length / 2);
      slot.y = p.y + (hero ? 0 : uy * length / 2);
      slot.length = length; slot.scale = scale; slot.time = p.age / 1000;
      slot.seed = p.phase; slot.alpha = p.alpha * Math.pow(1 - p.age / p.life, 1.1) * this.opacity;
      slot.branches = hero ? (this.low || pressure ? 3 : 6) : p.branch ? 2 : 0;
      slot.shader.setPosition(x, slot.y).setSize(slot.size[0], slot.size[1]).setOrigin(.5).setVisible(true);
      this.draws++;
    }

    reset() { this.beginFrame(); }
    getState() {
      return { mode: "procedural-webgl", textures: 0, shaderCapacity: this.capacity,
        visibleShaders: this.heroes + this.arcs, mainStrokes: this.heroes, arcs: this.arcs, draws: this.draws };
    }
    destroy() {
      if (!this.scene) return;
      const renderer = this.scene.sys.renderer;
      // Bundled Shader.preDestroy drops its quad without releasing its VAOs/VBO.
      // Retain quad references across scene shutdown; leave shared programs cached.
      for (const node of this.quads) {
        for (const suite of Object.values(node.programManager.programs)) {
          const vao = suite.vao, index = renderer.glVAOWrappers.indexOf(vao);
          if (index >= 0) renderer.glVAOWrappers.splice(index, 1);
          vao.destroy();
        }
        renderer.deleteBuffer(node.vertexBufferLayout.buffer);
      }
      for (const slot of this.slots) if (slot.shader.active) slot.shader.destroy();
      this.slots.length = 0; this.quads.length = 0; this.heroes = 0; this.arcs = 0; this.scene = null;
    }
  }
  window.NinjaCore.ProceduralLightningVFX = ProceduralLightningVFX;
})();
