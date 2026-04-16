import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from '../hooks/useKeyboard';
import { useTexture } from '@react-three/drei';

export function MuzzleFlash({ position }) {
    const mesh = useRef();
    useFrame((state) => {
        if (mesh.current) {
            mesh.current.scale.setScalar(Math.random() * 0.5 + 0.5);
            mesh.current.material.opacity -= 0.1;
        }
    });
    return (
        <mesh position={position} ref={mesh}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="#ffaa00" transparent opacity={1} />
        </mesh>
    );
}

export default function Weapon() {
  const group = useRef();
  const { camera } = useThree();
  const { shoot, ads, reload, moveForward, moveBackward, moveLeft, moveRight } = useKeyboard();
  const metalTexture = useTexture('/assets/textures/metal.png');
  const [isFiring, setIsFiring] = useState(false);

  const weaponState = useRef({
    reloading: false,
    lastFire: 0,
    bob: 0,
  });

  useFrame((state) => {
    const { clock } = state;

    // Weapon follow camera with sway
    group.current.position.copy(camera.position);
    group.current.quaternion.slerp(camera.quaternion, 0.2);

    // ADS
    const targetPos = ads ? new THREE.Vector3(0, -0.12, -0.2) : new THREE.Vector3(0.3, -0.3, -0.5);
    const model = group.current.children[0];
    model.position.lerp(targetPos, 0.1);

    // Walking Bob
    const isMoving = moveForward || moveBackward || moveLeft || moveRight;
    if (isMoving && !ads) {
      weaponState.current.bob += 0.1;
      model.position.y += Math.sin(weaponState.current.bob) * 0.005;
      model.position.x += Math.cos(weaponState.current.bob * 0.5) * 0.005;
    }

    // Shooting recoil & logic
    if (shoot && Date.now() - weaponState.current.lastFire > 120 && !weaponState.current.reloading) {
      weaponState.current.lastFire = Date.now();
      model.position.z += 0.1;
      model.rotation.x -= 0.1;
      setIsFiring(true);
      setTimeout(() => setIsFiring(false), 50);

      // Raycast for hits
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera({x:0, y:0}, camera);
      // In a real game, we'd check intersections with zombies here
    }

    model.position.z = THREE.MathUtils.lerp(model.position.z, targetPos.z, 0.1);
    model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, 0, 0.1);

    // Reload animation
    if (reload && !weaponState.current.reloading) {
        weaponState.current.reloading = true;
        // Simple visual reload - drop weapon
        model.position.y -= 0.5;
        setTimeout(() => {
            weaponState.current.reloading = false;
        }, 1500);
    }
  });

  return (
    <group ref={group}>
      <group position={[0.3, -0.3, -0.5]}>
        <mesh castShadow>
          <boxGeometry args={[0.1, 0.2, 0.6]} />
          <meshStandardMaterial map={metalTexture} color="#222" />
        </mesh>
        <mesh position={[0, -0.15, 0.15]} castShadow>
          <boxGeometry args={[0.08, 0.4, 0.1]} />
          <meshStandardMaterial map={metalTexture} color="#111" />
        </mesh>
        {isFiring && <MuzzleFlash position={[0, 0.05, -0.35]} />}
      </group>
    </group>
  );
}
