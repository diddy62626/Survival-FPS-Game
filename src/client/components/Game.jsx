import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Stats, Environment } from '@react-three/drei';
import { Physics } from '@react-three/cannon';
import World from './World';
import Player from './Player';
import OtherPlayers from './OtherPlayers';
import ZombieManager from './ZombieFactory';
import HUD from './HUD';
import { useMultiplayer } from '../hooks/useMultiplayer';

export default function Game() {
    const socketRef = useMultiplayer();
    return (
        <>
          <Canvas
            shadows
            camera={{ fov: 75, position: [0, 5, 10] }}
            gl={{
              antialias: true,
              powerPreference: "high-performance",
            }}
          >
            <Suspense fallback={null}>
              <color attach="background" args={['#050505']} />
              <Environment preset="night" />
              <Physics gravity={[0, -25, 0]}>
                <World />
                <Player socketRef={socketRef} />
                <OtherPlayers />
                <ZombieManager />
              </Physics>
              <PointerLockControls />
            </Suspense>
          </Canvas>
          <HUD />
        </>
    );
}
