import { useMemo, type FC } from 'react';
import * as THREE from 'three';

interface AtmosphereProps {
  radius?: number;
  glowColor?: string;
}

/**
 * Atmosphere outer glow component using a Fresnel rim shader.
 * Produces a soft luminous blue atmospheric halo around the Earth.
 */
export const Atmosphere: FC<AtmosphereProps> = ({
  radius = 2.5,
  glowColor = '#4db2ff',
}) => {
  const customShader = useMemo(() => {
    return {
      uniforms: {
        color: { value: new THREE.Color(glowColor) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 viewDir = normalize(-vPosition);
          // Fresnel rim calculation
          float intensity = pow(0.68 - dot(vNormal, viewDir), 2.2);
          intensity = clamp(intensity, 0.0, 1.0);
          gl_FragColor = vec4(color, intensity * 0.75);
        }
      `,
    };
  }, [glowColor]);

  return (
    <group>
      {/* Outer atmosphere halo */}
      <mesh scale={[1.15, 1.15, 1.15]}>
        <sphereGeometry args={[radius, 64, 64]} />
        <shaderMaterial
          vertexShader={customShader.vertexShader}
          fragmentShader={customShader.fragmentShader}
          uniforms={customShader.uniforms}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Inner subtle haze */}
      <mesh scale={[1.025, 1.025, 1.025]}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
