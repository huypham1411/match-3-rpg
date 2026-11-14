/**
 * Web/src/three/Diorama3D.js
 * ============================================================================
 * [THREE.JS FUNDAMENTAL 3]: SÂN KHẤU CHIẾN ĐẤU 3D & DIỄN HOẠ NHÂN VẬT
 * 
 * Tài liệu học tập Three.js:
 *  1. Hệ Thống Cây Phân Cấp (THREE.Group & Scene Graph):
 *     - Mỗi nhân vật là một `THREE.Group` chứa các bộ phận hình học (Thân, Đầu, Vũ khí, Hào quang).
 *     - Khi xoay hoặc di chuyển Group cha, tất cả bộ phận con sẽ chuyển động đồng bộ.
 *  2. Chuyển Động Tuần Hoàn Thủ Công (Procedural Idle Bobbing):
 *     - Dùng hàm lượng giác `Math.sin(elapsed * speed + offset)` để tạo cảm giác nhân vật thở
 *       hoặc trôi nổi lơ lửng tự nhiên mà không cần file hoạt ảnh bên ngoài.
 *  3. Hoạt Ảnh Phản Ứng Chiến Đấu (Combat Reactions):
 *     - Khi chém trúng: Nhân vật lướt tới trước (Lunge).
 *     - Boss bị dính đòn: Rung lắc ngẫu nhiên (Trauma Shake) và nhấp nháy phát sáng đỏ.
 * ============================================================================
 */

import { events } from '../core/EventBus.js';

export class Diorama3D {
    constructor(engine, gameState) {
        this.engine = engine;
        this.state = gameState;
        this.scene = engine.scene;

        this.stageGroup = new THREE.Group();
        this.scene.add(this.stageGroup);

        // Đặt sân khấu chiến đấu tại tâm điểm (0, 0, 0) của ArenaEngine riêng biệt
        this.stageGroup.position.set(0, 0, 0);

        this.heroes = [];
        this.boss = null;
        this.bossShakeTimer = 0;

        this.initStageFloor();
        this.buildHeroes();
        this.buildBoss();
        this.initEventListeners();
    }

    /** 1. Dựng sàn đấu tròn phong cách Cyberpunk Arena */
    initStageFloor() {
        const floorGeo = new THREE.CylinderGeometry(4.8, 5.2, 0.35, 32);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x131828,
            metalness: 0.85,
            roughness: 0.35
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.2;
        floor.receiveShadow = true;
        this.stageGroup.add(floor);

        // Vòng tròn ánh sáng đồng tâm trên sàn đấu
        const ringGeo = new THREE.RingGeometry(2.8, 2.95, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.02;
        this.stageGroup.add(ring);
    }

    /** 2. Dựng 4 Nhân vật Chuyên Trách (Attacker, Supporter, Healer, Defender) */
    buildHeroes() {
        const heroConfigs = [
            { name: 'Lôi Kiếm Sĩ (Attacker)', color: 0xef4444, x: -2.4, z: 1.0, weapon: 'blade' },
            { name: 'Tinh Linh (Supporter)', color: 0x8b5cf6, x: -0.8, z: 1.4, weapon: 'ring' },
            { name: 'Thánh Nữ (Healer)', color: 0x10b981, x: 0.8, z: 1.4, weapon: 'staff' },
            { name: 'Thiết Giáp (Defender)', color: 0x2563eb, x: 2.4, z: 1.0, weapon: 'shield' }
        ];

        heroConfigs.forEach((cfg, idx) => {
            const heroGroup = new THREE.Group();
            heroGroup.position.set(cfg.x, 0.8, cfg.z);

            // Thân nhân vật (Cylinder)
            const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.1, 16);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: cfg.color,
                metalness: 0.5,
                roughness: 0.3
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.castShadow = true;
            heroGroup.add(body);

            // Đầu nhân vật (Sphere)
            const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
            const headMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 0.85;
            heroGroup.add(head);

            // Vũ khí đặc trưng
            if (cfg.weapon === 'blade') {
                // Song kiếm năng lượng
                const bladeGeo = new THREE.BoxGeometry(0.08, 1.3, 0.15);
                const bladeMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
                const blade = new THREE.Mesh(bladeGeo, bladeMat);
                blade.position.set(0.5, 0.5, 0.3);
                blade.rotation.z = -Math.PI / 6;
                heroGroup.add(blade);
            } else if (cfg.weapon === 'shield') {
                // Khiên lục giác hạng nặng
                const shieldGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.1, 6);
                const shieldMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.9, roughness: 0.2 });
                const shield = new THREE.Mesh(shieldGeo, shieldMat);
                shield.position.set(0.45, 0.3, 0.4);
                shield.rotation.x = Math.PI / 2;
                heroGroup.add(shield);
            } else if (cfg.weapon === 'ring') {
                // Vòng pháp trận trôi nổi
                const ringGeo = new THREE.TorusGeometry(0.5, 0.05, 8, 24);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.set(0, 0.5, 0);
                ring.rotation.x = Math.PI / 2;
                heroGroup.add(ring);
            }

