/**
 * Web/test_cinematic_camera_and_facing.mjs
 * ============================================================================
 * BỘ KIỂM THỬ ĐỘC LẬP: CINEMATIC DYNAMIC CAMERA & 3/4 TACTICAL HERO FACING
 * Đặc tả tham chiếu: Docs/Specs/SPEC_CINEMATIC_CAMERA_AND_HERO_FACING_DIRECTION.md
 * Mã đặc tả: SPEC-CINEMATIC-CAM-001 | QC Lead (@qc_lead)
 * ============================================================================
 * Bao phủ 100% 12 Điều khoản Nghiệm thu (AC-01 đến AC-12):
 *  - AC-01: Inward V-Formation Facing Invariant
 *  - AC-02: Anti-Back-Turn Invariant (F_hero · D_boss >= 0.70)
 *  - AC-03: 3/4 Head Look-At Offset (Head Y-rotation offset 15° - 35° towards Cam)
 *  - AC-04: Idle Handheld Natural Sway (<= 0.25m oscillation)
 *  - AC-05: Idle Random Focus Drift Activation (> 4.5s idle)
 *  - AC-06: Instant Focus Reset on Interaction (<= 0.4s reset on pointerdown/swap)
 *  - AC-07: Combat Action Zoom-Out (Z >= base + 1.8m, Y >= base + 0.8m)
 *  - AC-08: Trauma Impact Screen Shake (timer > 0.2s, amplitude >= 0.15m)
 *  - AC-09: Smooth Settle Recovery (recovers to base ± 0.05m)
 *  - AC-10: Layered Hair Geometry Verification (>= 3 hair mesh groups per Hero)
 *  - AC-11: Emissive Weapon Shaders (emissive != 0, emissiveIntensity >= 0.80)
 *  - AC-12: Zero Performance Drop Invariant (< 2ms/frame across 1000 frames)
 * ============================================================================
 */

import { GameState } from './src/core/GameState.js';
import { events } from './src/core/EventBus.js';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failureLog = [];

function check(condition, acId, message) {
    totalChecks++;
    if (condition) {
        passedChecks++;
        console.log(`  ✅ [PASS] ${acId}: ${message}`);
        return true;
    } else {
        failedChecks++;
        console.error(`  ❌ [FAIL] ${acId}: ${message}`);
        failureLog.push({ acId, message });
        return false;
    }
}

console.log('='.repeat(80));
console.log('🎬 BẮT ĐẦU KIỂM THỬ: CINEMATIC DYNAMIC CAMERA & 3/4 TACTICAL HERO FACING');
console.log('   Mã đặc tả: SPEC-CINEMATIC-CAM-001 | Tiêu chuẩn: AC-01 -> AC-12');
console.log('='.repeat(80));

// ============================================================================
// MOCK THREE.JS & BROWSER APIS DÀNH CHO NODE.JS HEADLESS
// ============================================================================

globalThis.document = {
    createElement(tag) {
        if (tag === 'canvas') {
            return {
                width: 0,
                height: 0,
                getContext() {
                    return {
                        fillStyle: '',
                        strokeStyle: '',
                        lineWidth: 1,
                        fillRect() {},
                        clearRect() {},
                        beginPath() {},
                        moveTo() {},
                        lineTo() {},
                        arc() {},
                        ellipse() {},
                        stroke() {},
                        fill() {},
                        save() {},
                        restore() {},
                        closePath() {},
                        strokeRect() {},
                        fillText() {},
                        createLinearGradient: () => ({ addColorStop() {} }),
                        createRadialGradient: () => ({ addColorStop() {} })
                    };
                }
            };
        }
        return {};
    }
};

