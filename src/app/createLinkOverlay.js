import * as THREE from "three";

// Builds two sets of real <a> links for the planets:
//  - invisible hit targets that track each planet on screen (mouse/touch)
//  - the always-visible dock at the bottom (keyboard, screen readers, phones)
// Hovering either one marks the planet as hovered so the 3D side reacts.
export function createLinkOverlay({ planets, hitsEl, dockEl }) {
  const entries = planets.map((planet) => {
    const p = planet.config;

    const hit = document.createElement("a");
    hit.className = "hit";
    hit.href = p.url;
    hit.target = "_blank";
    hit.rel = "noopener";
    hit.tabIndex = -1; // the dock carries keyboard focus
    hit.innerHTML = `<span class="tag">${p.name}<b>${p.verb} ↗</b></span>`;
    hitsEl.appendChild(hit);

    const link = document.createElement("a");
    link.href = p.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.style.setProperty("--c", p.dot);
    link.innerHTML = `<i></i>${p.name}<small>${p.verb}</small>`;
    dockEl.appendChild(link);

    const on = () => {
      planet.hovered = true;
      hit.classList.add("on");
      link.classList.add("on");
    };
    const off = () => {
      planet.hovered = false;
      hit.classList.remove("on");
      link.classList.remove("on");
    };
    for (const el of [hit, link]) {
      el.addEventListener("pointerenter", on);
      el.addEventListener("pointerleave", off);
    }
    link.addEventListener("focus", on);
    link.addEventListener("blur", off);

    return { planet, hit };
  });

  const world = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  const toPlanet = new THREE.Vector3();
  const closest = new THREE.Vector3();

  function update(camera, moonRadius) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

    for (const { planet, hit } of entries) {
      planet.group.getWorldPosition(world);
      const dist = world.distanceTo(camera.position);

      // Hidden when the moon (at the origin) sits between camera and planet.
      toPlanet.copy(world).sub(camera.position).normalize();
      const along = -camera.position.dot(toPlanet);
      closest.copy(camera.position).addScaledVector(toPlanet, along);
      const occluded = along > 0 && along < dist && closest.length() < moonRadius * 0.98;

      ndc.copy(world).project(camera);
      if (ndc.z > 1 || occluded) {
        hit.hidden = true;
        continue;
      }
      hit.hidden = false;

      const x = (ndc.x * 0.5 + 0.5) * w;
      const y = (-ndc.y * 0.5 + 0.5) * h;
      const radiusPx = ((planet.config.radius * planet.group.scale.x) / (dist * tanHalfFov)) * (h / 2);
      const size = Math.max(44, radiusPx * 2.4); // never smaller than a 44px touch target
      hit.style.width = hit.style.height = `${size}px`;
      hit.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
    }
  }

  return { update };
}