            this.stageGroup.add(heroGroup);
            this.heroes.push({
                group: heroGroup,
                baseX: cfg.x,
                baseY: 0.8,
                baseZ: cfg.z,
                offset: idx * 0.8
            });
        });
    }

    /** 3. Dựng Boss Sentinel Unit 07 (Mecha Titan với 2 Drone trôi nổi) */
    buildBoss() {
        this.bossGroup = new THREE.Group();
        this.bossGroup.position.set(0, 1.8, -1.8);

        // Khối thân chính (Octahedron / Khối đa diện Mecha)
        const coreGeo = new THREE.OctahedronGeometry(1.6, 1);
        this.bossMat = new THREE.MeshStandardMaterial({
            color: 0x991b1b,
            emissive: 0x450a0a,
            emissiveIntensity: 0.6,
            metalness: 0.85,
            roughness: 0.25
        });
        const bossCore = new THREE.Mesh(coreGeo, this.bossMat);
        bossCore.castShadow = true;
        this.bossGroup.add(bossCore);

        // Mắt năng lượng trung tâm
        const eyeGeo = new THREE.SphereGeometry(0.45, 16, 16);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(-0.9, 0.2, 0.8);
        this.bossGroup.add(eye);

        // 2 Drone Module trôi nổi 2 bên (Không cần xương, chuẩn ngân sách Web)
        this.drones = [];
        [-2.0, 2.0].forEach(offset => {
            const droneGeo = new THREE.ConeGeometry(0.4, 0.9, 4);
            const droneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
            const drone = new THREE.Mesh(droneGeo, droneMat);
            drone.position.set(offset, 1.2, 0);
            drone.rotation.x = Math.PI;
            this.bossGroup.add(drone);
            this.drones.push(drone);
        });

        this.stageGroup.add(this.bossGroup);
        this.boss = {
            group: this.bossGroup,
            baseX: 2.8,
            baseY: 1.8,
            baseZ: -1.5
        };
    }

    /** 4. Lắng nghe sự kiện để kích hoạt hiệu ứng hành động */
    initEventListeners() {
        // Hero lao tới chém
        events.on('damage_dealt', ({ hero }) => {
            const h = this.heroes[0]; // Attacker
            if (h) {
                // Lao tới trước 0.8 đơn vị
                h.group.position.x = h.baseX + 1.2;
                setTimeout(() => {
                    h.group.position.x = h.baseX;
                }, 180);
            }

            // Boss bị rung chấn (Trauma Shake)
            this.bossShakeTimer = 0.35;
            this.bossMat.emissiveIntensity = 2.0;
            setTimeout(() => {
                this.bossMat.emissiveIntensity = 0.6;
            }, 150);
        });

        // Boss bị vỡ Toughness (Break Stagger)
        events.on('stagger_broken', () => {
            this.bossMat.color.setHex(0x38bdf8); // Chuyển sang màu xanh đóng băng
            this.bossShakeTimer = 0.8;
        });

        events.on('stagger_recovered', () => {
            this.bossMat.color.setHex(0x991b1b); // Hồi phục màu đỏ
        });
    }

    /** 5. Vòng lặp cập nhật chuyển động Idle & Rung chấn mỗi frame */
    update(delta, elapsed) {
        // Diễn hoạt Hero thở bập bồng (Sine Wave)
        this.heroes.forEach(h => {
            h.group.position.y = h.baseY + Math.sin(elapsed * 2.5 + h.offset) * 0.08;
            h.group.rotation.y = Math.sin(elapsed * 1.2 + h.offset) * 0.05;
        });

        // Diễn hoạt Boss trôi nổi & Drone xoay quanh
        if (this.boss) {
            if (this.bossShakeTimer > 0) {
                this.bossShakeTimer -= delta;
                // Rung chấn ngẫu nhiên khi dính đòn
                this.boss.group.position.x = this.boss.baseX + (Math.random() - 0.5) * 0.25;
                this.boss.group.position.y = this.boss.baseY + (Math.random() - 0.5) * 0.25;
            } else {
                this.boss.group.position.x = this.boss.baseX;
                this.boss.group.position.y = this.boss.baseY + Math.sin(elapsed * 1.8) * 0.15;
            }

            // 2 Drone quay nhẹ
            this.drones.forEach((d, i) => {
                d.position.y = 1.2 + Math.sin(elapsed * 3.0 + i) * 0.18;
                d.rotation.y += delta * 1.5;
            });
        }
    }
}
