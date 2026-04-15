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
        console.log("Generating diverse city with houses, offices, and gas stations...");
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
        const spacing = 70; // More space for varied buildings

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let z = -gridSize; z <= gridSize; z++) {
                if (Math.abs(x * spacing) < 40 && Math.abs(z * spacing) < 40) continue;

                const r = this.seededRandom(seed + x * 133 + z * 77);
                if (r < 0.5) {
                    const buildingType = Math.floor(this.seededRandom(seed + x + z) * 100);
                    this.createDiverseStructure(x * spacing, z * spacing, buildingType);
                }
                else if (r < 0.75 && !this.performanceMode) {
                    this.createFoliage(x * spacing + (r - 0.5) * 20, z * spacing + (this.seededRandom(r) - 0.5) * 20, r);
                }
            }
        }
    }

    addWall(bx, bz, group, mat, px, py, pz, dx, dy, dz, physics = true) {
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
    }

    createDiverseStructure(bx, bz, type) {
        const group = new THREE.Group();
        const wt = 0.8;
        const colors = [0x7d7d7d, 0x8a5a44, 0x4a5d4a, 0x5a6a8a, 0xa83232, 0x32a852, 0x3262a8, 0xa8a832, 0x6b4226, 0xffffff];
        const color = colors[type % colors.length];
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

        const structureType = type % 4; // 0: House, 1: Office, 2: Gas Station, 3: Warehouse/Large

        if (structureType === 0) {
            this.buildHouse(bx, bz, group, mat, wt);
        } else if (structureType === 1) {
            this.buildOffice(bx, bz, group, mat, wt, 2 + (type % 4)); // 2 to 5 floors
        } else if (structureType === 2) {
            this.buildGasStation(bx, bz, group, mat, wt);
        } else {
            this.buildWarehouse(bx, bz, group, mat, wt);
        }

        group.position.set(bx, 0, bz);
        this.scene.add(group);
        this.objects.push({ mesh: group });
    }

    buildHouse(bx, bz, group, mat, wt) {
        const w = 18, d = 15, h = 8;
        // Floor & Ceiling
        this.addWall(bx, bz, group, mat, 0, 0.2, 0, w, 0.4, d);
        this.addWall(bx, bz, group, mat, 0, h, 0, w, 0.4, d);
        // Walls
        this.addWall(bx, bz, group, mat, -w/2, h/2, 0, wt, h, d);
        this.addWall(bx, bz, group, mat, w/2, h/2, 0, wt, h, d);
        this.addWall(bx, bz, group, mat, 0, h/2, -d/2, w, h, wt);
        // Front with door
        const dw = 4;
        this.addWall(bx, bz, group, mat, -(w/4+dw/4), h/2, d/2, w/2-dw/2, h, wt);
        this.addWall(bx, bz, group, mat, (w/4+dw/4), h/2, d/2, w/2-dw/2, h, wt);
        this.addWall(bx, bz, group, mat, 0, h-1, d/2, dw, 2, wt);

        // Interior: Small room divider
        this.addWall(bx, bz, group, mat, -w/6, h/2, 0, wt, h, d*0.6);

        if (!this.performanceMode) {
            const light = new THREE.PointLight(0xffcc88, 10, 20);
            light.position.set(0, h-2, 0);
            group.add(light);
            this.lights.push(light);
        }
    }

    buildOffice(bx, bz, group, mat, wt, floors) {
        const w = 22, d = 22, fh = 7; // floor height
        for (let i = 0; i < floors; i++) {
            const y = i * fh;
            // Floor slab
            this.addWall(bx, bz, group, mat, 0, y + 0.2, 0, w, 0.4, d);
            // Exterior walls for this floor
            this.addWall(bx, bz, group, mat, -w/2, y + fh/2, 0, wt, fh, d);
            this.addWall(bx, bz, group, mat, w/2, y + fh/2, 0, wt, fh, d);
            this.addWall(bx, bz, group, mat, 0, y + fh/2, -d/2, w, fh, wt);
            // Front wall (mostly windows or glass)
            if (i === 0) {
                // Ground floor entrance
                this.addWall(bx, bz, group, mat, -w/3, y + fh/2, d/2, w/3, fh, wt);
                this.addWall(bx, bz, group, mat, w/3, y + fh/2, d/2, w/3, fh, wt);
                this.addWall(bx, bz, group, mat, 0, y + fh - 1, d/2, w/3, 2, wt);
            } else {
                this.addWall(bx, bz, group, mat, 0, y + fh/2, d/2, w, fh, wt);
            }

            // Stairs (simple ramp)
            if (i < floors - 1) {
                const rampW = 4, rampL = 10;
                const rampMat = new THREE.MeshStandardMaterial({color: 0x444444});
                const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampW, 0.2, rampL), rampMat);
                ramp.position.set(w/2 - rampW, y + fh/2, -d/2 + rampL/2);
                ramp.rotation.x = -Math.atan(fh / rampL);
                group.add(ramp);

                const body = new CANNON.Body({
                    type: CANNON.Body.STATIC,
                    shape: new CANNON.Box(new CANNON.Vec3(rampW/2, 0.1, rampL/2)),
                    position: new CANNON.Vec3(bx + w/2 - rampW, y + fh/2, bz - d/2 + rampL/2)
                });
                body.quaternion.setFromEuler(-Math.atan(fh / rampL), 0, 0);
                this.world.addBody(body);
                this.objects.push({ body });
            }
        }
        // Roof
        this.addWall(bx, bz, group, mat, 0, floors * fh, 0, w, 0.4, d);
    }

    buildGasStation(bx, bz, group, mat, wt) {
        // Main Shop
        const sw = 12, sd = 10, sh = 6;
        this.addWall(bx, bz, group, mat, 0, 0.2, -10, sw, 0.4, sd);
        this.addWall(bx, bz, group, mat, 0, sh, -10, sw, 0.4, sd);
        this.addWall(bx, bz, group, mat, -sw/2, sh/2, -10, wt, sh, sd);
        this.addWall(bx, bz, group, mat, sw/2, sh/2, -10, wt, sh, sd);
        this.addWall(bx, bz, group, mat, 0, sh/2, -10-sd/2, sw, sh, wt);
        // Front with large glass area
        this.addWall(bx, bz, group, mat, -sw/4 - 1, sh/2, -10+sd/2, sw/2 - 2, sh, wt);
        this.addWall(bx, bz, group, mat, sw/4 + 1, sh/2, -10+sd/2, sw/2 - 2, sh, wt);
        this.addWall(bx, bz, group, mat, 0, sh-1, -10+sd/2, 4, 2, wt);

        // Canopy
        const cw = 25, cd = 15, ch = 7;
        const canopyMat = new THREE.MeshStandardMaterial({color: 0xffffff});
        this.addWall(bx, bz, group, canopyMat, 0, ch, 10, cw, 0.5, cd);
        // Pillars
        this.addWall(bx, bz, group, canopyMat, -8, ch/2, 10, 1, ch, 1);
        this.addWall(bx, bz, group, canopyMat, 8, ch/2, 10, 1, ch, 1);

        // Pumps
        const pumpMat = new THREE.MeshStandardMaterial({color: 0xff0000});
        this.addWall(bx, bz, group, pumpMat, -4, 1, 10, 1.5, 2, 1);
        this.addWall(bx, bz, group, pumpMat, 4, 1, 10, 1.5, 2, 1);
    }

    buildWarehouse(bx, bz, group, mat, wt) {
        const w = 40, d = 30, h = 12;
        // Large open interior
        this.addWall(bx, bz, group, mat, 0, 0.2, 0, w, 0.4, d);
        this.addWall(bx, bz, group, mat, 0, h, 0, w, 0.4, d);
        this.addWall(bx, bz, group, mat, -w/2, h/2, 0, wt, h, d);
        this.addWall(bx, bz, group, mat, w/2, h/2, 0, wt, h, d);
        this.addWall(bx, bz, group, mat, 0, h/2, -d/2, w, h, wt);
        // Huge bay door
        const bw = 12, bh = 10;
        this.addWall(bx, bz, group, mat, -(w/4+bw/4), h/2, d/2, w/2-bw/2, h, wt);
        this.addWall(bx, bz, group, mat, (w/4+bw/4), h/2, d/2, w/2-bw/2, h, wt);
        this.addWall(bx, bz, group, mat, 0, (h+bh)/2, d/2, bw, h-bh, wt);

        // Some crates inside
        this.addWall(bx, bz, group, mat, -w/4, 2, -d/4, 4, 4, 4);
        this.addWall(bx, bz, group, mat, w/4, 2, d/4, 4, 4, 4);
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
