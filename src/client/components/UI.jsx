import React, { useState, useEffect } from 'react';
import { Settings, ShoppingBag, Users, X } from 'lucide-react';

export default function UI({ settings, setSettings }) {
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowSettings(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-50">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 w-4 h-4 border-2 border-green-500 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-80" />

      {/* HUD */}
      <div className="absolute bottom-10 left-10 p-6 bg-black/90 border-l-4 border-green-500 text-white font-orbitron pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="text-red-500 font-bold text-xl mb-2">HP: 100</div>
        <div className="text-green-500 font-bold text-xl mb-2">POINTS: 0</div>
        <div className="text-zinc-400 text-sm mb-4 tracking-widest">WAVE: 1</div>
        <div className="flex gap-3">
            <button className="p-3 bg-zinc-800 hover:bg-green-500 hover:text-black border border-zinc-700 rounded transition-all"><ShoppingBag size={20} /></button>
            <button className="p-3 bg-zinc-800 hover:bg-green-500 hover:text-black border border-zinc-700 rounded transition-all"><Users size={20} /></button>
            <button
                onClick={() => setShowSettings(true)}
                className="p-3 bg-zinc-800 hover:bg-green-500 hover:text-black border border-zinc-700 rounded transition-all"
            >
                <Settings size={20} />
            </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto transition-all">
          <div className="bg-zinc-950 border border-zinc-800 border-t-4 border-t-green-500 p-12 w-[450px] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-10">
                <h2 className="font-orbitron text-3xl text-green-500 tracking-tighter font-bold">SYSTEM SETTINGS</h2>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>

            <div className="mb-10 text-left">
              <div className="flex justify-between font-orbitron text-xs text-zinc-500 mb-3 uppercase tracking-widest">
                <span>Field of View</span>
                <span className="text-green-500 font-bold">{settings.fov}</span>
              </div>
              <input
                type="range" min="40" max="120" value={settings.fov}
                onChange={(e) => setSettings({...settings, fov: parseInt(e.target.value)})}
                className="w-full accent-green-500 cursor-pointer h-2 bg-zinc-900 rounded-full appearance-none"
              />
            </div>

            <div className="mb-10 text-left">
              <div className="flex justify-between font-orbitron text-xs text-zinc-500 mb-3 uppercase tracking-widest">
                <span>Render Distance</span>
                <span className="text-green-500 font-bold">{settings.renderDist}</span>
              </div>
              <input
                type="range" min="1" max="100" value={settings.renderDist}
                onChange={(e) => setSettings({...settings, renderDist: parseInt(e.target.value)})}
                className="w-full accent-green-500 cursor-pointer h-2 bg-zinc-900 rounded-full appearance-none"
              />
            </div>

            <div className="mb-10">
                <button
                    onClick={() => setSettings({...settings, performance: !settings.performance})}
                    className={`w-full p-5 font-orbitron text-xs tracking-[0.2em] transition-all duration-300 border ${settings.performance ? 'bg-green-500 text-black border-green-500 font-bold' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-green-500/50'}`}
                >
                    EXTREME OPTIMIZATION: {settings.performance ? 'ENABLED' : 'DISABLED'}
                </button>
                <p className="text-[10px] text-zinc-600 mt-3 font-orbitron text-center uppercase tracking-widest">Disables shadows, foliage, and high-res effects</p>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-5 bg-green-500 hover:bg-green-400 text-black font-orbitron tracking-[0.3em] transition-all uppercase font-black text-sm"
            >
              RESUME COMBAT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
