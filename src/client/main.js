import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import GSAP from 'gsap';
import PartySocket from 'partysocket';
import { ParticleSystem } from './particles.js';
import { EnvironmentManager } from './environment.js';

let isMultiplayer = false, myPoints = 0, myHP = 100, currentWeapon = 1, canAttack = true, wave = 1, roomName = 'main-room', isPerformanceMode = false, gameStarted = false;

const weapons = { 1: { name: 'Fist', range: 2.5, damage: 15, cooldown: 400, owned: true }, 2: { name: 'Knife', range: 3.5, damage: 45, cooldown: 300, owned: false }, 3: { name: 'Pistol', range: 100, damage: 60, cooldown: 500, owned: false } };

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050505);
const fog = new THREE.FogExp2(0x050505, 0.015); scene.fog = fog;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true; document.body.appendChild(renderer.domElement);

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
const particles = new ParticleSystem(scene);
const env = new EnvironmentManager(scene, world);
const controls = new PointerLockControls(camera, document.body);

window.tryLockMouse = () => { if (gameStarted) controls.lock(); };
window.unlockMouse = () => { controls.unlock(); };

window.togglePerformance = () => {
    isPerformanceMode = !isPerformanceMode;
    document.getElementById('perf-toggle').innerText = 'OPTIMIZATION: ' + (isPerformanceMode ? 'ON' : 'OFF');
    renderer.shadowMap.enabled = !isPerformanceMode;
    env.setPerformanceMode(isPerformanceMode);
    if (gameStarted) env.generateCity(isMultiplayer ? roomName : 'offline-city');
};

const fovSlider = document.getElementById('fov-slider');
const distSlider = document.getElementById('dist-slider');
fovSlider.oninput = () => { camera.fov = parseInt(fovSlider.value); document.getElementById('fov-val').innerText = camera.fov; camera.updateProjectionMatrix(); };
distSlider.oninput = () => { const val = parseInt(distSlider.value); document.getElementById('dist-val').innerText = val; fog.density = 0.05 - (val / 100) * 0.05; };

window.startGame = (mode, param) => {
    isMultiplayer = (mode === 'mp'); gameStarted = true;
    if (isMultiplayer) connect(param); else { env.generateCity('offline-city'); startWaveLocal(1); }
    document.getElementById('main-menu').style.display = 'none';
    controls.lock();
};

window.joinCustomRoom = () => { window.startGame('mp', document.getElementById('room-input').value || 'room-'+Math.random()); };
window.switchRoom = () => { const room = document.getElementById('switch-room-id').value; if (room) { connect(room); window.toggleMenu('room-menu'); } };

controls.addEventListener('lock', () => { document.getElementById('hud').style.display = 'block'; document.getElementById('crosshair').style.display = 'block'; });
controls.addEventListener('unlock', () => {
    const menus = ['shop-menu', 'room-menu', 'settings-menu'];
    if (!menus.some(id => document.getElementById(id).classList.contains('menu-active')) && gameStarted) {
        document.getElementById('main-menu').style.display = 'flex';
    }
});

let socket;
function connect(room) {
    roomName = room; if (socket) socket.close();
    socket = new PartySocket({ host: window.location.host.includes('localhost') ? 'localhost:1999' : 'survival-fps-game-server.yourname.partykit.dev', room: room });
    setupSocket(); env.generateCity(room);
}

scene.add(new THREE.AmbientLight(0x404040, 2.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(50, 200, 50); sun.castShadow = true; scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshStandardMaterial({ color: 0x111111 }));
ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);
world.addBody(new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane(), quaternion: new CANNON.Quaternion().setFromEuler(-Math.PI/2, 0, 0) }));

const playerBody = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.6), position: new CANNON.Vec3(0, 20, 0), fixedRotation: true, linearDamping: 0.9 });
world.addBody(playerBody);

