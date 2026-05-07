import React from 'react';
import { useGameStore } from '../store/useGameStore';

export default function HUD() {
  const playerName = useGameStore(state => state.playerName);
  const kills = useGameStore(state => state.kills);
  const players = useGameStore(state => state.players);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
      pointerEvents: 'none', color: '#00ff66', fontFamily: "'Share Tech Mono', monospace",
      textShadow: '0 0 10px rgba(0,255,102,0.5)'
    }}>
      {/* Scanline Overlay */}
      <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 2px, 3px 100%',
          pointerEvents: 'none', zIndex: 10
      }}></div>

      {/* Top Right: Kill Feed */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', textAlign: 'right', zIndex: 20 }}>
        <div style={{ fontSize: '10px', opacity: 0.6, letterSpacing: '2px', marginBottom: '10px' }}>[ SUBSYSTEM_LOG ]</div>
        {kills.slice(-5).map((k, i) => (
          <div key={i} style={{
            background: 'rgba(0,255,102,0.05)', borderRight: '3px solid #00ff66',
            padding: '4px 12px', marginBottom: '4px', fontSize: '13px',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <span style={{color: '#fff'}}>{k.killer}</span>
            <span style={{margin: '0 8px', opacity: 0.5}}>::</span>
            <span>{k.victim}</span>
          </div>
        ))}
      </div>

      {/* Top Left: Player List */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 20 }}>
        <div style={{
            background: 'rgba(5,15,5,0.8)', padding: '15px', border: '1px solid rgba(0,255,102,0.3)',
            borderLeft: '4px solid #00ff66',
            boxShadow: '10px 10px 20px rgba(0,0,0,0.5)'
        }}>
            <div style={{ borderBottom: '1px solid rgba(0,255,102,0.2)', paddingBottom: '8px', marginBottom: '12px', fontSize: '10px', color: '#00ff66' }}>
                ACTIVE_NODES: {Object.keys(players).length + 1}
            </div>
            <div style={{ color: '#fff', marginBottom: '6px', fontSize: '14px' }}>
                <span style={{color: '#00ff66', marginRight: '8px'}}>▶</span>{playerName} <small style={{opacity: 0.5}}>[ LOCAL_HOST ]</small>
            </div>
            {Object.entries(players).map(([id, p]) => (
            <div key={id} style={{ opacity: 0.7, fontSize: '14px', marginLeft: '20px' }}>
                <span style={{marginRight: '8px'}}>_</span>{p.name || id.substring(0,6)}
            </div>
            ))}
        </div>
      </div>

      {/* Bottom Center: Vitals & Ammo */}
      <div style={{
        position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>BIOMETRICS</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', letterSpacing: '-2px' }}>100<span style={{fontSize: '16px', opacity: 0.6, marginLeft: '2px'}}>%</span></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ width: '400px', height: '4px', background: 'rgba(0,255,102,0.1)', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: '#00ff66', boxShadow: '0 0 20px #00ff66' }}></div>
                </div>
                <div style={{ width: '400px', height: '2px', background: 'rgba(0,255,102,0.05)' }}></div>
            </div>

            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>ORDNANCE</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', letterSpacing: '-2px' }}>15<span style={{fontSize: '16px', opacity: 0.6, marginLeft: '4px'}}>/ ∞</span></div>
            </div>
        </div>
      </div>

      {/* Crosshair */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: '30px', height: '30px',
        transform: 'translate(-50%, -50%)', zIndex: 20
      }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', width: '1px', height: '8px', background: '#00ff66', transform: 'translateX(-50%)' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', width: '1px', height: '8px', background: '#00ff66', transform: 'translateX(-50%)' }}></div>
        <div style={{ position: 'absolute', left: 0, top: '50%', width: '8px', height: '1px', background: '#00ff66', transform: 'translateY(-50%)' }}></div>
        <div style={{ position: 'absolute', right: 0, top: '50%', width: '8px', height: '1px', background: '#00ff66', transform: 'translateY(-50%)' }}></div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '2px', height: '2px', background: '#00ff66', borderRadius: '50%', transform: 'translate(-50%, -50%)' }}></div>
      </div>

      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateX(10px); }
            to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
