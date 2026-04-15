import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import GSAP from 'gsap';
import { ParticleSystem } from './particles.js';
import { EnvironmentManager } from './environment.js';
import { UIEffectsManager } from './ui_effects.js';

let isMultiplayer = false, myPoints = 0, myHP = 100, maxHP = 100, currentWeapon = 1, canAttack = true, wave = 1;
let enemiesRemaining = 0, totalEnemiesInWave = 0, enemiesKilledInWave = 0;
let gameStarted = false, physicsPaused = false, isPerformanceMode = false, moveSpeed = 8;

const weapons = { 1: { name: 'Fist', range: 2.5, damage: 15, cooldown: 400, owned: true }, 2: { name: 'Knife', range: 3.5, damage: 45, cooldown: 300, owned: false }, 3: { name: 'Pistol', range: 120, damage: 60, cooldown: 500, owned: false } };

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight); document.body.appendChild(renderer.domElement);

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
const playerBody = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.6), position: new CANNON.Vec3(0, 50, 0), fixedRotation: true, linearDamping: 0.9 });
world.addBody(playerBody);

const env = new EnvironmentManager(scene, world);
const fx = new UIEffectsManager(scene, camera);
const particles = new ParticleSystem(scene);
const controls = new PointerLockControls(camera, document.body);

const viewmodel = new THREE.Group(); camera.add(viewmodel); scene.add(camera);
const weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
weaponMesh.position.set(0.4, -0.4, -0.6); viewmodel.add(weaponMesh);

window.tryLockMouse = () => { if (gameStarted) { physicsPaused = false; controls.lock(); } };
window.unlockMouse = () => { if (gameStarted) { physicsPaused = true; playerBody.velocity.set(0,0,0); controls.unlock(); } };

window.startGame = (mode, param) => {
    console.log("Game started!");
    gameStarted = true;
    const seed = document.getElementById('seed-input').value || Math.random().toString();
    env.setSeed(seed);
    env.updateChunks(playerBody.position);
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('crosshair').style.display = 'block';
    startWave(1);
    controls.lock();
};

window.joinCustomRoom = () => { window.startGame('mp', document.getElementById('room-input').value); };

function startWave(w) {
    wave = w; totalEnemiesInWave = 5 + wave * 5; enemiesRemaining = totalEnemiesInWave; enemiesKilledInWave = 0;
    updateHUD();
    for (let i = 0; i < totalEnemiesInWave; i++) setTimeout(spawnEnemy, i * 1000);
}

const zombies = new Map();
function spawnEnemy() {
    const id = 'z_' + Math.random();
    const angle = Math.random() * Math.PI * 2; const dist = 60;
    const data = { id, pos: { x: Math.cos(angle)*dist, y: 10, z: Math.sin(angle)*dist }, hp: 50 + wave * 20, maxHp: 50 + wave * 20, speed: 0.08, color: 0x336633 };

    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.2), new THREE.MeshStandardMaterial({color: data.color}));
    m.position.y = 1.1; g.add(m);

    const hbGroup = new THREE.Group();
    const hbBg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.15), new THREE.MeshBasicMaterial({color: 0x000000}));
    const hbFg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.15), new THREE.MeshBasicMaterial({color: 0x00ff00}));
    hbFg.position.z = 0.01; hbGroup.add(hbBg, hbFg); hbGroup.position.y = 2.8; g.add(hbGroup);
    g.hpBar = hbFg; g.hpBarGroup = hbGroup;

    g.position.set(data.pos.x, 20, data.pos.z); g.userData = data; g.zombieId = id;
    scene.add(g); zombies.set(id, g);
}

function updateHUD() {
    document.getElementById('hp').innerText = Math.floor(myHP);
    document.getElementById('points').innerText = myPoints;
    document.getElementById('wave').innerText = wave;
    document.getElementById('enemies-left').innerText = enemiesRemaining;
    document.getElementById('wave-progress').style.width = (enemiesKilledInWave / totalEnemiesInWave * 100) + '%';
}

function loop() {
    requestAnimationFrame(loop);
    if (!physicsPaused && gameStarted) {
        world.step(1/60);
        if (controls.isLocked) {
            const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
            const rgt = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
            fwd.y = 0; rgt.y = 0; fwd.normalize(); rgt.normalize();
            let vx = 0, vz = 0;
            if (keys['KeyW']) { vx += fwd.x; vz += fwd.z; } if (keys['KeyS']) { vx -= fwd.x; vz -= fwd.z; }
            if (keys['KeyA']) { vx -= rgt.x; vz -= rgt.z; } if (keys['KeyD']) { vx += rgt.x; vz += rgt.z; }
            playerBody.velocity.x = vx * moveSpeed; playerBody.velocity.z = vz * moveSpeed;
            const ty = env.getTerrainHeight(playerBody.position.x, playerBody.position.z);
            if (playerBody.position.y < ty + 1.2) { playerBody.position.y = ty + 1.2; playerBody.velocity.y = 0; }
        }
        env.updateChunks(playerBody.position);
        zombies.forEach(z => {
            const dist = z.position.distanceTo(playerBody.position);
            const dir = new THREE.Vector3().subVectors(playerBody.position, z.position).normalize();
            z.position.addScaledVector(dir, z.userData.speed);
            z.position.y = env.getTerrainHeight(z.position.x, z.position.z);
            z.lookAt(playerBody.position.x, z.position.y, playerBody.position.z);
            z.hpBarGroup.lookAt(camera.position);
            if (dist < 2.5 && Math.random() < 0.05) { myHP -= 0.2; updateHUD(); if(myHP <= 0) location.reload(); }
        });
    }
    camera.position.set(playerBody.position.x, playerBody.position.y + 1, playerBody.position.z);
    fx.update(); renderer.render(scene, camera);
}

const keys = {};
window.onkeydown = (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyB') window.toggleMenu('shop-menu');
    if (e.code === 'Tab') { e.preventDefault(); window.toggleMenu('settings-menu'); }
    if (e.code === 'Space' && Math.abs(playerBody.velocity.y) < 0.1) playerBody.velocity.y = 10;
};
window.onkeyup = (e) => keys[e.code] = false;

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
loop();
