import { useMemo, type FC } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import countriesData from '../../data/countries.json';
import { latLngToVec3 } from '../../utils/coordinates';
import { getSurfaceRadius } from '../../utils/terrainSampler';

interface CountryMarkersProps {
  visible: boolean;
}

const markerGeom = new THREE.SphereGeometry(0.018, 12, 10);
const markerMaterial = new THREE.MeshBasicMaterial({
  color: '#ff2d55', // Vibrant hot coral/pink marker
  transparent: false,
  depthWrite: true,
});

export const CountryMarkers: FC<CountryMarkersProps> = ({ visible }) => {
  const markers = useMemo(() => {
    return countriesData.map((c) => {
      const surfR = getSurfaceRadius(c.lat, c.lng);
      const pos = latLngToVec3(c.lat, c.lng, surfR + 0.014);
      return {
        code: c.code,
        name: c.name,
        pos,
      };
    });
  }, []);

  if (!visible) return null;

  return (
    <group name="country-coordinate-markers">
      {markers.map((m) => (
        <group key={m.code} position={m.pos}>
          {/* Small 3D spherical pin marker at the exact country coordinate */}
          <mesh geometry={markerGeom} material={markerMaterial} />

          {/* Clean 2D Label showing the Country Code */}
          <Html
            center
            distanceFactor={6.5}
            zIndexRange={[100, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div className="flex flex-col items-center select-none transform -translate-y-4">
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-neutral-900/90 text-yellow-300 rounded border border-yellow-400/60 shadow-md">
                {m.code}
              </span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
};
