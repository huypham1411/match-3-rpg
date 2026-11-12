/* ============================================================================
   pixelart.js - Bộ hình pixel 2D cho nhân vật / quái / boss
   ----------------------------------------------------------------------------
   Cách tổ chức để mỗi class có NHIỀU biến thể mà không phải vẽ lại từ đầu:
     1) SPRITES      : hình gốc (lưới ký tự 16x16) cho từng class và từng cấp địch.
     2) VARIANT_STYLES: danh sách biến thể của mỗi class/cấp. Mỗi biến thể có thể
        - base   : dùng hình gốc nào (để biến thể có dáng khác nhau, vd sói/thạch nhân)
        - recolor: đổi màu một ký tự (vd 'g' xanh lá -> xanh dương cho bầy quái khác)
        - accent : đổi màu chính 'a' / 'A'
        - overlay: chấm thêm vài pixel chi tiết (mào giáp, viên ngọc, sọc vải...)
     Khoá tra hình có dạng "<class>.<biến thể>", vd "attacker.2", "boss.3".

   Muốn thay bằng hình thật: dùng registerSpriteSheet("<class>.<biến thể>", {...})
   ở cuối file, hoặc sửa lưới ký tự trong SPRITES.

   Quy ước ký tự:
     '.' trong suốt   'k' viền đậm   'w' sáng    'W' sáng xám   'T' trắng
     'a' MÀU CHÍNH (đổi được)        'A' màu chính đậm
     's' thép  'S' thép đậm  'd' tối  'm' xám đá  'h' nâu  'H' nâu đậm
     'r' đỏ  'b' lam  'g' lục  'y' hổ phách  'p' tím  'c' cyan  'z' chàm
     'o' cam  'f' vàng sáng  'e' lục đậm  'q' lục rêu
   ============================================================================ */

export const PALETTE = {
  '.': null,
  k: '#0a0e16',
  w: '#f1f5fd',
  W: '#c7d2e5',
  T: '#f8fafc',
  s: '#9fb0cc',
  S: '#5b6b8c',
  d: '#26303f',
  r: '#ef4444',
  b: '#3b82f6',
  g: '#22c55e',
  y: '#f5a524',
  p: '#a855f7',
  c: '#22d3ee',
  z: '#7c5cff',
  o: '#fb923c',
  f: '#fde047',
  e: '#10b981',
  q: '#166534',
  m: '#94a3b8',
  h: '#8a5a2b',
  H: '#4a2f14',
};

