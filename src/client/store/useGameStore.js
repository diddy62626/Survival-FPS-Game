import { create } from 'zustand';

export const useGameStore = create((set) => ({
  seed: 'survival-world',
  setSeed: (seed) => set({ seed }),

  playerName: localStorage.getItem('survival-playerName') || '',
  setPlayerName: (name) => {
    localStorage.setItem('survival-playerName', name);
    set({ playerName: name });
  },

  time: 0,
  setTime: (time) => set({ time }),

  kills: [],
  addKill: (kill) => set((state) => ({ kills: [kill, ...state.kills].slice(0, 10) })),

  players: {},
  updatePlayer: (id, data) => set((state) => ({
    players: { ...state.players, [id]: { ...state.players[id], ...data } }
  })),
  removePlayer: (id) => set((state) => {
    const newPlayers = { ...state.players };
    delete newPlayers[id];
    return { players: newPlayers };
  }),
}));
