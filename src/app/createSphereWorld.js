import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createTerrain } from "./sphere/createTerrain.js";
import { createWaterfall } from "./sphere/createWaterfall.js";
import { loadSurfaceSet } from "./sphere/triplanar.js";
import { createExplorer } from "./sphere/createExplorer.js";
import { createPhotoCubes } from "./sphere/createPhotoCubes.js";
import { createPostViewer } from "./sphere/createPostViewer.js";
import { createFloatingEmbed } from "./sphere/createFloatingEmbed.js";
import { SPHERE_PHOTOS, INSTAGRAM, INSTAGRAM_POSTS, SPOTIFY_EMBED } from "../config.js";
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
  // Low sun off to the side, so it grazes the cliff and brings out the texture.
  const SUN_DIR = new THREE.Vector3(0.75, 0.22, -0.4).normalize();

  // ── Sky, fog and reflections ───────────────────────────────────────────
  const sky = createPastelSky({ sunDir: SUN_DIR });
  scene.add(sky.object);
  scene.fog = new THREE.Fog(sky.horizonColor, 70, 380);

  // Bake the sky into an environment map so the orb and ground pick up pastel light.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky.createEnvMesh());
  scene.environment = pmrem.fromScene(envScene, 0.04, 0.1, 2000).texture;
  scene.environmentIntensity = 0.42;
  pmrem.dispose();

  // ── Lights ─────────────────────────────────────────────────────────────
  // Warm, low golden-hour light rather than bright white daylight.
  const sun = new THREE.DirectionalLight(0xffb27c, 2.7);
  sun.position.copy(SUN_DIR).multiplyScalar(200);
  const hemi = new THREE.HemisphereLight(0xe6b9c2, 0xb9806a, 0.55);
  scene.add(sun, hemi);

  // ── Ground ─────────────────────────────────────────────────────────────
  const terrain = createTerrain();
  scene.add(terrain.object);
  const rocks = createRocks(terrain);
  scene.add(rocks.object);

  const waterfall = createWaterfall(terrain, { reduceMotion });
  scene.add(waterfall.object);

  // Photo cubes, then one cube per Instagram post (tap to see the post).
  const cubes = createPhotoCubes(
    terrain,
    [...SPHERE_PHOTOS, ...INSTAGRAM_POSTS.map((post) => ({ image: post.image, post }))],
    { reduceMotion },
  );
  const postViewer = createPostViewer(INSTAGRAM);
  // Spotify player that floats above the hilltop crystal.
  const spotify = createFloatingEmbed({ title: "Felish on Spotify", height: 352, width: 380 });
  scene.add(cubes.object);

  // Surface textures: dust on flat ground, cracked stone on cliffs and boulders.
  // The world reports ready once they're in, so they never pop in on screen.
  const ready = Promise.all([loadSurfaceSet("regolith"), loadSurfaceSet("rock"), cubes.ready])
    .then(([regolith, rock]) => {
      terrain.surface.setTextures(regolith, rock);
      rocks.surface.setTextures(rock);
      waterfall.damSurface.setTextures(rock);
    })
    .catch((err) => console.warn("Sphere textures failed to load; using plain surfaces.", err));

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
  // Frame the orb and the waterfall together on arrival.
  // The landing zone ("home"): framed so the orb and the waterfall are both in view.
  const portrait = () => window.innerWidth / window.innerHeight < 0.8;
  const homeTarget = () => new THREE.Vector3(-4, terrain.heightAt(-4, -6) + 3, -6);
  const homeCamera = () => (portrait() ? new THREE.Vector3(22, 11, 46) : new THREE.Vector3(16, 10, 34));
  const introStart = new THREE.Vector3(30, 75, 115);
  let introEnd = homeCamera();
  camera.position.copy(introEnd);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.5;
  controls.autoRotate = false; // the camera stays put until you move it
  controls.target.copy(homeTarget());

  const explorer = createExplorer({ camera, controls, terrain, scene, reduceMotion });
  controls.update();

  let enabled = false;
  let introProgress = 1;

  // ── Taps: orb = go home, boulder = dam, ground = walk there ────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", (e) => {
    if (!enabled) return;
    downAt = [e.clientX, e.clientY];
    introProgress = 1;
    explorer.cancel(); // grabbing the view stops any glide
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!enabled || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    if (e.button !== 0) return; // right-click is for sliding around
    const hit = pick(e);
    if (hit === "orb") goHome();
    else if (hit === "dam") waterfall.toggleDam();
    else if (hit === "crystal") visitCrystal();
    else if (hit?.cube) visitCube(hit.cube);
    else {
      const point = explorer.groundHit(raycaster.ray);
      if (point) explorer.walkTo(point);
    }
  });

  // Glide up close to a cube, keeping roughly the side you're looking from.
  function visitCube(mesh) {
    cubes.spin(mesh);
    const { size, post } = mesh.userData;

    // Surprise (Instagram) cubes open only when you're close: from far away
    // the first tap brings you over, and a second tap opens the post.
    const near = camera.position.distanceTo(mesh.position) <= size * 4;
    if (post && near) {
      postViewer.show(post);
      return;
    }
    const target = mesh.position.clone();
    const away = camera.position.clone().sub(target);
    away.y = 0;
    if (away.lengthSq() < 0.01) away.set(0, 0, 1);
    away.normalize().multiplyScalar(size * 2.6);
    const cameraPos = target.clone().add(away);
    cameraPos.y = Math.max(target.y + 1, terrain.heightAt(cameraPos.x, cameraPos.z) + 2);
    explorer.glideTo(target, cameraPos, 1.4);
  }

  // The hilltop crystal works like the surprise cubes: from far away a tap
  // glides you to a view of it; once you're close, a tap opens the Spotify
  // player above it.
  const CRYSTAL_NEAR = 22; // metres — the glide stops about 17 m away
  function visitCrystal() {
    waterfall.flareCrystal();
    const pos = waterfall.crystal.getWorldPosition(new THREE.Vector3());
    if (camera.position.distanceTo(pos) <= CRYSTAL_NEAR) {
      spotify.show(SPOTIFY_EMBED, pos.clone().add(new THREE.Vector3(0, 1.4, 0)));
      return;
    }
    const dir = terrain.water.dir; // from the hill toward the landing zone
    const cameraPos = new THREE.Vector3(pos.x + dir.x * 16, pos.y + 5, pos.z + dir.y * 16);
    cameraPos.y = Math.max(cameraPos.y, terrain.heightAt(cameraPos.x, cameraPos.z) + 2);
    explorer.glideTo(pos, cameraPos, 1.6);
  }

  function goHome() {
    orb.pulse();
    explorer.glideTo(homeTarget(), homeCamera(), 1.6);
  }

  // What's under the pointer: the orb (or its beam), the dam boulder, a
  // photo cube ({ cube }), or nothing.
  function pick(e) {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      [orb.mesh, orb.beamHit, waterfall.dam, waterfall.crystalHit, ...cubes.meshes],
      false,
    );
    if (!hits.length) return null;
    const obj = hits[0].object;
    if (obj === waterfall.dam) return "dam";
    if (obj === waterfall.crystalHit) return "crystal";
    if (cubes.meshes.includes(obj)) return { cube: obj };
    return "orb";
  }

  // Show a pointing hand over things you can tap.
  canvas.addEventListener("pointermove", (e) => {
    if (!enabled || e.buttons) return;
    canvas.style.cursor = pick(e) ? "pointer" : "";
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
    // Walking, gliding, terrain-hugging and the ground clamp all live here.
    explorer.update(dt);

    sky.update(time);
    dust.update(dt, time);
    orb.update(dt, time);
    waterfall.update(dt, time);
    cubes.update(dt, time);
    spotify.update(camera);
    giant.rotation.y += dt * 0.01;
  }

  return {
    scene,
    camera,
    controls,
    ready,
    exposure: 0.84,
    bloom: { strength: 0.35, radius: 0.5, threshold: 0.92 },
    // Called every time you arrive: start high and float down to the orb.
    enter() {
      clock.getDelta();
      explorer.cancel();
      controls.target.copy(homeTarget());
      introEnd = homeCamera();
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
      if (!on) {
        postViewer.hide();
        spotify.hide();
      }
      if (!on) canvas.style.cursor = "";
      controls.enabled = on;
      explorer.setActive(on);
      if (on) clock.getDelta();
    },
    update,
    onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    },
  };
}
