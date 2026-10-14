/* ============================================================================
   smoke_test.mjs - Kiểm tra bản WebAssembly bằng Node (không cần trình duyệt)
   ----------------------------------------------------------------------------
   Chạy:  node Web/smoke_test.mjs
   Bài test này lặp lại đúng những gì bộ test C++ kiểm tra, nhưng qua lớp WASM:
     - lõi luật chơi nạp được và trả về bàn 8x8
     - nước đi sai bị từ chối, nước đi đúng thì trạng thái đổi
     - kỹ năng / ultimate / kết thúc turn hoạt động
     - chuỗi tiếng Việt qua biên giới WASM đọc được (không vỡ font/UTF-8)
     - chơi liên tục tới khi kết thúc trận mà không treo
   ============================================================================ */

import createModule from './dist/m3core.mjs';

let passed = 0;
const failures = [];

function check(condition, label) {
  if (condition) { passed++; }
  else { failures.push(label); }
}

const M = await createModule();

// ---------------------------------------------------------------------------
// 1. Khởi tạo
// ---------------------------------------------------------------------------
const stage = M._m3_init(0, 20261008);
check(stage === 0, 'm3_init trả về map 0');
check(M._m3_width() === 8 && M._m3_height() === 8, 'bàn mặc định 8x8');
check(M._m3_member_count() === 4, 'đội mặc định có 4 nhân vật');
check(M._m3_stage_count() >= 4, 'có ít nhất 4 map mẫu');

// ---------------------------------------------------------------------------
// 1b. Hàng địch nhiều con + phân cấp + story (tính năng mới)
// ---------------------------------------------------------------------------
const enemyCount = M._m3_enemy_count();
check(enemyCount > 1, `màn có nhiều hơn 1 địch (thực tế ${enemyCount})`);
check(M._m3_enemy_alive_count() === enemyCount, 'ban đầu toàn bộ địch còn sống');
check(M._m3_target_enemy() >= 0 && M._m3_target_enemy() < enemyCount, 'có mục tiêu đang ngắm hợp lệ');

let tierOk = true;
let spriteOk = true;
for (let i = 0; i < enemyCount; i++) {
  const tier = M._m3_enemy_tier(i);
  if (tier < 0 || tier > 3) { tierOk = false; }
  if (M.UTF8ToString(M._m3_enemy_tier_name(i)).length === 0) { tierOk = false; }
  if (M.UTF8ToString(M._m3_enemy_sprite(i)).length === 0) { spriteOk = false; }
  if (M._m3_enemy_hp(i) <= 0) { tierOk = false; }
}
check(tierOk, 'mỗi địch có cấp bậc + tên cấp bậc + HP hợp lệ');
check(spriteOk, 'mỗi địch có khoá sprite pixel để UI vẽ');

check(typeof M._m3_set_target_enemy === 'function', 'có hàm đổi mục tiêu');
check(M._m3_set_target_enemy(0) === 1, 'đổi mục tiêu sang địch đầu hàng được');
check(M._m3_target_enemy() === 0, 'mục tiêu đã đổi đúng');
check(M._m3_set_target_enemy(enemyCount + 5) === 0, 'mục tiêu ngoài phạm vi bị từ chối');

check(typeof M._m3_enemy_intent_name === 'function', 'đọc được ý định hành động của địch (UI cảnh báo trước)');
check(M._m3_enemy_has_stagger(0) === 0 || M._m3_enemy_has_stagger(0) === 1, 'đọc được cờ có thanh stagger');

// Story của màn
check(typeof M._m3_story_stage_title === 'function', 'có dữ liệu story của màn');
check(M._m3_story_chapter_count() >= 1, 'có ít nhất 1 chương story trong thư viện');
check(M.UTF8ToString(M._m3_story_stage_title()).length > 0, 'màn 1 có tiêu đề story');
check(M._m3_story_intro_count() >= 1, 'màn 1 có thoại mở màn');

