import React, { useState, useEffect } from 'react';
import { Settings, ShoppingBag, Users } from 'lucide-react';

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
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 w-3 h-3 border-2 border-green-500 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-70" />

      {/* HUD */}
      <div className="absolute bottom-8 left-8 p-6 bg-black/80 border-l-4 border-green-500 text-white font-orbitron pointer-events-auto">
        <div className="text-red-500 font-bold mb-1">HP: 100</div>
        <div className="text-green-500 font-bold mb-1">POINTS: 0</div>
        <div className="text-white mb-4">WAVE: 1</div>
        <div className="flex gap-2">
            <button className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded transition-colors"><ShoppingBag size={18} /></button>
            <button className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded transition-colors"><Users size={18} /></button>
            <button
                onClick={() => setShowSettings(true)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded transition-colors"
            >
                <Settings size={18} />
            </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
          <div className="bg-zinc-900 border border-zinc-700 border-t-4 border-t-green-500 p-10 w-[400px] shadow-2xl">
            <h2 className="font-orbitron text-2xl text-green-500 mb-8 text-center tracking-wider font-bold">SETTINGS</h2>

            <div className="mb-8 text-left">
              <div className="flex justify-between font-orbitron text-xs text-zinc-400 mb-2 uppercase">
                <span>Field of View</span>
                <span className="text-green-500">{settings.fov}</span>
              </div>
              <input
                type="range" min="40" max="120" value={settings.fov}
                onChange={(e) => setSettings({...settings, fov: parseInt(e.target.value)})}
                className="w-full accent-green-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
              />
            </div>

            <div className="mb-8 text-left">
              <div className="flex justify-between font-orbitron text-xs text-zinc-400 mb-2 uppercase">
                <span>Render Distance</span>
                <span className="text-green-500">{settings.renderDist}</span>
              </div>
              <input
                type="range" min="1" max="100" value={settings.renderDist}
                onChange={(e) => setSettings({...settings, renderDist: parseInt(e.target.value)})}
                className="w-full accent-green-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
              />
            </div>

            <div className="mb-8">
                <button
                    onClick={() => setSettings({...settings, performance: !settings.performance})}
                    className={`w-full p-4 font-orbitron text-sm transition-all duration-200 border ${settings.performance ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-800 text-zinc-400 border-zinc-600'}`}
                >
                    EXTREME OPTIMIZATION: {settings.performance ? 'ON' : 'OFF'}
                </button>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-orbitron tracking-widest transition-colors uppercase font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
