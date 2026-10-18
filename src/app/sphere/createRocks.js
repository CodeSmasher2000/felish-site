import * as THREE from "three";
import { rng } from "../lib/random.js";
import { PASTEL } from "./palette.js";

// Faceted pastel boulders scattered over the terrain (one instanced mesh).
export function createRocks(terrain, { count = 260, seed = 9 } = {}) {
  const R = rng(seed);

  // Lumpy rock: jitter an icosphere, moving shared corners together so it stays closed.
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const pos = geometry.attributes.position;
  const offsets = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, 0.75 + R() * 0.45);
    const k = offsets.get(key);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.8, pos.getZ(i) * k);
  }
  geometry.computeVertexNormals();

  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, flatShading: true }),
    count,
  );

  const tints = [PASTEL.lavender, PASTEL.lilac, PASTEL.pink, PASTEL.peach, PASTEL.mint, PASTEL.cream].map(
    (c) => new THREE.Color(c),
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const a = R() * Math.PI * 2;
    const dist = 9 + Math.pow(R(), 0.7) * 260;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    const size = (0.25 + Math.pow(R(), 3) * 3.2) * (dist < 30 ? 0.6 : 1);
    s.set(size * (0.8 + R() * 0.5), size * (0.7 + R() * 0.5), size * (0.8 + R() * 0.5));
    p.set(x, terrain.heightAt(x, z) + size * 0.2, z);
    q.setFromEuler(e.set(R() * 6.28, R() * 6.28, R() * 6.28));
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    color.copy(tints[(R() * tints.length) | 0]).multiplyScalar(0.85 + R() * 0.15);
    mesh.setColorAt(i, color);
  }

  return { object: mesh };
}