// ---------------------------------------------------------------------------
// Hình gốc 16x16
// ---------------------------------------------------------------------------
export const SPRITES = {
  attacker: [
    '................', '......kkkk......', '.....kaaaak.....', '.....kwwwwk.....',
    '.....kwkkwk.....', '.....kwwwwk.....', '......kkkk......', '...kkkaaaakkk...',
    '..kkaaaaaaaakk..', '..kAaaaaaaaAk.s.', '..kkaaaaaaaaks..', '...kkaaaaaakk.s.',
    '....kaak.kaak.s.', '....kaak.kaak.s.', '....kddk.kddk...', '.....kk...kk....',
  ],
  supporter: [
    '................', '.....kkkkkk.....', '....kbbbbbbk....', '....kbwwwwbk....',
    '....kbwkkwbk....', '....kbwwwwbk....', '.....kbbbbk.....', '...kkbbbbbbkk...',
    '..kbbbbbbbbbbk..', '..kbWbbbbbbWbk..', '..kbbbbbbbbbbk.s', '...kbbbbbbbbk.cs',
    '....kbbk.kbbk.cs', '....kbbk.kbbk..s', '....kddk.kddk..s', '.....kk...kk...s',
  ],
  healer: [
    '......ffff......', '......kkkk......', '.....kggggk.....', '.....kwwwwk.....',
    '.....kwkkwk.....', '.....kwwwwk.....', '......kkkk......', '...kkwwwwwwkk...',
    '..kwwgggggwwk...', '..kwwgggggwwk...', '..kwwgggggwwk...', '...kwwgggwwk....',
    '....kwwk.kwwk...', '....kwwk.kwwk...', '....kddk.kddk...', '.....kk...kk....',
  ],
  defender: [
    '................', '......kkkk......', '.....kyyyyk.....', '.....kwwwwk.....',
    '.....kwkkwk.....', '.....kwwwwk.....', '......kkkk......', '...kkksssssskkk.',
    '..ksssssssssssk.', '..ksssssssssssk.', '..ksssyyyyysssk.', '...ksssssssssk..',
    '....kssk.kssk...', '....kssk.kssk...', '....kddk.kddk...', '.....kk...kk....',
  ],
  counter: [
    '................', '......kkkk......', '.....kppppk.....', '.....kwwwwk.....',
    '.....kwkkwk.....', '.....kppppk.....', '......kkkk......', '...kkkppppkkk...',
    '..kppppppppppks.', '..kpPppppppPpks.', '..kppppppppppks.', '...kpppppppppk..',
    '....kppk.kppk...', '....kppk.kppk...', '....kddk.kddk...', '.....kk...kk....',
  ],
  deflecter: [
    '................', '......kkkk......', '.....kcccck.....', '.....kwwwwk.....',
    '.....kwkkwk.....', '.....kwwwwk.....', '......kkkk......', '...kkkccccckkk..',
    '..cccccccccccc..', '..ccWWccccWWcc..', '..cccccccccccc..', '...cccccccccc...',
    '....kcck.kcck...', '....kcck.kcck...', '....kddk.kddk...', '.....kk...kk....',
  ],
  mage: [
    '................', '.....kkkkkk.....', '....kzzzzzzk....', '....kzwwwwzk....',
    '....kzwkkwzk....', '....kzwwwwzk....', '.....kzzzzk.....', '...kkzzzzzzkk...',
    '..kzzzzzzzzzzk..', '..kzzzzzzzzzzk.o', '..kzzzzzzzzzzkoo', '...kzzzzzzzzk.oo',
    '....kzzk.kzzk.oo', '....kzzk.kzzk.o.', '....kddk.kddk...', '.....kk...kk....',
  ],

  // ------------------------------- QUÁI -------------------------------
  minion: [
    '................', '................', '................', '................',
    '......kkkk......', '.....kggggk.....', '.....kgkkgk.....', '.....kggggk.....',
    '......kkkk......', '...kkgggggkk....', '..kgggggggggk...', '..kggggggggk....',
    '...kggk.kggk....', '...kddk.kddk....', '....kk...kk.....', '................',
  ],
  // Dáng SÓI: biến thể quái thường thứ hai (nhanh, ít máu).
  wolf: [
    '................', '................', '..kk........kk..', '.kmmk......kmmk.',
    '.kmmkkkkkkkkmmk.', '.kmmmmmmmmmmmmk.', '.kmkrrkkrrkmmmk.', '.kmmmmmmmmmmmmk.',
    '.kmmkkmmmmkkmmk.', '..kkkmmmmmmkkk..', '...kmmmmmmmmk...', '...kmmkkkkmmk...',
    '...kmmk..kmmk...', '...kddk..kddk...', '....kk....kk....', '................',
  ],
  elite: [
    '................', '.....kkkkkk.....', '....kddddddk....', '....kdwwwwdk....',
    '....kdwkkwdk....', '....kdwwwwdk....', '.....kddddk.....', '...kkddddddkk...',
    '..kddrddddrrdk..', '..kddddrrddddk..', '..kdddddddddddk.', '...kdddddddddk..',
    '....kddk.kddk...', '....kddk.kddk...', '....kddk.kddk...', '.....kk...kk....',
  ],
  // Dáng THẠCH NHÂN: biến thể tinh anh thứ hai (trâu, kháng vật lý).
  golem: [
    '................', '..kkk......kkk..', '.kmmkkkkkkkkmmk.', '.kmmmmmmmmmmmmk.',
    '.kmffffffffffmk.', '.kmmmmmmmmmmmmk.', '.kmmkmmmmmmkmmk.', 'kmmmmmmmmmmmmmmk',
    'kmmmhhhhhhhhmmmk', 'kmmmhhhhhhhhmmmk', 'kmmmmmmmmmmmmmmk', '.kmmmmmmmmmmmmk.',
    '..kmmmk..kmmmk..', '..kmmmk..kmmmk..', '..kmmmkkkkmmmk..', '..kkkk....kkkk..',
  ],
  midboss: [
    '................', '...kkk....kkk...', '..kmmmkkkkmmmk..', '..kmmmmmmmmmmk..',
    '..kmffffffffmk..', '..kmmmmmmmmmmk..', '..kmmkmmmmkmmk..', '.kmmmmmmmmmmmmk.',
    'kmmmhhhhhhmmmmk.', 'kmmmhhhhhhmmmmk.', 'kmmmmmmmmmmmmmkk', '.kmmmmmmmmmmmmk.',
    '..kmmmk.kmmmk...', '..kmmmk.kmmmk...', '..kmmmkkkmmmk...', '..kkkk...kkkk...',
  ],
  boss: [
    '................', '..kk........kk..', '.kaakk....kkaak.', '.kaaakkkkkkaaak.',
    '..kkaaaaaaaakk..', '...kwwkkkkwwk...', '...kwrrrrrrwk...', '....kryyyyrk....',
    '.....kyyyyk.....', '....kkaaaakk....', '...kaaaaaaaak...', '..kaaAaaaaAaaak.',
    '..kkaaaaaaaakk..', '...kkaaaaaakk...', '....kddk.kddk...', '.....kk...kk....',
  ],
};

