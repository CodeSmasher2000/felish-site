import "./style.css";
import { createRenderer, createComposer } from "./app/createRenderer.js";
import { createSpaceWorld } from "./app/createSpaceWorld.js";
import { createLinkOverlay } from "./app/createLinkOverlay.js";
import { ARTIST } from "./config.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.getElementById("artist-name").textContent = ARTIST.name;
const tagline = document.getElementById("artist-tagline");
const release = document.createElement("a");
release.href = ARTIST.releaseUrl;
release.target = "_blank";
release.rel = "noopener";
release.innerHTML = `${ARTIST.release} &middot; <span>${ARTIST.status} ↗</span>`;
tagline.replaceChildren(release);

const renderer = createRenderer(document.getElementById("scene"));
const world = createSpaceWorld(renderer, { reduceMotion });
const post = createComposer(renderer, world.scene, world.camera);

const overlay = createLinkOverlay({
  planets: world.planets.list,
  hitsEl: document.getElementById("hits"),
  dockEl: document.getElementById("dock"),
});

// Dev-only tweak panel: open the site with ?debug
if (new URLSearchParams(location.search).has("debug")) {
  import("./app/setupGui.js").then(({ setupGui }) =>
    setupGui({ renderer, bloomPass: post.bloomPass, world }),
  );
}

window.addEventListener("resize", () => {
  world.onResize();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
});

// Keep the loading screen up until the moon texture is in, so it never pops.
world.moon.ready.then(() => {
  renderer.setAnimationLoop(() => {
    world.update();
    overlay.update(world.camera, world.moon.radius);
    post.composer.render();
  });
  requestAnimationFrame(() =>
    document.getElementById("loading-screen")?.classList.add("hidden"),
  );
});
