/* ============================================================================
   m3ui.js - Logic bản chơi web
   ----------------------------------------------------------------------------
   Toàn bộ LUẬT CHƠI nằm trong m3core.mjs/.wasm (biên dịch từ Source/Match3Core).
   File này chỉ:
     1) gọi init() để nạp module WebAssembly,
     2) đọc trạng thái qua các hàm m3_* và vẽ ra DOM,
     3) gửi hành động của người chơi (đổi chỗ, kỹ năng, ultimate, kết thúc turn).
   ============================================================================ */

import createModule from './dist/m3core.mjs';

// ---------------------------------------------------------------------------
// Trạng thái phía giao diện
// ---------------------------------------------------------------------------
let M = null;                 // module WebAssembly
let width = 8, height = 8;
let selected = null;          // {x, y} ô đang chọn
let prevCells = [];           // để biết ô nào vừa đổi -> chạy hiệu ứng
let lastMessage = '';
let bannerDismissed = false;   // người chơi đã tự đóng bảng kết quả

const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const teamEl = $('team');
const challengesEl = $('challenges');
const logEl = $('log');

// Tên lớp CSS theo màu block (1..6 = Đỏ, Xanh dương, Xanh lá, Vàng, Tím, Cyan)
const COLOR_CLASS = ['', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

// Loại block: 1 vật cản, 2 nổ hàng/cột, 3 nổ vuông, 4 cầu vồng, 5 bẫy đếm ngược, 6 bom diện rộng
const KIND_OBSTACLE = 1, KIND_LINE = 2, KIND_SQUARE = 3, KIND_RAINBOW = 4, KIND_TRAP = 5, KIND_AREA_BOMB = 6;

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

  M._m3_init(0, 20261008);
  render();

  $('engineText').textContent = 'WebAssembly: đã nạp lõi luật chơi (' + width + 'x' + height + ')';
  toast('Click 2 ô kề nhau để đổi chỗ. Phím 1..6 là kỹ năng, NumPad 1..6 là ultimate.', false);

  // Chế độ tự kiểm tra (dành cho lập trình viên): mở index.html?selftest=1
  // Nó tự chơi hết một trận rồi kiểm tra bảng kết quả hiện ra và ĐÓNG được -
  // đúng luồng lỗi "màn kết quả không tắt" từng gặp.
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
    option.textContent = `Map ${i + 1} - ${M.UTF8ToString(M._m3_stage_name(i))}`;
    select.appendChild(option);
  }
  select.addEventListener('change', () => startStage(Number(select.value)));
}

function bindControls() {
  $('btnEndTurn').addEventListener('click', () => act(() => M._m3_end_turn()));
  $('btnRestart').addEventListener('click', () => startStage(currentStage()));
  $('btnHint').addEventListener('click', () => toggleHint());
  $('btnPlayAgain').addEventListener('click', () => { hideBanner(); startStage(currentStage()); });
  $('btnNextMap').addEventListener('click', () => {
    hideBanner();
    startStage((currentStage() + 1) % Math.max(1, M._m3_stage_count()));
  });
  $('btnCloseBanner').addEventListener('click', (event) => { event.stopPropagation(); dismissBanner(); });
  $('banner').addEventListener('click', (event) => {
    // Bấm vào vùng tối bên ngoài khung cũng đóng bảng.
    if (event.target === $('banner')) { dismissBanner(); }
  });

  window.addEventListener('keydown', (event) => {
    const key = event.key;

    if (key === 'Escape') {
      if ($('banner').hidden === false) { dismissBanner(); return; }
      selected = null;
      render();
      return;
    }

    // Phím số 1..6 = kỹ năng; NumPad 1..6 = ultimate
    if (/^[1-6]$/.test(key)) { act(() => M._m3_use_skill(Number(key) - 1)); return; }
    if (event.code && /^Numpad[1-6]$/.test(event.code)) { act(() => M._m3_use_ultimate(Number(event.code.slice(-1)) - 1)); return; }

    if (key === 'Tab' || key === 'Enter' || key === ' ') { event.preventDefault(); act(() => M._m3_end_turn()); return; }
    if (key === 'r' || key === 'R') { startStage(currentStage()); return; }
    if (key === 'h' || key === 'H') { toggleHint(); return; }
  });
}

let targetingSkillMember = null; // index nhân vật đang bật kỹ năng chỉ định ô (Supporter)

