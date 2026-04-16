import { useEffect, useRef } from 'react';
import PartySocket from 'partysocket';
import { useGameStore } from '../store/useGameStore';

export function useMultiplayer(room = 'main-room') {
  const playerName = useGameStore(state => state.playerName);
  const updatePlayer = useGameStore(state => state.updatePlayer);
  const removePlayer = useGameStore(state => state.removePlayer);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!playerName) return;

    const socket = new PartySocket({
      host: window.location.host.includes('localhost') ? 'localhost:1999' : window.location.host,
      room: room,
    });
    socketRef.current = socket;

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', name: playerName }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'playerUpdate') {
          updatePlayer(data.id, data);
      }
      if (data.type === 'playerLeft') {
          removePlayer(data.id);
      }
    };

    return () => {
        socket.close();
        socketRef.current = null;
    };
  }, [playerName, room, updatePlayer, removePlayer]);

  return socketRef;
}
