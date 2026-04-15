import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class EnvironmentManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.objects = [];
        this.lights = [];
        this.performanceMode = false;

        // Materials for different types
        this.mats = {
            concrete: new THREE.MeshStandardMaterial({ color: 0x7d7d7d, roughness: 0.8 }),
            brick: new THREE.MeshStandardMaterial({ color: 0x8a5a44, roughness: 0.9 }),
            wood: new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 }),
            metal: new THREE.MeshStandardMaterial({ color: 0x4a5d5a, roughness: 0.3, metalness: 0.5 }),
            glass: new THREE.MeshStandardMaterial({ color: 0x66ccff, transparent: true, opacity: 0.3 }),
            dirt: new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 1 }),
            road: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }),
            grass: new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 1 })
        };
    }

    setPerformanceMode(enabled) {
        this.performanceMode = enabled;
    }

    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    getTerrainHeight(x, z) {
        // Multi-layered noise for 10x detail
        const h = (Math.sin(x * 0.01) * Math.cos(z * 0.01) * 10) +
                  (Math.sin(x * 0.05) * 2) +
                  (Math.cos(z * 0.05) * 2);
        return h;
    }

    generateCity(seedStr) {
        console.log("Generating Massive Detailed World (1000+ variants)...");
        this.objects.forEach(obj => {
            if (obj.mesh) this.scene.remove(obj.mesh);
            if (obj.body) this.world.removeBody(obj.body);
        });
        this.lights.forEach(l => this.scene.remove(l));
        this.objects = []; this.lights = [];

        let seed = 0;
        for(let i=0; i<seedStr.length; i++) seed += seedStr.charCodeAt(i);

        // 1. Terrain Generation
        this.createTerrain(seed);

        // 2. City Clustering Logic
        const regionSize = 500;
        for (let rx = -2; rx <= 2; rx++) {
            for (let rz = -2; rz <= 2; rz++) {
                const regionSeed = seed + rx * 999 + rz * 123;
                const r = this.seededRandom(regionSeed);
                const centerX = rx * regionSize + (this.seededRandom(r) - 0.5) * 200;
                const centerZ = rz * regionSize + (this.seededRandom(r+1) - 0.5) * 200;

                if (r < 0.3) {
                    this.generateDenseCity(centerX, centerZ, regionSeed);
                } else {
                    this.generateRuralArea(centerX, centerZ, regionSeed);
                }
            }
        }
    }

    createTerrain(seed) {
        const size = 3000;
        const res = this.performanceMode ? 32 : 100;
        const geo = new THREE.PlaneGeometry(size, size, res, res);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i); const y = pos.getY(i);
            pos.setZ(i, this.getTerrainHeight(x, y));
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, this.mats.dirt);
        mesh.rotation.x = -Math.PI/2; mesh.receiveShadow = true;
        this.scene.add(mesh); this.objects.push({ mesh });

        // Physics Heightfield
        const physRes = 64;
        const matrix = [];
        for (let i = 0; i < physRes; i++) {
            matrix.push([]);
            for (let j = 0; j < physRes; j++) {
                const x = (i / physRes - 0.5) * size;
                const y = (j / physRes - 0.5) * size;
                matrix[i].push(this.getTerrainHeight(x, y));
            }
        }
        const hfShape = new CANNON.Heightfield(matrix, { elementSize: size / physRes });
        const hfBody = new CANNON.Body({ mass: 0 });
        hfBody.addShape(hfShape);
        hfBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
        hfBody.position.set(-size/2, 0, size/2);
        this.world.addBody(hfBody); this.objects.push({ body: hfBody });
    }

    generateDenseCity(cx, cz, seed) {
        const cols = 6, rows = 6, spacing = 50;
        for (let x = -cols/2; x < cols/2; x++) {
            for (let z = -rows/2; z < rows/2; z++) {
                const wx = cx + x * spacing;
                const wz = cz + z * spacing;
                const h = this.getTerrainHeight(wx, wz);
                const bSeed = seed + x * 77 + z * 33;
                const type = Math.floor(this.seededRandom(bSeed) * 1000);
                this.createDetailedStructure(wx, h, wz, type, bSeed, true);
            }
        }
    }

    generateRuralArea(cx, cz, seed) {
        for (let i = 0; i < 15; i++) {
            const r = this.seededRandom(seed + i);
            const wx = cx + (this.seededRandom(r) - 0.5) * 400;
            const wz = cz + (this.seededRandom(r+1) - 0.5) * 400;
            const h = this.getTerrainHeight(wx, wz);
            const type = Math.floor(this.seededRandom(r+2) * 1000);
            this.createDetailedStructure(wx, h, wz, type, r, false);
        }
    }

    createDetailedStructure(bx, by, bz, type, bSeed, isCity) {
        const group = new THREE.Group();
        const archetypes = ['HOUSE', 'OFFICE', 'GAS_STATION', 'PHARMACY', 'FARM', 'WAREHOUSE', 'FACTORY', 'CLINIC', 'STORE', 'CHURCH'];
        const arch = archetypes[type % archetypes.length];

        let w = 20 + (type % 10) * 2;
        let d = 20 + (type % 7) * 2;
        let h = 10 + (type % 15) * 4;
        let floors = 1 + (type % 5);
        if (arch === 'OFFICE' && isCity) floors = 4 + (type % 8);

        const color = new THREE.Color().setHSL((type % 100) / 100, 0.3, 0.5);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

        // Add Base Foundation
        this.addWall(bx, by, bz, group, mat, 0, -2, 0, w + 4, 4, d + 4);

        for (let f = 0; f < floors; f++) {
            const fh = 8;
            const fy = f * fh;
            // Floor & Ceiling
            this.addWall(bx, by, bz, group, mat, 0, fy + 0.2, 0, w, 0.4, d);
            // Walls
            this.addWall(bx, by, bz, group, mat, -w/2, fy + fh/2, 0, 0.8, fh, d);
            this.addWall(bx, by, bz, group, mat, w/2, fy + fh/2, 0, 0.8, fh, d);
            this.addWall(bx, by, bz, group, mat, 0, fy + fh/2, -d/2, w, fh, 0.8);

            // Front with variations
            if (f === 0) {
                const ew = 6, eh = 7;
                this.addWall(bx, by, bz, group, mat, -(w/4+ew/4), fy+fh/2, d/2, w/2-ew/2, fh, 0.8);
                this.addWall(bx, by, bz, group, mat, (w/4+ew/4), fy+fh/2, d/2, w/2-ew/2, fh, 0.8);
                this.addWall(bx, by, bz, group, mat, 0, fy+(fh+eh)/2, d/2, ew, fh-eh, 0.8);
            } else {
                this.addWall(bx, by, bz, group, mat, 0, fy+fh/2, d/2, w, fh, 0.8);
            }

            // Windows
            if (!this.performanceMode) {
                for (let wx = -w/2 + 4; wx < w/2 - 2; wx += 6) {
                    const win = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 1), this.mats.glass);
                    win.position.set(wx, fy + 4, d/2);
                    group.add(win);
                }
            }
        }
        // Roof
        this.addWall(bx, by, bz, group, mat, 0, floors * 8, 0, w + 2, 0.6, d + 2);

        group.position.set(bx, by, bz);
        this.scene.add(group);
        this.objects.push({ mesh: group });
    }

    addWall(bx, bz, group, mat, px, py, pz, dx, dy, dz, physics = true) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(dx, dy, dz), mat);
        mesh.position.set(px, py, pz);
        if (!this.performanceMode) { mesh.castShadow = true; mesh.receiveShadow = true; }
        group.add(mesh);
        if (physics) {
            const body = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Box(new CANNON.Vec3(dx/2, dy/2, dz/2)),
                position: new CANNON.Vec3(bx + px, py, bz + pz)
            });
            this.world.addBody(body);
            this.objects.push({ body });
        }
    }
}
