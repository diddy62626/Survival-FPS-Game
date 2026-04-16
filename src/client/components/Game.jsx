import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Stats } from '@react-three/drei';
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
          <Canvas shadows camera={{ fov: 75, position: [0, 5, 10] }}>
            <Suspense fallback={null}>
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
