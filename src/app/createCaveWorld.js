import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { loadSurfaceSet } from "./sphere/triplanar.js";
import { createBoulder } from "./sphere/createRocks.js";
import { createCaveShell, CAVE } from "./cave/createCaveShell.js";
import { createCavePlants } from "./cave/createCavePlants.js";
import { createCaveLights } from "./cave/createCaveLights.js";
import { createCaveWater } from "./cave/createCaveWater.js";
import { rng } from "./lib/random.js";

// The cave behind the waterfall: warm lanterns, candles, ferns, hanging
// vines, glowing mushrooms and fireflies. You arrive by stepping through the
// water and can look around from the middle. Tap a mushroom for a surprise;
// tap the waterfall to go back out.
// Same shape as the other worlds: { scene, camera, update, onResize, ... }.
export function createCaveWorld(renderer, { reduceMotion = false, onExit = () => {} } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#120b09");
  scene.fog = new THREE.FogExp2("#1a100c", 0.028);

  scene.add(new THREE.HemisphereLight(0xffd2a8, 0x3a2418, 0.32));

  // ── Rock, water, plants, lights ────────────────────────────────────────
  const shell = createCaveShell();
  scene.add(shell.mesh);
  const { floorAt, ceilingAt } = shell;

  const water = createCaveWater({ reduceMotion });
  scene.add(water.object);

  const lights = createCaveLights({ floorAt, ceilingAt, reduceMotion });
  scene.add(lights.object);

  // A few mossy boulders.
  const R = rng(5);
  const boulders = [];
  for (const [x, z, s] of [
    [-8.5, 2.5, 1.5],
    [9, 4.5, 1.2],
    [-3.5, -8.5, 1.8],
    [7.5, -6.5, 1.4],
    [-9.5, -3, 1],
    [2.6, 10.5, 0.8],
    [-2.8, 12.4, 0.9],
  ]) {
    const b = createBoulder({ seed: 20 + boulders.length, color: new THREE.Color("#6f5a4c").lerp(new THREE.Color("#4f6b35"), R() * 0.5) });
    b.mesh.position.set(x, floorAt(x, z) + s * 0.25, z);
    b.mesh.scale.set(s * (1 + R() * 0.4), s * (0.7 + R() * 0.3), s);
    b.mesh.rotation.y = R() * Math.PI * 2;
    scene.add(b.mesh);
    boulders.push(b);
  }

  const plants = createCavePlants({
    floorAt,
    ceilingAt,
    reduceMotion,
    // keep plants off the lanterns, the candles and the middle of the floor
    avoid: [
      { x: -5.6, z: -3.8, r: 1 },
      { x: 6.2, z: -1.8, r: 1 },
      { x: 3.2, z: 4.2, r: 1.2 },
      { x: 0, z: 0, r: 5 },
      { x: CAVE.pool.x, z: CAVE.pool.z, r: CAVE.pool.radius + 1.2 },
    ],
  });
  scene.add(plants.object);

  const ready = loadSurfaceSet("rock")
    .then((rock) => {
      shell.surface.setTextures(rock);
      for (const b of boulders) b.surface.setTextures(rock);
    })
    .catch((err) => console.warn("Cave textures failed to load; using plain rock.", err));

  // ── Camera: look around from the middle of the cave ────────────────────
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 200);
  // You look around a spot between the middle of the cave and the pool.
  const target = new THREE.Vector3(-2, 2, 4);
  // Resting view: from the back of the cave, looking at the waterfall.
  const homePos = () =>
    window.innerWidth / window.innerHeight < 0.8 ? new THREE.Vector3(-3.5, 2.7, -4) : new THREE.Vector3(-4.5, 2.6, -3.3);
  // Arrival: step in through the water, then sweep round the left side of
  // the cave to the resting view, so the whole cave comes into sight.
  const arriveFrom = new THREE.Vector3(0, 2.1, CAVE.curtainZ - 0.6);
  const arriveVia = new THREE.Vector3(-8, 2.5, 6.5);
  const arrival = new THREE.QuadraticBezierCurve3(arriveFrom, arriveVia, homePos());

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.5;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 8.4;
  controls.minPolarAngle = 0.75;
  controls.maxPolarAngle = 1.72; // never below the floor
  controls.target.copy(target);
  camera.position.copy(homePos());
  controls.update();

  let enabled = false;
  let intro = 1;

  // ── Taps: mushrooms glow up, the waterfall leads back out ──────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const canvas = renderer.domElement;
  let downAt = null;
  function pick(e) {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([lights.mushrooms, water.curtain, shell.mesh], false)[0];
    if (!hit || hit.object === shell.mesh) return null; // rock in the way
    return hit.object === water.curtain ? "exit" : "mushroom";
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (!enabled) return;
    downAt = [e.clientX, e.clientY];
    intro = 1;
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!enabled || !downAt || e.button !== 0) return;
    if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const hit = pick(e);
    if (hit === "mushroom") lights.burst();
    else if (hit === "exit") onExit();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!enabled || e.buttons) return;
    canvas.style.cursor = pick(e) ? "pointer" : "";
  });

  // ── Per-frame ──────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  function update() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    if (intro < 1) {
      intro = Math.min(1, intro + dt / 3.6);
      const eased = intro < 0.5 ? 4 * intro ** 3 : 1 - (-2 * intro + 2) ** 3 / 2;
      arrival.getPoint(eased, camera.position);
    }
    controls.update();
    water.update(dt);
    lights.update(dt, time);
    plants.update(time);
  }

  return {
    scene,
    camera,
    controls,
    ready,
    exposure: 1.0,
    bloom: { strength: 0.6, radius: 0.55, threshold: 0.85 },
    enter() {
      clock.getDelta();
      arrival.v2.copy(homePos());
      controls.target.copy(target);
      if (reduceMotion) {
        camera.position.copy(arrival.v2);
        intro = 1;
      } else {
        camera.position.copy(arriveFrom);
        intro = 0;
      }
      controls.update();
    },
    setEnabled(on) {
      enabled = on;
      controls.enabled = on;
      if (!on) canvas.style.cursor = "";
      if (on) clock.getDelta();
    },
    update,
    onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    },
  };
}
