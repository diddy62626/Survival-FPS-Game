import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function BloodSplatter({ position }) {
    const count = 40;
    const mesh = useRef();

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            temp.push({
                pos: new THREE.Vector3(...position),
                vel: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,
                    Math.random() * 0.3,
                    (Math.random() - 0.5) * 0.2
                ),
                life: 1.0 + Math.random()
            });
        }
        return temp;
    }, [position]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        particles.forEach((p, i) => {
            p.pos.add(p.vel);
            p.vel.y -= 0.01; // gravity
            p.life -= delta * 2;

            dummy.position.copy(p.pos);
            dummy.scale.setScalar(Math.max(0, p.life * 0.1));
            dummy.updateMatrix();
            mesh.current.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[null, null, count]}>
            <sphereGeometry args={[0.1, 4, 4]} />
            <meshBasicMaterial color="#600" transparent opacity={0.8} />
        </instancedMesh>
    );
}

export function MuzzleFlash({ position, rotation }) {
    const mesh = useRef();
    useFrame((state) => {
        if (mesh.current) {
            mesh.current.scale.setScalar(Math.random() * 0.4 + 0.8);
        }
    });

    return (
        <group position={position} rotation={rotation}>
            <mesh ref={mesh}>
                <cylinderGeometry args={[0, 0.2, 0.5, 8]} />
                <meshBasicMaterial color="#ffcc33" transparent opacity={0.9} />
            </mesh>
            <pointLight intensity={5} distance={5} color="#ffaa00" />
        </group>
    );
}
