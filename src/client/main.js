import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import GSAP from 'gsap';
import PartySocket from 'partysocket';
import { ParticleSystem } from './particles.js';
import { EnvironmentManager } from './environment.js';
import { UIEffectsManager } from './ui_effects.js';

let isMultiplayer = false, myPoints = 0, myHP = 100, maxHP = 100, currentWeapon = 1, canAttack = true, wave = 1;
let enemiesRemaining = 0, totalEnemiesInWave = 0, enemiesKilledInWave = 0;
let roomName = 'main-room', isPerformanceMode = false, gameStarted = false, physicsPaused = false;
let moveSpeed = 8, damageMult = 1.0, goldMult = 1.0, fireRateMult = 1.0;
let mapSeed = Math.floor(Math.random() * 999999);

const weapons = {
    1: { name: 'Fist', range: 2.5, damage: 15, cooldown: 400, owned: true },
    2: { name: 'Knife', range: 3.5, damage: 45, cooldown: 300, owned: false },
    3: { name: 'Pistol', range: 120, damage: 60, cooldown: 500, owned: false }
};

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050505);
const fog = new THREE.FogExp2(0x050505, 0.01); scene.fog = fog;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
const playerBody = new CANNON.Body({
    mass: 1, shape: new CANNON.Sphere(0.6), position: new CANNON.Vec3(0, 50, 0),
    fixedRotation: true, linearDamping: 0.95
});
world.addBody(playerBody);

const viewmodel = new THREE.Group();
camera.add(viewmodel);
scene.add(camera);
const weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
weaponMesh.position.set(0.4, -0.4, -0.6);
viewmodel.add(weaponMesh);

const particles = new ParticleSystem(scene);
const env = new EnvironmentManager(scene, world);
const fx = new UIEffectsManager(scene, camera);
const controls = new PointerLockControls(camera, document.body);

let savedPos = new CANNON.Vec3();
window.tryLockMouse = () => { if (gameStarted) { physicsPaused = false; controls.lock(); } };
window.unlockMouse = () => { if (gameStarted) { physicsPaused = true; playerBody.velocity.set(0,0,0); controls.unlock(); } };

window.toggleMenu = (id) => {
    const el = document.getElementById(id);
    const isOpening = !el.classList.contains('menu-active');
    document.querySelectorAll('.cyber-modal').forEach(m => m.classList.remove('menu-active'));
    if (isOpening) {
        el.classList.add('menu-active');
        window.unlockMouse();
    } else {
        window.tryLockMouse();
    }
};

window.togglePerformance = () => {
    isPerformanceMode = !isPerformanceMode;
    document.getElementById('perf-toggle').innerText = 'OPTIMIZATION: ' + (isPerformanceMode ? 'ON' : 'OFF');
    env.setPerformanceMode(isPerformanceMode);
};

const fovSlider = document.getElementById('fov-slider');
fovSlider.oninput = () => { camera.fov = parseInt(fovSlider.value); document.getElementById('fov-val').innerText = camera.fov; camera.updateProjectionMatrix(); };

window.startGame = (mode, param) => {
    const sInput = document.getElementById('seed-input').value;
    if (sInput) mapSeed = parseInt(sInput) || mapSeed;
    isMultiplayer = (mode === 'mp'); gameStarted = true;
    env.setSeed(mapSeed.toString());
    if (isMultiplayer) connect(param);
    else { startWave(1); }
    document.getElementById('main-menu').style.opacity = '0';
    setTimeout(() => document.getElementById('main-menu').style.display = 'none', 500);
    controls.lock();
};

function startWave(w) {
    wave = w; enemiesKilledInWave = 0; totalEnemiesInWave = 5 + wave * 5; enemiesRemaining = totalEnemiesInWave;
    showBanner("WAVE " + wave + " STARTING"); updateHUD();
    for (let i = 0; i < totalEnemiesInWave; i++) setTimeout(() => spawnEnemy(), i * 1000);
}