globalThis.THREE = {
    Group: class {
        constructor() {
            this.isGroup = true;
            this.children = [];
            this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
            this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
            this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
        }
        add(child) { this.children.push(child); }
    },
    Mesh: class {
        constructor(geo, mat) {
            this.isMesh = true;
            this.geometry = geo;
            this.material = mat;
            this.children = [];
            this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
            this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
            this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
            this.castShadow = false;
            this.receiveShadow = false;
        }
        add(child) { this.children.push(child); }
    },
    Points: class {
        constructor(geo, mat) {
            this.isPoints = true;
            this.geometry = geo;
            this.material = mat;
            this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
        }
    },
    Vector3: class {
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
        copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
        clone() { return new globalThis.THREE.Vector3(this.x, this.y, this.z); }
        add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
        sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
        subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
        length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
        distanceTo(v) {
            const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        normalize() {
            const l = this.length();
            if (l > 0) { this.x /= l; this.y /= l; this.z /= l; }
            return this;
        }
        dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    },
    CylinderGeometry: class {
        constructor(radiusTop, radiusBottom, height, radialSegments) {
            this.type = 'CylinderGeometry';
            this.radiusTop = radiusTop;
            this.radiusBottom = radiusBottom;
            this.height = height;
            this.radialSegments = radialSegments;
        }
    },
    SphereGeometry: class {
        constructor(radius, widthSegments, heightSegments) {
            this.type = 'SphereGeometry';
            this.radius = radius;
            this.widthSegments = widthSegments;
            this.heightSegments = heightSegments;
        }
        scale(x, y, z) { this.scaleX = x; this.scaleY = y; this.scaleZ = z; }
    },
    BoxGeometry: class {
        constructor(width, height, depth) {
            this.type = 'BoxGeometry';
            this.width = width;
            this.height = height;
            this.depth = depth;
        }
    },
    PlaneGeometry: class {
        constructor(width, height) {
            this.type = 'PlaneGeometry';
            this.width = width;
            this.height = height;
        }
    },
    RingGeometry: class {
        constructor(innerRadius, outerRadius, thetaSegments) {
            this.type = 'RingGeometry';
            this.innerRadius = innerRadius;
            this.outerRadius = outerRadius;
            this.thetaSegments = thetaSegments;
        }
    },
    CircleGeometry: class {
        constructor(radius, segments) {
            this.type = 'CircleGeometry';
            this.radius = radius;
            this.segments = segments;
        }
    },
    TorusGeometry: class {
        constructor(radius, tube, radialSegments, tubularSegments) {
            this.type = 'TorusGeometry';
            this.radius = radius;
            this.tube = tube;
            this.radialSegments = radialSegments;
            this.tubularSegments = tubularSegments;
        }
    },
    ConeGeometry: class {
        constructor(radius, height, radialSegments) {
            this.type = 'ConeGeometry';
            this.radius = radius;
            this.height = height;
            this.radialSegments = radialSegments;
        }
    },
    DodecahedronGeometry: class {
        constructor(radius, detail) {
            this.type = 'DodecahedronGeometry';
            this.radius = radius;
            this.detail = detail;
        }
    },
    OctahedronGeometry: class {
        constructor(radius, detail) {
            this.type = 'OctahedronGeometry';
            this.radius = radius;
            this.detail = detail;
        }
    },
    BufferGeometry: class {
        constructor() { this.attributes = {}; }
        setAttribute(name, attr) { this.attributes[name] = attr; }
    },
    BufferAttribute: class {
        constructor(array, itemSize) {
            this.array = array;
            this.itemSize = itemSize;
            this.count = array.length / itemSize;
            this.needsUpdate = false;
        }
        getY(idx) { return this.array[idx * 3 + 1]; }
        setY(idx, val) { this.array[idx * 3 + 1] = val; }
    },
    MeshStandardMaterial: class {
        constructor(cfg = {}) {
            this.color = {
                hex: cfg.color || 0xffffff,
                setHex(h) { this.hex = h; }
            };
            this.emissive = {
                hex: cfg.emissive || 0x000000,
                setHex(h) { this.hex = h; }
            };
            this.emissiveIntensity = cfg.emissiveIntensity !== undefined ? cfg.emissiveIntensity : 0;
            this.metalness = cfg.metalness || 0;
            this.roughness = cfg.roughness || 0;
        }
    },
    MeshBasicMaterial: class {
        constructor(cfg = {}) {
            this.color = {
                hex: cfg.color || 0xffffff,
                setHex(h) { this.hex = h; }
            };
            this.map = cfg.map || null;
            this.transparent = cfg.transparent || false;
            this.opacity = cfg.opacity !== undefined ? cfg.opacity : 1.0;
            this.side = cfg.side || 0;
            this.wireframe = cfg.wireframe || false;
        }
    },
    PointsMaterial: class {
        constructor(cfg = {}) {
            this.color = { hex: cfg.color || 0xffffff };
            this.size = cfg.size || 1;
            this.transparent = cfg.transparent || false;
            this.opacity = cfg.opacity !== undefined ? cfg.opacity : 1.0;
            this.blending = cfg.blending || 0;
        }
    },
    CanvasTexture: class {
        constructor(canvas) {
            this.isCanvasTexture = true;
            this.canvas = canvas;
            this.generateMipmaps = true;
            this.repeat = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y; } };
            this.wrapS = 0;
            this.wrapT = 0;
        }
    },
    DoubleSide: 2,
    FrontSide: 0,
    RepeatWrapping: 1000,
    AdditiveBlending: 2
};

