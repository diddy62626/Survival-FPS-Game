import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import GSAP from 'gsap';
import PartySocket from 'partysocket';
import { ParticleSystem } from './particles.js';
import { EnvironmentManager } from './environment.js';

// Game State
let isMultiplayer = true;
let difficulty = 'normal';
let myPoints = 0;
let myHP = 100;
let currentWeapon = 1;
let canAttack = true;
let wave = 1;
let roomName = 'main-room';

const weapons = {
    1: { name: 'Fist', range: 2.5, damage: 15, cooldown: 400, owned: true },
    2: { name: 'Knife', range: 3.5, damage: 40, cooldown: 300, owned: false },
    3: { name: 'Pistol', range: 100, damage: 55, cooldown: 500, owned: false }
};

// Scene & Physics
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202);
scene.fog = new THREE.FogExp2(0x020202, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
const particles = new ParticleSystem(scene);
const env = new EnvironmentManager(scene, world);

// UI & Pointer Lock
const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
const crosshair = document.getElementById('crosshair');
const playBtn = document.getElementById('play-btn');

const controls = new PointerLockControls(camera, document.body);

playBtn.onclick = () => {
    isMultiplayer = confirm("Enable Multiplayer? (Cancel for Singleplayer)");
    if (isMultiplayer) connect(roomName);
    else {
        difficulty = prompt("Difficulty: easy, normal, hard", "normal") || "normal";
        env.generateCity('local-city');
        startWaveLocal(1);
    }
    controls.lock();
};

controls.addEventListener('lock', () => {
    overlay.style.display = 'none';
    hud.style.display = 'block';
    crosshair.style.display = 'block';
});

controls.addEventListener('unlock', () => {
    // Only show overlay if menus are not active
    const shopActive = document.getElementById('shop-menu').classList.contains('menu-active');
    const roomActive = document.getElementById('room-menu').classList.contains('menu-active');

    if (!shopActive && !roomActive) {
        overlay.style.display = 'flex';
        document.getElementById('status-text').innerText = "PAUSED";
    }
});

// Networking
let socket;
function connect(room) {
    roomName = room;
    if (socket) socket.close();
    socket = new PartySocket({
        host: window.location.host.includes('localhost') ? 'localhost:1999' : 'survival-fps-game-server.yourname.partykit.dev',
        room: room,
    });
    setupSocket();
    env.generateCity(room);
}

// Rest of the game logic (Lighting, Ground, Player, Combat)
scene.add(new THREE.AmbientLight(0x202020, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
sun.castShadow = true;
scene.add(sun);

const groundGeo = new THREE.PlaneGeometry(1000, 1000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);
const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
groundBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
world.addBody(groundBody);

const playerBody = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.6), position: new CANNON.Vec3(0, 5, 0), fixedRotation: true });
world.addBody(playerBody);

const otherPlayers = new Map();
const zombies = new Map();

const viewmodel = new THREE.Group();
camera.add(viewmodel);
scene.add(camera);
const weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
weaponMesh.position.set(0.35, -0.4, -0.6);
viewmodel.add(weaponMesh);

const raycaster = new THREE.Raycaster();

document.addEventListener('mousedown', (e) => {
    if (controls.isLocked && e.button === 0) attack();
});

function attack() {
    if (!canAttack || myHP <= 0) return;
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
            if (isMultiplayer) socket.send(JSON.stringify({ type: 'hitZombie', zombieId: obj.zombieId, damage: w.damage }));
            else damageZombieLocal(obj.zombieId, w.damage);
        }
    }
    setTimeout(() => canAttack = true, w.cooldown);
}

// [Socket Handlers and Local AI - Re-implementing with environmental awareness]
function setupSocket() {
    socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'init') { wave = data.wave; document.getElementById('wave').innerText = wave; }
        if (data.type === 'waveStart') { wave = data.wave; document.getElementById('wave').innerText = wave; }
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
        if (data.type === 'zombieUpdate') {
            data.zombies.forEach(zData => {
                const z = zombies.get(zData.id);
                if (z) {
                    z.position.lerp(new THREE.Vector3(zData.pos.x, zData.pos.y, zData.pos.z), 0.2);
                    z.lookAt(playerBody.position.x, 0, playerBody.position.z);
                }
            });
        }
        if (data.type === 'damagePlayer') {
            myHP -= data.amount;
            document.getElementById('hp').innerText = Math.max(0, Math.floor(myHP));
            if (myHP <= 0) { alert("YOU DIED!"); location.reload(); }
        }
        if (data.type === 'zombieDeath') {
            const z = zombies.get(data.id);
            if (z) { scene.remove(z); zombies.delete(data.id); }
            if (data.killerId === socket.id) { myPoints += 100; document.getElementById('points').innerText = myPoints; }
        }
        if (data.type === 'playerLeft') { const p = otherPlayers.get(data.id); if(p) scene.remove(p); otherPlayers.delete(data.id); }
    };
}

