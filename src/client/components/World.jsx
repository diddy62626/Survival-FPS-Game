import React, { useMemo } from 'react';
import { TerrainChunk } from './TerrainChunk';
import Atmosphere from './Atmosphere';
import { Foliage } from './Foliage';
import { useGameStore } from '../store/useGameStore';

export default function World() {
  const seed = useGameStore((state) => state.seed);

  const chunks = useMemo(() => {
    const list = [];
    const range = 3; // Increased range for better visibility
    const size = 32;
    for (let i = -range; i <= range; i++) {
      for (let j = -range; j <= range; j++) {
        list.push({ x: i * size, z: j * size });
      }
    }
    return list;
  }, []);

  return (
    <>
      <Atmosphere />
      {chunks.map((c, i) => (
        <group key={i}>
            <TerrainChunk x={c.x} z={c.z} seed={seed} />
            <Foliage chunkX={c.x} chunkZ={c.z} seed={seed} />
        </group>
      ))}
    </>
  );
}
