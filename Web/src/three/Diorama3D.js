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
 * Sinh Texture Canvas 2D nét căng cho biểu cảm khuôn mặt Anime Chibi (512x512 Ultra-Crisp)
 */
function createAnimeFaceTexture(role, state = 'normal') {
    if (typeof document === 'undefined') return null;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Nền trong suốt hoàn toàn (Transparent Decal) - Da mặt kế thừa từ hình cầu 3D headMesh
    ctx.clearRect(0, 0, size, size);

    // Má hồng Chibi siêu dễ thương với vệt sáng lấp lánh (Soft Anime Blushing)
    const drawBlush = () => {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 120, 160, 0.45)';
        ctx.beginPath();
        ctx.ellipse(130, 312, 46, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(382, 312, 46, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3 vạch e thẹn anime (///) trên má
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        [110, 130, 150].forEach(x => {
            ctx.beginPath();
            ctx.moveTo(x - 8, 320); ctx.lineTo(x + 8, 304);
            ctx.stroke();
        });
        [362, 382, 402].forEach(x => {
            ctx.beginPath();
            ctx.moveTo(x - 8, 320); ctx.lineTo(x + 8, 304);
            ctx.stroke();
        });
        ctx.restore();
    };

    drawBlush();

    // Màu mắt theo nguyên tố của từng Role (Anime Multi-stop Gradients)
    const eyeColors = {
        Attacker: { top: '#ef4444', mid: '#f97316', bot: '#fbbf24' },   // Astra: Đỏ Hỏa - Cam - Hổ phách 🔥
        Supporter: { top: '#8b5cf6', mid: '#a855f7', bot: '#38bdf8' },  // Elysia: Tím Thạch anh - Lam Vũ trụ 🔮
        Healer: { top: '#059669', mid: '#10b981', bot: '#6ee7b7' },     // Lin: Lục Ngọc bích - Bạc hà 🍃
        Defender: { top: '#1d4ed8', mid: '#2563eb', bot: '#38bdf8' }    // Boran: Xanh Cobalt - Lam Băng 💧
    }[role] || { top: '#ef4444', mid: '#f97316', bot: '#fbbf24' };

    if (state === 'die') {
        // Mắt nhắm tịt dấu X_X đáng yêu khi tử trận
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';

        // Mắt trái X
        ctx.beginPath();
        ctx.moveTo(90, 215); ctx.lineTo(170, 275);
        ctx.moveTo(170, 215); ctx.lineTo(90, 275);
        ctx.stroke();

        // Mắt phải X
        ctx.beginPath();
        ctx.moveTo(342, 215); ctx.lineTo(422, 275);
        ctx.moveTo(422, 215); ctx.lineTo(342, 275);
        ctx.stroke();

        // Giọt mồ hôi anime lo lắng bên trán
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(425, 160, 16, 0, Math.PI * 2);
        ctx.fill();

        // Miệng gợn sóng buồn
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(256, 375, 26, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();

    } else if (state === 'hit') {
        // Mắt nheo > < khi bị đánh trúng (Anime shock expression)
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Mắt trái >
        ctx.beginPath();
        ctx.moveTo(90, 215); ctx.lineTo(155, 245); ctx.lineTo(90, 275);
        ctx.stroke();

        // Mắt phải <
        ctx.beginPath();
        ctx.moveTo(422, 215); ctx.lineTo(357, 245); ctx.lineTo(422, 275);
        ctx.stroke();

        // Giọt lệ anime ở khóe mắt
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(165, 275, 12, 0, Math.PI * 2);
        ctx.arc(347, 275, 12, 0, Math.PI * 2);
        ctx.fill();

        // Miệng chữ O ngạc nhiên
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(256, 362, 24, 0, Math.PI * 2);
        ctx.fill();

    } else {
        // Mắt Anime tròn to long lanh đẳng cấp (Normal & Attack)
        const drawEye = (cx, cy, isRight = false) => {
            const sign = isRight ? 1 : -1;
            ctx.save();

            // Lòng trắng mắt
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx, cy, 64, 82, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tròng mắt chuyển màu Gradient 3 tầng
            const grad = ctx.createLinearGradient(cx, cy - 70, cx, cy + 70);
            grad.addColorStop(0, '#090d16');
            grad.addColorStop(0.3, eyeColors.top);
            grad.addColorStop(0.65, eyeColors.mid);
            grad.addColorStop(1, eyeColors.bot);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 6, 52, 70, 0, 0, Math.PI * 2);
            ctx.fill();

            // Đồng tử đen sâu thẳm
            ctx.fillStyle = '#060911';
            ctx.beginPath();
            ctx.arc(cx, cy + 14, 24, 0, Math.PI * 2);
            ctx.fill();

            // Vòng cung ánh sáng phản chiếu ở đáy con ngươi (Inner Glow Crescent)
            ctx.strokeStyle = state === 'attack' ? '#ffffff' : eyeColors.bot;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(cx, cy + 24, 28, 0.2 * Math.PI, 0.8 * Math.PI);
            ctx.stroke();

            // Điểm sáng phản quang lấp lánh (Double Catchlights)
            ctx.fillStyle = '#ffffff';
            // Điểm sáng lớn góc trên trái
            ctx.beginPath();
            ctx.ellipse(cx - 18, cy - 20, 20, 26, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // Điểm sáng nhỏ lấp lánh góc dưới phải
            ctx.beginPath();
            ctx.arc(cx + 20, cy + 34, 10, 0, Math.PI * 2);
            ctx.fill();

            // Hàng lông mi trên cong vút sắc sảo phong cách Anime
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(cx, cy - 16, 62, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();

            // Lông mi phụ tạo điểm nhấn hướng ra ngoài thái dương
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(cx + sign * 54, cy - 22);
            ctx.lineTo(cx + sign * 72, cy - 36);
            ctx.stroke();

            // Chân mày mảnh thanh tú đối xứng
            ctx.strokeStyle = eyeColors.top;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            if (state === 'attack') {
                // Lông mày xếch quyết tâm hướng tâm
                ctx.moveTo(cx - sign * 38, cy - 64);
                ctx.lineTo(cx + sign * 44, cy - 78);
            } else {
                ctx.arc(cx, cy - 40, 52, isRight ? Math.PI * 1.25 : Math.PI * 1.35, isRight ? Math.PI * 1.65 : Math.PI * 1.75);
            }
            ctx.stroke();

            ctx.restore();
        };

        drawEye(130, 245, false);
        drawEye(382, 245, true);

        // Chấm mũi Chibi anime tí hon siêu cute
        ctx.fillStyle = 'rgba(235, 120, 140, 0.7)';
        ctx.beginPath();
        ctx.arc(256, 318, 4, 0, Math.PI * 2);
        ctx.fill();

        // Miệng cười Chibi đáng yêu
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (state === 'attack') {
            // Cười quyết tâm mở rộng khi tấn công
            ctx.arc(256, 362, 34, 0.15, Math.PI - 0.15);
            ctx.fillStyle = '#e11d48';
            ctx.fill();
        } else {
            ctx.arc(256, 366, 20, 0.12, Math.PI - 0.12);
        }
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * Sinh Texture Mắt Quái Boss Mecha Titan (Cyclops LED Core 512x512)
 */
function createBossEyeTexture(stageId = 1, state = 'normal') {
    if (typeof document === 'undefined') return null;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const half = size / 2;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);

    const themeColors = {
        1: { core: '#ff0044', ring: '#ff7700', glow: 'rgba(255, 0, 68, 0.85)', beam: '#ff2200' },
        2: { core: '#00f0ff', ring: '#38bdf8', glow: 'rgba(0, 240, 255, 0.85)', beam: '#00e1ff' },
        3: { core: '#a855f7', ring: '#ec4899', glow: 'rgba(168, 85, 247, 0.85)', beam: '#d946ef' }
    }[stageId] || { core: '#ff0044', ring: '#ff7700', glow: 'rgba(255, 0, 68, 0.85)', beam: '#ff2200' };

    if (state === 'broken') {
        // Boss bị Break Stagger: Mắt xoắn ốc hoa mắt chóng mặt kèm tia lửa tĩnh điện
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 12;
        ctx.beginPath();
        for (let i = 0; i < 720; i += 5) {
            const angle = (i * Math.PI) / 180;
            const dist = (i / 720) * 170;
            const x = half + Math.cos(angle) * dist;
            const y = half + Math.sin(angle) * dist;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Cảnh báo ERROR nhấp nháy
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CRITICAL STAGGER', half, half + 80);
    } else {
        // Mắt Cyclops Mecha LED rực lửa đa tầng
        const radGrad = ctx.createRadialGradient(half, half, 20, half, half, 180);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.25, themeColors.core);
        radGrad.addColorStop(0.65, themeColors.ring);
        radGrad.addColorStop(1, '#090d16');

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(half, half, 175, 0, Math.PI * 2);
        ctx.fill();

        // Vành tâm ngắm công nghệ cao
        ctx.strokeStyle = state === 'attack' ? '#ffffff' : themeColors.ring;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(half, half, 120, 0, Math.PI * 2);
        ctx.stroke();

        // Vòng chia vạch độ góc (HUD Angle Degree Ticks)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 4;
        for (let a = 0; a < 360; a += 30) {
            const rad = (a * Math.PI) / 180;
            const r1 = 120;
            const r2 = 135;
            ctx.beginPath();
            ctx.moveTo(half + Math.cos(rad) * r1, half + Math.sin(rad) * r1);
            ctx.lineTo(half + Math.cos(rad) * r2, half + Math.sin(rad) * r2);
            ctx.stroke();
        }

        // 4 Chữ thập ngắm bắn laser
        ctx.strokeStyle = themeColors.beam;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(half - 160, half); ctx.lineTo(half - 90, half);
        ctx.moveTo(half + 90, half); ctx.lineTo(half + 160, half);
        ctx.moveTo(half, half - 160); ctx.lineTo(half, half - 90);
        ctx.moveTo(half, half + 90); ctx.lineTo(half, half + 160);
        ctx.stroke();

        // Chấm laser ngắm bắn ở trung tâm
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(half, half, 18, 0, Math.PI * 2);
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * Sinh Texture Giáp Thép Công Nghệ Cao cho Boss Mecha Titan (Weathered Mecha Carapace)
 */
function createBossArmorTexture(stageId = 1) {
    if (typeof document === 'undefined') return null;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Nền giáp kim loại titan sẫm màu
    const colors = {
        1: { base: '#7f1d1d', dark: '#450a0a', line: '#ef4444', accent: '#f59e0b' },
        2: { base: '#0c4a6e', dark: '#082f49', line: '#38bdf8', accent: '#00f0ff' },
        3: { base: '#581c87', dark: '#3b0764', line: '#c084fc', accent: '#ec4899' }
    }[stageId] || { base: '#7f1d1d', dark: '#450a0a', line: '#ef4444', accent: '#f59e0b' };

    ctx.fillStyle = colors.base;
    ctx.fillRect(0, 0, size, size);

    // Mảng giáp carbon vát góc tương phản
    ctx.fillStyle = colors.dark;
    ctx.fillRect(40, 40, size - 80, size - 80);

    // Dải sọc cảnh báo nguy hiểm công nghiệp (Hazard Yellow/Black Stripes) ở góc
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(120, 0); ctx.lineTo(0, 120);
    ctx.fill();

    ctx.fillStyle = colors.accent;
    for (let i = 15; i < 110; i += 25) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i + 15, 0); ctx.lineTo(0, i + 15); ctx.lineTo(0, i);
        ctx.fill();
    }

    // Các đường rãnh ghép giáp phát quang (Luminous Armor Seams)
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.strokeRect(60, 60, size - 120, size - 120);
    ctx.moveTo(size / 2, 60); ctx.lineTo(size / 2, size - 60);
    ctx.moveTo(60, size / 2); ctx.lineTo(size - 60, size / 2);
    ctx.stroke();

    // Các chốt đinh tán cơ khí (Heavy Steel Rivets)
    ctx.fillStyle = '#cbd5e1';
    const rivets = [
        [75, 75], [size - 75, 75], [75, size - 75], [size - 75, size - 75],
        [size / 2, 85], [size / 2, size - 85], [85, size / 2], [size - 85, size / 2]
    ];
    rivets.forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fill();
    });

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
        this.cameraShakeIntensity = 0.25;
        this.cameraShakeOffset = new THREE.Vector3(0, 0, 0);
        this.cameraBasePos = new THREE.Vector3(0, 7.8, 14.5);
        if (this.engine && this.engine.camera) {
            this.engine.camera.position.set(0, 7.8, 14.5);
        }
        this.cameraLookAtBase = new THREE.Vector3(0, 1.5, -0.8);
        this.hitStopTimer = 0;
        this.isHitStop = false;

        // Hệ thống Cinematic Dynamic Camera 3 Tầng (SPEC-CINEMATIC-CAM-001)
        this.cameraState = {
            isDrifting: false,
            driftTarget: null,
            driftTimer: 0,
            idleTime: 0
        };
        this.isDrifting = false;

        this.actionZoomTimer = 0;
        this.actionZoomOffset = new THREE.Vector3(0, 0, 0);

        this.isOrbitMode = false;
        this.cameraTransition = null;
        if (this.engine) {
            this.engine.onUserControlStart = () => {
                this.isOrbitMode = true;
                if (typeof document !== 'undefined') {
                    const btnOrbit = document.getElementById('btnCamOrbit');
                    if (btnOrbit) {
                        ['btnCamCombat', 'btnCamHero', 'btnCamBoss'].forEach(id => {
                            const b = document.getElementById(id);
                            if (b) b.classList.remove('active');
                        });
                        btnOrbit.classList.add('active');
                    }
                }
            };
        }

        this.initStageEnvironment();
        this.buildChibiHeroes();
        this.buildChibiBoss();
        this.initEventListeners();
    }

    /** 1. XÂY DỰNG QUANG CẢNH SÂN ĐẤU CYBERPUNK (BATTLE SCENERY) */
    initStageEnvironment() {
        // A. SÀN ĐẤU CÔNG NGHỆ CAO ĐA TẦNG (HEX-GRID ARENA FLOOR) - QUY MÔ MỞ RỘNG (SPEC-COMBAT-SCALE-002)
        const floorGeo = new THREE.CylinderGeometry(9.2, 9.8, 0.6, 48);
        const floorMat = new THREE.MeshStandardMaterial({
            map: createCyberArenaFloorTexture(),
            metalness: 0.85,
            roughness: 0.35
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.30;
        floor.receiveShadow = true;
        this.stageGroup.add(floor);

        // Vành đai Neon bảo vệ sàn đấu (Outer Neon Border Ring)
        const outerRingGeo = new THREE.TorusGeometry(9.25, 0.12, 16, 64);
        const outerRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
        outerRing.rotation.x = Math.PI / 2;
        outerRing.position.y = 0.01;
        this.stageGroup.add(outerRing);

        // Vòng năng lượng xoay ngầm bên dưới sàn
        const underRingGeo = new THREE.RingGeometry(5.5, 5.9, 48);
        const underRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
        this.underRingMesh = new THREE.Mesh(underRingGeo, underRingMat);
        this.underRingMesh.rotation.x = Math.PI / 2;
        this.underRingMesh.position.y = 0.02;
        this.stageGroup.add(this.underRingMesh);

        // B. 4 CỘT THÁP NĂNG LƯỢNG MONOLITHS (QUANG CẢNH MÔI TRƯỜNG CHIẾN TRƯỜNG MỞ RỘNG >= 7.0m)
        const pillarCoords = [
            { x: -7.5, z: -5.2 },
            { x: 7.5, z: -5.2 },
            { x: -8.2, z: 3.2 },
            { x: 8.2, z: 3.2 }
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
                { x: -3.8, y: 3.5, z: -5.8, rotY: 0.35 },
                { x: 3.8, y: 3.5, z: -5.8, rotY: -0.35 }
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
                rotY: 2.62,
                headCompAngle: -0.45,
                weaponType: 'dual_katanas'
            },
            {
                name: 'Elysia',
                role: 'Supporter',
                color: 0x8b5cf6,
                hairColor: 0xa855f7,
                x: -0.75, z: 1.5,
                rotY: 2.88,
                headCompAngle: -0.35,
                weaponType: 'void_orbs'
            },
            {
                name: 'Lin',
                role: 'Healer',
                color: 0x10b981,
                hairColor: 0x059669,
                x: 0.75, z: 1.5,
                rotY: -2.88,
                headCompAngle: 0.35,
                weaponType: 'nano_staff'
            },
            {
                name: 'Boran',
                role: 'Defender',
                color: 0x2563eb,
                hairColor: 0x1e3a8a,
                x: 2.3, z: 1.2,
                rotY: -2.62,
                headCompAngle: 0.45,
                weaponType: 'aegis_shield'
            }
        ];

        heroConfigs.forEach((cfg, idx) => {
            const rootGroup = new THREE.Group();
            rootGroup.position.set(cfg.x, 0.45, cfg.z);
            rootGroup.rotation.y = cfg.rotY;

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
            headMesh.rotation.y = cfg.headCompAngle;
            bodyGroup.add(headMesh);

            // B. MÁI TÓC ANIME NHIỀU LỚP (STYLIZED CHIBI ANIME HAIR)
            const hairMat = new THREE.MeshStandardMaterial({
                color: cfg.hairColor,
                roughness: 0.35,
                metalness: 0.15
            });

            // Khối tóc 3D bao phủ đỉnh đầu và gáy (3D Hair Volume Cap - Không còn đầu trọc)
            const hairCapGeo = new THREE.SphereGeometry(0.512, 20, 16);
            hairCapGeo.scale(1.02, 0.96, 1.01);
            const hairCapMesh = new THREE.Mesh(hairCapGeo, hairMat);
            hairCapMesh.position.set(0, 0.02, -0.05);
            headMesh.add(hairCapMesh);

            // Mặt Anime Chibi dán đè phía trước đầu (Expressive Face Decal gắn trực tiếp vào Head Mesh)
            const faceGeo = new THREE.PlaneGeometry(0.64, 0.64);
            const faceTexNormal = createAnimeFaceTexture(cfg.role, 'normal');
            const faceTexHit = createAnimeFaceTexture(cfg.role, 'hit');
            const faceTexDie = createAnimeFaceTexture(cfg.role, 'die');
            const faceTexAttack = createAnimeFaceTexture(cfg.role, 'attack');

            const faceMat = new THREE.MeshBasicMaterial({
                map: faceTexNormal,
                transparent: true,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -2.0,
                polygonOffsetUnits: -4.0,
                side: THREE.FrontSide
            });
            const faceMesh = new THREE.Mesh(faceGeo, faceMat);
            faceMesh.position.set(0, 0, 0.49);
            faceMesh.renderOrder = 10;
            headMesh.add(faceMesh);

            // Tóc mái trước trán - 5 cụm nón mượt mà uốn theo vòm trán Chibi
            const bangGeo = new THREE.ConeGeometry(0.12, 0.35, 12);
            for (let b = -2; b <= 2; b++) {
                const bang = new THREE.Mesh(bangGeo, hairMat);
                const u = b * 0.11;
                const cosA = Math.cos(cfg.headCompAngle);
                const sinA = Math.sin(cfg.headCompAngle);
                const bX = u * cosA + 0.42 * sinA;
                const bZ = -u * sinA + 0.42 * cosA;
                bang.position.set(bX, 1.12, bZ);
                bang.rotation.y = cfg.headCompAngle;
                bang.rotation.z = -u * 0.75;
                bang.rotation.x = 0.48;
                bodyGroup.add(bang);
            }

            // 2 Lọn tóc mai ôm lấy hai bên má (Anime Framing Side Locks)
            [-0.34, 0.34].forEach((sideX, sIdx) => {
                const lockGeo = new THREE.ConeGeometry(0.08, 0.46, 8);
                const lock = new THREE.Mesh(lockGeo, hairMat);
                lock.position.set(sideX, 0.70, 0.30);
                lock.rotation.z = (sIdx === 0 ? 1 : -1) * 0.16;
                lock.rotation.x = 0.22;
                bodyGroup.add(lock);
            });

            // Tóc & Phụ kiện đặc trưng từng Role
            let accessoryMesh = null;
            if (cfg.role === 'Attacker') {
                // Astra: Đuôi ngựa cao nhọn vút phía sau + Vòng kim loại giữ tóc + Kính Cyber Visor
                const ponyGeo = new THREE.ConeGeometry(0.28, 0.85, 8);
                const pony = new THREE.Mesh(ponyGeo, hairMat);
                pony.position.set(0, 1.25, -0.45);
                pony.rotation.x = -1.1;
                bodyGroup.add(pony);

                // Khuyên giữ đuôi tóc màu vàng kim
                const tieGeo = new THREE.TorusGeometry(0.14, 0.03, 6, 12);
                const tieMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
                const tie = new THREE.Mesh(tieGeo, tieMat);
                tie.position.set(0, 1.18, -0.38);
                tie.rotation.x = 0.5;
                bodyGroup.add(tie);

                // Kính đo Cyber Visor tai trái
                const visorGeo = new THREE.BoxGeometry(0.12, 0.14, 0.28);
                const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
                const visor = new THREE.Mesh(visorGeo, visorMat);
                visor.position.set(-0.48, 0.88, 0.2);
                bodyGroup.add(visor);

            } else if (cfg.role === 'Supporter') {
                // Elysia: 2 Bím tóc dài 2 bên (Twintails) + Vòng nơ vàng + Vòng hào quang Runic sau lưng
                [-0.45, 0.45].forEach((side, sI) => {
                    const tailGeo = new THREE.CylinderGeometry(0.1, 0.04, 0.75, 8);
                    const tail = new THREE.Mesh(tailGeo, hairMat);
                    tail.position.set(side, 0.65, -0.2);
                    tail.rotation.z = side > 0 ? -0.4 : 0.4;
                    bodyGroup.add(tail);

                    // Nơ tóc vàng
                    const ribbonGeo = new THREE.TorusGeometry(0.08, 0.02, 6, 12);
                    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
                    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
                    ribbon.position.set(side, 0.95, -0.15);
                    bodyGroup.add(ribbon);
                });

                // Vòng cổ thuật Runic Circle sau lưng
                const haloBackGeo = new THREE.RingGeometry(0.36, 0.42, 24);
                const haloBackMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide });
                const haloBack = new THREE.Mesh(haloBackGeo, haloBackMat);
                haloBack.position.set(0, 0.55, -0.28);
                bodyGroup.add(haloBack);

            } else if (cfg.role === 'Healer') {
                // Lin: 2 Búi tóc tròn Odango + Vòng khuyên ngọc + Vòng Halo Thiên Thần Nanite
                [-0.42, 0.42].forEach(side => {
                    const bunGeo = new THREE.SphereGeometry(0.2, 12, 12);
                    const bun = new THREE.Mesh(bunGeo, hairMat);
                    bun.position.set(side, 1.22, 0);
                    bodyGroup.add(bun);

                    // Vòng khuyên ngọc bao quanh búi tóc
                    const ringGeo = new THREE.TorusGeometry(0.15, 0.025, 6, 16);
                    const ringMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 });
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.position.set(side, 1.22, 0);
                    ring.rotation.x = Math.PI / 2;
                    bodyGroup.add(ring);
                });

                // Vòng Halo phát sáng trên đầu
                const haloGeo = new THREE.TorusGeometry(0.38, 0.04, 8, 24);
                const haloMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
                accessoryMesh = new THREE.Mesh(haloGeo, haloMat);
                accessoryMesh.rotation.x = Math.PI / 2;
                accessoryMesh.position.set(0, 1.48, 0);
                bodyGroup.add(accessoryMesh);

            } else if (cfg.role === 'Defender') {
                // Boran: Nón giáp Mecha Chibi với 2 tai thỏ Antenna Radar + Khe kính Visor LED
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

                // Khe kính Visor LED phát sáng trên nón giáp
                const visorSlitGeo = new THREE.BoxGeometry(0.36, 0.08, 0.05);
                const visorSlitMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
                const visorSlit = new THREE.Mesh(visorSlitGeo, visorSlitMat);
                visorSlit.position.set(0, 0.94, 0.44);
                bodyGroup.add(visorSlit);
            }

            // C. THÂN NHỎ NHẮN VÁY ÁO CYBER ANIME (CHIBI TORSO & SKIRT)
            const coatMat = new THREE.MeshStandardMaterial({
                color: cfg.color,
                metalness: 0.45,
                roughness: 0.35
            });
            const torsoGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.45, 16);
            const torsoMesh = new THREE.Mesh(torsoGeo, coatMat);
            torsoMesh.position.y = 0.28;
            bodyGroup.add(torsoMesh);

            // Cổ áo Cyber Collar cách điệu
            const collarGeo = new THREE.TorusGeometry(0.23, 0.03, 8, 16);
            const collarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
            const collarMesh = new THREE.Mesh(collarGeo, collarMat);
            collarMesh.rotation.x = Math.PI / 2;
            collarMesh.position.y = 0.50;
            bodyGroup.add(collarMesh);

            // Tấm ốp ngực / Huy hiệu chiến thuật Cyber Crest phát quang
            const crestGeo = new THREE.BoxGeometry(0.14, 0.11, 0.04);
            const crestMat = new THREE.MeshStandardMaterial({
                color: cfg.color,
                emissive: cfg.color,
                emissiveIntensity: 0.85,
                metalness: 0.8
            });
            const crestMesh = new THREE.Mesh(crestGeo, crestMat);
            crestMesh.position.set(0, 0.35, 0.24);
            bodyGroup.add(crestMesh);

            // Tà áo / Váy chiến đấu Chibi xòe A-line (Flared Anime Skirt)
            const skirtGeo = new THREE.CylinderGeometry(0.25, 0.36, 0.18, 16);
            const skirtMat = new THREE.MeshStandardMaterial({
                color: cfg.color,
                roughness: 0.4,
                metalness: 0.35
            });
            const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
            skirtMesh.position.y = 0.08;
            bodyGroup.add(skirtMesh);

            // Thắt lưng năng lượng Tactical Cyber Belt quanh eo (SPEC-WEB3D-004 / AC-04)
            const beltGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.07, 16);
            const beltMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                metalness: 0.85,
                roughness: 0.25
            });
            const beltMesh = new THREE.Mesh(beltGeo, beltMat);
            beltMesh.position.y = 0.17;
            bodyGroup.add(beltMesh);

            // Khóa thắt lưng Cyber Buckle phát quang
            const buckleGeo = new THREE.BoxGeometry(0.09, 0.07, 0.05);
            const buckleMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
            const buckleMesh = new THREE.Mesh(buckleGeo, buckleMat);
            buckleMesh.position.set(0, 0.17, 0.25);
            bodyGroup.add(buckleMesh);

            // Cặp túi tiện ích Tactical Cyber Pouches 2 bên hông
            [-0.26, 0.26].forEach(pX => {
                const pouchGeo = new THREE.BoxGeometry(0.06, 0.08, 0.08);
                const pouchMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
                const pouch = new THREE.Mesh(pouchGeo, pouchMat);
                pouch.position.set(pX, 0.17, 0.08);
                bodyGroup.add(pouch);
            });

            // 2 Cánh tay Chibi (Left & Right Arms) & Bàn tay Găng tay Chibi Gauntlets (SPEC-WEB3D-004 / AC-03)
            const armMat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.45 });
            const handMat = new THREE.MeshStandardMaterial({ color: 0xffe8dc, roughness: 0.5 });
            const cuffMat = new THREE.MeshBasicMaterial({ color: cfg.color });
            [-0.32, 0.32].forEach((armX, armIdx) => {
                const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.32, 8);
                const armMesh = new THREE.Mesh(armGeo, armMat);
                armMesh.position.set(armX, 0.26, 0.04);
                armMesh.rotation.z = (armIdx === 0 ? 1 : -1) * 0.35;
                armMesh.rotation.x = -0.2;
                bodyGroup.add(armMesh);

                // Găng tay / Bàn tay Chibi Gauntlets tròn xinh xắn
                const handGeo = new THREE.SphereGeometry(0.08, 10, 10);
                const handMesh = new THREE.Mesh(handGeo, handMat);
                handMesh.position.set(armX + (armIdx === 0 ? -0.06 : 0.06), 0.12, 0.10);
                bodyGroup.add(handMesh);

                // Vòng bo cổ tay Neon
                const cuffGeo = new THREE.TorusGeometry(0.07, 0.02, 6, 12);
                const cuffMesh = new THREE.Mesh(cuffGeo, cuffMat);
                cuffMesh.position.set(armX + (armIdx === 0 ? -0.04 : 0.04), 0.15, 0.08);
                bodyGroup.add(cuffMesh);
            });

            // Giáp vai Cyber Pauldrons cho Hero chuyên trách
            if (cfg.role === 'Attacker') {
                // Astra: Giáp vai Samurai Cyber bên vai trái
                const pldGeo = new THREE.BoxGeometry(0.16, 0.12, 0.20);
                const pldMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.2 });
                const pldMesh = new THREE.Mesh(pldGeo, pldMat);
                pldMesh.position.set(-0.35, 0.38, 0.02);
                pldMesh.rotation.z = 0.3;
                bodyGroup.add(pldMesh);
            } else if (cfg.role === 'Defender') {
                // Boran: Cặp giáp vai Titan bọc thép hạng nặng 2 bên
                [-0.38, 0.38].forEach((pX, pI) => {
                    const pldGeo = new THREE.BoxGeometry(0.22, 0.16, 0.24);
                    const pldMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.9, roughness: 0.2 });
                    const pldMesh = new THREE.Mesh(pldGeo, pldMat);
                    pldMesh.position.set(pX, 0.38, 0.02);
                    pldMesh.rotation.z = (pI === 0 ? 1 : -1) * 0.25;
                    bodyGroup.add(pldMesh);
                });
            }

            // Chân & Ủng Chunky Boots Chibi
            const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
            const bootSoleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
            [-0.14, 0.14].forEach(legX => {
                const legGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.35, 8);
                const leg = new THREE.Mesh(legGeo, bootMat);
                leg.position.set(legX, 0.05, 0);
                bodyGroup.add(leg);

                // Vòng bo cổ chân
                const ankleGeo = new THREE.TorusGeometry(0.10, 0.02, 6, 12);
                const ankleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
                const ankle = new THREE.Mesh(ankleGeo, ankleMat);
                ankle.rotation.x = Math.PI / 2;
                ankle.position.set(legX, 0.02, 0);
                bodyGroup.add(ankle);

                // Ủng Chunky Boots đế dày
                const bootGeo = new THREE.BoxGeometry(0.18, 0.16, 0.24);
                const bootMesh = new THREE.Mesh(bootGeo, bootSoleMat);
                bootMesh.position.set(legX, -0.06, 0.04);
                bodyGroup.add(bootMesh);
            });

            // Bóng tròn mờ dưới chân
            const shadowGeo = new THREE.CircleGeometry(0.42, 16);
            const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
            const shadow = new THREE.Mesh(shadowGeo, shadowMat);
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.y = -0.15;
            rootGroup.add(shadow);

            // D. VŨ KHÍ ANIME ĐẶC TRƯNG TỪNG NHÂN VẬT VỚI EMISSIVE NEON SHADERS
            let weaponGroup = new THREE.Group();
            bodyGroup.add(weaponGroup);

            if (cfg.weaponType === 'dual_katanas') {
                // Song kiếm Katana Lôi Điện phát sáng Emissive Neon kèm Tsuba vàng
                [-0.38, 0.38].forEach((wX, i) => {
                    const bladeGeo = new THREE.BoxGeometry(0.06, 0.95, 0.12);
                    const bladeMat = new THREE.MeshStandardMaterial({
                        color: 0xff3b30,
                        emissive: 0xff3b30,
                        emissiveIntensity: 1.4,
                        metalness: 0.7,
                        roughness: 0.2
                    });
                    const blade = new THREE.Mesh(bladeGeo, bladeMat);
                    blade.position.set(wX, 0.4, 0.28);
                    blade.rotation.z = (i === 0 ? 1 : -1) * 0.45;
                    blade.rotation.x = -0.3;
                    weaponGroup.add(blade);

                    // Chuôi kiếm Tsuba & Cán kiếm Katana
                    const tsubaGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 8);
                    const tsubaMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 });
                    const tsuba = new THREE.Mesh(tsubaGeo, tsubaMat);
                    tsuba.position.set(wX, -0.08, 0.28);
                    tsuba.rotation.z = (i === 0 ? 1 : -1) * 0.45;
                    weaponGroup.add(tsuba);
                });
            } else if (cfg.weaponType === 'void_orbs') {
                // 3 Quả cầu tinh thể hư vô trôi nổi với Emissive Shaders & Runic Rings
                const orbGeo = new THREE.DodecahedronGeometry(0.14, 0);
                const orbMat = new THREE.MeshStandardMaterial({
                    color: 0xc084fc,
                    emissive: 0xc084fc,
                    emissiveIntensity: 1.5,
                    wireframe: true,
                    metalness: 0.8,
                    roughness: 0.1
                });
                for (let o = 0; o < 3; o++) {
                    const orb = new THREE.Mesh(orbGeo, orbMat);
                    const orbX = Math.cos((o * Math.PI * 2) / 3) * 0.52;
                    const orbZ = Math.sin((o * Math.PI * 2) / 3) * 0.52;
                    orb.position.set(orbX, 0.45, orbZ);
                    weaponGroup.add(orb);

                    // Vòng quỹ đạo năng lượng Runic Ring bao quanh quả cầu
                    const ringGeo = new THREE.TorusGeometry(0.20, 0.015, 6, 16);
                    const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
                    const runicRing = new THREE.Mesh(ringGeo, ringMat);
                    runicRing.position.set(orbX, 0.45, orbZ);
                    runicRing.rotation.x = Math.PI / 4;
                    weaponGroup.add(runicRing);
                }
            } else if (cfg.weaponType === 'nano_staff') {
                // Quyền trượng Nanite Thánh Nữ
                const staffGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8);
                const staffMat = new THREE.MeshStandardMaterial({
                    color: 0xf8fafc,
                    emissive: 0x10b981,
                    emissiveIntensity: 1.35,
                    metalness: 0.8
                });
                const staff = new THREE.Mesh(staffGeo, staffMat);
                staff.position.set(0.42, 0.45, 0.25);
                staff.rotation.z = -0.25;

                // Tinh thể chữa lành hình hoa ngọc bích phát sáng
                const tipGeo = new THREE.OctahedronGeometry(0.18, 0);
                const tipMat = new THREE.MeshStandardMaterial({
                    color: 0x10b981,
                    emissive: 0x10b981,
                    emissiveIntensity: 1.3
                });
                const tip = new THREE.Mesh(tipGeo, tipMat);
                tip.position.y = 0.6;
                staff.add(tip);

                // Vòng hào quang chữa lành
                const auraGeo = new THREE.TorusGeometry(0.24, 0.02, 6, 16);
                const auraMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
                const auraMesh = new THREE.Mesh(auraGeo, auraMat);
                auraMesh.position.y = 0.6;
                auraMesh.rotation.x = Math.PI / 2;
                staff.add(auraMesh);

                weaponGroup.add(staff);

            } else if (cfg.weaponType === 'aegis_shield') {
                // Khiên tháp lục giác hạng nặng (Aegis Shield) phát quang
                const shieldGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.08, 6);
                const shieldMat = new THREE.MeshStandardMaterial({
                    color: 0x38bdf8,
                    emissive: 0x38bdf8,
                    emissiveIntensity: 1.2,
                    metalness: 0.9,
                    roughness: 0.15,
                    transparent: true,
                    opacity: 0.85
                });
                const shield = new THREE.Mesh(shieldGeo, shieldMat);
                shield.position.set(0.48, 0.35, 0.35);
                shield.rotation.x = Math.PI / 2;

                // Lõi năng lượng trung tâm Đại Khiên
                const coreGeo = new THREE.SphereGeometry(0.16, 10, 10);
                const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
                const coreMesh = new THREE.Mesh(coreGeo, coreMat);
                coreMesh.position.y = 0.05;
                shield.add(coreMesh);

                weaponGroup.add(shield);
            }

            this.stageGroup.add(rootGroup);

            // Lưu trữ Controller điều khiển trạng thái (State Machine)
            this.heroes.push({
                name: cfg.name,
                role: cfg.role,
                root: rootGroup,
                rootGroup: rootGroup,
                body: bodyGroup,
                head: headMesh,
                face: faceMesh,
                faceTex: { normal: faceTexNormal, hit: faceTexHit, die: faceTexDie, attack: faceTexAttack },
                accessory: accessoryMesh,
                weapon: weaponGroup,
                baseX: cfg.x,
                baseY: 0.45,
                baseZ: cfg.z,
                offset: idx * 0.9,
                state: 'idle',       // 'idle' | 'attack' | 'hit' | 'die' | 'revive'
                animPhase: 'idle',   // 'idle' | 'anticipate' | 'lunge' | 'impact' | 'recoil'
                animTimer: 0,
                shakeTimer: 0,
                isDefeated: false
            });
        });
    }

    /** 3. DỰNG BOSS CHIBI MECHA TITAN (SENTINEL UNIT 07 / WARDEN AEGIS / NULL SOVEREIGN) */
    buildChibiBoss() {
        this.bossGroup = new THREE.Group();
        this.bossGroup.position.set(0, 1.45, -4.8);

        // A. KHỐI THÂN MECHA CHIBI TRÒN BÉO ĐÁNG YÊU (CHUNKY CHIBI MECHA BODY)
        const coreGeo = new THREE.DodecahedronGeometry(1.35, 1);
        const armorTex = createBossArmorTexture(this.state.currentStageId);
        this.bossMat = new THREE.MeshStandardMaterial({
            color: 0xaa2222,
            map: armorTex,
            emissive: 0x550011,
            emissiveIntensity: 0.6,
            metalness: 0.88,
            roughness: 0.28
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

        // B2. MŨ GIÁP MECHA BROW VISOR TRÊN MẮT CYCLOPS (TĂNG ĐỘ HẦM HỐ HI-TECH)
        const visorGeo = new THREE.BoxGeometry(1.05, 0.20, 0.32);
        const visorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0.64, 1.12);
        visor.rotation.x = 0.22;
        this.bossGroup.add(visor);

        // C. 2 ỐNG PHÁO CỐI MINI VAI TRÒN (CHIBI SHOULDER CANNONS)
        [-1.1, 1.1].forEach((cX, i) => {
            const cannonGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.95, 12);
            const cannonMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.25 });
            const cannon = new THREE.Mesh(cannonGeo, cannonMat);
            cannon.position.set(cX, 0.85, 0.1);
            cannon.rotation.x = Math.PI / 3.5;
            this.bossGroup.add(cannon);

            // Nòng nạp năng lượng pháo laser
            const muzzleGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.12, 10);
            const muzzleMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
            const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
            muzzle.position.set(cX, 1.25, 0.35);
            muzzle.rotation.x = Math.PI / 3.5;
            this.bossGroup.add(muzzle);
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

        // F. 2 ỐNG PHẢN LỰC ĐẨY ION THRUSTERS PHÍA SAU LƯNG (DUAL REAR ION THRUSTERS - SPEC-WEB3D-004 / AC-06)
        [-0.7, 0.7].forEach((tX) => {
            const thrusterGeo = new THREE.CylinderGeometry(0.24, 0.36, 0.65, 12);
            const thrusterMat = new THREE.MeshStandardMaterial({
                color: 0x1e293b,
                metalness: 0.9,
                roughness: 0.2
            });
            const thrusterMesh = new THREE.Mesh(thrusterGeo, thrusterMat);
            thrusterMesh.position.set(tX, 0.3, -1.05);
            thrusterMesh.rotation.x = -Math.PI / 3;
            this.bossGroup.add(thrusterMesh);

            // Vòng lửa phản lực Ion Glow phát sáng
            const nozzleGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.12, 12);
            const nozzleMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
            const nozzleMesh = new THREE.Mesh(nozzleGeo, nozzleMat);
            nozzleMesh.position.set(tX, 0.1, -1.3);
            nozzleMesh.rotation.x = -Math.PI / 3;
            this.bossGroup.add(nozzleMesh);

            // Ngọn lửa plasma ion phụt ra từ ống xả phản lực
            const flameGeo = new THREE.ConeGeometry(0.14, 0.60, 8);
            const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
            const flame = new THREE.Mesh(flameGeo, flameMat);
            flame.position.set(tX, -0.22, -1.55);
            flame.rotation.x = -Math.PI / 3;
            this.bossGroup.add(flame);
        });

        // G. KHE TẢN NHIỆT CÔNG NGHỆ CAO HAI BÊN SƯỜN (CHEST FLANK HAZARD VENTS - SPEC-WEB3D-004 / AC-07)
        [-0.95, 0.95].forEach((vX) => {
            const ventGeo = new THREE.BoxGeometry(0.12, 0.55, 0.18);
            const ventMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
            const ventMesh = new THREE.Mesh(ventGeo, ventMat);
            ventMesh.position.set(vX, 0.05, 0.65);
            ventMesh.rotation.y = (vX > 0 ? -1 : 1) * 0.45;
            this.bossGroup.add(ventMesh);
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
            baseZ: -4.8,
            state: 'idle',       // 'idle' | 'attack' | 'hit' | 'die'
            animTimer: 0,
            shakeTimer: 0,
            isBroken: false,
            isHitStop: false
        };
    }

    /** Điều khiển góc quay và tiêu điểm Camera (360 Orbit, Hero Focus, Boss Focus, Combat) */
    setCameraPreset(preset) {
        if (!this.engine || !this.engine.camera) return;
        const cam = this.engine.camera;
        const controls = this.engine.controls;

        const targetPos = new THREE.Vector3();
        const targetLookAt = new THREE.Vector3();

        if (preset === 'combat') {
            this.isOrbitMode = false;
            if (this.engine) this.engine.isUserOrbiting = false;
            targetPos.set(0, 7.8, 14.5);
            targetLookAt.set(0, 1.5, -0.8);
        } else if (preset === 'orbit') {
            this.isOrbitMode = true;
            if (this.engine) this.engine.isUserOrbiting = true;
            targetPos.set(0, 5.2, 9.5);
            targetLookAt.set(0, 1.2, -1.0);
        } else if (preset === 'hero') {
            this.isOrbitMode = true;
            if (this.engine) this.engine.isUserOrbiting = true;
            // Cận cảnh trực diện 4 Hero Chibi
            targetPos.set(0, 1.15, 3.8);
            targetLookAt.set(0, 0.8, 1.35);
        } else if (preset === 'boss') {
            this.isOrbitMode = true;
            if (this.engine) this.engine.isUserOrbiting = true;
            // Cận cảnh trực diện Mecha Boss Titan
            targetPos.set(0, 2.2, -1.5);
            targetLookAt.set(0, 1.6, -4.8);
        }

        const currentTarget = (controls && controls.target) ? controls.target.clone() : new THREE.Vector3(0, 1.2, 0);
        this.cameraTransition = {
            startPos: cam.position.clone(),
            targetPos: targetPos,
            startTarget: currentTarget,
            targetTarget: targetLookAt,
            progress: 0,
            duration: 0.55
        };

        if (typeof document !== 'undefined') {
            ['btnCamCombat', 'btnCamOrbit', 'btnCamHero', 'btnCamBoss'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.classList.remove('active');
            });
            const activeId = { combat: 'btnCamCombat', orbit: 'btnCamOrbit', hero: 'btnCamHero', boss: 'btnCamBoss' }[preset];
            const activeBtn = document.getElementById(activeId);
            if (activeBtn) activeBtn.classList.add('active');
        }
    }

    /** Kích hoạt phóng xa toàn cảnh giao tranh (Action Zoom-Out) */
    triggerActionZoom() {
        this.actionZoomTimer = 0.35;
        this.actionZoomOffset.set(0, 0.95, 2.05);
    }

    /** 4. KÍCH HOẠT VÀ ĐIỀU PHỐI ANIMATION THEO SỰ KIỆN GAME (EVENT LISTENERS) */
    initEventListeners() {
        const cancelFocusDrift = () => {
            if (this.cameraState) {
                this.cameraState.isDrifting = false;
                this.cameraState.idleTime = 0;
            }
            this.isDrifting = false;
        };

        // Ngắt tiêu điểm tức thì khi chạm vào bàn cờ Match-3 (AC-06)
        events.on('board:pointerdown', cancelFocusDrift);
        events.on('board:swap', cancelFocusDrift);
        events.on('hero:attack', () => this.triggerActionZoom());
        events.on('boss:attack', () => this.triggerActionZoom());
        events.on('cascade_step', () => this.triggerActionZoom());

        // A. HERO TẤN CÔNG (ATTACK ANIMATION)
        events.on('damage_dealt', ({ hero, damage }) => {
            this.triggerActionZoom();
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

    /** Diễn hoạt Hero Chibi lao tới chém (Attack Animation: Anticipation -> Lunge) */
    playHeroAttack(heroCtrl, isCounter = false) {
        heroCtrl.state = 'attack';
        heroCtrl.animPhase = 'anticipate';
        heroCtrl.animTime = 0.0;
        heroCtrl.isCounter = isCounter;
        heroCtrl.targetX = isCounter ? 0.0 : heroCtrl.baseX * 0.35;
        heroCtrl.targetZ = heroCtrl.baseZ - 2.8;

        // Thiết lập vị trí lướt tới targetZ và nén nhẹ lấy đà
        heroCtrl.root.position.set(heroCtrl.targetX, heroCtrl.baseY + 0.25, heroCtrl.targetZ);
        heroCtrl.body.rotation.x = 0.4;
        if (heroCtrl.weapon) heroCtrl.weapon.rotation.x = -Math.PI / 2.5;
        if (heroCtrl.face && heroCtrl.faceTex) heroCtrl.face.material.map = heroCtrl.faceTex.attack;
    }

    /** Diễn hoạt Hero tung chiêu nộ cực đại (Super Attack) */
    playHeroSuperAttack(heroCtrl) {
        heroCtrl.state = 'super_attack';
        heroCtrl.animPhase = 'super_attack';
        heroCtrl.animTime = 0.0;

        // Nhảy vọt lên không trung
        heroCtrl.root.position.set(heroCtrl.baseX * 0.2, heroCtrl.baseY + 1.6, heroCtrl.baseZ - 1.2);
        heroCtrl.body.rotation.x = 0.6;
        if (heroCtrl.weapon) heroCtrl.weapon.rotation.z = Math.PI * 2;
        if (heroCtrl.face && heroCtrl.faceTex) heroCtrl.face.material.map = heroCtrl.faceTex.attack;
    }

    /** Diễn hoạt Hero bị trúng đòn (Hit Reaction) */
    playHeroHit(heroCtrl) {
        if (heroCtrl.isDefeated) return;
        heroCtrl.state = 'hit';
        heroCtrl.animTime = 0.0;
        heroCtrl.shakeTimer = 0.35;

        // Giật lùi về sau và nghiêng người
        heroCtrl.root.position.z = heroCtrl.baseZ + 0.35;
        heroCtrl.body.rotation.x = -0.35;
        if (heroCtrl.face && heroCtrl.faceTex) heroCtrl.face.material.map = heroCtrl.faceTex.hit;
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

    /** Diễn hoạt Boss bị dính đòn (Boss Hit Reaction with Hit-Stop) */
    playBossHit(shakeIntensity = 0.35) {
        if (!this.boss) return;
        this.hitStopTimer = 0.06;
        this.isHitStop = true;
        this.boss.isHitStop = true;
        this.boss.shakeTimer = shakeIntensity;
        this.bossMat.emissiveIntensity = 2.2; // Nhấp nháy chớp sáng
        this.cameraShakeTimer = Math.max(0.35, shakeIntensity);
        this.cameraShakeIntensity = 0.25;
        this.triggerActionZoom();

        setTimeout(() => {
            this.hitStopTimer = 0;
            this.isHitStop = false;
            if (this.boss) {
                this.boss.isHitStop = false;
                this.bossMat.emissiveIntensity = 0.5;
            }
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
        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= delta;
            if (this.hitStopTimer <= 0) {
                this.hitStopTimer = 0;
                this.isHitStop = false;
                if (this.boss) this.boss.isHitStop = false;
            }
        }

        // A. DIỄN HOẠT IDLE, ATTACK & RUNG CHẤN CỦA TỪNG HERO (FRAME-BY-FRAME PROCEDURAL ANIMATION)
        this.heroes.forEach(h => {
            if (h.shakeTimer > 0) {
                h.shakeTimer -= delta;
                h.root.position.x = h.baseX + (Math.random() - 0.5) * 0.14;
            } else if (h.state !== 'attack' && h.state !== 'super_attack') {
                h.root.position.x = h.baseX;
            }

            if (h.state === 'attack') {
                h.animTime = (h.animTime || 0) + delta;
                const t = h.animTime;

                if (t < 0.12) {
                    // PHA 1: ANTICIPATE (Lấy đà & nén thể tích Squash)
                    h.animPhase = 'anticipate';
                    const p = Math.min(1.0, t / 0.12);
                    const sy = 1.0 - 0.18 * p;
                    const sxz = 1.0 + 0.10 * p;
                    h.body.scale.set(sxz, sy, sxz);
                    h.root.position.set(h.targetX || 0, h.baseY - 0.08 * p, h.targetZ || (h.baseZ - 2.8));
                    if (h.weapon) {
                        h.weapon.rotation.x = 0.5 * p;
                    }
                } else if (t < 0.36) {
                    // PHA 2: LUNGE (Lao vút tới tiền tuyến với Stretch thể tích)
                    h.animPhase = 'lunge';
                    const p = Math.min(1.0, (t - 0.12) / 0.24);
                    h.body.scale.set(0.88, 1.25, 0.88);
                    const curX = h.targetX !== undefined ? h.targetX : 0;
                    const curZ = h.targetZ || (h.baseZ - 2.8);
                    const curY = h.baseY + Math.sin(p * Math.PI) * 0.38;
                    h.root.position.set(curX, curY, curZ);
                    h.body.rotation.x = 0.35 * p;
                    if (h.weapon) {
                        h.weapon.rotation.x = -1.8 * p;
                        h.weapon.rotation.z = 0.6 * p;
                    }
                } else if (t < 0.42) {
                    // PHA 3: IMPACT & HIT-STOP (Dừng khung hình va chạm)
                    h.animPhase = 'impact';
                    h.root.position.set(h.targetX !== undefined ? h.targetX : 0, h.baseY + 0.1, h.targetZ || (h.baseZ - 2.8));
                    h.body.scale.set(1.05, 0.95, 1.05);
                    this.hitStopTimer = Math.max(this.hitStopTimer || 0, 0.06);
                    this.hitStopDuration = 0.06;
                } else if (t < 0.60) {
                    // PHA 4: RECOIL (Bật giật lùi về vị trí ban đầu bằng Spring-Damper)
                    h.animPhase = 'recoil';
                    const p = Math.min(1.0, (t - 0.42) / 0.18);
                    const ease = 1.0 - Math.pow(1.0 - p, 2);
                    const curX = (h.targetX !== undefined ? h.targetX : 0) + (h.baseX - (h.targetX !== undefined ? h.targetX : 0)) * ease;
                    const curZ = (h.targetZ || (h.baseZ - 2.8)) + (h.baseZ - (h.targetZ || (h.baseZ - 2.8))) * ease;
                    const curY = h.baseY + (1.0 - p) * 0.1;
                    h.root.position.set(curX, curY, curZ);
                    h.body.rotation.x = 0.35 * (1.0 - ease);
                    if (h.weapon) {
                        h.weapon.rotation.x = -1.8 * (1.0 - ease);
                        h.weapon.rotation.z = 0.6 * (1.0 - ease);
                    }
                    const bounce = Math.sin(p * Math.PI * 2) * 0.08 * (1.0 - p);
                    h.body.scale.set(1.0 - bounce, 1.0 + bounce, 1.0 - bounce);
                } else {
                    // KẾT THÚC: Trở về Idle
                    h.root.position.set(h.baseX, h.baseY, h.baseZ);
                    h.body.rotation.x = 0;
                    h.body.scale.set(1.0, 1.0, 1.0);
                    if (h.weapon) {
                        h.weapon.rotation.x = 0;
                        h.weapon.rotation.z = 0;
                    }
                    h.state = 'idle';
                    h.animPhase = 'idle';
                    h.animTime = 0;
                    if (h.face && h.faceTex) {
                        h.face.material.map = h.faceTex.normal;
                    }
                }
            } else if (h.state === 'super_attack') {
                h.animTime = (h.animTime || 0) + delta;
                const t = h.animTime;
                if (t < 0.55) {
                    h.animPhase = 'super_attack';
                    const p = Math.min(1.0, t / 0.55);
                    const apexY = h.baseY + Math.sin(p * Math.PI) * 1.75;
                    const lungeZ = h.baseZ - Math.sin(p * Math.PI) * 2.2;
                    h.root.position.set(h.baseX * (1.0 - p * 0.5), apexY, lungeZ);
                    h.body.rotation.x = p * Math.PI * 2;
                    if (h.weapon) {
                        h.weapon.rotation.z = p * Math.PI * 4;
                    }
                } else {
                    h.root.position.set(h.baseX, h.baseY, h.baseZ);
                    h.body.rotation.x = 0;
                    h.body.scale.set(1.0, 1.0, 1.0);
                    if (h.weapon) {
                        h.weapon.rotation.z = 0;
                    }
                    h.state = 'idle';
                    h.animPhase = 'idle';
                    h.animTime = 0;
                    if (h.face && h.faceTex) {
                        h.face.material.map = h.faceTex.normal;
                    }
                }
            } else if (h.state === 'hit') {
                h.animTime = (h.animTime || 0) + delta;
                const t = h.animTime;
                if (t < 0.30) {
                    const p = Math.min(1.0, t / 0.30);
                    const flinch = Math.sin(p * Math.PI);
                    h.root.position.z = h.baseZ + 0.36 * flinch;
                    h.root.position.y = h.baseY + 0.06 * flinch;
                    h.body.rotation.x = -0.32 * flinch;
                    h.body.scale.set(1.08 * flinch + (1 - flinch), 0.92 * flinch + (1 - flinch), 1.08 * flinch + (1 - flinch));
                } else {
                    h.root.position.set(h.baseX, h.baseY, h.baseZ);
                    h.body.rotation.x = 0;
                    h.body.scale.set(1.0, 1.0, 1.0);
                    h.state = 'idle';
                    h.animTime = 0;
                    if (h.face && h.faceTex) {
                        h.face.material.map = h.faceTex.normal;
                    }
                }
            } else if (h.state === 'idle' && !h.isDefeated) {
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

        // D. HỆ THỐNG CINEMATIC DYNAMIC CAMERA & ORBIT 360 (SPEC-CINEMATIC-CAM-001)
        // 0. Xử lý hoạt ảnh lướt chuyển góc máy (Camera Preset Glide Transition)
        if (this.cameraTransition) {
            const t = this.cameraTransition;
            t.progress += delta / t.duration;
            const factor = Math.min(1.0, t.progress);
            const ease = 1 - Math.pow(1 - factor, 3); // Cubic Ease Out

            this.engine.camera.position.lerpVectors(t.startPos, t.targetPos, ease);
            if (this.engine.controls) {
                this.engine.controls.target.lerpVectors(t.startTarget, t.targetTarget, ease);
                this.engine.controls.update();
            } else if (typeof this.engine.camera.lookAt === 'function') {
                this.engine.camera.lookAt(t.targetTarget);
            }
            if (factor >= 1.0) {
                this.cameraTransition = null;
            }
            return;
        }

        // 1. Nếu đang ở chế độ xoay 360 độ hoặc người dùng đang kéo chuột xoay sàn đấu
        const isUserRotating = this.isOrbitMode || 
            (this.engine && this.engine.isUserOrbiting) || 
            (this.engine && this.engine.controls && this.engine.controls.state !== -1);

        if (isUserRotating) {
            if (this.cameraShakeTimer > 0) {
                this.cameraShakeTimer -= delta;
            }
            return;
        }

        // 2. Quản lý thời gian nhàn rỗi & Focus Drift
        if (this.cameraState) {
            this.cameraState.idleTime += delta;
            if (this.cameraState.idleTime > 4.5) {
                this.cameraState.isDrifting = true;
                this.isDrifting = true;
            } else {
                this.isDrifting = this.cameraState.isDrifting;
            }
        }

        // 3. Tầng 1: Dao động tự nhiên Handheld Idle Sway (<= 0.25m)
        const time = elapsed || 0;
        const swayX = 0.035 * Math.sin(0.8 * time) + 0.015 * Math.cos(1.2 * time);
        const swayY = 0.02 * Math.sin(1.0 * time);
        const swayZ = 0.015 * Math.cos(0.8 * time);

        // 4. Tầng 3: Action Zoom-Out & Smooth Settle Recovery
        if (this.actionZoomTimer > 0) {
            this.actionZoomTimer -= delta;
            this.actionZoomOffset.y += (0.95 - this.actionZoomOffset.y) * 0.25;
            this.actionZoomOffset.z += (2.05 - this.actionZoomOffset.z) * 0.25;
        } else {
            // Settle mượt mà về 0 (tau_settle damping)
            this.actionZoomOffset.y += (0 - this.actionZoomOffset.y) * 0.25;
            this.actionZoomOffset.z += (0 - this.actionZoomOffset.z) * 0.25;
        }

        // 5. Focus Drift offset (khi nhàn rỗi > 4.5s)
        let driftX = 0, driftY = 0, driftZ = 0;
        if (this.isDrifting && this.cameraState && this.cameraState.idleTime > 4.5) {
            driftX = 0.12 * Math.sin(time * 0.4);
            driftY = 0.08 * Math.cos(time * 0.5);
            driftZ = -0.15;
        }

        // 6. Trauma Screen Shake
        let shakeX = 0, shakeY = 0;
        if (this.cameraShakeTimer > 0) {
            this.cameraShakeTimer -= delta;
            shakeX = (Math.random() > 0.5 ? 1 : -1) * (0.12 + Math.random() * 0.06);
            shakeY = (Math.random() > 0.5 ? 1 : -1) * (0.10 + Math.random() * 0.05);
        }
        if (this.cameraShakeOffset) {
            this.cameraShakeOffset.set(shakeX, shakeY, 0);
        }

        // Áp dụng tọa độ camera cuối cùng
        const cam = this.engine.camera;
        cam.position.x = this.cameraBasePos.x + swayX + driftX + shakeX;
        cam.position.y = this.cameraBasePos.y + swayY + this.actionZoomOffset.y + driftY + shakeY;
        cam.position.z = this.cameraBasePos.z + swayZ + this.actionZoomOffset.z + driftZ;
    }
}
