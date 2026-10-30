import { useRef, useMemo, useEffect, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { getCountryBorderLines } from '../../utils/countryBorders';
import { BORDER_OUTLINE_CONFIG } from '../../theme/blobConfig';

interface CountryOutlineProps {
  countryCode: string | null;
}

// Ease out cubic function for punchy, smooth 150ms mechanical pop-in
function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

export const CountryOutline: FC<CountryOutlineProps> = ({ countryCode }) => {
  const groupRef = useRef<THREE.Group>(null);
  const popProgress = useRef<number>(1.0);
  const activeCodeRef = useRef<string | null>(null);

  // Fetch or retrieve cached 3D border lines
  const borderData = useMemo(() => {
    if (!countryCode) return null;
    return getCountryBorderLines(countryCode);
  }, [countryCode]);

  // Trigger 150ms pop-in animation on country change
  useEffect(() => {
    if (countryCode && countryCode !== activeCodeRef.current) {
      activeCodeRef.current = countryCode;
      popProgress.current = 0.0;
    } else if (!countryCode) {
      activeCodeRef.current = null;
    }
  }, [countryCode]);

  // Animate pop-in: emerges cleanly from ground level over 150ms (strictly opaque, zero alpha/transparency)
  useFrame((_, delta) => {
    if (groupRef.current && popProgress.current < 1.0) {
      popProgress.current = Math.min(
        1.0,
        popProgress.current + delta / (BORDER_OUTLINE_CONFIG.POP_IN_DURATION_MS / 1000)
      );
      const eased = easeOutCubic(popProgress.current);
      // Scales from 0.995 (just below terrain) to 1.0 (flush hugged on terrain)
      const scale = THREE.MathUtils.lerp(0.995, 1.0, eased);
      groupRef.current.scale.setScalar(scale);
    }
  });

  if (!countryCode || !borderData || borderData.segments.length === 0) {
    return null;
  }

  return (
    <group ref={groupRef} name={`country-outline-${countryCode}`}>
      {borderData.segments.map((seg, idx) => (
        <group key={`outline-seg-${idx}`}>
          {/* 1. High-Contrast White Base Line (Underneath, slightly wider) */}
          <Line
            points={seg.whitePoints}
            color={BORDER_OUTLINE_CONFIG.WHITE_COLOR}
            lineWidth={BORDER_OUTLINE_CONFIG.WHITE_WIDTH}
            transparent={false}
            depthTest={true}
            depthWrite={true}
            raycast={() => null} // Disable raycasting so lines never block blob hovering
          />

          {/* 2. Crisp Navy Accent Line (Top layer) */}
          <Line
            points={seg.navyPoints}
            color={BORDER_OUTLINE_CONFIG.NAVY_COLOR}
            lineWidth={BORDER_OUTLINE_CONFIG.NAVY_WIDTH}
            transparent={false}
            depthTest={true}
            depthWrite={true}
            raycast={() => null} // Disable raycasting so lines never block blob hovering
          />
        </group>
      ))}
    </group>
  );
};
