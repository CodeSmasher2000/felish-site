import * as THREE from "three";
import { rng } from "../lib/random.js";
import { glowSprite, getGlowTexture } from "../lib/glow.js";
import { CAVE } from "./createCaveShell.js";

// The cozy part: warm lanterns (one hanging), a cluster of candles,
// glowing mushrooms and drifting fireflies.

const WARM = new THREE.Color("#ffa65c");

function lanternMesh() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: "#3a2a22", metalness: 0.6, roughness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({
    color: "#ffd9a6",
    emissive: new THREE.Color("#ffb15c"),
    emissiveIntensity: 2.4,
    roughness: 0.3,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.44, 14), glass);
  body.position.y = 0.3;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14), metal);
  base.position.y = 0.05;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 14), metal);
  cap.position.y = 0.62;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 16, Math.PI), metal);
  handle.position.y = 0.72;
  g.add(body, base, cap, handle);
  return { group: g, glass };
}

export function createCaveLights({ floorAt, ceilingAt, reduceMotion = false }) {
  const R = rng(91);
  const group = new THREE.Group();

  // ── Lanterns: two on the floor, one hanging from the ceiling ─────────
  const lanternSpots = [
    { x: -5.6, z: -3.8 },
    { x: 6.2, z: -1.8 },
    { x: 1.6, z: -4.6, hang: 5.4 },
  ];
  const lanterns = lanternSpots.map((s, i) => {
    const { group: mesh, glass } = lanternMesh();
    const y = s.hang ?? floorAt(s.x, s.z);
    mesh.position.set(s.x, y, s.z);
    mesh.scale.setScalar(1.3);
    group.add(mesh);
    if (s.hang) {
      // a thin chain up to the ceiling
      const top = ceilingAt(s.x, s.z);
      const len = Math.max(0.2, top - y - 0.9);
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, len, 4),
        new THREE.MeshStandardMaterial({ color: "#2b201b", metalness: 0.5, roughness: 0.5 }),
      );
      chain.position.set(s.x, y + 0.95 + len / 2, s.z);
      group.add(chain);
    }
    const light = new THREE.PointLight(WARM, 22, 13, 1.6);
    light.position.set(s.x, y + 0.45 * 1.3, s.z);
    const halo = glowSprite(0xffb469, 2.6, 0.5);
    halo.position.copy(light.position);
    group.add(light, halo);
    return { light, halo, glass, base: light.intensity, phase: i * 2.1 };
  });

  // ── Candles on a flat stone near the middle ──────────────────────────
  const candleSpot = { x: 3.2, z: 4.2 };
  const candleY = floorAt(candleSpot.x, candleSpot.z);
  const wax = new THREE.MeshStandardMaterial({ color: "#f3e3c8", roughness: 0.6, emissive: new THREE.Color("#ff9a4a"), emissiveIntensity: 0.15 });
  const stone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.85, 0.22, 9),
    new THREE.MeshStandardMaterial({ color: "#5d4a40", roughness: 0.95, flatShading: true }),
  );
  stone.position.set(candleSpot.x, candleY + 0.08, candleSpot.z);
  group.add(stone);
  const flames = [];
  for (let k = 0; k < 5; k++) {
    const h = 0.18 + R() * 0.35;
    const a = (k / 5) * Math.PI * 2 + R();
    const r = k === 0 ? 0 : 0.25 + R() * 0.25;
    const x = candleSpot.x + Math.cos(a) * r;
    const z = candleSpot.z + Math.sin(a) * r;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, h, 10), wax);
    candle.position.set(x, candleY + 0.19 + h / 2, z);
    group.add(candle);
    const flame = glowSprite(0xffc070, 0.45, 0.9);
    flame.position.set(x, candleY + 0.19 + h + 0.07, z);
    flame.scale.set(0.22, 0.4, 1);
    const halo = glowSprite(0xff9a4a, 1.3, 0.35);
    halo.position.copy(flame.position);
    group.add(flame, halo);
    flames.push({ flame, halo, phase: R() * 10 });
  }
  const candleLight = new THREE.PointLight(WARM, 8, 7, 1.6);
  candleLight.position.set(candleSpot.x, candleY + 0.8, candleSpot.z);
  group.add(candleLight);

  // ── Glowing mushrooms in little clusters by the walls ────────────────
  const capColors = ["#a8ffe8", "#ffd0b0", "#d9c2ff"];
  const clusters = [];
  for (let k = 0; k < 30 && clusters.length < 7; k++) {
    const a = R() * Math.PI * 2;
    const reach = 0.78 + R() * 0.12;
    const x = Math.cos(a) * CAVE.rx * 0.9 * reach;
    const z = Math.sin(a) * CAVE.rz * 0.9 * reach;
    if (Math.hypot(x - CAVE.pool.x, z - CAVE.pool.z) < CAVE.pool.radius + 1) continue;
    if (clusters.some((c) => Math.hypot(c.x - x, c.z - z) < 3)) continue;
    clusters.push({ x, z, color: capColors[clusters.length % capColors.length] });
  }
  const perCluster = 6;
  const stemGeo = new THREE.CylinderGeometry(0.035, 0.05, 1, 6);
  stemGeo.translate(0, 0.5, 0);
  const capGeo = new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: "#efe3d0", roughness: 0.7 }), clusters.length * perCluster);
  const capMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const caps = new THREE.InstancedMesh(capGeo, capMat, clusters.length * perCluster);
  const capBase = [];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const col = new THREE.Color();
  let mi = 0;
  const glows = [];
  for (const c of clusters) {
    const cy = floorAt(c.x, c.z);
    for (let j = 0; j < perCluster; j++) {
      const a = R() * Math.PI * 2;
      const r = R() * 0.5;
      const x = c.x + Math.cos(a) * r;
      const z = c.z + Math.sin(a) * r;
      const h = 0.12 + R() * 0.32;
      const tilt = (R() - 0.5) * 0.4;
      q.setFromEuler(new THREE.Euler(tilt, 0, (R() - 0.5) * 0.4));
      stems.setMatrixAt(mi, m4.compose(p.set(x, cy - 0.02, z), q, sc.set(1, h, 1)));
      const s = 0.7 + R() * 0.8;
      const top = new THREE.Vector3(0, h, 0).applyQuaternion(q).add(p);
      caps.setMatrixAt(mi, m4.compose(top, q, sc.set(s, s * 0.8, s)));
      col.set(c.color).multiplyScalar(1.6);
      caps.setColorAt(mi, col);
      capBase.push(col.clone());
      mi++;
    }
    const g = glowSprite(c.color, 2.4, 0.35);
    g.position.set(c.x, cy + 0.3, c.z);
    group.add(g);
    glows.push(g);
  }
  group.add(stems, caps);

  // ── Fireflies ────────────────────────────────────────────────────────
  const FLIES = 70;
  const flyBase = new Float32Array(FLIES * 3);
  const flyPos = new Float32Array(FLIES * 3);
  const flyCol = new Float32Array(FLIES * 3);
  const flySeed = [];
  for (let i = 0; i < FLIES; i++) {
    const a = R() * Math.PI * 2;
    const r = 0.1 + Math.sqrt(R()) * 0.62;
    flyBase.set([Math.cos(a) * CAVE.rx * r, 0.6 + R() * 4.8, Math.sin(a) * CAVE.rz * r], i * 3);
    flySeed.push({ ph: R() * 100, sp: 0.2 + R() * 0.4, tw: 0.8 + R() * 2 });
  }
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute("position", new THREE.BufferAttribute(flyPos, 3));
  flyGeo.setAttribute("color", new THREE.BufferAttribute(flyCol, 3));
  const flies = new THREE.Points(
    flyGeo,
    new THREE.PointsMaterial({
      map: getGlowTexture(),
      size: 0.32,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  flies.frustumCulled = false;
  group.add(flies);
  const flyTint = new THREE.Color("#ffe58a");

  // A tap on a mushroom makes everything glow up for a moment.
  let burst = 0;

  return {
    object: group,
    mushrooms: caps, // tap target
    burst() {
      burst = 1;
    },
    update(dt, time) {
      burst *= Math.pow(0.35, dt);
      const t = reduceMotion ? 0 : time;
      for (const l of lanterns) {
        const flicker = reduceMotion
          ? 1
          : 0.9 + 0.06 * Math.sin(time * 7.3 + l.phase) + 0.04 * Math.sin(time * 13.1 + l.phase * 2);
        l.light.intensity = l.base * flicker * (1 + burst * 0.4);
        l.halo.material.opacity = 0.42 * flicker + burst * 0.2;
        l.glass.emissiveIntensity = 2.4 * flicker;
      }
      for (const f of flames) {
        const k = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(time * 11 + f.phase) * Math.sin(time * 5.3 + f.phase);
        f.flame.scale.set(0.22 * k, 0.4 * (0.9 + 0.2 * k), 1);
        f.halo.material.opacity = 0.3 * k;
      }
      candleLight.intensity = 8 * (reduceMotion ? 1 : 0.88 + 0.12 * Math.sin(time * 9.7));

      const pulse = 0.85 + 0.15 * Math.sin(t * 1.3);
      for (let i = 0; i < capBase.length; i++) caps.setColorAt(i, col.copy(capBase[i]).multiplyScalar(pulse + burst * 1.2));
      caps.instanceColor.needsUpdate = true;
      for (const g of glows) g.material.opacity = 0.3 * pulse + burst * 0.5;

      const speed = 1 + burst * 3;
      for (let i = 0; i < FLIES; i++) {
        const s = flySeed[i];
        const k = (t * s.sp + s.ph) * speed;
        flyPos[i * 3] = flyBase[i * 3] + Math.sin(k) * 1.2 + Math.sin(k * 0.37) * 0.8;
        flyPos[i * 3 + 1] = flyBase[i * 3 + 1] + Math.sin(k * 0.7 + 1) * 0.5 + burst * 0.6;
        flyPos[i * 3 + 2] = flyBase[i * 3 + 2] + Math.cos(k * 0.9) * 1.2;
        const glow = Math.max(0, Math.sin(time * s.tw + s.ph)) ** 2 * 0.9 + 0.1 + burst * 0.8;
        flyCol[i * 3] = flyTint.r * glow;
        flyCol[i * 3 + 1] = flyTint.g * glow;
        flyCol[i * 3 + 2] = flyTint.b * glow;
      }
      flyGeo.attributes.position.needsUpdate = true;
      flyGeo.attributes.color.needsUpdate = true;
    },
  };
}
