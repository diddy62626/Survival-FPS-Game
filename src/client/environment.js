import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class EnvironmentManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.objects = [];
        this.performanceMode = false;
        this.lights = [];
    }

    setPerformanceMode(enabled) {
        this.performanceMode = enabled;
    }

    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    generateCity(seedStr) {
        console.log("Generating city with guaranteed interiors...");
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

        const gridSize = this.performanceMode ? 6 : 10;
        const spacing = 60; // Increased spacing for bigger buildings

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let z = -gridSize; z <= gridSize; z++) {
                // Clear spawn area (25m radius)
                const distFromOrigin = Math.sqrt(x*x + z*z) * spacing;
                if (distFromOrigin < 25) continue;

                const r = this.seededRandom(seed + x * 133 + z * 77);
                if (r < 0.45) {
                    const buildingType = Math.floor(this.seededRandom(seed + x + z) * 30);
                    this.createLargeBuildingWithInterior(x * spacing, z * spacing, buildingType, r);
                }
                else if (r < 0.7 && !this.performanceMode) {
                    this.createFoliage(x * spacing + (r - 0.5) * 20, z * spacing + (this.seededRandom(r) - 0.5) * 20, r);
                }
            }
        }
    }

    createLargeBuildingWithInterior(x, z, type, r) {
        const group = new THREE.Group();
        const wallThickness = 0.8;

        const colors = [0x7d7d7d, 0x8a5a44, 0x4a5d4a, 0x5a6a8a, 0xa83232, 0x32a852, 0x3262a8, 0xa8a832, 0x6b4226, 0xffffff];
        const color = colors[type % colors.length];
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

        const addWall = (posX, posY, posZ, dimX, dimY, dimZ, physics = true) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY, dimZ), mat);
            mesh.position.set(posX, posY, posZ);
            if (!this.performanceMode) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
            group.add(mesh);

            if (physics) {
                const body = new CANNON.Body({
                    type: CANNON.Body.STATIC,
                    shape: new CANNON.Box(new CANNON.Vec3(dimX/2, dimY/2, dimZ/2)),
                    position: new CANNON.Vec3(x + posX, posY, z + posZ)
                });
                this.world.addBody(body);
                this.objects.push({ body });
            }
        };

        // Bigger buildings for easier interior access
        let w = 25 + (type % 5) * 5;
        let d = 25 + (type % 3) * 5;
        let h = 15 + (type % 4) * 8;

        // Interior Construction
        // Floor
        addWall(0, 0.2, 0, w, 0.4, d);
        // Roof
        addWall(0, h, 0, w, 0.4, d);

        // Exterior Walls
        addWall(-w/2, h/2, 0, wallThickness, h, d); // Left
        addWall(w/2, h/2, 0, wallThickness, h, d);  // Right
        addWall(0, h/2, -d/2, w, h, wallThickness); // Back

        // Front Wall with VERY LARGE Entrance
        const doorWidth = 8;
        const doorHeight = 10;
        addWall(-(w/4 + doorWidth/4), h/2, d/2, w/2 - doorWidth/2, h, wallThickness); // Left of door
        addWall(w/4 + doorWidth/4, h/2, d/2, w/2 - doorWidth/2, h, wallThickness);  // Right of door
        addWall(0, (h + doorHeight)/2, d/2, doorWidth, h - doorHeight, wallThickness); // Above door

        // Interior Details (Pillars for cover)
        if (!this.performanceMode) {
            // Pillars
            addWall(-w/4, h/2, -d/4, 2, h, 2);
            addWall(w/4, h/2, -d/4, 2, h, 2);

            // Interior light to prove it's an interior
            const light = new THREE.PointLight(0xffccaa, 20, 30);
            light.position.set(0, h/2, 0);
            group.add(light);
            this.lights.push(light);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push({ mesh: group });
    }

    createFoliage(x, z, r) {
        if (this.performanceMode) return;
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 6), trunkMat);
        trunk.position.set(x, 3, z);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), leafMat);
        leaves.position.set(x, 9, z);
        this.scene.add(trunk, leaves);
        this.objects.push({ mesh: trunk }, { mesh: leaves });
    }
}