const otherPlayers = new Map(); const zombies = new Map();
const viewmodel = new THREE.Group(); camera.add(viewmodel); scene.add(camera);
const weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
weaponMesh.position.set(0.4, -0.4, -0.6); viewmodel.add(weaponMesh);

document.addEventListener('mousedown', (e) => { if (controls.isLocked && e.button === 0) attack(); });

function attack() {
    if (!canAttack || myHP <= 0) return;
    canAttack = false; const w = weapons[currentWeapon];
    GSAP.to(viewmodel.position, { z: 0.15, duration: 0.08, yoyo: true, repeat: 1 });
    if (currentWeapon === 3) { const flash = new THREE.PointLight(0xffaa00, 15, 6); flash.position.set(0.4, -0.4, -1.0); viewmodel.add(flash); setTimeout(() => viewmodel.remove(flash), 50); }
    const raycaster = new THREE.Raycaster(); raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(Array.from(zombies.values()), true);
    if (intersects.length > 0 && intersects[0].distance <= w.range) {
        let obj = intersects[0].object; while(obj.parent && !obj.zombieId) obj = obj.parent;
        if (obj.zombieId) {
            particles.createExplosion(intersects[0].point, 0x880000, 15);
            if (isMultiplayer && socket) socket.send(JSON.stringify({ type: 'hitZombie', zombieId: obj.zombieId, damage: w.damage }));
            else damageZombieLocal(obj.zombieId, w.damage);
        }
    }
    setTimeout(() => canAttack = true, w.cooldown);
}

function setupSocket() {
    socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'init' || data.type === 'waveStart') { wave = data.wave; document.getElementById('wave').innerText = wave; }
        if (data.type === 'playerUpdate') {
            let p = otherPlayers.get(data.id);
            if (!p) { p = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x0000ff })); scene.add(p); otherPlayers.set(data.id, p); }
            p.position.lerp(new THREE.Vector3(data.pos.x, data.pos.y, data.pos.z), 0.2); p.quaternion.copy(data.rot);
        }
        if (data.type === 'zombieSpawn' || data.type === 'zombieSync') { (data.zombies || [data.zombie]).forEach(spawnZombieClient); }
        if (data.type === 'zombieUpdate') { data.zombies.forEach(zData => { const z = zombies.get(zData.id); if (z) { z.position.lerp(new THREE.Vector3(zData.pos.x, zData.pos.y, zData.pos.z), 0.15); z.lookAt(playerBody.position.x, 0, playerBody.position.z); } }); }
        if (data.type === 'damagePlayer') { myHP -= data.amount; document.getElementById('hp').innerText = Math.max(0, Math.floor(myHP)); if (myHP <= 0) { alert("YOU DIED!"); location.reload(); } }
        if (data.type === 'zombieDeath') { const z = zombies.get(data.id); if (z) { scene.remove(z); zombies.delete(data.id); } if (data.killerId === socket.id) { myPoints += 100; document.getElementById('points').innerText = myPoints; } }
        if (data.type === 'playerLeft') { const p = otherPlayers.get(data.id); if(p) scene.remove(p); otherPlayers.delete(data.id); }
    };
}

function spawnZombieClient(zData) {
    if (zombies.has(zData.id)) return;
    const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: 0x113311 });
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), mat); h.position.y = 1.6;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.4), mat); b.position.y = 0.8;
    g.add(h, b); g.position.set(zData.pos.x, zData.pos.y, zData.pos.z); g.zombieId = zData.id;
    scene.add(g); zombies.set(zData.id, g);
}

function damageZombieLocal(id, dmg) {
    const z = zombies.get(id);
    if (z) { z.hp = (z.hp || 50) - dmg; if (z.hp <= 0) { scene.remove(z); zombies.delete(id); myPoints += 100; document.getElementById('points').innerText = myPoints; if (zombies.size === 0) startWaveLocal(wave + 1); } }
}
function startWaveLocal(w) {
    wave = w; document.getElementById('wave').innerText = wave;
    for (let i = 0; i < wave * 6; i++) {
        const angle = Math.random() * Math.PI * 2; const dist = 45 + Math.random() * 20;
        spawnZombieClient({ id: 'local_'+Math.random(), pos: { x: Math.cos(angle)*dist, y: 0, z: Math.sin(angle)*dist } });
    }
}

