import type * as Party from "partykit/server";

export default class Server implements Party.Server {
  players: Map<string, { name: string, pos: any }> = new Map();

  constructor(readonly party: Party.Party) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log("Connected", conn.id);
  }

  onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);

    if (data.type === 'join') {
      this.players.set(sender.id, { name: data.name, pos: [0, 0, 0] });
    }

    if (data.type === 'move') {
        const p = this.players.get(sender.id);
        if (p) {
            p.pos = data.pos;
            this.party.broadcast(JSON.stringify({
                type: 'playerUpdate',
                id: sender.id,
                name: p.name,
                pos: p.pos
            }), [sender.id]);
        }
    }
  }

  onClose(conn: Party.Connection) {
    this.players.delete(conn.id);
    this.party.broadcast(JSON.stringify({ type: 'playerLeft', id: conn.id }));
  }
}
