import * as THREE from "three";
import { getGlowTexture } from "../lib/glow.js";
import { rng } from "../lib/random.js";
import { PASTEL } from "./palette.js";

// Glowing pastel motes drifting slowly upward around the landing spot.
export function createDust({ count = 1400, radius = 70, height = 34, reduceMotion = false } = {}) {
  const R = rng(21);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);
  const tints = [PASTEL.pink, PASTEL.mint, PASTEL.cream, PASTEL.lilac, PASTEL.peach].map((c) => new THREE.Color(c));

  for (let i = 0; i < count; i++) {
    const a = R() * Math.PI * 2;
    const r = Math.sqrt(R()) * radius;
    positions.set([Math.cos(a) * r, R() * height, Math.sin(a) * r], i * 3);
    const c = tints[(R() * tints.length) | 0];
    colors.set([c.r, c.g, c.b], i * 3);
    speeds[i] = 0.3 + R() * 0.9;
    phases[i] = R() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.45,
      map: getGlowTexture(),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  return {
    object: points,
    update(dt, time) {
      if (reduceMotion) return;
      const pos = geometry.attributes.position;
      for (let i = 0; i < count; i++) {
        let y = pos.getY(i) + dt * speeds[i];
        if (y > height) y = 0;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(time * 0.6 + phases[i]) * dt * 0.25);
      }
      pos.needsUpdate = true;
    },
  };
}
