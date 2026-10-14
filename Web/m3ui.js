/* ============================================================================
   m3ui.js - Logic bản chơi web (bố cục chia đôi màn + pixel art)
   ----------------------------------------------------------------------------
   Toàn bộ LUẬT CHƠI nằm trong dist/m3core.mjs/.wasm (biên dịch từ Source/Match3Core).
   File này chỉ:
     1) nạp module WebAssembly,
     2) đọc trạng thái qua các hàm m3_* và vẽ ra DOM,
     3) gửi hành động của người chơi (đổi chỗ, kỹ năng, ultimate, chọn mục tiêu).
   Nhân vật / quái / boss được vẽ bằng pixel art từ Web/pixelart.js.
   ============================================================================ */

import createModule from './dist/m3core.mjs';
import { spriteKeyForTier, drawSprite, ANIM_FRAMES } from './pixelart.js';
import { ENEMY_SET, STAGE_LINEUPS, TIER_NAMES, validateEnemySet } from './enemies.js';

// Truyền chuỗi từ JS vào lõi C++: cấp phát trong bộ nhớ WASM rồi giải phóng sau khi gọi.
function withCString(text, fn) {
  const ptr = M.allocateUTF8(String(text || ''));
  try { return fn(ptr); } finally { M._free(ptr); }
}

// ---------------------------------------------------------------------------
// ENGINE DIỄN HOẠ (kiểu FF/GBF): sprite "thở" liên tục + phát lại từng nhịp
// ---------------------------------------------------------------------------
// Lõi không vẽ gì; nó phát ra DÒNG NHỊP (m3_event_*). Ở đây ta diễn hoạ lần lượt:
// đứng thở -> chồm tới đánh -> địch nháy trắng + hiện số sát thương -> ...
// Mọi hình đều là canvas 16x16 vẽ lại theo "tư thế", nên khi bạn đăng ký sprite
// sheet thật (registerSpriteSheet trong pixelart.js) là có animation xịn hơn.
const POSES = ANIM_FRAMES;
const spriteState = new Map();   // canvas -> { key, accent, pose, until, frame, flash }
let idlePhase = 0;
let playing = false;             // đang diễn hoạ -> tạm khoá input

function mountSprite(hostEl, key, accentKey, scale) {
  const k = String(key || 'minion');
  if (hostEl.dataset.sprite === k && hostEl.firstChild) { return hostEl.firstChild; }

  hostEl.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-sprite';
  canvas.style.width = (16 * scale) + 'px';
  canvas.style.height = (16 * scale) + 'px';
  spriteState.set(canvas, { key: k, accent: accentKey, pose: null, until: 0, frame: 0, flash: 0 });
  drawSprite(canvas, k, accentKey, {});
  hostEl.appendChild(canvas);
  hostEl.dataset.sprite = k;
  return canvas;
}

function poseSprite(canvas, poseName, durationMs, flash) {
  const st = canvas && spriteState.get(canvas);
  if (!st) { return; }
  st.pose = poseName;
  st.until = performance.now() + durationMs;
  st.frame = 0;
  st.flash = flash || 0;
}

function findSprite(hostEl) {
  return hostEl ? hostEl.querySelector('canvas.pixel-sprite') : null;
}

// Nhịp thở: cứ ~420ms đổi khung đứng yên cho toàn bộ sprite đang hiển thị.
setInterval(() => {
  idlePhase = (idlePhase + 1) % POSES.idle.length;
  const now = performance.now();
  spriteState.forEach((st, canvas) => {
    let offsetY = POSES.idle[idlePhase];
    let flash = 0;
    if (st.pose && st.until > now) {
      const frames = POSES[st.pose] || [0];
      st.frame = (st.frame + 1) % frames.length;
      offsetY = frames[st.frame];
      flash = st.flash;
    }
    drawSprite(canvas, st.key, st.accent, { offsetY, flash });
  });
}, 420);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function floatText(hostEl, text, cls) {
  if (!hostEl) { return; }
  const el = document.createElement('div');
  el.className = 'float-num ' + (cls || '');
  el.textContent = text;
  hostEl.appendChild(el);
  setTimeout(() => { if (el.parentNode) { el.remove(); } }, 1000);
}

function screenShake(power) {
  const root = document.querySelector('.split');
  if (!root) { return; }
  root.classList.remove('shake-1', 'shake-2');
  void root.offsetWidth;
  root.classList.add(power >= 2 ? 'shake-2' : 'shake-1');
  setTimeout(() => root.classList.remove('shake-1', 'shake-2'), 420);
}

function bigCallout(text, cls) {
  const host = document.querySelector('.board-wrap');
  if (!host) { return; }
  const el = document.createElement('div');
  el.className = 'callout ' + (cls || '');
  el.textContent = text;
  host.appendChild(el);
  setTimeout(() => { if (el.parentNode) { el.remove(); } }, 1100);
}

function memberCard(index) { return teamEl.children[index] || null; }
function enemyCard(index) { return enemyLineEl.children[index] || null; }

