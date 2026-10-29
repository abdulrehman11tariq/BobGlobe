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
}

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 1.2, 5.8);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

export const CameraController: FC<CameraControllerProps> = ({ selectedBlob, controlsRef }) => {
  const { camera } = useThree();
  const targetCamPos = useRef<THREE.Vector3>(DEFAULT_CAMERA_POS.clone());
  const targetControlsTarget = useRef<THREE.Vector3>(DEFAULT_TARGET.clone());
  const isTransitioning = useRef<boolean>(false);

  useEffect(() => {
    if (selectedBlob) {
      // Calculate focus camera position along the surface normal
      const normal = new THREE.Vector3(...selectedBlob.normal);
      const blobPos = new THREE.Vector3(...selectedBlob.position);

      // Camera stands back by CAMERA_FOCUS_DISTANCE along the normal, lifted slightly
      const camPos = blobPos.clone().add(normal.clone().multiplyScalar(BLOB_CONFIG.CAMERA_FOCUS_DISTANCE));
      // Lift slightly along world Y or local tangent for nice angled view
      camPos.y += 0.08;

      targetCamPos.current.copy(camPos);
      targetControlsTarget.current.copy(blobPos);
      isTransitioning.current = true;
    } else {
      // Return to full globe overview
      targetCamPos.current.copy(DEFAULT_CAMERA_POS);
      targetControlsTarget.current.copy(DEFAULT_TARGET);
      isTransitioning.current = true;
    }
  }, [selectedBlob]);

  useFrame((_, delta) => {
    if (!isTransitioning.current) return;

    const controls = controlsRef.current?.getControls();
    if (!controls) return;

    // Smoothly damp camera position
    easing.damp3(camera.position, targetCamPos.current, 0.22, delta);

    // Smoothly damp controls target
    easing.damp3(controls.target, targetControlsTarget.current, 0.22, delta);
    controls.update();

    // Check if transition is practically complete
    const posDist = camera.position.distanceTo(targetCamPos.current);
    const targetDist = controls.target.distanceTo(targetControlsTarget.current);
    if (posDist < 0.01 && targetDist < 0.01) {
      isTransitioning.current = false;
    }
  });

  return null;
};