function showBanner(text) {
    const b = document.createElement('div');
    b.style = "position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); color:#00ff66; font-family:Orbitron; font-size:4em; font-weight:900; z-index:20000; pointer-events:none; text-shadow:0 0 20px #000;";
    b.innerText = text; document.body.appendChild(b);
    GSAP.to(b, { opacity: 0, duration: 2, delay: 1, onComplete: () => b.remove() });
}

const enemyNames = ["Zombie", "Rat", "Goblin", "Skeleton", "Crow", "Slime", "Bat", "Wild Dog", "Bandit", "Ghoul", "Orc", "Troll", "Werewolf", "Wyvern", "Golem", "Giant", "Demon"];
const zombies = new Map();

function spawnEnemy() {
    const tier = wave <= 3 ? 1 : (wave <= 8 ? 2 : 3);
    const typeIdx = Math.floor(Math.random() * enemyNames.length);
    const name = enemyNames[typeIdx];

    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 40;
    const id = 'enemy_' + Math.random();

    const data = {
        id,
        pos: { x: Math.cos(angle)*dist, y: 50, z: Math.sin(angle)*dist },
        hp: (50 + wave * 20) * (tier * 0.5 + 0.5),
        maxHp: (50 + wave * 20) * (tier * 0.5 + 0.5),
        speed: 0.05 + Math.random() * 0.05,
        damage: 5 + tier * 5,
        gold: 50 + tier * 50,
        color: new THREE.Color().setHSL(Math.random(), 0.6, 0.4).getHex(),
        scale: 0.5 + Math.random() * 1.5,
        name
    };

    spawnEnemyClient(data);
}

function spawnEnemyClient(data) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: data.color });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.8 * data.scale, 1.8 * data.scale, 0.5 * data.scale), mat);
    b.position.y = (1.8 * data.scale) / 2;
    group.add(b);

    const hbGroup = new THREE.Group();
    const hbBg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.15), new THREE.MeshBasicMaterial({color:0x000000}));
    const hbFg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.15), new THREE.MeshBasicMaterial({color:0x00ff00}));
    hbFg.position.z = 0.01;
    hbGroup.add(hbBg, hbFg);
    hbGroup.position.y = 2.2 * data.scale;
    group.add(hbGroup);

    group.position.set(data.pos.x, 20, data.pos.z);
    group.userData = data;
    group.hpBar = hbFg;
    group.hpBarGroup = hbGroup;
    group.zombieId = data.id;

    scene.add(group);
    zombies.set(data.id, group);
}

function updateHUD() {
    document.getElementById('hp').innerText = Math.floor(myHP);
    document.getElementById('points').innerText = myPoints;
    document.getElementById('wave').innerText = wave;
    document.getElementById('enemies-left').innerText = enemiesRemaining + " LEFT";
    const progress = (enemiesKilledInWave / totalEnemiesInWave) * 100;
    const wp = document.getElementById('wave-progress');
    if(wp) wp.style.width = progress + "%";
}

document.addEventListener('mousedown', (e) => { if (controls.isLocked && e.button === 0) attack(); });

function attack() {
    if (!canAttack || myHP <= 0 || physicsPaused) return;
    canAttack = false;
    const w = weapons[currentWeapon];
    GSAP.to(viewmodel.position, { z: 0.15, duration: 0.1, yoyo: true, repeat: 1 });

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({x:0, y:0}, camera);
    const intersects = raycaster.intersectObjects(Array.from(zombies.values()), true);

    if (intersects.length > 0 && intersects[0].distance < w.range) {
        let obj = intersects[0].object;
        while(obj.parent && !obj.zombieId) obj = obj.parent;
        if (obj.zombieId) {
            const dmg = w.damage * damageMult;
            obj.userData.hp -= dmg;
            particles.createExplosion(intersects[0].point, 0x880000, 10);
            fx.spawnText(intersects[0].point, Math.floor(dmg), '#ff0000', '💥');

            const pct = obj.userData.hp / obj.userData.maxHp;
            obj.hpBar.scale.x = Math.max(0, pct);
            obj.hpBar.material.color.set(pct > 0.5 ? 0x00ff00 : (pct > 0.2 ? 0xffff00 : 0xff0000));

            if (obj.userData.hp <= 0) {
                const gold = Math.floor(obj.userData.gold * goldMult);
                myPoints += gold;
                enemiesKilledInWave++;
                enemiesRemaining--;
                fx.spawnText(obj.position, "+" + gold, '#00ccff', '💎');
                scene.remove(obj);
                zombies.delete(obj.zombieId);
                if (enemiesRemaining <= 0) setTimeout(() => startWave(wave + 1), 3000);
            }
        }
    }
    setTimeout(() => canAttack = true, w.cooldown);
}

