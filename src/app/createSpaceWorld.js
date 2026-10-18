import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createNebula } from "./createNebula.js";
import { createStarfield } from "./createStarfield.js";
import { createMoon } from "./createMoon.js";
import { createPlanets } from "./createPlanets.js";
import { createShootingStars } from "./createShootingStars.js";
import { PLANETS, MOON_TEXTURE_URL } from "../config.js";

export function createSpaceWorld(renderer, { reduceMotion = false, onMoonClick } = {}) {
  const scene = new THREE.Scene();

  // ── Camera + intro fly-in ──────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  const homeDistance = () => (window.innerWidth / window.innerHeight < 0.8 ? 27 : 17);
  const camEnd = new THREE.Vector3(0, 2.6, homeDistance());
  const camStart = new THREE.Vector3(-6, 9, 46);
  camera.position.copy(reduceMotion ? camEnd : camStart);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 40;
  controls.rotateSpeed = 0.55;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.25;

  let introProgress = 0;
  let introDone = reduceMotion;

  // ── Environment ────────────────────────────────────────────────────────
  const nebula = createNebula();
  const stars = createStarfield({ pixelRatio: renderer.getPixelRatio() });
  scene.add(nebula.object, stars.object);

  // Light intensities are physical (three r155+), roughly π× the legacy values.
  const sun = new THREE.DirectionalLight(0xfff0d8, 7.5);
  sun.position.set(7, 3.5, 6);
  const rim = new THREE.DirectionalLight(0x8a7cff, 3.4);
  rim.position.set(-6, 2, -8);
  const hemi = new THREE.HemisphereLight(0x5a4c8a, 0x07060f, 1.1);
  scene.add(sun, rim, hemi);

  // ── Moon, planets, meteors ─────────────────────────────────────────────
  const moon = createMoon({ textureUrl: MOON_TEXTURE_URL, reduceMotion });
  scene.add(moon.object);

  const planets = createPlanets(PLANETS, { reduceMotion });
  scene.add(planets.object);

  const meteors = createShootingStars(scene, { reduceMotion });

  // ── Interaction: tap the moon (a click, not a drag) ────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  let enabled = true; // false while another world is showing

  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", (e) => {
    if (!enabled) return;
    downAt = [e.clientX, e.clientY];
    introDone = true; // user takes over the camera
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!enabled || dive || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.intersectObject(moon.mesh).length) {
      moon.boost();
      meteors.burst(4);
      onMoonClick?.();
    }
  });
  canvas.addEventListener("wheel", () => (introDone = true), { passive: true });

  // ── Dive into the moon (used when leaving for the sphere) ──────────────
  let dive = null;
  function diveIntoMoon(ms = 1400) {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      const from = camera.position.clone();
      const to = from.clone().normalize().multiplyScalar(moon.radius * 1.12);
      dive = { from, to, t: 0, dur: ms / 1000, resolve };
    });
  }

  // ── Per-frame ──────────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function update() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    if (dive) {
      dive.t += dt;
      const k = Math.min(1, dive.t / dive.dur);
      camera.position.lerpVectors(dive.from, dive.to, k * k * k); // ease in: accelerate toward the moon
      camera.lookAt(controls.target);
      if (k >= 1) {
        dive.resolve();
        dive = null;
      }
    } else if (!introDone) {
      introProgress = Math.min(1, introProgress + dt / 3.2);
      const eased = 1 - Math.pow(1 - introProgress, 3);
      camera.position.lerpVectors(camStart, camEnd, eased);
      if (introProgress >= 1) introDone = true;
    }
    if (!dive) controls.update();

    nebula.update(time);
    stars.update(time);
    moon.update(dt, time);
    planets.update(dt);
    meteors.update(dt, time);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    camEnd.setLength(homeDistance());
  }

  return {
    scene,
    camera,
    controls,
    moon,
    planets,
    meteors,
    lights: { sun, rim, hemi },
    exposure: 1.05,
    bloom: { strength: 0.55, radius: 0.6, threshold: 0.72 },
    diveIntoMoon,
    // Back from the sphere: return to the home view.
    reset() {
      dive = null;
      introDone = true;
      camera.position.copy(camEnd);
      controls.target.set(0, 0, 0);
      controls.update();
    },
    setEnabled(on) {
      enabled = on;
      controls.enabled = on;
      if (on) clock.getDelta(); // don't jump after time away
    },
    update,
    onResize,
  };
}
