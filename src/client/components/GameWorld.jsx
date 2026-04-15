import React, { useMemo } from 'react';
import { usePlane, useBox } from '@react-three/cannon';
import { Environment, Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';

function HollowBuilding({ position, size, type, performance }) {
  const wallThickness = 0.8;
  const [w, h, d] = size;

  // Physics for walls
  useBox(() => ({ type: 'Static', position: [position[0], h/2, position[2] - d/2], args: [w, h, wallThickness] })); // Back
  useBox(() => ({ type: 'Static', position: [position[0] - w/2, h/2, position[2]], args: [wallThickness, h, d] })); // Left
  useBox(() => ({ type: 'Static', position: [position[0] + w/2, h/2, position[2]], args: [wallThickness, h, d] })); // Right
  useBox(() => ({ type: 'Static', position: [position[0], 0.2, position[2]], args: [w, 0.4, d] })); // Floor
  useBox(() => ({ type: 'Static', position: [position[0], h, position[2]], args: [w, 0.4, d] })); // Roof

  const color = ["#7d7d7d", "#8a5a44", "#4a5d4a", "#5a6a8a", "#a83232"][type % 5];

  return (
    <group position={position}>
      {/* Visual Mesh */}
      <mesh castShadow={!performance} receiveShadow={!performance}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Doorway Gap (Visual Trick) */}
      <mesh position={[0, h/2, d/2]} scale={[0.4, 0.6, 1.1]}>
        <boxGeometry args={[w, h, 1]} />
        <meshBasicMaterial color="black" />
      </mesh>

      {!performance && (
        <pointLight position={[0, h/2, 0]} intensity={10} distance={25} color="#ffaa66" />
      )}
    </group>
  );
}

export default function GameWorld({ performance }) {
  const [groundRef] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0]
  }));

  const buildings = useMemo(() => {
    const data = [];
    const seed = 12345;
    for (let i = 0; i < 40; i++) {
        const x = (Math.sin(i * 1.5 + seed) * 300);
        const z = (Math.cos(i * 1.1 + seed) * 300);
        if (Math.abs(x) < 40 && Math.abs(z) < 40) continue;
        data.push({
            position: [x, 0, z],
            size: [20 + (i % 5) * 5, 15 + (i % 3) * 10, 20 + (i % 4) * 5],
            type: i
        });
    }
    return data;
  }, []);

  return (
    <>
      <mesh ref={groundRef} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {buildings.map((b, i) => (
        <HollowBuilding key={i} {...b} performance={performance} />
      ))}

      {!performance && <Environment preset="city" />}
    </>
  );
}
