import { useMemo, type FC } from 'react';
import * as THREE from 'three';
import { EARTH_CONFIG } from '../../theme/earthConfig';

/**
 * Solid Gradient Skydome from deep indigo (#0f172a) to soft purple-blue (#2e1065)
 * Small pure white opaque star dots (transparent: false, depthWrite: true).
 * ZERO transparency, no nebulas, no glow, no floating dust particles.
 */
export const CozySpaceBackdrop: FC = () => {
  // 1. Solid Gradient Skydome (transparent: false, depthWrite: true)
  const gradientMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(EARTH_CONFIG.space.gradientTop) },
        bottomColor: { value: new THREE.Color(EARTH_CONFIG.space.gradientBottom) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;

        void main() {
          float factor = clamp((normalize(vWorldPosition).y + 0.35) * 0.75, 0.0, 1.0);
          vec3 col = mix(bottomColor, topColor, factor);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      transparent: false,
      depthWrite: true,
    });
  }, []);

  // 2. A few hundred (350) small pure white opaque star dots
  const starPositions = useMemo(() => {
    const count = EARTH_CONFIG.space.starCount;
    const positions = new Float32Array(count * 3);
    const radius = 80;

    for (let i = 0; i < count; i++) {
      // Uniform spherical distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = radius + (Math.random() - 0.5) * 10;

      const sinPhi = Math.sin(phi);
      positions[i * 3] = r * sinPhi * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * sinPhi * Math.sin(theta);
    }

    return positions;
  }, []);

  return (
    <group name="opaque-space-backdrop">
      {/* Inverted Gradient Skydome Sphere */}
      <mesh material={gradientMaterial}>
        <sphereGeometry args={[90, 32, 24]} />
      </mesh>

      {/* Small Pure White Opaque Star Dots */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={starPositions.length / 3}
            array={starPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1.6}
          sizeAttenuation={false}
          color="#ffffff"
          transparent={false}
          depthWrite={true}
        />
      </points>
    </group>
  );
};
