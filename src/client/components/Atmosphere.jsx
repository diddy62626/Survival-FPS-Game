import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

export default function Atmosphere() {
  const sunRef = useRef();
  const setTime = useGameStore((state) => state.setTime);

  // Set a brighter time of day (around 0.2 is morning/daylight)
  const time = 0.2;

  useFrame((state) => {
    setTime(time);

    const angle = time * Math.PI * 2;
    const sunX = Math.cos(angle) * 200;
    const sunY = Math.sin(angle) * 200;
    const sunZ = 50;

    if (sunRef.current) {
      sunRef.current.position.set(sunX, sunY, sunZ);
      sunRef.current.intensity = 3.0;
    }
  });

  const sunPos = [Math.cos(time * Math.PI * 2) * 200, Math.sin(time * Math.PI * 2) * 200, 50];

  return (
    <>
      <Sky
        sunPosition={sunPos}
        turbidity={5}
        rayleigh={2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <Stars radius={300} depth={60} count={1000} factor={4} saturation={0} fade speed={1} />
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <ambientLight intensity={0.8} color="#ffffff" />
      <fog attach="fog" args={['#87ceeb', 10, 300]} />
    </>
  );
}
