import { useEffect, useRef, type FC } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { easing } from 'maath';
import type { BlobInstanceData } from '../../types';
import { BLOB_CONFIG } from '../../theme/blobConfig';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraControllerProps {
  selectedBlob: BlobInstanceData | null;
  controlsRef: React.RefObject<{ getControls: () => OrbitControlsImpl | null }>;
  isInteracting?: boolean;
  onTransitionChange?: (isFlying: boolean) => void;
}

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 1.2, 5.8);

/**
 * Calculates an optimal angled camera position looking towards Earth center (0, 0, 0).
 * Having the camera look towards (0, 0, 0) guarantees:
 * 1. The blob is framed in view.
 * 2. OrbitControls' pivot target is ALWAYS (0, 0, 0), so dragging rotates the Earth
 *    naturally around its core rather than tumbling around the blob.
 */
function getFocusCameraPosition(normalVec: THREE.Vector3, focusDistance = 3.65): THREE.Vector3 {
  const n = normalVec.clone().normalize();
  // Choose reference up: standard Y-axis for low/mid latitudes, Z-axis near poles
  const refUp = Math.abs(n.y) < 0.88 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  const tangent = refUp.clone().sub(n.clone().multiplyScalar(refUp.dot(n))).normalize();
  // ~11 degree tilt gives an optimal 3D perspective to view front face, body, and terrain
  const dir = n.clone().add(tangent.clone().multiplyScalar(0.20)).normalize();
  return dir.multiplyScalar(focusDistance);
}

export const CameraController: FC<CameraControllerProps> = ({
  selectedBlob,
  controlsRef,
  isInteracting = false,
  onTransitionChange,
}) => {
  const { camera } = useThree();
  const targetCamPos = useRef<THREE.Vector3>(DEFAULT_CAMERA_POS.clone());
  const isTransitioning = useRef<boolean>(false);

  useEffect(() => {
    if (selectedBlob) {
      const normal = new THREE.Vector3(...selectedBlob.normal);
      // Planet surface radius (2.5) + CAMERA_FOCUS_DISTANCE (1.15) = 3.65
      const focusDist = 2.5 + (BLOB_CONFIG.CAMERA_FOCUS_DISTANCE || 1.15);
      const camPos = getFocusCameraPosition(normal, focusDist);

      targetCamPos.current.copy(camPos);
      isTransitioning.current = true;
      onTransitionChange?.(true);
    } else {
      // FREEZE: Deselecting keeps camera position and distance frozen exactly where they are
      isTransitioning.current = false;
      onTransitionChange?.(false);
    }
  }, [selectedBlob, onTransitionChange]);

  // If user starts dragging/interacting manually, yield immediately
  useEffect(() => {
    if (isInteracting && isTransitioning.current) {
      isTransitioning.current = false;
      onTransitionChange?.(false);
    }
  }, [isInteracting, onTransitionChange]);

  useFrame((_, delta) => {
    if (!isTransitioning.current) return;

    const controls = controlsRef.current?.getControls();
    if (!controls) return;

    // The Earth center (0, 0, 0) is ALWAYS the pivot target of OrbitControls
    controls.target.set(0, 0, 0);

    // Smoothly damp camera position along the spherical shell
    easing.damp3(camera.position, targetCamPos.current, 0.22, delta);

    // Maintain minimum flight distance from Earth center to prevent clipping inside planet
    const currentDist = camera.position.length();
    const minFlyDist = Math.min(3.65, targetCamPos.current.length());
    if (currentDist < minFlyDist) {
      camera.position.setLength(minFlyDist);
    }

    controls.update();

    // Check if transition is practically complete
    const posDist = camera.position.distanceTo(targetCamPos.current);
    if (posDist < 0.02) {
      camera.position.copy(targetCamPos.current);
      controls.target.set(0, 0, 0);
      controls.update();
      isTransitioning.current = false;
      onTransitionChange?.(false);
    }
  });

  return null;
};
