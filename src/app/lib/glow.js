import * as THREE from "three";

let glowTex = null;

// Pixels are computed directly rather than drawn with a canvas gradient:
// Safari stores faint, almost-transparent canvas pixels premultiplied, and
// turning them back into colours garbles each channel (random magenta/cyan
// specks that the large halos then magnify into blobs on iPhones). Here the
// colour is always pure white and only the transparency fades.
export function getGlowTexture() {
  if (glowTex) return glowTex;
  const N = 256;
  const data = new Uint8Array(N * N * 4);
  const stops = [
    [0, 1],
    [0.25, 0.55],
    [0.5, 0.14],
    [1, 0],
  ];
  const alphaAt = (t) => {
    for (let k = 1; k < stops.length; k++) {
      const [t1, a1] = stops[k];
      const [t0, a0] = stops[k - 1];
      if (t <= t1) return a0 + ((a1 - a0) * (t - t0)) / (t1 - t0);
    }
    return 0;
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const t = Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2) / (N / 2);
      const o = (y * N + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = 255;
      data[o + 3] = Math.round(alphaAt(Math.min(1, t)) * 255);
    }
  }
  glowTex = new THREE.DataTexture(data, N, N);
  glowTex.magFilter = THREE.LinearFilter;
  glowTex.minFilter = THREE.LinearMipmapLinearFilter;
  glowTex.generateMipmaps = true;
  glowTex.needsUpdate = true;
  return glowTex;
}

// Soft camera-facing halo. Placed at an object's centre, the object itself
// hides the bright middle, so only the glow around its edge shows.
export function glowSprite(color, size, opacity) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  sprite.scale.setScalar(size);
  return sprite;
}

// Fresnel rim shell: brightest where the surface turns away from the camera.
export function atmosphere(color, radius, power, intensity) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uPower: { value: power },
        uIntensity: { value: intensity },
      },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uPower;
        uniform float uIntensity;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          // Clamped before pow(): a hair below zero (rounding) gives NaN on some GPUs.
          float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), uPower);
          gl_FragColor = vec4(uColor * f * uIntensity, f);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
}