// ---------------------------------------------------------------------------
// Hành động
// ---------------------------------------------------------------------------
function onCellClick(x, y) {
  if (M._m3_finished()) { return; }

  // Nếu đang bật chế độ kỹ năng chỉ định ô (gỡ vật cản/bẫy cụ thể)
  if (targetingSkillMember !== null) {
    const memberIdx = targetingSkillMember;
    targetingSkillMember = null;
    const ok = M._m3_use_skill_target(memberIdx, x, y);
    if (!ok) { toast('Không dùng được kỹ năng chỉ định ô này.', false); }
    render();
    return;
  }

  // Click vào chính ô đang chọn: nếu là block đặc biệt -> kích hoạt trực tiếp tại chỗ (double tap / double click)
  if (selected && selected.x === x && selected.y === y) {
    const kind = M._m3_cell_kind(x, y);
    if (kind === KIND_LINE || kind === KIND_SQUARE || kind === KIND_RAINBOW || kind === KIND_AREA_BOMB) {
      selected = null;
      const ok = M._m3_activate_cell ? M._m3_activate_cell(x, y) : 0;
      if (!ok) {
        toast('Không kích hoạt được ô đặc biệt này.', false);
      } else {
        const cascadeCount = M._m3_last_cascade_count ? M._m3_last_cascade_count() : 1;
        if (cascadeCount > 1) { showComboBadge(cascadeCount); }
      }
      render();
      return;
    }
    selected = null;
    render();
    return;
  }

  if (!selected) { selected = { x, y }; render(); return; }

  const adjacent = Math.abs(selected.x - x) + Math.abs(selected.y - y) === 1;
  if (!adjacent) { selected = { x, y }; render(); return; }

  const ok = M._m3_try_swap(selected.x, selected.y, x, y);
  selected = null;
  if (!ok) {
    const err = M._m3_last_error ? M.UTF8ToString(M._m3_last_error()) : '';
    toast(err || 'Nước đi không tạo được đường nối nào - thử chỗ khác.', false);
  } else {
    const cascadeCount = M._m3_last_cascade_count ? M._m3_last_cascade_count() : 1;
    if (cascadeCount > 1) {
      showComboBadge(cascadeCount);
    }
  }
  render();
}

