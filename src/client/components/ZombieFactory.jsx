import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { BloodSplatter } from './Particles';

// Memoized Individual Zombie
export const Zombie = React.memo(({ id, startPos, typeSeed }) => {
  const mesh = useRef();
  const barkTexture = useTexture('/assets/textures/bark.png');
  const [bloodPos, setBloodPos] = useState(null);

  const stats = useMemo(() => {
    const s = typeSeed / 100;
    return {
      scale: 0.5 + s * 2,
      speed: 1 + (1 - s) * 3,
      hp: 50 + s * 200,
      color: new THREE.Color().setHSL(s, 0.6, 0.4),
      isGiant: s > 0.8,
      isRunner: s < 0.2,
      hasWeapon: s > 0.5 && s < 0.7,
    };
  }, [typeSeed]);

  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: startPos,
    args: [0.6 * stats.scale],
    type: 'Dynamic',
  }), useRef());

  const pos = useRef(startPos);

  // Use subscription to avoid re-renders
  useEffect(() => api.position.subscribe(p => pos.current = p), [api.position]);

  useFrame((state) => {
    const playerPos = state.camera.position;

    // AI Tick Logic Radius check (Optimization)
    const currentPosVec = new THREE.Vector3(...pos.current);
    const dist = playerPos.distanceTo(currentPosVec);
    if (dist > 60) return;

    const dir = new THREE.Vector3().subVectors(playerPos, currentPosVec).normalize();
    dir.y = 0;

    api.velocity.set(dir.x * stats.speed, -5, dir.z * stats.speed);

    if (mesh.current) {
        mesh.current.lookAt(playerPos.x, mesh.current.position.y, playerPos.z);
    }
  });

  const onHit = useCallback(() => {
      setBloodPos(pos.current);
      setTimeout(() => setBloodPos(null), 1000);
  }, []);

  return (
    <group ref={ref} onClick={onHit}>
      <group ref={mesh} scale={stats.scale}>
        <mesh castShadow>
          <capsuleGeometry args={[0.3, 1, 4, 8]} />
          <meshStandardMaterial map={barkTexture} color={stats.color} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.25]} />
            <meshStandardMaterial map={barkTexture} color={stats.color.clone().multiplyScalar(0.8)} />
        </mesh>
        {stats.isGiant && (
            <mesh position={[0, 0, -0.4]}>
                <boxGeometry args={[0.6, 0.6, 0.2]} />
                <meshStandardMaterial color="#444" />
            </mesh>
        )}
      </group>
      {bloodPos && <BloodSplatter position={bloodPos} />}
    </group>
  );
});

export default function ZombieManager() {
    const zombies = useMemo(() => {
        return Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            startPos: [Math.random() * 80 - 40, 5, Math.random() * 80 - 40],
            typeSeed: Math.floor(Math.random() * 101)
        }));
    }, []);

    return (
        <group>
            {zombies.map(z => <Zombie key={z.id} {...z} />)}
        </group>
    );
}
