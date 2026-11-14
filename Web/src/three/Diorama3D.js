/**
 * Web/src/three/Diorama3D.js
 * ============================================================================
 * [CHIBI ANIME 3D BATTLE ARENA & CHARACTER ANIMATION ENGINE]
 * 
 * Thiết kế hoàn toàn mới theo chỉ thị của Game Director & Executive Producer:
 *  1. [CHIBI ANIME 3D HEROES]: 4 Nhân vật Chibi Anime tỉ lệ 1:2.5 chuẩn Gacha
 *     (Đầu to mắt tròn long lanh, tóc anime uốn lượn, giáp cyber chibi, vũ khí đặc trưng).
 *  2. [CHIBI ANIME BOSS TITAN]: Sentinel Unit 07 / Warden Aegis / Null Sovereign
 *     thiết kế theo phong cách Chibi Cyber-Mecha đáng yêu nhưng đầy uy lực.
 *  3. [FULL 5-STATE ANIMATION STATE MACHINE]:
 *     - Tấn công (Attack / Slash / Cast / Smash)
 *     - Bị tấn công (Hit / Flinch / Trauma Flash)
 *     - Tử trận (Die / Collapse / Ghost Fade / X_X eyes)
 *     - Hồi sinh (Revive / Stand-up Jump / Sparkle)
 *     - Trạng thái chờ (Idle / Cute Rhythmic Bobbing & Breathing)
 *  4. [CYBERPUNK ARENA SCENERY]:
 *     - Sàn đấu Hex-Grid Platform với rãnh neon phát sáng.
 *     - 4 Trụ tháp năng lượng Monoliths có dải đèn LED chạy dọc.
 *     - Màn hình Hologram ba chiều (Tactical Holo-Screens) lơ lửng phía sau.
 *     - Hạt bụi năng lượng Cyber Dust bay bồng bềnh và hệ thống chiếu sáng kịch tính.
 * ============================================================================
 */

import { events } from '../core/EventBus.js';

/**
 * Sinh Texture Canvas 2D nét căng cho biểu cảm khuôn mặt Anime Chibi
 */
