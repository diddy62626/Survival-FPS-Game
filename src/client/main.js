import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import GSAP from 'gsap';
import PartySocket from 'partysocket';
import { ParticleSystem } from './particles.js';
import { EnvironmentManager } from './environment.js';
import { UIEffectsManager } from './ui_effects.js';
import { EnemyFactory } from './enemy_factory.js';

let isMultiplayer = false, myPoints = 0, myHP = 100, maxHP = 100, currentWeapon = 1, canAttack = true, wave = 1;
let enemiesRemaining = 0, totalEnemiesInWave = 0, enemiesKilledInWave = 0;
let roomName = 'main-room', isPerformanceMode = false, gameStarted = false, physicsPaused = false;
let moveSpeed = 8, damageMult = 1.0, fireRateMult = 1.0;
let mapSeed = Math.floor(Math.random() * 999999);

const weapons = {
    1: { name: 'Fist', range: 3, damage: 15, cooldown: 400, owned: true },
    2: { name: 'Knife', range: 4, damage: 45, cooldown: 300, owned: false },
    3: { name: 'Pistol', range: 150, damage: 60, cooldown: 500, owned: false }
};

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050505);
const fog = new THREE.FogExp2(0x050505, 0.01); scene.fog = fog;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -25, 0) });
const playerBody = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.6), position: new CANNON.Vec3(0, 50, 0), fixedRotation: true, linearDamping: 0.95 });
world.addBody(playerBody);

const viewmodel = new THREE.Group();
const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.7), new THREE.MeshStandardMaterial({ color: 0x222222 }));
gunMesh.position.set(0.4, -0.4, -0.6);
viewmodel.add(gunMesh);
camera.add(viewmodel); scene.add(camera);
const viewLight = new THREE.PointLight(0x00ffcc, 1, 5);
viewLight.position.set(0.5, -0.2, -0.5);
viewmodel.add(viewLight);

const particles = new ParticleSystem(scene);
const enemyFactory = new EnemyFactory();
const env = new EnvironmentManager(scene, world);
const fx = new UIEffectsManager(scene, camera);
const controls = new PointerLockControls(camera, document.body);

window.tryLockMouse = () => { if (gameStarted) { physicsPaused = false; controls.lock(); } };
window.unlockMouse = () => { if (gameStarted) { physicsPaused = true; playerBody.velocity.set(0,0,0); controls.unlock(); } };

window.togglePerformance = () => {
    isPerformanceMode = !isPerformanceMode;
    document.getElementById('perf-toggle').innerText = 'OPTIMIZATION: ' + (isPerformanceMode ? 'ON' : 'OFF');
    env.setPerformanceMode(isPerformanceMode);
    if (gameStarted) env.generateCity(isMultiplayer ? roomName : 'offline-' + mapSeed);
};

window.startGame = (mode, param) => {
    const sInput = document.getElementById('seed-input').value;
    if (sInput) mapSeed = parseInt(sInput) || mapSeed;
    isMultiplayer = (mode === 'mp'); gameStarted = true;
    env.setSeed(mapSeed.toString());
    const startY = env.getTerrainHeight(0, 0) + 15;
    playerBody.position.set(0, startY, 0); playerBody.velocity.set(0,0,0);
    env.updateChunks(playerBody.position);
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('crosshair').style.display = 'block';
    startWave(1);
    controls.lock();
};

window.joinCustomRoom = () => { window.startGame('mp', document.getElementById('room-input').value || 'room-'+Math.random()); };
window.switchRoom = () => { const room = document.getElementById('switch-room-id').value; if (room) { connect(room); window.toggleMenu('room-menu'); } };

function startWave(w) {
    wave = w; enemiesKilledInWave = 0; totalEnemiesInWave = 5 + wave * 5; enemiesRemaining = totalEnemiesInWave;
    updateHUD();
    for (let i = 0; i < totalEnemiesInWave; i++) setTimeout(spawnEnemy, i * 1000);
}

const zombies = new Map();
function spawnEnemy() {
    const id = 'z_' + Math.random();
    const angle = Math.random() * Math.PI * 2; const dist = 80;
    const types = ["scout", "brute", "stalker", "spiker", "tank"];
    const type = types[Math.floor(Math.random() * types.length)];
    const data = {
        id, type,
        pos: { x: Math.cos(angle)*dist, y: env.getTerrainHeight(Math.cos(angle)*dist, Math.sin(angle)*dist) + 0.1, z: Math.sin(angle)*dist },
        hp: 50 + wave * 25,
        maxHp: 50 + wave * 25,
        speed: 0.08 + Math.random() * 0.05,
        damage: 10 + wave * 2,
        gold: 100,
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.4).getHex()
    };

    const g = enemyFactory.createEnemyGroup(type, data);

    const hbGroup = new THREE.Group();
    const hbBg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.15), new THREE.MeshBasicMaterial({color: 0x000000}));
    const hbFg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.15), new THREE.MeshBasicMaterial({color: 0x00ff00}));
    hbFg.position.z = 0.01; hbGroup.add(hbBg, hbFg); hbGroup.position.y = (g.userData.height || 2) + 0.5; g.add(hbGroup);
    g.hpBar = hbFg; g.hbGroup = hbGroup;

    g.position.set(data.pos.x, data.pos.y, data.pos.z); g.userData = data; g.zombieId = id;
    scene.add(g); zombies.set(id, g);
}