window.buyItem = (item, cost) => {
    if (myPoints >= cost) {
        if (item === 'health') { myHP = Math.min(100, myHP + 50); document.getElementById('hp').innerText = Math.floor(myHP); window.showNotification("HP RESTORED"); }
        else { const id = item === 'knife' ? 2 : 3; weapons[id].owned = true; window.showNotification(weapons[id].name.toUpperCase() + " PURCHASED"); }
        myPoints -= cost; document.getElementById('points').innerText = myPoints;
    } else alert("Not enough points!");
};

const move = { f: 0, b: 0, l: 0, r: 0, s: 1 };
window.onkeydown = (e) => {
    if (e.code === 'KeyW') move.f = 1; if (e.code === 'KeyS') move.b = 1; if (e.code === 'KeyA') move.l = 1; if (e.code === 'KeyD') move.r = 1;
    if (e.code === 'ShiftLeft') move.s = 2.4;
    if (e.code.startsWith('Digit')) { const id = parseInt(e.code.slice(-1)); if (weapons[id]?.owned) { currentWeapon = id; document.getElementById('weapon').innerText = weapons[id].name; } }
    if (e.code === 'Space' && Math.abs(playerBody.velocity.y) < 0.1) playerBody.velocity.y = 5.8;
    if (e.code === 'KeyB') window.toggleMenu('shop-menu'); if (e.code === 'KeyM') window.toggleMenu('room-menu');
    if (e.code === 'Tab') { e.preventDefault(); window.toggleMenu('settings-menu'); }
};
window.onkeyup = (e) => {
    if (e.code === 'KeyW') move.f = 0; if (e.code === 'KeyS') move.b = 0; if (e.code === 'KeyA') move.l = 0; if (e.code === 'KeyD') move.r = 0; if (e.code === 'ShiftLeft') move.s = 1;
};

function loop() {
    requestAnimationFrame(loop);
    world.fixedStep(); particles.update(0.016);
    if (controls.isLocked && myHP > 0) {
        const speed = 7.5 * move.s;
        const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion); const rgt = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
        fwd.y = 0; rgt.y = 0; fwd.normalize(); rgt.normalize();
        const vel = new THREE.Vector3().addScaledVector(fwd, move.f - move.b).addScaledVector(rgt, move.r - move.l);
        if (vel.length() > 0) { vel.normalize().multiplyScalar(speed); playerBody.velocity.x = vel.x; playerBody.velocity.z = vel.z; }
        else { playerBody.velocity.x *= 0.85; playerBody.velocity.z *= 0.85; }
        if (isMultiplayer && socket) socket.send(JSON.stringify({ type: 'move', pos: playerBody.position, rot: camera.quaternion }));
        if (!isMultiplayer) {
            zombies.forEach((zMesh) => {
                const dist = zMesh.position.distanceTo(playerBody.position);
                if (dist < 60) {
                    const dir = new THREE.Vector3().subVectors(playerBody.position, zMesh.position).normalize();
                    zMesh.position.addScaledVector(dir, 0.06); zMesh.lookAt(playerBody.position.x, 0, playerBody.position.z);
                    if (dist < 1.4 && Math.random() < 0.015) { myHP -= 0.8; document.getElementById('hp').innerText = Math.max(0, Math.floor(myHP)); if (myHP <= 0) { alert("YOU DIED!"); location.reload(); } }
                }
            });
        }
    }
    camera.position.copy(playerBody.position); camera.position.y += 0.9;
    renderer.render(scene, camera);
}
loop();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