// ---------------------------------------------------------------------------
// BIẾN THỂ: mỗi class / mỗi cấp địch có 3 biến thể
//   key     : khoá tra ("attacker.2")
//   base    : hình gốc dùng làm nền
//   accent  : màu cho 'a' và 'A'
//   recolor : đổi màu theo ký tự (vd 'g' -> xanh dương)
//   overlay : [x, y, ký tự] chấm thêm chi tiết
// ---------------------------------------------------------------------------
export const VARIANT_STYLES = {
  // ------------------------------ NHÂN VẬT ------------------------------
  attacker: [
    { base: 'attacker', accent: { a: '#ef4444', A: '#7f1d1d' }, overlay: [] },
    { base: 'attacker', accent: { a: '#94a3b8', A: '#334155' },
      overlay: [[7, 1, 'f'], [8, 1, 'f'], [6, 4, 'r'], [9, 4, 'r']] },
    { base: 'attacker', accent: { a: '#7c3aed', A: '#4c1d95' },
      overlay: [[7, 0, 'f'], [8, 0, 'f'], [3, 9, 'f'], [12, 9, 'f']] },
  ],
  supporter: [
    { base: 'supporter', accent: {}, recolor: { b: '#3b82f6' }, overlay: [] },
    { base: 'supporter', accent: {}, recolor: { b: '#10b981' }, overlay: [[14, 10, 'f'], [14, 11, 'f']] },
    { base: 'supporter', accent: {}, recolor: { b: '#e2e8f0' }, overlay: [[15, 9, 'f'], [15, 10, 'f'], [15, 11, 'f']] },
  ],
  healer: [
    { base: 'healer', accent: {}, recolor: { g: '#22c55e' }, overlay: [] },
    { base: 'healer', accent: {}, recolor: { g: '#f9a8d4', w: '#fff7fb' }, overlay: [[7, 0, 'T'], [8, 0, 'T']] },
    { base: 'healer', accent: {}, recolor: { g: '#facc15', w: '#fffbeb' }, overlay: [[6, 1, 'f'], [9, 1, 'f']] },
  ],
  defender: [
    { base: 'defender', accent: {}, recolor: { y: '#f5a524' }, overlay: [] },
    { base: 'defender', accent: {}, recolor: { y: '#60a5fa', s: '#cbd5e1' }, overlay: [[2, 9, 'f'], [13, 9, 'f']] },
    { base: 'defender', accent: {}, recolor: { y: '#f87171', s: '#b45309' }, overlay: [[7, 10, 'k'], [8, 10, 'k']] },
  ],
  counter: [
    { base: 'counter', accent: {}, recolor: { p: '#a855f7' }, overlay: [] },
    { base: 'counter', accent: {}, recolor: { p: '#1f2937', P: '#7f1d1d' }, overlay: [[7, 4, 'r'], [8, 4, 'r']] },
    { base: 'counter', accent: {}, recolor: { p: '#22d3ee' }, overlay: [[7, 1, 'w'], [8, 1, 'w']] },
  ],
  deflecter: [
    { base: 'deflecter', accent: {}, recolor: { c: '#22d3ee' }, overlay: [] },
    { base: 'deflecter', accent: {}, recolor: { c: '#f472b6' }, overlay: [[7, 0, 'f'], [8, 0, 'f']] },
    { base: 'deflecter', accent: {}, recolor: { c: '#e2e8f0' }, overlay: [[3, 9, 'f'], [12, 9, 'f']] },
  ],
  mage: [
    { base: 'mage', accent: {}, recolor: { z: '#7c5cff' }, overlay: [] },
    { base: 'mage', accent: {}, recolor: { z: '#0ea5e9', o: '#a5f3fc' }, overlay: [[5, 2, 'T'], [10, 2, 'T']] },
    { base: 'mage', accent: {}, recolor: { z: '#15803d', o: '#fde047' }, overlay: [[7, 0, 'f'], [8, 0, 'f']] },
  ],

  // -------------------------------- QUÁI --------------------------------
  minion: [
    { base: 'minion', accent: {}, recolor: { g: '#22c55e' }, overlay: [] },
    { base: 'wolf', accent: {}, recolor: { m: '#60a5fa' }, overlay: [] },
    { base: 'minion', accent: {}, recolor: { g: '#a855f7' }, overlay: [[7, 1, 'r'], [8, 1, 'r']] },
  ],
  elite: [
    { base: 'elite', accent: {}, recolor: { d: '#26303f' }, overlay: [] },
    { base: 'golem', accent: {}, recolor: { m: '#94a3b8', h: '#cbd5e1' }, overlay: [] },
    { base: 'elite', accent: {}, recolor: { d: '#14532d' }, overlay: [[7, 2, 'f'], [8, 2, 'f']] },
  ],
  midboss: [
    { base: 'midboss', accent: {}, recolor: { m: '#f97316' }, overlay: [] },
    { base: 'midboss', accent: {}, recolor: { m: '#38bdf8', h: '#0ea5e9' }, overlay: [[7, 4, 'w'], [8, 4, 'w']] },
    { base: 'midboss', accent: {}, recolor: { m: '#a8a29e', h: '#57534e' }, overlay: [[4, 1, 'f'], [11, 1, 'f']] },
  ],
  boss: [
    { base: 'boss', accent: { a: '#ef4444', A: '#7f1d1d' }, overlay: [] },
    { base: 'boss', accent: { a: '#f5a524', A: '#8a5a08' }, overlay: [[7, 2, 'T'], [8, 2, 'T']] },
    { base: 'boss', accent: { a: '#7c3aed', A: '#3b0764' }, overlay: [[3, 6, 'f'], [12, 6, 'f'], [7, 8, 'f']] },
  ],
};

