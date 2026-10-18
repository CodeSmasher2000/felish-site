import "./style.css";
import { createRenderer, createComposer } from "./app/createRenderer.js";
import { createSpaceWorld } from "./app/createSpaceWorld.js";
import { createLinkOverlay } from "./app/createLinkOverlay.js";
import { ARTIST } from "./config.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
