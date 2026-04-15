import React, { useRef, useEffect } from 'react';
import { useSphere } from '@react-three/cannon';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SPEED = 5;

export default function Player() {
  const { camera } = useThree();
  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: 'Dynamic',
    position: [0, 5, 0],
    fixedRotation: true,
  }));

  const velocity = useRef([0, 0, 0]);
  useEffect(() => api.velocity.subscribe((v) => (velocity.current = v)), [api.velocity]);

  const pos = useRef([0, 0, 0]);
  useEffect(() => api.position.subscribe((p) => (pos.current = p)), [api.position]);

  const keys = useRef({});
  useEffect(() => {
    const down = (e) => (keys.current[e.code] = true);
    const up = (e) => (keys.current[e.code] = false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((state) => {
    camera.position.copy(new THREE.Vector3(pos.current[0], pos.current[1] + 0.8, pos.current[2]));

    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, Number(keys.current.KeyS || 0) - Number(keys.current.KeyW || 0));
    const sideVector = new THREE.Vector3(Number(keys.current.KeyA || 0) - Number(keys.current.KeyD || 0), 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyQuaternion(camera.quaternion);

    api.velocity.set(direction.x, velocity.current[1], direction.z);

    if (keys.current.Space && Math.abs(velocity.current[1]) < 0.05) {
      api.velocity.set(velocity.current[0], 5, velocity.current[2]);
    }
  });

  return <mesh ref={ref} />;
}