// ---------------------------------------------------------------------------
// Hiệu ứng chiến đấu: đòn đánh thường / kỹ năng / ultimate
//   - fx-layer là lớp phủ toàn màn hình, không chặn chuột (pointer-events: none)
//   - mọi phần tử đều tự xoá sau khi diễn xong nên không rò rỉ DOM
// ---------------------------------------------------------------------------
function fxLayer() {
  let layer = document.getElementById('fx-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'fx-layer';
    layer.className = 'fx-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

// Đếm số hiệu ứng đã phát (dùng cho chế độ tự kiểm tra ?selftest=1).
const fxCounters = { projectile: 0, spark: 0, ring: 0, cutin: 0 };

// Đường bay (vệt chém hoặc tia phép) từ ô này tới ô kia.
function spawnProjectile(fromEl, toEl, cls, durationMs) {
  if (!fromEl || !toEl) { return; }
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const x0 = a.left + a.width / 2;
  const y0 = a.top + a.height / 2;
  const dx = (b.left + b.width / 2) - x0;
  const dy = (b.top + b.height / 2) - y0;
  const len = Math.max(28, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  const shot = document.createElement('div');
  shot.className = 'fx-projectile ' + (cls || 'slash');
  shot.style.left = x0 + 'px';
  shot.style.top = y0 + 'px';
  shot.style.width = len + 'px';
  shot.style.transform = `rotate(${angle}deg)`;
  shot.style.setProperty('--fx-dur', durationMs + 'ms');
  fxLayer().appendChild(shot);
  fxCounters.projectile++;
  setTimeout(() => shot.remove(), durationMs + 90);
}

// Vòng sáng dưới chân người vừa niệm chiêu.
function castRing(card, ms) {
  if (!card) { return; }
  const r = card.getBoundingClientRect();
  const ring = document.createElement('div');
  ring.className = 'fx-ring';
  ring.style.left = (r.left + r.width / 2) + 'px';
  ring.style.top = (r.top + r.height * 0.72) + 'px';
  fxLayer().appendChild(ring);
  fxCounters.ring++;
  setTimeout(() => ring.remove(), (ms || 520) + 90);
}

// Tia lửa + nhịp sáng khi đòn đánh trúng đích.
function impactSpark(targetEl, kind) {
  if (!targetEl) { return; }
  const r = targetEl.getBoundingClientRect();
  const spark = document.createElement('div');
  spark.className = 'fx-spark ' + (kind || 'hit');
  spark.style.left = (r.left + r.width / 2) + 'px';
  spark.style.top = (r.top + r.height * 0.35) + 'px';
  fxLayer().appendChild(spark);
  fxCounters.spark++;
  setTimeout(() => spark.remove(), 500);
}

// Cắt cảnh ultimate: dải ngang màn hình + tên nhân vật + tên tuyệt kĩ.
function cutIn(title, who, ms) {
  const box = document.createElement('div');
  box.className = 'fx-cutin';
  const whoLine = who ? `<span class="fx-cutin-who">${who}</span>` : '';
  box.innerHTML = `${whoLine}<span class="fx-cutin-title">${title}</span>`;
  fxLayer().appendChild(box);
  fxCounters.cutin++;
  requestAnimationFrame(() => box.classList.add('show'));
  setTimeout(() => {
    box.classList.remove('show');
    setTimeout(() => box.remove(), 280);
  }, ms || 900);
}

// Các mã loại nhịp (khớp EBattleEventKind trong lõi).
const EV = {
  MatchClear: 0, PartyAttack: 1, EnemyDamaged: 2, PartyDamaged: 3, Heal: 4, Buff: 5,
  EnemyAction: 6, EnemyBreak: 7, EnemyDefeated: 8, EnemySummoned: 9, Obstacle: 10,
  LockCells: 11, Scramble: 12, Drain: 13, Skill: 14, Ultimate: 15, Victory: 16, Defeat: 17,
};

// Diễn hoạ MỘT nhịp; trả về thời gian chờ trước nhịp kế tiếp.
async function playEvent(e) {
  switch (e.kind) {
    case EV.MatchClear: {
      if (e.value >= 2) { bigCallout(`COMBO x${e.value}`, 'combo'); }
      if (e.big) { screenShake(1); }
      return 150;
    }

    case EV.PartyAttack: {
      // Đòn đánh thường: nhân vật lao lên, vệt chém bay sang địch, tia lửa tại đích.
      const card = memberCard(e.member);
      const target = e.enemy >= 0 ? enemyCard(e.enemy) : null;
      if (card) {
        card.classList.add('lunge-right');
        poseSprite(findSprite(card.querySelector('.member-art')), 'attack', 320, 0.25);
        setTimeout(() => card.classList.remove('lunge-right'), 320);
      }
      if (target) {
        spawnProjectile(card, target, 'slash', 300);
        setTimeout(() => impactSpark(target, 'hit'), 300);
      }
      return 250;
    }

    case EV.Skill: {
      // Kỹ năng: vòng sáng dưới chân + tên chiêu + luồng năng lượng bay tới địch.
      const card = memberCard(e.member);
      if (card) {
        card.classList.add('cast-glow');
        poseSprite(findSprite(card.querySelector('.member-art')), 'cast', 520, 0.45);
        castRing(card, 520);
        setTimeout(() => card.classList.remove('cast-glow'), 520);
      }
      if (e.text) { bigCallout(e.text.toUpperCase(), 'skill'); }
      const target = e.enemy >= 0 ? enemyCard(e.enemy) : null;
      if (target) {
        spawnProjectile(card, target, 'bolt', 340);
        setTimeout(() => impactSpark(target, 'magic'), 340);
      }
      return 430;
    }

    case EV.Ultimate: {
      // Ultimate: cắt cảnh + tên tuyệt kĩ, rồi 3 nhát liên tiếp lên địch.
      const card = memberCard(e.member);
      const target = e.enemy >= 0 ? enemyCard(e.enemy) : null;
      const who = (M._m3_member_name && e.member >= 0) ? M.UTF8ToString(M._m3_member_name(e.member)) : '';

      if (card) {
        card.classList.add('cast-glow');
        poseSprite(findSprite(card.querySelector('.member-art')), 'cast', 900, 0.6);
        castRing(card, 760);
        setTimeout(() => card.classList.remove('cast-glow'), 900);
      }

      cutIn(e.text || 'ULTIMATE', who, 900);
      bigCallout(e.value > 1 ? `FULL BURST x${e.value}` : 'ULTIMATE', 'ultimate');
      screenShake(e.value > 1 ? 2 : 1);

      if (target) {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            spawnProjectile(card, target, 'bolt', 220);
            impactSpark(target, 'magic');
          }, 260 + i * 150);
        }
      }
      return 920;
    }

    case EV.EnemyDamaged: {
      const card = enemyCard(e.enemy);
      if (card) {
        card.classList.add('hit');
        poseSprite(findSprite(card.querySelector('.enemy-art')), 'hurt', 260, 0.75);
        floatText(card, '-' + Math.round(e.amount), e.big ? 'dmg big' : 'dmg');
        setTimeout(() => card.classList.remove('hit'), 260);
      }
      if (e.big) { screenShake(1); }
      return 170;
    }

    case EV.PartyDamaged: {
      const card = memberCard(e.member);
      if (card) {
        card.classList.add('hit');
        poseSprite(findSprite(card.querySelector('.member-art')), 'hurt', 260, 0.7);
        floatText(card, '-' + Math.round(e.amount), e.big ? 'dmg big' : 'dmg');
        setTimeout(() => card.classList.remove('hit'), 260);
      }
      screenShake(e.big ? 2 : 1);
      return 190;
    }

    case EV.Heal: {
      const card = memberCard(e.member);
      if (card) {
        card.classList.add('heal-glow');
        floatText(card, '+' + Math.round(e.amount), 'heal');
        setTimeout(() => card.classList.remove('heal-glow'), 420);
      }
      return 140;
    }

    case EV.EnemyAction: {
      const card = enemyCard(e.enemy);
      if (card) {
        card.classList.add('lunge-left');
        poseSprite(findSprite(card.querySelector('.enemy-art')), 'attack', 300);
        setTimeout(() => card.classList.remove('lunge-left'), 300);
      }
      if (e.big) { screenShake(1); }
      return 220;
    }

    case EV.EnemyBreak: {
      const card = enemyCard(e.enemy);
      if (card) { card.classList.add('break-burst'); setTimeout(() => card.classList.remove('break-burst'), 700); }
      bigCallout('BREAK!', 'break');
      screenShake(2);
      return 380;
    }

    case EV.EnemyDefeated: {
      const card = enemyCard(e.enemy);
      if (card) { card.classList.add('defeated'); floatText(card, 'HẠ GỤC', 'ko'); }
      return 320;
    }

    case EV.EnemySummoned: {
      const card = enemyCard(e.enemy);
      if (card) { card.classList.add('summon-in'); setTimeout(() => card.classList.remove('summon-in'), 500); }
      bigCallout('TRIỆU HỒI!', 'summon');
      return 320;
    }

    case EV.Obstacle:
    case EV.LockCells:
    case EV.Scramble:
    case EV.Drain: {
      document.querySelectorAll('.cell').forEach((c) => {
        c.classList.remove('board-flash');
        void c.offsetWidth;
        c.classList.add('board-flash');
      });
      setTimeout(() => document.querySelectorAll('.cell.board-flash').forEach((c) => c.classList.remove('board-flash')), 340);
      if (e.text) { bigCallout(e.text.toUpperCase(), 'enemy'); }
      return 230;
    }

    default:
      return 110;
  }
}

// Phát lại toàn bộ dòng nhịp của hành động vừa rồi, lần lượt như một cảnh chiến đấu.
async function playEventTimeline() {
  const count = M._m3_event_count ? M._m3_event_count() : 0;
  if (count <= 0) { return; }

  const events = [];
  for (let i = 0; i < count; i++) {
    events.push({
      kind: M._m3_event_kind(i),
      member: M._m3_event_member(i),
      enemy: M._m3_event_enemy(i),
      amount: M._m3_event_amount(i),
      value: M._m3_event_value(i),
      big: M._m3_event_big(i) === 1,
      text: M.UTF8ToString(M._m3_event_text(i)),
    });
  }

  playing = true;
  document.body.classList.add('playing');
  for (const e of events) {
    const wait = await playEvent(e);
    render();
    await sleep(wait);
  }
  playing = false;
  document.body.classList.remove('playing');
  render();
}

