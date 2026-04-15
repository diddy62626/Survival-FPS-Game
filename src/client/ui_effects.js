import * as THREE from 'three';

const ICONS = {
    damage: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4C10.4772 4 6 8.47715 6 14C6 17.25 7.5 20.25 10 22V26C10 27.1046 10.8954 28 12 28H20C21.1046 28 22 27.1046 22 26V22C24.5 20.25 26 17.25 26 14C26 8.47715 21.5228 4 16 4Z" fill="#FF0000" stroke="#880000" stroke-width="1.5"/>
        <circle cx="12" cy="14" r="2" fill="black"/>
        <circle cx="20" cy="14" r="2" fill="black"/>
        <path d="M14 22H18" stroke="black" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    gold: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4L28 16L16 28L4 16L16 4Z" fill="#00FFFF" stroke="#008888" stroke-width="2"/>
        <path d="M16 8L24 16L16 24L8 16L16 8Z" fill="#FFFFFF" fill-opacity="0.4"/>
    </svg>`
};

export class UIEffectsManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.effects = [];
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none';
        this.container.style.overflow = 'hidden';
        this.container.style.zIndex = '100';
        document.body.appendChild(this.container);
    }

    spawnText(position, text, color, iconType) {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.color = color;
        el.style.fontFamily = "'Orbitron', sans-serif";
        el.style.fontWeight = '900';
        el.style.fontSize = '28px';
        el.style.textShadow = '0 0 10px ' + color;
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '8px';
        el.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';

        const iconSvg = ICONS[iconType] || iconType;
        el.innerHTML = `<div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center;">${iconSvg}</div> ${text}`;

        this.container.appendChild(el);

        const effect = {
            el,
            pos: position.clone(),
            startTime: performance.now(),
            duration: 800,
            offsetY: 0
        };

        this.effects.push(effect);
    }

    update() {
        const now = performance.now();
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const fx = this.effects[i];
            const elapsed = now - fx.startTime;
            const progress = elapsed / fx.duration;

            if (progress >= 1) {
                if (fx.el.parentNode) this.container.removeChild(fx.el);
                this.effects.splice(i, 1);
                continue;
            }

            const vector = fx.pos.clone();
            vector.y += 2 + progress * 4;
            vector.project(this.camera);

            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

            fx.el.style.left = `${x}px`;
            fx.el.style.top = `${y}px`;
            fx.el.style.opacity = 1 - progress;
            fx.el.style.transform = `translate(-50%, -50%) scale(${1 + progress})`;

            if (vector.z > 1) {
                fx.el.style.display = 'none';
            } else {
                fx.el.style.display = 'flex';
            }
        }
    }
}
