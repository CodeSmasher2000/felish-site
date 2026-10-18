import "./style.css";
import { createRenderer, createComposer } from "./app/createRenderer.js";
import { createSpaceWorld } from "./app/createSpaceWorld.js";
import { createLinkOverlay } from "./app/createLinkOverlay.js";
import { createMoonPrompt } from "./app/createMoonPrompt.js";
import { fadeTo, nextFrame } from "./app/lib/fade.js";
import { ARTIST, EPK } from "./config.js";
import { asset } from "./app/lib/asset.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── HUD content ──────────────────────────────────────────────────────────
document.getElementById("artist-name").textContent = ARTIST.name;
const release = document.createElement("a");
release.className = "release";
release.href = ARTIST.release.url;
release.target = "_blank";
release.rel = "noopener";
release.setAttribute("aria-label", `${ARTIST.release.label}: ${ARTIST.release.title}. ${ARTIST.release.cta}`);
release.innerHTML = `
  <span class="release-label"><i class="live"></i>${ARTIST.release.label}</span>
  <span class="release-title">${ARTIST.release.title}</span>
  <span class="release-cta">${ARTIST.release.cta} <b>↗</b></span>`;
document.getElementById("artist-release").replaceChildren(release);

const hitsEl = document.getElementById("hits");
const spaceHint = document.getElementById("hint-space");
const sphereHint = document.getElementById("hint-sphere");
const backBtn = document.getElementById("back-to-space");
const warp = document.getElementById("warp");

// ── Worlds ───────────────────────────────────────────────────────────────
const renderer = createRenderer(document.getElementById("scene"));
const prompt = createMoonPrompt({ onAccept: () => goToSphere() });
// Small "Felish EPK" panel in the top corner, linked to the 3D heart: same
// download, and hovering either one lights up the other.
const epkPanel = document.getElementById("epk-panel");
const epkLink = document.createElement("a");
epkLink.href = asset(EPK.url);
epkLink.setAttribute("download", EPK.fileName);
epkLink.innerHTML = `<i></i>${EPK.panelLabel}<small>PDF ↓</small>`;
epkPanel.replaceChildren(epkLink);

const space = createSpaceWorld(renderer, {
  reduceMotion,
  onMoonClick: () => prompt.open(),
  onHeartHover: (on) => epkLink.classList.toggle("on", on),
});
const lightHeart = (on) => () => space.heart.setHover(on);
epkLink.addEventListener("pointerenter", lightHeart(true));
epkLink.addEventListener("pointerleave", lightHeart(false));
epkLink.addEventListener("focus", lightHeart(true));
epkLink.addEventListener("blur", lightHeart(false));
epkLink.addEventListener("click", () => space.heart.thump());
const post = createComposer(renderer, space.scene, space.camera);

const overlay = createLinkOverlay({
  planets: space.planets.list,
  hitsEl,
  dockEl: document.getElementById("dock"),
});

let sphere = null; // built the first time someone visits
let active = space;
let busy = false;

function setActive(world) {
  active = world;
  post.renderPass.scene = world.scene;
  post.renderPass.camera = world.camera;
  renderer.toneMappingExposure = world.exposure;
  Object.assign(post.bloomPass, world.bloom);

  const inSphere = world === sphere;
  space.setEnabled(!inSphere);
  sphere?.setEnabled(inSphere);
  document.body.dataset.world = inSphere ? "sphere" : "space";
  hitsEl.hidden = inSphere;
  spaceHint.hidden = inSphere;
  epkPanel.hidden = inSphere;
  sphereHint.hidden = !inSphere;
  backBtn.hidden = !inSphere;
}

async function goToSphere({ instant = false } = {}) {
  if (busy || active !== space) return;
  busy = true;
  prompt.close();

  // Start loading the sphere code while the camera dives.
  const loading = sphere ? null : import("./app/createSphereWorld.js");
  const diveMs = instant || reduceMotion ? 0 : 1400;
  await Promise.all([space.diveIntoMoon(diveMs), fadeTo(warp, 1, instant ? 0 : diveMs || 500)]);

  if (loading) {
    const { createSphereWorld } = await loading;
    sphere = createSphereWorld(renderer, { reduceMotion });
  }
  await sphere.ready; // textures in before the flash clears
  sphere.enter();
  setActive(sphere);
  history.replaceState(null, "", "#sphere");
  await nextFrame();
  await fadeTo(warp, 0, 1400);
  busy = false;
  backBtn.focus({ preventScroll: true });
}

async function goToSpace() {
  if (busy || active === space) return;
  busy = true;
  await fadeTo(warp, 1, 600);
  space.reset();
  setActive(space);
  history.replaceState(null, "", location.pathname + location.search);
  await nextFrame();
  await fadeTo(warp, 0, 1000);
  busy = false;
}

backBtn.addEventListener("click", goToSpace);
window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (prompt.isOpen) prompt.close();
  else if (active === sphere) goToSpace();
});
// Tapping empty space dismisses the prompt.
renderer.domElement.addEventListener("pointerdown", () => prompt.isOpen && prompt.close());

// Dev-only tweak panel: open the site with ?debug
// Test switch for tracking down rendering glitches on a given device:
// ?off=bloom,nebula,stars,halos,rims hides those effects.
const off = new Set((new URLSearchParams(location.search).get("off") || "").split(",").filter(Boolean));
if (off.size) {
  if (off.has("bloom")) post.bloomPass.enabled = false;
  if (off.has("nebula")) space.parts.nebula.visible = false;
  if (off.has("stars")) space.parts.stars.visible = false;
  space.scene.traverse((o) => {
    if (off.has("halos") && o.isSprite) o.visible = false;
    if (off.has("rims") && o.material?.uniforms?.uPower) o.visible = false;
  });
}

if (new URLSearchParams(location.search).has("debug")) {
  import("./app/setupGui.js").then(({ setupGui }) =>
    setupGui({ renderer, bloomPass: post.bloomPass, world: space }),
  );
}

window.addEventListener("resize", () => {
  space.onResize();
  sphere?.onResize();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
});

// ── Start ────────────────────────────────────────────────────────────────
setActive(space);

// Keep the loading screen up until the moon texture is in, so it never pops.
space.moon.ready.then(async () => {
  renderer.setAnimationLoop(() => {
    active.update();
    if (active === space) overlay.update(space.camera, space.moon.radius);
    post.composer.render();
  });
  // A shared link to /#sphere lands straight in the sphere.
  if (location.hash === "#sphere") await goToSphere({ instant: true });
  requestAnimationFrame(() => document.getElementById("loading-screen")?.classList.add("hidden"));
});
