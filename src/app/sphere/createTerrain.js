import * as THREE from "three";
import { createNoise2D, smoothstep } from "../lib/noise.js";
import { rng } from "../lib/random.js";
import { PASTEL } from "./palette.js";

// A moon-like landscape: a calm, gently cratered landing area in the middle,
// rolling hills further out and a ring of ridged mountains on the horizon.
// Colours are pastel and come from height, slope and crater shape.
export function createTerrain({ size = 640, segments = 320, seed = 5 } = {}) {
  const N = createNoise2D(seed);
  const R = rng(seed + 1);

  // ── Craters ───────────────────────────────────────────────────────────
  const craters = [];
  for (let i = 0; i < 70; i++) {
    const a = R() * Math.PI * 2;
    const dist = 20 + Math.pow(R(), 0.6) * 280;
    const big = dist > 70 && R() < 0.35;
    const r = big ? 18 + R() * 40 : 2.5 + R() * 9;
    craters.push({ x: Math.cos(a) * dist, z: Math.sin(a) * dist, r, depth: r * (big ? 0.22 : 0.18) });
  }
  // Small shallow ones around the landing spot (kept clear of the very centre).
  for (let i = 0; i < 12; i++) {
    const a = R() * Math.PI * 2;
    const dist = 9 + R() * 40;
    const r = 1.5 + R() * 3.5;
    craters.push({ x: Math.cos(a) * dist, z: Math.sin(a) * dist, r, depth: r * 0.15 });
  }

  // Returns { h, floor, rim } so colouring can tell crater floors and rims apart.
  function craterAt(x, z) {
    let h = 0;
    let floor = 0;
    let rim = 0;
    for (const c of craters) {
      const dx = x - c.x;
      const dz = z - c.z;
      const d2 = dx * dx + dz * dz;
      const reach = c.r * 1.8;
      if (d2 > reach * reach) continue;
      const d = Math.sqrt(d2) / c.r;
      if (d < 1) {
        h += (d * d - 1) * c.depth;
        floor = Math.max(floor, 1 - d);
      }
      const k = (d - 1) / 0.28;
      h += c.depth * 0.45 * Math.exp(-k * k);
      const kr = (d - 1) / 0.2;
      rim = Math.max(rim, Math.exp(-kr * kr));
    }
    return { h, floor, rim };
  }

  function baseHeight(x, z) {
    const r = Math.hypot(x, z);
    const far = smoothstep(40, 160, r);
    const horizon = smoothstep(110, 300, r);
    return (
      N.fbm(x * 0.01, z * 0.01, 5) * 14 * far +
      N.ridge(x * 0.006 + 3, z * 0.006, 4) * 38 * horizon +
      N.fbm(x * 0.06, z * 0.06, 3) * 1.2
    );
  }

  function heightAt(x, z) {
    return baseHeight(x, z) + craterAt(x, z).h;
  }

  // ── Geometry ──────────────────────────────────────────────────────────
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  const floors = new Float32Array(pos.count);
  const rims = new Float32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const c = craterAt(x, z);
    pos.setY(i, baseHeight(x, z) + c.h);
    floors[i] = c.floor;
    rims[i] = c.rim;
  }
  geometry.computeVertexNormals();

  // ── Pastel colouring ──────────────────────────────────────────────────
  const C = Object.fromEntries(Object.entries(PASTEL).map(([k, v]) => [k, new THREE.Color(v)]));
  const ramp = [C.lavender, C.pink, C.peach, C.cream];
  const shade = C.lavender.clone().multiplyScalar(0.82);
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  const normals = geometry.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const t = Math.min(0.999, Math.max(0, (y + 6) / 40));
    const f = t * (ramp.length - 1);
    const i0 = Math.floor(f);
    col.copy(ramp[i0]).lerp(ramp[i0 + 1], f - i0);

    const patch = N.fbm(x * 0.03 + 50, z * 0.03, 3);
    col.lerp(C.mint, smoothstep(0.12, 0.45, patch) * 0.55);
    col.lerp(C.lilac, floors[i] * 0.7);
    col.lerp(C.cream, rims[i] * 0.65);
    const slope = 1 - normals.getY(i);
    col.lerp(shade, Math.min(1, slope * 2.2) * 0.6);
    col.multiplyScalar(0.94 + R() * 0.08);

    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 }),
  );

  return { object: mesh, heightAt };
}
