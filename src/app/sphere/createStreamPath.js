import { smoothstep } from "../lib/noise.js";

// A stream that carves its own bed into the ground.
//
// Given a few control points, it builds a smooth path, samples the ground
// along it and works out a water level that only ever goes down (so the
// water always flows downhill). The bed is cut below that level wherever the
// ground is higher; dips get filled by the water surface instead of the
// stream floating above them.

// Uniform Catmull-Rom through 2D points, sampled about every `spacing` units.
function smoothPath(ctrl, spacing) {
  const pts = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    const steps = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / spacing));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  out.push({ ...ctrl[ctrl.length - 1] });
  return out;
}

/**
 * @param ctrl         control points [{x, z}] from source to end
 * @param groundAt     (x, z) → ground height before the stream is cut
 * @param startLevel   water level where the stream begins (e.g. the pool surface)
 * @param widthAt      (t: 0..1 along the stream) → water width
 * @param bankDepth    how far the water sits below the surrounding ground
 * @param drop         gentle fall per unit of length, so it always runs downhill
 */
export function createStreamPath({ ctrl, groundAt, startLevel, widthAt, bankDepth = 0.55, drop = 0.006 }) {
  const samples = smoothPath(ctrl, 0.45);

  // Arc length, ground under the centre line, and a level that never rises.
  let s = 0;
  let level = startLevel;
  samples.forEach((p, i) => {
    if (i > 0) s += Math.hypot(p.x - samples[i - 1].x, p.z - samples[i - 1].z);
    p.s = s;
    const ground = groundAt(p.x, p.z);
    level = Math.min(level - (i > 0 ? drop * (p.s - samples[i - 1].s) : 0), ground - bankDepth);
    p.water = level;
  });
  const length = s;
  samples.forEach((p) => {
    p.t = p.s / length;
    p.width = widthAt(p.t);
    p.bed = p.water - 0.5; // water depth
  });

  // Coarse grid of samples for fast "nearest point on the stream" lookups.
  const CELL = 8;
  const grid = new Map();
  const key = (cx, cz) => `${cx},${cz}`;
  samples.forEach((p, i) => {
    const k = key(Math.floor(p.x / CELL), Math.floor(p.z / CELL));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  });
  const maxReach = Math.max(...samples.map((p) => p.width)) / 2 + 2;

  // Nearest sample within reach, or null.
  function nearest(x, z) {
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    let best = null;
    let bestD = maxReach;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = grid.get(key(cx + dx, cz + dz));
        if (!list) continue;
        for (const i of list) {
          const p = samples[i];
          const d = Math.hypot(x - p.x, z - p.z);
          if (d < bestD) {
            bestD = d;
            best = p;
          }
        }
      }
    }
    return best ? { p: best, d: bestD } : null;
  }

  return {
    samples,
    length,
    // Cut the bed into ground height h at (x, z). Flat-bottomed, with banks
    // easing out over ~1.8 units on each side.
    carve(x, z, h) {
      const n = nearest(x, z);
      if (!n) return h;
      const half = n.p.width / 2;
      const m = 1 - smoothstep(half - 0.2, half + 1.8, n.d);
      if (m <= 0) return h;
      const bed = n.p.bed + 0.35 * smoothstep(0, half, n.d); // slightly deeper in the middle
      return h + (Math.min(h, bed) - h) * m;
    },
    // 0..1: how close (x, z) is to the water (for damp banks).
    wetness(x, z) {
      const n = nearest(x, z);
      return n ? 1 - smoothstep(n.p.width / 2, n.p.width / 2 + 1.8, n.d) : 0;
    },
    isNear(x, z, margin) {
      const n = nearest(x, z);
      return !!n && n.d < n.p.width / 2 + 1.5 + margin;
    },
  };
}
