import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, PointerLockControls, Environment } from '@react-three/drei';
import { Physics } from '@react-three/cannon';
import GameWorld from './components/GameWorld';
import Player from './components/Player';
import UI from './components/UI';
import MainMenu from './components/MainMenu';

export default function App() {
  const [inGame, setInGame] = useState(false);
  const [settings, setSettings] = useState({ fov: 75, renderDist: 50, performance: false });

  return (
    <div className="w-full h-screen bg-black">
      {!inGame ? (
        <MainMenu onStart={(mode) => setInGame(true)} />
      ) : (
        <>
          <Canvas
            shadows={!settings.performance}
            camera={{ fov: settings.fov, position: [0, 2, 0] }}
            gl={{ antialias: !settings.performance, powerPreference: "high-performance" }}
          >
            <Suspense fallback={null}>
              <Sky sunPosition={[100, 10, 100]} />
              <ambientLight intensity={settings.performance ? 1.5 : 0.5} />
              <pointLight position={[10, 10, 10]} castShadow={!settings.performance} />

              <Physics gravity={[0, -9.81, 0]}>
                <GameWorld performance={settings.performance} />
                <Player />
              </Physics>

              <PointerLockControls />
            </Suspense>
          </Canvas>
          <UI settings={settings} setSettings={setSettings} />
        </>
      )}
    </div>
  );
}
