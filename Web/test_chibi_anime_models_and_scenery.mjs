/**
 * Web/test_chibi_anime_models_and_scenery.mjs
 * ============================================================================
 * KIỂM THỬ MÔ HÌNH 3D CHIBI ANIME, BỘ 5 TRẠNG THÁI HOẠT ẢNH & QUANG CẢNH SÂN ĐẤU
 * ============================================================================
 */

import { GameState } from './src/core/GameState.js';
import { events } from './src/core/EventBus.js';

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
    totalChecks++;
    if (condition) {
        passedChecks++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        throw new Error(`Kiểm thử thất bại: ${message}`);
    }
}

console.log('='.repeat(70));
console.log('🧪 KIỂM THỬ: 3D CHIBI ANIME MODELS, 5-STATE ANIMATIONS & BATTLE SCENERY');
console.log('='.repeat(70));

// MOCK THREE.JS CHO MÔI TRƯỜNG NODE.JS
globalThis.THREE = {
    Group: class {
        constructor() {
            this.children = [];
            this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
            this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
            this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
        }
        add(child) { this.children.push(child); }
    },
    Mesh: class {
        constructor(geo, mat) {
            this.geometry = geo;
            this.material = mat;
            this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
            this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
            this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
        }
        add(child) { this.position; }
    },
    Points: class {
        constructor(geo, mat) {
            this.geometry = geo;
            this.material = mat;
            this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
        }
    },
    Vector3: class {
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    },
    CylinderGeometry: class {},
    SphereGeometry: class { scale() {} },
    BoxGeometry: class {},
    PlaneGeometry: class {},
    RingGeometry: class {},
    CircleGeometry: class {},
    TorusGeometry: class {},
    ConeGeometry: class {},
    DodecahedronGeometry: class {},
    OctahedronGeometry: class {},
    BufferGeometry: class {
        constructor() {
            this.attributes = {};
        }
        setAttribute(name, attr) {
            this.attributes[name] = attr;
        }
    },
    BufferAttribute: class {
        constructor(array, itemSize) {
            this.array = array;
            this.itemSize = itemSize;
            this.count = array.length / itemSize;
        }
        getY(idx) { return this.array[idx * 3 + 1]; }
        setY(idx, val) { this.array[idx * 3 + 1] = val; }
    },
    MeshStandardMaterial: class {
        constructor(cfg = {}) {
            this.color = { setHex(h) { this.hex = h; } };
            this.emissive = { setHex(h) { this.hex = h; } };
            this.emissiveIntensity = cfg.emissiveIntensity || 0;
        }
    },
    MeshBasicMaterial: class {
        constructor(cfg = {}) {
            this.map = cfg.map;
        }
    },
    PointsMaterial: class {},
    CanvasTexture: class {
        constructor() { this.repeat = { set() {} }; }
    },
    DoubleSide: 2,
    FrontSide: 0,
    RepeatWrapping: 1000,
    AdditiveBlending: 2
};

// Import Diorama3D sau khi đã nạp mock THREE
const { Diorama3D } = await import('./src/three/Diorama3D.js');

const mockEngine = {
    scene: new THREE.Group(),
    camera: {
        position: new THREE.Vector3(0, 5, 10),
        rotation: new THREE.Vector3()
    }
};

const gameState = new GameState(8, 8);
const diorama = new Diorama3D(mockEngine, gameState);

// ============================================================================
// [TEST GROUP 1]: CẤU TRÚC 4 MODEL NHÂN VẬT CHIBI ANIME
// ============================================================================
console.log('\n[TEST GROUP 1: CẤU TRÚC MODEL 4 HERO CHIBI ANIME]');

assert(diorama.heroes.length === 4, 'Đội hình phải khởi tạo đủ đúng 4 nhân vật Chibi');

const roles = ['Attacker', 'Supporter', 'Healer', 'Defender'];
roles.forEach((r, idx) => {
    const hero = diorama.heroes[idx];
    assert(hero.role === r, `Hero ${idx + 1} phải mang Role ${r}`);
    assert(hero.root !== undefined, `${r} phải có rootGroup để di chuyển và knockback`);
    assert(hero.body !== undefined, `${r} phải có bodyGroup để nhún nhảy breathing Chibi`);
    assert(hero.face !== undefined, `${r} phải có faceMesh hiển thị biểu cảm Anime`);
    assert(hero.faceTex.normal !== undefined, `${r} phải có Texture biểu cảm Normal`);
    assert(hero.faceTex.hit !== undefined, `${r} phải có Texture biểu cảm Hit (> <)`);
    assert(hero.faceTex.die !== undefined, `${r} phải có Texture biểu cảm Die (X_X)`);
    assert(hero.faceTex.attack !== undefined, `${r} phải có Texture biểu cảm Attack quyết tâm`);
    assert(hero.weapon !== undefined, `${r} phải có vũ khí Chibi đặc trưng`);
    assert(hero.state === 'idle', `${r} khởi đầu ở trạng thái hoạt ảnh idle`);
});

