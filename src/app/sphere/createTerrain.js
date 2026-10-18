import * as THREE from "three";
import { createNoise2D, smoothstep } from "../lib/noise.js";
import { rng } from "../lib/random.js";
import { PASTEL } from "./palette.js";
import { applyTriplanar } from "./triplanar.js";

// The hill beside the landing spot. Its steep cliff faces the landing spot,
// a stream runs across its flat top and the waterfall pours into a pool below.
export const HILL = {
  x: -24,
  z: -37,
  radius: 26, // footprint on the gentle back side
  height: 24,
  cliff: 1.7, // how much steeper the side facing the landing is
  poolRadius: 7,
  springAlong: -5, // where the stream starts, measured along the hill's facing direction
  streamWidth: 3.4, // water width across the top
  fallWidth: 7, // water width going over the cliff
};

// A moon-like landscape: a calm, gently cratered landing area in the middle,
// the waterfall hill beside it, rolling hills further out and a ring of
// ridged mountains on the horizon. Colours are pastel and come from height,
// slope and crater shape; real surface detail comes from triplanar textures.
export function createTerrain({ size = 640, segments = 384, seed = 5 } = {}) {
  const N = createNoise2D(seed);
  const R = rng(seed + 1);

  // ── Hill frame: "along" points from the hill toward the landing spot ──
  const hc = new THREE.Vector2(HILL.x, HILL.z);
  const dir = hc.clone().negate().normalize();
  const lat = new THREE.Vector2(-dir.y, dir.x);
  const poolAlong = HILL.radius / HILL.cliff + 3;
  const poolCenter = hc.clone().addScaledVector(dir, poolAlong);
  const lipAlong = (HILL.radius * 0.42) / HILL.cliff; // where the flat top meets the cliff

  function hillFrame(x, z) {
    const vx = x - hc.x;
    const vz = z - hc.y;
    return { along: vx * dir.x + vz * dir.y, side: vx * lat.x + vz * lat.y };
  }

  // Water width at a point along the stream: narrow on top, wide over the cliff.
  function waterWidth(along) {
    const t = smoothstep(lipAlong - 1.5, lipAlong + 2, along);
    return HILL.streamWidth + (HILL.fallWidth - HILL.streamWidth) * t;
  }

  // 0..1 mask for the stream bed, from the spring all the way down the cliff.
  function channelMask(along, side) {
    const sigma = waterWidth(along) * 0.62;
    return Math.exp(-((side / sigma) ** 2)) * smoothstep(HILL.springAlong - 2, HILL.springAlong + 1, along);
  }

  // The hill's natural surface (before the stream bed is cut into it).
  function hillSurface(along, side) {
    const a = along > 0 ? along * HILL.cliff : along;
    const d = Math.hypot(a, side);
    if (d > HILL.radius) return { h: 0, shape: 0 };
    const shape = Math.pow(1 - smoothstep(HILL.radius * 0.42, HILL.radius, d), 1.2);
    const x = hc.x + dir.x * along + lat.x * side;
    const z = hc.y + dir.y * along + lat.y * side;
    const calm = 1 - channelMask(along, side) * 0.85; // smooth along the stream so water runs downhill
    let h = HILL.height * shape;
    h += N.fbm(x * 0.07, z * 0.07, 4) * 4.5 * shape * calm;
    h += N.ridge(x * 0.05 + 9, z * 0.05, 3) * 3.5 * shape * calm;
    h += -along * 0.12 * shape; // top tilts toward the cliff edge
    return { h, shape };
  }

  // 0..1: inside the flat-bottomed stream bed (as wide as the water), easing out to the banks.
  function bedMask(along, side) {
    const half = waterWidth(along) / 2;
    return (
      (1 - smoothstep(half - 0.2, half + 1.4, Math.abs(side))) *
      smoothstep(HILL.springAlong - 2, HILL.springAlong + 1, along)
    );
  }

  function hillHeight(x, z) {
    const { along, side } = hillFrame(x, z);
    const natural = hillSurface(along, side);
    const bed = bedMask(along, side);
    if (bed <= 0) return natural.h;
    // The bed is level across its width at the centre-line height, cut 1.2 m down,
    // so the water sits flat between the banks instead of being clipped by one of them.
    const centre = hillSurface(along, 0);
    const bedHeight = centre.h - 1.2 * centre.shape;
    return natural.h + (Math.min(natural.h, bedHeight) - natural.h) * bed;
  }

  function poolBowl(x, z) {
    const d = Math.hypot(x - poolCenter.x, z - poolCenter.y) / (HILL.poolRadius * 1.3);
    return d < 1 ? -2.0 * Math.pow(1 - d * d, 1.5) : 0;
  }

  // ── Craters (kept off the hill and the pool) ─────────────────────────
  const craters = [];
  const clearOfHill = (x, z, r) =>
    Math.hypot(x - hc.x, z - hc.y) > HILL.radius + r &&
    Math.hypot(x - poolCenter.x, z - poolCenter.y) > HILL.poolRadius * 1.6 + r;

  for (let i = 0; i < 70; i++) {
    const a = R() * Math.PI * 2;
    const dist = 20 + Math.pow(R(), 0.6) * 280;
    const big = dist > 70 && R() < 0.35;
    const r = big ? 18 + R() * 40 : 2.5 + R() * 9;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    if (clearOfHill(x, z, r * 1.8)) craters.push({ x, z, r, depth: r * (big ? 0.22 : 0.18) });
  }
  for (let i = 0; i < 12; i++) {
    const a = R() * Math.PI * 2;
    const dist = 9 + R() * 40;
    const r = 1.5 + R() * 3.5;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    if (clearOfHill(x, z, r * 1.8)) craters.push({ x, z, r, depth: r * 0.15 });
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
      N.fbm(x * 0.06, z * 0.06, 3) * 1.2 +
      hillHeight(x, z) +
      poolBowl(x, z)
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

  // ── Pool surface: just below the lowest point of its rim ──────────────
  let rimLow = Infinity;
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    const x = poolCenter.x + Math.cos(a) * HILL.poolRadius * 1.15;
    const z = poolCenter.y + Math.sin(a) * HILL.poolRadius * 1.15;
    rimLow = Math.min(rimLow, heightAt(x, z));
  }
  const poolSurfaceY = rimLow - 0.25;

  // ── Pastel colouring ──────────────────────────────────────────────────
  const C = Object.fromEntries(Object.entries(PASTEL).map(([k, v]) => [k, new THREE.Color(v)]));
  const ramp = [C.lavender, C.pink, C.peach, C.cream];
  const shade = C.lavender.clone().multiplyScalar(0.82);
  const wetBank = C.mint.clone().lerp(C.lilac, 0.4);
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

    // Damp, mossy-mint banks along the stream and around the pool.
    const { along, side } = hillFrame(x, z);
    const nearStream = channelMask(along, side * 0.7) * smoothstep(0.3, 2, hillHeight(x, z));
    const nearPool = 1 - smoothstep(HILL.poolRadius * 0.9, HILL.poolRadius * 1.9, Math.hypot(x - poolCenter.x, z - poolCenter.y));
    col.lerp(wetBank, Math.max(nearStream, nearPool) * 0.6);

    col.multiplyScalar(0.94 + R() * 0.08);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 });
  // Fine dust on flat ground, cracked stone on steep slopes.
  const surface = applyTriplanar(material, {
    scale: 0.22,
    macroScale: 0.025,
    detailStrength: 0.55,
    normalStrength: 1.1,
    steep: true,
  });
  const mesh = new THREE.Mesh(geometry, material);

  return {
    object: mesh,
    heightAt,
    surface,
    // Everything the waterfall needs to know about the hill.
    water: {
      dir,
      side: lat,
      hillCenter: hc,
      springAlong: HILL.springAlong,
      waterWidth,
      poolAlong,
      poolCenter,
      poolRadius: HILL.poolRadius,
      poolSurfaceY,
    },
    // True for spots rocks shouldn't land on (stream bed and pool).
    isWet(x, z, margin = 0) {
      if (Math.hypot(x - poolCenter.x, z - poolCenter.y) < HILL.poolRadius * 1.25 + margin) return true;
      const { along, side } = hillFrame(x, z);
      return along > HILL.springAlong - 2 && along < poolAlong && Math.abs(side) < waterWidth(along) / 2 + 1.5 + margin;
    },
  };
}
