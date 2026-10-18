import "./style.css";
import { createRenderer, createComposer } from "./app/createRenderer.js";
import { createSpaceWorld } from "./app/createSpaceWorld.js";
import { createLinkOverlay } from "./app/createLinkOverlay.js";
import { ARTIST } from "./config.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.getElementById("artist-name").textContent = ARTIST.name;
document.getElementById("artist-tagline").innerHTML =
  `${ARTIST.release} &middot; <span>${ARTIST.status}</span>`;

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

let firstFrame = true;
renderer.setAnimationLoop(() => {
  world.update();
  overlay.update(world.camera, world.moon.radius);
  post.composer.render();

  if (firstFrame) {
    firstFrame = false;
    document.getElementById("loading-screen")?.classList.add("hidden");
  }
});
