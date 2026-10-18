import * as THREE from "three";
import { rng } from "../lib/random.js";
import { glowSprite } from "../lib/glow.js";
import { HILL } from "./createTerrain.js";
import { asset } from "../lib/asset.js";

// The photo's overall colour, made light and pastel, for the cube's halo.
function haloColorFrom(image) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const g = c.getContext("2d");
  g.drawImage(image, 0, 0, 1, 1); // the browser averages the whole image
  const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
  const color = new THREE.Color(`rgb(${r}, ${gr}, ${b})`);
  const hsl = {};
  color.getHSL(hsl);
  return color.setHSL(hsl.h, Math.min(1, hsl.s * 1.4 + 0.25), 0.72);
}

// "Surprise" face for an Instagram cube: a big question mark on a warm
// pastel gradient, with a few sparkles. Tapping the cube reveals the post.
function surpriseFace(seed) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 512, 512);
  grd.addColorStop(0, "#f4c09f");
  grd.addColorStop(0.5, "#eeb1c4");
  grd.addColorStop(1, "#b6a3dc");
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 512);

  // Inner frame, like a mystery box panel.
  g.strokeStyle = "rgba(255,255,255,0.7)";
  g.lineWidth = 12;
  g.strokeRect(40, 40, 432, 432);

  // Sparkles (4-point stars) scattered around the question mark.
  const R = rng(seed);
  g.fillStyle = "rgba(255,255,255,0.85)";
  for (let k = 0; k < 7; k++) {
    const x = 80 + R() * 352;
    const y = 80 + R() * 352;
    if (Math.hypot(x - 256, y - 262) < 150) continue; // keep clear of the "?"
    const r = 8 + R() * 12;
    g.beginPath();
    g.moveTo(x, y - r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.quadraticCurveTo(x, y, x, y + r);
    g.quadraticCurveTo(x, y, x - r, y);
    g.quadraticCurveTo(x, y, x, y - r);
    g.fill();
  }

  // The big question mark, with a soft glow behind it.
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "600 330px Unbounded, 'Arial Black', sans-serif";
  g.shadowColor = "rgba(255, 245, 235, 0.9)";
  g.shadowBlur = 40;
  g.fillStyle = "#fff8f2";
  g.fillText("?", 256, 270);
  g.shadowBlur = 0;
  g.lineWidth = 6;
  g.strokeStyle = "rgba(58, 34, 56, 0.35)";
  g.strokeText("?", 256, 270);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A cube with rounded edges, built from a subdivided box: every vertex is
// pulled onto a rounded shell. Keeps the box's per-face UVs, so each face
// shows the whole photo.
function roundedCube(size, radius, segments = 24) {
  const geometry = new THREE.BoxGeometry(size, size, size, segments, segments, segments);
  const pos = geometry.attributes.position;
  const nrm = geometry.attributes.normal;
  const inner = size / 2 - radius;
  const p = new THREE.Vector3();
  const core = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    core.set(
      THREE.MathUtils.clamp(p.x, -inner, inner),
      THREE.MathUtils.clamp(p.y, -inner, inner),
      THREE.MathUtils.clamp(p.z, -inner, inner),
    );
    const out = p.sub(core);
    if (out.lengthSq() < 1e-12) continue; // flat middle of a face: unchanged
    out.normalize();
    nrm.setXYZ(i, out.x, out.y, out.z);
    pos.setXYZ(i, core.x + out.x * radius, core.y + out.y * radius, core.z + out.z * radius);
  }
  return geometry;
}