const clock = new THREE.Clock();
function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (!physicsPaused) {
        world.step(1/60, dt);

        if (controls.isLocked) {
            const speed = moveSpeed * (window.keys?.ShiftLeft ? 1.8 : 1);
            const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
            const rgt = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
            fwd.y = 0; rgt.y = 0; fwd.normalize(); rgt.normalize();

            let moveX = 0, moveZ = 0;
            if (window.keys?.KeyW) { moveX += fwd.x; moveZ += fwd.z; }
            if (window.keys?.KeyS) { moveX -= fwd.x; moveZ -= fwd.z; }
            if (window.keys?.KeyA) { moveX -= rgt.x; moveZ -= rgt.z; }
            if (window.keys?.KeyD) { moveX += rgt.x; moveZ += rgt.z; }

            const mag = Math.sqrt(moveX*moveX + moveZ*moveZ);
            if (mag > 0) {
                playerBody.velocity.x = (moveX/mag) * speed;
                playerBody.velocity.z = (moveZ/mag) * speed;
            } else {
                playerBody.velocity.x *= 0.8; playerBody.velocity.z *= 0.8;
            }

            const groundY = env.getTerrainHeight(playerBody.position.x, playerBody.position.z);
            if (playerBody.position.y < groundY + 1.2) {
                playerBody.position.y = groundY + 1.2;
                playerBody.velocity.y = Math.max(0, playerBody.velocity.y);
            }
        }
    }

    env.updateChunks(playerBody.position);

    zombies.forEach(z => {
        if (!physicsPaused) {
            const dist = z.position.distanceTo(playerBody.position);
            const gy = env.getTerrainHeight(z.position.x, z.position.z);
            z.position.y = gy;
            if (dist < 100) {
                const dir = new THREE.Vector3().subVectors(playerBody.position, z.position).normalize();
                z.position.addScaledVector(dir, z.userData.speed);
                z.lookAt(playerBody.position.x, z.position.y, playerBody.position.z);
                if (dist < 2 && Math.random() < 0.05) {
                    myHP -= z.userData.damage * 0.016; updateHUD();
                    if (myHP <= 0) location.reload();
                }
            }
        }
        z.hpBarGroup.lookAt(camera.position);
    });

    camera.position.set(playerBody.position.x, playerBody.position.y + 1, playerBody.position.z);
    particles.update(dt); fx.update();
    renderer.render(scene, camera);
}

window.keys = {};
window.onkeydown = (e) => {
    window.keys[e.code] = true;
    if (e.code === 'KeyB') window.toggleMenu('shop-menu');
    if (e.code === 'Tab') { e.preventDefault(); window.toggleMenu('settings-menu'); }
    if (e.code === 'Space' && Math.abs(playerBody.velocity.y) < 0.1) playerBody.velocity.y = 8;
    if (e.code.startsWith('Digit')) {
        const id = parseInt(e.code.slice(-1));
        if (weapons[id]?.owned) { currentWeapon = id; document.getElementById('weapon').innerText = weapons[id].name; }
    }
};
window.onkeyup = (e) => window.keys[e.code] = false;

loop();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
