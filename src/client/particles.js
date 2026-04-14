import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    createExplosion(position, color = 0xff4400, count = 20) {
        for (let i = 0; i < count; i++) {
            const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const material = new THREE.MeshBasicMaterial({ color });
            const p = new THREE.Mesh(geometry, material);
            p.position.copy(position);

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random()) * 0.2,
                (Math.random() - 0.5) * 0.2
            );

            this.particles.push({ mesh: p, velocity, life: 1.0 });
            this.scene.add(p);
        }
    }

    update(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.add(p.velocity);
            p.velocity.y -= 0.005; // Gravity
            p.life -= delta * 2;
            p.mesh.scale.setScalar(p.life);

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    }
}
