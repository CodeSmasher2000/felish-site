import * as THREE from "three";

// Glitter: twinkling sparkles (mostly gold, some white and aqua) born across
// a rectangle and drifting away from it, fading in and out. Everything is
// animated on the GPU, so hundreds of them cost next to nothing.
//
//   origin    centre of the bottom edge of the rectangle they're born on
//   across    unit vector along its width; width is how wide it is
//   height    [min, max] height above the origin they're born at
//   out       unit vector they drift along; distance [min, max] how far
//   rise      [min, max] how much they float up over a lifetime
//   spread    how much they fan out sideways over a lifetime
//   size      sparkle size (1 ≈ a small sparkle at arm's length in the cave)
//   life      seconds per lifetime, roughly
export function createSparkles({
  count = 300,
  origin,
  across = new THREE.Vector3(1, 0, 0),
  width = 4,
  height = [0.6, 6.6],
  out = new THREE.Vector3(0, 0, -1),
  distance = [4, 10],
  rise = [0.4, 1.8],
  spread = 5,
  size = 1,
  life = 11,
}) {
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count * 4; i++) seeds[i] = Math.random();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));

  const uniforms = {
    uTime: { value: 0 },
    uOrigin: { value: origin.clone() },
    uAcross: { value: across.clone().normalize() },
    uOut: { value: out.clone().normalize() },
    uWidth: { value: width },
    uHeight: { value: new THREE.Vector2(...height) },
    uDistance: { value: new THREE.Vector2(...distance) },
    uRise: { value: new THREE.Vector2(...rise) },
    uSpread: { value: spread },
    uSize: { value: size },
    uRate: { value: 1 / life },
    uScale: { value: 1 },
  };

  const points = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;
        uniform float uTime, uWidth, uSpread, uSize, uRate, uScale;
        uniform vec3 uOrigin, uAcross, uOut;
        uniform vec2 uHeight, uDistance, uRise;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float life = fract(uTime * uRate * (0.75 + aSeed.w * 0.6) + aSeed.x);
          vec3 p = uOrigin + uAcross * (aSeed.y - 0.5) * uWidth;
          p.y += mix(uHeight.x, uHeight.y, aSeed.z);
          p += uOut * life * mix(uDistance.x, uDistance.y, aSeed.w);
          p += uAcross * ((aSeed.y - 0.5) * life * uSpread + sin(uTime * 0.8 + aSeed.x * 40.0) * 0.08 * uSpread * life);
          p.y += life * mix(uRise.x, uRise.y, aSeed.x) + sin(uTime * 1.3 + aSeed.z * 30.0) * 0.05 * uSpread;
          float twinkle = pow(0.5 + 0.5 * sin(uTime * (3.0 + aSeed.z * 6.0) + aSeed.y * 50.0), 3.0);
          vAlpha = smoothstep(0.0, 0.12, life) * smoothstep(1.0, 0.6, life) * (0.25 + 0.75 * twinkle);
          vColor = aSeed.w < 0.55 ? vec3(1.0, 0.82, 0.45) : (aSeed.w < 0.85 ? vec3(1.0, 0.97, 0.92) : vec3(0.6, 0.95, 1.0));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (0.35 + 0.45 * twinkle) * uSize * uScale * 300.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float core = smoothstep(0.5, 0.0, length(c));
          // a little four-point star
          float star = max(0.0, 1.0 - abs(c.x) * 9.0) * max(0.0, 1.0 - abs(c.y) * 2.2)
                     + max(0.0, 1.0 - abs(c.y) * 9.0) * max(0.0, 1.0 - abs(c.x) * 2.2);
          float a = (core * core * 0.9 + star * 0.8) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor * a * 1.6, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.frustumCulled = false;

  // Keep sparkles the same size on screen across screen sizes and pixel ratios.
  const rescale = () =>
    (uniforms.uScale.value = (Math.min(window.innerHeight, 1000) / 800) * Math.min(window.devicePixelRatio, 2));
  rescale();
  window.addEventListener("resize", rescale);

  return {
    object: points,
    update(dt) {
      uniforms.uTime.value += dt;
    },
  };
}
