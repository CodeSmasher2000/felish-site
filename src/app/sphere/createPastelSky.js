import * as THREE from "three";
import { NOISE_GLSL } from "../lib/noise.glsl.js";
import { PASTEL } from "./palette.js";

// Gradient sky dome: peach horizon → lilac → periwinkle overhead, a soft
// low sun, and faint twinkling stars high up.
export function createPastelSky({ sunDir }) {
  const horizon = new THREE.Color(PASTEL.horizon);

  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(PASTEL.periwinkle) },
      uMid: { value: new THREE.Color(PASTEL.lilac) },
      uHorizon: { value: horizon },
      uGround: { value: new THREE.Color(PASTEL.pink) },
      uSunDir: { value: sunDir.clone().normalize() },
      uSunColor: { value: new THREE.Color("#ffc187") }, // low golden sun
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uMid, uHorizon, uGround, uSunDir, uSunColor;
      uniform float uTime;
      varying vec3 vDir;
      ${NOISE_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, y));
        col = mix(col, uTop, smoothstep(0.25, 0.95, y));
        col = mix(col, uGround, smoothstep(0.0, -0.3, y));

        // soft streaky clouds near the horizon
        float cloud = fbm(vec3(d.x * 3.0, y * 14.0, d.z * 3.0) + vec3(uTime * 0.01, 0.0, 0.0));
        col = mix(col, vec3(1.0, 0.84, 0.74), smoothstep(0.55, 0.8, cloud) * smoothstep(0.35, 0.05, abs(y - 0.08)) * 0.5);

        float s = max(dot(d, uSunDir), 0.0);
        col += uSunColor * (pow(s, 6.0) * 0.32 + pow(s, 350.0) * 1.85);

        vec3 cell = floor(d * 320.0);
        float h = hash(cell);
        float star = step(0.9982, h) * smoothstep(0.3, 0.75, y);
        col += star * (0.55 + 0.45 * sin(uTime * 2.0 + h * 60.0)) * 0.7;

        gl_FragColor = vec4(col, 1.0);
      }`,
  });

  const geometry = new THREE.SphereGeometry(900, 48, 32);
  const mesh = new THREE.Mesh(geometry, material);

  return {
    object: mesh,
    horizonColor: horizon,
    // A twin mesh for baking reflections (PMREM) without moving the real one.
    createEnvMesh: () => new THREE.Mesh(geometry, material),
    update(time) {
      material.uniforms.uTime.value = time;
    },
  };
}
