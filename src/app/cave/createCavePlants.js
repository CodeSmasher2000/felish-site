import * as THREE from "three";
import { rng } from "../lib/random.js";
import { CAVE } from "./createCaveShell.js";

// Green plants for the cave: ferns around the walls and the pool, broad-leaf
// plants beside the lanterns, and vines hanging from the ceiling that sway.

// A fern frond drawn once: a stem with pairs of leaflets, white on clear
// (the colour comes from the material, the shape from alpha testing).
function frondTexture() {
  const W = 128;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(W / 2, H);
  g.lineTo(W / 2, 10);
  g.stroke();
  for (let k = 0; k < 22; k++) {
    const t = 0.06 + k / 23; // 0 at the base, 1 at the tip
    const y = H - t * (H - 16);
    const len = Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.08)) * (W * 0.46);
    for (const side of [-1, 1]) {
      g.save();
      g.translate(W / 2, y);
      g.rotate(side * (Math.PI / 2 - 0.55));
      g.beginPath();
      g.ellipse(0, -len / 2, len * 0.17, len / 2, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// One frond: a long strip whose base is at the origin, arching out along +z.
function frondGeometry() {
  const L = 1.6;
  const geo = new THREE.PlaneGeometry(0.55, L, 1, 10);
  geo.translate(0, L / 2, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / L;
    pos.setY(i, y * (1 - 0.3 * t * t));
    pos.setZ(i, t * t * 1.0);
  }
  geo.computeVertexNormals();
  return geo;
}

// A pointed oval leaf, cupped and curving down at the tip. Base at the
// origin, pointing along +z.
function leafGeometry(length, width, droop) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(width * 0.6, length * 0.15, width * 0.55, length * 0.75, 0, length);
  s.bezierCurveTo(-width * 0.55, length * 0.75, -width * 0.6, length * 0.15, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = y / length;
    // lay it along +z, lift the middle, droop the tip, cup the sides
    pos.setXYZ(i, x, Math.sin(t * Math.PI) * droop * 0.5 - t * t * droop + Math.abs(x) * 0.35, y);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createCavePlants({ floorAt, ceilingAt, avoid = [], reduceMotion = false }) {
  const R = rng(57);
  const group = new THREE.Group();
  const greens = ["#3f7a33", "#4f8f3a", "#5e9e40", "#36692d", "#6aa84a"];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const col = new THREE.Color();

  const clear = (x, z, r) => avoid.every((a) => Math.hypot(a.x - x, a.z - z) > a.r + r);

  // Spots near the walls: a share of the way out along the floor ellipse.
  const floorSpot = (angle, reach) => ({
    x: Math.cos(angle) * CAVE.rx * 0.9 * reach,
    z: Math.sin(angle) * CAVE.rz * 0.9 * reach,
  });

  // ── Ferns ────────────────────────────────────────────────────────────
  const fernSpots = [];
  for (let k = 0; k < 120 && fernSpots.length < 26; k++) {
    const s = floorSpot(R() * Math.PI * 2, 0.5 + R() * 0.42);
    if (clear(s.x, s.z, 1.2) && fernSpots.every((f) => Math.hypot(f.x - s.x, f.z - s.z) > 1.9)) fernSpots.push(s);
  }
  // Ferns on both sides of the pool, leaving the view of the water open.
  for (const [x, z] of [[-4, 10.2], [4, 10.2], [-3.4, 12.3], [3.4, 12.3]]) {
    fernSpots.push({ x: CAVE.pool.x + x, z: z - 10.5 + CAVE.pool.z });
  }
  const frondsPer = fernSpots.map(() => 9 + Math.floor(R() * 6));
  const fronds = new THREE.InstancedMesh(
    frondGeometry(),
    new THREE.MeshStandardMaterial({
      map: frondTexture(),
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.7,
      emissive: new THREE.Color("#1d3a12"),
      emissiveIntensity: 0.25,
    }),
    frondsPer.reduce((a, b) => a + b, 0),
  );
  let fi = 0;
  fernSpots.forEach((s, k) => {
    const size = 1 + R() * 0.8;
    const base = greens[k % greens.length];
    for (let j = 0; j < frondsPer[k]; j++) {
      const angle = (j / frondsPer[k]) * Math.PI * 2 + R() * 0.4;
      e.set(0.25 + R() * 0.55, angle, 0, "YXZ"); // lean out from the middle
      q.setFromEuler(e);
      p.set(s.x, floorAt(s.x, s.z) - 0.05, s.z);
      const f = size * (0.75 + R() * 0.4);
      sc.set(f, f, f);
      fronds.setMatrixAt(fi, m4.compose(p, q, sc));
      fronds.setColorAt(fi, col.set(base).offsetHSL((R() - 0.5) * 0.03, 0, (R() - 0.5) * 0.08));
      fi++;
    }
  });
  group.add(fronds);

  // ── Broad-leaf plants ────────────────────────────────────────────────
  const broadSpots = [];
  for (let k = 0; k < 30 && broadSpots.length < 6; k++) {
    const s = floorSpot(R() * Math.PI * 2, 0.6 + R() * 0.25);
    if (clear(s.x, s.z, 1.4) && [...fernSpots, ...broadSpots].every((f) => Math.hypot(f.x - s.x, f.z - s.z) > 2.4))
      broadSpots.push(s);
  }
  const leavesPer = 7;
  const broad = new THREE.InstancedMesh(
    leafGeometry(1.5, 0.75, 0.55),
    new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.45, metalness: 0 }),
    broadSpots.length * leavesPer,
  );
  let bi = 0;
  broadSpots.forEach((s) => {
    const size = 0.8 + R() * 0.6;
    for (let j = 0; j < leavesPer; j++) {
      const angle = (j / leavesPer) * Math.PI * 2 + R() * 0.5;
      e.set(-(0.25 + R() * 0.5), angle, (R() - 0.5) * 0.3, "YXZ");
      q.setFromEuler(e);
      p.set(s.x, floorAt(s.x, s.z) + 0.05 + R() * 0.15, s.z);
      const f = size * (0.7 + R() * 0.5);
      broad.setMatrixAt(bi, m4.compose(p, q, sc.set(f, f, f)));
      broad.setColorAt(bi, col.set("#2f6b2a").offsetHSL((R() - 0.5) * 0.04, 0, (R() - 0.3) * 0.12));
      bi++;
    }
  });
  group.add(broad);

  // ── Hanging vines ────────────────────────────────────────────────────
  const vineLeaf = leafGeometry(0.26, 0.17, 0.05);
  const stemMat = new THREE.MeshStandardMaterial({ color: "#3d5a26", roughness: 0.8 });
  const vineLeafMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6 });
  const vines = [];
  for (let k = 0; k < 40 && vines.length < 14; k++) {
    const a = R() * Math.PI * 2;
    const reach = 0.25 + R() * 0.5;
    const x = Math.cos(a) * CAVE.rx * reach;
    const z = Math.sin(a) * CAVE.rz * reach;
    if (vines.some((v) => Math.hypot(v.x - x, v.z - z) < 2)) continue;
    const top = ceilingAt(x, z);
    const length = Math.min(top - 3.2, 1.8 + R() * 3); // stays above head height
    if (length < 1) continue;

    const pivot = new THREE.Group();
    pivot.position.set(x, top + 0.2, z);
    const sway = new THREE.Vector2(R() - 0.5, R() - 0.5).normalize().multiplyScalar(0.35);
    const curve = new THREE.CatmullRomCurve3(
      [0, 0.33, 0.66, 1].map((t) => new THREE.Vector3(sway.x * t * t, -t * (length + 0.2), sway.y * t * t)),
    );
    pivot.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.025, 5), stemMat));

    const count = Math.floor(length * 9);
    const leaves = new THREE.InstancedMesh(vineLeaf, vineLeafMat, count);
    for (let j = 0; j < count; j++) {
      const t = 0.08 + (j / count) * 0.92;
      curve.getPointAt(t, p);
      e.set(0.6 + R() * 0.8, R() * Math.PI * 2, 0, "YXZ");
      q.setFromEuler(e);
      const f = 0.8 + R() * 0.6 - t * 0.2;
      leaves.setMatrixAt(j, m4.compose(p, q, sc.set(f, f, f)));
      leaves.setColorAt(j, col.set(greens[(j + k) % greens.length]).offsetHSL(0, 0, (R() - 0.5) * 0.1));
    }
    pivot.add(leaves);
    group.add(pivot);
    vines.push({ x, z, pivot, phase: R() * Math.PI * 2, speed: 0.5 + R() * 0.4 });
  }

  return {
    object: group,
    update(time) {
      if (reduceMotion) return;
      for (const v of vines) {
        v.pivot.rotation.x = Math.sin(time * v.speed + v.phase) * 0.04;
        v.pivot.rotation.z = Math.cos(time * v.speed * 0.8 + v.phase) * 0.04;
      }
    },
  };
}