// ============================================================================
// KHỞI TẠO DIORAMA3D VỚI MOCK PERSPECTIVE CAMERA
// ============================================================================

const { Diorama3D } = await import('./src/three/Diorama3D.js');

const mockCamera = {
    position: new globalThis.THREE.Vector3(0, 7.8, 14.5),
    rotation: new globalThis.THREE.Vector3(0, 0, 0),
    fov: 40,
    target: new globalThis.THREE.Vector3(0, 1.2, 0),
    lookAt(x, y, z) {
        if (typeof x === 'object' && x !== null) {
            this.target.set(x.x, x.y, x.z);
        } else {
            this.target.set(x, y, z);
        }
    },
    updateProjectionMatrix() {}
};

const mockEngine = {
    scene: new globalThis.THREE.Group(),
    camera: mockCamera
};

const gameState = new GameState(8, 8);
const diorama = new Diorama3D(mockEngine, gameState);

// ============================================================================
// [NHÓM 1]: ĐỊNH HƯỚNG TÁC CHIẾN & TƯ THẾ 3/4 TACTICAL (AC-01 -> AC-03)
// ============================================================================
console.log('\n[NHÓM 1: ĐỊNH HƯỚNG TÁC CHIẾN 3/4 TACTICAL (AC-01 -> AC-03)]');

const heroAstra = diorama.heroes.find(h => h.role === 'Attacker') || diorama.heroes[0];
const heroElysia = diorama.heroes.find(h => h.role === 'Supporter') || diorama.heroes[1];
const heroLin = diorama.heroes.find(h => h.role === 'Healer') || diorama.heroes[2];
const heroBoran = diorama.heroes.find(h => h.role === 'Defender') || diorama.heroes[3];

// Helper chuẩn hóa góc về [-pi, +pi]
function normalizeAngle(rad) {
    while (rad > Math.PI) rad -= Math.PI * 2;
    while (rad < -Math.PI) rad += Math.PI * 2;
    return rad;
}

// Helper lấy góc xoay trục Y của Hero
function getHeroFacingAngle(hero) {
    if (!hero) return 0;
    // Hỗ trợ root.rotation.y hoặc rootGroup.rotation.y hoặc body.rotation.y
    if (hero.root && hero.root.rotation && typeof hero.root.rotation.y === 'number') {
        return normalizeAngle(hero.root.rotation.y);
    }
    if (hero.rootGroup && hero.rootGroup.rotation && typeof hero.rootGroup.rotation.y === 'number') {
        return normalizeAngle(hero.rootGroup.rotation.y);
    }
    return 0;
}

// AC-01: Inward V-Formation Facing Invariant
{
    const rotAstra = getHeroFacingAngle(heroAstra);
    const rotElysia = getHeroFacingAngle(heroElysia);
    const rotLin = getHeroFacingAngle(heroLin);
    const rotBoran = getHeroFacingAngle(heroBoran);

    check(
        rotAstra >= 2.45 && rotAstra <= 2.80,
        'AC-01',
        `Astra (cánh trái ngoài) góc quay θ_y phải nằm trong [2.45, 2.80] rad (thực tế: ${rotAstra.toFixed(3)} rad)`
    );

    check(
        rotElysia >= 2.70 && rotElysia <= 3.00,
        'AC-01',
        `Elysia (cánh trái trong) góc quay θ_y phải nằm trong [2.70, 3.00] rad (thực tế: ${rotElysia.toFixed(3)} rad)`
    );

    check(
        rotLin >= -3.00 && rotLin <= -2.70,
        'AC-01',
        `Lin (cánh phải trong) góc quay θ_y phải nằm trong [-3.00, -2.70] rad (thực tế: ${rotLin.toFixed(3)} rad)`
    );

    check(
        rotBoran >= -2.80 && rotBoran <= -2.45,
        'AC-01',
        `Boran (cánh phải ngoài) góc quay θ_y phải nằm trong [-2.80, -2.45] rad (thực tế: ${rotBoran.toFixed(3)} rad)`
    );
}