// ---------------------------------------------------------------------------
// Trạng thái phía giao diện
// ---------------------------------------------------------------------------
let M = null;                 // module WebAssembly
let width = 8, height = 8;
let selected = null;          // {x, y} ô đang chọn
let prevCells = [];           // để biết ô nào vừa đổi -> chạy hiệu ứng
let lastMessage = '';
let bannerDismissed = false;  // người chơi đã tự đóng bảng kết quả
let targetingSkillMember = null; // nhân vật đang bật kỹ năng chỉ định ô
let lastTurnShown = 0;        // để hiện bảng "TURN n" đúng lúc sang lượt mới
let activeLineup = null;      // đang chơi màn dựng từ Web/enemies.js thì lưu chỉ số màn

const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const teamEl = $('team');
const enemyLineEl = $('enemyLine');
const challengesEl = $('challenges');
const logEl = $('log');

// Tên lớp CSS theo màu block (1..6 = Đỏ, Xanh dương, Xanh lá, Vàng, Tím, Cyan)
const COLOR_CLASS = ['', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

// Loại block: 0 thường, 1 vật cản, 2 nổ hàng/cột, 3 nổ vuông, 4 cầu vồng, 5 bẫy, 6 bom diện rộng
const KIND_OBSTACLE = 1, KIND_LINE = 2, KIND_SQUARE = 3, KIND_RAINBOW = 4, KIND_TRAP = 5, KIND_AREA_BOMB = 6;

// Cấp bậc địch (khớp EEnemyTier trong lõi)
const TIER_NORMAL = 0, TIER_ELITE = 1, TIER_MIDBOSS = 2, TIER_BOSS = 3;
const TIER_LABEL = ['Thường', 'Tinh anh', 'Trùm giữa màn', 'TRÙM'];
const TIER_CLASS = ['tier-normal', 'tier-elite', 'tier-midboss', 'tier-boss'];

// Tên hành động địch -> biểu tượng cảnh báo hiển thị trước khi nó ra tay
const ACTION_ICON = {
  0: '💥', 1: '🗡️', 2: '▨', 3: '🌀', 4: '☠️', 5: '🔥', 6: '⚡',
  7: '🔒', 8: '🎨', 9: '🕳️', 10: '👥',
};

// ---------------------------------------------------------------------------
// Nạp WebAssembly rồi khởi động
// ---------------------------------------------------------------------------
async function boot() {
  try {
    M = await createModule();
  } catch (err) {
    $('engineText').textContent = 'Không nạp được WebAssembly: ' + err;
    return;
  }

  width = M._m3_width();
  height = M._m3_height();

  buildBoardDom();
  buildStageSelect();
  bindControls();
  buildEnemySetPanel();

  M._m3_init(0, 20261008);
  render();

  $('engineText').textContent = 'WebAssembly: đã nạp lõi luật chơi (' + width + 'x' + height + ')';
  toast('Click 2 ô kề nhau để đổi chỗ. Click thẻ địch để đổi mục tiêu. Phím 1..6 = kỹ năng, NumPad 1..6 = ultimate.', false);

  // Chế độ tự kiểm tra (dành cho lập trình viên): mở index.html?selftest=1
  if (location.search.includes('selftest')) { runSelfTest(); }
}

// ---------------------------------------------------------------------------
// Dựng DOM
// ---------------------------------------------------------------------------
function buildBoardDom() {
  boardEl.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
  boardEl.innerHTML = '';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.setAttribute('role', 'gridcell');
      cell.addEventListener('click', () => onCellClick(x, y));
      cell.addEventListener('dblclick', () => onCellDoubleClick(x, y));
      boardEl.appendChild(cell);
    }
  }
  prevCells = new Array(width * height).fill(null);
}

function buildStageSelect() {
  const select = $('stageSelect');
  select.innerHTML = '';
  const count = M._m3_stage_count();
  for (let i = 0; i < count; i++) {
    const option = document.createElement('option');
    option.value = String(i);
    const title = M._m3_stage_title ? M.UTF8ToString(M._m3_stage_title(i)) : M.UTF8ToString(M._m3_stage_name(i));
    const enemyCount = M._m3_stage_enemy_count ? M._m3_stage_enemy_count(i) : 1;
    option.textContent = `${title} (${enemyCount} địch)`;
    select.appendChild(option);
  }
  select.addEventListener('change', () => startStage(Number(select.value)));
}

function bindControls() {
  $('btnEndTurn').addEventListener('click', () => act(() => M._m3_end_turn()));
  $('btnRestart').addEventListener('click', () => restartCurrent());
  $('btnHint').addEventListener('click', () => toggleHint());
  $('btnPlayAgain').addEventListener('click', () => { hideBanner(); startStage(currentStage()); });
  $('btnNextMap').addEventListener('click', () => {
    hideBanner();
    startStage((currentStage() + 1) % Math.max(1, M._m3_stage_count()));
  });
  $('btnCloseBanner').addEventListener('click', (event) => { event.stopPropagation(); dismissBanner(); });
  $('banner').addEventListener('click', (event) => {
    if (event.target === $('banner')) { dismissBanner(); }
  });

  window.addEventListener('keydown', (event) => {
    const key = event.key;

    if (key === 'Escape') {
      if ($('banner').hidden === false) { dismissBanner(); return; }
      if (targetingSkillMember !== null) { targetingSkillMember = null; toast('Đã hủy chọn kỹ năng chỉ định.', false); render(); return; }
      selected = null;
      render();
      return;
    }

    // Phím số 1..6 = kỹ năng; NumPad 1..6 = ultimate
    if (/^[1-6]$/.test(key)) { act(() => M._m3_use_skill(Number(key) - 1)); return; }
    if (event.code && /^Numpad[1-6]$/.test(event.code)) { act(() => M._m3_use_ultimate(Number(event.code.slice(-1)) - 1)); return; }

    // Tab để đổi mục tiêu giữa các địch còn sống
    if (key === 'Tab') { event.preventDefault(); cycleTarget(); return; }
    if (key === 'Enter' || key === ' ') { event.preventDefault(); act(() => M._m3_end_turn()); return; }
    if (key === 'r' || key === 'R') { restartCurrent(); return; }
    if (key === 'h' || key === 'H') { toggleHint(); return; }
  });
}

