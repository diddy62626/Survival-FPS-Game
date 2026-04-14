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
        console.log("Generating colorful city for seed:", seedStr);
        this.objects.forEach(obj => {
            if (obj.mesh) this.scene.remove(obj.mesh);
            if (obj.body) this.world.removeBody(obj.body);
        });
        this.objects = [];

        let seed = 0;
        for(let i=0; i<seedStr.length; i++) seed += seedStr.charCodeAt(i);

        const gridSize = 12;
        const spacing = 40;

        // Visual markers for spawn
        for(let i=0; i<8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 12;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const marker = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 0.2, 1.5),
                new THREE.MeshStandardMaterial({color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 0.5})
            );
            marker.position.set(x, 0.1, z);
            this.scene.add(marker);
            this.objects.push({mesh: marker});
        }

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let z = -gridSize; z <= gridSize; z++) {
                if (Math.abs(x * spacing) < 25 && Math.abs(z * spacing) < 25) continue;

                const r = this.seededRandom(seed + x * 133 + z * 77);
                if (r < 0.38) {
                    const buildingType = Math.floor(this.seededRandom(seed + x + z) * 30);
                    this.createDiverseBuilding(x * spacing, z * spacing, buildingType, r, seed);
                }
                else if (r < 0.65) {
                    this.createFoliage(x * spacing + (r - 0.5) * 20, z * spacing + (this.seededRandom(r) - 0.5) * 20, r);
                }
            }
        }
    }

    createDiverseBuilding(x, z, type, r, seed) {
        const group = new THREE.Group();
        const wallThickness = 0.6;

        // Vibrant Building Colors
        const colors = [
            0x7d7d7d, 0x8a5a44, 0x4a5d4a, 0x5a6a8a, // Concrete, Brick, Mossy, Blueish
            0xa83232, 0x32a852, 0x3262a8, 0xa8a832, // Red, Green, Blue, Yellow
            0x6b4226, 0x2f4f4f, 0x556b2f, 0xcd853f, // Wood, Slate, Olive, Tan
            0xffffff, 0xeeeeee, 0xcccccc, 0xbbbbbb  // Modern white/grey variations
        ];
        const color = colors[type % colors.length];
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });

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

        if (archetype === 0) this.buildBox(addWall, 0, 0, w, h, d, wallThickness, group, type);
        else if (archetype === 1) { w = 10; d = 10; h = 35; this.buildBox(addWall, 0, 0, w, h, d, wallThickness, group, type); }
        else if (archetype === 2) { this.buildBox(addWall, 0, 0, w, h, d/2, wallThickness, group, type); this.buildBox(addWall, w/4, 0, w/2, h, d, wallThickness, group, type); }
        else if (archetype === 3) { h = 9; w = 28; this.buildBox(addWall, 0, 0, w, h, d, wallThickness, group, type); }
        else if (archetype === 4) { this.buildBox(addWall, 0, 0, w, h/2, d, wallThickness, group, type); this.buildBox(addWall, 0, h/2, w/2, h/2, d/2, wallThickness, group, type); }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push({ mesh: group });
    }

    buildBox(addWall, ox, oz, w, h, d, wt, group, type) {
        addWall(ox, 0.1, oz, w, 0.2, d); // Floor
        addWall(ox, h, oz, w, 0.2, d);   // Roof
        addWall(ox - w/2, h/2, oz, wt, h, d); // Left
        addWall(ox + w/2, h/2, oz, wt, h, d); // Right
        addWall(ox, h/2, oz - d/2, w, h, wt); // Back

        // Front wall with door
        const dw = 3.5; const dh = 5.5;
        addWall(ox - (w/4 + dw/4), h/2, oz + d/2, w/2 - dw/2, h, wt);
        addWall(ox + (w/4 + dw/4), h/2, oz + d/2, w/2 - dw/2, h, wt);
        addWall(ox, (h + dh)/2, oz + d/2, dw, h - dh, wt);

        // Windows with emission for color depth
        const winColor = (type % 2 === 0) ? 0x66ccff : 0xffcc66;
        const windowMat = new THREE.MeshStandardMaterial({ color: winColor, emissive: winColor, emissiveIntensity: 0.3 });
        for (let fy = 3; fy < h - 2; fy += 4) {
            for (let fx = -w/2 + 2; fx < w/2 - 2; fx += 3) {
                const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, wt + 0.1), windowMat);
                win.position.set(ox + fx, fy, oz + d/2);
                group.add(win);
            }
        }
    }

    createFoliage(x, z, r) {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 }); // Distinct brown
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });  // Sea green
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x32cd32 }); // Lime green

        if (r < 0.45) {
            // Detailed Tree
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 5), trunkMat);
            trunk.position.set(x, 2.5, z);
            trunk.castShadow = true;
            trunk.receiveShadow = true;

            const leaves = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 12), leafMat);
            leaves.position.set(x, 7, z);
            leaves.castShadow = true;
            leaves.receiveShadow = true;

            this.scene.add(trunk, leaves);
            this.objects.push({ mesh: trunk }, { mesh: leaves });
        } else {
            // Bright Grass
            const grass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 1.5), grassMat);
            grass.position.set(x, 1.25, z);
            grass.castShadow = true;
            grass.receiveShadow = true;
            this.scene.add(grass);
            this.objects.push({ mesh: grass });
        }
    }
}
