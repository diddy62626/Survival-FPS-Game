import * as THREE from 'three';

export class EnemyFactory {
    constructor() {
        this.materials = {
            armor: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 }),
            glow_cyan: new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 5 }),
            glow_red: new THREE.MeshStandardMaterial({ color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 5 }),
            glow_yellow: new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 5 }),
            rock: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 1.0 }),
            flesh: new THREE.MeshStandardMaterial({ color: 0x442222, roughness: 0.8 }),
            chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.05 })
        };
    }

    createEnemyGroup(type, data) {
        const group = new THREE.Group();
        const baseColor = new THREE.Color(data.color);
        const accentColor = baseColor.clone().offsetHSL(0, 0, 0.25);
        const darkColor = baseColor.clone().offsetHSL(0, -0.3, -0.3);

        switch(type) {
            case 'scout':
                this.buildScout(group, baseColor, accentColor, darkColor);
                break;
            case 'brute':
                this.buildBrute(group, baseColor, accentColor, darkColor);
                break;
            case 'stalker':
                this.buildStalker(group, baseColor, accentColor, darkColor);
                break;
            case 'spiker':
                this.buildSpiker(group, baseColor, accentColor, darkColor);
                break;
            case 'tank':
                this.buildTank(group, baseColor, accentColor, darkColor);
                break;
            default:
                this.buildDefault(group, baseColor, accentColor, darkColor);
        }

        group.traverse(obj => { if(obj.isMesh) obj.castShadow = true; });
        return group;
    }

    buildScout(group, base, accent, dark) {
        // AERODYNAMIC, LIGHTWEIGHT, JET-LIKE
        const matBody = new THREE.MeshStandardMaterial({color: base, roughness: 0.1, metalness: 0.5});
        const matBelly = new THREE.MeshStandardMaterial({color: accent, roughness: 0.1});

        const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.8, 4, 8), matBody);
        core.rotation.x = Math.PI / 2; core.position.y = 0.5; group.add(core);

        const wingGeo = new THREE.BoxGeometry(1.2, 0.02, 0.4);
        const wings = new THREE.Mesh(wingGeo, this.materials.armor);
        wings.position.set(0, 0.5, 0); group.add(wings);

        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.3), dark);
        engine.rotation.x = Math.PI / 2; engine.position.set(0, 0.5, -0.4); group.add(engine);

        const thruster = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), this.materials.glow_cyan);
        thruster.position.set(0, 0.5, -0.55); group.add(thruster);

        const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 8), this.materials.chrome);
        head.rotation.x = -Math.PI / 2; head.position.set(0, 0.5, 0.5); group.add(head);

        group.userData.height = 1.0;
    }

    buildBrute(group, base, accent, dark) {
        // HUNCHED, WIDE, ROCKY
        const matRock = new THREE.MeshStandardMaterial({color: dark, roughness: 1.0});
        const matFlesh = new THREE.MeshStandardMaterial({color: base, roughness: 0.9});

        const legs = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.6), matRock);
        legs.position.y = 0.3; group.add(legs);

        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.0), matFlesh);
        torso.position.y = 1.0; group.add(torso);

        const backArmor = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.2, 8, 6, Math.PI), this.materials.armor);
        backArmor.position.set(0, 1.2, -0.3); backArmor.rotation.x = -Math.PI/2; group.add(backArmor);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.7), matRock);
        head.position.set(0, 1.2, 0.6); group.add(head);

        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), this.materials.glow_red);
        eyeL.position.set(-0.15, 1.3, 0.95); group.add(eyeL);
        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), this.materials.glow_red);
        eyeR.position.set(0.15, 1.3, 0.95); group.add(eyeR);

        const fistGeo = new THREE.SphereGeometry(0.4, 6, 6);
        const fistL = new THREE.Mesh(fistGeo, this.materials.armor);
        fistL.position.set(-1.0, 0.5, 0.5); group.add(fistL);
        const fistR = new THREE.Mesh(fistGeo, this.materials.armor);
        fistR.position.set(1.0, 0.5, 0.5); group.add(fistR);

        group.userData.height = 1.8;
    }

    buildStalker(group, base, accent, dark) {
        // TALL, LANKY, INSECTOID/SLEEK
        const matSkin = new THREE.MeshStandardMaterial({color: base, metalness: 0.3, roughness: 0.4});

        const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 3.5), matSkin);
        spine.position.y = 1.75; group.add(spine);

        const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.6, 4, 8), this.materials.chrome);
        head.position.y = 3.5; head.rotation.z = Math.PI/4; group.add(head);

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.1), this.materials.glow_cyan);
        visor.position.set(0.15, 3.6, 0.1); visor.rotation.z = Math.PI/4; group.add(visor);

        const bladeGeo = new THREE.BoxGeometry(0.02, 1.5, 0.2);
        for(let i=0; i<2; i++) {
            const side = i === 0 ? 1 : -1;
            const arm = new THREE.Mesh(bladeGeo, this.materials.armor);
            arm.position.set(side * 0.4, 2.5, 0);
            arm.rotation.z = side * 0.8;
            group.add(arm);

            const glow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.2, 0.05), this.materials.glow_cyan);
            glow.position.copy(arm.position); glow.rotation.copy(arm.rotation);
            group.add(glow);
        }

        group.userData.height = 3.8;
    }

    buildSpiker(group, base, accent, dark) {
        // SMALL, BALL-SHAPED, EXPLOSIVE LOOK
        const matInner = new THREE.MeshStandardMaterial({color: accent, emissive: accent, emissiveIntensity: 1});

        const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), matInner);
        core.position.y = 0.6; group.add(core);

        const shellGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
        for(let i=0; i<12; i++) {
            const shell = new THREE.Mesh(shellGeo, this.materials.rock);
            const phi = Math.acos(-1 + (2 * i) / 12);
            const theta = Math.sqrt(12 * Math.PI) * phi;
            shell.position.setFromSphericalCoords(0.55, phi, theta);
            shell.position.y += 0.6;
            shell.lookAt(0, 0.6, 0);
            group.add(shell);
        }

        const spikeGeo = new THREE.ConeGeometry(0.05, 1.0, 4);
        for(let i=0; i<8; i++) {
            const spike = new THREE.Mesh(spikeGeo, this.materials.spike);
            const ang = (i / 8) * Math.PI * 2;
            spike.position.set(Math.cos(ang)*0.4, 0.6, Math.sin(ang)*0.4);
            spike.lookAt(Math.cos(ang)*2, 0.6, Math.sin(ang)*2);
            spike.rotateX(Math.PI/2);
            group.add(spike);

            const light = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), this.materials.glow_red);
            light.position.copy(spike.position).addScaledVector(new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)), 0.8);
            group.add(light);
        }

        group.userData.height = 1.2;
    }

    buildTank(group, base, accent, dark) {
        // MASSIVE, PLATED, LOW-SLUNG
        const matArmor = new THREE.MeshStandardMaterial({color: dark, metalness: 0.8, roughness: 0.2});
        const matTrim = new THREE.MeshStandardMaterial({color: accent, metalness: 0.5});

        const baseHull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 2.5), matArmor);
        baseHull.position.y = 0.4; group.add(baseHull);

        const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.6, 8), matTrim);
        turret.position.y = 1.1; group.add(turret);

        const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.2), this.materials.glow_yellow);
        sensor.position.set(0, 1.1, 0.9); group.add(sensor);

        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5), this.materials.armor);
        cannon.rotation.x = Math.PI / 2; cannon.position.set(0, 1.1, 1.2); group.add(cannon);

        const sideShieldL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 2.0), matArmor);
        sideShieldL.position.set(-1.4, 0.6, 0); group.add(sideShieldL);
        const sideShieldR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 2.0), matArmor);
        sideShieldR.position.set(1.4, 0.6, 0); group.add(sideShieldR);

        group.userData.height = 1.6;
    }

    buildDefault(group, base, accent, dark) {
        const mat = new THREE.MeshStandardMaterial({color: base});
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.5, 4, 8), mat);
        body.position.y = 1.25; group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), this.materials.armor);
        head.position.y = 2.45; group.add(head);
        group.userData.height = 3.0;
    }
}