// Danh sách khoá biến thể của mỗi class / cấp (UI dùng để bày cho người chơi chọn).
export function variantKeys(group) {
  const List = VARIANT_STYLES[String(group || '').toLowerCase()];
  if (!List) { return []; }
  return List.map((_, i) => `${String(group).toLowerCase()}.${i + 1}`);
}

// Tách "attacker.2" -> { group: 'attacker', index: 1 }
function parseKey(spriteKey) {
  const Key = String(spriteKey || '').toLowerCase();
  const Dot = Key.lastIndexOf('.');
  if (Dot < 0) { return { group: Key, index: 0 }; }
  const Group = Key.slice(0, Dot);
  const Num = parseInt(Key.slice(Dot + 1), 10);
  return { group: Group, index: Number.isFinite(Num) && Num > 0 ? Num - 1 : 0 };
}

// Tra biến thể -> { grid, accent, recolor, overlay, key }
export function resolveSprite(spriteKey) {
  const { group, index } = parseKey(spriteKey);
  const List = VARIANT_STYLES[group];

  if (List && List.length > 0) {
    const Style = List[Math.min(index, List.length - 1)];
    const Grid = SPRITES[Style.base] || SPRITES.minion;
    return {
      grid: Grid,
      accent: Style.accent || {},
      recolor: Style.recolor || {},
      overlay: Style.overlay || [],
      key: `${group}.${index + 1}`,
    };
  }

  // Không khai báo biến thể -> dùng hình gốc cùng tên, không đổi màu.
  const Grid = SPRITES[group] || SPRITES.minion;
  return { grid: Grid, accent: {}, recolor: {}, overlay: [], key: group };
}

// Giữ tương thích: trả về đúng lưới ký tự của một khoá.
export function spriteFor(spriteKey) {
  return resolveSprite(spriteKey).grid;
}

// ---------------------------------------------------------------------------
// ANIMATION: các khung tư thế cơ bản
// ---------------------------------------------------------------------------
export const ANIM_FRAMES = {
  idle:   [0, -1],
  attack: [1, 0],
  hurt:   [-1, 0],
  cast:   [-1, -2],
};

// Bảng sprite sheet thật (thay cho pixel dựng bằng dữ liệu).
export const SPRITE_SHEETS = {};

// Đăng ký sprite sheet thật cho 1 khoá (vd 'boss.1'):
//   registerSpriteSheet('boss.1', { src: 'assets/boss.png', frameW: 32, frameH: 32, frames: 6, fps: 8 });
export function registerSpriteSheet(key, cfg) {
  SPRITE_SHEETS[String(key).toLowerCase()] = cfg;
}

