import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

export default function Atmosphere() {
  const sunRef = useRef();
  const ambientRef = useRef();
  const setTime = useGameStore((state) => state.setTime);

  useFrame((state) => {
    // 0.48 is a nice late afternoon/sunset where things are still visible
    const time = 0.48;
    setTime(time);

    const angle = time * Math.PI * 2;
    const sunX = Math.cos(angle) * 200;
    const sunY = Math.sin(angle) * 200;
    const sunZ = 50;

    if (sunRef.current) {
      sunRef.current.position.set(sunX, sunY, sunZ);
      sunRef.current.intensity = 2.0;
    }
  });

  return (
    <>
      <Sky
        sunPosition={[100, 10, 50]}
        turbidity={8}
        rayleigh={6}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <Stars radius={300} depth={60} count={10000} factor={4} saturation={0} fade speed={1} />
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <ambientLight ref={ambientRef} intensity={0.7} color="#ffffff" />
      <fog attach="fog" args={['#2a2a4e', 5, 200]} />
    </>
  );
}
