import * as THREE from "three";
import { glowSprite } from "./lib/glow.js";
import { asset } from "./lib/asset.js";

// A glossy red heart floating beside the moon. It beats gently, glows, and is
// a real download link (an <a download> laid over it on screen), so clicking
// it saves the press kit, and it works with the keyboard too.
export function createHeart({ url, fileName, label, hitsEl, reduceMotion = false }) {
  // Classic heart outline (cusp at the top, point at the bottom).
  const s = new THREE.Shape();
  s.moveTo(0, 0.35);
  s.bezierCurveTo(0, 0.6, -0.45, 0.85, -0.75, 0.55);
  s.bezierCurveTo(-1.05, 0.25, -0.9, -0.15, -0.55, -0.45);
  s.bezierCurveTo(-0.3, -0.65, -0.1, -0.8, 0, -1.0);
  s.bezierCurveTo(0.1, -0.8, 0.3, -0.65, 0.55, -0.45);
  s.bezierCurveTo(0.9, -0.15, 1.05, 0.25, 0.75, 0.55);
  s.bezierCurveTo(0.45, 0.85, 0, 0.6, 0, 0.35);

  const geometry = new THREE.ExtrudeGeometry(s, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.22,
    bevelSize: 0.16,
    bevelSegments: 10,
    curveSegments: 48,
  });
  geometry.center();

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xd8102f,
    roughness: 0.18,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xff8fa6),
    emissive: new THREE.Color(0xff1f45),
    emissiveIntensity: 0.35,
  });

  const group = new THREE.Group();
  const heart = new THREE.Mesh(geometry, material);
  heart.scale.setScalar(0.45);
  group.add(heart);
  const glow = glowSprite(0xff3355, 2.6, 0.5);
  group.add(glow);
  // Beside the moon, up and to the left, clear of the planets' orbits.
  group.position.set(-4.4, 3.3, 2.2);

  // ── The download link laid over the heart ────────────────────────────
  const hit = document.createElement("a");
  hit.className = "hit heart-hit";
  hit.href = asset(url);
  hit.setAttribute("download", fileName);
  hit.setAttribute("aria-label", `Download ${label} (PDF)`);
  hit.innerHTML = `<span class="tag">${label}<b>PDF ↓</b></span>`;
  hitsEl.appendChild(hit);
  let hovered = false;
  hit.addEventListener("pointerenter", () => (hovered = true));
  hit.addEventListener("pointerleave", () => (hovered = false));
  hit.addEventListener("focus", () => (hovered = true));
  hit.addEventListener("blur", () => (hovered = false));
  let thump = 0;
  hit.addEventListener("click", () => (thump = 1)); // a happy extra beat

  const world = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  let hover = 0;

  function update(dt, time, camera, moonRadius) {
    // Heartbeat: a "lub-dub" every ~1.2 s, quicker when hovered.
    const rate = hovered ? 1.9 : 1.2;
    const p = (time * rate) % 1;
    const pulse = (centre, width) => Math.exp(-(((p - centre) / width) ** 2));
    const beat = reduceMotion ? 0 : pulse(0.08, 0.05) * 0.12 + pulse(0.28, 0.06) * 0.08;
    hover += ((hovered ? 1 : 0) - hover) * Math.min(1, dt * 8);
    thump *= Math.pow(0.1, dt);
    heart.scale.setScalar(0.45 * (1 + beat + hover * 0.22 + thump * 0.3));
    heart.rotation.y = reduceMotion ? 0.3 : Math.sin(time * 0.6) * 0.5;
    group.position.y = 3.3 + (reduceMotion ? 0 : Math.sin(time * 0.9) * 0.12);
    material.emissiveIntensity = 0.35 + beat * 2 + hover * 0.35;
    glow.material.opacity = 0.45 + beat * 1.5 + hover * 0.3 + thump * 0.4;

    // Keep the link over the heart on screen (hidden if behind the moon).
    group.getWorldPosition(world);
    const dist = world.distanceTo(camera.position);
    const toHeart = world.clone().sub(camera.position).normalize();
    const along = -camera.position.dot(toHeart);
    const closest = camera.position.clone().addScaledVector(toHeart, along);
    const occluded = along > 0 && along < dist && closest.length() < moonRadius * 0.98;
    ndc.copy(world).project(camera);
    if (ndc.z > 1 || occluded) {
      hit.hidden = true;
      return;
    }
    hit.hidden = false;
    const x = (ndc.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-ndc.y * 0.5 + 0.5) * window.innerHeight;
    const r = (0.65 / (dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * (window.innerHeight / 2);
    const size = Math.max(44, r * 2.4);
    hit.style.width = hit.style.height = `${size}px`;
    hit.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
  }

  return { object: group, update };
}
