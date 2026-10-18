import * as THREE from "three";
import { NOISE_GLSL } from "../lib/noise.glsl.js";
import { glowSprite } from "../lib/glow.js";

const WATER = {
  deep: "#94cde6",
  light: "#e2f3ff",
  foam: "#fff8fc",
};

// Builds the outflow stream's water: a ribbon along the carved bed that fades
// in out of the pool, flows slowly, and fades away into the distance.
function createOutflow(w, { time, colorUniforms }) {
  const samples = w.outflow.samples;
  const length = w.outflow.length;
  const cols = 4;
  const positions = [];
  const uvs = [];
  const indices = [];

  samples.forEach((p, i) => {
    const a = samples[Math.max(0, i - 1)];
    const b = samples[Math.min(samples.length - 1, i + 1)];
    let nx = -(b.z - a.z);
    let nz = b.x - a.x;
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const off = (u - 0.5) * p.width;
      positions.push(p.x + nx * off, p.water, p.z + nz * off);
      uvs.push(u, p.s);
    }
    if (i > 0) {
      const row = (i - 1) * (cols + 1);
      for (let c = 0; c < cols; c++) {
        const k = row + c;
        indices.push(k, k + cols + 1, k + 1, k + 1, k + cols + 1, k + cols + 2);
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: time,
      uFadeIn: { value: new THREE.Vector2(w.poolRadius * 0.55, w.poolRadius * 1.1) },
      uFadeOut: { value: new THREE.Vector2(length - 30, length - 2) },
      ...colorUniforms,
    },
    fog: true,
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform vec2 uFadeIn, uFadeOut;
      uniform vec3 uDeep, uLight, uFoam;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        float flow = vUv.y - uTime * 1.1;
        float n = fbm(vec3(vUv.x * 2.5, flow * 0.3, uTime * 0.12));
        float glint = smoothstep(0.62, 0.8, fbm(vec3(vUv.x * 7.0, flow * 0.2, 5.0)));
        vec3 col = mix(uDeep, uLight, n * 0.8);
        col = mix(col, uFoam, glint * 0.35);
        float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
        float fade = smoothstep(uFadeIn.x, uFadeIn.y, vUv.y) * (1.0 - smoothstep(uFadeOut.x, uFadeOut.y, vUv.y));
        gl_FragColor = vec4(col, edge * fade * (0.78 + 0.15 * n));
        #include <fog_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  return mesh;
}

// Stream → waterfall → pool, following the hill built in createTerrain.
// The water is one ribbon mesh laid along the stream bed and over the cliff,
// with flowing streaks drawn in a shader; the pool has ripples spreading out
// from where the water lands, plus rising mist.
export function createWaterfall(terrain, { reduceMotion = false } = {}) {
  const w = terrain.water;
  const group = new THREE.Group();
  const timeScale = reduceMotion ? 0.2 : 1;

  // ── Path from the spring down to the pool ─────────────────────────────
  const at = (along) => ({
    x: w.hillCenter.x + w.dir.x * along,
    z: w.hillCenter.y + w.dir.y * along,
  });

  const raw = [];
  for (let a = w.springAlong; a <= w.poolAlong; a += 0.3) {
    const p = at(a);
    const h = terrain.heightAt(p.x, p.z);
    raw.push({ a, h });
    if (h + 0.2 < w.poolSurfaceY) break; // reached the water
  }
  // Where does the drop begin and end? The cliff is the first run of at
  // least four steep steps (a single dip near the spring doesn't count).
  const steep = raw.map((r, i) => i > 0 && (raw[i - 1].h - r.h) / 0.3 > 1.2);
  let fallStart = raw.length - 1;
  let fallEnd = raw.length - 1;
  for (let i = 1; i + 3 < raw.length; i++) {
    if (steep[i] && steep[i + 1] && steep[i + 2] && steep[i + 3]) {
      fallStart = i - 1;
      break;
    }
  }
  for (let i = raw.length - 1; i > fallStart; i--) {
    if (steep[i]) {
      fallEnd = i;
      break;
    }
  }

  const points = raw.map(({ a, h }, i) => {
    const t = fallEnd > fallStart ? (i - fallStart) / (fallEnd - fallStart) : 0;
    const inFall = i >= fallStart ? Math.min(1, Math.max(0, t)) : 0;
    // Shoot out from the lip and stay clear of the rock face on the way down.
    const push = i >= fallStart ? 0.9 + 1.8 * Math.min(1, inFall / 0.35) * (1 - 0.35 * inFall) : 0;
    const p = at(a + push);
    // Sit the water a little above the bed: the rendered ground is a coarser
    // version of heightAt and bulges up slightly in the hollow of the bed.
    const y = Math.max(h + 0.65, w.poolSurfaceY + 0.02);
    return { x: p.x, y, z: p.z, fall: i >= fallStart ? Math.min(1, inFall * 3) : 0, width: w.waterWidth(a) };
  });
  const last = points[points.length - 1];
  const landWidth = last.width + 0.8; // matches the ribbon's width where it lands
  const impact = new THREE.Vector3(last.x, w.poolSurfaceY, last.z);

  // ── Ribbon geometry ───────────────────────────────────────────────────
  const cols = 4;
  const positions = [];
  const uvs = [];
  const falls = [];
  const indices = [];
  let arc = 0;
  points.forEach((p, i) => {
    if (i > 0) {
      const q = points[i - 1];
      arc += Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    }
    const width = p.width + (i / points.length) * 0.8; // spreads a little as it falls
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const s = (u - 0.5) * width;
      positions.push(p.x + w.side.x * s, p.y, p.z + w.side.y * s);
      uvs.push(u, arc);
      falls.push(p.fall);
    }
    if (i > 0) {
      const row = (i - 1) * (cols + 1);
      for (let c = 0; c < cols; c++) {
        const a = row + c;
        const b = a + cols + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  });
  const ribbonGeom = new THREE.BufferGeometry();
  ribbonGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  ribbonGeom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  ribbonGeom.setAttribute("aFall", new THREE.Float32BufferAttribute(falls, 1));
  ribbonGeom.setIndex(indices);

  const colorUniforms = {
    uDeep: { value: new THREE.Color(WATER.deep) },
    uLight: { value: new THREE.Color(WATER.light) },
    uFoam: { value: new THREE.Color(WATER.foam) },
  };
  const time = { value: 0 };

  const ribbon = new THREE.Mesh(
    ribbonGeom,
    new THREE.ShaderMaterial({
      uniforms: { uTime: time, ...colorUniforms },
      vertexShader: /* glsl */ `
        attribute float aFall;
        varying vec2 vUv;
        varying float vFall;
        void main() {
          vUv = uv;
          vFall = aFall;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uDeep, uLight, uFoam;
        varying vec2 vUv;
        varying float vFall;
        ${NOISE_GLSL}
        void main() {
          float speed = mix(1.3, 6.5, vFall);
          float flow = vUv.y - uTime * speed;
          float n = fbm(vec3(vUv.x * 3.0, flow * 0.35, uTime * 0.15));
          float streak = smoothstep(0.5, 0.8, fbm(vec3(vUv.x * 11.0, flow * 0.12, 3.0)));
          vec3 col = mix(uDeep, uLight, n);
          col = mix(col, uFoam, streak * (0.25 + 0.65 * vFall));
          float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
          float alpha = edge * mix(0.8, 0.93, vFall) * (0.75 + 0.25 * n);
          alpha *= smoothstep(0.0, 1.5, vUv.y); // emerge at the spring
          gl_FragColor = vec4(col * (1.0 + 0.35 * vFall), alpha);
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  ribbon.renderOrder = 2;
  group.add(ribbon);

  // ── Outflow: the pool narrows into a stream that winds around the hill ──
  group.add(createOutflow(w, { time, colorUniforms }));

  // ── Pool ──────────────────────────────────────────────────────────────
  const poolR = w.poolRadius * 1.25;
  const poolGeom = new THREE.CircleGeometry(poolR, 72);
  poolGeom.rotateX(-Math.PI / 2);
  const pool = new THREE.Mesh(
    poolGeom,
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: time,
        uRadius: { value: poolR },
        uImpact: { value: new THREE.Vector2(impact.x - w.poolCenter.x, impact.z - w.poolCenter.y) },
        uSide: { value: new THREE.Vector2(w.side.x, w.side.y) },
        uHalfWidth: { value: landWidth / 2 },
        ...colorUniforms,
      },
      vertexShader: /* glsl */ `
        varying vec2 vLocal;
        void main() {
          vLocal = position.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uRadius;
        uniform vec2 uImpact, uSide;
        uniform float uHalfWidth;
        uniform vec3 uDeep, uLight, uFoam;
        varying vec2 vLocal;
        ${NOISE_GLSL}
        void main() {
          // Distance to the line where the curtain of water lands.
          vec2 rel = vLocal - uImpact;
          float along = clamp(dot(rel, uSide), -uHalfWidth, uHalfWidth);
          float d = length(rel - uSide * along);
          float ripple = (sin(d * 2.6 - uTime * 3.0) * 0.5 + 0.5) * exp(-d * 0.3);
          float n = fbm(vec3(vLocal * 0.6, uTime * 0.2));
          vec3 col = mix(uDeep, uLight, n * 0.6 + ripple * 0.5);
          float foam = smoothstep(2.8, 0.0, d) * (0.55 + 0.45 * fbm(vec3(vLocal * 2.0, uTime * 1.5)));
          col = mix(col, uFoam, foam);
          float r = length(vLocal) / uRadius;
          float alpha = smoothstep(1.0, 0.82, r) * 0.88;
          gl_FragColor = vec4(col, alpha);
        }`,
      transparent: true,
      depthWrite: false,
    }),
  );
  pool.position.set(w.poolCenter.x, w.poolSurfaceY, w.poolCenter.y);
  pool.renderOrder = 1;
  group.add(pool);

  // Soft aqua light so the pool glows onto the rocks around it.
  const poolLight = new THREE.PointLight(0xbfe8ff, 25, 18, 2);
  poolLight.position.set(impact.x, w.poolSurfaceY + 1.5, impact.z);
  group.add(poolLight);

  // ── Mist where the water lands ────────────────────────────────────────
  const mist = Array.from({ length: 26 }, (_, i) => {
    const s = glowSprite(0xfff2fa, 2, 0);
    s.userData = {
      phase: i / 26,
      // spread along the width of the curtain, a little in front of it
      along: (Math.random() - 0.5) * landWidth,
      out: Math.random() * 2,
    };
    group.add(s);
    return s;
  });

  // ── The spring: a little glowing crystal where the stream begins ──────
  const springPos = at(w.springAlong);
  const springY = terrain.heightAt(springPos.x, springPos.z);
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9, 0),
    new THREE.MeshStandardMaterial({
      color: "#d8fff1",
      emissive: new THREE.Color("#9ff0d6"),
      emissiveIntensity: 0.8,
      roughness: 0.2,
      flatShading: true,
    }),
  );
  crystal.position.set(springPos.x, springY + 1.6, springPos.z);
  group.add(crystal);
  const springGlow = glowSprite(0xc6ffe9, 7, 0.55);
  springGlow.position.copy(crystal.position);
  group.add(springGlow);

  return {
    object: group,
    impact,
    update(dt, t) {
      time.value += dt * timeScale;
      for (const s of mist) {
        const k = (s.userData.phase + time.value * 0.18) % 1;
        const { along, out } = s.userData;
        s.position.set(
          impact.x + w.side.x * along + w.dir.x * out * (0.6 + k),
          w.poolSurfaceY + k * 5,
          impact.z + w.side.y * along + w.dir.y * out * (0.6 + k),
        );
        s.scale.setScalar(2.5 + k * 4.5);
        s.material.opacity = 0.32 * Math.sin(k * Math.PI);
      }
      crystal.rotation.y += dt * 0.6;
      crystal.position.y = springY + 1.6 + (reduceMotion ? 0 : Math.sin(t * 1.5) * 0.15);
      springGlow.position.y = crystal.position.y;
    },
  };
}
