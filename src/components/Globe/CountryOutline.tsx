import { useMemo, type FC } from 'react';
import { Line } from '@react-three/drei';
import { getCountryBorderLines } from '../../utils/countryBorders';
import { BORDER_OUTLINE_CONFIG } from '../../theme/blobConfig';

interface CountryOutlineProps {
  countryCode: string | null;
}

export const CountryOutline: FC<CountryOutlineProps> = ({ countryCode }) => {
  // Fetch or retrieve cached 3D border lines
  const borderData = useMemo(() => {
    if (!countryCode) return null;
    return getCountryBorderLines(countryCode);
  }, [countryCode]);

  if (!countryCode || !borderData || borderData.segments.length === 0) {
    return null;
  }

  return (
    <group name={`country-outline-${countryCode}`}>
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
