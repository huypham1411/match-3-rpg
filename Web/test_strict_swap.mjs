import { GameState } from './src/core/GameState.js';
import { events } from './src/core/EventBus.js';

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
console.log('🧪 KIỂM THỬ QUY TẮC MATCH-3 CHUẨN: SWAP VALIDATION & REVERT KHI KHÔNG MATCH');
console.log('='.repeat(70));

const game = new GameState();

// Tạo bàn cờ xen kẽ màu để chắc chắn swap không tạo ra 3-match
// Ví dụ: ô (2, 2) là màu 1, ô (2, 3) là màu 2, các ô lân cận đều là màu khác
for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
        game.grid[r][c] = ((r * 2 + c) % 5) + 2; // Các màu từ 2 đến 6
    }
}
game.grid[2][2] = 1; // Màu 1
game.grid[2][3] = 2; // Màu 2

const initialMoves = game.movesLeft;
let rejectEventFired = false;
events.on('swap_reject', ({ from, to }) => {
    rejectEventFired = true;
});

console.log('\n[TEST 1: HOÁN ĐỔI KHÔNG TẠO MATCH -> PHẢI REVERT]');
const swapSuccess = await game.swap(2, 2, 2, 3);

assert(swapSuccess === false, 'Hàm swap() trả về false khi không tạo được match-3');
assert(game.grid[2][2] === 1, 'Ô (2, 2) được khôi phục về màu 1 ban đầu');
assert(game.grid[2][3] === 2, 'Ô (2, 3) được khôi phục về màu 2 ban đầu');
assert(game.movesLeft === initialMoves, 'Số lượt đi (movesLeft) KHÔNG bị trừ khi nước đi không hợp lệ');
assert(rejectEventFired === true, 'Sự kiện swap_reject được phát để kích hoạt animation snap-back trên giao diện');

console.log('\n[TEST 2: HOÁN ĐỔI TẠO MATCH-3 HỢP LỆ -> PHẢI CHẤP THUẬN]');
// Đặt tình huống (3, 1), (3, 2) là màu 1, và (2, 3) là màu 1
// Đổi (2, 3) xuống (3, 3) sẽ tạo match 3 màu 1 tại hàng 3!
game.grid[3][1] = 1;
game.grid[3][2] = 1;
game.grid[2][3] = 1;
game.grid[3][3] = 5; // Khác màu 1

let acceptEventFired = false;
events.on('swap_accept', () => {
    acceptEventFired = true;
});

const validSwap = await game.swap(2, 3, 3, 3);
assert(validSwap === true, 'Hàm swap() trả về true khi tạo được match-3 hợp lệ');
assert(game.movesLeft === initialMoves - 1, 'Số lượt đi bị trừ đúng 1 khi nước đi hợp lệ');
assert(acceptEventFired === true, 'Sự kiện swap_accept được phát để nổ khối và cascade');

console.log('='.repeat(70));
console.log(`KẾT QUẢ KIỂM THỬ: ${passed} PASS / ${failed} FAIL`);
console.log('='.repeat(70));
if (failed > 0) process.exit(1);
