import { useMemo, type FC } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../../theme/palette';

export const StylizedSky: FC = () => {
  const skyShader = useMemo(() => {
    return {
      uniforms: {
        topColor: { value: new THREE.Color(PALETTE.sky.gradientTop) },
        bottomColor: { value: new THREE.Color(PALETTE.sky.gradientBottom) },
        offset: { value: 0.0 },
        exponent: { value: 0.65 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;

        void main() {
          // Calculate vertical gradient based on normalized Y
          float h = normalize(vWorldPosition + offset).y;
          float factor = max(0.0, min(1.0, (h + 0.3) / 1.3));
          factor = pow(factor, exponent);
          gl_FragColor = vec4(mix(bottomColor, topColor, factor), 1.0);
        }
      `,
    };
  }, []);

  return (
    <mesh scale={[-1, 1, 1]} position={[0, 0, 0]}>
      {/* Large sky sphere wrapping the scene */}
      <sphereGeometry args={[80, 32, 16]} />
      <shaderMaterial
        vertexShader={skyShader.vertexShader}
        fragmentShader={skyShader.fragmentShader}
        uniforms={skyShader.uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
};
