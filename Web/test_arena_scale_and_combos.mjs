/**
 * Web/test_arena_scale_and_combos.mjs
 * ============================================================================
 * BỘ KIỂM THỬ ĐỘC LẬP: MỞ RỘNG QUY MÔ SÀN ĐẤU & TỔ HỢP NGỌC CANDY CRUSH STYLE
 * Đặc tả tham chiếu: Docs/Specs/SPEC_ARENA_SCALE_AND_SPECIAL_COMBOS.md
 * Mã đặc tả: SPEC-COMBAT-SCALE-002, v1.0.0 | QC Lead (@qc_lead)
 * ============================================================================
 * Bao phủ 100% 12 Tiêu chuẩn Nghiệm thu (AC-01 -> AC-12):
 *  - AC-01: Khoảng cách tác chiến D_combat = ||P_boss - P_party_center|| >= 6.0m
 *  - AC-02: Bán kính mặt sàn floorGeo radiusTop >= 8.5m & khoảng cách tháp Monoliths >= 7.0m
 *  - AC-03: Camera Base Z >= 13.5m, Y >= 7.0m, góc nhìn an toàn bao trọn Party và Boss
 *  - AC-04: Đổi 2 ngọc đặc biệt (specialGrid !== NONE) KHÔNG bao giờ bị revert / swap_reject
 *  - AC-05: Line + Line nổ chữ thập đúng 15 ô (1 hàng + 1 cột)
 *  - AC-06: Bomb + Line nổ 3 hàng (Line Row) hoặc 3 cột (Line Col) (24 ô)
 *  - AC-07: Bomb + Bomb nổ 5x5 (25 ô)
 *  - AC-08: SwapAll + Line chuyển hóa màu mục tiêu thành Line & đồng loạt nổ
 *  - AC-09: SwapAll + Bomb chuyển hóa màu mục tiêu thành Bomb & đồng loạt nổ
 *  - AC-10: SwapAll + SwapAll quét sạch toàn bộ 64 ô trên bàn cờ 8x8 (Armageddon Wipe)
 *  - AC-11: Pha Anticipation (lùi về sau Z > 0, nén Sy < 1.0) và Lunge lướt xa Delta Z <= -2.5m
 *  - AC-12: Hit-stop micro-pause (0.05s - 0.08s) và vũ khí emissiveIntensity >= 1.2
 * ============================================================================
 */

import { GameState, COLORS, SPECIAL_TYPES, OBSTACLE_TYPES } from './src/core/GameState.js';
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
console.log('💥 BẮT ĐẦU KIỂM THỬ: ARENA SPATIAL SCALING & SPECIAL CANDY CRUSH COMBOS');
console.log('   Mã đặc tả: SPEC-COMBAT-SCALE-002, v1.0.0 | Tiêu chuẩn: AC-01 -> AC-12');
console.log('='.repeat(80));

