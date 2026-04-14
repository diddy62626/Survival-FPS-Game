import type * as Party from "partykit/server";

interface Zombie {
    id: string;
    pos: { x: number, y: number, z: number };
    hp: number;
    targetPlayerId?: string;
}

export default class Server implements Party.Server {
  players: Map<string, any> = new Map();
  zombies: Map<string, Zombie> = new Map();
  wave: number = 0;
  waveActive: boolean = false;
  lastZombieId: number = 0;

  constructor(readonly party: Party.Party) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    this.players.set(conn.id, { pos: { x: 0, y: 0, z: 0 }, rot: { x: 0, y: 0, z: 0, w: 1 }, hp: 100 });
    conn.send(JSON.stringify({ type: 'init', id: conn.id, wave: this.wave }));

    // Send existing zombies to the new player
    if (this.zombies.size > 0) {
        conn.send(JSON.stringify({ type: 'zombieSync', zombies: Array.from(this.zombies.values()) }));
    }

    if (!this.waveActive && this.players.size > 0) {
        this.startNextWave();
    }
  }

  startNextWave() {
    this.waveActive = true;
    this.wave++;
    this.party.broadcast(JSON.stringify({ type: 'waveStart', wave: this.wave }));

    const count = this.wave * 5 + (this.players.size * 2);
    for (let i = 0; i < count; i++) {
        this.spawnZombie();
    }
  }

  spawnZombie() {
    const id = "zombie_" + (++this.lastZombieId);
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 10;
    const zombie: Zombie = {
        id,
        pos: { x: Math.cos(angle) * dist, y: 0, z: Math.sin(angle) * dist },
        hp: 50 + (this.wave * 10)
    };
    this.zombies.set(id, zombie);
    this.party.broadcast(JSON.stringify({ type: 'zombieSpawn', zombie }));
  }

  onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);

    if (data.type === 'move') {
      const player = this.players.get(sender.id);
      if (player) {
        player.pos = data.pos;
        player.rot = data.rot;
      }
      this.party.broadcast(JSON.stringify({ type: 'playerUpdate', id: sender.id, pos: data.pos, rot: data.rot }), [sender.id]);
    }

    if (data.type === 'hitZombie') {
        const z = this.zombies.get(data.zombieId);
        if (z) {
            z.hp -= data.damage;
            if (z.hp <= 0) {
                this.zombies.delete(data.zombieId);
                this.party.broadcast(JSON.stringify({ type: 'zombieDeath', id: data.zombieId, killerId: sender.id }));

                if (this.zombies.size === 0) {
                    this.waveActive = false;
                    setTimeout(() => { if (!this.waveActive) this.startNextWave(); }, 5000);
                }
            }
        }
    }
  }

  onClose(conn: Party.Connection) {
    this.players.delete(conn.id);
    this.party.broadcast(JSON.stringify({ type: 'playerLeft', id: conn.id }));
  }
}
