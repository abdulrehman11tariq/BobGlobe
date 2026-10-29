import * as THREE from 'three';

interface ToonEarthParams {
  colorMap?: THREE.Texture;
}

/**
 * Creates the clean, fully opaque Earth material using world_map_4096.png.
 * Procedural shader replacement removed per task instructions.
 */
export function createOpaqueToonEarthMaterial(params?: ToonEarthParams): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: params?.colorMap,
    roughness: 0.92,
    metalness: 0.0,
    color: '#ffffff',
    transparent: false,
    depthWrite: true,
  });
}
