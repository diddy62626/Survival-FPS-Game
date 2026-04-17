import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

export default function Atmosphere() {
  const sunRef = useRef();
  const ambientRef = useRef();
  const setTime = useGameStore((state) => state.setTime);

  const dayDuration = 300;

  useFrame((state) => {
    const time = (state.clock.elapsedTime % dayDuration) / dayDuration;
    setTime(time);

    const angle = time * Math.PI * 2;
    // Ensure sun is always above 0 during day for better light
    const sunY = Math.sin(angle) * 100;
    const sunPos = [
      Math.cos(angle) * 100,
      sunY,
      Math.sin(angle * 0.5) * 50
    ];

    if (sunRef.current) {
      sunRef.current.position.set(...sunPos);
      const intensity = Math.max(0.1, Math.sin(angle) * 1.5);
      sunRef.current.intensity = intensity;
    }

    if (ambientRef.current) {
      // Brighter ambient so silhouettes aren't pitch black
      const ambientIntensity = Math.max(0.3, Math.sin(angle) * 0.4 + 0.4);
      ambientRef.current.intensity = ambientIntensity;
    }
  });

  return (
    <>
      <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} />
      <Stars radius={300} depth={60} count={10000} factor={7} saturation={0} fade speed={1} />
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <ambientLight ref={ambientRef} />
      <fog attach="fog" args={['#222', 0, 150]} />
    </>
  );
}
