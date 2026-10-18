import * as THREE from "three";
import { asset } from "./lib/asset.js";
import { rng } from "./lib/random.js";
import { atmosphere, glowSprite } from "./lib/glow.js";

const MOON_RADIUS = 2.4;

// The moon's look in one place. The surface is kept dark and matte while the
// glow comes from the rim shell and halos around it, so the two can be tuned
// separately (also live in the ?debug panel).
export const MOON_LOOK = {
  surfaceBrightness: 0.42, // 0–1 multiplier on the photo's colour
  surfaceGlow: 0.04, // how much the surface lights itself
  rimGlow: 2.2, // warm light hugging the edge
  haloGlow: 0.6, // soft warm halo around the moon
  outerGlow: 0.2, // wide violet haze
};

// Procedural equirectangular moon: maria, grain, craters with lit rims and rays.
function paintMoon() {
  const w = 2048;
  const h = 1024;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const R = rng(42);

  g.fillStyle = "#9b968e";
  g.fillRect(0, 0, w, h);

  // Draw near the seam twice so the texture wraps cleanly.
  const wrap = (x, y, fn) => {
    fn(x, y);
    if (x < 120) fn(x + w, y);
    if (x > w - 120) fn(x - w, y);
  };

  for (let i = 0; i < 22; i++) {
    const x = R() * w;
    const y = h * 0.2 + R() * h * 0.6;
    const r = 60 + R() * 170;
    const rot = R() * 3;
    wrap(x, y, (cx, cy) => {
      const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      grd.addColorStop(0, "rgba(52,50,58,0.55)");
      grd.addColorStop(0.7, "rgba(60,58,64,0.35)");
      grd.addColorStop(1, "rgba(60,58,64,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(cx, cy, r * 1.4, r, rot, 0, Math.PI * 2);
      g.fill();
    });
  }

  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (R() - 0.5) * 26;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  for (let i = 0; i < 520; i++) {
    const r = 3 + Math.pow(R(), 3.2) * 46;
    const x = R() * w;
    const y = h * 0.06 + R() * h * 0.88;
    const rimAlpha = 0.25 + R() * 0.3;
    const rays = r > 26 && R() < 0.5;
    const rayAngles = rays ? Array.from({ length: 14 }, () => [R() * Math.PI * 2, r * (2 + R() * 4)]) : [];
    wrap(x, y, (cx, cy) => {
      const grd = g.createRadialGradient(cx + r * 0.15, cy + r * 0.15, 0, cx, cy, r);
      grd.addColorStop(0, "rgba(40,38,44,0.55)");
      grd.addColorStop(0.75, "rgba(70,68,72,0.35)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(cx, cy, r * 1.15, r, 0, 0, Math.PI * 2);
      g.fill();

      g.strokeStyle = `rgba(235,228,214,${rimAlpha})`;
      g.lineWidth = Math.max(1, r * 0.12);
      g.beginPath();
      g.ellipse(cx, cy, r * 1.1, r * 0.95, 0, Math.PI * 0.95, Math.PI * 1.75);
      g.stroke();

      g.strokeStyle = "rgba(230,224,210,0.06)";
      g.lineWidth = 2;
      for (const [a, L] of rayAngles) {
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L);
        g.stroke();
      }
    });
  }
  return c;
}

export function createMoon({ textureUrl = null, reduceMotion = false } = {}) {
  const canvas = paintMoon();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(canvas);

  const material = new THREE.MeshStandardMaterial({
    map,
    bumpMap: bump,
    bumpScale: 2.5,
    roughness: 0.96,
    metalness: 0,
    emissive: new THREE.Color(0xf2e2c0),
    emissiveMap: map,
    emissiveIntensity: 0.32,
  });

  // Swap in a real photo texture if one is configured. `ready` resolves once
  // it's applied (or straight away, or on error, with the procedural moon).
  const ready = !textureUrl
    ? Promise.resolve()
    : new THREE.TextureLoader()
        .loadAsync(asset(textureUrl))
        .then((tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          material.map = tex;
          material.emissiveMap = tex;
          // A photo is albedo, not height: using it as a bump map turns bright
          // ray systems into fake ridges, so the photo drives colour only.
          material.bumpMap = null;
          // The photo is much brighter than the procedural map: darken the
          // surface and let the halo do the glowing instead.
          material.color.setScalar(MOON_LOOK.surfaceBrightness);
          material.needsUpdate = true;
          map.dispose();
          bump.dispose();
        })
        .catch((err) => console.warn("Moon texture failed to load, using procedural moon.", err));

  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(MOON_RADIUS, 128, 96), material);
  mesh.rotation.z = 0.12;
  group.add(mesh);
  const rim = atmosphere(0xf3dfb4, MOON_RADIUS * 1.035, 2.6, MOON_LOOK.rimGlow);
  group.add(rim);
  group.add(atmosphere(0x9d86ff, MOON_RADIUS * 1.12, 4.0, 0.7));

  const halo = glowSprite(0xf2dcae, MOON_RADIUS * 7.5, MOON_LOOK.haloGlow);
  const haloWide = glowSprite(0x7a5cff, MOON_RADIUS * 16, MOON_LOOK.outerGlow);
  group.add(halo, haloWide);

  let spin = 0;

  return {
    object: group,
    mesh,
    radius: MOON_RADIUS,
    ready,
    // Easter egg: each tap adds spin that decays back to normal.
    boost() {
      spin = Math.min(spin + 6, 24);
    },
    update(dt, time) {
      spin *= Math.pow(0.35, dt);
      mesh.rotation.y += dt * (reduceMotion ? 0.02 : 0.07) * (1 + spin);
      const breathe = reduceMotion ? 1 : 1 + Math.sin(time * 0.8) * 0.06;
      const flare = Math.min(spin, 10);
      halo.material.opacity = MOON_LOOK.haloGlow * breathe + flare * 0.03;
      haloWide.material.opacity = MOON_LOOK.outerGlow * breathe;
      rim.material.uniforms.uIntensity.value = MOON_LOOK.rimGlow * breathe + flare * 0.08;
      material.emissiveIntensity = (textureUrl ? MOON_LOOK.surfaceGlow : 0.32) + flare * 0.02;
      if (textureUrl) material.color.setScalar(MOON_LOOK.surfaceBrightness);
    },
  };
}