// Đổi mục tiêu sang địch còn sống kế tiếp.
function cycleTarget() {
  if (M._m3_finished()) { return; }
  const count = M._m3_enemy_count();
  if (count <= 0) { return; }
  const current = M._m3_target_enemy();
  for (let step = 1; step <= count; step++) {
    const idx = (current + step) % count;
    if (M._m3_enemy_alive(idx) === 1) {
      M._m3_set_target_enemy(idx);
      toast('Mục tiêu: ' + M.UTF8ToString(M._m3_enemy_name(idx)), false);
      render();
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Hành động trên bàn nối
// ---------------------------------------------------------------------------
function onCellClick(x, y) {
  if (playing) { return; }               // đang diễn hoạ -> chờ xem hết cảnh đã
  if (M._m3_finished()) { return; }

  // Đang bật chế độ kỹ năng chỉ định ô (gỡ vật cản/bẫy cụ thể)
  if (targetingSkillMember !== null) {
    const memberIdx = targetingSkillMember;
    targetingSkillMember = null;
    const ok = M._m3_use_skill_target(memberIdx, x, y);
    if (!ok) { toast('Ô này không gỡ được - chọn ô Vật cản ▨ hoặc Bẫy ☠️.', false); }
    render();
    return;
  }

  if (selected === null) {
    selected = { x, y };
    render();
    return;
  }

  if (selected.x === x && selected.y === y) {
    selected = null;
    render();
    return;
  }

  const before = M._m3_event_seq ? M._m3_event_seq() : -1;
  const ok = M._m3_try_swap(selected.x, selected.y, x, y);
  selected = null;
  if (!ok) {
    const err = M._m3_last_error ? M.UTF8ToString(M._m3_last_error()) : '';
    toast(err || 'Nước đi không tạo được đường nối nào - thử chỗ khác.', false);
  } else {
    render();
    if (M._m3_event_seq && M._m3_event_seq() > before) { playEventTimeline(); return; }
  }
  render();
}

function onCellDoubleClick(x, y) {
  if (playing) { return; }
  if (M._m3_finished()) { return; }
  const kind = M._m3_cell_kind(x, y);
  if (kind === KIND_LINE || kind === KIND_SQUARE || kind === KIND_RAINBOW || kind === KIND_AREA_BOMB) {
    selected = null;
    const before = M._m3_event_seq ? M._m3_event_seq() : -1;
    const ok = M._m3_activate_cell ? M._m3_activate_cell(x, y) : 0;
    if (ok) {
      render();
      if (M._m3_event_seq && M._m3_event_seq() > before) { playEventTimeline(); return; }
    }
    render();
  }
}

function showComboBadge(count) {
  const wrap = $('boardWrap') || boardEl;
  if (!wrap) return;
  const old = wrap.querySelector('.combo-badge');
  if (old) old.remove();
  const badge = document.createElement('div');
  badge.className = 'combo-badge';
  badge.textContent = `💥 COMBO x${count}!`;
  wrap.appendChild(badge);
  setTimeout(() => { if (badge.parentNode) badge.remove(); }, 1200);
}

function act(fn) {
  if (playing) { return; }                        // đang diễn hoạ -> khoá input
  if (M._m3_finished()) { return; }
  const before = M._m3_event_seq ? M._m3_event_seq() : -1;
  const ok = fn();
  if (!ok) { toast('Chưa dùng được: ' + lastMessage, false); render(); return; }
  render();
  if (M._m3_event_seq && M._m3_event_seq() > before) { playEventTimeline(); }
}

// ---------------------------------------------------------------------------
// Kỹ năng của nhân vật
// ---------------------------------------------------------------------------
function onSkillButtonClick(i) {
  if (M._m3_finished()) { return; }
  const roleId = M._m3_member_role_id ? M._m3_member_role_id(i) : -1;
  // Role 1 = Supporter: gỡ vật cản/bẫy chỉ định
  if (roleId === 1 && M._m3_member_cooldown(i) === 0 && M._m3_member_alive(i) === 1) {
    if (targetingSkillMember === i) {
      targetingSkillMember = null;
      toast('Đã hủy chọn kỹ năng chỉ định.', false);
    } else {
      targetingSkillMember = i;
      toast('KỸ NĂNG CHỈ ĐỊNH: Click vào ô Vật cản ▨ hoặc Bẫy ☠️ trên bàn để gỡ bỏ (hoặc Esc để hủy).', true);
    }
    render();
    return;
  }
  // Role 3 = Defender: chọn nhân vật cụ thể để bảo vệ
  if (roleId === 3 && M._m3_member_cooldown(i) === 0 && M._m3_member_alive(i) === 1) {
    if (targetingSkillMember === i) {
      targetingSkillMember = null;
      toast('Đã hủy chọn bảo vệ mục tiêu.', false);
    } else {
      targetingSkillMember = i;
      toast('BẢO VỆ CHỈ ĐỊNH: Click vào thẻ Nhân vật bạn muốn Defender bảo vệ (hoặc Esc để hủy).', true);
    }
    render();
    return;
  }
  act(() => M._m3_use_skill(i));
}

function onMemberCardClick(targetIndex) {
  if (targetingSkillMember !== null) {
    const casterIdx = targetingSkillMember;
    const roleId = M._m3_member_role_id ? M._m3_member_role_id(casterIdx) : -1;
    if (roleId === 3) {
      targetingSkillMember = null;
      const ok = M._m3_use_skill_target(casterIdx, targetIndex, 0);
      if (!ok) { toast('Không dùng được kỹ năng bảo vệ.', false); }
      render();
    }
  }
}

function startStage(index) {
  selected = null;
  bannerDismissed = false;
  targetingSkillMember = null;
  hideBanner();
  const used = M._m3_init(index, 20261008);
  const select = $('stageSelect');
  if (select) { select.value = String(used); }
  prevCells = new Array(width * height).fill(null);
  render();
}

function currentStage() {
  const select = $('stageSelect');
  return select ? Number(select.value) || 0 : 0;
}

// Chơi lại: nếu đang chơi màn dựng từ dữ liệu thì dựng lại màn đó, ngược lại quay về màn chiến dịch.
function restartCurrent() {
  if (activeLineup !== null) { runLineup(activeLineup); return; }
  startStage(currentStage());
}

// ---------------------------------------------------------------------------
// BỘ ĐỊCH (Web/enemies.js): bảng tra cứu + chạy màn dựng từ dữ liệu
// ---------------------------------------------------------------------------
function buildEnemySetPanel() {
  const hint = $('enemySetHint');
  const grid = $('enemySetGrid');
  if (!hint || !grid || !M._m3_custom_stage_begin) { return; }

  const problems = validateEnemySet();
  hint.textContent = problems.length === 0
    ? `${ENEMY_SET.length} địch · ${STAGE_LINEUPS.length} màn dựng từ dữ liệu`
    : `${problems.length} lỗi dữ liệu: ${problems[0]}`;
  hint.classList.toggle('warn', problems.length > 0);

  const sel = $('lineupSelect');
  sel.innerHTML = '';
  STAGE_LINEUPS.forEach((lineup, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${lineup.title} (${lineup.enemies.length} địch)`;
    sel.appendChild(option);
  });
  $('btnRunLineup').onclick = () => runLineup(Number(sel.value) || 0);

  grid.innerHTML = '';
  for (let tier = 0; tier < 4; tier++) {
    const inTier = ENEMY_SET.filter((e) => e.tier === tier);
    if (inTier.length === 0) { continue; }

    const group = document.createElement('div');
    group.className = 'enemy-set-group';

    const head = document.createElement('div');
    head.className = `enemy-set-group-head tier-${TIER_KEYS_LOCAL[tier]}`;
    head.textContent = `${TIER_NAMES[tier]} · ${inTier.length}`;
    group.appendChild(head);

    const row = document.createElement('div');
    row.className = 'enemy-set-row';
    inTier.forEach((enemy) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'enemy-set-card';
      card.title = `${enemy.name}\nHP ${enemy.hp} · ATK ${enemy.atk} · stagger ${enemy.stagger}`
        + `\nKháng vật lý ${enemy.physResist}% · kháng phép ${enemy.magResist}%`
        + `\nChu kì hành động: ${enemy.pattern}`
        + '\n\nBấm để thử đánh riêng con này.';

      const art = document.createElement('div');
      art.className = 'enemy-set-art';
      mountSprite(art, enemy.sprite, enemy.sprite, 2);

      const name = document.createElement('div');
      name.className = 'enemy-set-name';
      name.textContent = enemy.name;

      const meta = document.createElement('div');
      meta.className = 'enemy-set-meta';
      meta.textContent = enemy.sprite;

      card.appendChild(art);
      card.appendChild(name);
      card.appendChild(meta);
      card.onclick = () => runSingleEnemy(enemy);
      row.appendChild(card);
    });

    group.appendChild(row);
    grid.appendChild(group);
  }
}

const TIER_KEYS_LOCAL = ['normal', 'elite', 'midboss', 'boss'];

// Dựng một màn từ danh sách địch trong Web/enemies.js.
function runLineup(index) {
  const lineup = STAGE_LINEUPS[index];
  if (!lineup) { return; }

  const problems = validateEnemySet();
  if (problems.length > 0) { toast('Bộ địch có lỗi dữ liệu: ' + problems[0], false); return; }

  withCString(lineup.title, (titlePtr) =>
    M._m3_custom_stage_begin(titlePtr, lineup.movesPerTurn, lineup.obstacles));

  for (const id of lineup.enemies) {
    const enemy = findEnemy(id);
    if (!enemy) { continue; }
    addEnemyToCustomStage(enemy);
  }

  if (!M._m3_custom_stage_start()) { toast('Không dựng được màn từ dữ liệu.', false); return; }
  activeLineup = index;
  beginFreshBattleUI();
  toast('Đang chơi màn dựng từ Web/enemies.js: ' + lineup.title, true);
}

// Thử đánh riêng một địch trong bộ địch (kèm 2 quái thường làm bối cảnh).
function runSingleEnemy(enemy) {
  const escort = ENEMY_SET.filter((e) => e.tier === 0 && e.id !== enemy.id);
  const ids = [enemy, ...escort.slice(0, 2)];

  withCString(`Thử địch: ${enemy.name}`, (titlePtr) => M._m3_custom_stage_begin(titlePtr, 4, 2));
  ids.forEach(addEnemyToCustomStage);
  if (!M._m3_custom_stage_start()) { return; }

  activeLineup = null;
  beginFreshBattleUI();
  toast(`Đang thử địch: ${enemy.name} (${TIER_NAMES[enemy.tier]})`, true);
}

function addEnemyToCustomStage(enemy) {
  withCString(enemy.id, (idPtr) => {
    withCString(enemy.name, (namePtr) => {
      withCString(enemy.sprite, (spritePtr) => {
        withCString(enemy.pattern, (patternPtr) => {
          M._m3_custom_stage_add_enemy(idPtr, namePtr, spritePtr, enemy.tier,
            enemy.hp, enemy.atk, enemy.stagger, enemy.physResist, enemy.magResist, patternPtr);
        });
      });
    });
  });
}

// Reset trạng thái giao diện khi bắt đầu một trận mới (chiến dịch hoặc từ dữ liệu).
function beginFreshBattleUI() {
  selected = null;
  bannerDismissed = false;
  targetingSkillMember = null;
  lastTurnShown = 0;
  hideBanner();
  prevCells = new Array(width * height).fill(null);
  render();
}

// ---------------------------------------------------------------------------
// Trích xuất danh sách Buff / Debuff đang kích hoạt
// ---------------------------------------------------------------------------
function getActiveEffects() {
  const memberCount = M._m3_member_count ? M._m3_member_count() : 4;
  const enemyCount = M._m3_enemy_count ? M._m3_enemy_count() : 1;
  const enemyBuffs = Array.from({ length: enemyCount }, () => []);
  const memberBuffs = Array.from({ length: memberCount }, () => []);

  const count = M._m3_effect_count ? M._m3_effect_count() : 0;
  for (let k = 0; k < count; k++) {
    const id = M.UTF8ToString(M._m3_effect_id(k));
    const source = M.UTF8ToString(M._m3_effect_source(k));
    const stacks = M._m3_effect_stacks(k);
    const turns = M._m3_effect_turns(k);
    const isEnemy = M._m3_effect_is_boss(k) === 1;
    const targetMember = M._m3_effect_target_member(k);
    const desc = M.UTF8ToString(M._m3_effect_description(k));

    let icon = '🔸';
    let label = id;
    let cssClass = '';

    if (id === 'buff.supporter.rally') {
      icon = '⚔️'; label = `Cổ Vũ x${stacks}`; cssClass = 'buff-atk';
    } else if (id === 'buff.attacker.focus') {
      icon = '⚡'; label = 'Tập Trung'; cssClass = 'buff-atk';
    } else if (id.startsWith('buff.defender.')) {
      icon = '🛡️'; label = 'Thủ Hộ'; cssClass = 'buff-def';
    } else if (id === 'buff.healer.aegis') {
      icon = '🔰'; label = 'Bảo Hộ'; cssClass = 'buff-def';
    } else if (id === 'buff.chain.fullburst') {
      icon = '🌟'; label = 'Full Burst'; cssClass = 'buff-burst';
    } else if (id === 'debuff.boss.magic_vuln') {
      icon = '🔮'; label = `Suy Yếu Phép x${stacks}`; cssClass = 'buff-debuff';
    } else if (id === 'debuff.boss.shatter') {
      icon = '💫'; label = 'Nứt Stagger'; cssClass = 'buff-debuff';
    } else if (id === 'debuff.boss.weaken') {
      icon = '⬇️'; label = 'Suy Yếu Đội'; cssClass = 'buff-debuff';
    }

    const item = { icon, label, cssClass, tooltip: `${desc} [Nguồn: ${source}] (còn ${turns} turn)` };

    if (isEnemy) {
      // Debuff đặt lên hàng địch: gắn cho địch đang được ngắm.
      const t = M._m3_target_enemy ? M._m3_target_enemy() : 0;
      if (t >= 0 && t < enemyCount) { enemyBuffs[t].push(item); }
    } else if (targetMember >= 0 && targetMember < memberCount) {
      memberBuffs[targetMember].push(item);
    } else {
      for (let m = 0; m < memberCount; m++) { memberBuffs[m].push(item); }
    }
  }

  return { enemyBuffs, memberBuffs };
}

// ---------------------------------------------------------------------------
// Vẽ trạng thái
// ---------------------------------------------------------------------------
function render() {
  const effects = getActiveEffects();
  renderBoard();
  renderEnemies(effects.enemyBuffs);
  renderTeam(effects.memberBuffs);
  renderStory();
  renderChallenges();
  renderLog();
  renderBanner();

  const turnNow = M._m3_turn();
  if (turnNow !== lastTurnShown) {
    lastTurnShown = turnNow;
    bigCallout(`TURN ${turnNow}`, 'turn');
  }
  $('turnText').textContent = String(turnNow);
  const movesLeft = M._m3_moves_left();
  const movesMax = M._m3_moves_per_turn();
  const movesUsed = movesMax - movesLeft;
  const dots = '●'.repeat(movesLeft) + '○'.repeat(movesUsed);
  $('movesText').innerHTML = `${movesLeft} / ${movesMax} <span class="move-dots">${dots}</span>`;
  $('obstacleText').textContent = String(M._m3_obstacles());
  $('starText').textContent = String(M._m3_stars());
  $('btnEndTurn').disabled = M._m3_finished() === 1;

  const msg = M.UTF8ToString(M._m3_last_message());
  if (msg && msg !== lastMessage) {
    lastMessage = msg;
    toast(msg, true);
  }

  $('statsText').textContent =
    `Sát thương đã gây: ${M._m3_damage_dealt().toFixed(0)} · đã nhận: ${M._m3_damage_taken().toFixed(0)}`;

  const tag = $('stageTag');
  if (tag) {
    const title = M._m3_stage_title ? M.UTF8ToString(M._m3_stage_title(currentStage())) : '';
    tag.textContent = title ? title : 'Lõi luật chơi C++ biên dịch sang WebAssembly';
  }
}

// ---------------------------------------------------------------------------
// Vẽ bàn nối
// ---------------------------------------------------------------------------
function renderBoard() {
  const hintAX = M._m3_hint_ax(), hintAY = M._m3_hint_ay();
  const hintBX = M._m3_hint_bx(), hintBY = M._m3_hint_by();
  const showHint = hintVisible && hintAX >= 0;
  const cellCount = boardEl.children.length;

  if (cellCount !== width * height) { buildBoardDom(); }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const cell = boardEl.children[index];
      const color = M._m3_cell_color(x, y);
      const kind = M._m3_cell_kind(x, y);
      const charges = M._m3_cell_charges(x, y);
      const variant = M._m3_cell_variant ? M._m3_cell_variant(x, y) : 0;

      const colorClass = COLOR_CLASS[color] || '';
      let classes = 'cell';
      if (colorClass) { classes += ' ' + colorClass; }
      if (kind === KIND_OBSTACLE) { classes += ' obstacle'; }
      if (kind === KIND_LINE) { classes += variant === 0 ? ' special-line special-line-row' : ' special-line special-line-col'; }
      if (kind === KIND_SQUARE) { classes += ' special-square'; }
      if (kind === KIND_RAINBOW) { classes += ' special-rainbow'; }
      if (kind === KIND_TRAP) { classes += ' obstacle trap'; }
      if (kind === KIND_AREA_BOMB) { classes += ' special-area'; }
      if (selected && selected.x === x && selected.y === y) { classes += ' sel'; }
      if (showHint && ((x === hintAX && y === hintAY) || (x === hintBX && y === hintBY))) { classes += ' hintA'; }

      const signature = `${color}-${kind}-${charges}-${variant}`;
      if (prevCells[index] !== signature) {
        classes += (prevCells[index] && color > 0) ? ' drop' : ' pop';
        prevCells[index] = signature;
      }

      cell.className = classes;

      let glyph = '';
      let cellTitle = '';
      if (kind === KIND_OBSTACLE) {
        glyph = '▨';
        cellTitle = `[CHƯỚNG NGẠI ĐỊCH] Khối đá phong ấn (còn ${charges} lớp phá). Cần kỹ năng Supporter hoặc nổ bom kề bên để phá hủy.`;
      } else if (kind === KIND_LINE) {
        if (variant === 0) {
          glyph = '═';
          cellTitle = '[PHE TA - TIA SÉT XUYÊN HÀNG] Sinh từ match-4 dọc. Di chuyển tự do để quét sạch toàn bộ hàng ngang!';
        } else {
          glyph = '║';
          cellTitle = '[PHE TA - TIA SÉT XUYÊN CỘT] Sinh từ match-4 ngang. Di chuyển tự do để quét sạch toàn bộ cột dọc!';
        }
      } else if (kind === KIND_SQUARE) {
        glyph = '✸';
        cellTitle = '[PHE TA - TÊN LỬA TẦM NHIỆT] Sinh từ match-4 vuông (2x2). Di chuyển tự do để bay đến phá hủy chướng ngại/bẫy của địch!';
      } else if (kind === KIND_RAINBOW) {
        glyph = '✷';
        cellTitle = '[PHE TA - CẦU VỒNG TOÀN NĂNG] Sinh từ match-5 thẳng hàng. Đổi chỗ với màu bất kỳ để nổ toàn bộ block cùng màu trên bàn!';
      } else if (kind === KIND_TRAP) {
        glyph = '☠️';
        cellTitle = `[ĐỊCH - BẪY ĐẾM NGƯỢC] Bẫy nổ của địch (còn ${charges} lượt)! Hết giờ sẽ nổ gây sát thương cho toàn đội. Hãy match kề bên hoặc dùng kỹ năng Supporter để gỡ!`;
      } else if (kind === KIND_AREA_BOMB) {
        glyph = '💣';
        cellTitle = '[PHE TA - BOM KHỐI NĂNG LƯỢNG] Bom nổ 3x3 của phe ta (sinh từ combo 5 góc L/T)! Nhấn 2 lần (double-click) hoặc di chuyển tự do để kích nổ vùng 3x3, gây sát thương khủng!';
      } else if (color > 0) {
        cellTitle = `Block màu ${color}`;
      }

      // Ô bị địch khoá (LockCells): vẽ lớp khoá riêng.
      const cellData = M._m3_cell_locked ? M._m3_cell_locked(x, y) : 0;
      if (cellData === 1) {
        cell.className += ' locked';
        glyph = '🔒';
        cellTitle = '[ĐỊCH - PHONG ẤN] Ô bị khoá, không đổi chỗ / không rơi được cho tới khi hết hạn.';
      }

      const extraText = (kind === KIND_OBSTACLE && charges > 1) ? `<span class="charges">x${charges}</span>`
                      : (kind === KIND_TRAP) ? `<span class="charges danger">${charges}t</span>` : '';
      cell.innerHTML = glyph + extraText;
      cell.title = cellTitle;
      cell.setAttribute('aria-label', `Ô ${x},${y} - ${cellTitle}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Vẽ hàng địch: nhiều quái / nhiều boss, mỗi con một thẻ pixel art
// ---------------------------------------------------------------------------
function renderEnemies(enemyBuffs) {
  const count = M._m3_enemy_count ? M._m3_enemy_count() : 1;
  const alive = M._m3_enemy_alive_count ? M._m3_enemy_alive_count() : count;
  const target = M._m3_target_enemy ? M._m3_target_enemy() : 0;

  $('enemyAliveTag').textContent = `${alive} / ${count} địch`;

  // Dựng lại thẻ nếu số lượng địch đổi (triệu hồi quái làm hàng địch dài ra).
  if (enemyLineEl.children.length !== count) {
    enemyLineEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'enemy-card';
      card.dataset.index = String(i);
      card.innerHTML = `
        <div class="enemy-top">
          <span class="enemy-tier"></span>
          <span class="enemy-intent"></span>
        </div>
        <div class="enemy-art"></div>
        <div class="enemy-name"></div>
        <div class="enemy-bar"><i></i></div>
        <div class="enemy-hp"></div>
        <div class="enemy-stagger-wrap"><div class="enemy-stagger"><i></i></div><span class="enemy-stagger-text"></span></div>
        <div class="enemy-buffs buff-list"></div>`;
      card.addEventListener('click', () => {
        if (M._m3_finished()) { return; }
        if (M._m3_set_target_enemy(i)) {
          toast('Mục tiêu: ' + M.UTF8ToString(M._m3_enemy_name(i)), false);
          render();
        } else {
          toast('Địch này đã gục - chọn con khác.', false);
        }
      });
      enemyLineEl.appendChild(card);
    }
  }

  for (let i = 0; i < count; i++) {
    const card = enemyLineEl.children[i];
    const tier = M._m3_enemy_tier(i);
    const name = M.UTF8ToString(M._m3_enemy_name(i));
    const aliveEnemy = M._m3_enemy_alive(i) === 1;
    const hp = M._m3_enemy_hp_pct(i);
    const hasStagger = M._m3_enemy_has_stagger(i) === 1;
    const stagger = M._m3_enemy_stagger_pct(i);
    const broken = M._m3_enemy_broken(i) === 1;
    const charging = M._m3_enemy_charging(i) === 1;
    const intentName = M.UTF8ToString(M._m3_enemy_intent_name(i));
    const intentAction = M._m3_enemy_intent_action(i);
    const phase = M._m3_enemy_phase(i);
    const totalPhases = M._m3_enemy_total_phases(i);
    const selfBuffs = M._m3_enemy_self_buffs(i);

    card.classList.toggle('dead', !aliveEnemy);
    card.classList.toggle('targeted', i === target && aliveEnemy);
    card.classList.toggle('broken', broken);
    card.classList.toggle('charging', charging);
    card.classList.add(TIER_CLASS[tier] || 'tier-normal');
    card.disabled = !aliveEnemy;

    // Pixel art: dựng lại khi khoá sprite đổi (an toàn và rẻ vì sprite rất nhỏ).
    const artEl = card.querySelector('.enemy-art');
    const spriteKey = M._m3_enemy_sprite ? M.UTF8ToString(M._m3_enemy_sprite(i)) : spriteKeyForTier(tier);
    mountSprite(artEl, spriteKey, spriteKey, tier >= TIER_MIDBOSS ? 4 : 3);

    card.querySelector('.enemy-tier').textContent = TIER_LABEL[tier] || '?';

    const intentEl = card.querySelector('.enemy-intent');
    if (aliveEnemy) {
      const icon = ACTION_ICON[intentAction] || '•';
      intentEl.textContent = `${icon} ${intentName}`;
      intentEl.title = `Hành động kế tiếp: ${intentName}`;
    } else { intentEl.textContent = ''; }

    const phaseTag = totalPhases > 1 ? ` (P${phase}/${totalPhases})` : '';
    const buffTag = selfBuffs > 0 ? ` [ATK +${selfBuffs * 10}%]` : '';
    card.querySelector('.enemy-name').textContent = name + phaseTag + buffTag;

    card.querySelector('.enemy-bar i').style.width = (Math.max(0, Math.min(1, hp)) * 100).toFixed(1) + '%';
    card.querySelector('.enemy-hp').textContent =
      `${M._m3_enemy_hp(i).toFixed(0)} / ${M._m3_enemy_hp_max(i).toFixed(0)}`;

    const staggerWrap = card.querySelector('.enemy-stagger-wrap');
    if (hasStagger && aliveEnemy) {
      staggerWrap.hidden = false;
      const bar = staggerWrap.querySelector('.enemy-stagger i');
      const text = staggerWrap.querySelector('.enemy-stagger-text');
      if (broken) {
        bar.style.width = '100%';
        text.textContent = `VỠ - BREAK (${M._m3_enemy_break_turns(i)} lượt)`;
        staggerWrap.classList.add('full-break');
      } else {
        bar.style.width = (Math.max(0, Math.min(1, stagger)) * 100).toFixed(1) + '%';
        text.textContent = `Stagger ${(stagger * 100).toFixed(0)}%`;
        staggerWrap.classList.remove('full-break');
      }
      if (charging) {
        text.textContent += ` · NẠP (${M._m3_enemy_break_cur(i)}/${M._m3_enemy_break_req(i)})`;
      }
    } else {
      staggerWrap.hidden = true;
    }

    const buffsEl = card.querySelector('.enemy-buffs');
    buffsEl.innerHTML = '';
    (enemyBuffs[i] || []).forEach(b => {
      const badge = document.createElement('span');
      badge.className = `buff-badge ${b.cssClass}`;
      badge.innerHTML = `${b.icon} ${b.label} <span class="tooltip">${b.tooltip}</span>`;
      buffsEl.appendChild(badge);
    });
  }
}

// ---------------------------------------------------------------------------
// Vẽ đội hình: pixel art theo class
// ---------------------------------------------------------------------------
function renderTeam(memberBuffs) {
  const count = M._m3_member_count();
  const targetEnemy = M._m3_target_enemy ? M._m3_target_enemy() : -1;
  const intentTarget = (targetEnemy >= 0 && M._m3_enemy_intent_target) ? M._m3_enemy_intent_target(targetEnemy) : -1;

  if (teamEl.children.length !== count) {
    teamEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'member';
      card.innerHTML = `
        <div class="member-art"></div>
        <div class="member-info">
          <div class="member-head">
            <span class="member-name"></span>
            <span class="member-role"></span>
          </div>
          <div class="member-bars">
            <div class="mini-bar mini-hp"><i></i></div>
            <div class="mini-bar mini-ult"><i></i></div>
          </div>
          <div class="member-buffs buff-list"></div>
        </div>
        <div class="member-actions">
          <button type="button" class="btn btn-skill" data-skill="${i}">
            <span class="label"></span> <kbd>${i + 1}</kbd>
          </button>
          <button type="button" class="btn btn-ult" data-ult="${i}">
            <span class="label"></span> <kbd>Num${i + 1}</kbd>
          </button>
        </div>`;
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) { onMemberCardClick(i); }
      });
      card.querySelector('[data-skill]').addEventListener('click', () => onSkillButtonClick(i));
      card.querySelector('[data-ult]').addEventListener('click', () => act(() => M._m3_use_ultimate(i)));
      teamEl.appendChild(card);
    }
  }

  for (let i = 0; i < count; i++) {
    const card = teamEl.children[i];
    const name = M.UTF8ToString(M._m3_member_name(i));
    const role = M.UTF8ToString(M._m3_member_role(i));
    const hp = M._m3_member_hp_pct(i);
    const ultPct = M._m3_member_ultimate_pct(i);
    const cool = M._m3_member_cooldown(i);
    const alive = M._m3_member_alive(i) === 1;

    card.classList.toggle('down', !alive);
    card.classList.toggle('targeted-by-enemy', i === intentTarget);

    // Pixel art theo class (tên role trong lõi: Attacker/Supporter/Healer/...)
    const artEl = card.querySelector('.member-art');
    const roleKey = (role || '').toLowerCase();
    // Hình của nhân vật do LÕI quyết định (mỗi nhân vật một khoá riêng, có biến thể).
    const memberSprite = (M._m3_member_sprite && M.UTF8ToString(M._m3_member_sprite(i))) || roleKey;
    mountSprite(artEl, memberSprite, roleKey, 3);

    card.querySelector('.member-name').textContent = name;
    card.querySelector('.member-role').textContent = role;
    card.querySelector('.mini-hp i').style.width = (Math.max(0, Math.min(1, hp)) * 100).toFixed(1) + '%';
    card.querySelector('.mini-ult i').style.width = Math.max(0, Math.min(100, ultPct)) + '%';

    const buffsEl = card.querySelector('.member-buffs');
    buffsEl.innerHTML = '';
    memberBuffs[i].forEach(b => {
      const badge = document.createElement('span');
      badge.className = `buff-badge ${b.cssClass}`;
      badge.innerHTML = `${b.icon} ${b.label} <span class="tooltip">${b.tooltip}</span>`;
      buffsEl.appendChild(badge);
    });

    const skillBtn = card.querySelector('[data-skill]');
    const ultBtn = card.querySelector('[data-ult]');
    skillBtn.querySelector('.label').textContent = cool > 0 ? `Hồi ${cool}` : M.UTF8ToString(M._m3_member_skill(i));
    ultBtn.querySelector('.label').textContent = M.UTF8ToString(M._m3_member_ultimate(i));
    skillBtn.disabled = !alive || cool > 0;
    ultBtn.disabled = !alive || ultPct < 100;
  }
}

// ---------------------------------------------------------------------------
// Vẽ story của màn
// ---------------------------------------------------------------------------
function renderStory() {
  const panel = $('storyPanel');
  if (!panel) { return; }

  const chapterTitle = M._m3_story_chapter_title ? M.UTF8ToString(M._m3_story_chapter_title()) : '';
  const stageTitle = M._m3_story_stage_title ? M.UTF8ToString(M._m3_story_stage_title()) : '';
  const brief = M._m3_story_brief ? M.UTF8ToString(M._m3_story_brief()) : '';

  if (!chapterTitle && !stageTitle && !brief) { panel.hidden = true; return; }
  panel.hidden = false;

  $('storyChapter').textContent = chapterTitle;
  $('storyTitle').textContent = stageTitle;
  $('storyBrief').textContent = brief;

  const introCount = M._m3_story_intro_count ? M._m3_story_intro_count() : 0;
  const linesEl = $('storyLines');
  if (linesEl.children.length !== introCount) {
    linesEl.innerHTML = '';
    for (let i = 0; i < introCount; i++) {
      const li = document.createElement('li');
      linesEl.appendChild(li);
    }
  }
  for (let i = 0; i < introCount; i++) {
    linesEl.children[i].textContent = M.UTF8ToString(M._m3_story_intro_line(i));
  }
}

function renderChallenges() {
  const count = M._m3_challenge_count();
  if (challengesEl.children.length !== count) {
    challengesEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="mark"></span><span class="text"></span>';
      challengesEl.appendChild(li);
    }
  }
  for (let i = 0; i < count; i++) {
    const li = challengesEl.children[i];
    const done = M._m3_challenge_done(i) === 1;
    li.classList.toggle('done', done);
    li.querySelector('.mark').textContent = done ? '☑' : '☐';
    li.querySelector('.text').textContent = M.UTF8ToString(M._m3_challenge_text(i));
  }
}

