import type { FC } from 'react';
import { Stars } from '@react-three/drei';

export const Starfield: FC = () => {
  return (
    <group name="starfield">
      {/* Deep distant star field */}
      <Stars
        radius={120}
        depth={60}
        count={5000}
        factor={4}
        saturation={0.5}
        fade
        speed={1.2}
      />

      {/* Brighter foreground stellar clusters */}
      <Stars
        radius={60}
        depth={30}
        count={1200}
        factor={6}
        saturation={1}
        fade
        speed={1.8}
      />
    </group>
  );
};
