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
release.setAttribute("aria-label", `${ARTIST.release.label}: listen to ${ARTIST.release.title}`);
release.innerHTML = `
  <span class="release-label"><i class="live"></i>${ARTIST.release.label}</span>
  <span class="release-cta">${ARTIST.release.title} <b>↗</b></span>`;
document.getElementById("artist-release").replaceChildren(release);

const hitsEl = document.getElementById("hits");
const spaceHint = document.getElementById("hint-space");
const sphereHint = document.getElementById("hint-sphere");
const caveHint = document.getElementById("hint-cave");
const backLabel = document.getElementById("back-label");
const backBtn = document.getElementById("back-to-space");
const warp = document.getElementById("warp");

// ── Worlds ───────────────────────────────────────────────────────────────
const renderer = createRenderer(document.getElementById("scene"));
const prompt = createMoonPrompt({ onAccept: () => goToSphere() });
const cavePrompt = createMoonPrompt({
  onAccept: () => goToCave(),
  eyebrow: "There's something behind the water",
  title: "Do you want to enter?",
  yesLabel: "Step inside",
});
const prompts = [prompt, cavePrompt];
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
  onHeartHover: (on) => epkLinks.forEach((l) => l.classList.toggle("on", on)),
});
// The same link also sits at the end of the bottom row of links (added
// below, after the phone menu copies the planet links).
const dockEpk = epkLink.cloneNode(true);
dockEpk.classList.add("dock-epk");
dockEpk.style.setProperty("--c", "#ff3355"); // the heart's red
dockEpk.innerHTML = `<i></i>${EPK.panelLabel}<small>PDF ↓</small>`;
const epkLinks = [epkLink, dockEpk];
const lightHeart = (on) => () => space.heart.setHover(on);
for (const l of epkLinks) {
  l.addEventListener("pointerenter", lightHeart(true));
  l.addEventListener("pointerleave", lightHeart(false));
  l.addEventListener("focus", lightHeart(true));
  l.addEventListener("blur", lightHeart(false));
  l.addEventListener("click", () => space.heart.thump());
}
const post = createComposer(renderer, space.scene, space.camera);

const overlay = createLinkOverlay({
  planets: space.planets.list,
  hitsEl,
  dockEl: document.getElementById("dock"),
});

// ── Phone menu: the bottom links and the EPK link, behind a ☰ button ─────
const menu = document.getElementById("menu");
const menuBtn = document.getElementById("menu-btn");
for (const link of document.getElementById("dock").children) menu.appendChild(link.cloneNode(true));
menu.appendChild(document.createElement("hr"));
menu.appendChild(epkLink.cloneNode(true));
document.getElementById("dock").appendChild(dockEpk);

function setMenu(open) {
  menu.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  if (open) menu.querySelector("a")?.focus({ preventScroll: true });
}
const menuOpen = () => menu.classList.contains("open");
menuBtn.addEventListener("click", () => setMenu(!menuOpen()));
menu.addEventListener("click", (e) => e.target.closest("a") && setMenu(false));
document.addEventListener("pointerdown", (e) => {
  if (menuOpen() && !menu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
});
window.addEventListener(
  "keydown",
  (e) => {
    if (menuOpen() && e.key === "Escape") {
      e.stopImmediatePropagation(); // close the menu before Esc does anything else
      setMenu(false);
      menuBtn.focus({ preventScroll: true });
    }
  },
  true,
);

// After a new version of the site goes live, a page that was opened before
// it still asks for the old files, which no longer exist. If loading a world
// fails like that, reload the page (the fresh version) and go straight there.
async function loadFresh(loading, hash) {
  try {
    return await loading;
  } catch (err) {
    console.warn("A newer version of the site is live; reloading.", err);
    if (!sessionStorage.getItem("reloaded-for-update")) {
      sessionStorage.setItem("reloaded-for-update", "1");
      location.replace(location.pathname + location.search + hash);
      location.reload();
    }
    throw err;
  }
}
window.addEventListener("load", () => setTimeout(() => sessionStorage.removeItem("reloaded-for-update"), 10000));
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  if (sessionStorage.getItem("reloaded-for-update")) return;
  sessionStorage.setItem("reloaded-for-update", "1");
  location.reload();
});

let sphere = null; // built the first time someone visits
let cave = null; // the cave behind the waterfall, also built on first visit
let active = space;
let busy = false;

function setActive(world) {
  active = world;
  post.renderPass.scene = world.scene;
  post.renderPass.camera = world.camera;
  renderer.toneMappingExposure = world.exposure;
  Object.assign(post.bloomPass, world.bloom);

  const name = world === space ? "space" : world === sphere ? "sphere" : "cave";
  space.setEnabled(name === "space");
  sphere?.setEnabled(name === "sphere");
  cave?.setEnabled(name === "cave");
  document.body.dataset.world = name;
  hitsEl.hidden = name !== "space";
  spaceHint.hidden = name !== "space";
  epkPanel.hidden = name !== "space";
  sphereHint.hidden = name !== "sphere";
  caveHint.hidden = name !== "cave";
  backBtn.hidden = name === "space";
  backLabel.textContent = name === "cave" ? "Back outside" : "Back to space";
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
    const { createSphereWorld } = await loadFresh(loading, "#sphere");
    sphere = createSphereWorld(renderer, { reduceMotion, onWaterfallClick: () => cavePrompt.open() });
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

// Through the waterfall into the cave, with a cool watery fade.
async function goToCave({ instant = false } = {}) {
  if (busy || active !== sphere) return;
  busy = true;
  cavePrompt.close();
  const loading = cave ? null : import("./app/createCaveWorld.js");
  warp.dataset.tone = "water";
  await fadeTo(warp, 1, instant ? 0 : 900);
  if (loading) {
    const { createCaveWorld } = await loadFresh(loading, "#cave");
    cave = createCaveWorld(renderer, { reduceMotion, onExit: () => leaveCave() });
  }
  await cave.ready;
  cave.enter();
  setActive(cave);
  history.replaceState(null, "", "#cave");
  await nextFrame();
  await fadeTo(warp, 0, 1300);
  delete warp.dataset.tone;
  busy = false;
  backBtn.focus({ preventScroll: true });
}

// Back out through the water, to where you were standing in the sphere.
async function leaveCave() {
  if (busy || active !== cave) return;
  busy = true;
  warp.dataset.tone = "water";
  await fadeTo(warp, 1, 700);
  setActive(sphere);
  history.replaceState(null, "", "#sphere");
  await nextFrame();
  await fadeTo(warp, 0, 1000);
  delete warp.dataset.tone;
  busy = false;
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

backBtn.addEventListener("click", () => (active === cave ? leaveCave() : goToSpace()));
window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const open = prompts.find((p) => p.isOpen);
  if (open) open.close();
  else if (active === cave) leaveCave();
  else if (active === sphere) goToSpace();
});
// Tapping the scene dismisses an open prompt.
renderer.domElement.addEventListener("pointerdown", () => prompts.forEach((p) => p.isOpen && p.close()));

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
  cave?.onResize();
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
  const startAt = location.hash;
  if (startAt === "#sphere" || startAt === "#cave") await goToSphere({ instant: true });
  if (startAt === "#cave") await goToCave({ instant: true });
  requestAnimationFrame(() => document.getElementById("loading-screen")?.classList.add("hidden"));
});