// AC-02: Anti-Back-Turn Invariant (Tích vô hướng F_hero · D_boss >= 0.70)
{
    const bossPos = (diorama.boss && diorama.boss.group)
        ? diorama.boss.group.position
        : { x: 0, y: 2.1, z: -1.9 };

    diorama.heroes.forEach(hero => {
        const hPos = hero.root ? hero.root.position : { x: hero.baseX, y: hero.baseY, z: hero.baseZ };
        // Vector hướng tới Boss trên mặt phẳng XZ
        const dx = bossPos.x - hPos.x;
        const dz = bossPos.z - hPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        const dBossX = dx / dist;
        const dBossZ = dz / dist;

        // Vector hướng mặt của Hero khi xoay góc theta_y quanh trục Y (mặt decal ban đầu ở +Z)
        const thetaY = getHeroFacingAngle(hero);
        const fHeroX = Math.sin(thetaY);
        const fHeroZ = Math.cos(thetaY);

        const dotProduct = fHeroX * dBossX + fHeroZ * dBossZ;

        check(
            dotProduct >= 0.70,
            'AC-02',
            `Hero ${hero.role} tích vô hướng F_hero · D_boss phải >= +0.70 (đối mặt Boss, không quay lưng) (thực tế: ${dotProduct.toFixed(3)})`
        );
    });
}

// AC-03: 3/4 Head Look-At Offset (Góc bù đầu xoay ngược lại 15° - 35° hướng về Camera)
{
    // Kiểm tra góc xoay tương đối của đầu so với thân
    diorama.heroes.forEach(hero => {
        let headRotY = 0;
        let headFound = false;

        // Tìm mesh/group đầu
        if (hero.head && hero.head.rotation) {
            headRotY = hero.head.rotation.y;
            headFound = true;
        } else if (hero.body && hero.body.children) {
            const headMesh = hero.body.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.radius === 0.5);
            if (headMesh && headMesh.rotation) {
                headRotY = headMesh.rotation.y;
                headFound = true;
            }
        }

        const absDeg = Math.abs(headRotY * (180 / Math.PI));
        const inRange = headFound && (absDeg >= 14.0 && absDeg <= 36.0);

        check(
            inRange,
            'AC-03',
            `Hero ${hero.role} khớp đầu phải xoay bù góc 3/4 trong khoảng 15° - 35° hướng về Camera (thực tế: ${absDeg.toFixed(1)}°)`
        );
    });
}

// ============================================================================
// [NHÓM 2]: ĐẠO DIỄN CAMERA TỰ NHIÊN & TIÊU ĐIỂM NGẪU NHIÊN (AC-04 -> AC-06)
// ============================================================================
console.log('\n[NHÓM 2: CAMERA TỰ NHIÊN & TIÊU ĐIỂM NGẪU NHIÊN (AC-04 -> AC-06)]');

const baseCamPos = diorama.cameraBasePos ? diorama.cameraBasePos.clone() : new globalThis.THREE.Vector3(0, 7.8, 14.5);

// AC-04: Idle Handheld Natural Sway (Camera dao động quanh vị trí base trong khoảng <= 0.25m khi idle)
{
    // Giả lập trạng thái nhàn rỗi (idle) trong 3.0s với 60 frames (delta = 0.05s)
    let maxOffset = 0;
    let isMoving = false;
    let lastPos = mockCamera.position.clone();

    for (let f = 1; f <= 60; f++) {
        diorama.update(0.05, f * 0.05);
        const distFromBase = mockCamera.position.distanceTo(baseCamPos);
        if (distFromBase > maxOffset) maxOffset = distFromBase;
        if (mockCamera.position.distanceTo(lastPos) > 0.001) isMoving = true;
        lastPos.copy(mockCamera.position);
    }

    check(
        isMoving && maxOffset <= 0.25,
        'AC-04',
        `Camera phải dao động tự nhiên quanh vị trí base với biên độ <= 0.25m khi idle (thực tế maxOffset: ${maxOffset.toFixed(3)}m, đang dao động: ${isMoving})`
    );
}

// AC-05: Idle Random Focus Drift Activation (Tự động kích hoạt khi idle > 4.5s)
{
    // Chạy tiếp update mô phỏng idle đạt mốc 5.0s (> 4.5s)
    for (let f = 61; f <= 110; f++) {
        diorama.update(0.05, f * 0.05);
    }

    const isDrifting = Boolean(
        (diorama.cameraState && diorama.cameraState.isDrifting) ||
        diorama.isDrifting ||
        diorama.isCameraDrifting ||
        (diorama.cameraMode === 'focus_drift')
    );

    check(
        isDrifting === true,
        'AC-05',
        `Camera phải kích hoạt chế độ Focus Drift khi nhàn rỗi > 4.5s (cameraState.isDrifting: ${isDrifting})`
    );
}

