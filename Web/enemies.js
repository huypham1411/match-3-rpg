/* ============================================================================
   enemies.js - BỘ ĐỊCH CỦA BẢN WEB (tách riêng khỏi lõi, tương đương Data Asset)
   ----------------------------------------------------------------------------
   Đây là chỗ bạn thêm/sửa quái và boss MÀ KHÔNG PHẢI động vào code lõi C++ hay
   biên dịch lại WebAssembly. Mọi thứ ở đây chỉ là dữ liệu.
   (Bên Unreal bản tương đương là Data Asset "UM3EnemySet" - cùng bộ trường.)

   Cách UI dùng file này: đọc ENEMY_SET + STAGE_LINEUPS, rồi gọi
     m3_custom_stage_begin(...) -> m3_custom_stage_add_enemy(...) -> m3_custom_stage_start()

   Trường của một địch:
     id        : mã duy nhất (dùng để gọi trong STAGE_LINEUPS)
     name      : tên hiển thị
     tier      : 0 = quái thường, 1 = tinh anh, 2 = trùm giữa màn, 3 = trùm cuối màn
     sprite    : khoá hình trong pixelart.js ("<nhóm>.<biến thể>", vd "minion.2")
     hp, atk   : máu / sát thương gốc (lõi còn nhân thêm hệ số theo cấp bậc)
     stagger   : máu thanh stagger (0 = không có thanh này, chỉ nên đặt cho trùm)
     physResist: % kháng sát thương vật lý (0-90)
     magResist : % kháng sát thương ma pháp (0-90)
     pattern   : chu kì hành động, xoay vòng theo thứ tự.
                 Mã hành động: 0 AoE · 1 đòn đơn thể · 2 tạo vật cản · 3 suy yếu đội
                 4 gài bẫy · 5 vận công tăng sát thương · 6 nạp tuyệt kĩ · 7 phong ấn ô
                 8 đảo màu block · 9 hút ultimate · 10 triệu hồi quái
   ============================================================================ */

export const TIER_NAMES = ['Quái thường', 'Quái tinh anh', 'Trùm giữa màn', 'Trùm cuối màn'];
export const TIER_KEYS = ['normal', 'elite', 'midboss', 'boss'];

// ---------------------------------------------------------------------------
// HÀNH ĐỘNG (chỉ để hiển thị trong bảng tra cứu của UI)
// ---------------------------------------------------------------------------
export const ACTION_NAMES = [
  'Sát thương diện rộng', 'Đòn đơn thể', 'Tạo vật cản', 'Suy yếu đội', 'Gài bẫy đếm ngược',
  'Vận công tăng sát thương', 'Nạp tuyệt kĩ', 'Phong ấn ô', 'Đảo màu block', 'Hút ultimate', 'Triệu hồi quái',
];

// ---------------------------------------------------------------------------
// BỘ ĐỊCH
// ---------------------------------------------------------------------------
export const ENEMY_SET = [
  // ------------------------------ QUÁI THƯỜNG ------------------------------
  { id: 'minion.goblin',  name: 'Yêu Tinh Tro',   tier: 0, sprite: 'minion.1',  hp: 700,  atk: 70,  stagger: 0,
    physResist: 0, magResist: 0, pattern: '0,1,4' },
  { id: 'minion.wolf',    name: 'Sói Bóng Đêm',   tier: 0, sprite: 'minion.2',  hp: 560,  atk: 95,  stagger: 0,
    physResist: 0, magResist: 0, pattern: '1,1,0' },
  { id: 'minion.imp',     name: 'Tiểu Quỷ Tím',   tier: 0, sprite: 'minion.3',  hp: 640,  atk: 85,  stagger: 0,
    physResist: 0, magResist: 10, pattern: '1,0,8' },

  // ------------------------------ QUÁI TINH ANH ------------------------------
  { id: 'elite.warlock',  name: 'Tà Pháp Sư',     tier: 1, sprite: 'elite.1',   hp: 2100, atk: 130, stagger: 0,
    physResist: 0, magResist: 15, pattern: '7,4,0' },
  { id: 'elite.golem',    name: 'Thạch Nhân Vệ',   tier: 1, sprite: 'elite.2',   hp: 2900, atk: 110, stagger: 0,
    physResist: 20, magResist: 0, pattern: '2,1,5' },
  { id: 'elite.wraith',   name: 'Oan Linh',       tier: 1, sprite: 'elite.3',   hp: 1800, atk: 150, stagger: 0,
    physResist: 0, magResist: 20, pattern: '9,8,0' },

  // ------------------------------ TRÙM GIỮA MÀN ------------------------------
  { id: 'midboss.warden', name: 'Ngục Chủ Nham Thạch', tier: 2, sprite: 'midboss.1', hp: 7000, atk: 210,
    stagger: 1200, physResist: 10, magResist: 0, pattern: '2,7,0,5,10' },
  { id: 'midboss.seer',   name: 'Tiên Tri Hư Không',   tier: 2, sprite: 'midboss.2', hp: 6000, atk: 190,
    stagger: 1000, physResist: 0, magResist: 25, pattern: '8,9,6,3' },
  { id: 'midboss.titan',  name: 'Cự Thạch Cổ Đại',     tier: 2, sprite: 'midboss.3', hp: 8200, atk: 180,
    stagger: 1400, physResist: 30, magResist: 0, pattern: '5,1,2,0' },

  // ------------------------------ TRÙM CUỐI MÀN ------------------------------
  { id: 'boss.chimera',   name: 'Chimera Lửa',      tier: 3, sprite: 'boss.1', hp: 4500, atk: 140, stagger: 900,
    physResist: 0, magResist: 0, pattern: '0,1,2,3,4,5' },
  { id: 'boss.goldlord',  name: 'Hoàng Kim Thú',    tier: 3, sprite: 'boss.2', hp: 9000, atk: 200, stagger: 1600,
    physResist: 35, magResist: 0, pattern: '5,5,1,2,10' },
  { id: 'boss.voidlord',  name: 'Ma Vương Hư Không', tier: 3, sprite: 'boss.3', hp: 16000, atk: 300, stagger: 2500,
    physResist: 50, magResist: 0, pattern: '0,6,8,7,9,10,1' },
];