// ---------------------------------------------------------------------------
// 1c. Dòng nhịp sự kiện (nền tảng cho animation kiểu FF/GBF)
// ---------------------------------------------------------------------------
check(typeof M._m3_event_seq === 'function', 'có hàm đọc số thứ tự nhịp');
check(typeof M._m3_event_count === 'function', 'có hàm đếm số nhịp của hành động vừa rồi');

// Một nước đi thật phải sinh ra dòng nhịp cho giao diện diễn hoạ.
{
  const seqBefore = M._m3_event_seq();
  const hx = M._m3_hint_ax();
  if (hx >= 0) { M._m3_try_swap(hx, M._m3_hint_ay(), M._m3_hint_bx(), M._m3_hint_by()); }

  check(M._m3_event_seq() > seqBefore, 'nước đi làm tăng số thứ tự nhịp');
  const eventCount = M._m3_event_count();
  check(eventCount > 0, `nước đi sinh ra nhịp để diễn hoạ (${eventCount} nhịp)`);

  let sawMatchClear = false;
  for (let i = 0; i < eventCount; i++) {
    if (M._m3_event_kind(i) === 0) { sawMatchClear = true; }
  }
  check(sawMatchClear, 'dòng nhịp có sự kiện "nối block"');
}

// Lượt của địch cũng phải sinh nhịp (địch ra chiêu + đội ăn đòn) - luôn xảy ra khi hết turn.
{
  const seqBeforeTurn = M._m3_event_seq();
  M._m3_end_turn();
  check(M._m3_event_seq() > seqBeforeTurn, 'kết thúc turn làm tăng số thứ tự nhịp');

  const count = M._m3_event_count();
  let sawEnemyAction = false;
  let sawPartyHit = false;
  let sawValidKind = true;
  for (let i = 0; i < count; i++) {
    const kind = M._m3_event_kind(i);
    if (kind < 0 || kind > 17) { sawValidKind = false; }
    if (kind === 6) { sawEnemyAction = true; }
    if (kind === 3) { sawPartyHit = true; }
  }
  check(sawValidKind, 'mã loại nhịp nằm trong khoảng hợp lệ');
  check(sawEnemyAction, 'lượt địch có nhịp "địch ra chiêu"');
  check(sawPartyHit, 'lượt địch có nhịp "nhân vật ăn đòn"');
}


// Mọi ô phải có màu hợp lệ (0..6) hoặc là ô trống (-1 kind)
let colorOk = true;
for (let y = 0; y < M._m3_height(); y++) {
  for (let x = 0; x < M._m3_width(); x++) {
    const c = M._m3_cell_color(x, y);
    if (c < 0 || c > 6) { colorOk = false; }
  }
}
check(colorOk, 'màu block luôn nằm trong 0..6');

// ---------------------------------------------------------------------------
// 2. Nước đi sai bị từ chối
// ---------------------------------------------------------------------------
const before = M._m3_turn();
const wrongSwap = M._m3_try_swap(0, 0, 1, 1);   // 2 ô chéo nhau -> không hợp lệ
check(wrongSwap === 0, 'đổi chỗ 2 ô chéo bị từ chối');
check(M._m3_turn() === before, 'turn không đổi sau nước đi sai');

// ---------------------------------------------------------------------------
// 3. Nước đi đúng (dùng ô gợi ý do lõi tính)
// ---------------------------------------------------------------------------
const ax = M._m3_hint_ax(), ay = M._m3_hint_ay();
const bx = M._m3_hint_bx(), by = M._m3_hint_by();
check(ax >= 0 && bx >= 0, 'lõi tìm được nước đi hợp lệ');

const movesBefore = M._m3_moves_left();
const okSwap = M._m3_try_swap(ax, ay, bx, by);
check(okSwap === 1, 'nước đi hợp lệ được chấp nhận');
check(M._m3_moves_left() === movesBefore - 1, 'số lượt nối giảm 1');
check(M._m3_total_blocks() >= 3, 'nước đi xoá được ít nhất 3 block');
check(M._m3_last_cascade_count() >= 1, 'm3_last_cascade_count trả về >= 1');
check(M.UTF8ToString(M._m3_last_message()).length > 0, 'nhật ký có nội dung');


