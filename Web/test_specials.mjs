import { GameState, SPECIAL_TYPES } from './src/core/GameState.js';

let passed = 0;
let failed = 0;

function assert(condition, name, msg = '') {
    if (condition) {
        passed++;
        console.log(`  ✅ PASS: ${name}`);
    } else {
        failed++;
        console.error(`  ❌ FAIL: ${name} -> ${msg}`);
    }
}

console.log('='.repeat(70));
console.log('🧪 KIỂM THỬ KHỞI TẠO VÀ DIỄN HOẠ NGỌC ĐẶC BIỆT (ZERO BLACK HOLES)');
console.log('='.repeat(70));

const game = new GameState();

// 1. TEST MATCH 4 NGANG -> LINE_ROW
console.log('\n[TEST 1: MATCH 4 NGANG -> LINE_ROW]');
// Xoá bàn cờ và đặt match 4 màu 1
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) game.grid[r][c] = ((r + c) % 5) + 2; // Không có match
game.grid[3][1] = 1; game.grid[3][2] = 1; game.grid[3][3] = 1; game.grid[3][4] = 1;
const m4h = game.findMatches();
assert(m4h.length >= 4, 'Tìm thấy cụm match 4');
assert(m4h.specialsToSpawn.some(s => s.specialType === SPECIAL_TYPES.LINE_ROW), 'Tạo thành công Ngọc LINE_ROW');

// 2. TEST MATCH 4 DỌC -> LINE_COL
console.log('\n[TEST 2: MATCH 4 DỌC -> LINE_COL]');
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) game.grid[r][c] = ((r + c) % 5) + 2;
game.grid[1][4] = 1; game.grid[2][4] = 1; game.grid[3][4] = 1; game.grid[4][4] = 1;
const m4v = game.findMatches();
assert(m4v.length >= 4, 'Tìm thấy cụm match 4 dọc');
assert(m4v.specialsToSpawn.some(s => s.specialType === SPECIAL_TYPES.LINE_COL), 'Tạo thành công Ngọc LINE_COL');

// 3. TEST MATCH 2X2 VUÔNG -> BOMB_3X3
console.log('\n[TEST 3: MATCH 2X2 VUÔNG -> BOMB_3X3]');
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) game.grid[r][c] = ((r + c) % 5) + 2;
game.grid[2][2] = 1; game.grid[2][3] = 1; game.grid[3][2] = 1; game.grid[3][3] = 1;
const mSquare = game.findMatches();
assert(mSquare.length >= 4, 'Tìm thấy cụm ô vuông 2x2');
assert(mSquare.specialsToSpawn.some(s => s.specialType === SPECIAL_TYPES.BOMB_3X3), 'Tạo thành công Ngọc BOMB_3X3 từ hình vuông');

// 4. TEST MATCH 5 -> SWAP_ALL
console.log('\n[TEST 4: MATCH 5 LIÊN TIẾP -> SWAP_ALL]');
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) game.grid[r][c] = ((r + c) % 5) + 2;
game.grid[4][1] = 1; game.grid[4][2] = 1; game.grid[4][3] = 1; game.grid[4][4] = 1; game.grid[4][5] = 1;
const m5 = game.findMatches();
assert(m5.length >= 5, 'Tìm thấy cụm match 5');
assert(m5.specialsToSpawn.some(s => s.specialType === SPECIAL_TYPES.SWAP_ALL), 'Tạo thành công Ngọc SWAP_ALL (Lỗ Đen Đa Sắc)');

// 5. TEST RESOLVE CASCADE KHÔNG ĐỂ LẠI Ô TRỐNG (ZERO HOLES)
console.log('\n[TEST 5: CASCADE RESOLUTION & ZERO EMPTY HOLES]');
await game.resolveCascade();
let zeroCount = 0;
for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
        if (game.grid[r][c] === 0) zeroCount++;
    }
}
assert(zeroCount === 0, 'Sau khi Cascade hoàn tất, trên bàn cờ có ĐÚNG 0 ô trống (Zero Black Holes)', `Thực tế còn: ${zeroCount} ô trống`);

console.log('='.repeat(70));
console.log(`KẾT QUẢ KIỂM THỬ: ${passed} PASS / ${failed} FAIL`);
console.log('='.repeat(70));
if (failed > 0) process.exit(1);