function updateHUD() {
    document.getElementById('hp').innerText = Math.floor(myHP);
    document.getElementById('points').innerText = myPoints;
    document.getElementById('wave').innerText = wave;
    document.getElementById('enemies-left').innerText = enemiesRemaining + " REMAINING";
    const progress = (enemiesKilledInWave / totalEnemiesInWave) * 100;
    const wp = document.getElementById('wave-progress');
    if(wp) wp.style.width = progress + "%";
}

document.addEventListener('mousedown', (e) => { if (controls.isLocked && e.button === 0) attack(); });

function attack() {
    if (!canAttack || myHP <= 0 || physicsPaused) return;
    canAttack = false; const w = weapons[currentWeapon];

    GSAP.to(viewmodel.position, { z: 0.2, duration: 0.1, yoyo: true, repeat: 1 });
    GSAP.to(viewmodel.rotation, { x: -0.2, duration: 0.1, yoyo: true, repeat: 1 });

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({x:0, y:0}, camera);
    const intersects = raycaster.intersectObjects(Array.from(zombies.values()), true);

    if (intersects.length > 0 && intersects[0].distance < w.range) {
        let obj = intersects[0].object;
        while(obj.parent && !obj.zombieId) obj = obj.parent;
        if (obj.zombieId) {
            const dmg = w.damage * damageMult;
            obj.userData.hp -= dmg;
            particles.createExplosion(intersects[0].point, 0x880000, 15);
            fx.spawnText(intersects[0].point, Math.floor(dmg), '#ff0000', 'damage');

            const pct = obj.userData.hp / obj.userData.maxHp;
            obj.hpBar.scale.x = Math.max(0, pct);
            obj.hpBar.material.color.set(pct > 0.5 ? 0x00ff00 : (pct > 0.2 ? 0xffff00 : 0xff0000));

            if (obj.userData.hp <= 0) {
                myPoints += obj.userData.gold; enemiesKilledInWave++; enemiesRemaining--;
                fx.spawnText(obj.position, "+" + obj.userData.gold, '#00ccff', 'gold');
                scene.remove(obj); zombies.delete(obj.zombieId);
                updateHUD();
                if (enemiesRemaining <= 0) setTimeout(() => startWave(wave + 1), 3000);
            }
        }
    }
    setTimeout(() => canAttack = true, w.cooldown / fireRateMult);
}

window.buyItem = (item, cost) => {
    if (myPoints >= cost) {
        myPoints -= cost;
        if (item === 'health') myHP = Math.min(maxHP, myHP + 50);
        else if (item === 'maxhp') { maxHP += 50; myHP += 50; }
        else if (item === 'speed') moveSpeed += 1;
        else if (item === 'damage') damageMult += 0.2;
        updateHUD(); window.showNotification("UPGRADE PURCHASED");
    } else alert("INSUFFICIENT CREDITS");
};

const clock = new THREE.Clock();
function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!physicsPaused && gameStarted) {
        world.step(1/60, dt);
        if (controls.isLocked) {
            const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
            const rgt = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
            fwd.y = 0; rgt.y = 0; fwd.normalize(); rgt.normalize();
            let vx = 0, vz = 0;
            if (keys['KeyW']) { vx += fwd.x; vz += fwd.z; } if (keys['KeyS']) { vx -= fwd.x; vz -= fwd.z; }
            if (keys['KeyA']) { vx -= rgt.x; vz -= rgt.z; } if (keys['KeyD']) { vx += rgt.x; vz += rgt.z; }
            const mag = Math.sqrt(vx*vx + vz*vz);
            if(mag > 0) {
                playerBody.velocity.x = (vx/mag) * moveSpeed;
                playerBody.velocity.z = (vz/mag) * moveSpeed;
            } else {
                playerBody.velocity.x *= 0.8; playerBody.velocity.z *= 0.8;
            }
            const ty = env.getTerrainHeight(playerBody.position.x, playerBody.position.z);
            if (playerBody.position.y < ty + 1.2) { playerBody.position.y = ty + 1.2; playerBody.velocity.y = 0; }
        }
        env.updateChunks(playerBody.position);
        zombies.forEach(z => {
            const dist = z.position.distanceTo(playerBody.position);
            const gy = env.getTerrainHeight(z.position.x, z.position.z);
            z.position.y = gy;
            const dir = new THREE.Vector3().subVectors(playerBody.position, z.position).normalize();
            z.position.addScaledVector(dir, z.userData.speed);
            z.lookAt(playerBody.position.x, z.position.y, playerBody.position.z);
            z.hbGroup.lookAt(camera.position);
            if (dist < 2.5 && Math.random() < 0.05) { myHP -= 0.1; updateHUD(); if(myHP <= 0) location.reload(); }
        });
    }
    camera.position.set(playerBody.position.x, playerBody.position.y + 1, playerBody.position.z);
    fx.update(); particles.update(dt); renderer.render(scene, camera);
}

const keys = {};
window.onkeydown = (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyB') window.toggleMenu('shop-menu');
    if (e.code === 'Tab') { e.preventDefault(); window.toggleMenu('settings-menu'); }
    if (e.code === 'Escape') { window.unlockMouse(); document.getElementById('main-menu').style.display = 'block'; document.getElementById('hud').style.display = 'none'; document.getElementById('crosshair').style.display = 'none'; window.showSubPanel('primary-panel'); }
};
window.onkeyup = (e) => keys[e.code] = false;

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);
loop();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
