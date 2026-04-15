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
        console.log("Generating immersive city...");
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
        const spacing = 80;

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let z = -gridSize; z <= gridSize; z++) {
                if (Math.abs(x * spacing) < 40 && Math.abs(z * spacing) < 40) continue;

                const r = this.seededRandom(seed + x * 133 + z * 77);
                if (r < 0.55) {
                    const buildingType = Math.floor(this.seededRandom(seed + x + z) * 100);
                    this.createImmersiveStructure(x * spacing, z * spacing, buildingType);
                }
                else if (r < 0.78 && !this.performanceMode) {
                    this.createDetailedNature(x * spacing + (r - 0.5) * 20, z * spacing + (this.seededRandom(r) - 0.5) * 20, r);
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

    createImmersiveStructure(bx, bz, type) {
        const group = new THREE.Group();
        const wt = 0.8;
        const colors = [0x7d7d7d, 0x8a5a44, 0x4a5d4a, 0x5a6a8a, 0xa83232, 0x32a852, 0x3262a8, 0xa8a832, 0x6b4226, 0xffffff];
        const color = colors[type % colors.length];
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
        const intMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }); // Darker interior

        const structureType = type % 4;

        if (structureType === 0) {
            this.buildLuxuryHouse(bx, bz, group, mat, intMat, wt);
        } else if (structureType === 1) {
            this.buildModernOffice(bx, bz, group, mat, intMat, wt, 2 + (type % 4));
        } else if (structureType === 2) {
            this.buildGasStationDeluxe(bx, bz, group, mat, intMat, wt);
        } else {
            this.buildIndustrialWarehouse(bx, bz, group, mat, intMat, wt);
        }

        group.position.set(bx, 0, bz);
        this.scene.add(group);
        this.objects.push({ mesh: group });
    }

    buildLuxuryHouse(bx, bz, group, mat, intMat, wt) {
        const w = 22, d = 18, h = 10;
        this.addWall(bx, bz, group, mat, 0, 0.2, 0, w, 0.4, d); // Floor
        this.addWall(bx, bz, group, mat, 0, h, 0, w, 0.4, d); // Ceiling
        // Exterior Walls
        this.addWall(bx, bz, group, mat, -w/2, h/2, 0, wt, h, d);
        this.addWall(bx, bz, group, mat, w/2, h/2, 0, wt, h, d);
        this.addWall(bx, bz, group, mat, 0, h/2, -d/2, w, h, wt);
        // Front with double doors
        this.addWall(bx, bz, group, mat, -w/4 - 2, h/2, d/2, w/2 - 4, h, wt);
        this.addWall(bx, bz, group, mat, w/4 + 2, h/2, d/2, w/2 - 4, h, wt);
        this.addWall(bx, bz, group, mat, 0, h-1.5, d/2, 8, 3, wt);

        // INTERIOR: Furniture and Rooms
        this.addWall(bx, bz, group, intMat, -4, h/2, 0, wt, h, d*0.6); // Room Divider
        this.addWall(bx, bz, group, intMat, 6, 1.5, -4, 4, 3, 4, true); // Kitchen Counter/Table
        this.addWall(bx, bz, group, intMat, -8, 1, 4, 3, 2, 6, true);  // Couch/Sofa

        if (!this.performanceMode) {
            const light = new THREE.PointLight(0xffaa44, 20, 25);
            light.position.set(0, h-2, 0);
            group.add(light);
            this.lights.push(light);
        }
    }

    buildModernOffice(bx, bz, group, mat, intMat, wt, floors) {
        const w = 26, d = 26, fh = 8;
        for (let i = 0; i < floors; i++) {
            const y = i * fh;
            this.addWall(bx, bz, group, mat, 0, y + 0.2, 0, w, 0.4, d); // Floor slab
            this.addWall(bx, bz, group, mat, -w/2, y + fh/2, 0, wt, fh, d); // Left
            this.addWall(bx, bz, group, mat, w/2, y + fh/2, 0, wt, fh, d);  // Right
            this.addWall(bx, bz, group, mat, 0, y + fh/2, -d/2, w, fh, wt); // Back
            this.addWall(bx, bz, group, mat, 0, y + fh/2, d/2, w, fh, wt);  // Front

            // Interior: Desks and Cubicles
            for(let dx=-8; dx<=8; dx+=8) {
                for(let dz=-8; dz<=8; dz+=8) {
                    if (Math.abs(dx) > 1 || Math.abs(dz) > 1) {
                        this.addWall(bx, bz, group, intMat, dx, y + 1.2, dz, 3, 2.4, 3, true); // Desk
                    }
                }
            }

            // Stairs
            if (i < floors - 1) {
                const rampW = 5, rampL = 12;
                const rampMat = new THREE.MeshStandardMaterial({color: 0x222222});
                const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampW, 0.3, rampL), rampMat);
                ramp.position.set(w/2 - rampW - 1, y + fh/2, 0);
                ramp.rotation.x = -Math.atan(fh / rampL);
                group.add(ramp);
                const body = new CANNON.Body({
                    type: CANNON.Body.STATIC,
                    shape: new CANNON.Box(new CANNON.Vec3(rampW/2, 0.15, rampL/2)),
                    position: new CANNON.Vec3(bx + w/2 - rampW - 1, y + fh/2, bz)
                });
                body.quaternion.setFromEuler(-Math.atan(fh / rampL), 0, 0);
                this.world.addBody(body);
                this.objects.push({ body });
            }
        }
        this.addWall(bx, bz, group, mat, 0, floors * fh, 0, w, 0.4, d); // Roof
    }

    buildGasStationDeluxe(bx, bz, group, mat, intMat, wt) {
        // Main Store
        const sw = 15, sd = 12, sh = 8;
        this.addWall(bx, bz, group, mat, 0, 0.2, -15, sw, 0.4, sd);
        this.addWall(bx, bz, group, mat, 0, sh, -15, sw, 0.4, sd);
        this.addWall(bx, bz, group, mat, -sw/2, sh/2, -15, wt, sh, sd);
        this.addWall(bx, bz, group, mat, sw/2, sh/2, -15, wt, sh, sd);
        this.addWall(bx, bz, group, mat, 0, sh/2, -15-sd/2, sw, sh, wt);
        this.addWall(bx, bz, group, mat, 0, sh-1, -15+sd/2, sw, 2, wt);

        // INTERIOR: Shelves
        this.addWall(bx, bz, group, intMat, -sw/4, 2, -15, 2, 4, sd*0.6, true);
        this.addWall(bx, bz, group, intMat, sw/4, 2, -15, 2, 4, sd*0.6, true);

        // Canopy and Pumps
        const cw = 30, cd = 20, ch = 9;
        const canMat = new THREE.MeshStandardMaterial({color: 0xffffff});
        this.addWall(bx, bz, group, canMat, 0, ch, 10, cw, 0.6, cd);
        this.addWall(bx, bz, group, canMat, -12, ch/2, 10, 1.5, ch, 1.5);
        this.addWall(bx, bz, group, canMat, 12, ch/2, 10, 1.5, ch, 1.5);

        const pumpMat = new THREE.MeshStandardMaterial({color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 0.2});
        for(let px=-8; px<=8; px+=16) {
            for(let pz=2; pz<=18; pz+=12) {
                this.addWall(bx, bz, group, pumpMat, px, 1.5, pz, 2, 3, 2, true);
            }
        }
    }

    buildIndustrialWarehouse(bx, bz, group, mat, intMat, wt) {
        const w = 45, d = 35, h = 16;
        this.addWall(bx, bz, group, mat, 0, 0.2, 0, w, 0.4, d); // Floor
        this.addWall(bx, bz, group, mat, 0, h, 0, w, 0.4, d); // Roof
        this.addWall(bx, bz, group, mat, -w/2, h/2, 0, wt, h, d);
        this.addWall(bx, bz, group, mat, w/2, h/2, 0, wt, h, d);
        this.addWall(bx, bz, group, mat, 0, h/2, -d/2, w, h, wt);
        // Bay Entrance
        this.addWall(bx, bz, group, mat, -w/2 + 5, h/2, d/2, 10, h, wt);
        this.addWall(bx, bz, group, mat, w/2 - 5, h/2, d/2, 10, h, wt);
        this.addWall(bx, bz, group, mat, 0, h-2, d/2, w-20, 4, wt);

        // INTERIOR: Industrial Shelving/Crates
        for(let i=0; i<3; i++) {
            this.addWall(bx, bz, group, intMat, -10 + i*10, 3, -5, 6, 6, 6, true);
            this.addWall(bx, bz, group, intMat, -10 + i*10, 3, 5, 6, 6, 6, true);
        }

        if (!this.performanceMode) {
            const light = new THREE.PointLight(0x00ffcc, 30, 40);
            light.position.set(0, h-2, 0);
            group.add(light);
            this.lights.push(light);
        }
    }

    createDetailedNature(x, z, r) {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 7), trunkMat);
        trunk.position.set(x, 3.5, z);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(4.5, 12, 12), leafMat);
        leaves.position.set(x, 10, z);
        this.scene.add(trunk, leaves);
        this.objects.push({ mesh: trunk }, { mesh: leaves });

        // Add some "rocks" or debris
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2), new THREE.MeshStandardMaterial({color: 0x444444}));
        rock.position.set(x+5, 1, z-5);
        this.scene.add(rock);
        this.objects.push({ mesh: rock });
    }
}
