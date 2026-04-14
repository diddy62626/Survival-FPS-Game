import * as THREE from 'three';

export class EnvironmentManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.buildings = [];
        this.foliage = [];
    }

    // Simple pseudo-random generator based on a seed
    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    generateCity(seedStr) {
        // Clear existing
        this.buildings.forEach(b => this.scene.remove(b));
        this.buildings = [];

        // Convert string seed to number
        let seed = 0;
        for(let i=0; i<seedStr.length; i++) seed += seedStr.charCodeAt(i);

        const gridSize = 10;
        const spacing = 20;

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let z = -gridSize; z <= gridSize; z++) {
                const r = this.seededRandom(seed + x * 100 + z);

                // 30% chance for a building
                if (r < 0.3) {
                    this.createBuilding(x * spacing, z * spacing, r, seed);
                }
                // 40% chance for trees/grass
                else if (r < 0.7) {
                    this.createFoliage(x * spacing + (r - 0.5) * 10, z * spacing + (this.seededRandom(r) - 0.5) * 10, r);
                }
            }
        }
    }

    createBuilding(x, z, r, seed) {
        const h = 5 + r * 15;
        const w = 6 + this.seededRandom(r) * 4;
        const d = 6 + this.seededRandom(h) * 4;

        const group = new THREE.Group();

        // Main structure
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        // Add windows (Simple boxes for detail)
        const windowMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x112233 });
        for (let fy = 1; fy < h - 1; fy += 2) {
            for (let fx = -w/2 + 1; fx < w/2 - 1; fx += 1.5) {
                const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.1), windowMat);
                win.position.set(fx, fy, d/2 + 0.05);
                group.add(win);
                const win2 = win.clone();
                win2.position.z = -d/2 - 0.05;
                group.add(win2);
            }
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.buildings.push(group);
    }

    createFoliage(x, z, r) {
        if (r < 0.5) {
            // Tree
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2), new THREE.MeshStandardMaterial({ color: 0x442211 }));
            trunk.position.set(x, 1, z);
            const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshStandardMaterial({ color: 0x113311 }));
            leaves.position.set(x, 2.5, z);
            this.scene.add(trunk, leaves);
            this.buildings.push(trunk, leaves);
        } else {
            // Grass clump
            const grass = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x225522, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
            grass.rotation.y = r * Math.PI;
            grass.position.set(x, 0.5, z);
            this.scene.add(grass);
            this.buildings.push(grass);
        }
    }
}
