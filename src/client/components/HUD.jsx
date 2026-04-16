import React from 'react';
import { useGameStore } from '../store/useGameStore';

export default function HUD() {
  const playerName = useGameStore(state => state.playerName);
  const kills = useGameStore(state => state.kills);
  const players = useGameStore(state => state.players);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
      pointerEvents: 'none', color: '#00ff66', fontFamily: 'Share Tech Mono',
      textShadow: '0 0 10px #00ff66'
    }}>
      {/* Top Right: Kill Feed */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', textAlign: 'right' }}>
        <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '10px' }}>COMBAT LOG</div>
        {kills.map((k, i) => (
          <div key={i} style={{
            background: 'rgba(0,255,102,0.1)', borderRight: '2px solid #00ff66',
            padding: '5px 15px', marginBottom: '5px', fontSize: '14px'
          }}>
            <span style={{color: '#fff'}}>{k.killer}</span>
            <span style={{margin: '0 10px'}}>»</span>
            <span>{k.victim}</span>
          </div>
        ))}
      </div>

      {/* Top Left: Player List */}
      <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
        <div style={{
            background: 'rgba(0,0,0,0.7)', padding: '10px', border: '1px solid #00ff66',
            clipPath: 'polygon(0 0, 100% 0, 100% 80%, 90% 100%, 0 100%)'
        }}>
            <div style={{ borderBottom: '1px solid #00ff66', paddingBottom: '5px', marginBottom: '10px', fontSize: '12px' }}>NEURAL NETS: {Object.keys(players).length + 1}</div>
            <div style={{ color: '#fff', marginBottom: '5px' }}>● {playerName} <small>(HOST)</small></div>
            {Object.entries(players).map(([id, p]) => (
            <div key={id} style={{ opacity: 0.8 }}>○ {p.name || id}</div>
            ))}
        </div>
      </div>

      {/* Bottom Center: Vitals & Ammo */}
      <div style={{
        position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '10px' }}>
            <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '12px' }}>VITALS</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>100<span style={{fontSize: '14px'}}>%</span></div>
            </div>
            <div style={{ width: '300px', height: '12px', background: 'rgba(0,255,102,0.1)', border: '1px solid #00ff66', marginBottom: '8px' }}>
                <div style={{ width: '100%', height: '100%', background: '#00ff66', boxShadow: '0 0 15px #00ff66' }}></div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px' }}>AMMO</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>15<span style={{fontSize: '14px'}}>/∞</span></div>
            </div>
        </div>
      </div>

      {/* Crosshair */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: '20px', height: '20px',
        transform: 'translate(-50%, -50%)'
      }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', width: '2px', height: '6px', background: '#00ff66' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', width: '2px', height: '6px', background: '#00ff66' }}></div>
        <div style={{ position: 'absolute', left: 0, top: '50%', width: '6px', height: '2px', background: '#00ff66' }}></div>
        <div style={{ position: 'absolute', right: 0, top: '50%', width: '6px', height: '2px', background: '#00ff66' }}></div>
      </div>
    </div>
  );
}