function spawnZombieClient(zData) {
    if (zombies.has(zData.id)) return;
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x224422 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
    head.position.y = 1.6;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.4), mat);
    body.position.y = 0.8;
    g.add(head, body);
    g.position.copy(zData.pos);
    g.zombieId = zData.id;
    scene.add(g);
    zombies.set(zData.id, g);
}

// Local AI (same as before but simplified for readability)
function damageZombieLocal(id, dmg) {
    const z = zombies.get(id);
    if (z) {
        z.hp = (z.hp || 50) - dmg;
        if (z.hp <= 0) { scene.remove(z); zombies.delete(id); myPoints += 100; document.getElementById('points').innerText = myPoints; if (zombies.size === 0) startWaveLocal(wave + 1); }
    }
}
function startWaveLocal(w) {
    wave = w; document.getElementById('wave').innerText = wave;
    for (let i = 0; i < wave * 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 20;
        spawnZombieClient({ id: 'local_'+Math.random(), pos: { x: Math.cos(angle)*dist, y: 0, z: Math.sin(angle)*dist } });
    }
}

// Shop and Menus
window.buyItem = (item, cost) => {
    if (myPoints >= cost) {
        if (item === 'health') { myHP = Math.min(100, myHP + 50); document.getElementById('hp').innerText = myHP; }
        else { const id = item === 'knife' ? 2 : 3; weapons[id].owned = true; alert(`Bought ${weapons[id].name}!`); }
        myPoints -= cost; document.getElementById('points').innerText = myPoints;
    } else alert("Not enough points!");
};

document.getElementById('join-room-btn').onclick = () => {
    const room = document.getElementById('room-id').value || 'main-room';
    isMultiplayer = true; connect(room);
    document.getElementById('room-menu').classList.remove('menu-active');
    controls.lock();
};

document.getElementById('go-public-btn').onclick = () => {
    isMultiplayer = true; connect('main-room');
    document.getElementById('room-menu').classList.remove('menu-active');
    controls.lock();
};

// Loop
const move = { f: 0, b: 0, l: 0, r: 0, s: 1 };
window.onkeydown = (e) => {
    if (e.code === 'KeyW') move.f = 1;
    if (e.code === 'KeyS') move.b = 1;
    if (e.code === 'KeyA') move.l = 1;
    if (e.code === 'KeyD') move.r = 1;
    if (e.code === 'ShiftLeft') move.s = 2.2;
    if (e.code.startsWith('Digit')) {
        const id = parseInt(e.code.slice(-1));
        if (weapons[id]?.owned) { currentWeapon = id; document.getElementById('weapon').innerText = weapons[id].name; }
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

const clock = new THREE.Clock();
function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    world.fixedStep();
    particles.update(dt);

    if (controls.isLocked && myHP > 0) {
        const speed = 7 * move.s;
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

        if (!isMultiplayer) {
            zombies.forEach((zMesh) => {
                const dist = zMesh.position.distanceTo(playerBody.position);
                if (dist < 50) {
                    const dir = new THREE.Vector3().subVectors(playerBody.position, zMesh.position).normalize();
                    zMesh.position.addScaledVector(dir, 0.05);
                    zMesh.lookAt(playerBody.position.x, 0, playerBody.position.z);
                    if (dist < 1.4 && Math.random() < 0.02) {
                        myHP -= 1; document.getElementById('hp').innerText = Math.max(0, Math.floor(myHP));
                        if (myHP <= 0) { alert("YOU DIED!"); location.reload(); }
                    }
                }
            });
        }
    }

    camera.position.copy(playerBody.position);
    camera.position.y += 0.9;

    renderer.render(scene, camera);
}

document.getElementById('status-text').innerText = "SYSTEMS READY";
document.getElementById('setup-options').style.display = 'block';
loop();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
