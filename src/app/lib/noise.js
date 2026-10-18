import { rng } from "./random.js";

// Seeded 2D value noise for building terrain on the CPU.
//   noise(x, y)  → about -1..1
//   fbm(x, y)    → layered noise, about -1..1
//   ridge(x, y)  → sharp ridgelines, 0..1
export function createNoise2D(seed = 1) {
  const R = rng(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const values = Float32Array.from({ length: 256 }, () => R() * 2 - 1);

  const lattice = (ix, iy) => values[perm[(ix & 255) + perm[iy & 255]]];

  function noise(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = lattice(ix, iy);
    const b = lattice(ix + 1, iy);
    const c = lattice(ix, iy + 1);
    const d = lattice(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm(x, y, octaves = 5) {
    let v = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < octaves; i++) {
      v += amp * noise(x * freq, y * freq);
      freq *= 2.03;
      amp *= 0.5;
    }
    return v;
  }

  function ridge(x, y, octaves = 4) {
    let v = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(noise(x * freq, y * freq));
      v += amp * n * n;
      freq *= 2.03;
      amp *= 0.5;
    }
    return v;
  }

  return { noise, fbm, ridge };
}

export const smoothstep = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