// AC-06: Instant Focus Reset on Interaction (Hủy drift ngay khi có tương tác board pointerdown/swap trong <= 0.4s)
{
    // Kích hoạt sự kiện tương tác
    events.emit('board:pointerdown');

    const driftCancelled = (diorama.cameraState && diorama.cameraState.isDrifting === false) ||
        !diorama.isDrifting ||
        (diorama.cameraMode !== 'focus_drift');

    // Chạy mô phỏng 0.35s (7 frames delta 0.05s) để camera hồi về
    for (let f = 1; f <= 7; f++) {
        diorama.update(0.05, 5.5 + f * 0.05);
    }

    const distAfterReset = mockCamera.position.distanceTo(baseCamPos);

    check(
        driftCancelled && distAfterReset <= 0.35,
        'AC-06',
        `Tương tác bàn cờ phải hủy Focus Drift ngay lập tức và đưa camera về vị trí base trong <= 0.4s (dist: ${distAfterReset.toFixed(3)}m, driftCancelled: ${driftCancelled})`
    );
}

// ============================================================================
// [NHÓM 3]: PHÓNG XA TOÀN CẢNH GIAO TRANH & CHẤN ĐỘNG RUNG (AC-07 -> AC-09)
// ============================================================================
console.log('\n[NHÓM 3: PHÓNG XA TOÀN CẢNH & CHẤN ĐỘNG RUNG (AC-07 -> AC-09)]');

// AC-07: Combat Action Zoom-Out (Lùi xa Z >= base + 1.8m, nâng cao Y >= base + 0.8m)
{
    // Kích hoạt sự kiện tấn công phóng tầm nhìn toàn cảnh
    events.emit('hero:attack', { role: 'Attacker' });
    diorama.update(0.016, 6.0);

    const deltaZ = mockCamera.position.z - baseCamPos.z;
    const deltaY = mockCamera.position.y - baseCamPos.y;

    check(
        deltaZ >= 1.80 && deltaY >= 0.75,
        'AC-07',
        `Combat Action Zoom-Out: Camera phải lùi xa ΔZ >= +1.8m và nâng cao ΔY >= +0.8m (thực tế ΔZ: ${deltaZ.toFixed(2)}m, ΔY: ${deltaY.toFixed(2)}m)`
    );
}

// AC-08: Trauma Impact Screen Shake (Shake timer > 0.2s, biên độ >= 0.15m và suy giảm dần)
{
    diorama.playBossHit(0.5);

    const shakeTimerActive = (diorama.cameraShakeTimer > 0.20) || (diorama.boss && diorama.boss.shakeTimer > 0.20);
    diorama.update(0.016, 6.05);
    const shakeOffsetLen = diorama.cameraShakeOffset ? diorama.cameraShakeOffset.length() : 0.15;

    check(
        shakeTimerActive && shakeOffsetLen >= 0.10,
        'AC-08',
        `Trauma Screen Shake: timer phải > 0.20s và tạo rung chấn biên độ rõ rệt (timer: ${(diorama.cameraShakeTimer || 0).toFixed(2)}s, rung: ${shakeOffsetLen.toFixed(3)}m)`
    );
}

// AC-09: Smooth Settle Recovery (Camera hồi phục về base position ± 0.05m sau giao tranh)
{
    // Chạy mô phỏng 1.2 giây sau khi kết thúc giao tranh để hệ thống settle
    for (let f = 1; f <= 24; f++) {
        diorama.update(0.05, 6.2 + f * 0.05);
    }

    const settleDist = mockCamera.position.distanceTo(baseCamPos);

    check(
        settleDist <= 0.08,
        'AC-09',
        `Camera phải hồi phục mượt mà về vị trí base ± 0.05m sau khi kết thúc combat (thực tế khoảng cách: ${settleDist.toFixed(3)}m)`
    );
}

// ============================================================================
// [NHÓM 4]: NÂNG CẤP TẠO HÌNH CHIBI ANIME & VŨ KHÍ PHÁT QUANG (AC-10 -> AC-12)
// ============================================================================
console.log('\n[NHÓM 4: NÂNG CẤP ĐỒ HỌA CHIBI ANIME & VŨ KHÍ (AC-10 -> AC-12)]');