// Tra nhanh một địch theo id.
export function findEnemy(id) {
  return ENEMY_SET.find((e) => e.id === id) || null;
}

// Nhóm địch theo cấp bậc (UI bày bảng tra cứu).
export function enemiesByTier(tier) {
  return ENEMY_SET.filter((e) => e.tier === tier);
}

// ---------------------------------------------------------------------------
// CÁC MÀN DỰNG TỪ BỘ ĐỊCH TRÊN
// ---------------------------------------------------------------------------
export const STAGE_LINEUPS = [
  {
    id: 'stage.forest',
    title: 'Thử nghiệm: Bìa Rừng',
    movesPerTurn: 4,
    obstacles: 2,
    enemies: ['minion.goblin', 'boss.chimera', 'minion.imp'],
  },
  {
    id: 'stage.ruins',
    title: 'Thử nghiệm: Tàn Tích',
    movesPerTurn: 4,
    obstacles: 3,
    enemies: ['minion.wolf', 'elite.golem', 'boss.chimera', 'minion.goblin'],
  },
  {
    id: 'stage.warden',
    title: 'Thử nghiệm: Ngục Chủ',
    movesPerTurn: 3,
    obstacles: 4,
    enemies: ['minion.goblin', 'elite.warlock', 'midboss.warden', 'minion.imp'],
  },
  {
    id: 'stage.voidgate',
    title: 'Thử nghiệm: Cổng Hư Không',
    movesPerTurn: 4,
    obstacles: 4,
    enemies: ['minion.imp', 'elite.wraith', 'midboss.seer', 'boss.voidlord', 'minion.wolf'],
  },
];

// Kiểm tra dữ liệu có hợp lệ không (UI gọi khi nạp để báo lỗi sớm).
export function validateEnemySet() {
  const problems = [];
  const ids = new Set();

  for (const e of ENEMY_SET) {
    if (!e.id) { problems.push('Có địch thiếu id.'); continue; }
    if (ids.has(e.id)) { problems.push(`Trùng id: ${e.id}`); }
    ids.add(e.id);
    if (e.tier < 0 || e.tier > 3) { problems.push(`${e.id}: tier phải trong 0..3.`); }
    if (!(e.hp > 0)) { problems.push(`${e.id}: hp phải > 0.`); }
    if (!(e.atk > 0)) { problems.push(`${e.id}: atk phải > 0.`); }
    if (e.physResist > 90 || e.magResist > 90) { problems.push(`${e.id}: kháng không nên vượt 90%.`); }
    if (e.tier < 2 && e.stagger > 0) { problems.push(`${e.id}: quái thường/tinh anh không nên có stagger.`); }
  }

  for (const s of STAGE_LINEUPS) {
    if (!s.enemies || s.enemies.length === 0) { problems.push(`${s.id}: màn không có địch nào.`); }
    for (const id of (s.enemies || [])) {
      if (!ids.has(id)) { problems.push(`${s.id}: tham chiếu địch không tồn tại "${id}".`); }
    }
  }
  return problems;
}
