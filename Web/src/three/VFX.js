/**
 * Web/src/three/VFX.js
 * ============================================================================
 * [THREE.JS FUNDAMENTAL 4]: HỆ THỐNG HẠT NỔ VFX (PARTICLE SYSTEMS)
 * 
 * Tài liệu học tập Three.js:
 *  1. THREE.Points & BufferGeometry:
 *     - Tạo hàng trăm hạt bụi ánh sáng chỉ bằng một lần gọi Draw Call (siêu nhẹ).
 *     - Mỗi hạt lưu vị trí (x, y, z) và vận tốc (vx, vy, vz).
 *  2. Vòng Đời Của Hạt (Particle Lifetime):
 *     - Mỗi frame: Cập nhật toạ độ dựa trên vận tốc + trọng lực.
 *     - Giảm kích thước hoặc độ mờ (opacity) cho đến khi biến mất.
 *     - Tự động huỷ (Dispose geometry/material) để tránh rò rỉ bộ nhớ GPU (Memory Leak).
 * ============================================================================
 */

import { events } from '../core/EventBus.js';

export class VFXManager {
    constructor(engine) {
        this.engine = engine;
        this.scene = engine.scene;
        this.emitters = [];

        this.initEventListeners();
    }

    initEventListeners() {
        // Khi nổ khối match-3 -> Bắn pháo hoa hạt
        events.on('match_shatter', ({ matches }) => {
            matches.forEach(m => {
                this.spawnShatterParticles(m.color);
            });
        });

        // Khi Boss dính đòn -> Bắn tia lửa điện
        events.on('damage_dealt', () => {
            this.spawnHitSparks(2.8, 1.8, -1.5, 0xff0055);
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
        points.position.set(0, 0, 4.0);
        this.scene.add(points);

        this.emitters.push({
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
        this.scene.add(points);

        this.emitters.push({
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
                // Hết vòng đời -> Thu hồi bộ nhớ
                this.scene.remove(em.points);
                em.geo.dispose();
                em.mat.dispose();
                this.emitters.splice(i, 1);
                continue;
            }

            em.mat.opacity = em.life / 0.45;
            const posAttr = em.geo.attributes.position;
            const arr = posAttr.array;

            for (let j = 0; j < em.velocities.length; j++) {
                const vel = em.velocities[j];
                arr[j * 3] += vel.x * delta;
                arr[j * 3 + 1] += vel.y * delta;
                arr[j * 3 + 2] += vel.z * delta;

                vel.y -= 9.8 * delta; // Trọng lực rơi
            }

            posAttr.needsUpdate = true;
        }
    }
}
