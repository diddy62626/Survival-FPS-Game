import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { createNoise } from '../utils/noise';

export function Foliage({ chunkX, chunkZ, seed }) {
    const count = 50;
    const mesh = useRef();
    const bark = useTexture('/assets/textures/bark.png');
    const noise = useMemo(() => createNoise(seed + 'foliage'), [seed]);

    const instances = useMemo(() => {
        const temp = [];
        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 32 + chunkX;
            const z = (Math.random() - 0.5) * 32 + chunkZ;

            // Only spawn if not on road (pseudo check)
            const roadFactor = Math.exp(-Math.pow(x * 0.2, 2));
            if (roadFactor < 0.2) {
                const h = (noise(x * 0.05, z * 0.05) * 10); // Match terrain
                dummy.position.set(x, h + 2, z);
                dummy.scale.setScalar(1 + Math.random());
                dummy.updateMatrix();
                temp.push(dummy.matrix.clone());
            }
        }
        return temp;
    }, [chunkX, chunkZ, noise]);

    return (
        <instancedMesh ref={mesh} args={[null, null, instances.length]} castShadow>
            <cylinderGeometry args={[0.2, 0.4, 4, 8]} />
            <meshStandardMaterial map={bark} />
        </instancedMesh>
    );
}
