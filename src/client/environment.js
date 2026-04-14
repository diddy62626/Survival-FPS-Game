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
        // Clear existing
        this.objects.forEach(obj => {
            if (obj.mesh) this.scene.remove(obj.mesh);
            if (obj.body) this.world.removeBody(obj.body);
        });
        this.objects = [];

        let seed = 0;
        for(let i=0; i<seedStr.length; i++) seed += seedStr.charCodeAt(i);

        const gridSize = 8;
        const spacing = 30;

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let z = -gridSize; z <= gridSize; z++) {
                if (x === 0 && z === 0) continue; // Start area clear

                const r = this.seededRandom(seed + x * 133 + z * 77);

                if (r < 0.25) {
                    this.createBuildingWithInterior(x * spacing, z * spacing, r, seed);
                }
                else if (r < 0.6) {
                    this.createFoliage(x * spacing + (r - 0.5) * 15, z * spacing + (this.seededRandom(r) - 0.5) * 15, r);
                }
            }
        }
    }

    createBuildingWithInterior(x, z, r, seed) {
        const h = 8 + r * 12;
        const w = 12 + this.seededRandom(r) * 6;
        const d = 12 + this.seededRandom(h) * 6;
        const wallThickness = 0.5;

        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });

        // Wall construction function
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

        // Floor
        addWall(0, 0.1, 0, w, 0.2, d);
        // Roof
        addWall(0, h, 0, w, 0.2, d);

        // Left & Right Walls
        addWall(-w/2, h/2, 0, wallThickness, h, d);
        addWall(w/2, h/2, 0, wallThickness, h, d);

        // Back Wall
        addWall(0, h/2, -d/2, w, h, wallThickness);

        // Front Wall with Doorway
        const doorWidth = 2.5;
        const doorHeight = 4;
        // Wall left of door
        addWall(-(w/4 + doorWidth/4), h/2, d/2, w/2 - doorWidth/2, h, wallThickness);
        // Wall right of door
        addWall(w/4 + doorWidth/4, h/2, d/2, w/2 - doorWidth/2, h, wallThickness);
        // Wall above door
        addWall(0, (h + doorHeight)/2, d/2, doorWidth, h - doorHeight, wallThickness);

        // Windows for detail
        const windowMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x112233, transparent: true, opacity: 0.6 });
        for (let fy = 3; fy < h - 2; fy += 4) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, wallThickness + 0.1), windowMat);
            win.position.set(w/2, fy, 0);
            win.rotation.y = Math.PI/2;
            group.add(win);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push({ mesh: group });
    }

    createFoliage(x, z, r) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x1a331a });
        if (r < 0.45) {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3), new THREE.MeshStandardMaterial({ color: 0x221100 }));
            trunk.position.set(x, 1.5, z);
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 8), mat);
            leaves.position.set(x, 5, z);
            this.scene.add(trunk, leaves);
            this.objects.push({ mesh: trunk }, { mesh: leaves });
        } else {
            const grass = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 1), mat);
            grass.position.set(x, 0.75, z);
            this.scene.add(grass);
            this.objects.push({ mesh: grass });
        }
    }
}
