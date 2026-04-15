import React from 'react';

export default function MainMenu({ onStart }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-[url('https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative z-10 text-center">
        <h1 className="font-orbitron text-7xl text-green-500 mb-12 tracking-[0.2em] drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
          SURVIVAL
        </h1>
        <div className="bg-zinc-900/90 p-12 border border-zinc-700 border-t-4 border-t-green-500 shadow-2xl w-[400px]">
          <button
            onClick={() => onStart('sp')}
            className="w-full mb-4 py-4 px-8 border border-zinc-600 font-orbitron text-white hover:bg-green-500 hover:text-black transition-all duration-200 tracking-widest uppercase font-bold"
          >
            Singleplayer
          </button>
          <button
            onClick={() => onStart('mp')}
            className="w-full py-4 px-8 border border-zinc-600 font-orbitron text-white hover:bg-green-500 hover:text-black transition-all duration-200 tracking-widest uppercase font-bold"
          >
            Multiplayer
          </button>
        </div>
      </div>
    </div>
  );
}
