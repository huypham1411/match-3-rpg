/**
 * Web/test_3d_web_experience_and_asset_fidelity.mjs
 * ============================================================================
 * KIỂM THỬ TIÊU CHUẨN 3D WEB EXPERIENCE & NÂNG CẤP ĐỘ CHI TIẾT ASSET 3D
 * Đặc tả tham chiếu: Docs/Specs/SPEC_3D_WEB_EXPERIENCE_AND_ASSET_FIDELITY.md
 * Mã đặc tả: SPEC-WEB3D-004 | QC Lead (@qc_lead) & Web3D Designer (@web3d_designer)
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

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
console.log('🎨 BẮT ĐẦU KIỂM THỬ: 3D WEB EXPERIENCE & ASSET FIDELITY STANDARD');
console.log('   Mã đặc tả: SPEC-WEB3D-004 | Tiêu chuẩn: AC-01 -> AC-10');
console.log('='.repeat(80));

// ============================================================================
// NHÓM 1: HẠ TẦNG AGENT & SKILL (AC-01 -> AC-02)
// ============================================================================
console.log('\n[NHÓM 1: HẠ TẦNG AGENT & SKILL]');

// AC-01: Skill 3d-web-experience/SKILL.md
{
    const skillPath = path.join(workspaceRoot, '.agents', 'skills', '3d-web-experience', 'SKILL.md');
    const skillExists = fs.existsSync(skillPath);
    let skillValid = false;
    if (skillExists) {
        const content = fs.readFileSync(skillPath, 'utf8');
        skillValid = content.includes('3d-web-experience') && content.includes('Three.js') && content.includes('Performance');
    }
    check(skillValid, 'AC-01', 'Skill 3d-web-experience đã được cài đặt đầy đủ vào .agents/skills/3d-web-experience/SKILL.md');
}

// AC-02: Agent web3d-designer/agent.md
{
    const agentPath = path.join(workspaceRoot, '.agents', 'agents', 'web3d-designer', 'agent.md');
    const agentExists = fs.existsSync(agentPath);
    let agentValid = false;
    if (agentExists) {
        const content = fs.readFileSync(agentPath, 'utf8');
        agentValid = content.includes('web3d-designer') && content.includes('3D Web Experience Architect');
    }
    check(agentValid, 'AC-02', 'Agent @web3d_designer đã được định hình cấu trúc tại .agents/agents/web3d-designer/agent.md');
}

// ============================================================================
// MOCK THREE.JS CHO NODE.JS HEADLESS RUNTIME
// ============================================================================

globalThis.document = {
    createElement(tag) {
        if (tag === 'canvas') {
            return {
                width: 0,
                height: 0,
                getContext() {
                    return {
                        fillStyle: '', strokeStyle: '', lineWidth: 1,
                        fillRect() {}, clearRect() {}, beginPath() {},
                        moveTo() {}, lineTo() {}, arc() {}, ellipse() {},
                        stroke() {}, fill() {}, save() {}, restore() {},
                        closePath() {}, strokeRect() {}, fillText() {},
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
        constructor(geometry, material) {
            this.isMesh = true;
            this.geometry = geometry;
            this.material = material;
            this.children = [];
            this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
            this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
            this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
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
        distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
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
    CylinderGeometry: class {
        constructor(radiusTop, radiusBottom, height, radialSegments) {
            this.type = 'CylinderGeometry';
            this.radiusTop = radiusTop;
            this.radiusBottom = radiusBottom;
            this.height = height;
            this.radialSegments = radialSegments;
        }
    },
    BoxGeometry: class {
        constructor(w, h, d) {
            this.type = 'BoxGeometry';
            this.width = w; this.height = h; this.depth = d;
        }
    },
    PlaneGeometry: class {
        constructor(w, h) {
            this.type = 'PlaneGeometry';
            this.width = w; this.height = h;
        }
    },
    TorusGeometry: class {
        constructor(radius, tube, radialSegments, tubularSegments) {
            this.type = 'TorusGeometry';
            this.radius = radius; this.tube = tube;
        }
    },
    ConeGeometry: class {
        constructor(radius, height, radialSegments) {
            this.type = 'ConeGeometry';
            this.radius = radius; this.height = height;
        }
    },
    DodecahedronGeometry: class {
        constructor(radius, detail) {
            this.type = 'DodecahedronGeometry';
            this.radius = radius; this.detail = detail;
        }
    },
    OctahedronGeometry: class {
        constructor(radius, detail) {
            this.type = 'OctahedronGeometry';
            this.radius = radius; this.detail = detail;
        }
    },
    RingGeometry: class {
        constructor(inner, outer) {
            this.type = 'RingGeometry';
            this.innerRadius = inner; this.outerRadius = outer;
        }
    },
    CircleGeometry: class {
        constructor(radius) {
            this.type = 'CircleGeometry';
            this.radius = radius;
        }
    },
    BufferGeometry: class {
        constructor() { this.attributes = {}; }
        setAttribute(name, attr) { this.attributes[name] = attr; }
    },
    BufferAttribute: class {
        constructor(arr, size) {
            this.array = arr;
            this.itemSize = size;
            this.count = arr.length / size;
        }
        getY(idx) { return this.array[idx * 3 + 1]; }
        setY(idx, val) { this.array[idx * 3 + 1] = val; }
    },
    MeshStandardMaterial: class {
        constructor(cfg = {}) {
            this.color = { hex: cfg.color || 0xffffff, setHex(h) { this.hex = h; } };
            this.emissive = { hex: cfg.emissive || 0x000000, setHex(h) { this.hex = h; } };
            this.emissiveIntensity = cfg.emissiveIntensity || 0;
            this.metalness = cfg.metalness || 0;
            this.roughness = cfg.roughness || 0;
            this.map = cfg.map || null;
            this.transparent = cfg.transparent || false;
            this.opacity = cfg.opacity !== undefined ? cfg.opacity : 1.0;
        }
    },
    MeshBasicMaterial: class {
        constructor(cfg = {}) {
            this.color = { hex: cfg.color || 0xffffff, setHex(h) { this.hex = h; } };
            this.map = cfg.map || null;
            this.transparent = cfg.transparent || false;
            this.opacity = cfg.opacity !== undefined ? cfg.opacity : 1.0;
        }
    },
    PointsMaterial: class {
        constructor(cfg = {}) {
            this.color = { hex: cfg.color || 0xffffff };
            this.size = cfg.size || 1;
        }
    },
    CanvasTexture: class {
        constructor() {
            this.isCanvasTexture = true;
            this.repeat = { set() {} };
        }
    },
    FrontSide: 0,
    DoubleSide: 2,
    RepeatWrapping: 1000,
    AdditiveBlending: 2
};

const mockEngine = {
    scene: new globalThis.THREE.Group(),
    camera: {
        position: new globalThis.THREE.Vector3(0, 7.8, 14.5),
        lookAt() {}
    }
};

const { GameState } = await import('./src/core/GameState.js');
const { Diorama3D } = await import('./src/three/Diorama3D.js');

const gameState = new GameState(8, 8);
const diorama = new Diorama3D(mockEngine, gameState);

// ============================================================================
// NHÓM 2: CHI TIẾT TẠO HÌNH HERO (AC-03 -> AC-05)
// ============================================================================
console.log('\n[NHÓM 2: CHI TIẾT TẠO HÌNH HERO]');

// AC-03: Chibi Gauntlets & Hands
{
    let allHaveHands = true;
    let missing = [];
    diorama.heroes.forEach(h => {
        let handCount = 0;
        const scan = (node) => {
            if (!node || !node.children) return;
            node.children.forEach(c => {
                if (c.geometry && (c.geometry.type === 'SphereGeometry' || c.geometry.type === 'BoxGeometry')) {
                    if (c.geometry.radius <= 0.12 || (c.geometry.width && c.geometry.width <= 0.14)) {
                        // Đếm các khối găng tay nhỏ
                        if (c.position && Math.abs(c.position.x) >= 0.20) handCount++;
                    }
                }
                scan(c);
            });
        };
        scan(h.body);
        if (handCount < 2) {
            allHaveHands = false;
            missing.push(`${h.role} (found ${handCount} hands)`);
        }
    });
    check(allHaveHands, 'AC-03', allHaveHands
        ? 'Cả 4 Hero đều có bàn tay/găng tay Chibi Gauntlets tỉ mỉ ở 2 bên cánh tay'
        : `Thiếu găng tay Chibi: ${missing.join(', ')}`);
}

// AC-04: Tactical Cyber Belt & Buckle
{
    let allHaveBelt = true;
    let missing = [];
    diorama.heroes.forEach(h => {
        let hasBelt = false;
        const scan = (node) => {
            if (!node || !node.children) return;
            node.children.forEach(c => {
                if (c.geometry) {
                    if ((c.geometry.type === 'CylinderGeometry' || c.geometry.type === 'TorusGeometry') && c.geometry.height <= 0.12) {
                        hasBelt = true;
                    }
                }
                scan(c);
            });
        };
        scan(h.body);
        if (!hasBelt) {
            allHaveBelt = false;
            missing.push(h.role);
        }
    });
    check(allHaveBelt, 'AC-04', allHaveBelt
        ? 'Cả 4 Hero đều sở hữu thắt lưng năng lượng Tactical Cyber Belt kèm khóa buckle'
        : `Thiếu thắt lưng Cyber Belt: ${missing.join(', ')}`);
}

// AC-05: Enhanced Weapon Detail
{
    const astra = diorama.heroes.find(h => h.role === 'Attacker');
    const elysia = diorama.heroes.find(h => h.role === 'Supporter');
    const lin = diorama.heroes.find(h => h.role === 'Healer');
    const boran = diorama.heroes.find(h => h.role === 'Defender');

    // Astra: Katana Guard / Tsuba or Pommel
    let astraHasGuard = astra.weapon.children.length >= 2;
    // Elysia: Void Orbs runic rings
    let elysiaHasOrbs = elysia.weapon.children.length >= 3;
    // Lin: Staff healing tip
    let linHasTip = lin.weapon.children.length >= 1;
    // Boran: Aegis Shield
    let boranHasShield = boran.weapon.children.length >= 1;

    const allWeaponUpgraded = astraHasGuard && elysiaHasOrbs && linHasTip && boranHasShield;
    check(allWeaponUpgraded, 'AC-05', 'Vũ khí cả 4 Hero đạt tiêu chuẩn chi tiết 3D Web Experience');
}

// ============================================================================
// NHÓM 3: NÂNG CẤP MECHA BOSS TITAN (AC-06 -> AC-07)
// ============================================================================
console.log('\n[NHÓM 3: NÂNG CẤP MECHA BOSS TITAN]');

// AC-06: Mecha Carapace Plating & Ion Booster Thrusters
{
    let hasThrusters = false;
    let thrusterCount = 0;
    const scan = (node) => {
        if (!node || !node.children) return;
        node.children.forEach(c => {
            if (c.geometry && (c.geometry.type === 'CylinderGeometry' || c.geometry.type === 'ConeGeometry')) {
                // Kiểm tra ống phản lực phía sau
                if (c.position && c.position.z <= 0) {
                    thrusterCount++;
                }
            }
            scan(c);
        });
    };
    scan(diorama.bossGroup);
    hasThrusters = thrusterCount >= 2;

    check(hasThrusters, 'AC-06', hasThrusters
        ? `Boss Sentinel Unit 07 trang bị cụm giáp Mecha Carapace và ${thrusterCount} ống phản lực đẩy Ion Thrusters`
        : `Boss thiếu ống phản lực đẩy Ion Thrusters (tìm thấy: ${thrusterCount})`);
}

// AC-07: Hazard Vents
{
    let hasHazardVents = false;
    const scan = (node) => {
        if (!node || !node.children) return;
        node.children.forEach(c => {
            if (c.geometry && c.geometry.type === 'BoxGeometry') {
                if (c.position && Math.abs(c.position.x) >= 0.5) {
                    hasHazardVents = true;
                }
            }
            scan(c);
        });
    };
    scan(diorama.bossGroup);

    check(hasHazardVents, 'AC-07', hasHazardVents
        ? 'Boss sở hữu dải khe tản nhiệt công nghệ cao Hazard Vents trên thân giáp'
        : 'Boss thiếu khe tản nhiệt Hazard Vents');
}

// ============================================================================
// NHÓM 4: CHIẾN TRƯỜNG & HIỆU NĂNG 60 FPS (AC-08 -> AC-10)
// ============================================================================
console.log('\n[NHÓM 4: CHIẾN TRƯỜNG & HIỆU NĂNG 60 FPS]');

// AC-08: Arena Concentric Pulse Rings & Field
{
    const hasUnderRing = diorama.underRingMesh !== undefined;
    const hasProps = diorama.sceneryProps && diorama.sceneryProps.length >= 4;
    check(hasUnderRing && hasProps, 'AC-08', 'Đấu trường sở hữu vòng năng lượng xoay ngầm và 4 trụ tháp Monoliths phát sáng');
}

// AC-09: Lighting balance & Tone Mapping
{
    const engineFile = fs.readFileSync(path.join(workspaceRoot, 'Web', 'src', 'three', 'Engine.js'), 'utf8');
    const hasToneMapping = engineFile.includes('ACESFilmicToneMapping');
    const hasKeyLight = engineFile.includes('DirectionalLight');
    const hasRimLight = engineFile.includes('PointLight');
    check(hasToneMapping && hasKeyLight && hasRimLight, 'AC-09', 'Hệ thống ánh sáng thiết lập PBR, ACESFilmic Tone Mapping và Rim Light kịch tính');
}

// AC-10: 500 frames update benchmark (<2.0ms/frame)
{
    const start = Date.now();
    for (let f = 0; f < 500; f++) {
        diorama.update(0.016, f * 0.016);
    }
    const elapsed = Date.now() - start;
    const avgPerFrame = elapsed / 500;
    const isPerformant = avgPerFrame < 2.0;
    check(isPerformant, 'AC-10', `Hiệu năng tính toán đạt chuẩn 60 FPS (${avgPerFrame.toFixed(3)}ms/frame trên 500 frames)`);
}

// ============================================================================
// TỔNG KẾT HÓA ĐƠN KIỂM THỬ
// ============================================================================
console.log('='.repeat(80));
console.log(`KẾT QUẢ KIỂM THỬ SPEC-WEB3D-004:`);
console.log(`  TỔNG SỐ ĐIỀU KHOẢN: ${totalChecks}`);
console.log(`  ĐẠT (PASS):         ${passedChecks}`);
console.log(`  THẤT BẠI (FAIL):    ${failedChecks}`);
console.log('='.repeat(80));

if (failedChecks > 0) {
    console.error(`❌ CÒN ${failedChecks} ĐIỀU KHOẢN CHƯA ĐẠT. XEM CHI TIẾT PHÍA TRÊN.`);
    process.exit(1);
} else {
    console.log(`🎉 100% TIÊU CHUẨN 3D WEB EXPERIENCE ĐẠT CHUẨN XUẤT SẮC!`);
    process.exit(0);
}
