import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const CHUNK_SIZE = 128;
const VIEW_DISTANCE = 4; // Chunks around the player

export class EnvironmentManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.chunks = new Map(); // gridX,gridZ -> chunk data
        this.performanceMode = false;

        this.mats = {
            forest: new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 1 }),
            swamp: new THREE.MeshStandardMaterial({ color: 0x3d3d2b, roughness: 1 }),
            desert: new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 1 }),
            city: new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 }),
            tundra: new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 1 }),
            volcanic: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }),
            road: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }),
            glass: new THREE.MeshStandardMaterial({ color: 0x66ccff, transparent: true, opacity: 0.4 })
        };

        this.seed = 0;
    }

    setPerformanceMode(enabled) {
        this.performanceMode = enabled;
    }

    setSeed(seedStr) {
        let s = 0;
        for(let i=0; i<seedStr.length; i++) s += seedStr.charCodeAt(i);
        this.seed = s;
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    getBiome(x, z) {
        // Use very low frequency noise for biomes
        const b = (Math.sin(x * 0.0005 + this.seed) + Math.cos(z * 0.0005 + this.seed)) * 0.5 + 0.5;
        if (b < 0.2) return 'desert';
        if (b < 0.4) return 'swamp';
        if (b < 0.7) return 'forest';
        if (b < 0.85) return 'tundra';
        return 'volcanic';
    }

    getTerrainHeight(x, z) {
        const biome = this.getBiome(x, z);
        let h = 0;
        const s = this.seed;

        // Base noise
        h += (Math.sin(x * 0.01 + s) * Math.cos(z * 0.01 + s) * 5);

        if (biome === 'forest') h += (Math.sin(x * 0.03) * 3 + Math.cos(z * 0.03) * 3);
        if (biome === 'desert') h += (Math.sin(x * 0.02) * 8); // Dunes
        if (biome === 'tundra') h += (Math.sin(x * 0.01) * 12 + Math.cos(z * 0.01) * 12); // Hills
        if (biome === 'volcanic') h += (Math.sin(x * 0.05) * 15 + Math.cos(z * 0.05) * 15); // Jagged
        if (biome === 'swamp') h *= 0.2; // Flat

        // Add a "City" modifier - flatten areas near potential city centers
        const cityFactor = (Math.sin(x * 0.002) + Math.cos(z * 0.002)) * 0.5 + 0.5;
        if (cityFactor > 0.85) h *= 0.1; // Flatten for city

        return h;
    }

    updateChunks(playerPos) {
        const px = Math.floor(playerPos.x / CHUNK_SIZE);
        const pz = Math.floor(playerPos.z / CHUNK_SIZE);

        // Remove distant chunks
        for (const [key, chunk] of this.chunks) {
            const [cx, cz] = key.split(',').map(Number);
            if (Math.abs(cx - px) > VIEW_DISTANCE || Math.abs(cz - pz) > VIEW_DISTANCE) {
                this.unloadChunk(key);
            }
        }

        // Load new chunks
        for (let x = px - VIEW_DISTANCE; x <= px + VIEW_DISTANCE; x++) {
            for (let z = pz - VIEW_DISTANCE; z <= pz + VIEW_DISTANCE; z++) {
                const key = `${x},${z}`;
                if (!this.chunks.has(key)) {
                    this.loadChunk(x, z);
                }
            }
        }
    }

    loadChunk(cx, cz) {
        const chunk = {
            meshes: [],
            bodies: [],
            lights: []
        };

        const size = CHUNK_SIZE;
        const res = this.performanceMode ? 16 : 32;
        const geo = new THREE.PlaneGeometry(size, size, res, res);
        const pos = geo.attributes.position;
        const worldX = cx * size;
        const worldZ = cz * size;

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i) + worldX;
            const y = pos.getY(i) + worldZ;
            pos.setZ(i, this.getTerrainHeight(x, y));
        }
        geo.computeVertexNormals();

        const biome = this.getBiome(worldX + size/2, worldZ + size/2);
        const mesh = new THREE.Mesh(geo, this.mats[biome] || this.mats.forest);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(worldX + size/2, 0, worldZ + size/2);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        chunk.meshes.push(mesh);

        // Physics Heightfield for the chunk
        const physRes = 16;
        const matrix = [];
        for (let i = 0; i <= physRes; i++) {
            matrix.push([]);
            for (let j = 0; j <= physRes; j++) {
                const lx = (i / physRes - 0.5) * size + (worldX + size/2);
                const lz = (j / physRes - 0.5) * size + (worldZ + size/2);
                matrix[i].push(this.getTerrainHeight(lx, lz));
            }
        }
        const hfShape = new CANNON.Heightfield(matrix, { elementSize: size / physRes });
        const hfBody = new CANNON.Body({ mass: 0 });
        hfBody.addShape(hfShape);
        hfBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        hfBody.position.set(worldX, 0, worldZ + size);
        this.world.addBody(hfBody);
        chunk.bodies.push(hfBody);

        // Generate Objects in Chunk
        this.generateChunkObjects(cx, cz, chunk);

        this.chunks.set(`${cx},${cz}`, chunk);
    }

    unloadChunk(key) {
        const chunk = this.chunks.get(key);
        if (chunk) {
            chunk.meshes.forEach(m => this.scene.remove(m));
            chunk.bodies.forEach(b => this.world.removeBody(b));
            chunk.lights.forEach(l => this.scene.remove(l));
            this.chunks.delete(key);
        }
    }

    generateChunkObjects(cx, cz, chunk) {
        const worldX = cx * CHUNK_SIZE;
        const worldZ = cz * CHUNK_SIZE;
        const seed = this.seed + cx * 31 + cz * 17;

        // City Logic
        const cityFactor = (Math.sin((worldX + CHUNK_SIZE/2) * 0.002) + Math.cos((worldZ + CHUNK_SIZE/2) * 0.002)) * 0.5 + 0.5;
        const isCity = cityFactor > 0.85;

        if (isCity) {
            this.generateCityBlock(worldX, worldZ, seed, chunk);
        } else {
            this.generateWilderness(worldX, worldZ, seed, chunk);
        }
    }

    generateCityBlock(wx, wz, seed, chunk) {
        const spacing = 40;
        for (let x = 10; x < CHUNK_SIZE - 10; x += spacing) {
            for (let z = 10; z < CHUNK_SIZE - 10; z += spacing) {
                const rx = wx + x;
                const rz = wz + z;
                const r = this.seededRandom(seed + x * 7 + z * 3);
                if (r < 0.7) {
                    const type = Math.floor(r * 1000);
                    this.createBuilding(rx, rz, type, chunk);
                }
            }
        }
    }

    generateWilderness(wx, wz, seed, chunk) {
        const biome = this.getBiome(wx + CHUNK_SIZE/2, wz + CHUNK_SIZE/2);
        for (let i = 0; i < 10; i++) {
            const r = this.seededRandom(seed + i);
            const rx = wx + this.seededRandom(r) * CHUNK_SIZE;
            const rz = wz + this.seededRandom(r + 1) * CHUNK_SIZE;
            const h = this.getTerrainHeight(rx, rz);

            if (r < 0.4) {
                this.createNatureProp(rx, h, rz, biome, chunk);
            } else if (r < 0.45) {
                this.createBuilding(rx, rz, Math.floor(r * 1000), chunk, true); // Isolated shack
            }
        }
    }

    createBuilding(bx, bz, type, chunk, isShack = false) {
        const by = this.getTerrainHeight(bx, bz);
        const group = new THREE.Group();
        const mat = isShack ? this.mats.wood : this.mats.concrete;

        let w = isShack ? 10 : 20 + (type % 5) * 4;
        let d = isShack ? 10 : 20 + (type % 3) * 4;
        let h = isShack ? 8 : 15 + (type % 10) * 6;
        let floors = isShack ? 1 : 1 + (type % 6);

        // Simplified walls for chunking performance
        this.addWallToChunk(bx, by, bz, group, mat, 0, h/2, 0, w, h, d, chunk);

        group.position.set(bx, by, bz);
        this.scene.add(group);
        chunk.meshes.push(group);
    }

    createNatureProp(x, y, z, biome, chunk) {
        if (biome === 'desert') {
            // Cactus
            const geo = new THREE.CylinderGeometry(0.5, 0.5, 3);
            const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color: 0x2d5a27}));
            mesh.position.set(x, y + 1.5, z);
            this.scene.add(mesh);
            chunk.meshes.push(mesh);
        } else if (biome === 'forest') {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 5), new THREE.MeshStandardMaterial({color: 0x5c4033}));
            trunk.position.set(x, y + 2.5, z);
            const leaves = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshStandardMaterial({color: 0x2e8b57}));
            leaves.position.set(x, y + 6, z);
            this.scene.add(trunk, leaves);
            chunk.meshes.push(trunk, leaves);
        }
    }

    addWallToChunk(bx, by, bz, group, mat, px, py, pz, dx, dy, dz, chunk) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(dx, dy, dz), mat);
        mesh.position.set(px, py, pz);
        group.add(mesh);

        const body = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(dx/2, dy/2, dz/2)),
            position: new CANNON.Vec3(bx + px, by + py, bz + pz)
        });
        this.world.addBody(body);
        chunk.bodies.push(body);
    }
}
