import * as THREE from "three";
import { rng } from "./lib/random.js";
import { atmosphere, glowSprite } from "./lib/glow.js";

// Gas-giant style bands with wavy turbulence and one storm spot.
export function paintPlanet(pal, seed, swirl) {
  const w = 512;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  const d = img.data;
  const R = rng(seed);
  const cols = pal.map((hex) => new THREE.Color(hex));
  const k1 = 0.04 + R() * 0.04;
  const k2 = 0.12 + R() * 0.1;
  const s1 = R() * 10;
  const s2 = R() * 10;
  const tmp = new THREE.Color();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = (x / w) * Math.PI * 2;
      const yy =
        y + 7 * Math.sin(wx * 3 + y * 0.05 + s1) + (swirl ? 18 * Math.sin(wx * 2 + y * 0.02) : 0);
      let v = 0.5 + 0.32 * Math.sin(yy * k1 + s1) + 0.18 * Math.sin(yy * k2 + s2) + (R() - 0.5) * 0.06;
      if (swirl) v = (v + (x / w) * 0.4) % 1;
      v = Math.min(0.999, Math.max(0, v));
      const f = v * (cols.length - 1);
      const i0 = Math.floor(f);
      tmp.copy(cols[i0]).lerp(cols[i0 + 1], f - i0);
      // Colors are linear after Color() parsing; convert back to sRGB for the canvas.
      tmp.convertLinearToSRGB();
      const o = (y * w + x) * 4;
      d[o] = tmp.r * 255;
      d[o + 1] = tmp.g * 255;
      d[o + 2] = tmp.b * 255;
      d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  const sx = R() * w;
  const sy = h * (0.3 + R() * 0.4);
  const grd = g.createRadialGradient(sx, sy, 0, sx, sy, 26);
  grd.addColorStop(0, pal[3]);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.beginPath();
  g.ellipse(sx, sy, 34, 14, 0, 0, Math.PI * 2);
  g.fill();
  return c;
}

// Ring stripes, written as pixels directly (not via a canvas with
// transparency, which Safari garbles at low alpha — see glow.js).
function paintRing(pal) {
  const W = 512;
  const data = new Uint8Array(W * 4);
  const R = rng(3);
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [a, b] = [rgb(pal[3]), rgb(pal[2])];
  for (let x = 0; x < W; x++) {
    const t = x / W;
    const alpha = (0.25 + 0.6 * R()) * Math.sin(t * Math.PI) * (x % 37 < 4 ? 0.2 : 1);
    const c = x % 90 < 45 ? a : b;
    data.set([c[0], c[1], c[2], Math.round(alpha * 255)], x * 4);
  }
  const tex = new THREE.DataTexture(data, W, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export function createRing(p) {
  const inner = p.radius * 1.45;
  const outer = p.radius * 2.3;
  const geom = new THREE.RingGeometry(inner, outer, 96, 1);
  // Remap UVs radially so the 1D stripe texture runs from inner to outer edge.
  const uv = geom.attributes.uv;
  const pos = geom.attributes.position;
  const v = new THREE.Vector3();
  for (let k = 0; k < uv.count; k++) {
    v.fromBufferAttribute(pos, k);
    uv.setXY(k, (v.length() - inner) / (outer - inner), 0.5);
  }
  const ring = new THREE.Mesh(
    geom,
    new THREE.MeshBasicMaterial({
      map: paintRing(p.pal),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = Math.PI / 2 - 0.4;
  return ring;
}

function orbitPoint(p, angle, target = new THREE.Vector3()) {
  return target.set(
    Math.cos(angle) * p.orbit,
    Math.sin(angle) * p.orbit * p.tilt,
    Math.sin(angle) * p.orbit,
  );
}

export function createPlanets(configs, { reduceMotion = false } = {}) {
  const root = new THREE.Group();

  const list = configs.map((p, i) => {
    const group = new THREE.Group();

    const tex = new THREE.CanvasTexture(paintPlanet(p.pal, 11 + i * 17, !!p.swirl));
    tex.colorSpace = THREE.SRGBColorSpace;
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(p.radius, 64, 48),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.62,
        metalness: 0.05,
        emissive: new THREE.Color(p.dot),
        emissiveIntensity: 0.12,
      }),
    );
    body.rotation.z = 0.35 * (i % 2 ? -1 : 1);
    group.add(body);
    group.add(atmosphere(p.dot, p.radius * 1.08, 3.0, 1.6));

    const glow = glowSprite(p.dot, p.radius * 6, 0.28);
    group.add(glow);
    if (p.ring) group.add(createRing(p));
    root.add(group);

    const pts = [];
    for (let k = 0; k <= 160; k++) pts.push(orbitPoint(p, (k / 160) * Math.PI * 2));
    const orbitLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: p.dot, transparent: true, opacity: 0.09, depthWrite: false }),
    );
    root.add(orbitLine);

    return {
      config: p,
      group,
      body,
      glow,
      orbitLine,
      angle: p.phase,
      hover: 0, // eased 0..1
      hovered: false, // set by the link overlay
    };
  });

  return {
    object: root,
    list,
    update(dt) {
      const anyHover = list.some((s) => s.hovered);
      const motion = reduceMotion ? 0.15 : 1;
      for (const s of list) {
        // The hovered planet stops so it's easy to click; the others slow down.
        if (!s.hovered) s.angle += dt * s.config.speed * motion * (anyHover ? 0.25 : 1);
        orbitPoint(s.config, s.angle, s.group.position);
        s.body.rotation.y += dt * 0.35;
        s.hover += ((s.hovered ? 1 : 0) - s.hover) * Math.min(1, dt * 8);
        s.group.scale.setScalar(1 + s.hover * 0.35);
        s.glow.material.opacity = 0.28 + s.hover * 0.45;
        s.orbitLine.material.opacity = 0.09 + s.hover * 0.25;
      }
    },
  };
}