function renderLog() {
  const count = M._m3_log_count();
  const start = Math.max(0, count - 40);
  logEl.innerHTML = '';
  for (let i = start; i < count; i++) {
    const li = document.createElement('li');
    const text = M.UTF8ToString(M._m3_log_line(i));
    li.textContent = text;
    if (text.startsWith('[Story]')) { li.classList.add('log-story'); }
    else if (text.includes('[HẠ GỤC]') || text.includes('CHIẾN THẮNG')) { li.classList.add('log-win'); }
    else if (text.includes('THẤT BẠI')) { li.classList.add('log-lose'); }
    logEl.appendChild(li);
    // Cuộn tới dòng mới nhất nhưng không phá vị trí cuộn trang.
    logEl.scrollTop = 0;
  }
}

function renderBanner() {
  if (M._m3_finished() !== 1 || bannerDismissed) { hideBanner(); return; }

  const win = M._m3_victory() === 1;
  const banner = $('banner');
  banner.hidden = false;
  banner.classList.toggle('win', win);
  banner.classList.toggle('lose', !win);

  const enemyTotal = M._m3_stage_enemy_count ? M._m3_stage_enemy_count(currentStage()) : 1;
  $('bannerTitle').textContent = win ? `CHIẾN THẮNG - ${M._m3_stars()} sao` : 'THẤT BẠI';
  $('bannerText').textContent = win
    ? `Đã dọn sạch ${enemyTotal} địch. Đánh giá sao dựa trên nhiệm vụ map.`
    : 'Toàn đội đã gục. Chỉnh đội hình hoặc cách nối block rồi thử lại.';

  const storyEl = $('bannerStory');
  storyEl.innerHTML = '';
  const count = win && M._m3_story_victory_count ? M._m3_story_victory_count() : 0;
  for (let i = 0; i < count; i++) {
    const li = document.createElement('li');
    li.textContent = M.UTF8ToString(M._m3_story_victory_line(i));
    storyEl.appendChild(li);
  }
}

