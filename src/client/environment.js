import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class EnvironmentManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.objects = [];
        this.lights = [];
        this.performanceMode = false;
    }

    setPerformanceMode(enabled) {
        this.performanceMode = enabled;
    }

    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    generateCity(seedStr) {
        console.log("Generating city with guaranteed interiors. Mode:", this.performanceMode);
        this.objects.forEach(obj => {
            if (obj.mesh) this.scene.remove(obj.mesh);
            if (obj.body) this.world.removeBody(obj.body);
        });
        this.lights.forEach(l => this.scene.remove(l));
        this.objects = [];
        this.lights = [];

        let seed = 0;
        for(let i=0; i<seedStr.length; i++) seed += seedStr.charCodeAt(i);

        const gridSize = this.performanceMode ? 6 : 10;
        const spacing = 50;

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let z = -gridSize; z <= gridSize; z++) {
                // Clear spawn zone
                if (Math.abs(x * spacing) < 30 && Math.abs(z * spacing) < 30) continue;

                const r = this.seededRandom(seed + x * 133 + z * 77);
                if (r < 0.45) {
                    const type = Math.floor(this.seededRandom(seed + x + z) * 30);
                    this.createBuildingWithInterior(x * spacing, z * spacing, type);
                }
                else if (r < 0.7 && !this.performanceMode) {
                    this.createFoliage(x * spacing + (r - 0.5) * 15, z * spacing + (this.seededRandom(r) - 0.5) * 15, r);
                }
            }
        }
    }

    createBuildingWithInterior(bx, bz, type) {
        const group = new THREE.Group();
        const wt = 0.8; // wall thickness

        const colors = [0x7d7d7d, 0x8a5a44, 0x4a5d4a, 0x5a6a8a, 0xa83232, 0x32a852, 0x3262a8, 0xa8a832, 0x6b4226, 0xffffff];
        const color = colors[type % colors.length];
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

        const addWall = (px, py, pz, dx, dy, dz, physics = true) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(dx, dy, dz), mat);
            mesh.position.set(px, py, pz);
            if (!this.performanceMode) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
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
        };

        const w = 24 + (type % 4) * 6;
        const d = 24 + (type % 3) * 6;
        const h = 18 + (type % 5) * 8;

        // ACCURATE INTERIOR CONSTRUCTION
        addWall(0, 0.2, 0, w, 0.4, d); // Floor
        addWall(0, h, 0, w, 0.4, d);   // Roof
        addWall(-w/2, h/2, 0, wt, h, d); // Left
        addWall(w/2, h/2, 0, wt, h, d);  // Right
        addWall(0, h/2, -d/2, w, h, wt); // Back

        // Front Entrance
        const ew = 8; const eh = 12;
        addWall(-(w/4 + ew/4), h/2, d/2, w/2 - ew/2, h, wt);
        addWall(w/4 + ew/4, h/2, d/2, w/2 - ew/2, h, wt);
        addWall(0, (h + eh)/2, d/2, ew, h - eh, wt);

        // Interior Rooms / Details
        if (!this.performanceMode) {
            // Room divider
            addWall(-w/6, h/2, 0, wt, h, d * 0.7);
            addWall(w/6, h/2, 0, wt, h, d * 0.7);

            // Interior light
            const light = new THREE.PointLight(0xffccaa, 25, 40);
            light.position.set(0, h/2, 0);
            group.add(light);
            this.lights.push(light);
        }

        group.position.set(bx, 0, bz);
        this.scene.add(group);
        this.objects.push({ mesh: group });
    }

    createFoliage(x, z, r) {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 6), trunkMat);
        trunk.position.set(x, 3, z);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), leafMat);
        leaves.position.set(x, 9, z);
        this.scene.add(trunk, leaves);
        this.objects.push({ mesh: trunk }, { mesh: leaves });
    }
}
