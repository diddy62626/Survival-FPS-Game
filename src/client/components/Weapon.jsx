import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from '../hooks/useKeyboard';
import { useTexture } from '@react-three/drei';

export default function Weapon() {
  const group = useRef();
  const muzzleFlash = useRef();
  const { camera } = useThree();
  const { shoot, ads, reload, moveForward, moveBackward, moveLeft, moveRight } = useKeyboard();
  const metalTexture = useTexture('/assets/textures/metal.png');

  const weaponState = useRef({
    reloading: false,
    lastFire: 0,
    bob: 0,
  });

  useFrame((state) => {
    const { clock } = state;

    // Weapon follow camera with sway
    group.current.position.copy(camera.position);
    group.current.quaternion.slerp(camera.quaternion, 0.25);

    // ADS
    const targetPos = ads ? new THREE.Vector3(0, -0.12, -0.2) : new THREE.Vector3(0.3, -0.3, -0.5);
    const model = group.current.children[0];
    model.position.lerp(targetPos, 0.15);

    // Walking Bob
    const isMoving = (moveForward || moveBackward || moveLeft || moveRight) && !ads;
    if (isMoving) {
      weaponState.current.bob += 0.12;
      model.position.y += Math.sin(weaponState.current.bob) * 0.006;
      model.position.x += Math.cos(weaponState.current.bob * 0.5) * 0.006;
    }

    // Shooting recoil & logic (Transient visibility for muzzle flash to avoid lag)
    if (shoot && Date.now() - weaponState.current.lastFire > 120 && !weaponState.current.reloading) {
      weaponState.current.lastFire = Date.now();
      model.position.z += 0.12;
      model.rotation.x -= 0.15;

      if (muzzleFlash.current) {
          muzzleFlash.current.visible = true;
          muzzleFlash.current.scale.setScalar(Math.random() * 0.5 + 0.5);
          setTimeout(() => { if(muzzleFlash.current) muzzleFlash.current.visible = false; }, 50);
      }
    }

    model.position.z = THREE.MathUtils.lerp(model.position.z, targetPos.z, 0.15);
    model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, 0, 0.15);

    if (reload && !weaponState.current.reloading) {
        weaponState.current.reloading = true;
        model.position.y -= 0.6;
        setTimeout(() => {
            weaponState.current.reloading = false;
        }, 1200);
    }
  });

  return (
    <group ref={group}>
      <group position={[0.3, -0.3, -0.5]}>
        <mesh castShadow>
          <boxGeometry args={[0.1, 0.2, 0.6]} />
          <meshStandardMaterial map={metalTexture} color="#222" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.15, 0.15]} castShadow>
          <boxGeometry args={[0.08, 0.4, 0.1]} />
          <meshStandardMaterial map={metalTexture} color="#111" />
        </mesh>
        {/* Muzzle Flash (Static mesh with toggled visibility) */}
        <mesh ref={muzzleFlash} position={[0, 0.05, -0.35]} visible={false}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
}
