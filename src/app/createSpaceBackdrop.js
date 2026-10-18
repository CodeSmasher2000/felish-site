import * as THREE from "three";
import { asset } from "./lib/asset.js";

// A photo woven into the space background: a large, see-through image in the
// upper middle of the view, its edges fading softly into the nebula. It's
// attached to the camera, so it stays put behind everything while you orbit.
export function createSpaceBackdrop(camera, { url, opacity = 0.35, size = 0.78, lift = 0.2 }) {
  const DIST = 450; // behind the planets and most stars, inside the nebula

  const texture = new THREE.TextureLoader().load(asset(url));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const material = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: texture }, uOpacity: { value: opacity } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec3 col = texture2D(uMap, vUv).rgb;
        // Soft round fade: solid in the middle, gone well before the edges.
        float d = length(vUv - 0.5) * 2.0;
        float fade = 1.0 - smoothstep(0.35, 1.0, d);
        gl_FragColor = vec4(col, fade * fade * uOpacity);
      }`,
    transparent: true,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.renderOrder = -1; // right after the nebula, before anything else
  mesh.frustumCulled = false;
  camera.add(mesh);

  // Size and place it for the current screen shape.
  function layout() {
    const viewH = 2 * DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const viewW = viewH * camera.aspect;
    const s = Math.min(viewH * size, viewW * 1.15); // on tall phones, limited by width
    mesh.scale.set(s, s, 1);
    mesh.position.set(0, viewH * lift, -DIST);
  }
  layout();

  return { object: mesh, material, layout };
}
