import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { createNoise } from '../utils/noise';

export function Foliage({ chunkX, chunkZ, seed }) {
    const treeCount = 15;
    const trunkMesh = useRef();
    const leavesMesh = useRef();

    const bark = useTexture('/assets/textures/bark.png');
    const dirt = useTexture('/assets/textures/dirt.png');

    const noise = useMemo(() => createNoise(seed + 'foliage_v2'), [seed]);

    const { trunks, leaves } = useMemo(() => {
        const trunkMatrices = [];
        const leafMatrices = [];
        const dummy = new THREE.Object3D();

        for (let i = 0; i < treeCount; i++) {
            const x = (Math.random() - 0.5) * 32 + chunkX;
            const z = (Math.random() - 0.5) * 32 + chunkZ;

            // Safety: Don't spawn trees near the world center (spawn area)
            const distFromCenter = Math.sqrt(x*x + z*z);
            if (distFromCenter < 10) continue;

            const roadFactor = Math.exp(-Math.pow(x * 0.2, 2));
            if (roadFactor < 0.15) {
                const h = (noise(x * 0.05, z * 0.05) * 10);
                const scale = 1 + Math.random() * 1.5;

                // Trunk
                dummy.position.set(x, h + (2 * scale) - 0.5, z);
                dummy.scale.set(scale * 0.5, scale, scale * 0.5);
                dummy.rotation.y = Math.random() * Math.PI;
                dummy.updateMatrix();
                trunkMatrices.push(dummy.matrix.clone());

                // Foliage Clump 1
                dummy.position.set(x, h + (4 * scale), z);
                dummy.scale.setScalar(scale * 1.5);
                dummy.updateMatrix();
                leafMatrices.push(dummy.matrix.clone());

                // Foliage Clump 2
                dummy.position.set(x + scale * 0.5, h + (3.5 * scale), z - scale * 0.3);
                dummy.scale.setScalar(scale * 1.2);
                dummy.updateMatrix();
                leafMatrices.push(dummy.matrix.clone());
            }
        }
        return { trunks: trunkMatrices, leaves: leafMatrices };
    }, [chunkX, chunkZ, noise]);

    return (
        <group>
            <instancedMesh ref={trunkMesh} args={[null, null, trunks.length]} castShadow receiveShadow>
                <cylinderGeometry args={[0.3, 0.5, 4, 8]} />
                <meshStandardMaterial map={bark} color="#443322" />
            </instancedMesh>
            <instancedMesh ref={leavesMesh} args={[null, null, leaves.length]} castShadow>
                <dodecahedronGeometry args={[1, 1]} />
                <meshStandardMaterial map={dirt} color="#113311" roughness={1} />
            </instancedMesh>
        </group>
    );
}
