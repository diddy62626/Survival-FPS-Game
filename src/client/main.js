import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import GSAP from 'gsap';
import PartySocket from 'partysocket';
import { ParticleSystem } from './particles.js';

// Game State
let isMultiplayer = true;
let difficulty = 'normal'; // easy, normal, hard
let myPoints = 0;
let myHP = 100;
let currentWeapon = 1;
let canAttack = true;
let wave = 1;

const weapons = {
    1: { name: 'Fist', range: 2.5, damage: 15, cooldown: 400, owned: true },
    2: { name: 'Knife', range: 3.5, damage: 40, cooldown: 300, owned: false },
    3: { name: 'Pistol', range: 100, damage: 55, cooldown: 500, owned: false }
};

// Networking
let socket;
function connect(room = 'main-room') {
    if (socket) socket.close();
    socket = new PartySocket({
        host: window.location.host.includes('localhost') ? 'localhost:1999' : 'survival-fps-game-server.yourname.partykit.dev',
        room: room,
    });
    setupSocket();
}

// Scene & Engine
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202);
scene.fog = new THREE.FogExp2(0x020202, 0.04);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const particles = new ParticleSystem(scene);
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

const ui = {
    hp: document.getElementById('hp'),
    points: document.getElementById('points'),
    wave: document.getElementById('wave'),
    weapon: document.getElementById('weapon'),
    startBtn: document.getElementById('start-btn'),
    loadingText: document.getElementById('loading-text')
};

// World Construction
scene.add(new THREE.AmbientLight(0x202020, 1));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(20, 50, 20);
sun.castShadow = true;
sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
scene.add(sun);

const groundGeo = new THREE.PlaneGeometry(500, 500);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);
const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
groundBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
world.addBody(groundBody);

// Player Physics
const playerBody = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.6), position: new CANNON.Vec3(0, 5, 0), fixedRotation: true });
world.addBody(playerBody);

const controls = new PointerLockControls(camera, document.body);

// Assets (Procedural Textures)
function createNoiseTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < 1000; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    return new THREE.CanvasTexture(canvas);
}
groundMat.map = createNoiseTexture();

// Game Logic
const otherPlayers = new Map();
const zombies = new Map();

function createZombieMesh() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x224422 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
    head.position.y = 1.6;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.4), mat);
    body.position.y = 0.8;
    g.add(head, body);
    g.traverse(c => { if(c.isMesh) c.castShadow = true; });
    return g;
}

const viewmodel = new THREE.Group();
camera.add(viewmodel);
scene.add(camera);

const weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
weaponMesh.position.set(0.35, -0.4, -0.6);
viewmodel.add(weaponMesh);

const raycaster = new THREE.Raycaster();

function attack() {
    if (!canAttack || myHP <= 0 || !controls.isLocked) return;
    canAttack = false;
    const w = weapons[currentWeapon];

    GSAP.to(viewmodel.position, { z: 0.15, duration: 0.08, yoyo: true, repeat: 1 });

    if (currentWeapon === 3) {
        const flash = new THREE.PointLight(0xffaa00, 12, 5);
        flash.position.set(0.35, -0.4, -0.9);
        viewmodel.add(flash);
        setTimeout(() => viewmodel.remove(flash), 50);
    }

    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const zMeshes = Array.from(zombies.values());
    const intersects = raycaster.intersectObjects(zMeshes, true);

    if (intersects.length > 0 && intersects[0].distance <= w.range) {
        let obj = intersects[0].object;
        while(obj.parent && !obj.zombieId) obj = obj.parent;
        if (obj.zombieId) {
            particles.createExplosion(intersects[0].point, 0x660000, 12);
            if (isMultiplayer) {
                socket.send(JSON.stringify({ type: 'hitZombie', zombieId: obj.zombieId, damage: w.damage }));
            } else {
                damageZombieLocal(obj.zombieId, w.damage);
            }
        }
    }

    setTimeout(() => canAttack = true, w.cooldown);
}

function damageZombieLocal(id, dmg) {
    const z = zombies.get(id);
    if (z) {
        z.hp -= dmg;
        if (z.hp <= 0) {
            scene.remove(z);
            zombies.delete(id);
            myPoints += 100;
            ui.points.innerText = myPoints;
            if (zombies.size === 0) startWaveLocal(wave + 1);
        }
    }
}

function startWaveLocal(w) {
    wave = w;
    ui.wave.innerText = wave;
    const count = wave * (difficulty === 'easy' ? 3 : (difficulty === 'hard' ? 8 : 5));
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 20;
        const mesh = createZombieMesh();
        mesh.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        mesh.zombieId = 'local_' + Math.random();
        mesh.hp = 50 + wave * 10;
        scene.add(mesh);
        zombies.set(mesh.zombieId, mesh);
    }
}

// Networking Setup
function setupSocket() {
    socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'init') { wave = data.wave; ui.wave.innerText = wave; }
        if (data.type === 'waveStart') { wave = data.wave; ui.wave.innerText = wave; }
        if (data.type === 'playerUpdate') {
            let p = otherPlayers.get(data.id);
            if (!p) {
                p = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x0000ff }));
                scene.add(p);
                otherPlayers.set(data.id, p);
            }
            p.position.lerp(new THREE.Vector3(data.pos.x, data.pos.y, data.pos.z), 0.2);
            p.quaternion.copy(data.rot);
        }
        if (data.type === 'zombieSpawn') spawnZombieClient(data.zombie);
        if (data.type === 'zombieSync') data.zombies.forEach(spawnZombieClient);
        if (data.type === 'zombieDeath') {
            const z = zombies.get(data.id);
            if (z) { scene.remove(z); zombies.delete(data.id); }
            if (data.killerId === socket.id) { myPoints += 100; ui.points.innerText = myPoints; }
        }
        if (data.type === 'playerLeft') { const p = otherPlayers.get(data.id); if(p) scene.remove(p); otherPlayers.delete(data.id); }
    };
}

