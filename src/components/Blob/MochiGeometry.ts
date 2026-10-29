import * as THREE from 'three';
import { MOCHI_CONFIG } from '../../theme/mochiConfig';

/**
 * Creates a rounder, softer deformed mochi geometry with a flattened base.
 */
export function createMochiGeometry(): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(1.0, 36, 28);
  const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;

  for (let i = 0; i < posAttr.count; i++) {
    let x = posAttr.getX(i);
    let y = posAttr.getY(i);
    let z = posAttr.getZ(i);

    // Apply soft rounded mochi aspect ratio
    x *= MOCHI_CONFIG.BODY_WIDTH;
    y *= MOCHI_CONFIG.BODY_HEIGHT;
    z *= MOCHI_CONFIG.BODY_DEPTH;

    // Chubby cheek curve in lower half
    if (y < 0.25 && y > -0.6) {
      const cheekFactor = 1.0 + (0.25 - y) * 0.10;
      x *= cheekFactor;
      z *= cheekFactor;
    }

    // Flatten the base smoothly so it rests like a mochi dumpling
    if (y < MOCHI_CONFIG.BASE_FLATTEN_Y) {
      const depth = MOCHI_CONFIG.BASE_FLATTEN_Y - y;
      y = MOCHI_CONFIG.BASE_FLATTEN_Y - depth * 0.32;
    }

    posAttr.setXYZ(i, x, y, z);
  }

  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates a curved front face shell sitting 1.8% above the body surface.
 * Conforms to the mochi curve so the huge face never clips or floats.
 */
export function createFaceShellGeometry(): THREE.BufferGeometry {
  const radius = 1.018; // 1.8% above body surface
  const widthSegments = 24;
  const heightSegments = 24;

  // Spherical patch centered on the front face
  const phiStart = Math.PI * 0.5 - 0.72;
  const phiLength = 1.44; // ~82 degrees wide horizontal arc
  const thetaStart = Math.PI * 0.5 - 0.72;
  const thetaLength = 1.44; // ~82 degrees vertical arc

  const geom = new THREE.SphereGeometry(
    radius,
    widthSegments,
    heightSegments,
    phiStart,
    phiLength,
    thetaStart,
    thetaLength
  );

  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates soft contact shadow radial gradient texture
 */
let shadowTextureCache: THREE.CanvasTexture | null = null;

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (shadowTextureCache) return shadowTextureCache;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
  grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.22)');
  grad.addColorStop(0.85, 'rgba(15, 23, 42, 0.05)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  shadowTextureCache = texture;
  return texture;
}
