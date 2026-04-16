import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

export default function Atmosphere() {
  const sunRef = useRef();
  const ambientRef = useRef();
  const setTime = useGameStore((state) => state.setTime);

  // Day duration in seconds
  const dayDuration = 300;

  useFrame((state, delta) => {
    const time = (state.clock.elapsedTime % dayDuration) / dayDuration;
    setTime(time);

    const angle = time * Math.PI * 2;
    const sunPos = [
      Math.cos(angle) * 100,
      Math.sin(angle) * 100,
      50
    ];

    if (sunRef.current) {
      sunRef.current.position.set(...sunPos);
      // Intensity based on height
      const intensity = Math.max(0, Math.sin(angle) * 1.5);
      sunRef.current.intensity = intensity;
    }

    if (ambientRef.current) {
      const ambientIntensity = Math.max(0.1, Math.sin(angle) * 0.4 + 0.2);
      ambientRef.current.intensity = ambientIntensity;
    }
  });

  return (
    <>
      <Sky sunPosition={[100, 20, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <ambientLight ref={ambientRef} />
    </>
  );
}