function onCellDoubleClick(x, y) {
  if (M._m3_finished()) { return; }
  const kind = M._m3_cell_kind(x, y);
  if (kind === KIND_LINE || kind === KIND_SQUARE || kind === KIND_RAINBOW || kind === KIND_AREA_BOMB) {
    selected = null;
    const ok = M._m3_activate_cell ? M._m3_activate_cell(x, y) : 0;
    if (ok) {
      const cascadeCount = M._m3_last_cascade_count ? M._m3_last_cascade_count() : 1;
      if (cascadeCount > 1) { showComboBadge(cascadeCount); }
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
  if (M._m3_finished()) { return; }
  const ok = fn();
  if (!ok) { toast('Chưa dùng được: ' + lastMessage, false); }
  render();
}

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
      toast('KỸ NĂNG CHỈ ĐỊNH: Click vào ô Vật cản ▨ hoặc Bẫy 💣 trên bàn để gỡ bỏ (hoặc Esc để hủy).', true);
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

// ---------------------------------------------------------------------------
// Trích xuất danh sách Buff / Debuff đang kích hoạt
// ---------------------------------------------------------------------------
function getActiveEffects() {
  const bossBuffs = [];
  const memberCount = M._m3_member_count ? M._m3_member_count() : 4;
  const memberBuffs = Array.from({ length: memberCount }, () => []);

  const count = M._m3_effect_count ? M._m3_effect_count() : 0;
  for (let k = 0; k < count; k++) {
    const id = M.UTF8ToString(M._m3_effect_id(k));
    const source = M.UTF8ToString(M._m3_effect_source(k));
    const stacks = M._m3_effect_stacks(k);
    const turns = M._m3_effect_turns(k);
    const isBoss = M._m3_effect_is_boss(k) === 1;
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
    }

    const item = {
      icon,
      label,
      cssClass,
      tooltip: `${desc} [Nguồn: ${source}] (còn ${turns} turn)`
    };

    if (isBoss) {
      bossBuffs.push(item);
    } else {
      if (targetMember >= 0 && targetMember < memberCount) {
        memberBuffs[targetMember].push(item);
      } else {
        for (let m = 0; m < memberCount; m++) {
          memberBuffs[m].push(item);
        }
      }
    }
  }

  const selfBuffs = M._m3_boss_self_buffs ? M._m3_boss_self_buffs() : 0;
  if (selfBuffs > 0) {
    bossBuffs.push({
      icon: '💥',
      label: `Cuồng Nộ x${selfBuffs}`,
      cssClass: 'buff-atk',
      tooltip: `Tăng ${selfBuffs * 10}% sát thương cho Boss`
    });
  }

  return { bossBuffs, memberBuffs };
}

// ---------------------------------------------------------------------------
// Vẽ trạng thái
// ---------------------------------------------------------------------------
function render() {
  const effects = getActiveEffects();
  renderBoard();
  renderBoss(effects.bossBuffs);
  renderTeam(effects.memberBuffs);
  renderChallenges();
  renderLog();
  renderBanner();

  const msg = M.UTF8ToString(M._m3_last_message());
  if (msg && msg !== lastMessage) {
    lastMessage = msg;
    toast(msg, true);
  }

  $('statsText').textContent =
    `Sát thương đã gây: ${M._m3_damage_dealt().toFixed(0)} · đã nhận: ${M._m3_damage_taken().toFixed(0)}`;
}

function renderBoard() {
  const hintAX = M._m3_hint_ax(), hintAY = M._m3_hint_ay();
  const hintBX = M._m3_hint_bx(), hintBY = M._m3_hint_by();
  const showHint = hintVisible && hintAX >= 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const cell = boardEl.children[index];
      const color = M._m3_cell_color(x, y);
      const kind = M._m3_cell_kind(x, y);
      const charges = M._m3_cell_charges(x, y);
      const variant = M._m3_cell_variant ? M._m3_cell_variant(x, y) : 0;

      // Lớp CSS theo màu
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

      // Ký hiệu và tooltip phân biệt rõ ràng bom phe ta vs bẫy địch
      let glyph = '';
      let cellTitle = '';
      if (kind === KIND_OBSTACLE) {
        glyph = '▨';
        cellTitle = `[CHƯỚNG NGẠI BOSS] Khối đá phong ấn (còn ${charges} lớp phá). Cần kỹ năng Supporter hoặc nổ bom kề bên để phá hủy.`;
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
        cellTitle = '[PHE TA - TÊN LỬA TẦM NHIỆT] Sinh từ match-4 vuông (2x2). Di chuyển tự do để bay đến phá hủy chướng ngại/bẫy của Boss!';
      } else if (kind === KIND_RAINBOW) {
        glyph = '✷';
        cellTitle = '[PHE TA - CẦU VỒNG TOÀN NĂNG] Sinh từ match-5 thẳng hàng. Đổi chỗ với màu bất kỳ để nổ toàn bộ block cùng màu trên bàn!';
      } else if (kind === KIND_TRAP) {
        glyph = '☠️';
        cellTitle = `[ĐỊCH - BẪY ĐẾM NGƯỢC] Bẫy nổ của Boss (còn ${charges} lượt)! Hết giờ sẽ nổ gây sát thương cho toàn đội. Hãy match kề bên hoặc dùng kỹ năng Supporter để gỡ!`;
      } else if (kind === KIND_AREA_BOMB) {
        glyph = '💣';
        cellTitle = '[PHE TA - BOM KHỐI NĂNG LƯỢNG] Bom nổ 3x3 của phe ta (sinh từ combo 5 góc L/T)! Nhấn 2 lần (double-click) hoặc di chuyển tự do để kích nổ vùng 3x3, gây sát thương khủng lên Boss!';
      } else if (color > 0) {
        cellTitle = `Block màu ${color}`;
      }

      const extraText = (kind === KIND_OBSTACLE && charges > 1) ? `<span class="charges">x${charges}</span>`
                      : (kind === KIND_TRAP) ? `<span class="charges danger">${charges}t</span>` : '';
      cell.innerHTML = glyph + extraText;
      cell.title = cellTitle;
      cell.setAttribute('aria-label', `Ô ${x},${y} - ${cellTitle}`);
    }
  }
}

