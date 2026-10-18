import * as THREE from "three";
import { rng } from "../lib/random.js";
import { PASTEL } from "./palette.js";
import { applyTriplanar } from "./triplanar.js";

// A boulder shape: an icosphere chipped by a few random flat cuts (the flat
// fractured faces real rocks have), plus a little lumpiness.
function boulderGeometry(R) {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();

  const cuts = Array.from({ length: 5 + Math.floor(R() * 4) }, () => ({
    n: new THREE.Vector3(R() - 0.5, (R() - 0.5) * 0.6, R() - 0.5).normalize(),
    c: 0.55 + R() * 0.3,
  }));
  cuts.push({ n: new THREE.Vector3(0, -1, 0), c: 0.45 }); // flat-ish bottom

  const lumps = new Map();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!lumps.has(key)) lumps.set(key, 0.92 + R() * 0.14);
    v.multiplyScalar(lumps.get(key));
    for (const { n, c } of cuts) {
      const over = v.dot(n) - c;
      if (over > 0) v.addScaledVector(n, -over);
    }
    v.y *= 0.8;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Pastel boulders scattered over the terrain, kept out of the stream and the
// pool, with a ring of bigger ones around the pool's edge.
export function createRocks(terrain, { count = 260, seed = 9 } = {}) {
  const R = rng(seed);
  const variants = 3;
  const group = new THREE.Group();

  const material = new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0, flatShading: true });
  const surface = applyTriplanar(material, {
    scale: 0.55,
    macroScale: 0.12,
    detailStrength: 0.7,
    normalStrength: 1.2,
    faceted: true,
  });

  const tints = [PASTEL.lavender, PASTEL.lilac, PASTEL.pink, PASTEL.peach, PASTEL.mint, PASTEL.cream].map(
    (c) => new THREE.Color(c),
  );

  // Build the full placement list first, then split it across the shape variants.
  const placements = [];
  let tries = 0;
  while (placements.length < count && tries < count * 4) {
    tries++;
    const a = R() * Math.PI * 2;
    const dist = 9 + Math.pow(R(), 0.7) * 260;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    const size = (0.25 + Math.pow(R(), 3) * 3.2) * (dist < 30 ? 0.6 : 1);
    if (terrain.isWet(x, z, size)) continue;
    placements.push({ x, z, size });
  }
  // Boulders on the pool's two flanks, leaving the waterfall side and the
  // view from the landing spot open.
  const w = terrain.water;
  const poolAngle = Math.atan2(w.dir.y, w.dir.x);
  for (let k = 0; k < 8; k++) {
    const flank = k % 2 ? 1 : -1;
    const a = poolAngle + flank * Math.PI * (0.42 + Math.floor(k / 2) * 0.11);
    const r = w.poolRadius * (1.45 + R() * 0.3);
    placements.push({
      x: w.poolCenter.x + Math.cos(a) * r,
      z: w.poolCenter.y + Math.sin(a) * r,
      size: 0.9 + R() * 1.3,
    });
  }

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const color = new THREE.Color();

  for (let vi = 0; vi < variants; vi++) {
    const mine = placements.filter((_, i) => i % variants === vi);
    const mesh = new THREE.InstancedMesh(boulderGeometry(R), material, mine.length);
    mine.forEach(({ x, z, size }, i) => {
      s.set(size * (0.8 + R() * 0.5), size * (0.7 + R() * 0.5), size * (0.8 + R() * 0.5));
      p.set(x, terrain.heightAt(x, z) + size * 0.15, z);
      q.setFromEuler(e.set((R() - 0.5) * 0.6, R() * 6.28, (R() - 0.5) * 0.6)); // mostly upright
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      color.copy(tints[(R() * tints.length) | 0]).multiplyScalar(0.85 + R() * 0.15);
      mesh.setColorAt(i, color);
    });
    group.add(mesh);
  }

  return { object: group, surface };
}
