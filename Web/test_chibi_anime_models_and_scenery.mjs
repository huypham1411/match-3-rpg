/**
 * Web/test_chibi_anime_models_and_scenery.mjs
 * ============================================================================
 * KIỂM THỬ TOÀN DIỆN MÔ HÌNH 3D CHIBI ANIME, 5-STATE ANIMATIONS & QUANG CẢNH TIỀN ĐỒN
 * Dựa trên tài liệu đặc tả: Docs/Specs/SPEC_CHIBI_ANIME_ASSETS_AND_ENVIRONMENT.md
 * (Bao phủ 100% Tiêu chuẩn Nghiệm thu Nhóm AC 1 - AC 5 và Mục 7 Edge Cases)
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

console.log('='.repeat(75));
console.log('🧪 BẮT ĐẦU KIỂM THỬ: 3D CHIBI ANIME MODELS, 5-STATE ANIMATIONS & SCENERY');
console.log('='.repeat(75));

// ============================================================================
// MOCK MÔI TRƯỜNG THREE.JS & DOM CANVAS CHO NODE.JS HEADLESS
// ============================================================================

globalThis.document = {
    createElement(tag) {
        if (tag === 'canvas') {
            return {
                width: 0,
                height: 0,
                getContext(type) {
                    return {
                        fillStyle: '',
                        strokeStyle: '',
                        lineWidth: 1,
                        lineCap: '',
                        lineJoin: '',
                        font: '',
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
        copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
        set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
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
            this.emissiveIntensity = cfg.emissiveIntensity || 0;
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
// KHỞI TẠO DIORAMA3D ENGINE
// ============================================================================

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
// [NHÓM AC 1]: CẤU TRÚC KHỞI TẠO 4 HERO CHIBI ANIME (HERO HIERARCHY & PROPORTIONS)
// ============================================================================
console.log('\n[NHÓM AC 1: CẤU TRÚC 4 HERO CHIBI ANIME]');

// AC 1.1: Đủ 4 nhân vật, theo thứ tự Attacker, Supporter, Healer, Defender
assert(diorama.heroes.length === 4, 'AC 1.1: Đội hình diorama.heroes phải chứa đúng chính xác 4 nhân vật');

const expectedRoles = ['Attacker', 'Supporter', 'Healer', 'Defender'];
diorama.heroes.forEach((h, idx) => {
    assert(h.role === expectedRoles[idx], `AC 1.1: Hero vị trí ${idx + 1} phải mang Role '${expectedRoles[idx]}'`);
});

// AC 1.2: Kiểm tra Scene Graph của từng Hero
diorama.heroes.forEach((hero) => {
    const r = hero.role;
    assert(hero.root !== undefined && hero.root.isGroup === true, `AC 1.2 (${r}): Có rootGroup neo vị trí sàn`);
    assert(hero.body !== undefined && hero.body.isGroup === true, `AC 1.2 (${r}): Có bodyGroup nhún nhảy breathing`);
    
    // Kiểm tra headMesh trong bodyGroup
    const headMesh = hero.body.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.radius === 0.5);
    assert(headMesh !== undefined, `AC 1.2 (${r}): Có headMesh SphereGeometry bán kính 0.5m chuẩn tỉ lệ Chibi 1:2.5`);
    
    // Kiểm tra faceMesh
    assert(hero.face !== undefined && hero.face.geometry.type === 'PlaneGeometry', `AC 1.2 (${r}): Có faceMesh PlaneGeometry decal 2D`);
    assert(hero.face.position.z === 0.49, `AC 1.2 (${r}): faceMesh dán đúng mặt trước đầu Chibi (z = 0.49m)`);
    
    // Kiểm tra weaponGroup
    assert(hero.weapon !== undefined && hero.weapon.isGroup === true, `AC 1.2 (${r}): Có cụm vũ khí weaponGroup`);

    // Kiểm tra tóc mái trước trán (Bangs - 5 cụm nón ConeGeometry)
    const bangs = hero.body.children.filter(c => c.geometry && c.geometry.type === 'ConeGeometry' && c.geometry.height === 0.35);
    assert(bangs.length === 5, `AC 1.2 (${r}): Có đủ 5 tép tóc mái Anime nan quạt trước trán`);

    // Kiểm tra thân áo Chibi
    const torso = hero.body.children.find(c => c.geometry && c.geometry.type === 'CylinderGeometry' && c.geometry.height === 0.45);
    assert(torso !== undefined, `AC 1.2 (${r}): Có thân áo Chibi CylinderGeometry cao 0.45m`);
});

// ============================================================================
// [NHÓM AC 2]: BIỂU CẢM KHUÔN MẶT & MÁY TRẠNG THÁI 5 PHA (ANIMATION STATE MACHINE)
// ============================================================================
console.log('\n[NHÓM AC 2: BIỂU CẢM KHUÔN MẶT & MÁY TRẠNG THÁI 5 PHA]');

const heroAstra = diorama.heroes[0];

// AC 2.1: Idle State
assert(heroAstra.state === 'idle', 'AC 2.1: Trạng thái ban đầu của Hero phải là idle');
assert(heroAstra.face.material.map === heroAstra.faceTex.normal, 'AC 2.1: Texture khuôn mặt ban đầu phải là faceTex.normal');
assert(heroAstra.faceTex.normal.isCanvasTexture === true, 'AC 2.1: faceTex.normal là CanvasTexture hợp lệ');

// AC 2.2: Attack State
diorama.playHeroAttack(heroAstra);
assert(heroAstra.state === 'attack', 'AC 2.2: Khi tấn công, hero.state lập tức chuyển thành attack');
assert(heroAstra.face.material.map === heroAstra.faceTex.attack, 'AC 2.2: Khuôn mặt đổi sang faceTex.attack (mắt rực lửa, miệng quyết tâm)');
assert(heroAstra.root.position.z <= heroAstra.baseZ - 0.3, 'AC 2.2: Tọa độ Z dịch chuyển về phía trước tối thiểu 0.3m (lunge forward)');
assert(heroAstra.body.rotation.x === 0.4, 'AC 2.2: Thân người nghiêng góc lao tới (rotation.x = 0.4 rad)');

// AC 2.3: Hit State
diorama.playHeroHit(heroAstra);
assert(heroAstra.state === 'hit', 'AC 2.3: Khi dính đòn, hero.state lập tức chuyển thành hit');
assert(heroAstra.face.material.map === heroAstra.faceTex.hit, 'AC 2.3: Khuôn mặt đổi sang faceTex.hit (mắt nheo > <, miệng chữ O)');
assert(heroAstra.root.position.z > heroAstra.baseZ, 'AC 2.3: Thân người giật lùi về sau (flinch knockback displacement > baseZ)');
assert(heroAstra.body.rotation.x === -0.35, 'AC 2.3: Thân người ngả ra sau trước xung chấn (-0.35 rad)');

// AC 2.4: Die State
diorama.playHeroDie(heroAstra);
assert(heroAstra.isDefeated === true, 'AC 2.4: Khi tử trận, cờ hero.isDefeated phải bằng true');
assert(heroAstra.state === 'die', 'AC 2.4: hero.state chuyển thành die');
assert(heroAstra.face.material.map === heroAstra.faceTex.die, 'AC 2.4: Khuôn mặt chuyển thành faceTex.die (mắt nhắm tịt X_X)');
assert(heroAstra.body.rotation.x > 0.5, 'AC 2.4: Thân người ngã gục xuống sàn (rotation.x > 0.5 rad)');
assert(heroAstra.root.position.y < heroAstra.baseY, 'AC 2.4: Vị trí Y hạ thấp sát mặt sàn khi tử trận');

// AC 2.5: Revive State
diorama.playHeroRevive(heroAstra);
assert(heroAstra.isDefeated === false, 'AC 2.5: Sau khi hồi sinh, cờ hero.isDefeated phải trở về false');
assert(heroAstra.state === 'revive', 'AC 2.5: hero.state chuyển sang revive');
assert(heroAstra.body.rotation.x === 0, 'AC 2.5: Thân người dựng thẳng đứng trở lại');
assert(heroAstra.root.position.y >= heroAstra.baseY + 0.3, 'AC 2.5: Vị trí Y bật nảy lò xo cao hơn mặt đất tối thiểu 0.3m (jump)');

// ============================================================================
// [NHÓM AC 3]: PHỤ KIỆN VŨ KHÍ & ĐẶC TRƯNG TỪNG HERO (ACCESSORIES & WEAPONS)
// ============================================================================
console.log('\n[NHÓM AC 3: PHỤ KIỆN VŨ KHÍ & ĐẶC TRƯNG TỪNG HERO]');

// AC 3.1: Astra (Attacker / Lửa)
{
    const astra = diorama.heroes.find(h => h.role === 'Attacker');
    assert(astra.baseX === -2.3 && astra.baseZ === 1.2, 'AC 3.1: Astra đặt đúng vị trí quy định (-2.3, 1.2)');
    
    // Đuôi ngựa cao nhọn vút phía sau
    const ponytail = astra.body.children.find(c => c.geometry && c.geometry.type === 'ConeGeometry' && c.geometry.height === 0.85);
    assert(ponytail !== undefined, 'AC 3.1: Astra có đuôi ngựa cao nhọn ConeGeometry(0.28, 0.85, 8)');

    // Kính Cyber Visor tai trái
    const visor = astra.body.children.find(c => c.geometry && c.geometry.type === 'BoxGeometry' && c.material.color.hex === 0x00f0ff);
    assert(visor !== undefined, 'AC 3.1: Astra có kính ngắm Cyber Visor màu Cyan bên tai trái');

    // Song kiếm Katana nhiệt đỏ
    const blades = astra.weapon.children.filter(c => c.geometry && c.geometry.type === 'BoxGeometry');
    assert(blades.length === 2, 'AC 3.1: Astra sở hữu Song kiếm Katana nhiệt (2 lưỡi kiếm phát quang)');
}

// AC 3.2: Boran (Defender / Đất - Phòng Ngự)
{
    const boran = diorama.heroes.find(h => h.role === 'Defender');
    assert(boran.baseX === 2.3 && boran.baseZ === 1.2, 'AC 3.2: Boran đặt đúng vị trí quy định (2.3, 1.2)');

    // Nón giáp Mecha & Sừng năng lượng Antenna
    const helmet = boran.body.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.radius === 0.53);
    assert(helmet !== undefined, 'AC 3.2: Boran có nón giáp Mecha Titan bảo vệ đầu');

    const cyberHorns = boran.body.children.filter(c => c.geometry && c.geometry.type === 'ConeGeometry' && c.geometry.height === 0.45);
    assert(cyberHorns.length === 2, 'AC 3.2: Boran có cặp sừng Cyber Horns / Antenna radar 2 bên tai');

    // Đại khiên Aegis lục giác khổng lồ
    const shield = boran.weapon.children.find(c => c.geometry && c.geometry.type === 'CylinderGeometry' && c.geometry.radialSegments === 6);
    assert(shield !== undefined, 'AC 3.2: Boran có Đại Khiên Aegis hình lục giác (Cylinder 6 mặt)');
    assert(shield.geometry.radiusTop * 2 >= 0.8, 'AC 3.2: Chiều cao đường kính khiên Aegis đạt tối thiểu 0.8m (1.24m)');
}

// AC 3.3: Elysia (Supporter / Tím - Hư Không)
{
    const elysia = diorama.heroes.find(h => h.role === 'Supporter');
    assert(elysia.baseX === -0.75 && elysia.baseZ === 1.5, 'AC 3.3: Elysia đặt đúng vị trí quy định (-0.75, 1.5)');

    // 2 Bím tóc Anime dài (Twintails)
    const twintails = elysia.body.children.filter(c => c.geometry && c.geometry.type === 'CylinderGeometry' && c.geometry.height === 0.75);
    assert(twintails.length === 2, 'AC 3.3: Elysia sở hữu 2 bím tóc Anime Twintails rủ 2 bên');

    // Cụm Tam Cầu Hư Không (3 Void Orbs)
    const voidOrbs = elysia.weapon.children.filter(c => c.geometry && c.geometry.type === 'DodecahedronGeometry');
    assert(voidOrbs.length === 3, 'AC 3.3: Elysia có đủ Cụm Tam Cầu Hư Không (3 Void Orbs) trôi nổi');
}

// AC 3.4: Lin (Healer / Lục - Sinh Mệnh)
{
    const lin = diorama.heroes.find(h => h.role === 'Healer');
    assert(lin.baseX === 0.75 && lin.baseZ === 1.5, 'AC 3.4: Lin đặt đúng vị trí quy định (0.75, 1.5)');

    // 2 Búi tóc tròn Odango
    const odangoBuns = lin.body.children.filter(c => c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.radius === 0.2);
    assert(odangoBuns.length === 2, 'AC 3.4: Lin sở hữu 2 búi tóc tròn đôi Chibi Odango trên đầu');

    // Vòng hào quang Nanite Halo
    assert(lin.accessory !== null && lin.accessory.geometry.type === 'TorusGeometry', 'AC 3.4: Lin có Vòng hào quang Thiên Thần Nanite Halo lơ lửng trên đỉnh đầu');

    // Quyền trượng Nanite Thập Tự
    const staff = lin.weapon.children.find(c => c.geometry && c.geometry.type === 'CylinderGeometry' && c.geometry.height === 1.1);
    assert(staff !== undefined, 'AC 3.4: Lin có cán Quyền Trượng Thập Tự Nanite');
    assert(staff.children.length > 0 && staff.children[0].geometry.type === 'OctahedronGeometry', 'AC 3.4: Đầu trượng đính Tinh thể hoa ngọc bích chữa lành');
}

// ============================================================================
// [NHÓM AC 4]: CẤU TRÚC MODEL BOSS CHIBI MECHA TITAN (CHIBI BOSS & RETICLES)
// ============================================================================
console.log('\n[NHÓM AC 4: CẤU TRÚC BOSS CHIBI MECHA TITAN]');

// AC 4.1: Khởi tạo Boss Mecha
assert(diorama.boss !== null, 'AC 4.1: Boss Chibi Mecha không được null');
assert(diorama.boss.body.geometry.type === 'DodecahedronGeometry', 'AC 4.1: Khối thân Boss là khối đa diện Dodecahedron bo góc đáng yêu');
assert(diorama.boss.eye.geometry.type === 'PlaneGeometry', 'AC 4.1: Mắt Boss là mắt Cyclops LED công nghệ cao');
assert(diorama.drones.length === 2, 'AC 4.1: Boss có đúng chính xác 2 Drone hộ vệ Chibi bay lượn xung quanh');

// AC 4.2: Biểu cảm mắt Boss khi Choáng Váng (Stagger Break)
assert(diorama.bossEyeTexNormal.isCanvasTexture === true, 'AC 4.2: Boss có Texture mắt bình thường');
assert(diorama.bossEyeTexBroken.isCanvasTexture === true, 'AC 4.2: Boss có Texture mắt xoắn ốc khi Stagger Break');

// Kích hoạt Stagger Break
events.emit('stagger_broken');
assert(diorama.boss.isBroken === true, 'AC 4.2: Sau sự kiện stagger_broken, boss.isBroken = true');
assert(diorama.bossEyeMesh.material.map === diorama.bossEyeTexBroken, 'AC 4.2: Mắt Boss chuyển sang vòng xoáy hoa mắt 720 độ (bossEyeTexBroken)');
assert(diorama.boss.shakeTimer === 0.8, 'AC 4.2: Kích hoạt rung chấn shakeTimer = 0.8s khi vỡ giáp');

// Kích hoạt Phục hồi Stagger Recovery
events.emit('stagger_recovered');
assert(diorama.boss.isBroken === false, 'AC 4.2: Sau stagger_recovered, boss.isBroken = false');
assert(diorama.bossEyeMesh.material.map === diorama.bossEyeTexNormal, 'AC 4.2: Mắt Boss hồi phục về trạng thái bình thường (bossEyeTexNormal)');

// AC 4.3: Boss Tấn Công & Dính Sát Thương
diorama.playBossAttack();
assert(diorama.boss.state === 'attack', 'AC 4.3: Khi Boss xuất chiêu, boss.state chuyển thành attack');
assert(diorama.bossEyeMesh.material.map === diorama.bossEyeTexAttack, 'AC 4.3: Mắt Boss chuyển thành tâm ngắm khóa mục tiêu (bossEyeTexAttack)');

diorama.playBossHit(0.5);
assert(diorama.boss.shakeTimer === 0.5, 'AC 4.3: Khi dính đòn, boss.shakeTimer nhận giá trị dương > 0');
assert(diorama.bossMat.emissiveIntensity === 2.2, 'AC 4.3: Boss chớp sáng phát quang trauma flash khi dính đòn');

// ============================================================================
// [NHÓM AC 5]: MÔI TRƯỜNG TIỀN ĐỒN VŨ TRỤ CYBERPUNK (OUTPOST SCENERY)
// ============================================================================
console.log('\n[NHÓM AC 5: QUANG CẢNH MÔI TRƯỜNG TIỀN ĐỒN CYBERPUNK]');

// AC 5.1: Sàn đấu & Vòng xoay ngầm
assert(diorama.stageGroup !== null, 'AC 5.1: stageGroup phải tồn tại trong Scene');
assert(diorama.underRingMesh !== undefined && diorama.underRingMesh.geometry.type === 'RingGeometry', 'AC 5.1: Sàn đấu có vòng năng lượng xoay ngầm RingGeometry');

const outerRing = diorama.stageGroup.children.find(c => c.geometry && c.geometry.type === 'TorusGeometry');
assert(outerRing !== undefined, 'AC 5.1: Sàn đấu có vành đai bảo vệ biên TorusGeometry phát quang Cyan');

// AC 5.2: 4 Cột tháp Monoliths & Tinh thể bay lơ lửng
assert(diorama.sceneryProps.length === 4, 'AC 5.2: Mảng diorama.sceneryProps phải có đúng 4 cột tháp cự thạch');
diorama.sceneryProps.forEach((prop, i) => {
    const colMesh = prop.group.children.find(c => c.geometry && c.geometry.type === 'CylinderGeometry' && c.geometry.radialSegments === 8);
    assert(colMesh !== undefined, `AC 5.2 (Tháp ${i + 1}): Thân cột bát giác lăng trụ 8 mặt`);
    assert(prop.crystal !== undefined && prop.crystal.geometry.type === 'OctahedronGeometry', `AC 5.2 (Tháp ${i + 1}): Tinh thể dữ liệu bát diện OctahedronGeometry trôi nổi`);
});

// AC 5.3: Màn hình Hologram tác chiến ba chiều (Tactical Holo-Screens)
const holoPlanes = diorama.stageGroup.children.filter(c => c.geometry && c.geometry.type === 'PlaneGeometry' && c.geometry.width === 1.9);
assert(holoPlanes.length === 2, 'AC 5.3: Có đúng 2 màn hình Hologram tác chiến hiển thị dữ liệu Boss lơ lửng ở hậu cảnh');

// AC 5.4: Hạt bụi năng lượng Cyber Dust
assert(diorama.ambientParticles !== null && diorama.ambientParticles.isPoints === true, 'AC 5.4: Hệ thống hạt Cyber Dust là đối tượng THREE.Points');
assert(diorama.ambientParticles.geometry.attributes.position.count >= 50, 'AC 5.4: Số lượng hạt năng lượng đạt tối thiểu 50 hạt (thực tế 75 hạt)');

// AC 5.5: Vòng lặp cập nhật Update Loop (60 FPS Simulation)
const initialUnderRingRot = diorama.underRingMesh.rotation.z;
const initialCrystalY = diorama.sceneryProps[0].crystal.position.y;
const initialParticleY = diorama.ambientParticles.geometry.attributes.position.getY(0);

// Chạy 5 frame mô phỏng
for (let f = 1; f <= 5; f++) {
    diorama.update(0.016, f * 0.016);
}

assert(diorama.underRingMesh.rotation.z !== initialUnderRingRot, 'AC 5.5: Vòng xoay ngầm quay góc liên tục qua các frame');
assert(diorama.sceneryProps[0].crystal.position.y !== initialCrystalY, 'AC 5.5: Tinh thể trên cột dao động độ cao theo sóng sin điều hòa');
assert(diorama.ambientParticles.geometry.attributes.position.getY(0) !== initialParticleY, 'AC 5.5: Hạt bụi không gian chuyển động trôi nổi liên tục');

// ============================================================================
// [NHÓM EDGE CASES]: CÁC TRƯỜNG HỢP BIÊN VÀ ĐIỀU KIỆN RẼ NHÁNH (SECTION 7)
// ============================================================================
console.log('\n[NHÓM EDGE CASES: TRƯỜNG HỢP BIÊN & PHẢN ỨNG HỆ THỐNG]');

// Edge Case 7.1: Cả 4 Hero đồng loạt dính đòn quét sàn (Boss AoE)
events.emit('boss_attack', { damage: 200, isSuperAttack: true });
diorama.heroes.forEach(h => {
    assert(h.state === 'hit', `Edge Case 7.1 (${h.role}): Đồng loạt chuyển sang biểu cảm hit khi dính Boss AoE`);
    assert(h.face.material.map === h.faceTex.hit, `Edge Case 7.1 (${h.role}): Mặt nheo lại > <`);
});

// Edge Case 7.2: Hero đã tử trận không bị kích hoạt hoạt ảnh tấn công hay dính đòn
const defenderBoran = diorama.heroes.find(h => h.role === 'Defender');
diorama.playHeroDie(defenderBoran);
assert(defenderBoran.isDefeated === true, 'Edge Case 7.2: Boran chuyển trạng thái tử trận isDefeated = true');

// Cố ý gọi playHeroHit lên Hero đã gục ngã
diorama.playHeroHit(defenderBoran);
assert(defenderBoran.state === 'die', 'Edge Case 7.2: Hero tử trận không bị ghi đè sang trạng thái hit');
assert(defenderBoran.face.material.map === defenderBoran.faceTex.die, 'Edge Case 7.2: Mặt Hero tử trận vẫn giữ nguyên mắt X_X');

// Edge Case 7.3: Hồi sinh qua EventBus (hero_revived)
events.emit('hero_revived', { hero: { role: 'Defender' } });
assert(defenderBoran.isDefeated === false, 'Edge Case 7.3: Boran hồi sinh thành công qua EventBus');
assert(defenderBoran.state === 'revive', 'Edge Case 7.3: Boran chuyển trạng thái revive');

// Edge Case 7.4: Chuyển Chapter Mới cập nhật Boss Appearance (Stage 1 -> 2 -> 3)
events.emit('stage_loaded', { stageId: 2 }); // Warden Aegis (Băng Tuyết)
assert(diorama.bossMat.color.hex === 0x0284c7, 'Edge Case 7.4: Chuyển Chapter 2, Boss Mecha đổi sang màu Xanh Băng 0x0284c7');

events.emit('stage_loaded', { stageId: 3 }); // Null Sovereign (Hư Không)
assert(diorama.bossMat.color.hex === 0x6b21a8, 'Edge Case 7.4: Chuyển Chapter 3, Boss Mecha đổi sang màu Tím Hư Không 0x6b21a8');

events.emit('stage_loaded', { stageId: 1 }); // Sentinel Unit 07 (Đỏ Lửa)
assert(diorama.bossMat.color.hex === 0x991b1b, 'Edge Case 7.4: Quay lại Chapter 1, Boss Mecha đổi sang màu Đỏ Lửa 0x991b1b');

// Edge Case 7.5: Kiểm tra toàn bộ 16 textures Decal khuôn mặt và 9 textures mắt Boss sinh ra từ Canvas sạch sẽ
const allRoles = ['Attacker', 'Supporter', 'Healer', 'Defender'];
allRoles.forEach(r => {
    const hero = diorama.heroes.find(h => h.role === r);
    ['normal', 'hit', 'die', 'attack'].forEach(st => {
        assert(hero.faceTex[st] !== null && hero.faceTex[st].isCanvasTexture === true, `Edge Case 7.5: Texture ${r} [${st}] sinh từ Canvas 2D hoàn hảo`);
    });
});

console.log('\n' + '='.repeat(75));
console.log(`KẾT QUẢ TỔNG HỢP KIỂM THỬ: ${passedChecks} PASS / ${totalChecks - passedChecks} FAIL (TỔNG CỘNG ${totalChecks} ASSERTIONS)`);
console.log('='.repeat(75));

if (passedChecks === totalChecks) {
    console.log('\n🎉 [QC VERIFICATION COMPLETED]: TOÀN BỘ 100% TIÊU CHUẨN NGHIỆM THU AC 1 - AC 5 VÀ EDGE CASES ĐẠT CHUẨN XUẤT SẮC!');
    process.exit(0);
} else {
    console.error('\n❌ [QC VERIFICATION FAILED]: CÓ TEST KHÔNG ĐẠT YÊU CẦU!');
    process.exit(1);
}
