import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class EnvironmentManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.objects = [];
        this.lights = [];
        this.performanceMode = false;

        // Materials
        this.roadMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        this.dirtMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 1 });
        this.houseMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8 });
    }

    setPerformanceMode(enabled) {
        this.performanceMode = enabled;
    }

    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    generateCity(seedStr) {
        console.log("Generating 10x Detail City with Terrain...");
        // Cleanup
        this.objects.forEach(obj => {
            if (obj.mesh) this.scene.remove(obj.mesh);
            if (obj.body) this.world.removeBody(obj.body);
        });
        this.lights.forEach(l => this.scene.remove(l));
        this.objects = [];
        this.lights = [];

        let seed = 0;
        for(let i=0; i<seedStr.length; i++) seed += seedStr.charCodeAt(i);

        // 1. GENERATE TERRAIN
        this.createTerrain(seed);

        // 2. GENERATE ROADS
        this.createRoads(seed);

        // 3. GENERATE BUILDINGS & PROPS
        const gridSize = this.performanceMode ? 6 : 12;
        const spacing = 60;

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let z = -gridSize; z <= gridSize; z++) {
                if (Math.abs(x * spacing) < 30 && Math.abs(z * spacing) < 30) continue;

                const r = this.seededRandom(seed + x * 133 + z * 77);
                const wx = x * spacing + (this.seededRandom(r) - 0.5) * 20;
                const wz = z * spacing + (this.seededRandom(r+1) - 0.5) * 20;
                const terrainHeight = this.getTerrainHeight(wx, wz);

                if (r < 0.4) {
                    const type = Math.floor(this.seededRandom(seed + x + z) * 30);
                    this.createDiverseInteriorBuilding(wx, terrainHeight, wz, type, r);
                }
                else if (r < 0.6 && !this.performanceMode) {
                    this.createProp(wx, terrainHeight, wz, r);
                }
            }
        }
    }

    createTerrain(seed) {
        const size = 2000;
        const res = this.performanceMode ? 20 : 60;
        const geo = new THREE.PlaneGeometry(size, size, res, res);
        const pos = geo.attributes.position;

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const h = this.getTerrainHeight(x, y);
            pos.setZ(i, h);
        }
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, this.dirtMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.objects.push({ mesh });

        // Physics Heightfield (Simplified for performance)
        const matrix = [];
        const physRes = 32;
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
        hfBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        hfBody.position.set(-size / 2, 0, size / 2);
        this.world.addBody(hfBody);
        this.objects.push({ body: hfBody });
    }

    getTerrainHeight(x, z) {
        // Multi-layered noise for 10x detail
        const h = (Math.sin(x * 0.01) * Math.cos(z * 0.01) * 10) +
                  (Math.sin(x * 0.05) * 2) +
                  (Math.cos(z * 0.05) * 2);
        return h;
    }

    createRoads(seed) {
        // Add a central crossroad
        this.addRoad(0, 0, 1000, 20, 0); // North-South
        this.addRoad(0, 0, 1000, 20, Math.PI / 2); // East-West
    }

    addRoad(x, z, length, width, rot) {
        const geo = new THREE.PlaneGeometry(width, length);
        const mesh = new THREE.Mesh(geo, this.roadMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = rot;
        mesh.position.set(x, 0.1, z); // Slightly above terrain
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.objects.push({ mesh });
    }

    createDiverseInteriorBuilding(bx, by, bz, type, r) {
        const group = new THREE.Group();
        const wt = 0.8;
        const color = [0x7d7d7d, 0x8a5a44, 0x4a5d4a, 0x5a6a8a, 0xa83232, 0x32a852, 0x3262a8, 0xa8a832][type % 8];
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

        const addWall = (px, py, pz, dx, dy, dz, physics = true) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(dx, dy, dz), mat);
            mesh.position.set(px, py, pz);
            if (!this.performanceMode) { mesh.castShadow = true; mesh.receiveShadow = true; }
            group.add(mesh);
            if (physics) {
                const body = new CANNON.Body({
                    type: CANNON.Body.STATIC,
                    shape: new CANNON.Box(new CANNON.Vec3(dx/2, dy/2, dz/2)),
                    position: new CANNON.Vec3(bx + px, by + py, bz + pz)
                });
                this.world.addBody(body);
                this.objects.push({ body });
            }
        };

        const w = 20 + (type % 5) * 4;
        const d = 20 + (type % 3) * 4;
        const h = 15 + (type % 6) * 5;

        // Base/Foundation to handle terrain slope
        addWall(0, -2, 0, w + 2, 4, d + 2);

        // Building Box
        addWall(0, 0.2, 0, w, 0.4, d); // Floor
        addWall(0, h, 0, w, 0.4, d);   // Roof
        addWall(-w/2, h/2, 0, wt, h, d); // Left
        addWall(w/2, h/2, 0, wt, h, d);  // Right
        addWall(0, h/2, -d/2, w, h, wt); // Back

        // Entrance
        const ew = 6; const eh = 8;
        addWall(-(w/4 + ew/4), h/2, d/2, w/2 - ew/2, h, wt);
        addWall(w/4 + ew/4, h/2, d/2, w/2 - ew/2, h, wt);
        addWall(0, (h + eh)/2, d/2, ew, h - eh, wt);

        // Abandoned Look (Cracks/Holes)
        if (r > 0.3 && !this.performanceMode) {
            const hole = new THREE.Mesh(new THREE.BoxGeometry(4, 4, wt + 0.1), new THREE.MeshBasicMaterial({ color: 0x000000 }));
            hole.position.set(0, h - 5, -d/2);
            group.add(hole);
        }

        group.position.set(bx, by, bz);
        this.scene.add(group);
        this.objects.push({ mesh: group });
    }

    createProp(x, y, z, r) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        if (r < 0.1) {
            // Broken Barrel
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3, 8), mat);
            barrel.position.set(x, y + 1.5, z);
            barrel.rotation.z = Math.PI / 2;
            this.scene.add(barrel);
            this.objects.push({ mesh: barrel });
        } else if (r < 0.2) {
            // Tree
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x3d2b1f }));
            trunk.position.set(x, y + 4, z);
            const leaves = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshStandardMaterial({ color: 0x1a2e1a }));
            leaves.position.set(x, y + 10, z);
            this.scene.add(trunk, leaves);
            this.objects.push({ mesh: trunk }, { mesh: leaves });
        }
    }
}
