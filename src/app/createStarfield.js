import * as THREE from "three";
import { rng } from "./lib/random.js";

// Twinkling point-sprite stars on a thick shell around the scene.
export function createStarfield({ count = 4200, pixelRatio = 1 } = {}) {
  const R = rng(7);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const tints = [
    // Mostly white with only a hint of colour, so stars read as stars.
    [1, 1, 1],
    [1, 0.95, 0.88],
    [0.9, 0.94, 1],
    [1, 0.93, 0.96],
  ];

  for (let i = 0; i < count; i++) {
    const u = R() * 2 - 1;
    const theta = R() * Math.PI * 2;
    const r = 180 + R() * 220;
    const s = Math.sqrt(1 - u * u);
    positions.set([Math.cos(theta) * s * r, u * r, Math.sin(theta) * s * r], i * 3);
    colors.set(tints[(R() * tints.length) | 0], i * 3);
    sizes[i] = R() < 0.02 ? 5 + R() * 4 : 1 + Math.pow(R(), 3) * 3;
    phases[i] = R();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vTwinkle = 0.6 + 0.4 * sin(uTime * (0.8 + aPhase * 2.0) + aPhase * 6.2831);
        gl_PointSize = aSize * uPixelRatio * (280.0 / -mv.z);
        vColor = aColor;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = pow(smoothstep(0.5, 0.0, d), 2.2) * 0.85; // crisper, a little dimmer
        gl_FragColor = vec4(vColor * vTwinkle, a * vTwinkle);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return {
    object: new THREE.Points(geometry, material),
    update(time) {
      material.uniforms.uTime.value = time;
    },
  };
}
