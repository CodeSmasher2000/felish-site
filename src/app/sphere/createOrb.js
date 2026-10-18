import * as THREE from "three";
import { glowSprite } from "../lib/glow.js";

// The "sphere" itself: an iridescent pearl floating over the landing spot,
// circled by a thin ring. Tap it and it pulses.
export function createOrb({ reduceMotion = false } = {}) {
  const group = new THREE.Group();

  const material = new THREE.MeshPhysicalMaterial({
    color: "#fff4fb",
    roughness: 0.06,
    metalness: 0,
    iridescence: 1,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [150, 900],
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive: new THREE.Color("#f3c6ff"),
    emissiveIntensity: 0.18,
    envMapIntensity: 1.4,
  });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1.4, 96, 64), material);
  group.add(orb);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.025, 12, 160),
    new THREE.MeshBasicMaterial({ color: "#ffe2f2", transparent: true, opacity: 0.7 }),
  );
  ring.rotation.x = Math.PI / 2 - 0.35;
  group.add(ring);

  const halo = glowSprite(0xffd6f0, 10, 0.5);
  group.add(halo);

  // Lights the ground beneath with a pink pool.
  const light = new THREE.PointLight(0xffc8ea, 40, 30, 2);
  group.add(light);

  // A tall, faint beam of light above the orb, so you can find your way back
  // from anywhere in the sphere. Brightest at the bottom, fading upward.
  const BEAM_HEIGHT = 90;
  const beamGeom = new THREE.CylinderGeometry(0.45, 0.45, BEAM_HEIGHT, 24, 1, true);
  beamGeom.translate(0, BEAM_HEIGHT / 2, 0);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color("#ffd9f1") }, uStrength: { value: 0.5 } },
    vertexShader: /* glsl */ `
      varying float vH;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vH = position.y / ${BEAM_HEIGHT.toFixed(1)};
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      varying float vH;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float core = pow(abs(dot(normalize(vN), normalize(vV))), 2.0); // soft edges
        float a = pow(1.0 - vH, 1.6) * core * uStrength;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(beamGeom, beamMat);
  group.add(beam);

  // Invisible, wider stand-in for tapping the beam from far away.
  const beamHit = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, BEAM_HEIGHT, 8, 1).translate(0, BEAM_HEIGHT / 2, 0),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  group.add(beamHit);

  let pulse = 0;
  const baseY = 4;

  return {
    object: group,
    mesh: orb,
    beamHit,
    pulse() {
      pulse = 1;
    },
    update(dt, time) {
      pulse *= Math.pow(0.15, dt);
      const bob = reduceMotion ? 0 : Math.sin(time * 1.1) * 0.35;
      orb.position.y = baseY + bob;
      ring.position.y = baseY + bob;
      halo.position.y = baseY + bob;
      light.position.y = baseY + bob;
      orb.scale.setScalar(1 + pulse * 0.25);
      ring.rotation.z += dt * (0.3 + pulse * 4);
      ring.scale.setScalar(1 + pulse * 0.4);
      material.emissiveIntensity = 0.18 + pulse * 0.8;
      halo.material.opacity = 0.5 + pulse * 0.4;
      light.intensity = 40 + pulse * 80;
      beam.position.y = baseY + bob;
      beamMat.uniforms.uStrength.value = 0.5 + pulse * 0.6 + (reduceMotion ? 0 : Math.sin(time * 0.9) * 0.08);
    },
  };
}
