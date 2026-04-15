import * as THREE from 'three';

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
        this.container.style.zIndex = '50';
        document.body.appendChild(this.container);
    }

    spawnText(position, text, color, icon) {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.color = color;
        el.style.fontFamily = "'Orbitron', sans-serif";
        el.style.fontWeight = '900';
        el.style.fontSize = '24px';
        el.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '5px';
        el.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        el.innerHTML = `<span>${icon}</span> ${text}`;

        this.container.appendChild(el);

        const effect = {
            el,
            pos: position.clone(),
            startTime: performance.now(),
            duration: 500,
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
                this.container.removeChild(fx.el);
                this.effects.splice(i, 1);
                continue;
            }

            // Project 3D position to 2D screen
            const vector = fx.pos.clone();
            vector.y += 2 + progress * 2; // Float upwards
            vector.project(this.camera);

            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

            fx.el.style.left = `${x}px`;
            fx.el.style.top = `${y}px`;
            fx.el.style.opacity = 1 - progress;
            fx.el.style.transform = `translate(-50%, -50%) scale(${1 + progress * 0.5})`;

            // Hide if behind camera
            if (vector.z > 1) {
                fx.el.style.display = 'none';
            } else {
                fx.el.style.display = 'flex';
            }
        }
    }
}
