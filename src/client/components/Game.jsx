import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Stats, Environment } from '@react-three/drei';
import { Physics } from '@react-three/cannon';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
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

              <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={1} luminanceSmoothing={0.9} height={300} />
                <Noise opacity={0.05} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
              </EffectComposer>

              <PointerLockControls />
            </Suspense>
          </Canvas>
          <HUD />
        </>
    );
}
