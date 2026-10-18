import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rng } from "../lib/random.js";

// Shiny, metallic cubes floating around the sphere, each wearing one photo
// on all its faces. They turn slowly and bob; tap one and it spins.
//
// The photo is both the colour and a soft self-glow, so it stays readable
// while the lacquered, metallic surface still mirrors the pastel sky.
export function createPhotoCubes(terrain, photos, { reduceMotion = false, seed = 13 } = {}) {
  const R = rng(seed);
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();

  // ── Where they go: spread around the landing zone, on open ground ──────
  const spots = [];
  const n = photos.length;
  for (let i = 0; i < n; i++) {
    let placed = null;
    for (let tries = 0; tries < 40 && !placed; tries++) {
      const a = (i / n) * Math.PI * 2 + (R() - 0.5) * 0.6;
      const r = 24 + R() * 55;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const flat = Math.abs(terrain.heightAt(x, z) - terrain.heightAt(x + 3, z + 3)) < 1.5;
      const clear =
        !terrain.isWet(x, z, 4) &&
        terrain.heightAt(x, z) < 4 && // not up on the hill
        spots.every((s) => Math.hypot(s.x - x, s.z - z) > 18);
      if (flat && clear) placed = { x, z };
    }
    spots.push(placed ?? { x: Math.cos((i / n) * Math.PI * 2) * 60, z: Math.sin((i / n) * Math.PI * 2) * 60 });
  }

  // ── Cubes ─────────────────────────────────────────────────────────────
  const cubes = photos.map((url, i) => {
    const size = 3.6 + R() * 1.4;
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.55,
      roughness: 0.14,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      emissive: 0xffffff,
      emissiveIntensity: 0.32,
      envMapIntensity: 1.3,
    });
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(size, size, size, 4, size * 0.08), material);
    const { x, z } = spots[i];
    const baseY = terrain.heightAt(x, z) + size * 0.5 + 1.2;
    mesh.position.set(x, baseY, z);
    mesh.rotation.set(0.12 * (R() - 0.5), R() * Math.PI * 2, 0.12 * (R() - 0.5));
    mesh.userData = { baseY, size, phase: R() * Math.PI * 2, turn: 0.12 + R() * 0.12, spin: 0 };
    group.add(mesh);

    const loaded = loader
      .loadAsync(url)
      .then((tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        material.map = tex;
        material.emissiveMap = tex;
        material.needsUpdate = true;
      })
      .catch((err) => console.warn(`Couldn't load cube photo ${url}`, err));
    return { mesh, loaded };
  });

  return {
    object: group,
    meshes: cubes.map((c) => c.mesh),
    ready: Promise.all(cubes.map((c) => c.loaded)),
    // Tap: a quick spin.
    spin(mesh) {
      mesh.userData.spin = 6;
    },
    update(dt, time) {
      for (const { mesh } of cubes) {
        const u = mesh.userData;
        u.spin *= Math.pow(0.2, dt);
        mesh.rotation.y += dt * (reduceMotion ? 0.03 : u.turn) + dt * u.spin;
        mesh.position.y = u.baseY + (reduceMotion ? 0 : Math.sin(time * 0.8 + u.phase) * 0.35);
      }
    },
  };
}
