import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from '../hooks/useKeyboard';
import { useTexture } from '@react-three/drei';
import { MuzzleFlash } from './Particles';

export default function Weapon() {
  const group = useRef();
  const muzzleRef = useRef();
  const { camera } = useThree();
  const { shoot, ads, reload, moveForward, moveBackward, moveLeft, moveRight } = useKeyboard();
  const metalTexture = useTexture('/assets/textures/metal.png');
  const [isFiring, setIsFiring] = useState(false);

  const weaponState = useRef({
    reloading: false,
    lastFire: 0,
    bob: 0,
    swayX: 0,
    swayY: 0,
  });

  useFrame((state) => {
    const { clock, mouse } = state;

    // Weapon follow camera with smoothed sway
    group.current.position.copy(camera.position);
    group.current.quaternion.slerp(camera.quaternion, 0.15);

    // Mouse Sway
    weaponState.current.swayX = THREE.MathUtils.lerp(weaponState.current.swayX, mouse.x * 0.05, 0.1);
    weaponState.current.swayY = THREE.MathUtils.lerp(weaponState.current.swayY, mouse.y * 0.05, 0.1);

    // ADS
    const targetPos = ads ? new THREE.Vector3(0, -0.12, -0.1) : new THREE.Vector3(0.25, -0.25, -0.4);
    const model = group.current.children[0];
    model.position.lerp(targetPos, 0.2);
    model.position.x += weaponState.current.swayX;
    model.position.y += weaponState.current.swayY;

    // Walking Bob
    const isMoving = (moveForward || moveBackward || moveLeft || moveRight);
    if (isMoving) {
      const speed = ads ? 0.05 : 0.15;
      weaponState.current.bob += speed;
      model.position.y += Math.sin(weaponState.current.bob) * 0.005;
      model.position.x += Math.cos(weaponState.current.bob * 0.5) * 0.005;
    }

    // Shooting logic
    if (shoot && Date.now() - weaponState.current.lastFire > 100 && !weaponState.current.reloading) {
      weaponState.current.lastFire = Date.now();
      model.position.z += 0.1;
      model.rotation.x -= 0.1;

      setIsFiring(true);
      setTimeout(() => setIsFiring(false), 50);
    }

    model.position.z = THREE.MathUtils.lerp(model.position.z, targetPos.z, 0.2);
    model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, 0, 0.2);

    if (reload && !weaponState.current.reloading) {
        weaponState.current.reloading = true;
        model.rotation.z = Math.PI * 0.2;
        setTimeout(() => {
            weaponState.current.reloading = false;
            model.rotation.z = 0;
        }, 1000);
    }
  });

  return (
    <group ref={group}>
      <group>
        {/* Main Body */}
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.15, 0.5]} />
          <meshStandardMaterial map={metalTexture} color="#151515" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Barrel */}
        <mesh position={[0, 0.04, -0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
            <meshStandardMaterial color="#050505" metalness={1} roughness={0} />
        </mesh>
        {/* Grip */}
        <mesh position={[0, -0.12, 0.1]} rotation={[0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.07, 0.25, 0.1]} />
          <meshStandardMaterial map={metalTexture} color="#111" />
        </mesh>

        {isFiring && <MuzzleFlash position={[0, 0.04, -0.5]} rotation={[-Math.PI / 2, 0, 0]} />}
      </group>
    </group>
  );
}
