import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { useTexture } from '@react-three/drei';

export default function OtherPlayers() {
  const players = useGameStore(state => state.players);
  const metal = useTexture('/assets/textures/metal.png');

  return (
    <>
      {Object.entries(players).map(([id, p]) => (
        <group key={id} position={p.pos || [0, 0, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.3, 1, 4, 8]} />
            <meshStandardMaterial map={metal} color="#00ff66" />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <sphereGeometry args={[0.2]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
        </group>
      ))}
    </>
  );
}
