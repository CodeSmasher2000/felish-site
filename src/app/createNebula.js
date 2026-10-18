import * as THREE from "three";
import { NOISE_GLSL } from "./lib/noise.glsl.js";

// A huge inside-out sphere painted with fbm noise: violet dust, teal haze
// and a faint galactic band.
export function createNebula() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vDir;
      ${NOISE_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        float n  = fbm(d * 2.2 + vec3(0.0, 0.0, uTime * 0.004));
        float n2 = fbm(d * 4.4 + n * 1.6);
        float band = smoothstep(0.6, 0.0, abs(d.y + 0.22 * sin(d.x * 2.6 + 0.8)));
        vec3 col = vec3(0.010, 0.008, 0.022);
        col += vec3(0.17, 0.06, 0.30) * pow(n2, 2.4) * 1.3 * (0.35 + band);
        col += vec3(0.02, 0.15, 0.19) * pow(fbm(d * 3.1 + 7.0), 3.0) * 1.4;
        col += vec3(0.42, 0.14, 0.24) * pow(n * n2, 3.0) * 1.1 * band;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 32), material);

  return {
    object: mesh,
    update(time) {
      material.uniforms.uTime.value = time;
    },
  };
}