// ============================================================================
// [TEST GROUP 2]: CẤU TRÚC MODEL BOSS CHIBI MECHA TITAN
// ============================================================================
console.log('\n[TEST GROUP 2: CẤU TRÚC BOSS CHIBI MECHA TITAN]');

assert(diorama.boss !== null, 'Model Boss Chibi Mecha phải được khởi tạo');
assert(diorama.boss.body !== undefined, 'Boss phải có khối thân Mecha Dodecahedron Chibi');
assert(diorama.boss.eye !== undefined, 'Boss phải có mắt LED Cyclops công nghệ cao');
assert(diorama.bossEyeTexNormal !== undefined, 'Boss phải có Texture mắt Cyclops bình thường');
assert(diorama.bossEyeTexBroken !== undefined, 'Boss phải có Texture mắt xoắn ốc khi Stagger Break');
assert(diorama.bossEyeTexAttack !== undefined, 'Boss phải có Texture mắt tâm ngắm đỏ khi tấn công');
assert(diorama.drones.length === 2, 'Boss phải có 2 Drone hộ vệ Chibi bay lượn xung quanh');

// ============================================================================
// [TEST GROUP 3]: QUANG CẢNH MÔI TRƯỜNG SÂN ĐẤU (BATTLE SCENERY)
// ============================================================================
console.log('\n[TEST GROUP 3: QUANG CẢNH CHIẾN TRƯỜNG CYBERPUNK]');

assert(diorama.underRingMesh !== undefined, 'Sàn đấu phải có vòng xoay năng lượng ngầm');
assert(diorama.sceneryProps.length === 4, 'Chiến trường phải có đủ 4 Cột Tháp Monoliths phát sáng ở 4 góc');
assert(diorama.ambientParticles !== null, 'Phải có hệ thống hạt bụi năng lượng Cyber Dust lơ lửng tạo độ sâu không gian');

// ============================================================================
// [TEST GROUP 4]: BỘ 5 TRẠNG THÁI HOẠT ẢNH (ANIMATION STATE MACHINE)
// ============================================================================
console.log('\n[TEST GROUP 4: HOẠT ẢNH TẤN CÔNG, DÍNH ĐÒN, TỬ TRẬN & HỒI SINH]');

const astra = diorama.heroes[0];

// 1. Tấn công (Attack)
diorama.playHeroAttack(astra);
assert(astra.state === 'attack', 'Khi tung chiêu, Hero chuyển sang trạng thái attack');
assert(astra.face.material.map === astra.faceTex.attack, 'Mặt Hero đổi sang biểu cảm tấn công quyết tâm');

// 2. Bị tấn công (Hit)
diorama.playHeroHit(astra);
assert(astra.state === 'hit', 'Khi bị trúng đòn, Hero chuyển sang trạng thái hit');
assert(astra.face.material.map === astra.faceTex.hit, 'Mặt Hero đổi sang biểu cảm nheo mắt > <');

// 3. Tử trận (Die)
diorama.playHeroDie(astra);
assert(astra.isDefeated === true, 'Khi HP = 0, trạng thái isDefeated = true');
assert(astra.state === 'die', 'Hero chuyển sang trạng thái tử trận die');
assert(astra.face.material.map === astra.faceTex.die, 'Mặt Hero chuyển thành mắt nhắm tịt X_X');

// 4. Hồi sinh (Revive)
diorama.playHeroRevive(astra);
assert(astra.isDefeated === false, 'Sau khi hồi sinh, trạng thái isDefeated = false');
assert(astra.state === 'revive', 'Hero chuyển sang trạng thái hồi sinh revive');

// 5. Boss Attack & Hit
diorama.playBossAttack();
assert(diorama.boss.state === 'attack', 'Boss kích hoạt trạng thái attack khi tung đòn');

diorama.playBossHit();
assert(diorama.boss.shakeTimer > 0, 'Boss bị rung chấn trauma shake khi trúng sát thương');

// 6. Update Loop kiểm tra không có ngoại lệ
diorama.update(0.016, 1.25);
assert(true, 'Vòng lặp render update() thực thi trơn tru mỗi frame mà không có lỗi');

console.log('\n' + '='.repeat(70));
console.log(`KẾT QUẢ KIỂM THỬ: ${passedChecks} PASS / ${totalChecks - passedChecks} FAIL`);
console.log('='.repeat(70));

if (passedChecks === totalChecks) {
    console.log('\n🎉 HOÀN TẤT XÁC MINH: MODEL CHIBI ANIME, 5-STATE ANIMATION & SCENERY HOÀN TOÀN ĐẠT CHUẨN!');
} else {
    process.exit(1);
}