function renderBoss(bossBuffs) {
  const broken = M._m3_boss_broken() === 1;
  const hpPct = Math.max(0, Math.min(1, M._m3_boss_hp_pct()));
  const stagPct = Math.max(0, Math.min(1, M._m3_stagger_pct()));
  const phase = M._m3_boss_phase ? M._m3_boss_phase() : 1;
  const totalPhases = M._m3_boss_total_phases ? M._m3_boss_total_phases() : 1;
  const selfBuffs = M._m3_boss_self_buffs ? M._m3_boss_self_buffs() : 0;

  const isCharging = M._m3_boss_charging && M._m3_boss_charging() === 1;
  const breakCur = M._m3_boss_break_cur ? M._m3_boss_break_cur() : 0;
  const breakReq = M._m3_boss_break_req ? M._m3_boss_break_req() : 0;

  const phaseTag = totalPhases > 1 ? ` (Phase ${phase}/${totalPhases})` : '';
  const buffTag = selfBuffs > 0 ? ` [Atk +${selfBuffs * 10}%]` : '';
  const chargeTag = isCharging ? ` ⚡ [NẠP TUYỆT KĨ: Combo >= ${breakReq}]` : '';
  $('bossName').textContent = M.UTF8ToString(M._m3_boss_name()) + phaseTag + buffTag + chargeTag;
  $('bossHpText').textContent = `${M._m3_boss_hp().toFixed(0)} / ${M._m3_boss_hp_max().toFixed(0)}`;
  $('bossHpBar').style.width = (hpPct * 100).toFixed(1) + '%';
  $('staggerText').textContent = broken
    ? `ĐÃ VỠ (còn ${M._m3_boss_break_turns()} lượt boss)`
    : `${(stagPct * 100).toFixed(0)}%`;
  $('staggerBar').style.width = (stagPct * 100).toFixed(1) + '%';
  $('breakBadge').hidden = !broken && !isCharging;
  if (isCharging) {
    $('breakBadge').textContent = `NẠP TUYỆT KĨ: PHÁ CHIÊU COMBO (${breakCur}/${breakReq})`;
    $('breakBadge').className = 'badge badge-break charging';
  } else if (broken) {
    $('breakBadge').textContent = 'STAGGER VỠ - BREAK';
    $('breakBadge').className = 'badge badge-break';
  }

  const bossBuffsEl = $('bossBuffs');
  if (bossBuffsEl) {
    bossBuffsEl.innerHTML = '';
    (bossBuffs || []).forEach(b => {
      const badge = document.createElement('span');
      badge.className = `buff-badge ${b.cssClass}`;
      badge.innerHTML = `${b.icon} ${b.label} <span class="tooltip">${b.tooltip}</span>`;
      bossBuffsEl.appendChild(badge);
    });
  }

  $('turnText').textContent = String(M._m3_turn());
  const movesLeft = M._m3_moves_left();
  const movesMax = M._m3_moves_per_turn();
  const movesUsed = movesMax - movesLeft;
  const dots = '●'.repeat(movesLeft) + '○'.repeat(movesUsed);
  $('movesText').innerHTML = `${movesLeft} / ${movesMax} <span style="display:block;font-size:10px;color:var(--accent);letter-spacing:1px">${dots}</span>`;
  $('obstacleText').textContent = String(M._m3_obstacles());
  $('starText').textContent = String(M._m3_stars());

  const teamPct = Math.max(0, Math.min(1, M._m3_team_hp_pct()));
  $('teamHpText').textContent = (teamPct * 100).toFixed(0) + '%';
  $('teamHpBar').style.width = (teamPct * 100).toFixed(1) + '%';
}

