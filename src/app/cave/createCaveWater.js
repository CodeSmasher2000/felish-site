import * as THREE from "three";
import { NOISE_GLSL } from "../lib/noise.glsl.js";
import { glowSprite } from "../lib/glow.js";
import { CAVE } from "./createCaveShell.js";
import { createSparkles } from "../lib/createSparkles.js";

// The waterfall seen from the inside: a bright sheet of water pouring down
// at the back of the alcove (daylight shining through it), landing in a
// small pool with ripples and mist. Cool light against the warm lanterns.
export function createCaveWater({ reduceMotion = false }) {
  const group = new THREE.Group();
  const time = { value: 0 };
  const { pool, curtainZ } = CAVE;

  const WIDTH = 4.6;
  const HEIGHT = 9;
  const curtain = new THREE.Mesh(
    new THREE.PlaneGeometry(WIDTH, HEIGHT, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: { uTime: time },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        ${NOISE_GLSL}
        void main() {
          float flow = vUv.y + uTime * 1.6;
          float streaks = fbm(vec3(vUv.x * 14.0, flow * 1.2, 1.0));
          float fine = fbm(vec3(vUv.x * 40.0, flow * 3.0, 4.0));
          vec3 day = vec3(0.86, 0.97, 1.0);
          vec3 deep = vec3(0.32, 0.62, 0.72);
          vec3 col = mix(deep, day, smoothstep(0.3, 0.75, streaks));
          col += vec3(0.5) * smoothstep(0.62, 0.85, fine);
          float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
          float alpha = edge * (0.7 + 0.3 * streaks);
          gl_FragColor = vec4(col * 1.25, alpha);
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  curtain.position.set(pool.x, pool.y + HEIGHT / 2 - 0.1, curtainZ);
  curtain.rotation.y = Math.PI; // faces into the cave
  curtain.renderOrder = 2;
  group.add(curtain);

  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(pool.radius + 0.6, 64).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: { uTime: time, uRadius: { value: pool.radius + 0.6 }, uFall: { value: curtainZ - pool.z } },
      vertexShader: /* glsl */ `
        varying vec2 vLocal;
        void main() {
          vLocal = position.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uRadius, uFall;
        varying vec2 vLocal;
        ${NOISE_GLSL}
        void main() {
          float d = abs(vLocal.y - uFall);           // distance from where the water lands
          float ripple = (sin(d * 3.0 - uTime * 3.0) * 0.5 + 0.5) * exp(-d * 0.45);
          float n = fbm(vec3(vLocal * 0.8, uTime * 0.25));
          vec3 col = mix(vec3(0.05, 0.2, 0.24), vec3(0.3, 0.62, 0.66), n * 0.6 + ripple * 0.5);
          col = mix(col, vec3(0.9, 0.97, 1.0), smoothstep(1.4, 0.0, d) * 0.7);
          float r = length(vLocal) / uRadius;
          gl_FragColor = vec4(col, smoothstep(1.0, 0.8, r) * 0.9);
        }`,
      transparent: true,
      depthWrite: false,
    }),
  );
  pond.position.set(pool.x, pool.y, pool.z);
  pond.renderOrder = 1;
  group.add(pond);

  // Cool daylight coming through the water.
  const light = new THREE.PointLight(0x9fdcff, 30, 15, 1.6);
  light.position.set(pool.x, 2.2, curtainZ - 1.2);
  group.add(light);

  // ── Glitter: sparkles drifting in from the waterfall, twinkling as they
  // float through the cave and fade.
  const sparkles = createSparkles({
    count: 320,
    origin: new THREE.Vector3(pool.x, pool.y, curtainZ - 0.3),
    width: WIDTH * 0.9,
    out: new THREE.Vector3(0, 0, -1),
  });
  group.add(sparkles.object);

  const mist = Array.from({ length: 16 }, (_, i) => {
    const s = glowSprite(0xe6f8ff, 2, 0);
    s.userData = { phase: i / 16, along: (Math.random() - 0.5) * WIDTH * 0.8, out: Math.random() * 1.5 };
    group.add(s);
    return s;
  });

  return {
    object: group,
    curtain, // tap target: it's the way back out
    update(dt) {
      time.value += dt * (reduceMotion ? 0.2 : 1);
      sparkles.update(dt * (reduceMotion ? 0.2 : 1));
      for (const s of mist) {
        const k = (s.userData.phase + time.value * 0.15) % 1;
        s.position.set(pool.x + s.userData.along, pool.y + k * 3, curtainZ - 0.3 - s.userData.out * (0.5 + k));
        s.scale.setScalar(1.5 + k * 3);
        s.material.opacity = 0.25 * Math.sin(k * Math.PI);
      }
    },
  };
}
