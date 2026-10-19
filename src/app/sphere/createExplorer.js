import * as THREE from "three";
import { glowSprite } from "../lib/glow.js";

// Walking around the sphere.
//
//   drag                 look around (orbit the point you're looking at)
//   right-drag / 2 fingers  slide across the ground
//   scroll / pinch       closer / further
//   W A S D / arrows     walk (Shift to hurry)
//   tap the ground       glide there
//
// The point you look at always hugs the terrain, the camera never dips below
// the ground, and you can't wander off the edge of the world.
const EYE = 3; // how far above the ground the look-at point floats
const BOUNDS = 210; // how far from the landing spot you can roam
const WALK_SPEED = 14; // m/s

export function createExplorer({ camera, controls, terrain, scene, reduceMotion = false }) {
  controls.enablePan = true;
  controls.screenSpacePanning = false; // pan slides along the ground, not the screen
  controls.panSpeed = 1.2;
  controls.minDistance = 4;
  controls.maxDistance = 60;
  controls.maxPolarAngle = 1.45; // never look up from below the ground

  const ground = (x, z) => terrain.heightAt(x, z);
  const delta = new THREE.Vector3();

  // Move the look-at point and the camera together (keeps the view angle).
  function shift(dx, dy, dz) {
    controls.target.x += dx;
    controls.target.y += dy;
    controls.target.z += dz;
    camera.position.x += dx;
    camera.position.y += dy;
    camera.position.z += dz;
  }

  // ── Gliding (tap-to-walk and going home) ──────────────────────────────
  let glide = null;
  // `onArrive` runs when the glide finishes (not if it's interrupted).
  function glideTo(target, cameraPos = null, duration = 1.2, onArrive = null) {
    const offset = camera.position.clone().sub(controls.target);
    glide = {
      fromT: controls.target.clone(),
      toT: target.clone(),
      fromC: camera.position.clone(),
      toC: cameraPos ? cameraPos.clone() : target.clone().add(offset),
      t: 0,
      dur: reduceMotion ? 0.01 : duration,
      onArrive,
    };
  }
  const cancelGlide = () => (glide = null);

  // ── Tap the ground ────────────────────────────────────────────────────
  // March along the view ray until it dips below the terrain, then refine.
  function groundHit(ray) {
    const p = new THREE.Vector3();
    let prev = 0;
    for (let t = 0.5; t < 450; t += 0.75) {
      ray.at(t, p);
      if (p.y < ground(p.x, p.z)) {
        let lo = prev;
        let hi = t;
        for (let k = 0; k < 8; k++) {
          const mid = (lo + hi) / 2;
          ray.at(mid, p);
          if (p.y < ground(p.x, p.z)) hi = mid;
          else lo = mid;
        }
        ray.at(hi, p);
        return Math.hypot(p.x, p.z) <= BOUNDS ? p : null;
      }
      prev = t;
    }
    return null;
  }

  // A soft ring where you tapped, so you see where you're going.
  const marker = glowSprite(0xfff0fa, 3, 0);
  scene.add(marker);
  let markerLife = 0;

  function walkTo(point) {
    const target = new THREE.Vector3(point.x, ground(point.x, point.z) + EYE, point.z);
    const dist = target.distanceTo(controls.target);
    glideTo(target, null, Math.min(2.2, 0.6 + dist / 40));
    marker.position.set(point.x, ground(point.x, point.z) + 0.4, point.z);
    markerLife = 1;
  }

  // ── Keyboard walking ──────────────────────────────────────────────────
  const keys = new Set();
  let active = false;
  const MOVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
  window.addEventListener("keydown", (e) => {
    if (!active || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (MOVE_KEYS.includes(k)) {
      keys.add(k);
      cancelGlide();
      e.preventDefault(); // don't scroll the page with arrows
    }
    if (k === "shift") keys.add("shift");
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  function update(dt) {
    // Glide in progress?
    if (glide) {
      glide.t = Math.min(1, glide.t + dt / glide.dur);
      const e = glide.t * glide.t * (3 - 2 * glide.t);
      controls.target.lerpVectors(glide.fromT, glide.toT, e);
      camera.position.lerpVectors(glide.fromC, glide.toC, e);
      if (glide.t >= 1) {
        const done = glide.onArrive;
        glide = null;
        done?.();
      }
    }

    // Keyboard walking, relative to where the camera faces (flattened).
    const fwd = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    const str = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    if (fwd || str) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.set(-forward.z, 0, forward.x);
      const speed = WALK_SPEED * (keys.has("shift") ? 2.2 : 1) * dt;
      delta.copy(forward).multiplyScalar(fwd).addScaledVector(right, str).normalize().multiplyScalar(speed);
      shift(delta.x, 0, delta.z);
    }

    controls.update();

    // Stay inside the world.
    const r = Math.hypot(controls.target.x, controls.target.z);
    if (r > BOUNDS) {
      const k = BOUNDS / r;
      shift(controls.target.x * k - controls.target.x, 0, controls.target.z * k - controls.target.z);
    }

    // Look-at point hugs the terrain (eased, so walking over bumps is smooth).
    if (!glide) {
      const want = ground(controls.target.x, controls.target.z) + EYE;
      shift(0, (want - controls.target.y) * Math.min(1, dt * 6), 0);
    }

    // Never below the floor.
    const floor = ground(camera.position.x, camera.position.z) + 1.5;
    if (camera.position.y < floor) camera.position.y = floor;

    // Fade the tap marker.
    if (markerLife > 0) {
      markerLife = Math.max(0, markerLife - dt * 1.4);
      marker.material.opacity = Math.sin(markerLife * Math.PI) * 0.8;
      marker.scale.setScalar(2 + (1 - markerLife) * 3);
    }
  }

  return {
    EYE,
    update,
    glideTo,
    walkTo,
    groundHit,
    cancel: cancelGlide,
    setActive(on) {
      active = on;
      if (!on) keys.clear();
    },
  };
}
