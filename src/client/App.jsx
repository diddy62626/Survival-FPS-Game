import React, { Suspense, useState } from 'react';
import { useGameStore } from './store/useGameStore';
import Game from './components/Game';

function LoginScreen({ onJoin }) {
  const [name, setName] = useState(localStorage.getItem('survival-playerName') || '');
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.9)', zIndex: 100, color: '#00ff66', fontFamily: 'Orbitron'
    }}>
      <h1 style={{ letterSpacing: '4px' }}>NEURAL LINK ESTABLISHED</h1>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ENTER DESIGNATION"
        style={{ background: '#111', border: '1px solid #00ff66', color: '#00ff66', padding: '10px', fontSize: '20px', textAlign: 'center', outline: 'none' }}
      />
      <button
        onClick={() => onJoin(name)}
        style={{ marginTop: '20px', padding: '10px 40px', background: '#00ff66', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
      >
        SYNC WITH SERVER
      </button>
    </div>
  );
}

export default function App() {
  const [joined, setJoined] = useState(false);
  const setPlayerName = useGameStore(state => state.setPlayerName);

  const handleJoin = (name) => {
    if (name.trim()) {
      setPlayerName(name);
      setJoined(true);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {!joined && <LoginScreen onJoin={handleJoin} />}
      {joined && (
        <Suspense fallback={<div style={{color:'#0f6'}}>LOADING WORLD...</div>}>
            <Game />
        </Suspense>
      )}
    </div>
  );
}
