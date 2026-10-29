import * as THREE from 'three';
import { EARTH_CONFIG } from '../../theme/earthConfig';

interface ToonEarthParams {
  maskMap: THREE.Texture;
  topologyMap: THREE.Texture;
  sunPosition: THREE.Vector3;
}

/**
 * Creates the clean, simple, cartoon Earth material.
 * FULLY OPAQUE (transparent: false, depthWrite: true).
 * Hard-edged toon color bands:
 * - Solid friendly blue (#3FA7D6) & shallow blue (#6CC4EC)
 * - Solid fresh green (#7BC96F), darker mountain green (#5FB35A) & sand (#F2E2A0)
 * - Solid white polar caps (#FFFFFF)
 */
export function createOpaqueToonEarthMaterial({
  maskMap,
  topologyMap,
  sunPosition,
}: ToonEarthParams): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.95,
    metalness: 0.0,
    transparent: false,
    depthWrite: true,
    bumpMap: topologyMap,
    bumpScale: EARTH_CONFIG.RELIEF_BUMP_STRENGTH,
    displacementMap: topologyMap,
    displacementScale: EARTH_CONFIG.DISPLACEMENT_SCALE,
    displacementBias: -0.005,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.maskMap = { value: maskMap };
    shader.uniforms.topologyMap = { value: topologyMap };
    shader.uniforms.sunDirection = { value: sunPosition.clone().normalize() };

    // Toon Colors
    shader.uniforms.cOcean = { value: new THREE.Color(EARTH_CONFIG.colors.ocean) };
    shader.uniforms.cOceanShallow = { value: new THREE.Color(EARTH_CONFIG.colors.oceanShallow) };
    shader.uniforms.cLand = { value: new THREE.Color(EARTH_CONFIG.colors.land) };
    shader.uniforms.cMountain = { value: new THREE.Color(EARTH_CONFIG.colors.mountain) };
    shader.uniforms.cSand = { value: new THREE.Color(EARTH_CONFIG.colors.sand) };
    shader.uniforms.cPole = { value: new THREE.Color(EARTH_CONFIG.colors.pole) };

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform sampler2D maskMap;
      uniform sampler2D topologyMap;
      uniform vec3 sunDirection;

      uniform vec3 cOcean;
      uniform vec3 cOceanShallow;
      uniform vec3 cLand;
      uniform vec3 cMountain;
      uniform vec3 cSand;
      uniform vec3 cPole;
      `
    );

    // Hard-edged toon stepped color banding (NO soft gradients)
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      float lat = (0.5 - vUv.y) * 180.0;
      float absLat = abs(lat);

      vec3 toonColor;

      // 1. Solid White Polar Caps above 75 degrees latitude
      if (absLat >= 75.0) {
        toonColor = cPole;
      } else {
        float mask = texture2D(maskMap, vUv).r;
        float elevation = texture2D(topologyMap, vUv).r;

        if (mask > 0.44) {
          // === OCEAN ===
          // Two-step hard-edged coastal band
          if (mask < 0.54) {
            toonColor = cOceanShallow; // Shallow coast band (#6CC4EC)
          } else {
            toonColor = cOcean;        // Main ocean (#3FA7D6)
          }
        } else {
          // === LAND ===
          // Thin sand-yellow coastline strip
          if (mask >= 0.38) {
            toonColor = cSand;         // (#F2E2A0)
          } else if (elevation > 0.56) {
            toonColor = cMountain;     // (#5FB35A)
          } else {
            toonColor = cLand;         // (#7BC96F)
          }
        }
      }

      vec4 diffuseColor = vec4(toonColor, 1.0);
      `
    );
  };

  return mat;
}