// ---------------------------------------------------------------------------
// 4. Kỹ năng / ultimate / Buff & Kích hoạt cell
// ---------------------------------------------------------------------------
const skillOk = M._m3_use_skill(1);         // Supporter: gỡ vật cản
check(skillOk === 1, 'dùng được kỹ năng của Supporter');
check(M._m3_use_skill(1) === 0, 'kỹ năng đang hồi chiêu thì bị từ chối');
check(M._m3_use_ultimate(0) === 0, 'ultimate chưa đầy thì bị từ chối');

check(typeof M._m3_activate_cell === 'function', 'có hàm m3_activate_cell');
check(typeof M._m3_effect_count === 'function', 'có hàm m3_effect_count');
const actNormal = M._m3_activate_cell(0, 0);
check(actNormal === 0, 'kích hoạt ô thường thất bại an toàn');
check(M._m3_effect_count() >= 0, 'đọc được số lượng hiệu ứng buff/debuff');

// ---------------------------------------------------------------------------
// 5. Chuỗi tiếng Việt qua WASM
// ---------------------------------------------------------------------------
const bossName = M.UTF8ToString(M._m3_boss_name());
const memberName = M.UTF8ToString(M._m3_member_name(0));
const challenge = M.UTF8ToString(M._m3_challenge_text(0));
check(bossName.length > 0 && memberName.length > 0, 'đọc được tên boss và tên nhân vật');
check(/[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(bossName + memberName + challenge),
  'chuỗi tiếng Việt giữ đúng dấu (UTF-8 qua biên giới WASM)');

// ---------------------------------------------------------------------------
// 6. Chơi tới khi kết thúc trận (không treo, không kẹt)
// ---------------------------------------------------------------------------
let actions = 0;
while (M._m3_finished() === 0 && actions < 600) {
  const hx = M._m3_hint_ax();
  if (hx >= 0) {
    M._m3_try_swap(hx, M._m3_hint_ay(), M._m3_hint_bx(), M._m3_hint_by());
  } else {
    M._m3_end_turn();
  }

  // Dùng kỹ năng / ultimate khi có thể (mô phỏng người chơi thật)
  for (let i = 0; i < M._m3_member_count(); i++) {
    if (M._m3_member_alive(i) === 0) { continue; }
    if (M._m3_member_ultimate_pct(i) >= 100) { M._m3_use_ultimate(i); }
    else if (M._m3_member_cooldown(i) === 0) { M._m3_use_skill(i); }
  }
  actions++;
}

check(actions > 0, 'chơi được nhiều nước');
check(M._m3_turn() > 3, `trận kéo dài hơn 3 turn (thực tế ${M._m3_turn()})`);
check(M._m3_finished() === 1 || M._m3_hint_ax() >= 0, 'trận kết thúc hoặc bàn vẫn còn nước đi');
check(M._m3_damage_dealt() > 0, 'có gây sát thương lên boss');

const stars = M._m3_stars();
check(stars >= 0 && stars <= 3, 'số sao nằm trong 0..3');

// ---------------------------------------------------------------------------
// Báo cáo
// ---------------------------------------------------------------------------
console.log('===== KIỂM TRA BẢN WEB (WebAssembly + Node) =====');
console.log(`Boss: ${bossName} | nhân vật đầu: ${memberName}`);
console.log(`Sau ${actions} hành động: turn ${M._m3_turn()}, sát thương đã gây ${M._m3_damage_dealt().toFixed(0)}, ` +
  `kết quả ${M._m3_victory() ? 'thắng' : (M._m3_defeat() ? 'thua' : 'chưa xong')}, sao ${stars}`);
console.log('------------------------------------------------');
console.log(`${passed} PASS / ${failures.length} FAIL`);
if (failures.length) {
  for (const f of failures) { console.log('  - ' + f); }
  process.exit(1);
}
