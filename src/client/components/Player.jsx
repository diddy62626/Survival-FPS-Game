import React, { useRef, useEffect, useState } from 'react';
import { useSphere } from '@react-three/cannon';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from '../hooks/useKeyboard';
import Weapon from './Weapon';
import { useGameStore } from '../store/useGameStore';

export default function Player({ socketRef }) {
  const { camera } = useThree();
  const { moveForward, moveBackward, moveLeft, moveRight, jump, shoot } = useKeyboard();

  // Randomized spawn within a small radius at a safe height
  const initialPos = [
    (Math.random() - 0.5) * 5,
    10,
    (Math.random() - 0.5) * 5
  ];

  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: 'Dynamic',
    position: initialPos,
    args: [0.6],
    fixedRotation: true,
  }));

  const velocity = useRef([0, 0, 0]);
  useEffect(() => api.velocity.subscribe((v) => (velocity.current = v)), [api.velocity]);

  const pos = useRef([0, 0, 0]);
  useEffect(() => api.position.subscribe((p) => (pos.current = p)), [api.position]);

  const [shakeValue, setShakeValue] = useState(0);

  const flashlightRef = useRef();

  useFrame((state, delta) => {
    // Camera follows player
    camera.position.set(pos.current[0], pos.current[1] + 0.8, pos.current[2]);

    // Respawn if fell off the world
    if (pos.current[1] < -50) {
        api.position.set(0, 20, 0);
        api.velocity.set(0, 0, 0);
    }

    if (shakeValue > 0) {
        camera.position.x += (Math.random() - 0.5) * shakeValue;
        camera.position.y += (Math.random() - 0.5) * shakeValue;
        setShakeValue(s => Math.max(0, s - delta * 0.5));
    }

    if (flashlightRef.current) {
        flashlightRef.current.position.copy(camera.position);
        flashlightRef.current.quaternion.copy(camera.quaternion);
    }

    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, Number(moveBackward) - Number(moveForward));
    const sideVector = new THREE.Vector3(Number(moveLeft) - Number(moveRight), 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(5)
      .applyEuler(camera.rotation);

    api.velocity.set(direction.x, velocity.current[1], direction.z);

    if (jump && Math.abs(velocity.current[1]) < 0.05) {
      api.velocity.set(velocity.current[0], 8, velocity.current[2]);
    }

    if (shoot && Date.now() % 100 < 20) {
        setShakeValue(0.05);
    }

    if (socketRef && socketRef.current) {
        socketRef.current.send(JSON.stringify({
            type: 'move',
            pos: pos.current
        }));
    }
  });

  return (
    <>
      <mesh ref={ref} />
      <spotLight
        ref={flashlightRef}
        intensity={2}
        distance={40}
        angle={Math.PI / 6}
        penumbra={0.5}
        castShadow
      />
      <Weapon />
    </>
  );
}
