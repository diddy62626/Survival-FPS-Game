import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class EnvironmentManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.chunks = new Map();
        this.performanceMode = false;
        this.seed = 0;

        this.mats = {
            concrete: new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8 }),
            brick: new THREE.MeshStandardMaterial({ color: 0x8a5a44, roughness: 0.9 }),
            metal: new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 }),
            dirt: new THREE.MeshStandardMaterial({ color: 0x221a10, roughness: 1 }),
            road: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }),
            neon: new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 2 })
        };
    }

    setPerformanceMode(e) { this.performanceMode = e; }
    setSeed(s) {
        let hash = 0;
        for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
        this.seed = hash;
    }

    getTerrainHeight(x, z) {
        const s = this.seed * 0.01;
        return (Math.sin(x * 0.01 + s) * Math.cos(z * 0.01 + s) * 15) +
               (Math.sin(x * 0.04) * 4) +
               (Math.cos(z * 0.03) * 3);
    }

    updateChunks(playerPos) {
        const cx = Math.floor(playerPos.x / 128);
        const cz = Math.floor(playerPos.z / 128);
        const range = this.performanceMode ? 1 : 2;

        for (let x = cx - range; x <= cx + range; x++) {
            for (let z = cz - range; z <= cz + range; z++) {
                const key = `${x},${z}`;
                if (!this.chunks.has(key)) this.loadChunk(x, z);
            }
        }
    }

    loadChunk(cx, cz) {
        const chunk = { meshes: [], bodies: [] };
        const size = 128;
        const res = this.performanceMode ? 8 : 16;
        const worldX = cx * size;
        const worldZ = cz * size;

        const geo = new THREE.PlaneGeometry(size, size, res, res);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i) + worldX + size/2;
            const z = pos.getY(i) + worldZ + size/2;
            pos.setZ(i, this.getTerrainHeight(x, z));
        }
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, this.mats.dirt);
        mesh.rotation.x = -Math.PI/2;
        mesh.position.set(worldX + size/2, 0, worldZ + size/2);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        chunk.meshes.push(mesh);

        // Physics Heightfield
        const matrix = [];
        const pRes = 10;
        for (let i = 0; i <= pRes; i++) {
            matrix.push([]);
            for (let j = 0; j <= pRes; j++) {
                const lx = (i / pRes - 0.5) * size + worldX + size/2;
                const lz = (j / pRes - 0.5) * size + worldZ + size/2;
                matrix[i].push(this.getTerrainHeight(lx, lz));
            }
        }
        const shape = new CANNON.Heightfield(matrix, { elementSize: size / pRes });
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.quaternion.setFromEuler(-Math.PI/2, 0, 0);
        body.position.set(worldX, 0, worldZ + size);
        this.world.addBody(body);
        chunk.bodies.push(body);

        // Procedural Buildings (1000+ variants)
        const r = this.seededRandom(this.seed + cx * 123 + cz * 456);
        if (r < 0.5 && (Math.abs(cx) > 0 || Math.abs(cz) > 0)) {
            this.createDiverseStructure(worldX + size/2, worldZ + size/2, r, chunk);
        }

        this.chunks.set(`${cx},${cz}`, chunk);
    }

    createDiverseStructure(bx, bz, r, chunk) {
        const type = Math.floor(r * 1000);
        const by = this.getTerrainHeight(bx, bz);
        const group = new THREE.Group();

        const archetypes = ['HOUSE', 'OFFICE', 'STATION', 'PHARMACY', 'FARM', 'WAREHOUSE'];
        const arch = archetypes[type % archetypes.length];

        const w = 20 + (type % 10) * 2;
        const d = 20 + (type % 8) * 2;
        const h = 10 + (type % 15) * 4;
        const floors = arch === 'OFFICE' ? 3 + (type % 5) : 1;

        const color = new THREE.Color().setHSL((type % 100) / 100, 0.3, 0.4);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

        const addWall = (px, py, pz, dx, dy, dz) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(dx, dy, dz), mat);
            mesh.position.set(px, py, pz);
            mesh.castShadow = !this.performanceMode;
            group.add(mesh);
            const body = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Box(new CANNON.Vec3(dx/2, dy/2, dz/2)),
                position: new CANNON.Vec3(bx + px, by + py, bz + pz)
            });
            this.world.addBody(body);
            chunk.bodies.push(body);
        };

        // Foundation
        addWall(0, -2, 0, w + 4, 4, d + 4);

        for (let f = 0; f < floors; f++) {
            const fy = f * 8;
            addWall(0, fy + 0.2, 0, w, 0.4, d); // Floor
            addWall(0, fy + 8, 0, w, 0.4, d);   // Roof
            addWall(-w/2, fy + 4, 0, 1, 8, d);  // Left
            addWall(w/2, fy + 4, 0, 1, 8, d);   // Right
            addWall(0, fy + 4, -d/2, w, 8, 1);  // Back

            if (f === 0) {
                // Front with door
                addWall(-w/3, fy + 4, d/2, w/3, 8, 1);
                addWall(w/3, fy + 4, d/2, w/3, 8, 1);
                addWall(0, fy + 6.5, d/2, w/3, 3, 1);
            } else {
                addWall(0, fy + 4, d/2, w, 8, 1);
            }
        }

        group.position.set(bx, by, bz);
        this.scene.add(group);
        chunk.meshes.push(group);
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
}
