import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useHeightfield } from '@react-three/cannon';
import { useTexture } from '@react-three/drei';
import { createNoise } from '../utils/noise';

const CHUNK_SIZE = 32;
const RESOLUTION = 32;

// Use React.memo for static chunks
export const TerrainChunk = React.memo(({ x, z, seed }) => {
  const noise = useMemo(() => createNoise(seed), [seed]);

  // Memoize texture to avoid re-loads
  const texture = useTexture('/assets/textures/dirt.png');
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return mat;
  }, [texture]);

  const { vertices, matrix, indices } = useMemo(() => {
    const vertices = new Float32Array((RESOLUTION + 1) * (RESOLUTION + 1) * 3);
    const matrix = [];
    const indices = [];

    for (let i = 0; i <= RESOLUTION; i++) {
      matrix[i] = [];
      for (let j = 0; j <= RESOLUTION; j++) {
        const vx = (i / RESOLUTION - 0.5) * CHUNK_SIZE + x;
        const vz = (j / RESOLUTION - 0.5) * CHUNK_SIZE + z;

        const h = (noise(vx * 0.05, vz * 0.05) * 10) +
                  (noise(vx * 0.1, vz * 0.1) * 2);

        const roadFactor = Math.exp(-Math.pow(vx * 0.2, 2));
        const finalH = h * (1 - roadFactor);

        vertices[(i * (RESOLUTION + 1) + j) * 3] = vx;
        vertices[(i * (RESOLUTION + 1) + j) * 3 + 1] = finalH;
        vertices[(i * (RESOLUTION + 1) + j) * 3 + 2] = vz;

        matrix[i][j] = finalH;
      }
    }

    for (let i = 0; i < RESOLUTION; i++) {
      for (let j = 0; j < RESOLUTION; j++) {
        const a = i * (RESOLUTION + 1) + j;
        const b = i * (RESOLUTION + 1) + j + 1;
        const c = (i + 1) * (RESOLUTION + 1) + j;
        const d = (i + 1) * (RESOLUTION + 1) + j + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    return { vertices, matrix, indices: new Uint16Array(indices) };
  }, [x, z, noise]);

  const [ref] = useHeightfield(() => ({
    args: [matrix, { elementSize: CHUNK_SIZE / RESOLUTION }],
    position: [x - CHUNK_SIZE / 2, 0, z + CHUNK_SIZE / 2],
    rotation: [-Math.PI / 2, 0, 0],
  }), useRef());

  return (
    <mesh ref={ref} receiveShadow material={material}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={vertices.length / 3}
          array={vertices}
          itemSize={3}
        />
        <bufferAttribute
          attach="index"
          count={indices.length}
          array={indices}
          itemSize={1}
        />
      </bufferGeometry>
    </mesh>
  );
});
