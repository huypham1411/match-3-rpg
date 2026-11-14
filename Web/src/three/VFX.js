/**
 * Web/src/three/VFX.js
 * ============================================================================
 * [THREE.JS FUNDAMENTAL 4]: HỆ THỐNG HẠT NỔ VFX (PARTICLE SYSTEMS)
 * Phục vụ cả 2 miền không gian: ArenaScene và BoardScene
 * ============================================================================
 */

import { events } from '../core/EventBus.js';

export class VFXManager {
    constructor(arenaEngine, boardEngine) {
        this.arenaEngine = arenaEngine;
        this.boardEngine = boardEngine || arenaEngine;
        this.arenaScene = this.arenaEngine ? this.arenaEngine.scene : null;
        this.boardScene = this.boardEngine ? this.boardEngine.scene : null;
        this.emitters = [];

        this.initEventListeners();
    }

    initEventListeners() {
        // Khi nổ khối match-3 -> Bắn pháo hoa hạt trong bàn cờ
        events.on('match_shatter', ({ matches }) => {
            matches.forEach(m => {
                this.spawnShatterParticles(m.color);
            });
        });

        // Khi Boss dính đòn -> Bắn tia lửa điện tại tâm Boss trên sàn đấu
        events.on('damage_dealt', () => {
            this.spawnHitSparks(0, 1.8, -1.8, 0xff0055);
        });
    }

    /** Tạo vụ nổ hạt màu khi khối match-3 vỡ */
    spawnShatterParticles(colorId) {
        const count = 35;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 1.5;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

            velocities.push({
                x: (Math.random() - 0.5) * 6.0,
                y: (Math.random() * 5.0) + 1.0,
                z: (Math.random() - 0.5) * 6.0
            });
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0x00f0ff,
            size: 0.22,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(geo, mat);
        points.position.set(0, 0, 0);
        if (this.boardScene) this.boardScene.add(points);

        this.emitters.push({
            scene: this.boardScene,
            points,
            geo,
            mat,
            velocities,
            life: 0.45
        });
    }

    /** Tạo tia lửa va chạm tại toạ độ 3D */
    spawnHitSparks(x, y, z, colorHex) {
        const count = 25;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            velocities.push({
                x: (Math.random() - 0.5) * 8.0,
                y: (Math.random() - 0.5) * 8.0,
                z: (Math.random() - 0.5) * 8.0
            });
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: colorHex,
            size: 0.28,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(geo, mat);
        points.position.set(x, y, z);
        if (this.arenaScene) this.arenaScene.add(points);

        this.emitters.push({
            scene: this.arenaScene,
            points,
            geo,
            mat,
            velocities,
            life: 0.35
        });
    }

    /** Cập nhật chuyển động hạt mỗi frame */
    update(delta) {
        for (let i = this.emitters.length - 1; i >= 0; i--) {
            const em = this.emitters[i];
            em.life -= delta;

            if (em.life <= 0) {
                if (em.scene) em.scene.remove(em.points);
                em.geo.dispose();
                em.mat.dispose();
                this.emitters.splice(i, 1);
                continue;
            }

            const positions = em.geo.attributes.position.array;
            for (let j = 0; j < em.velocities.length; j++) {
                positions[j * 3] += em.velocities[j].x * delta;
                positions[j * 3 + 1] += em.velocities[j].y * delta;
                positions[j * 3 + 2] += em.velocities[j].z * delta;

                // Trọng lực kéo xuống
                em.velocities[j].y -= 9.8 * delta;
            }
            em.geo.attributes.position.needsUpdate = true;
            em.mat.opacity = em.life / 0.45;
        }
    }
}
