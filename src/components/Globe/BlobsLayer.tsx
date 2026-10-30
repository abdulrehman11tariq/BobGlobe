import { useMemo, useState, type FC } from 'react';
import * as THREE from 'three';
import type { BlobInstanceData } from '../../types';
import { MochiBlob } from '../Blob/MochiBlob';

interface BlobsLayerProps {
  blobs: BlobInstanceData[];
  selectedBlob: BlobInstanceData | null;
  playingBlobId?: string | null;
  trendAvailable?: boolean;
  onSelectBlob: (blob: BlobInstanceData) => void;
  onHoverBlob: (blob: BlobInstanceData | null) => void;
  debug?: boolean;
}

export const BlobsLayer: FC<BlobsLayerProps> = ({
  blobs,
  selectedBlob,
  playingBlobId = null,
  trendAvailable = false,
  onSelectBlob,
  onHoverBlob,
  debug = false,
}) => {
  const [hoveredBlobId, setHoveredBlobId] = useState<string | null>(null);

  const hoveredCountryCode = useMemo(() => {
    if (!hoveredBlobId) return null;
    return blobs.find((b) => b.id === hoveredBlobId)?.country.code || null;
  }, [blobs, hoveredBlobId]);

  // Debug Spacing Rings Geometry
  const debugRings = useMemo(() => {
    if (!debug) return null;

    // Group blobs by country code to draw ring clearance
    const countryMap = new Map<string, BlobInstanceData[]>();
    for (const b of blobs) {
      const arr = countryMap.get(b.country.code) || [];
      arr.push(b);
      countryMap.set(b.country.code, arr);
    }

    const ringLines: { pos: [number, number, number]; radius: number }[] = [];
    countryMap.forEach((countryBlobs) => {
      const centerBlob = countryBlobs.find((b) => b.rank === 1);
      if (centerBlob && countryBlobs.length > 1) {
        const maxDist = Math.max(
          ...countryBlobs.map((b) => {
            const bp = new THREE.Vector3(...b.position);
            const cp = new THREE.Vector3(...centerBlob.position);
            return bp.distanceTo(cp);
          })
        );
        ringLines.push({
          pos: centerBlob.position,
          radius: maxDist + 0.05,
        });
      }
    });

    return ringLines;
  }, [blobs, debug]);

  return (
    <group name="mochi-blobs-layer">
      {/* Dedicated Soft Bright Lighting specifically for Mochi Blobs */}
      <ambientLight intensity={0.9} color="#ffffff" />
      <hemisphereLight
        args={['#ffffff', '#ffedf5', 1.2]}
      />
      <directionalLight
        position={[0, 6, 8]}
        intensity={1.2}
        color="#ffffff"
      />

      {blobs.map((blob) => (
        <MochiBlob
          key={blob.id}
          blob={blob}
          isSelected={selectedBlob?.id === blob.id}
          isHovered={hoveredBlobId === blob.id}
          isPlaying={playingBlobId === blob.id}
          isSameCountryHovered={Boolean(
            hoveredCountryCode &&
            hoveredCountryCode === blob.country.code &&
            hoveredBlobId !== blob.id
          )}
          trendAvailable={trendAvailable}
          onSelect={() => onSelectBlob(blob)}
          onHoverStart={() => {
            setHoveredBlobId(blob.id);
            onHoverBlob(blob);
          }}
          onHoverEnd={() => {
            setHoveredBlobId(null);
            onHoverBlob(null);
          }}
        />
      ))}

      {/* Debug Visualization: Centroid Spacing Rings */}
      {debug && debugRings && (
        <group name="debug-rings">
          {debugRings.map((ring, idx) => (
            <mesh key={idx} position={ring.pos}>
              <ringGeometry args={[ring.radius - 0.008, ring.radius + 0.008, 32]} />
              <meshBasicMaterial color="#ef4444" wireframe side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};