function createAnimeFaceTexture(role, state = 'normal') {
    if (typeof document === 'undefined') return null;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Nền da anime ấm áp
    ctx.fillStyle = '#ffece2';
    ctx.fillRect(0, 0, size, size);

    // Má hồng Chibi siêu dễ thương (Soft Blushing Airbrush)
    const drawBlush = () => {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 120, 150, 0.35)';
        ctx.beginPath();
        ctx.ellipse(55, 160, 24, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(201, 160, 24, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    drawBlush();

    // Màu mắt theo nguyên tố của từng Role
    const eyeColors = {
        Attacker: { top: '#ef4444', bot: '#f59e0b' },   // Đỏ - Hổ phách 🔥
        Supporter: { top: '#8b5cf6', bot: '#c084fc' },  // Tím Thạch anh 🔮
        Healer: { top: '#10b981', bot: '#34d399' },     // Lục Sinh mệnh 🍃
        Defender: { top: '#2563eb', bot: '#38bdf8' }    // Xanh Băng biển 💧
    }[role] || { top: '#ef4444', bot: '#f59e0b' };

    if (state === 'die') {
        // Mắt nhắm tịt dấu X_X khi tử trận
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';

        // Mắt trái X
        ctx.beginPath();
        ctx.moveTo(40, 115); ctx.lineTo(85, 145);
        ctx.moveTo(85, 115); ctx.lineTo(40, 145);
        ctx.stroke();

        // Mắt phải X
        ctx.beginPath();
        ctx.moveTo(171, 115); ctx.lineTo(216, 145);
        ctx.moveTo(216, 115); ctx.lineTo(171, 145);
        ctx.stroke();

        // Miệng gợn sóng buồn
        ctx.beginPath();
        ctx.arc(128, 195, 18, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();

    } else if (state === 'hit') {
        // Mắt nheo > < khi bị đánh trúng
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Mắt trái >
        ctx.beginPath();
        ctx.moveTo(40, 120); ctx.lineTo(75, 135); ctx.lineTo(40, 150);
        ctx.stroke();

        // Mắt phải <
        ctx.beginPath();
        ctx.moveTo(216, 120); ctx.lineTo(181, 135); ctx.lineTo(216, 150);
        ctx.stroke();

        // Miệng chữ O ngạc nhiên
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(128, 185, 14, 0, Math.PI * 2);
        ctx.fill();

    } else {
        // Mắt Anime tròn to long lanh (Normal & Attack)
        const drawEye = (cx, cy) => {
            ctx.save();
            // Lòng trắng mắt
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx, cy, 32, 42, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tròng mắt chuyển màu Gradient
            const grad = ctx.createLinearGradient(cx, cy - 36, cx, cy + 36);
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(0.35, eyeColors.top);
            grad.addColorStop(1, eyeColors.bot);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 4, 26, 36, 0, 0, Math.PI * 2);
            ctx.fill();

            // Đồng tử đen
            ctx.fillStyle = '#090d16';
            ctx.beginPath();
            ctx.arc(cx, cy + 8, 12, 0, Math.PI * 2);
            ctx.fill();

            // Điểm sáng phản quang lấp lánh (Sparkle Highlights)
            ctx.fillStyle = '#ffffff';
            // Điểm sáng lớn góc trên trái
            ctx.beginPath();
            ctx.ellipse(cx - 9, cy - 10, 10, 14, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // Điểm sáng nhỏ góc dưới phải
            ctx.beginPath();
            ctx.arc(cx + 10, cy + 18, 5, 0, Math.PI * 2);
            ctx.fill();

            // Hàng lông mi trên cong vút sắc sảo
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(cx, cy - 8, 32, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();
            ctx.restore();
        };

        drawEye(65, 130);
        drawEye(191, 130);

        // Miệng cười Chibi đáng yêu
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 5;
        ctx.beginPath();
        if (state === 'attack') {
            // Cười quyết tâm khi tấn công
            ctx.arc(128, 180, 20, 0.2, Math.PI - 0.2);
            ctx.fillStyle = '#e11d48';
            ctx.fill();
        } else {
            ctx.arc(128, 185, 12, 0.1, Math.PI - 0.1);
        }
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * Sinh Texture Mắt Quái Boss Mecha Titan (Cyclops LED Core)
 */
function createBossEyeTexture(stageId = 1, state = 'normal') {
    if (typeof document === 'undefined') return null;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const half = size / 2;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);

    const themeColors = {
        1: { core: '#ff0044', ring: '#ff7700', glow: 'rgba(255, 0, 68, 0.8)' },  // Sentinel 07 (Đỏ Lửa)
        2: { core: '#00f0ff', ring: '#38bdf8', glow: 'rgba(0, 240, 255, 0.8)' },  // Warden Aegis (Băng Tuyết)
        3: { core: '#a855f7', ring: '#ec4899', glow: 'rgba(168, 85, 247, 0.8)' }  // Null Sovereign (Hư Không)
    }[stageId] || { core: '#ff0044', ring: '#ff7700', glow: 'rgba(255, 0, 68, 0.8)' };

    if (state === 'broken') {
        // Boss bị Break Stagger: Mắt xoắn ốc hoa mắt chóng mặt
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 7;
        ctx.beginPath();
        for (let i = 0; i < 720; i += 5) {
            const angle = (i * Math.PI) / 180;
            const dist = (i / 720) * 85;
            const x = half + Math.cos(angle) * dist;
            const y = half + Math.sin(angle) * dist;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    } else {
        // Mắt Cyclops Mecha LED rực lửa
        const radGrad = ctx.createRadialGradient(half, half, 10, half, half, 90);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.3, themeColors.core);
        radGrad.addColorStop(0.7, themeColors.ring);
        radGrad.addColorStop(1, '#090d16');

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(half, half, 88, 0, Math.PI * 2);
        ctx.fill();

        // Vòng tâm ngắm công nghệ cao
        ctx.strokeStyle = state === 'attack' ? '#ffffff' : themeColors.ring;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(half, half, 60, 0, Math.PI * 2);
        ctx.stroke();

        // 4 Chữ thập ngắm bắn
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(half - 80, half); ctx.lineTo(half - 45, half);
        ctx.moveTo(half + 45, half); ctx.lineTo(half + 80, half);
        ctx.moveTo(half, half - 80); ctx.lineTo(half, half - 45);
        ctx.moveTo(half, half + 45); ctx.lineTo(half, half + 80);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * Sinh Texture Sàn đấu Cyberpunk Hex-Grid
 */
function createCyberArenaFloorTexture() {
    if (typeof document === 'undefined') return null;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Nền kim loại đen vũ trụ
    ctx.fillStyle = '#0a0e1c';
    ctx.fillRect(0, 0, size, size);

    // Lưới tổ ong phát quang neon (Hexagonal Grid)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
    ctx.lineWidth = 2.5;

    const hexRadius = 38;
    const h = hexRadius * Math.sqrt(3);

    for (let y = -h; y < size + h * 2; y += h) {
        for (let x = -hexRadius; x < size + hexRadius * 3; x += hexRadius * 3) {
            // Hexagon 1
            drawHex(ctx, x, y, hexRadius);
            // Hexagon 2 so le
            drawHex(ctx, x + hexRadius * 1.5, y + h / 2, hexRadius);
        }
    }

    function drawHex(c, cx, cy, r) {
        c.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath();
        c.stroke();
    }

    // Vòng tròn ánh sáng năng lượng đồng tâm ở giữa
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 210, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 140, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
}

export class Diorama3D {
    constructor(engine, gameState) {
        this.engine = engine;
        this.state = gameState;
        this.scene = engine.scene;

        this.stageGroup = new THREE.Group();
        this.scene.add(this.stageGroup);
        this.stageGroup.position.set(0, 0, 0);

        this.heroes = [];
        this.boss = null;
        this.drones = [];
        this.sceneryProps = [];
        this.ambientParticles = null;

        this.cameraShakeTimer = 0;
        this.cameraBasePos = new THREE.Vector3().copy(this.engine.camera.position);

        this.initStageEnvironment();
        this.buildChibiHeroes();
        this.buildChibiBoss();
        this.initEventListeners();
    }

    /** 1. XÂY DỰNG QUANG CẢNH SÂN ĐẤU CYBERPUNK (BATTLE SCENERY) */
    initStageEnvironment() {
        // A. SÀN ĐẤU CÔNG NGHỆ CAO ĐA TẦNG (HEX-GRID ARENA FLOOR)
        const floorGeo = new THREE.CylinderGeometry(5.4, 5.8, 0.45, 48);
        const floorMat = new THREE.MeshStandardMaterial({
            map: createCyberArenaFloorTexture(),
            metalness: 0.85,
            roughness: 0.35
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.22;
        floor.receiveShadow = true;
        this.stageGroup.add(floor);

        // Vành đai Neon bảo vệ sàn đấu (Outer Neon Border Ring)
        const outerRingGeo = new THREE.TorusGeometry(5.45, 0.08, 16, 64);
        const outerRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
        outerRing.rotation.x = Math.PI / 2;
        outerRing.position.y = 0.01;
        this.stageGroup.add(outerRing);

        // Vòng năng lượng xoay ngầm bên dưới sàn
        const underRingGeo = new THREE.RingGeometry(3.0, 3.25, 48);
        const underRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
        this.underRingMesh = new THREE.Mesh(underRingGeo, underRingMat);
        this.underRingMesh.rotation.x = Math.PI / 2;
        this.underRingMesh.position.y = 0.02;
        this.stageGroup.add(this.underRingMesh);

        // B. 4 CỘT THÁP NĂNG LƯỢNG MONOLITHS (QUANG CẢNH MÔI TRƯỜNG CHIẾN TRƯỜNG)
        const pillarCoords = [
            { x: -5.0, z: -2.8 },
            { x: 5.0, z: -2.8 },
            { x: -5.6, z: 1.5 },
            { x: 5.6, z: 1.5 }
        ];

        pillarCoords.forEach((coord, i) => {
            const pillarGroup = new THREE.Group();
            pillarGroup.position.set(coord.x, 1.4, coord.z);

            // Thân cột bát giác kim loại
            const colGeo = new THREE.CylinderGeometry(0.35, 0.45, 3.2, 8);
            const colMat = new THREE.MeshStandardMaterial({
                color: 0x111827,
                metalness: 0.9,
                roughness: 0.2
            });
            const colMesh = new THREE.Mesh(colGeo, colMat);
            colMesh.castShadow = true;
            pillarGroup.add(colMesh);

            // Dải LED Neon phát sáng chạy dọc cột
            const stripGeo = new THREE.BoxGeometry(0.08, 2.6, 0.85);
            const stripMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x00f0ff : 0xa855f7 });
            const stripMesh = new THREE.Mesh(stripGeo, stripMat);
            stripMesh.position.y = 0.1;
            pillarGroup.add(stripMesh);

            // Tinh thể năng lượng trôi nổi trên đỉnh cột
            const crystalGeo = new THREE.OctahedronGeometry(0.3, 0);
            const crystalMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x00f0ff : 0xa855f7, wireframe: true });
            const crystal = new THREE.Mesh(crystalGeo, crystalMat);
            crystal.position.y = 1.9;
            pillarGroup.add(crystal);

            this.stageGroup.add(pillarGroup);
            this.sceneryProps.push({ group: pillarGroup, crystal, offset: i });
        });

        // C. MÀN HÌNH HOLOGRAM TÁC CHIẾN BA CHIỀU (FLOATING TACTICAL HOLO-SCREENS)
        if (typeof document !== 'undefined') {
            const holoCoords = [
                { x: -2.8, y: 3.2, z: -4.0, rotY: 0.35 },
                { x: 2.8, y: 3.2, z: -4.0, rotY: -0.35 }
            ];

            holoCoords.forEach(pos => {
                const holoCanvas = document.createElement('canvas');
                holoCanvas.width = 256; holoCanvas.height = 128;
                const hCtx = holoCanvas.getContext('2d');
                hCtx.fillStyle = 'rgba(10, 25, 47, 0.7)';
                hCtx.fillRect(0, 0, 256, 128);
                hCtx.strokeStyle = '#00f0ff';
                hCtx.lineWidth = 3;
                hCtx.strokeRect(6, 6, 244, 116);
                hCtx.fillStyle = '#00f0ff';
                hCtx.font = 'bold 16px monospace';
                hCtx.fillText('TACTICAL ARENA', 18, 32);
                hCtx.font = '12px monospace';
                hCtx.fillStyle = '#38bdf8';
                hCtx.fillText('SENTINEL TARGET LOCK: 100%', 18, 60);
                hCtx.fillText('COMBO PROTOCOL: ONLINE', 18, 82);
                hCtx.fillStyle = '#ef4444';
                hCtx.fillText('STAGGER BREAK: ARMED', 18, 104);

                const holoTex = new THREE.CanvasTexture(holoCanvas);
                const holoGeo = new THREE.PlaneGeometry(1.9, 0.95);
                const holoMat = new THREE.MeshBasicMaterial({
                    map: holoTex,
                    transparent: true,
                    opacity: 0.75,
                    side: THREE.DoubleSide
                });
                const holoMesh = new THREE.Mesh(holoGeo, holoMat);
                holoMesh.position.set(pos.x, pos.y, pos.z);
                holoMesh.rotation.y = pos.rotY;
                this.stageGroup.add(holoMesh);
            });
        }

        // D. HẠT BỤI NĂNG LƯỢNG LƠ LỬNG TRONG KHÔNG GIAN (AMBIENT CYBER PARTICLES)
        const pCount = 75;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount; i++) {
            pPos[i * 3] = (Math.random() - 0.5) * 11.0;
            pPos[i * 3 + 1] = Math.random() * 4.5 + 0.2;
            pPos[i * 3 + 2] = (Math.random() - 0.5) * 8.0;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({
            color: 0x38bdf8,
            size: 0.08,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });
        this.ambientParticles = new THREE.Points(pGeo, pMat);
        this.stageGroup.add(this.ambientParticles);
    }

    /** 2. DỰNG 4 NHÂN VẬT CHIBI ANIME ĐÁNG YÊU (1:2.5 PROPORTIONS) */
    buildChibiHeroes() {
        const heroConfigs = [
            {
                name: 'Astra',
                role: 'Attacker',
                color: 0xef4444,
                hairColor: 0xd946ef,
                x: -2.3, z: 1.2,
                weaponType: 'dual_katanas'
            },
            {
                name: 'Elysia',
                role: 'Supporter',
                color: 0x8b5cf6,
                hairColor: 0xa855f7,
                x: -0.75, z: 1.5,
                weaponType: 'void_orbs'
            },
            {
                name: 'Lin',
                role: 'Healer',
                color: 0x10b981,
                hairColor: 0x059669,
                x: 0.75, z: 1.5,
                weaponType: 'nano_staff'
            },
            {
                name: 'Boran',
                role: 'Defender',
                color: 0x2563eb,
                hairColor: 0x1e3a8a,
                x: 2.3, z: 1.2,
                weaponType: 'aegis_shield'
            }
        ];

        heroConfigs.forEach((cfg, idx) => {
            const rootGroup = new THREE.Group();
            rootGroup.position.set(cfg.x, 0.45, cfg.z);

            // Cụm lắc lư thân & đầu (Dùng cho diễn hoạt Breathing & Lunge)
            const bodyGroup = new THREE.Group();
            rootGroup.add(bodyGroup);

            // A. ĐẦU CHIBI TO TRÒN ĐẶC TRƯNG (CHIBI HEAD - 1:2.5 RATIO)
            const headGeo = new THREE.SphereGeometry(0.5, 24, 20);
            headGeo.scale(1.0, 0.94, 0.98); // Hơi bè ngang cute
            const headMat = new THREE.MeshStandardMaterial({
                color: 0xffe8dc, // Nền da trắng hồng
                roughness: 0.5,
                metalness: 0.05
            });
            const headMesh = new THREE.Mesh(headGeo, headMat);
            headMesh.position.y = 0.78;
            bodyGroup.add(headMesh);

            // Mặt Anime Chibi dán đè phía trước đầu (Expressive Face Decal)
            const faceGeo = new THREE.PlaneGeometry(0.64, 0.64);
            const faceTexNormal = createAnimeFaceTexture(cfg.role, 'normal');
            const faceTexHit = createAnimeFaceTexture(cfg.role, 'hit');
            const faceTexDie = createAnimeFaceTexture(cfg.role, 'die');
            const faceTexAttack = createAnimeFaceTexture(cfg.role, 'attack');

            const faceMat = new THREE.MeshBasicMaterial({
                map: faceTexNormal,
                transparent: true,
                side: THREE.FrontSide
            });
            const faceMesh = new THREE.Mesh(faceGeo, faceMat);
            faceMesh.position.set(0, 0.78, 0.49);
            bodyGroup.add(faceMesh);

            // B. MÁI TÓC ANIME NHIỀU LỚP (STYLIZED CHIBI ANIME HAIR)
            const hairMat = new THREE.MeshStandardMaterial({
                color: cfg.hairColor,
                roughness: 0.35,
                metalness: 0.1
            });

            // Tóc mái trước trán
            const bangGeo = new THREE.ConeGeometry(0.18, 0.35, 4);
            for (let b = -2; b <= 2; b++) {
                const bang = new THREE.Mesh(bangGeo, hairMat);
                bang.position.set(b * 0.14, 1.14, 0.42);
                bang.rotation.z = b * -0.15;
                bang.rotation.x = 0.35;
                bodyGroup.add(bang);
            }

            // Tóc đặc trưng từng Role
            let accessoryMesh = null;
            if (cfg.role === 'Attacker') {
                // Astra: Đuôi ngựa cao nhọn vút phía sau + Ribbon vàng
                const ponyGeo = new THREE.ConeGeometry(0.28, 0.85, 8);
                const pony = new THREE.Mesh(ponyGeo, hairMat);
                pony.position.set(0, 1.25, -0.45);
                pony.rotation.x = -1.1;
                bodyGroup.add(pony);

                // Kính đo Cyber Visor tai trái
                const visorGeo = new THREE.BoxGeometry(0.12, 0.14, 0.28);
                const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
                const visor = new THREE.Mesh(visorGeo, visorMat);
                visor.position.set(-0.48, 0.88, 0.2);
                bodyGroup.add(visor);

            } else if (cfg.role === 'Supporter') {
                // Elysia: 2 Bím tóc dài 2 bên (Twintails)
                [-0.45, 0.45].forEach(side => {
                    const tailGeo = new THREE.CylinderGeometry(0.1, 0.04, 0.75, 8);
                    const tail = new THREE.Mesh(tailGeo, hairMat);
                    tail.position.set(side, 0.65, -0.2);
                    tail.rotation.z = side > 0 ? -0.4 : 0.4;
                    bodyGroup.add(tail);
                });

            } else if (cfg.role === 'Healer') {
                // Lin: 2 Búi tóc tròn Odango + Vòng Halo Thiên Thần Nanite
                [-0.42, 0.42].forEach(side => {
                    const bunGeo = new THREE.SphereGeometry(0.2, 12, 12);
                    const bun = new THREE.Mesh(bunGeo, hairMat);
                    bun.position.set(side, 1.22, 0);
                    bodyGroup.add(bun);
                });

                // Vòng Halo phát sáng trên đầu
                const haloGeo = new THREE.TorusGeometry(0.38, 0.04, 8, 24);
                const haloMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
                accessoryMesh = new THREE.Mesh(haloGeo, haloMat);
                accessoryMesh.rotation.x = Math.PI / 2;
                accessoryMesh.position.set(0, 1.48, 0);
                bodyGroup.add(accessoryMesh);

            } else if (cfg.role === 'Defender') {
                // Boran: Nón giáp Mecha Chibi với 2 tai thỏ Antenna Radar
                const helmetGeo = new THREE.SphereGeometry(0.53, 16, 16);
                const helmetMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.8, roughness: 0.25 });
                const helmet = new THREE.Mesh(helmetGeo, helmetMat);
                helmet.position.set(0, 0.85, -0.05);
                bodyGroup.add(helmet);

                // 2 Tai antenna robot
                [-0.42, 0.42].forEach(side => {
                    const earGeo = new THREE.ConeGeometry(0.09, 0.45, 6);
                    const earMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
                    const ear = new THREE.Mesh(earGeo, earMat);
                    ear.position.set(side, 1.4, 0);
                    ear.rotation.z = side > 0 ? -0.3 : 0.3;
                    bodyGroup.add(ear);
                });
            }

            // C. THÂN NHỎ NHẮN VÁY ÁO CYBER ANIME (CHIBI TORSO & SKIRT)
            const coatMat = new THREE.MeshStandardMaterial({
                color: cfg.color,
                metalness: 0.4,
                roughness: 0.4
            });
            const torsoGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.45, 12);
            const torsoMesh = new THREE.Mesh(torsoGeo, coatMat);
            torsoMesh.position.y = 0.28;
            bodyGroup.add(torsoMesh);

            // Chân & Giày bốt Chibi
            const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
            [-0.14, 0.14].forEach(legX => {
                const legGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.35, 8);
                const leg = new THREE.Mesh(legGeo, bootMat);
                leg.position.set(legX, 0.05, 0);
                bodyGroup.add(leg);
            });

            // Bóng tròn mờ dưới chân
            const shadowGeo = new THREE.CircleGeometry(0.42, 16);
            const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
            const shadow = new THREE.Mesh(shadowGeo, shadowMat);
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.y = -0.15;
            rootGroup.add(shadow);

            // D. VŨ KHÍ ANIME ĐẶC TRƯNG TỪNG NHÂN VẬT
            let weaponGroup = new THREE.Group();
            bodyGroup.add(weaponGroup);

            if (cfg.weaponType === 'dual_katanas') {
                // Song kiếm Katana Lôi Điện phát sáng
                [-0.38, 0.38].forEach((wX, i) => {
                    const bladeGeo = new THREE.BoxGeometry(0.06, 0.95, 0.12);
                    const bladeMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
                    const blade = new THREE.Mesh(bladeGeo, bladeMat);
                    blade.position.set(wX, 0.4, 0.28);
                    blade.rotation.z = (i === 0 ? 1 : -1) * 0.45;
                    blade.rotation.x = -0.3;
                    weaponGroup.add(blade);
                });
            } else if (cfg.weaponType === 'void_orbs') {
                // 3 Quả cầu tinh thể hư vô trôi nổi
                const orbGeo = new THREE.DodecahedronGeometry(0.14, 0);
                const orbMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, wireframe: true });
                for (let o = 0; o < 3; o++) {
                    const orb = new THREE.Mesh(orbGeo, orbMat);
                    orb.position.set(Math.cos((o * Math.PI * 2) / 3) * 0.52, 0.45, Math.sin((o * Math.PI * 2) / 3) * 0.52);
                    weaponGroup.add(orb);
                }
            } else if (cfg.weaponType === 'nano_staff') {
                // Quyền trượng Nanite Thánh Nữ
                const staffGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8);
                const staffMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.8 });
                const staff = new THREE.Mesh(staffGeo, staffMat);
                staff.position.set(0.42, 0.45, 0.25);
                staff.rotation.z = -0.25;

                // Tinh thể chữa lành hình hoa ngọc bích trên đỉnh gậy
                const tipGeo = new THREE.OctahedronGeometry(0.18, 0);
                const tipMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
                const tip = new THREE.Mesh(tipGeo, tipMat);
                tip.position.y = 0.6;
                staff.add(tip);
                weaponGroup.add(staff);

            } else if (cfg.weaponType === 'aegis_shield') {
                // Khiên tháp lục giác hạng nặng (Aegis Shield)
                const shieldGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.08, 6);
                const shieldMat = new THREE.MeshStandardMaterial({
                    color: 0x38bdf8,
                    metalness: 0.9,
                    roughness: 0.15,
                    transparent: true,
                    opacity: 0.85
                });
                const shield = new THREE.Mesh(shieldGeo, shieldMat);
                shield.position.set(0.48, 0.35, 0.35);
                shield.rotation.x = Math.PI / 2;
                weaponGroup.add(shield);
            }

            this.stageGroup.add(rootGroup);

            // Lưu trữ Controller điều khiển trạng thái (State Machine)
            this.heroes.push({
                role: cfg.role,
                root: rootGroup,
                body: bodyGroup,
                face: faceMesh,
                faceTex: { normal: faceTexNormal, hit: faceTexHit, die: faceTexDie, attack: faceTexAttack },
                accessory: accessoryMesh,
                weapon: weaponGroup,
                baseX: cfg.x,
                baseY: 0.45,
                baseZ: cfg.z,
                offset: idx * 0.9,
                state: 'idle',       // 'idle' | 'attack' | 'hit' | 'die' | 'revive'
                animTimer: 0,
                isDefeated: false
            });
        });
    }

    /** 3. DỰNG BOSS CHIBI MECHA TITAN (SENTINEL UNIT 07 / WARDEN AEGIS / NULL SOVEREIGN) */
    buildChibiBoss() {
        this.bossGroup = new THREE.Group();
        this.bossGroup.position.set(0, 1.45, -1.9);

        // A. KHỐI THÂN MECHA CHIBI TRÒN BÉO ĐÁNG YÊU (CHUNKY CHIBI MECHA BODY)
        const coreGeo = new THREE.DodecahedronGeometry(1.35, 1);
        this.bossMat = new THREE.MeshStandardMaterial({
            color: 0x991b1b,
            emissive: 0x450a0a,
            emissiveIntensity: 0.5,
            metalness: 0.85,
            roughness: 0.25
        });
        const bossBody = new THREE.Mesh(coreGeo, this.bossMat);
        bossBody.castShadow = true;
        this.bossGroup.add(bossBody);

        // B. MẮT CYCLOPS LED TO TRÒN BIỂU CẢM
        const eyeGeo = new THREE.PlaneGeometry(0.9, 0.9);
        this.bossEyeTexNormal = createBossEyeTexture(this.state.currentStageId, 'normal');
        this.bossEyeTexBroken = createBossEyeTexture(this.state.currentStageId, 'broken');
        this.bossEyeTexAttack = createBossEyeTexture(this.state.currentStageId, 'attack');

        this.bossEyeMat = new THREE.MeshBasicMaterial({
            map: this.bossEyeTexNormal,
            transparent: true,
            side: THREE.FrontSide
        });
        this.bossEyeMesh = new THREE.Mesh(eyeGeo, this.bossEyeMat);
        this.bossEyeMesh.position.set(0, 0.1, 1.15);
        this.bossGroup.add(this.bossEyeMesh);

        // C. 2 ỐNG PHÁO CỐI MINI VAI TRÒN (CHIBI SHOULDER CANNONS)
        [-1.1, 1.1].forEach((cX, i) => {
            const cannonGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.95, 12);
            const cannonMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
            const cannon = new THREE.Mesh(cannonGeo, cannonMat);
            cannon.position.set(cX, 0.85, 0.1);
            cannon.rotation.x = Math.PI / 3.5;
            this.bossGroup.add(cannon);
        });

        // D. 2 CÁNH TAY VUỐT ROBOT CHIBI TRÒN
        [-1.4, 1.4].forEach((armX, i) => {
            const armGeo = new THREE.SphereGeometry(0.35, 12, 12);
            const armMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.position.set(armX, -0.2, 0.4);
            this.bossGroup.add(arm);
        });

        // E. 2 DRONE HỘ VỆ TÍ HON BAY LƠ LỬNG QUANH BOSS (CHIBI COMPANION DRONES)
        this.drones = [];
        [-2.2, 2.2].forEach((dX, i) => {
            const droneGroup = new THREE.Group();
            droneGroup.position.set(dX, 1.1, 0);

            // Thân drone hình hạt đậu tròn
            const dBodyGeo = new THREE.SphereGeometry(0.3, 12, 12);
            const dBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
            const dBody = new THREE.Mesh(dBodyGeo, dBodyMat);
            droneGroup.add(dBody);

            // Đèn LED mắt drone
            const dLightGeo = new THREE.SphereGeometry(0.12, 8, 8);
            const dLightMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
            const dLight = new THREE.Mesh(dLightGeo, dLightMat);
            dLight.position.set(0, 0, 0.25);
            droneGroup.add(dLight);

            // Râu ăng-ten tí hon
            const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
            const antMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
            const ant = new THREE.Mesh(antGeo, antMat);
            ant.position.y = 0.35;
            droneGroup.add(ant);

            this.bossGroup.add(droneGroup);
            this.drones.push({ group: droneGroup, baseX: dX, offset: i * Math.PI });
        });

        // Bóng Boss trên mặt đất
        const bShadowGeo = new THREE.CircleGeometry(1.4, 24);
        const bShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 });
        const bShadow = new THREE.Mesh(bShadowGeo, bShadowMat);
        bShadow.rotation.x = -Math.PI / 2;
        bShadow.position.y = -1.35;
        this.bossGroup.add(bShadow);

        this.stageGroup.add(this.bossGroup);

        this.boss = {
            group: this.bossGroup,
            body: bossBody,
            eye: this.bossEyeMesh,
            baseX: 0,
            baseY: 1.45,
            baseZ: -1.9,
            state: 'idle',       // 'idle' | 'attack' | 'hit' | 'die'
            animTimer: 0,
            shakeTimer: 0,
            isBroken: false
        };
    }

    /** 4. KÍCH HOẠT VÀ ĐIỀU PHỐI ANIMATION THEO SỰ KIỆN GAME (EVENT LISTENERS) */
    initEventListeners() {
        // A. HERO TẤN CÔNG (ATTACK ANIMATION)
        events.on('damage_dealt', ({ hero, damage }) => {
            const hController = this.heroes[0]; // Astra Attacker
            if (hController && !hController.isDefeated) {
                this.playHeroAttack(hController);
            }
            // Boss bị dính đòn (Hit Reaction)
            this.playBossHit();
        });

        events.on('skill_executed', ({ hero }) => {
            const target = this.heroes.find(h => h.role === hero.role);
            if (target && !target.isDefeated) {
                this.playHeroAttack(target);
            }
            if (hero.role === 'Attacker' || hero.role === 'Supporter') {
                this.playBossHit();
            }
        });

        events.on('ultimate_executed', ({ hero }) => {
            const target = this.heroes.find(h => h.role === hero.role);
            if (target && !target.isDefeated) {
                this.playHeroSuperAttack(target);
            }
            this.playBossHit(0.65);
        });

        events.on('counter_attack', () => {
            const astra = this.heroes[0];
            if (astra && !astra.isDefeated) {
                this.playHeroAttack(astra, true);
            }
            this.playBossHit(0.5);
        });

        // B. BOSS TẤN CÔNG (BOSS ATTACK ANIMATION)
        events.on('boss_attack', ({ damage, isSuperAttack }) => {
            this.playBossAttack(isSuperAttack);
            // Toàn bộ Hero bị trúng đòn (Hit Reaction)
            this.heroes.forEach(h => {
                if (!h.isDefeated) {
                    this.playHeroHit(h);
                }
            });
        });

        events.on('telegraph_unleashed', () => {
            this.playBossAttack(true);
        });

        // C. HERO TỬ TRẬN & HỒI SINH (DIE & REVIVE ANIMATIONS)
        events.on('hero_fainted', ({ hero }) => {
            const h = this.heroes.find(hc => hc.role === hero.role);
            if (h) {
                this.playHeroDie(h);
            }
        });

        events.on('hero_revived', ({ hero }) => {
            const h = this.heroes.find(hc => hc.role === hero.role);
            if (h) {
                this.playHeroRevive(h);
            }
        });

        // D. BOSS STAGGER BREAK & CHOÁNG
        events.on('stagger_broken', () => {
            if (this.boss) {
                this.boss.isBroken = true;
                this.bossEyeMat.map = this.bossEyeTexBroken;
                this.bossMat.color.setHex(0x38bdf8); // Chuyển sang xanh ngọc lạnh buốt
                this.boss.shakeTimer = 0.8;
            }
        });

        events.on('stagger_recovered', () => {
            if (this.boss) {
                this.boss.isBroken = false;
                this.bossEyeMat.map = this.bossEyeTexNormal;
                this.bossMat.color.setHex(0x991b1b); // Hồi phục màu đỏ
            }
        });

        // E. CHUYỂN CHAPTER MỚI -> LÀM MỚI MODEL BOSS
        events.on('stage_loaded', ({ stageId }) => {
            this.updateBossStageAppearance(stageId);
        });
    }

    /** Diễn hoạt Hero Chibi lao tới chém (Attack Animation) */
    playHeroAttack(heroCtrl, isCounter = false) {
        heroCtrl.state = 'attack';
        heroCtrl.animTimer = 0.45;
        heroCtrl.face.material.map = heroCtrl.faceTex.attack;

        // Vút nhanh tới trước mặt Boss
        const targetX = isCounter ? 0.0 : heroCtrl.baseX * 0.35;
        const targetZ = heroCtrl.baseZ - 1.6;

        heroCtrl.root.position.set(targetX, heroCtrl.baseY + 0.25, targetZ);
        heroCtrl.body.rotation.x = 0.4;
        heroCtrl.weapon.rotation.x = -Math.PI / 2.5;

        setTimeout(() => {
            // Giật lùi về vị trí cũ với độ nảy đàn hồi (Recoil Bounce)
            heroCtrl.root.position.set(heroCtrl.baseX, heroCtrl.baseY, heroCtrl.baseZ);
            heroCtrl.body.rotation.x = 0;
            heroCtrl.weapon.rotation.x = 0;
            heroCtrl.state = 'idle';
            heroCtrl.face.material.map = heroCtrl.faceTex.normal;
        }, 320);
    }

    /** Diễn hoạt Hero tung chiêu nộ cực đại (Super Attack) */
    playHeroSuperAttack(heroCtrl) {
        heroCtrl.state = 'attack';
        heroCtrl.animTimer = 0.7;
        heroCtrl.face.material.map = heroCtrl.faceTex.attack;

        // Nhảy vọt lên không trung
        heroCtrl.root.position.set(heroCtrl.baseX * 0.2, heroCtrl.baseY + 1.6, heroCtrl.baseZ - 1.2);
        heroCtrl.body.rotation.x = 0.6;
        heroCtrl.weapon.rotation.z = Math.PI * 2;

        setTimeout(() => {
            heroCtrl.root.position.set(heroCtrl.baseX, heroCtrl.baseY, heroCtrl.baseZ);
            heroCtrl.body.rotation.x = 0;
            heroCtrl.weapon.rotation.z = 0;
            heroCtrl.state = 'idle';
            heroCtrl.face.material.map = heroCtrl.faceTex.normal;
        }, 550);
    }

    /** Diễn hoạt Hero bị trúng đòn (Hit Reaction) */
    playHeroHit(heroCtrl) {
        if (heroCtrl.isDefeated) return;
        heroCtrl.state = 'hit';
        heroCtrl.face.material.map = heroCtrl.faceTex.hit;

        // Giật lùi về sau và nghiêng người
        heroCtrl.root.position.z = heroCtrl.baseZ + 0.35;
        heroCtrl.body.rotation.x = -0.35;

        setTimeout(() => {
            if (!heroCtrl.isDefeated) {
                heroCtrl.root.position.z = heroCtrl.baseZ;
                heroCtrl.body.rotation.x = 0;
                heroCtrl.state = 'idle';
                heroCtrl.face.material.map = heroCtrl.faceTex.normal;
            }
        }, 220);
    }

    /** Diễn hoạt Hero tử trận (Die Animation) */
    playHeroDie(heroCtrl) {
        heroCtrl.isDefeated = true;
        heroCtrl.state = 'die';
        heroCtrl.face.material.map = heroCtrl.faceTex.die;

        // Ngã nằm sấp xuống sàn đấu
        heroCtrl.root.position.y = 0.15;
        heroCtrl.body.rotation.x = Math.PI / 2.2;
        heroCtrl.body.position.y = 0.1;
    }

    /** Diễn hoạt Hero hồi sinh (Revive Animation) */
    playHeroRevive(heroCtrl) {
        heroCtrl.isDefeated = false;
        heroCtrl.state = 'revive';
        heroCtrl.face.material.map = heroCtrl.faceTex.normal;

        // Đứng thẳng dậy và nhảy vọt lên vui sướng
        heroCtrl.body.rotation.x = 0;
        heroCtrl.root.position.set(heroCtrl.baseX, heroCtrl.baseY + 0.5, heroCtrl.baseZ);

        setTimeout(() => {
            heroCtrl.root.position.set(heroCtrl.baseX, heroCtrl.baseY, heroCtrl.baseZ);
            heroCtrl.state = 'idle';
        }, 400);
    }

    /** Diễn hoạt Boss bị dính đòn (Boss Hit Reaction) */
    playBossHit(shakeIntensity = 0.35) {
        if (!this.boss) return;
        this.boss.shakeTimer = shakeIntensity;
        this.bossMat.emissiveIntensity = 2.2; // Nhấp nháy chớp sáng

        setTimeout(() => {
            if (this.boss) this.bossMat.emissiveIntensity = 0.5;
        }, 140);
    }

    /** Diễn hoạt Boss giáng đòn hủy diệt (Boss Attack Animation) */
    playBossAttack(isSuper = false) {
        if (!this.boss) return;
        this.boss.state = 'attack';
        this.bossEyeMat.map = this.bossEyeTexAttack;

        // Tụ năng lượng ngửa ra sau rồi dậm mạnh xuống sàn
        this.boss.group.position.y = this.boss.baseY + 0.6;
        this.boss.group.position.z = this.boss.baseZ - 0.4;

        setTimeout(() => {
            if (this.boss) {
                this.boss.group.position.y = this.boss.baseY - 0.2;
                this.boss.group.position.z = this.boss.baseZ + 0.8;
                this.cameraShakeTimer = isSuper ? 0.45 : 0.2; // Rung chấn màn hình
            }

            setTimeout(() => {
                if (this.boss) {
                    this.boss.group.position.set(this.boss.baseX, this.boss.baseY, this.boss.baseZ);
                    this.boss.state = 'idle';
                    this.bossEyeMat.map = this.boss.isBroken ? this.bossEyeTexBroken : this.bossEyeTexNormal;
                }
            }, 260);
        }, 220);
    }

    /** Cập nhật diện mạo Boss khi sang màn mới */
    updateBossStageAppearance(stageId) {
        if (!this.boss) return;
        this.bossEyeTexNormal = createBossEyeTexture(stageId, 'normal');
        this.bossEyeTexBroken = createBossEyeTexture(stageId, 'broken');
        this.bossEyeTexAttack = createBossEyeTexture(stageId, 'attack');
        this.bossEyeMat.map = this.bossEyeTexNormal;

        const stageColors = {
            1: 0x991b1b, // Sentinel 07
            2: 0x0284c7, // Warden Aegis (Xanh Băng)
            3: 0x6b21a8  // Null Sovereign (Tím Hư Không)
        };
        this.bossMat.color.setHex(stageColors[stageId] || 0x991b1b);
    }

    /** 5. VÒNG LẶP CẬP NHẬT DIỄN HOẠ MỖI FRAME (UPDATE LOOP) */
    update(delta, elapsed) {
        // A. DIỄN HOẠT IDLE CỦA TỪNG HERO (CHIBI BOBBING & BREATHING)
        this.heroes.forEach(h => {
            if (h.state === 'idle' && !h.isDefeated) {
                // Nhịp thở bập bồng Chibi mềm mại
                h.body.position.y = Math.sin(elapsed * 3.5 + h.offset) * 0.06;
                h.body.rotation.z = Math.sin(elapsed * 1.8 + h.offset) * 0.035;

                // Vũ khí & phụ kiện đung đưa mềm mại
                if (h.weapon) {
                    h.weapon.position.y = Math.sin(elapsed * 2.8 + h.offset) * 0.04;
                }
                if (h.accessory) {
                    h.accessory.rotation.z += delta * 1.2;
                }
            }
        });

        // B. DIỄN HOẠT BOSS TRÔI NỔI & RUNG CHẤN (TRAUMA SHAKE)
        if (this.boss) {
            if (this.boss.shakeTimer > 0) {
                this.boss.shakeTimer -= delta;
                this.boss.group.position.x = this.boss.baseX + (Math.random() - 0.5) * 0.28;
                this.boss.group.position.y = this.boss.baseY + (Math.random() - 0.5) * 0.28;
            } else if (this.boss.state === 'idle') {
                this.boss.group.position.x = this.boss.baseX;
                this.boss.group.position.y = this.boss.baseY + Math.sin(elapsed * 2.0) * 0.14;
                this.boss.group.rotation.y = Math.sin(elapsed * 0.8) * 0.08;
            }

            // 2 Drone hộ vệ bay lượn vòng cung
            this.drones.forEach((d, i) => {
                d.group.position.y = 1.1 + Math.sin(elapsed * 3.2 + d.offset) * 0.16;
                d.group.position.z = Math.cos(elapsed * 2.2 + d.offset) * 0.22;
                d.group.rotation.y += delta * 1.4;
            });
        }

        // C. DIỄN HOẠT QUANG CẢNH MÔI TRƯỜNG (SCENERY ANIMATION)
        if (this.underRingMesh) {
            this.underRingMesh.rotation.z -= delta * 0.4;
        }

        this.sceneryProps.forEach(prop => {
            if (prop.crystal) {
                prop.crystal.rotation.y += delta * 1.2;
                prop.crystal.position.y = 1.9 + Math.sin(elapsed * 2.5 + prop.offset) * 0.12;
            }
        });

        // Hạt bụi năng lượng trôi nổi
        if (this.ambientParticles) {
            const posAttr = this.ambientParticles.geometry.attributes.position;
            for (let i = 0; i < posAttr.count; i++) {
                let y = posAttr.getY(i);
                y += delta * 0.25;
                if (y > 4.8) y = 0.2;
                posAttr.setY(i, y);
            }
            posAttr.needsUpdate = true;
        }

        // Rung máy ảnh khi có đòn đánh lớn
        if (this.cameraShakeTimer > 0) {
            this.cameraShakeTimer -= delta;
            this.engine.camera.position.x = this.cameraBasePos.x + (Math.random() - 0.5) * 0.18;
            this.engine.camera.position.y = this.cameraBasePos.y + (Math.random() - 0.5) * 0.18;
        } else {
            this.engine.camera.position.copy(this.cameraBasePos);
        }
    }
}
