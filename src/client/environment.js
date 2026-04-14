import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class EnvironmentManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.objects = [];
    }

    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    generateCity(seedStr) {
        console.log("Generating city for seed:", seedStr);
        // Clear existing
        this.objects.forEach(obj => {
            if (obj.mesh) this.scene.remove(obj.mesh);
            if (obj.body) this.world.removeBody(obj.body);
        });
        this.objects = [];

        let seed = 0;
        for(let i=0; i<seedStr.length; i++) seed += seedStr.charCodeAt(i);

        const gridSize = 10;
        const spacing = 35; // Slightly closer for easier navigation

        // Add a few markers around 0,0 to confirm it's working
        for(let i=0; i<4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const x = Math.cos(angle) * 15;
            const z = Math.sin(angle) * 15;
            const marker = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: 0x00ff00}));
            marker.position.set(x, 0.5, z);
            this.scene.add(marker);
            this.objects.push({mesh: marker});
        }

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let z = -gridSize; z <= gridSize; z++) {
                // Keep the spawn area clear (within 20 units)
                if (Math.abs(x * spacing) < 20 && Math.abs(z * spacing) < 20) continue;

                const r = this.seededRandom(seed + x * 133 + z * 77);
                if (r < 0.35) {
                    const buildingType = Math.floor(this.seededRandom(seed + x + z) * 30);
                    this.createDiverseBuilding(x * spacing, z * spacing, buildingType, r, seed);
                }
                else if (r < 0.6) {
                    this.createFoliage(x * spacing + (r - 0.5) * 15, z * spacing + (this.seededRandom(r) - 0.5) * 15, r);
                }
            }
        }
        console.log("City generation complete. Total objects:", this.objects.length);
    }

    createDiverseBuilding(x, z, type, r, seed) {
        const group = new THREE.Group();
        const wallThickness = 0.6;
        const colors = [0x333333, 0x444444, 0x222222, 0x2a2a2a, 0x3d3d3d, 0x1a1a1a, 0x4a4138, 0x383e4a];
        const color = colors[type % colors.length];
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

        const addWall = (posX, posY, posZ, dimX, dimY, dimZ) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY, dimZ), mat);
            mesh.position.set(posX, posY, posZ);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);

            const body = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Box(new CANNON.Vec3(dimX/2, dimY/2, dimZ/2)),
                position: new CANNON.Vec3(x + posX, posY, z + posZ)
            });
            this.world.addBody(body);
            this.objects.push({ body });
        };

        const archetype = type % 5;
        let w = 15 + (type % 5) * 2;
        let d = 15 + (type % 3) * 3;
        let h = 10 + (type % 10) * 4;

        if (archetype === 0) this.buildBox(addWall, 0, 0, w, h, d, wallThickness, group);
        else if (archetype === 1) { w = 10; d = 10; h = 30; this.buildBox(addWall, 0, 0, w, h, d, wallThickness, group); }
        else if (archetype === 2) { this.buildBox(addWall, 0, 0, w, h, d/2, wallThickness, group); this.buildBox(addWall, w/4, 0, w/2, h, d, wallThickness, group); }
        else if (archetype === 3) { h = 8; w = 25; this.buildBox(addWall, 0, 0, w, h, d, wallThickness, group); }
        else if (archetype === 4) { this.buildBox(addWall, 0, 0, w, h/2, d, wallThickness, group); this.buildBox(addWall, 0, h/2, w/2, h/2, d/2, wallThickness, group); }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push({ mesh: group });
    }

    buildBox(addWall, ox, oz, w, h, d, wt, group) {
        addWall(ox, 0.1, oz, w, 0.2, d); // Floor
        addWall(ox, h, oz, w, 0.2, d);   // Roof
        addWall(ox - w/2, h/2, oz, wt, h, d); // Left
        addWall(ox + w/2, h/2, oz, wt, h, d); // Right
        addWall(ox, h/2, oz - d/2, w, h, wt); // Back

        // Front wall with door
        const dw = 3; const dh = 5;
        addWall(ox - (w/4 + dw/4), h/2, oz + d/2, w/2 - dw/2, h, wt);
        addWall(ox + (w/4 + dw/4), h/2, oz + d/2, w/2 - dw/2, h, wt);
        addWall(ox, (h + dh)/2, oz + d/2, dw, h - dh, wt);
    }

    createFoliage(x, z, r) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x1a331a });
        if (r < 0.45) {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 4), new THREE.MeshStandardMaterial({ color: 0x221100 }));
            trunk.position.set(x, 2, z);
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(3, 8, 8), mat);
            leaves.position.set(x, 6, z);
            this.scene.add(trunk, leaves);
            this.objects.push({ mesh: trunk }, { mesh: leaves });
        } else {
            const grass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 1.2), mat);
            grass.position.set(x, 1, z);
            this.scene.add(grass);
            this.objects.push({ mesh: grass });
        }
    }
}