// Shiny, metallic cubes floating around the sphere, each wearing one photo
// on all its faces. They turn slowly and bob; tap one and it spins.
//
// `items` are image paths, or { image, post } objects for Instagram cubes
// (`post` is stored on the cube so a tap can open it; `image` may be null,
// which shows a "surprise" question-mark face).
//
// The photo is both the colour and a soft self-glow, so it stays readable
// while the lacquered, metallic surface still mirrors the pastel sky.
export function createPhotoCubes(terrain, items, { reduceMotion = false, seed = 13 } = {}) {
  const photos = items.map((it) => (typeof it === "string" ? { image: it } : it));
  const R = rng(seed);
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();

  // ── Where they go: scattered widely, a few near the landing zone and the
  // rest far out on the plains, on fairly level ground off the hill and out
  // of the water. Alternating near/far keeps them spread in every direction.
  const spots = [];
  const n = photos.length;
  const offHill = (x, z) => Math.hypot(x - HILL.x, z - HILL.z) > HILL.radius + 8;
  for (let i = 0; i < n; i++) {
    const far = i % 2 === 1; // every other cube goes far out
    let placed = null;
    for (let tries = 0; tries < 80 && !placed; tries++) {
      const a = (i / n) * Math.PI * 2 + (R() - 0.5) * 0.7;
      const r = far ? 85 + R() * 105 : 28 + R() * 50;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const flat = Math.abs(terrain.heightAt(x, z) - terrain.heightAt(x + 3, z + 3)) < 2;
      const clear = !terrain.isWet(x, z, 4) && offHill(x, z) && spots.every((s) => Math.hypot(s.x - x, s.z - z) > 26);
      if (flat && clear) placed = { x, z };
    }
    const a = (i / n) * Math.PI * 2;
    spots.push(placed ?? { x: Math.cos(a) * (far ? 120 : 50), z: Math.sin(a) * (far ? 120 : 50) });
  }

  // ── Cubes ─────────────────────────────────────────────────────────────
  const cubes = photos.map((item, i) => {
    const size = 3.6 + R() * 1.4;
    // Near-mirror metal under a glassy lacquer, with a faint rainbow sheen.
    // The photo also lights itself a little so it reads through the reflections.
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      iridescence: 0.35,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [200, 700],
      emissive: 0xffffff,
      emissiveIntensity: 0.48,
      envMapIntensity: 2.2,
    });
    const mesh = new THREE.Mesh(roundedCube(size, size * 0.08), material);
    const { x, z } = spots[i];
    const baseY = terrain.heightAt(x, z) + size * 0.5 + 1.2;
    mesh.position.set(x, baseY, z);
    mesh.rotation.set(0.12 * (R() - 0.5), R() * Math.PI * 2, 0.12 * (R() - 0.5));
    mesh.userData = { baseY, size, phase: R() * Math.PI * 2, turn: 0.12 + R() * 0.12, spin: 0, post: item.post ?? null };
    group.add(mesh);

    // Glow around the cube, like the moon's: a soft inner halo and a wide,
    // faint outer one. Tinted from the photo once it loads.
    const halo = glowSprite(0xffe6f4, size * 3.4, 0.55);
    const haloWide = glowSprite(0xe9dcff, size * 7, 0.22);
    halo.position.copy(mesh.position);
    haloWide.position.copy(mesh.position);
    group.add(halo, haloWide);

    const loaded = (item.image ? loader.loadAsync(asset(item.image)) : Promise.resolve(surpriseFace(100 + i)))
      .then((tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        material.map = tex;
        material.emissiveMap = tex;
        material.needsUpdate = true;
        const tint = haloColorFrom(tex.image);
        halo.material.color.copy(tint);
        haloWide.material.color.copy(tint).lerp(new THREE.Color(0xe9dcff), 0.5);
      })
      .catch((err) => console.warn(`Couldn't load cube photo ${item.image}`, err));
    return { mesh, halo, haloWide, loaded };
  });

  return {
    object: group,
    meshes: cubes.map((c) => c.mesh),
    ready: Promise.all(cubes.map((c) => c.loaded)),
    // Tap: a quick spin, and the glow flares.
    spin(mesh) {
      mesh.userData.spin = 6;
    },
    update(dt, time) {
      for (const { mesh, halo, haloWide } of cubes) {
        const u = mesh.userData;
        u.spin *= Math.pow(0.2, dt);
        mesh.rotation.y += dt * (reduceMotion ? 0.03 : u.turn) + dt * u.spin;
        mesh.position.y = u.baseY + (reduceMotion ? 0 : Math.sin(time * 0.8 + u.phase) * 0.35);

        // Halo follows the cube and breathes slowly, flaring while it spins.
        halo.position.copy(mesh.position);
        haloWide.position.copy(mesh.position);
        const breathe = reduceMotion ? 1 : 1 + Math.sin(time * 0.9 + u.phase) * 0.12;
        const flare = Math.min(u.spin, 6) / 6;
        halo.material.opacity = 0.55 * breathe + flare * 0.35;
        haloWide.material.opacity = 0.22 * breathe + flare * 0.15;
        halo.scale.setScalar(u.size * (3.4 + flare * 0.8));
      }
    },
  };
}
