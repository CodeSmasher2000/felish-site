import * as THREE from "three";

// Surface texture for the sphere's ground and boulders.
//
// The textures are projected from three sides (triplanar) instead of using
// UVs, so steep cliffs don't get stretched and rocks need no unwrapping.
// The detail map only brightens/darkens the pastel colours already on the
// mesh, and the normal map adds small bumps, cracks and pebbles.

const loader = new THREE.TextureLoader();

// 1×1 stand-ins (no detail, flat normal) used until the real textures load,
// or if they fail to — so the surface never renders black or inside-out.
function neutral(r, g, b) {
  const tex = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  tex.needsUpdate = true;
  return tex;
}
const NEUTRAL_DETAIL = neutral(128, 128, 128);
const NEUTRAL_NORMAL = neutral(128, 128, 255);

function loadData(url) {
  return loader.loadAsync(url).then((tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace; // data, not colour
    tex.anisotropy = 8;
    return tex;
  });
}

export function loadSurfaceSet(name) {
  return Promise.all([
    loadData(`/textures/${name}_detail.jpg`),
    loadData(`/textures/${name}_normal.jpg`),
  ]).then(([detail, normal]) => ({ detail, normal }));
}

/**
 * Patch a MeshStandardMaterial to use triplanar detail + normal maps.
 * @param {THREE.MeshStandardMaterial} material
 * @param {object} opts
 *   scale          texture repeats per world unit (bigger = finer)
 *   macroScale     second, much larger sampling of the detail map to break up tiling
 *   detailStrength how strongly the detail map changes brightness (0..1)
 *   normalStrength bump strength
 *   faceted        use the mesh's flat faces for projection (low-poly rocks)
 *   steep          blend in a second texture set on steep slopes (cliffs)
 */
export function applyTriplanar(material, opts) {
  const {
    scale = 0.25,
    macroScale = 0.03,
    detailStrength = 0.6,
    normalStrength = 1,
    faceted = false,
    steep = false,
  } = opts;

  const uniforms = {
    uTpDetail: { value: NEUTRAL_DETAIL },
    uTpNormal: { value: NEUTRAL_NORMAL },
    uTpDetail2: { value: NEUTRAL_DETAIL },
    uTpNormal2: { value: NEUTRAL_NORMAL },
    uTpScale: { value: scale },
    uTpMacro: { value: macroScale },
    uTpDetailStrength: { value: detailStrength },
    uTpNormalStrength: { value: normalStrength },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    if (steep) shader.defines = { ...shader.defines, TP_STEEP: "" };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vTpPos;
        varying vec3 vTpNormal;`,
      )
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        vec4 tpWorld = vec4(transformed, 1.0);
        vec3 tpN = objectNormal;
        #ifdef USE_INSTANCING
          tpWorld = instanceMatrix * tpWorld;
          tpN = mat3(instanceMatrix) * tpN;
        #endif
        tpWorld = modelMatrix * tpWorld;
        vTpPos = tpWorld.xyz;
        vTpNormal = normalize(mat3(modelMatrix) * tpN);`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vTpPos;
        varying vec3 vTpNormal;
        uniform sampler2D uTpDetail;
        uniform sampler2D uTpNormal;
        uniform sampler2D uTpDetail2;
        uniform sampler2D uTpNormal2;
        uniform float uTpScale, uTpMacro, uTpDetailStrength, uTpNormalStrength;

        vec3 tpSurfaceNormal() {
          ${
            faceted
              ? `vec3 n = normalize(cross(dFdx(vTpPos), dFdy(vTpPos)));
                 if (dot(n, cameraPosition - vTpPos) < 0.0) n = -n;
                 return n;`
              : `return normalize(vTpNormal);`
          }
        }
        vec3 tpWeights(vec3 n) {
          vec3 w = pow(abs(n), vec3(4.0));
          return w / (w.x + w.y + w.z);
        }
        float tpSample(sampler2D map, vec3 p, vec3 w, float s) {
          return texture2D(map, p.zy * s).r * w.x
               + texture2D(map, p.xz * s).r * w.y
               + texture2D(map, p.xy * s).r * w.z;
        }
        // 0 on flat ground, 1 on cliffs (wobbled so the edge isn't a clean line).
        float tpSteep(vec3 n, float wobble) {
          #ifdef TP_STEEP
            return smoothstep(0.3, 0.6, 1.0 - n.y + (wobble - 0.5) * 0.25);
          #else
            return 0.0;
          #endif
        }
        float tpDetail(vec3 p, vec3 w, float s, float steepness) {
          float d = tpSample(uTpDetail, p, w, s);
          #ifdef TP_STEEP
            d = mix(d, tpSample(uTpDetail2, p, w, s * 1.3), steepness);
          #endif
          return d;
        }
        vec3 tpNormal(sampler2D map, vec3 p, vec3 n, vec3 w, float s) {
          vec3 tx = texture2D(map, p.zy * s).xyz * 2.0 - 1.0;
          vec3 ty = texture2D(map, p.xz * s).xyz * 2.0 - 1.0;
          vec3 tz = texture2D(map, p.xy * s).xyz * 2.0 - 1.0;
          tx.xy *= uTpNormalStrength;
          ty.xy *= uTpNormalStrength;
          tz.xy *= uTpNormalStrength;
          // Whiteout blend: tangent-space bumps reoriented onto each axis.
          tx = vec3(tx.xy + n.zy, abs(tx.z) * n.x);
          ty = vec3(ty.xy + n.xz, abs(ty.z) * n.y);
          tz = vec3(tz.xy + n.xy, abs(tz.z) * n.z);
          return normalize(tx.zyx * w.x + ty.xzy * w.y + tz.xyz * w.z);
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          vec3 tpN = tpSurfaceNormal();
          vec3 tpW = tpWeights(tpN);
          float far = tpSample(uTpDetail, vTpPos + 17.0, tpW, uTpMacro);
          float st = tpSteep(tpN, far);
          float near = tpDetail(vTpPos, tpW, uTpScale, st);
          float d = (near - 0.5) * 1.6 + (far - 0.5) * 0.7;
          diffuseColor.rgb *= clamp(1.0 + d * uTpDetailStrength, 0.35, 1.5);
        }`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `{
          // Triplanar normal mapping in world space, then into view space.
          vec3 n = tpSurfaceNormal();
          vec3 w = tpWeights(n);
          vec3 worldN = tpNormal(uTpNormal, vTpPos, n, w, uTpScale);
          #ifdef TP_STEEP
            float far = tpSample(uTpDetail, vTpPos + 17.0, w, uTpMacro);
            float st = tpSteep(n, far);
            // (sampled unconditionally: texture lookups in a branch break mipmapping)
            worldN = normalize(mix(worldN, tpNormal(uTpNormal2, vTpPos, n, w, uTpScale * 1.3), st));
          #endif
          normal = normalize((viewMatrix * vec4(worldN, 0.0)).xyz);
        }`,
      );
  };
  material.customProgramCacheKey = () => `triplanar-${faceted ? "faceted" : "smooth"}-${steep ? "steep" : "flat"}`;

  return {
    // `main` is the base set; `steepSet` (optional) is used on cliffs.
    setTextures(main, steepSet = null) {
      uniforms.uTpDetail.value = main.detail;
      uniforms.uTpNormal.value = main.normal;
      uniforms.uTpDetail2.value = (steepSet ?? main).detail;
      uniforms.uTpNormal2.value = (steepSet ?? main).normal;
    },
    uniforms,
  };
}