function renderTeam(memberBuffs) {
  const count = M._m3_member_count();
  const intentAction = M._m3_boss_intent_action ? M._m3_boss_intent_action() : -1;
  const intentTarget = M._m3_boss_intent_target ? M._m3_boss_intent_target() : -1;

  if (teamEl) {
    teamEl.classList.toggle('boss-target-aoe', intentAction === 0);
  }

  if (teamEl.children.length !== count) {
    teamEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'member';
      card.innerHTML = `
        <div class="member-head">
          <span class="member-name"></span>
          <span class="member-role"></span>
        </div>
        <div class="member-bars">
          <div class="mini-bar mini-hp"><i></i></div>
          <div class="mini-bar mini-ult"><i></i></div>
        </div>
        <div class="member-buffs buff-list"></div>
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
    const alive = M._m3_member_alive(i) === 1;
    const cool = M._m3_member_cooldown(i);
    const ultPct = M._m3_member_ultimate_pct(i);
    const color = M._m3_member_color(i);
    const roleId = M._m3_member_role_id ? M._m3_member_role_id(i) : -1;
    const isTargetedSingle = (intentAction === 1 && intentTarget === i && alive);

    const dmgType = M._m3_member_damage_type ? M._m3_member_damage_type(i) : 0;
    const dmgStr = (roleId === 0 || roleId === 6) ? (dmgType === 1 ? ' · Ma pháp' : ' · Vật lý') : '';

    card.classList.toggle('down', !alive);
    card.classList.toggle('boss-target-single', isTargetedSingle);
    card.style.borderLeftColor = color ? `var(--c${color})` : '#64748b';
    card.querySelector('.member-name').textContent = M.UTF8ToString(M._m3_member_name(i));
    card.querySelector('.member-role').textContent =
      M.UTF8ToString(M._m3_member_role(i)) + dmgStr + (color ? ` · nối màu ${color}` : ' · không có block');


    card.querySelector('.mini-hp i').style.width = (Math.max(0, Math.min(1, M._m3_member_hp_pct(i))) * 100).toFixed(1) + '%';
    card.querySelector('.mini-ult i').style.width = Math.min(100, ultPct) + '%';

    const buffsEl = card.querySelector('.member-buffs');
    if (buffsEl) {
      buffsEl.innerHTML = '';
      if (alive && memberBuffs && memberBuffs[i]) {
        memberBuffs[i].forEach(b => {
          const badge = document.createElement('span');
          badge.className = `buff-badge ${b.cssClass}`;
          badge.innerHTML = `${b.icon} ${b.label} <span class="tooltip">${b.tooltip}</span>`;
          buffsEl.appendChild(badge);
        });
      }
    }

    const skillBtn = card.querySelector('[data-skill]');
    const ultBtn = card.querySelector('[data-ult]');
    skillBtn.querySelector('.label').textContent = cool > 0 ? `Hồi ${cool}` : M.UTF8ToString(M._m3_member_skill(i));
    ultBtn.querySelector('.label').textContent = M.UTF8ToString(M._m3_member_ultimate(i));
    skillBtn.disabled = !alive || cool > 0;
    ultBtn.disabled = !alive || ultPct < 100;
  }

  $('btnEndTurn').disabled = M._m3_finished() === 1;
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
  const start = Math.max(0, count - 14);
  logEl.innerHTML = '';
  for (let i = start; i < count; i++) {
    const li = document.createElement('li');
    li.textContent = M.UTF8ToString(M._m3_log_line(i));
    logEl.appendChild(li);
  }
}

function renderBanner() {
  // Đã đóng tay, hoặc trận chưa kết thúc -> không hiện bảng kết quả.
  if (M._m3_finished() !== 1 || bannerDismissed) { hideBanner(); return; }

  const win = M._m3_victory() === 1;
  const banner = $('banner');
  banner.hidden = false;
  banner.classList.toggle('win', win);
  banner.classList.toggle('lose', !win);
  $('bannerTitle').textContent = win ? `CHIẾN THẮNG - ${M._m3_stars()} sao` : 'THẤT BẠI';
  $('bannerText').textContent = win
    ? 'Boss đã bị hạ. Đánh giá sao dựa trên nhiệm vụ map.'
    : 'Toàn đội đã gục. Chỉnh đội hình hoặc cách nối block rồi thử lại.';
}

function hideBanner() { $('banner').hidden = true; }

// Người chơi tự đóng bảng kết quả (nút ×, bấm ra ngoài, hoặc Esc).
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
// Tự kiểm tra (?selftest=1): chơi hết trận rồi kiểm tra đường đi của bảng kết quả
// ---------------------------------------------------------------------------
function runSelfTest() {
  const results = [];
  const banner = $('banner');
  const bannerVisible = () => getComputedStyle(banner).display !== 'none';

  results.push(['bảng kết quả ẩn khi vào game', !bannerVisible()]);

  let guard = 0;
  while (M._m3_finished() === 0 && guard < 800) {
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
  results.push(['chơi lại map thì bảng kết quả vẫn ẩn', !bannerVisible()]);
  results.push(['trận mới đã bắt đầu', M._m3_finished() === 0 && M._m3_turn() === 1]);

  const failed = results.filter(([, ok]) => !ok);
  document.title = `SELFTEST ${failed.length === 0 ? 'OK' : 'FAIL'} (${results.length - failed.length}/${results.length})`;
  $('engineText').textContent = 'SELFTEST ' + results.map(([name, ok]) => `${ok ? 'OK' : 'FAIL'} - ${name}`).join(' | ');
}

boot();
