import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useHeightfield } from '@react-three/cannon';
import { useTexture } from '@react-three/drei';
import { createNoise } from '../utils/noise';

const CHUNK_SIZE = 32;
const RESOLUTION = 32;

export const TerrainChunk = React.memo(({ x, z, seed }) => {
  const noise = useMemo(() => createNoise(seed), [seed]);
  const texture = useTexture('/assets/textures/dirt.png');

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.9,
        metalness: 0.1,
        color: '#666'
    });
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    return mat;
  }, [texture]);

  const { vertices, matrix, indices, colors } = useMemo(() => {
    const vertices = new Float32Array((RESOLUTION + 1) * (RESOLUTION + 1) * 3);
    const colors = new Float32Array((RESOLUTION + 1) * (RESOLUTION + 1) * 3);
    const matrix = [];
    const indices = [];

    for (let i = 0; i <= RESOLUTION; i++) {
      matrix[i] = [];
      for (let j = 0; j <= RESOLUTION; j++) {
        const gx = (i / RESOLUTION - 0.5) * CHUNK_SIZE + x;
        const gz = (j / RESOLUTION - 0.5) * CHUNK_SIZE + z;

        const lx = (i / RESOLUTION - 0.5) * CHUNK_SIZE;
        const lz = (j / RESOLUTION - 0.5) * CHUNK_SIZE;

        const h = (noise(gx * 0.05, gz * 0.05) * 8) +
                  (noise(gx * 0.1, gz * 0.1) * 2);

        const roadFactor = Math.exp(-Math.pow(gx * 0.15, 2));
        const finalH = h * (1 - roadFactor);

        vertices[(i * (RESOLUTION + 1) + j) * 3] = lx;
        vertices[(i * (RESOLUTION + 1) + j) * 3 + 1] = finalH;
        vertices[(i * (RESOLUTION + 1) + j) * 3 + 2] = lz;

        // Color variation based on height and road
        const c = new THREE.Color(roadFactor > 0.5 ? '#333' : '#4a4a4a');
        if (finalH > 5) c.lerp(new THREE.Color('#888'), 0.5);

        colors[(i * (RESOLUTION + 1) + j) * 3] = c.r;
        colors[(i * (RESOLUTION + 1) + j) * 3 + 1] = c.g;
        colors[(i * (RESOLUTION + 1) + j) * 3 + 2] = c.b;

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

    return { vertices, matrix, indices: new Uint16Array(indices), colors };
  }, [x, z, noise]);

  const [ref] = useHeightfield(() => ({
    args: [matrix, { elementSize: CHUNK_SIZE / RESOLUTION }],
    position: [x - CHUNK_SIZE / 2, 0, z + CHUNK_SIZE / 2],
    rotation: [-Math.PI / 2, 0, 0],
  }), useRef());

  const geomRef = useRef();
  useEffect(() => {
    if (geomRef.current) {
        geomRef.current.computeVertexNormals();
    }
  }, [vertices]);

  return (
    <mesh ref={ref} receiveShadow material={material} vertexColors>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          count={vertices.length / 3}
          array={vertices}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
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
