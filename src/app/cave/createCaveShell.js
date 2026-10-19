import * as THREE from "three";
import { createNoise2D, smoothstep } from "../lib/noise.js";
import { applyTriplanar } from "../sphere/triplanar.js";

// The cave: a lumpy dome seen from the inside, with a flat earthy floor,
// drippy ridges hanging from the ceiling, moss on the ledges and the lower
// walls, and an alcove at +z where the waterfall pours in.
export const CAVE = {
  rx: 15, // half-width
  ry: 7.5, // half-height
  rz: 13, // half-depth
  cy: 3, // height of the middle of the dome
  pool: { x: 0, z: 10.5, radius: 3, y: -0.18 }, // where the waterfall lands
  curtainZ: 12.2, // the sheet of falling water, at the back of the alcove
};

const ALCOVE_DIR = new THREE.Vector3(0, -0.15, 1).normalize();

export function createCaveShell() {
  const n = createNoise2D(31);

  // Floor height: gentle bumps, with a dip for the pool under the waterfall.
  const floorAt = (x, z) => {
    const bumps = 0.35 * n.fbm(x * 0.12 + 5, z * 0.12 - 3, 3);
    const d = Math.hypot(x - CAVE.pool.x, z - CAVE.pool.z);
    return bumps - 0.75 * smoothstep(CAVE.pool.radius + 1.2, CAVE.pool.radius - 1, d);
  };

  const geometry = new THREE.SphereGeometry(1, 180, 110);
  const pos = geometry.attributes.position;
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i);
    let r =
      1 +
      0.13 * n.fbm(d.x * 2.2 + d.y * 1.3 + 7, d.z * 2.2 - d.y * 1.7, 4) +
      0.05 * n.fbm(d.x * 7 + d.y * 5, d.z * 7 - d.y * 4, 3);
    r += 0.35 * smoothstep(0.72, 0.95, d.dot(ALCOVE_DIR)); // the waterfall alcove
    const x = d.x * CAVE.rx * r;
    let y = CAVE.cy + d.y * CAVE.ry * r;
    const z = d.z * CAVE.rz * r;
    // Drippy ridges and points hanging from the ceiling.
    if (d.y > 0.2) {
      const k = n.ridge(d.x * 6 + 3, d.z * 6 + 1, 3);
      y -= Math.pow(Math.max(0, (k - 0.55) / 0.35), 3) * 2.6 * smoothstep(0.2, 0.5, d.y);
    }
    y = Math.max(y, floorAt(x, z)); // the lower half folds flat into the floor
    pos.setXYZ(i, x, y, z);
  }
  // Turn the faces inside out so they face the middle (lit from inside).
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const t = index[i + 1];
    index[i + 1] = index[i + 2];
    index[i + 2] = t;
  }
  geometry.computeVertexNormals();

  // Colours: warm clay stone, earthy floor, moss on ledges and low walls.
  const nrm = geometry.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const stoneDark = new THREE.Color("#4a403a");
  const stoneLight = new THREE.Color("#9a8c80");
  const earth = new THREE.Color("#6f5d4c");
  const mossDark = new THREE.Color("#3d7a2a");
  const mossLight = new THREE.Color("#8cc251");
  const c = new THREE.Color();
  const m = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = nrm.getY(i);
    c.copy(stoneDark).lerp(stoneLight, 0.5 + 0.5 * n.fbm(x * 0.3 + y * 0.2, z * 0.3 - y * 0.25, 3));
    const flat = smoothstep(0.85, 0.97, ny);
    const onFloor = flat * smoothstep(0.6, 0.1, y - floorAt(x, z));
    c.lerp(earth, onFloor * 0.8);
    // Moss: patchy, on ledges facing up and around the foot of the walls.
    const patch = smoothstep(-0.2, 0.15, n.fbm(x * 0.22 + 40, z * 0.22 + y * 0.3, 4));
    const ledge = smoothstep(0.25, 0.6, ny) * (1 - onFloor * 0.7);
    const footOfWall = smoothstep(4.5, 0.6, y) * (1 - onFloor * 0.6);
    const wet = smoothstep(7, 3, Math.hypot(x - CAVE.pool.x, z - CAVE.pool.z)); // lush by the water
    const moss = Math.min(1, patch * Math.max(ledge, footOfWall) + wet * 0.6 * patch);
    m.copy(mossDark).lerp(mossLight, 0.5 + 0.5 * n.noise(x * 0.9, z * 0.9));
    c.lerp(m, moss);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const surface = applyTriplanar(material, {
    scale: 0.35,
    macroScale: 0.06,
    detailStrength: 0.65,
    normalStrength: 1.2,
  });
  const mesh = new THREE.Mesh(geometry, material);

  // Height of the ceiling above a point, found by casting a ray up.
  const ray = new THREE.Raycaster();
  const up = new THREE.Vector3(0, 1, 0);
  const ceilingAt = (x, z) => {
    ray.set(new THREE.Vector3(x, 2, z), up);
    const hit = ray.intersectObject(mesh, false)[0];
    return hit ? hit.point.y : CAVE.cy + CAVE.ry * 0.8;
  };

  return { mesh, surface, floorAt, ceilingAt };
}