function hideBanner() { $('banner').hidden = true; }

function dismissBanner() {
  bannerDismissed = true;
  $('banner').hidden = true;
}

// ---------------------------------------------------------------------------
// Gợi ý nước đi
// ---------------------------------------------------------------------------
let hintVisible = false;
function toggleHint() {
  hintVisible = !hintVisible;
  render();
  if (hintVisible && M._m3_hint_ax() < 0) { toast('Bàn đã hết nước đi - hãy kết thúc turn.', false); }
}

// ---------------------------------------------------------------------------
// Thông báo nhỏ
// ---------------------------------------------------------------------------
function toast(text, flash) {
  const el = $('toast');
  el.textContent = text;
  el.classList.toggle('flash', !!flash);
}

// ---------------------------------------------------------------------------
// Tự kiểm tra (?selftest=1)
// ---------------------------------------------------------------------------
async function runSelfTest() {
  const results = [];
  const banner = $('banner');
  const bannerVisible = () => getComputedStyle(banner).display !== 'none';

  results.push(['bảng kết quả ẩn khi vào game', !bannerVisible()]);
  results.push(['hàng địch có nhiều hơn 1 con', M._m3_enemy_count() > 1]);

  let guard = 0;
  while (M._m3_finished() === 0 && guard < 900) {
    const hx = M._m3_hint_ax();
    if (hx >= 0) { M._m3_try_swap(hx, M._m3_hint_ay(), M._m3_hint_bx(), M._m3_hint_by()); }
    else { M._m3_end_turn(); }
    guard++;
  }
  render();
  results.push(['bảng kết quả hiện ra khi hết trận', bannerVisible()]);

  $('btnCloseBanner').click();
  results.push(['bấm nút × thì bảng kết quả tắt', !bannerVisible()]);

  banner.hidden = false;
  $('banner').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  results.push(['bấm ra vùng tối thì bảng kết quả tắt', !bannerVisible()]);

  startStage(0);
  results.push(['chơi lại màn thì bảng kết quả vẫn ẩn', !bannerVisible()]);
  results.push(['trận mới đã bắt đầu', M._m3_finished() === 0 && M._m3_turn() === 1]);
  results.push(['đổi mục tiêu được', M._m3_set_target_enemy(M._m3_primary_enemy()) === 1]);

  // (3) Kiểm tra animation: chơi qua ĐÚNG đường hành động của người chơi để nhịp được diễn hoạ.
  const fxBefore = { ...fxCounters };
  //     Ultimate cần tích đầy thanh nên phải chơi đủ turn; nếu hết màn thì sang màn mới
  //     (tối đa 3 lần) để chắc chắn có dịp thấy cắt cảnh.
  let stageRestarts = 0;
  // Số liệu chẩn đoán để biết vì sao ultimate có/không phát.
  let ultMaxPct = 0;
  let ultTries = 0;
  let ultOk = 0;
  const kindsSeen = new Set();
  for (let action = 0; action < 160; action++) {
    if (fxCounters.spark > fxBefore.spark
      && fxCounters.ring > fxBefore.ring
      && fxCounters.cutin > fxBefore.cutin) { break; }

    if (M._m3_finished() === 1) {
      if (stageRestarts >= 3) { break; }
      stageRestarts++;
      startStage(0);
      continue;
    }

    const hx = M._m3_hint_ax();
    if (hx >= 0) {
      const seq = M._m3_event_seq();
      M._m3_try_swap(hx, M._m3_hint_ay(), M._m3_hint_bx(), M._m3_hint_by());
      if (M._m3_event_seq() > seq) { await playEventTimeline(); }
    } else {
      M._m3_end_turn();
    }

    // Dùng kỹ năng / ultimate khi có thể -> thấy animation kỹ năng và cắt cảnh ultimate.
    for (let i = 0; i < M._m3_member_count(); i++) {
      if (M._m3_member_alive(i) !== 1) { continue; }
      const pct = M._m3_member_ultimate_pct(i);
      ultMaxPct = Math.max(ultMaxPct, pct);
      const seq2 = M._m3_event_seq();
      if (pct >= 100) {
        ultTries++;
        if (M._m3_use_ultimate(i) === 1) { ultOk++; }
      } else if (M._m3_member_cooldown(i) === 0) {
        M._m3_use_skill(i);
      }
      if (M._m3_event_seq() > seq2) {
        for (let k = 0; k < M._m3_event_count(); k++) { kindsSeen.add(M._m3_event_kind(k)); }
        await playEventTimeline();
      }
    }
  }

  results.push(['animation đòn đánh thường đã phát', fxCounters.spark > fxBefore.spark]);
  results.push(['animation kỹ năng đã phát', fxCounters.ring > fxBefore.ring]);
  results.push(['animation ultimate (cắt cảnh) đã phát', fxCounters.cutin > fxBefore.cutin]);

  const failed = results.filter(([, ok]) => !ok);
  document.title = `SELFTEST ${failed.length === 0 ? 'OK' : 'FAIL'} (${results.length - failed.length}/${results.length})`;
  const diag = ` [ult: max ${ultMaxPct}%, thu ${ultTries}, thanh cong ${ultOk}; kinds ${[...kindsSeen].sort((a, b) => a - b).join(',')}]`;
  $('engineText').textContent = 'SELFTEST ' + results.map(([name, ok]) => `${ok ? 'OK' : 'FAIL'} - ${name}`).join(' | ') + diag;
}

boot();
