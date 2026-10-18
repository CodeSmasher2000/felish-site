import * as THREE from "three";

// An embedded player (an iframe) that floats in the scene above a point in
// the world, following it as the camera moves. On narrow screens it docks to
// the bottom of the screen instead, so it's always usable on a phone.
export function createFloatingEmbed({ title, height = 352, width = 360 }) {
  const el = document.createElement("div");
  el.className = "float-embed";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", title);
  el.innerHTML = `
    <div class="post-card">
      <button type="button" class="post-close" aria-label="Close">×</button>
      <div class="float-frame"></div>
    </div>
    <i class="float-stem" aria-hidden="true"></i>`;
  document.body.appendChild(el);
  el.style.setProperty("--embed-w", `${width}px`);

  const frame = el.querySelector(".float-frame");
  const close = el.querySelector(".post-close");
  const anchor = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  let open = false;

  function show(src, worldPos) {
    anchor.copy(worldPos);
    if (!frame.firstChild) {
      frame.innerHTML = `<iframe src="${src}" title="${title}" width="100%" height="${height}" frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    }
    el.classList.add("open");
    open = true;
  }

  function hide() {
    if (!open) return;
    open = false;
    el.classList.remove("open");
    // Keep the iframe (and anything playing) for a moment in case it's reopened.
    setTimeout(() => {
      if (!open) frame.innerHTML = "";
    }, 400);
  }

  close.addEventListener("click", hide);
  window.addEventListener(
    "keydown",
    (e) => {
      if (open && e.key === "Escape") {
        e.stopImmediatePropagation(); // Esc closes this before leaving the sphere
        hide();
      }
    },
    true,
  );

  // Pin the panel above the anchor on screen.
  function update(camera) {
    if (!open) return;
    const docked = window.innerWidth < 640;
    el.classList.toggle("docked", docked);
    if (docked) {
      el.style.transform = "";
      return;
    }
    ndc.copy(anchor).project(camera);
    const behind = ndc.z > 1;
    el.classList.toggle("offscreen", behind);
    const x = (ndc.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-ndc.y * 0.5 + 0.5) * window.innerHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = THREE.MathUtils.clamp(x - w / 2, 16, window.innerWidth - w - 16);
    const top = THREE.MathUtils.clamp(y - h - 12, 16, window.innerHeight - h - 16);
    el.style.transform = `translate(${left}px, ${top}px)`;
    el.style.setProperty("--stem-x", `${THREE.MathUtils.clamp(x - left, 24, w - 24)}px`);
  }

  return {
    show,
    hide,
    update,
    get isOpen() {
      return open;
    },
  };
}
