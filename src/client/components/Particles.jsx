import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function BloodSplatter({ position }) {
    const count = 20;
    const mesh = useRef();

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            temp.push({
                pos: new THREE.Vector3(...position),
                vel: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.1,
                    Math.random() * 0.1,
                    (Math.random() - 0.5) * 0.1
                ),
                life: 1.0
            });
        }
        return temp;
    }, [position]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state, delta) => {
        particles.forEach((p, i) => {
            p.pos.add(p.vel);
            p.vel.y -= 0.005; // gravity
            p.life -= delta;

            dummy.position.copy(p.pos);
            dummy.scale.setScalar(Math.max(0, p.life));
            dummy.updateMatrix();
            mesh.current.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[null, null, count]}>
            <sphereGeometry args={[0.05, 4, 4]} />
            <meshBasicMaterial color="#800" />
        </instancedMesh>
    );
}