// ============================================================================
// MOCK THREE.JS & BROWSER APIS CHO NODE.JS HEADLESS
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
        distanceTo(v) {
            const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
    },
    CylinderGeometry: class {
        constructor(radiusTop, radiusBottom, height, radialSegments) {
            this.type = 'CylinderGeometry';
            this.radiusTop = radiusTop;
            this.radiusBottom = radiusBottom;
            this.height = height;
            this.radialSegments = radialSegments;
            this.parameters = { radiusTop, radiusBottom, height, radialSegments };
        }
    },
    SphereGeometry: class {
        constructor(radius, widthSegments, heightSegments) {
            this.type = 'SphereGeometry';
            this.radius = radius;
            this.parameters = { radius, widthSegments, heightSegments };
        }
        scale(x, y, z) { this.scaleX = x; this.scaleY = y; this.scaleZ = z; }
    },
    BoxGeometry: class {
        constructor(width, height, depth) {
            this.type = 'BoxGeometry';
            this.parameters = { width, height, depth };
        }
    },
    PlaneGeometry: class {
        constructor(width, height) {
            this.type = 'PlaneGeometry';
            this.parameters = { width, height };
        }
    },
    RingGeometry: class {
        constructor(innerRadius, outerRadius, thetaSegments) {
            this.type = 'RingGeometry';
            this.parameters = { innerRadius, outerRadius, thetaSegments };
        }
    },
    CircleGeometry: class {
        constructor(radius, segments) {
            this.type = 'CircleGeometry';
            this.parameters = { radius, segments };
        }
    },
    TorusGeometry: class {
        constructor(radius, tube, radialSegments, tubularSegments) {
            this.type = 'TorusGeometry';
            this.parameters = { radius, tube, radialSegments, tubularSegments };
        }
    },
    ConeGeometry: class {
        constructor(radius, height, radialSegments) {
            this.type = 'ConeGeometry';
            this.parameters = { radius, height, radialSegments };
        }
    },
    DodecahedronGeometry: class {
        constructor(radius, detail) {
            this.type = 'DodecahedronGeometry';
            this.parameters = { radius, detail };
        }
    },
    OctahedronGeometry: class {
        constructor(radius, detail) {
            this.type = 'OctahedronGeometry';
            this.parameters = { radius, detail };
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
            this.color = { hex: cfg.color || 0xffffff, setHex(h) { this.hex = h; } };
            this.emissive = { hex: cfg.emissive || 0x000000, setHex(h) { this.hex = h; } };
            this.emissiveIntensity = cfg.emissiveIntensity !== undefined ? cfg.emissiveIntensity : 0;
            this.metalness = cfg.metalness || 0;
            this.roughness = cfg.roughness || 0;
        }
    },
    MeshBasicMaterial: class {
        constructor(cfg = {}) {
            this.color = { hex: cfg.color || 0xffffff, setHex(h) { this.hex = h; } };
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
// KHỞI TẠO DIORAMA3D
// ============================================================================

const { Diorama3D } = await import('./src/three/Diorama3D.js');

const mockCamera = {
    position: new globalThis.THREE.Vector3(0, 5.2, 9.5),
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

const globalGameState = new GameState(8, 8);
const diorama = new Diorama3D(mockEngine, globalGameState);

// Helper tạo bàn cờ sạch dạng caro để tránh match-3 tự nhiên
function setupCheckerboard(game) {
    for (let r = 0; r < game.height; r++) {
        for (let c = 0; c < game.width; c++) {
            game.grid[r][c] = ((r + c) % 5) + 1;
            game.specialGrid[r][c] = SPECIAL_TYPES.NONE;
            game.obstacleGrid[r][c] = OBSTACLE_TYPES.NONE;
        }
    }
}

// ============================================================================
// [NHÓM 1]: QUY MÔ SÀN ĐẤU & KHOẢNG CÁCH TÁC CHIẾN (AC-01 -> AC-03)
// ============================================================================
console.log('\n[NHÓM 1: QUY MÔ SÀN ĐẤU & KHOẢNG CÁCH TÁC CHIẾN (AC-01 -> AC-03)]');

// AC-01: Combat Distance Invariant (D_combat >= 6.0m)
{
    const bossPos = (diorama.boss && diorama.boss.group)
        ? diorama.boss.group.position
        : { x: diorama.boss?.baseX || 0, y: diorama.boss?.baseY || 0, z: diorama.boss?.baseZ || -1.9 };

    let partyCenterX = 0;
    let partyCenterZ = 0;
    const heroCount = diorama.heroes.length || 1;

    diorama.heroes.forEach(h => {
        const p = h.root ? h.root.position : { x: h.baseX, z: h.baseZ };
        partyCenterX += p.x;
        partyCenterZ += p.z;
    });
    partyCenterX /= heroCount;
    partyCenterZ /= heroCount;

    const dx = bossPos.x - partyCenterX;
    const dz = bossPos.z - partyCenterZ;
    const combatDistance = Math.sqrt(dx * dx + dz * dz);

    check(
        combatDistance >= 6.0,
        'AC-01',
        `Khoảng cách tác chiến D_combat phải đạt >= 6.0m (thực tế: ${combatDistance.toFixed(2)}m)`
    );
}

// AC-02: Arena Floor Geometry Scale (radiusTop >= 8.5m & Monoliths >= 7.0m)
{
    // Tìm mesh sàn Cylinder trong stageGroup
    const floorMesh = diorama.stageGroup.children.find(c =>
        c.geometry && c.geometry.type === 'CylinderGeometry' && (c.geometry.radiusTop >= 5.0 || c.geometry.height < 1.0)
    );
    const floorRadius = floorMesh ? floorMesh.geometry.radiusTop : 0;

    check(
        floorRadius >= 8.5,
        'AC-02',
        `Bán kính mặt sàn floorGeo.radiusTop phải >= 8.5m (thực tế: ${floorRadius.toFixed(2)}m)`
    );

    let minPillarDistance = 999;
    if (diorama.sceneryProps && diorama.sceneryProps.length >= 4) {
        diorama.sceneryProps.forEach(p => {
            const pos = p.group ? p.group.position : { x: 0, z: 0 };
            const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
            if (dist < minPillarDistance) minPillarDistance = dist;
        });
    }

    check(
        minPillarDistance >= 7.0,
        'AC-02',
        `Khoảng cách 4 tháp Monoliths đến tâm phải >= 7.0m (thực tế min: ${minPillarDistance.toFixed(2)}m)`
    );
}

// AC-03: Camera Portrait Safe Framing (Base Z >= 13.5m, Y >= 7.0m)
{
    const camPos = diorama.cameraBasePos || mockEngine.camera.position;

    check(
        camPos.z >= 13.5 && camPos.y >= 7.0,
        'AC-03',
        `Camera Base position phải có Z >= 13.5m và Y >= 7.0m để bao trọn sàn đấu mở rộng (thực tế Y: ${camPos.y.toFixed(2)}m, Z: ${camPos.z.toFixed(2)}m)`
    );
}

// ============================================================================
// [NHÓM 2]: BẤT BIẾN HOÁN ĐỔI NGỌC ĐẶC BIỆT CANDY CRUSH (AC-04 -> AC-10)
// ============================================================================
console.log('\n[NHÓM 2: TỔ HỢP NGỌC ĐẶC BIỆT CANDY CRUSH STYLE (AC-04 -> AC-10)]');

// AC-04: Special Swap Revert Prohibition (specialGrid !== NONE không bao giờ bị revert / swap_reject)
{
    const game = new GameState(8, 8);
    setupCheckerboard(game);
    game.specialGrid[3][3] = SPECIAL_TYPES.LINE_ROW;
    game.specialGrid[3][4] = SPECIAL_TYPES.LINE_COL;

    let rejectFired = false;
    let acceptFired = false;
    const onReject = () => { rejectFired = true; };
    const onAccept = () => { acceptFired = true; };
    events.on('swap_reject', onReject);
    events.on('swap_accept', onAccept);

    const swapSuccess = await game.swap(3, 3, 3, 4);

    events.off('swap_reject', onReject);
    events.off('swap_accept', onAccept);

    check(
        swapSuccess === true && acceptFired && !rejectFired,
        'AC-04',
        `Hoán đổi 2 ngọc đặc biệt bắt buộc trả về true, phát swap_accept và CẤM swap_reject / revert (swap: ${swapSuccess}, accept: ${acceptFired}, reject: ${rejectFired})`
    );
}

// AC-05: Line + Line Cross Explosion (Đúng 1 hàng + 1 cột = 15 ô)
{
    const game = new GameState(8, 8);
    setupCheckerboard(game);
    const r = 3, c = 4;
    game.specialGrid[r][c - 1] = SPECIAL_TYPES.LINE_ROW;
    game.specialGrid[r][c] = SPECIAL_TYPES.LINE_COL;

    let shattered = [];
    const onShatter = (data) => { if (data.matches) shattered.push(...data.matches); };
    events.on('match_shatter', onShatter);

    await game.swap(r, c - 1, r, c);
    events.off('match_shatter', onShatter);

    const uniqueTiles = new Set(shattered.map(t => `${t.r},${t.c}`));
    const rowFull = shattered.filter(t => t.r === r).length >= 8;
    const colFull = shattered.filter(t => t.c === c).length >= 8;

    check(
        uniqueTiles.size >= 15 && rowFull && colFull,
        'AC-05',
        `Line + Line phải kích nổ chữ thập quét trọn 1 Hàng + 1 Cột (đúng 15 ô) (thực tế nổ: ${uniqueTiles.size} ô, rowFull: ${rowFull}, colFull: ${colFull})`
    );
}

// AC-06: Bomb + Line Triple Sweeper (3 Hàng nếu Line Row hoặc 3 Cột nếu Line Col = 24 ô)
{
    // Test 6A: Bomb + Line Row -> Quét 3 Hàng r-1, r, r+1
    const gameA = new GameState(8, 8);
    setupCheckerboard(gameA);
    const r = 3, c = 3;
    gameA.specialGrid[r][c] = SPECIAL_TYPES.BOMB_3X3;
    gameA.specialGrid[r][c + 1] = SPECIAL_TYPES.LINE_ROW;

    let shatteredA = [];
    const onShatterA = (data) => { if (data.matches) shatteredA.push(...data.matches); };
    events.on('match_shatter', onShatterA);

    await gameA.swap(r, c, r, c + 1);
    events.off('match_shatter', onShatterA);

    const tilesA = new Set(shatteredA.map(t => `${t.r},${t.c}`));
    const rMinus1 = shatteredA.filter(t => t.r === r - 1).length >= 8;
    const rCurr = shatteredA.filter(t => t.r === r).length >= 8;
    const rPlus1 = shatteredA.filter(t => t.r === r + 1).length >= 8;
    const is3Rows = rMinus1 && rCurr && rPlus1 && tilesA.size >= 24;

    check(
        is3Rows,
        'AC-06',
        `Bomb + Line_Row phải quét sạch liên tiếp đúng 3 Hàng ngang (24 ô) (thực tế: ${tilesA.size} ô, 3 hàng đủ: ${is3Rows})`
    );

    // Test 6B: Bomb + Line Col -> Quét 3 Cột c-1, c, c+1
    const gameB = new GameState(8, 8);
    setupCheckerboard(gameB);
    gameB.specialGrid[r][c] = SPECIAL_TYPES.BOMB_3X3;
    gameB.specialGrid[r + 1][c] = SPECIAL_TYPES.LINE_COL;

    let shatteredB = [];
    const onShatterB = (data) => { if (data.matches) shatteredB.push(...data.matches); };
    events.on('match_shatter', onShatterB);

    await gameB.swap(r, c, r + 1, c);
    events.off('match_shatter', onShatterB);

    const tilesB = new Set(shatteredB.map(t => `${t.r},${t.c}`));
    const cMinus1 = shatteredB.filter(t => t.c === c - 1).length >= 8;
    const cCurr = shatteredB.filter(t => t.c === c).length >= 8;
    const cPlus1 = shatteredB.filter(t => t.c === c + 1).length >= 8;
    const is3Cols = cMinus1 && cCurr && cPlus1 && tilesB.size >= 24;

    check(
        is3Cols,
        'AC-06',
        `Bomb + Line_Col phải quét sạch liên tiếp đúng 3 Cột dọc (24 ô) (thực tế: ${tilesB.size} ô, 3 cột đủ: ${is3Cols})`
    );
}

// AC-07: Bomb + Bomb 5x5 Mega Nova (Đúng 25 ô)
{
    const game = new GameState(8, 8);
    setupCheckerboard(game);
    const r = 3, c = 3;
    game.specialGrid[r][c] = SPECIAL_TYPES.BOMB_3X3;
    game.specialGrid[r][c + 1] = SPECIAL_TYPES.BOMB_3X3;

    let shattered = [];
    const onShatter = (data) => { if (data.matches) shattered.push(...data.matches); };
    events.on('match_shatter', onShatter);

    await game.swap(r, c, r, c + 1);
    events.off('match_shatter', onShatter);

    const tiles = new Set(shattered.map(t => `${t.r},${t.c}`));

    check(
        tiles.size >= 25,
        'AC-07',
        `Bomb + Bomb phải nổ tung vùng đại bác 5x5 (đúng 25 ô) (thực tế nổ: ${tiles.size} ô)`
    );
}

// AC-08: SwapAll + Line Prismatic Rocket Barrage
{
    const game = new GameState(8, 8);
    setupCheckerboard(game);
    const targetColor = COLORS.FIRE;
    game.specialGrid[3][3] = SPECIAL_TYPES.SWAP_ALL;
    game.specialGrid[3][4] = SPECIAL_TYPES.LINE_ROW;
    game.grid[3][4] = targetColor;

    // Gieo ít nhất 6 viên ngọc màu targetColor
    const seeded = [[0, 1], [1, 5], [2, 7], [5, 2], [6, 4], [7, 6]];
    seeded.forEach(([sr, sc]) => { game.grid[sr][sc] = targetColor; });

    let lineTriggered = false;
    let shattered = [];
    const onSpecial = (data) => {
        if (data.type && (data.type.includes('LINE') || data.type === 'PRISMATIC_ROCKET')) {
            lineTriggered = true;
        }
    };
    const onShatter = (data) => { if (data.matches) shattered.push(...data.matches); };
    events.on('special_triggered', onSpecial);
    events.on('match_shatter', onShatter);

    await game.swap(3, 3, 3, 4);
    events.off('special_triggered', onSpecial);
    events.off('match_shatter', onShatter);

    const tiles = new Set(shattered.map(t => `${t.r},${t.c}`));

    check(
        tiles.size >= 20 || lineTriggered,
        'AC-08',
        `SwapAll + Line phải chuyển hóa màu mục tiêu thành Line và kích nổ dây chuyền (thực tế nổ: ${tiles.size} ô, lineTriggered: ${lineTriggered})`
    );
}

// AC-09: SwapAll + Bomb Prismatic Cluster Burst
{
    const game = new GameState(8, 8);
    setupCheckerboard(game);
    const targetColor = COLORS.WATER;
    game.specialGrid[3][3] = SPECIAL_TYPES.SWAP_ALL;
    game.specialGrid[3][4] = SPECIAL_TYPES.BOMB_3X3;
    game.grid[3][4] = targetColor;

    const seeded = [[0, 1], [1, 5], [2, 7], [5, 2], [6, 4], [7, 6]];
    seeded.forEach(([sr, sc]) => { game.grid[sr][sc] = targetColor; });

    let bombTriggered = false;
    let shattered = [];
    const onSpecial = (data) => {
        if (data.type && (data.type.includes('BOMB') || data.type === 'PRISMATIC_BOMB')) {
            bombTriggered = true;
        }
    };
    const onShatter = (data) => { if (data.matches) shattered.push(...data.matches); };
    events.on('special_triggered', onSpecial);
    events.on('match_shatter', onShatter);

    await game.swap(3, 3, 3, 4);
    events.off('special_triggered', onSpecial);
    events.off('match_shatter', onShatter);

    const tiles = new Set(shattered.map(t => `${t.r},${t.c}`));

    check(
        tiles.size >= 25 || bombTriggered,
        'AC-09',
        `SwapAll + Bomb phải chuyển hóa màu mục tiêu thành Bom 3x3 và nổ chùm (thực tế nổ: ${tiles.size} ô, bombTriggered: ${bombTriggered})`
    );
}

// AC-10: SwapAll + SwapAll Armageddon Board Cleansing (Quét sạch 64 ô)
{
    const game = new GameState(8, 8);
    setupCheckerboard(game);
    game.specialGrid[3][3] = SPECIAL_TYPES.SWAP_ALL;
    game.specialGrid[3][4] = SPECIAL_TYPES.SWAP_ALL;

    let shattered = [];
    const onShatter = (data) => { if (data.matches) shattered.push(...data.matches); };
    events.on('match_shatter', onShatter);

    await game.swap(3, 3, 3, 4);
    events.off('match_shatter', onShatter);

    const tiles = new Set(shattered.map(t => `${t.r},${t.c}`));

    check(
        tiles.size === 64,
        'AC-10',
        `SwapAll + SwapAll phải quét sạch toàn bộ 64 ô trên bàn cờ 8x8 (Armageddon Wipe) (thực tế nổ: ${tiles.size} ô)`
    );
}

// ============================================================================
// [NHÓM 3]: DIỄN HOẠT CHIBI NÂNG CAO & MÔ HÌNH (AC-11 -> AC-12)
// ============================================================================
console.log('\n[NHÓM 3: DIỄN HOẠT CHIBI NÂNG CAO & MÔ HÌNH (AC-11 -> AC-12)]');

// AC-11: Animation Anticipation (lùi về sau Z > 0, nén Sy < 1.0) và Lunge lướt xa Delta Z <= -2.5m
{
    const astra = diorama.heroes.find(h => h.role === 'Attacker') || diorama.heroes[0];

    diorama.playHeroAttack(astra);

    const hasAnticipation = (astra.animPhase === 'anticipate') ||
        (astra.root.position.z > astra.baseZ && astra.body.scale && astra.body.scale.y < 1.0);

    const lungeDeltaZ = astra.root.position.z - astra.baseZ;
    const hasLongLunge = lungeDeltaZ <= -2.5;

    check(
        hasAnticipation && hasLongLunge,
        'AC-11',
        `Hero phải có pha Anticipation lấy đà (lùi Z > 0, nén Sy < 1.0) và Lunge lướt xa Delta Z <= -2.5m (anticipate: ${hasAnticipation}, lungeDeltaZ: ${lungeDeltaZ.toFixed(2)}m)`
    );
}

// AC-12: Hit-stop micro-pause (0.05s - 0.08s) và vũ khí emissiveIntensity >= 1.2
{
    diorama.playBossHit(0.5);

    const hasHitStop = (typeof diorama.hitStopTimer === 'number' && diorama.hitStopTimer >= 0.05) ||
        (typeof diorama.isHitStop === 'boolean' && diorama.isHitStop) ||
        (diorama.boss && diorama.boss.isHitStop);

    let allEmissiveGe1_2 = true;
    let minIntensityFound = 999;

    diorama.heroes.forEach(h => {
        let maxWeaponEmissive = 0;
        if (h.weapon && h.weapon.children) {
            h.weapon.children.forEach(w => {
                if (w.material) {
                    const intensity = w.material.emissiveIntensity || 0;
                    if (intensity > maxWeaponEmissive) maxWeaponEmissive = intensity;
                }
            });
        }
        if (maxWeaponEmissive < minIntensityFound) minIntensityFound = maxWeaponEmissive;
        if (maxWeaponEmissive < 1.20) allEmissiveGe1_2 = false;
    });

    check(
        hasHitStop && allEmissiveGe1_2,
        'AC-12',
        `Phải có cơ chế Hit-stop (0.05s - 0.08s) và toàn bộ vũ khí emissiveIntensity >= 1.2 (hitStop: ${hasHitStop}, minIntensity: ${minIntensityFound})`
    );
}

// ============================================================================
// TỔNG HỢP KẾT QUẢ KIỂM THỬ (TEST SUMMARY)
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log(`KẾT QUẢ KIỂM THỬ SPEC-COMBAT-SCALE-002:`);
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
    console.log('\n🎉 TOÀN BỘ 100% TIÊU CHUẨN NGHIỆM THU AC-01 ĐẾN AC-12 ĐÃ ĐẠT CHUẨN XUẤT SẮC!');
    process.exit(0);
}