// ---------------------------------------------------------------------------
// Vẽ sprite lên canvas đã có (canvas 16x16, phóng to bằng CSS pixelated).
//   opts: { offsetX, offsetY, flash, accent }
// ---------------------------------------------------------------------------
export function drawSprite(canvas, spriteKey, accentKey, opts) {
  const O = opts || {};
  const Resolved = resolveSprite(spriteKey);
  const Palette = Object.assign({}, PALETTE, Resolved.accent, Resolved.recolor, O.accent || {});
  const Size = 16;
  const DX = Math.round(O.offsetX || 0);
  const DY = Math.round(O.offsetY || 0);

  canvas.width = Size;
  canvas.height = Size;
  const Ctx = canvas.getContext('2d');
  Ctx.clearRect(0, 0, Size, Size);

  for (let Y = 0; Y < Size; Y++) {
    const Row = Resolved.grid[Y] || '';
    for (let X = 0; X < Size; X++) {
      const Ch = Row[X] || '.';
      const Color = Palette[Ch];
      if (!Color) { continue; }
      Ctx.fillStyle = Color;
      Ctx.fillRect(X + DX, Y + DY, 1, 1);
    }
  }

  // Chi tiết riêng của biến thể (mào giáp, viên ngọc, sọc vải...).
  for (const Mark of Resolved.overlay) {
    const Color = Palette[Mark[2]];
    if (!Color) { continue; }
    Ctx.fillStyle = Color;
    Ctx.fillRect(Mark[0] + DX, Mark[1] + DY, 1, 1);
  }

  // Trúng đòn -> nháy trắng cả hình.
  if (O.flash) {
    Ctx.globalCompositeOperation = 'source-atop';
    Ctx.fillStyle = 'rgba(255,255,255,' + O.flash + ')';
    Ctx.fillRect(0, 0, Size, Size);
    Ctx.globalCompositeOperation = 'source-over';
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Tạo <canvas> sprite hoàn chỉnh. Có sprite sheet thật -> phát animation từ ảnh.
// ---------------------------------------------------------------------------
export function makeSprite(spriteKey, accentKey, scale = 4) {
  const Canvas = document.createElement('canvas');
  const Sheet = SPRITE_SHEETS[String(spriteKey || '').toLowerCase()];

  if (Sheet && Sheet.src) {
    const Img = new Image();
    Img.src = Sheet.src;
    const FrameW = Sheet.frameW || 16;
    const FrameH = Sheet.frameH || 16;
    Canvas.width = FrameW;
    Canvas.height = FrameH;
    const Ctx = Canvas.getContext('2d');
    let Frame = 0;
    const Step = () => {
      if (!Img.complete || !Img.naturalWidth) { return; }
      const Count = Sheet.frames || Math.max(1, Math.floor(Img.naturalWidth / FrameW));
      Ctx.clearRect(0, 0, FrameW, FrameH);
      Ctx.drawImage(Img, (Frame % Count) * FrameW, 0, FrameW, FrameH, 0, 0, FrameW, FrameH);
      Frame++;
    };
    Img.addEventListener('load', Step);
    setInterval(Step, Math.max(40, 1000 / (Sheet.fps || 8)));

    Canvas.className = 'pixel-sprite';
    Canvas.style.width = (FrameW * scale) + 'px';
    Canvas.style.height = (FrameH * scale) + 'px';
    Canvas.setAttribute('aria-hidden', 'true');
    return Canvas;
  }

  drawSprite(Canvas, spriteKey, accentKey);
  Canvas.className = 'pixel-sprite';
  Canvas.style.width = (16 * scale) + 'px';
  Canvas.style.height = (16 * scale) + 'px';
  Canvas.setAttribute('aria-hidden', 'true');
  return Canvas;
}

// Tên class trong lõi -> nhóm biến thể
export function spriteKeyForRole(roleName) {
  return `${String(roleName || 'attacker').toLowerCase()}.1`;
}

// Cấp bậc địch (0..3) -> nhóm biến thể
export function spriteKeyForTier(tierIndex) {
  return `${['minion', 'elite', 'midboss', 'boss'][tierIndex] || 'minion'}.1`;
}

// Số biến thể hiện có của một nhóm (UI hiển thị "3 biến thể").
export function variantCount(group) {
  const List = VARIANT_STYLES[String(group || '').toLowerCase()];
  return List ? List.length : 1;
}
