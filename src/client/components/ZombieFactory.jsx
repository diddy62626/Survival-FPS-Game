import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { BloodSplatter } from './Particles';

// Memoized Individual Zombie
export const Zombie = React.memo(({ id, startPos, typeSeed }) => {
  const mesh = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const barkTexture = useTexture('/assets/textures/bark.png');
  const [bloodPos, setBloodPos] = useState(null);

  const stats = useMemo(() => {
    const s = typeSeed / 100;
    return {
      scale: 0.6 + s * 1.5,
      speed: 1.2 + (1 - s) * 2.5,
      hp: 50 + s * 200,
      color: new THREE.Color().setHSL(s * 0.1, 0.4, 0.3), // Fleshy/Muddy tones
      eyeColor: s > 0.8 ? '#ff0000' : '#00ff66',
      isGiant: s > 0.8,
      isRunner: s < 0.2,
    };
  }, [typeSeed]);

  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: startPos,
    args: [0.6 * stats.scale],
    type: 'Dynamic',
  }), useRef());

  const pos = useRef(startPos);

  useEffect(() => api.position.subscribe(p => pos.current = p), [api.position]);

  useFrame((state) => {
    const playerPos = state.camera.position;
    const currentPosVec = new THREE.Vector3(...pos.current);
    const dist = playerPos.distanceTo(currentPosVec);

    if (dist > 60) return;

    const dir = new THREE.Vector3().subVectors(playerPos, currentPosVec).normalize();
    dir.y = 0;

    api.velocity.set(dir.x * stats.speed, -5, dir.z * stats.speed);

    if (mesh.current) {
        mesh.current.lookAt(playerPos.x, mesh.current.position.y, playerPos.z);

        // Simple arm animation
        const t = state.clock.elapsedTime * stats.speed * 2;
        if (leftArm.current) leftArm.current.rotation.x = Math.sin(t) * 0.5;
        if (rightArm.current) rightArm.current.rotation.x = Math.cos(t) * 0.5;
    }
  });

  const onHit = useCallback(() => {
      setBloodPos(pos.current);
      setTimeout(() => setBloodPos(null), 1000);
  }, []);

  return (
    <group ref={ref} onClick={onHit}>
      <group ref={mesh} scale={stats.scale}>
        {/* Torso */}
        <mesh castShadow>
          <capsuleGeometry args={[0.25, 0.8, 4, 8]} />
          <meshStandardMaterial map={barkTexture} color={stats.color} roughness={0.8} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.75, 0]} castShadow>
            <sphereGeometry args={[0.22, 8, 8]} />
            <meshStandardMaterial map={barkTexture} color={stats.color.clone().multiplyScalar(0.9)} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.08, 0.8, 0.18]}>
            <sphereGeometry args={[0.04]} />
            <meshBasicMaterial color={stats.eyeColor} />
        </mesh>
        <mesh position={[0.08, 0.8, 0.18]}>
            <sphereGeometry args={[0.04]} />
            <meshBasicMaterial color={stats.eyeColor} />
        </mesh>

        {/* Arms */}
        <group ref={leftArm} position={[-0.35, 0.4, 0]}>
            <mesh castShadow position={[0, -0.2, 0]}>
                <boxGeometry args={[0.12, 0.5, 0.12]} />
                <meshStandardMaterial color={stats.color} />
            </mesh>
        </group>
        <group ref={rightArm} position={[0.35, 0.4, 0]}>
            <mesh castShadow position={[0, -0.2, 0]}>
                <boxGeometry args={[0.12, 0.5, 0.12]} />
                <meshStandardMaterial color={stats.color} />
            </mesh>
        </group>

        {/* Mutations/Details */}
        {stats.isGiant && (
            <mesh position={[0, 0.3, -0.2]} castShadow>
                <boxGeometry args={[0.5, 0.5, 0.4]} />
                <meshStandardMaterial color="#332211" />
            </mesh>
        )}
      </group>
      {bloodPos && <BloodSplatter position={bloodPos} />}
    </group>
  );
});

export default function ZombieManager() {
    const zombies = useMemo(() => {
        return Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            startPos: [Math.random() * 150 - 75, 5, Math.random() * 150 - 75],
            typeSeed: Math.floor(Math.random() * 101)
        }));
    }, []);

    return (
        <group>
            {zombies.map(z => <Zombie key={z.id} {...z} />)}
        </group>
    );
}
