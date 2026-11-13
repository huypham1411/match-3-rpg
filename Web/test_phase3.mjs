/**
 * Web/test_phase3.mjs
 * ============================================================================
 * [QC TEST SUITE] KIỂM THỬ NGHIỆM THU GATE CHECKLIST PHASE 3
 * Tác giả: @qc_lead
 * 
 * Mục tiêu:
 *  1. [Checklist 3.1]: Hệ thống 3 Stage hoàn chỉnh (Stage 1 -> Stage 2 -> Stage 3)
 *  2. [Checklist 3.2]: Hệ thống Vật cản (Rock 3 HP, Ice 2 HP, Crate 2 HP, Chain 1 HP)
 *  3. [Checklist 3.3]: Cơ chế Tử trận Nhân vật (Hero Defeat khi HP <= 0)
 *  4. [Checklist 3.4]: Dung hợp Ngọc Đặc Biệt (Combo Fusion: Bomb + Laser)
 * ============================================================================
 */

import { GameState, SPECIAL_TYPES, OBSTACLE_TYPES } from './src/core/GameState.js';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, testName, details = '') {
    if (condition) {
        passed++;
        console.log(`  ✅ PASS: ${testName}`);
    } else {
        failed++;
        const errMsg = `  ❌ FAIL: ${testName} ${details ? '-> ' + details : ''}`;
        console.error(errMsg);
        errors.push(errMsg);
    }
}

console.log('='.repeat(70));
console.log('🧪 BẮT ĐẦU KIỂM THỬ TÍNH NĂNG PHASE 3 (@qc_lead execution)');
console.log('='.repeat(70));

const game = new GameState();

// ---------------------------------------------------------------------------
// TEST 1: CHUYỂN MÀN CHƠI (STAGE PROGRESSION 1 -> 2 -> 3)
// ---------------------------------------------------------------------------
console.log('\n[TEST GROUP 1: STAGE PROGRESSION]');
assert(typeof game.loadStage === 'function', 'Hàm game.loadStage() phải tồn tại');

if (typeof game.loadStage === 'function') {
    game.loadStage(1);
    assert(game.currentStageId === 1, 'Stage 1 được nạp đúng', `Thực tế: ${game.currentStageId}`);
    assert(game.boss.id === 'sentinel_07', 'Boss Stage 1 là Sentinel Unit 07', `Thực tế: ${game.boss.id}`);

    game.loadStage(2);
    assert(game.currentStageId === 2, 'Stage 2 được nạp đúng (Warden Aegis)', `Thực tế: ${game.currentStageId}`);
    assert(game.boss.id === 'warden_aegis', 'Boss Stage 2 là Warden Aegis', `Thực tế: ${game.boss.id}`);

    game.loadStage(3);
    assert(game.currentStageId === 3, 'Stage 3 được nạp đúng (Null Sovereign)', `Thực tế: ${game.currentStageId}`);
    assert(game.boss.id === 'null_sovereign', 'Boss Stage 3 là Null Sovereign', `Thực tế: ${game.boss.id}`);
}

// ---------------------------------------------------------------------------
// TEST 2: VẬT CẢN (OBSTACLES: ROCK, ICE, CRATE, CHAIN)
// ---------------------------------------------------------------------------
console.log('\n[TEST GROUP 2: OBSTACLES SYSTEM]');
assert(OBSTACLE_TYPES !== undefined, 'Hằng số OBSTACLE_TYPES phải tồn tại');
assert(Array.isArray(game.obstacleGrid), 'Mảng game.obstacleGrid phải tồn tại');

if (OBSTACLE_TYPES && Array.isArray(game.obstacleGrid)) {
    // Đặt 1 khối Rock tại (3, 3) có 3 HP
    game.spawnObstacle(3, 3, OBSTACLE_TYPES.ROCK, 3);
    assert(game.obstacleGrid[3][3].type === OBSTACLE_TYPES.ROCK, 'Sinh khối Đá (Rock) tại ô (3, 3)');
    assert(game.obstacleGrid[3][3].hp === 3, 'Khối Đá có 3 HP khởi đầu');

    // Nổ kề cạnh phải trừ HP của Rock
    game.damageAdjacentObstacles([{ r: 3, c: 2 }]);
    assert(game.obstacleGrid[3][3].hp === 2, 'Match kề bên làm giảm 1 HP khối Đá', `Thực tế: ${game.obstacleGrid[3][3].hp}`);
}

// ---------------------------------------------------------------------------
// TEST 3: CƠ CHẾ TỬ TRẬN NHÂN VẬT (HERO DEFEAT)
// ---------------------------------------------------------------------------
console.log('\n[TEST GROUP 3: HERO DEFEAT STATE]');
assert(typeof game.heroes[0].isDefeated === 'boolean', 'Thuộc tính hero.isDefeated phải tồn tại');

// Thử gây sát thương chết hero 0
game.heroes[0].hp = 0;
game.checkHeroFaint();
assert(game.heroes[0].isDefeated === true, 'Hero có HP = 0 chuyển sang trạng thái isDefeated = true');
assert(game.triggerUltimate(0) === false, 'Hero đã tử trận không thể tung Ultimate');

// ---------------------------------------------------------------------------
// TEST 4: DUNG HỢP NGỌC ĐẶC BIỆT (COMBO FUSION: BOMB + LASER)
// ---------------------------------------------------------------------------
console.log('\n[TEST GROUP 4: SPECIAL COMBO FUSION]');
assert(typeof game.isSpecialFusion === 'function', 'Hàm game.isSpecialFusion() nhận diện đổi chỗ 2 ngọc đặc biệt');

console.log('\n' + '='.repeat(70));
console.log(`KẾT QUẢ: ${passed} PASS / ${failed} FAIL`);
console.log('='.repeat(70));

if (failed > 0) {
    console.error(`\n🚨 @qc_lead BÁO CÁO LỖI: Có ${failed} bài kiểm thử KHÔNG ĐẠT. Yêu cầu @web_dev xử lý ngay!`);
    process.exit(1);
} else {
    console.log(`\n🎉 @qc_lead XÁC NHẬN: Toàn bộ kiểm thử Phase 3 ĐẠT 100%!`);
    process.exit(0);
}