function spawnZombieClient(zData) {
    if (zombies.has(zData.id)) return;
    const mesh = createZombieMesh();
    mesh.position.copy(zData.pos);
    mesh.zombieId = zData.id;
    scene.add(mesh);
    zombies.set(zData.id, mesh);
}

// UI Handlers
window.buyItem = (item, cost) => {
    if (myPoints >= cost) {
        if (item === 'health') {
            myHP = Math.min(100, myHP + 50);
            ui.hp.innerText = myHP;
        } else {
            const id = item === 'knife' ? 2 : 3;
            weapons[id].owned = true;
            alert(`Bought ${weapons[id].name}!`);
        }
        myPoints -= cost;
        ui.points.innerText = myPoints;
    } else {
        alert("Not enough points!");
    }
};

document.getElementById('join-room-btn').onclick = () => {
    const room = document.getElementById('room-id').value || 'main-room';
    isMultiplayer = true;
    connect(room);
    window.toggleMenu('room-menu');
    controls.lock();
};

document.getElementById('go-public-btn').onclick = () => {
    isMultiplayer = true;
    connect('main-room');
    window.toggleMenu('room-menu');
    controls.lock();
};

ui.startBtn.onclick = () => {
    document.getElementById('loading-screen').style.display = 'none';
    isMultiplayer = confirm("Play Multiplayer? (Cancel for Singleplayer)")
    if (isMultiplayer) {
        connect();
    } else {
        difficulty = prompt("Choose Difficulty: easy, normal, hard", "normal") || "normal";
        startWaveLocal(1);
    }
    controls.lock();
};

// Controls & Movement
const move = { f: 0, b: 0, l: 0, r: 0, s: 1 };
window.onkeydown = (e) => {
    if (e.code === 'KeyW') move.f = 1;
    if (e.code === 'KeyS') move.b = 1;
    if (e.code === 'KeyA') move.l = 1;
    if (e.code === 'KeyD') move.r = 1;
    if (e.code === 'ShiftLeft') move.s = 2.2;
    if (e.code.startsWith('Digit')) {
        const id = parseInt(e.code.slice(-1));
        if (weapons[id]?.owned) {
            currentWeapon = id;
            ui.weapon.innerText = weapons[id].name;
            weaponMesh.material.color.set(id === 1 ? 0x333333 : (id === 2 ? 0x777777 : 0x111111));
        }
    }
    if (e.code === 'Space' && Math.abs(playerBody.velocity.y) < 0.1) playerBody.velocity.y = 5.5;
    if (e.code === 'KeyB') window.toggleMenu('shop-menu');
    if (e.code === 'KeyM') window.toggleMenu('room-menu');
};
window.onkeyup = (e) => {
    if (e.code === 'KeyW') move.f = 0;
    if (e.code === 'KeyS') move.b = 0;
    if (e.code === 'KeyA') move.l = 0;
    if (e.code === 'KeyD') move.r = 0;
    if (e.code === 'ShiftLeft') move.s = 1;
};

// Loop
const clock = new THREE.Clock();
function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    world.fixedStep();
    particles.update(dt);

    if (controls.isLocked && myHP > 0) {
        const speed = 6.5 * move.s;
        const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
        const rgt = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
        fwd.y = 0; rgt.y = 0; fwd.normalize(); rgt.normalize();

        const vel = new THREE.Vector3().addScaledVector(fwd, move.f - move.b).addScaledVector(rgt, move.r - move.l);
        if (vel.length() > 0) {
            vel.normalize().multiplyScalar(speed);
            playerBody.velocity.x = vel.x;
            playerBody.velocity.z = vel.z;
        } else {
            playerBody.velocity.x *= 0.85;
            playerBody.velocity.z *= 0.85;
        }

        if (isMultiplayer && socket) {
            socket.send(JSON.stringify({ type: 'move', pos: playerBody.position, rot: camera.quaternion }));
        }

        // Zombie Behavior
        zombies.forEach((zMesh, id) => {
            const dist = zMesh.position.distanceTo(playerBody.position);
            if (dist < 50) {
                const dir = new THREE.Vector3().subVectors(playerBody.position, zMesh.position).normalize();
                const zSpeed = (difficulty === 'hard' ? 0.08 : (difficulty === 'easy' ? 0.03 : 0.05)) * (1 + wave * 0.05);
                zMesh.position.addScaledVector(dir, zSpeed);
                zMesh.lookAt(playerBody.position.x, 0, playerBody.position.z);

                if (dist < 1.4 && Math.random() < 0.02) {
                    myHP -= 2;
                    ui.hp.innerText = Math.max(0, Math.floor(myHP));
                    if (myHP <= 0) { alert("YOU DIED!"); location.reload(); }
                }
            }
        });
    }

    camera.position.copy(playerBody.position);
    camera.position.y += 0.9;

    // Slight head bob
    if (move.f || move.b || move.l || move.r) {
        const t = clock.elapsedTime * 10;
        camera.position.y += Math.sin(t) * 0.05;
        viewmodel.position.y = Math.sin(t) * 0.02;
    }

    renderer.render(scene, camera);
}

// Show start button after small delay
setTimeout(() => {
    ui.loadingText.innerText = "READY FOR COMBAT";
    ui.startBtn.style.display = "block";
}, 1500);

loop();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
