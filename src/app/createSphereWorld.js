import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createTerrain } from "./sphere/createTerrain.js";
import { createPastelSky } from "./sphere/createPastelSky.js";
import { createRocks } from "./sphere/createRocks.js";
import { createDust } from "./sphere/createDust.js";
import { createOrb } from "./sphere/createOrb.js";
import { PASTEL } from "./sphere/palette.js";
import { paintPlanet, createRing } from "./createPlanets.js";
import { atmosphere } from "./lib/glow.js";

// "My sphere": a pastel moonscape reached by tapping the moon.
// Same shape as createSpaceWorld: { scene, camera, update, onResize, ... }.
export function createSphereWorld(renderer, { reduceMotion = false } = {}) {
  const scene = new THREE.Scene();
  const SUN_DIR = new THREE.Vector3(-0.6, 0.2, -0.75).normalize();

  // ── Sky, fog and reflections ───────────────────────────────────────────
  const sky = createPastelSky({ sunDir: SUN_DIR });
  scene.add(sky.object);
  scene.fog = new THREE.Fog(sky.horizonColor, 70, 380);

  // Bake the sky into an environment map so the orb and ground pick up pastel light.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky.createEnvMesh());
  scene.environment = pmrem.fromScene(envScene, 0.04, 0.1, 2000).texture;
  scene.environmentIntensity = 0.6;
  pmrem.dispose();

  // ── Lights ─────────────────────────────────────────────────────────────
  const sun = new THREE.DirectionalLight(0xffd9c9, 3.2);
  sun.position.copy(SUN_DIR).multiplyScalar(200);
  const hemi = new THREE.HemisphereLight(0xeedcff, 0xffd2c4, 0.8);
  scene.add(sun, hemi);

  // ── Ground ─────────────────────────────────────────────────────────────
  const terrain = createTerrain();
  scene.add(terrain.object);
  scene.add(createRocks(terrain).object);

  const dust = createDust({ reduceMotion });
  scene.add(dust.object);

  const orb = createOrb({ reduceMotion });
  orb.object.position.y = terrain.heightAt(0, 0);
  scene.add(orb.object);

  // ── A big pastel ringed planet hanging in the sky ──────────────────────
  const giantCfg = { radius: 55, pal: [PASTEL.periwinkle, PASTEL.lavender, PASTEL.pink, PASTEL.cream] };
  const giantTex = new THREE.CanvasTexture(paintPlanet(giantCfg.pal, 77, false));
  giantTex.colorSpace = THREE.SRGBColorSpace;
  const giant = new THREE.Group();
  const giantBody = new THREE.Mesh(
    new THREE.SphereGeometry(giantCfg.radius, 96, 64),
    new THREE.MeshStandardMaterial({
      map: giantTex,
      roughness: 0.8,
      emissive: new THREE.Color(PASTEL.lilac),
      emissiveIntensity: 0.25,
      fog: false,
    }),
  );
  giant.add(giantBody);
  const giantRing = createRing(giantCfg);
  giantRing.material.fog = false;
  giant.add(giantRing);
  const giantRim = atmosphere(PASTEL.cream, giantCfg.radius * 1.04, 2.5, 1.2);
  giantRim.material.fog = false;
  giant.add(giantRim);
  giant.position.set(150, 120, -360);
  giant.rotation.z = 0.3;
  scene.add(giant);

  // ── Camera, controls, intro descent ────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
  const introStart = new THREE.Vector3(0, 70, 110);
  const introEnd = new THREE.Vector3(0, 7, window.innerWidth / window.innerHeight < 0.8 ? 38 : 28);
  camera.position.copy(introEnd);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 70;
  controls.maxPolarAngle = 1.42; // never look up from below the ground
  controls.rotateSpeed = 0.5;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.35;
  controls.target.set(0, 3.5, 0);
  controls.update();

  let enabled = false;
  let introProgress = 1;

  // ── Tap the orb ────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", (e) => {
    if (!enabled) return;
    downAt = [e.clientX, e.clientY];
    introProgress = 1;
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!enabled || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.intersectObject(orb.mesh).length) orb.pulse();
  });

  // ── Per-frame ──────────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function update() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    if (introProgress < 1) {
      introProgress = Math.min(1, introProgress + dt / 3.4);
      const eased = 1 - Math.pow(1 - introProgress, 3);
      camera.position.lerpVectors(introStart, introEnd, eased);
    }
    controls.update();

    // Keep the camera above the hills.
    const ground = terrain.heightAt(camera.position.x, camera.position.z) + 1.5;
    if (camera.position.y < ground) camera.position.y = ground;

    sky.update(time);
    dust.update(dt, time);
    orb.update(dt, time);
    giant.rotation.y += dt * 0.01;
  }

  return {
    scene,
    camera,
    controls,
    exposure: 1.0,
    bloom: { strength: 0.35, radius: 0.5, threshold: 0.92 },
    // Called every time you arrive: start high and float down to the orb.
    enter() {
      clock.getDelta();
      controls.target.set(0, 3.5, 0);
      if (reduceMotion) {
        camera.position.copy(introEnd);
        introProgress = 1;
      } else {
        camera.position.copy(introStart);
        introProgress = 0;
      }
      controls.update();
    },
    setEnabled(on) {
      enabled = on;
      controls.enabled = on;
      if (on) clock.getDelta();
    },
    update,
    onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    },
  };
}
