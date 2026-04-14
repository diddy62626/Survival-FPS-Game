import type * as Party from "partykit/server";

interface Zombie {
    id: string;
    pos: { x: number, y: number, z: number };
    hp: number;
}

export default class Server implements Party.Server {
  players: Map<string, { pos: { x: number, y: number, z: number }, hp: number }> = new Map();
  zombies: Map<string, Zombie> = new Map();
  wave: number = 0;
  waveActive: boolean = false;
  lastZombieId: number = 0;
  tickInterval: any = null;

  constructor(readonly party: Party.Party) {}

  // Added based on user example for room info
  onRequest(request: Request) {
    return new Response(`Survival FPS - Room: ${this.party.id}. Players: ${this.players.size}. Wave: ${this.wave}`);
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    this.players.set(conn.id, { pos: { x: 0, y: 0, z: 0 }, hp: 100 });
    conn.send(JSON.stringify({ type: 'init', id: conn.id, wave: this.wave }));

    if (this.zombies.size > 0) {
        conn.send(JSON.stringify({ type: 'zombieSync', zombies: Array.from(this.zombies.values()) }));
    }

    if (!this.waveActive && this.players.size > 0) {
        this.startNextWave();
    }

    if (!this.tickInterval) {
        this.tickInterval = setInterval(() => this.tick(), 50); // 20fps
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
    const dist = 30 + Math.random() * 10;
    const zombie: Zombie = {
        id,
        pos: { x: Math.cos(angle) * dist, y: 0, z: Math.sin(angle) * dist },
        hp: 50 + (this.wave * 10)
    };
    this.zombies.set(id, zombie);
    this.party.broadcast(JSON.stringify({ type: 'zombieSpawn', zombie }));
  }

  tick() {
    if (this.zombies.size === 0) return;

    const zombieUpdates: any[] = [];
    const zombieSpeed = 0.05 + (this.wave * 0.005);

    this.zombies.forEach((z) => {
        let nearestPlayer: any = null;
        let minDist = Infinity;

        this.players.forEach((p, id) => {
            const dx = p.pos.x - z.pos.x;
            const dz = p.pos.z - z.pos.z;
            const d = Math.sqrt(dx*dx + dz*dz);
            if (d < minDist) {
                minDist = d;
                nearestPlayer = { id, dx, dz, d };
            }
        });

        if (nearestPlayer && nearestPlayer.d < 50) {
            z.pos.x += (nearestPlayer.dx / nearestPlayer.d) * zombieSpeed;
            z.pos.z += (nearestPlayer.dz / nearestPlayer.d) * zombieSpeed;

            if (nearestPlayer.d < 1.5 && Math.random() < 0.05) {
                this.party.getConnection(nearestPlayer.id)?.send(JSON.stringify({ type: 'damagePlayer', amount: 2 }));
            }
        }

        zombieUpdates.push({ id: z.id, pos: z.pos });
    });

    this.party.broadcast(JSON.stringify({ type: 'zombieUpdate', zombies: zombieUpdates }));
  }

  onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);

    if (data.type === 'move') {
      const player = this.players.get(sender.id);
      if (player) {
        player.pos = data.pos;
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
                    setTimeout(() => { if (!this.waveActive && this.players.size > 0) this.startNextWave(); }, 5000);
                }
            }
        }
    }
  }

  onClose(conn: Party.Connection) {
    this.players.delete(conn.id);
    if (this.players.size === 0 && this.tickInterval) {
        clearInterval(this.tickInterval);
        this.tickInterval = null;
    }
    this.party.broadcast(JSON.stringify({ type: 'playerLeft', id: conn.id }));
  }
}