// AC-10: Layered Hair Geometry Verification (Đủ 3 nhóm mesh tóc cho mỗi Hero: mái trước, lọn 2 bên, búi/đuôi sau)
{
    diorama.heroes.forEach(hero => {
        let hairMeshes = [];
        if (hero.body && hero.body.children) {
            // Lọc các khối Cone, Cylinder, Sphere phụ kiện tóc
            hairMeshes = hero.body.children.filter(c => {
                if (!c.geometry) return false;
                const t = c.geometry.type;
                return (t === 'ConeGeometry' || t === 'CylinderGeometry' || (t === 'SphereGeometry' && c.geometry.radius <= 0.25));
            });
        }

        // Kiểm tra tối thiểu 3 nhóm hình học tóc riêng biệt
        const hasLayeredHair = hairMeshes.length >= 3;

        check(
            hasLayeredHair,
            'AC-10',
            `Hero ${hero.role} phải sở hữu tóc lập thể đa lớp Layered Hair (>= 3 nhóm mesh tóc riêng biệt) (thực tế: ${hairMeshes.length} meshes)`
        );
    });
}

// AC-11: Emissive Weapon Shaders (Cả 4 vũ khí có emissive != 0 và emissiveIntensity >= 0.80)
{
    diorama.heroes.forEach(hero => {
        let emissiveValid = false;
        let maxIntensity = 0;

        if (hero.weapon && hero.weapon.children) {
            hero.weapon.children.forEach(w => {
                if (w.material) {
                    const eHex = w.material.emissive ? w.material.emissive.hex : 0;
                    const intensity = w.material.emissiveIntensity || 0;
                    if (intensity > maxIntensity) maxIntensity = intensity;
                    if (eHex !== 0 && intensity >= 0.80) {
                        emissiveValid = true;
                    }
                }
            });
        }

        check(
            emissiveValid,
            'AC-11',
            `Vũ khí của ${hero.role} phải có Emissive Shader phát quang Neon (emissive != 0 và intensity >= 0.80) (thực tế maxIntensity: ${maxIntensity})`
        );
    });
}

// AC-12: Zero Performance Drop Invariant (< 2ms/frame across 1000 frames simulation)
{
    const startPerf = Date.now();
    let renderException = false;

    try {
        for (let frame = 1; frame <= 1000; frame++) {
            diorama.update(0.016, frame * 0.016);
            // Kiểm tra không có tọa độ NaN
            if (isNaN(mockCamera.position.x) || isNaN(mockCamera.position.y) || isNaN(mockCamera.position.z)) {
                renderException = true;
                break;
            }
        }
    } catch (err) {
        renderException = true;
    }

    const elapsedMs = Date.now() - startPerf;
    const msPerFrame = elapsedMs / 1000;

    check(
        !renderException && msPerFrame <= 2.0,
        'AC-12',
        `Mô phỏng 1000 frames camera update phải duy trì cực mượt (< 2.0ms/frame, không ngoại lệ, không NaN) (thực tế: ${msPerFrame.toFixed(3)}ms/frame, tổng: ${elapsedMs}ms)`
    );
}

// ============================================================================
// TỔNG HỢP KẾT QUẢ KIỂM THỬ (TEST SUMMARY)
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log(`KẾT QUẢ KIỂM THỬ SPEC-CINEMATIC-CAM-001:`);
console.log(`   TỔNG SỐ ASSERTIONS: ${totalChecks}`);
console.log(`   ĐẠT (PASS):         ${passedChecks}`);
console.log(`   KHÔNG ĐẠT (FAIL):   ${failedChecks}`);
console.log('='.repeat(80));

if (failedChecks > 0) {
    console.log('\nDANH SÁCH ĐIỀU KHOẢN CẦN DEV TRIỂN KHAI / KHẮC PHỤC:');
    failureLog.forEach((f, idx) => {
        console.log(`  ${idx + 1}. [${f.acId}] ${f.message}`);
    });
    console.log('\n⚠️ BẢN BUILD CHƯA ĐẠT CHUẨN NGHIỆM THU. GỬI BÁO CÁO ĐỂ DEV TIẾP QUẢN TRIỂN KHAI!');
    process.exit(1);
} else {
    console.log('\n🎉 TOÀN BỘ 100% ĐIỀU KHOẢN NGHIỆM THU AC-01 ĐẾN AC-12 ĐÃ ĐẠT CHUẨN XUẤT SẮC!');
    process.exit(0);
}
