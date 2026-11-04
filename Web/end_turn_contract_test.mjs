// =============================================================================
//  end_turn_contract_test.mjs - Hồi quy QA-API01: mã trả của _m3_end_turn().
//  Hợp đồng: trả 0 khi native từ chối (trận đã kết thúc), state không đổi,
//  có thông báo lỗi; trả 1 ở nước end-turn hợp lệ như các wrapper action khác.
// =============================================================================
import createModule from './dist/m3core.mjs';

function snapshot(M) {
  const members = [];
  for (let i = 0; i < M._m3_member_count(); i++) {
    members.push(`${i}:${M._m3_member_alive(i)}`);
  }
  return JSON.stringify([
    M._m3_turn(), M._m3_moves_left(), M._m3_defeat(), M._m3_victory(), M._m3_finished(),
    M._m3_damage_dealt(), M._m3_damage_taken(), M._m3_event_seq(), M._m3_stagger_pct(),
    M._m3_boss_hp(), M._m3_team_hp_pct(), M._m3_obstacles(), M._m3_total_blocks(),
    members.join(','),
  ]);
}

export async function runEndTurnContractRegression(factory = createModule) {
  const results = [];
  const require = (ok, message) => { if (!ok) { throw new Error(message); } };
  const M = await factory();

  // --- Ca âm tính: spam end-turn đến defeat, rồi gọi end-turn lần nữa. ---
  M._m3_init(0, 1);
  let guard = 0;
  while (!M._m3_defeat() && guard++ < 200) { M._m3_end_turn(); }
  require(M._m3_defeat() === 1, 'fixture did not reach defeat');
  require(M._m3_finished() === 1, 'battle not finished at defeat');
  const before = snapshot(M);
  const seqBefore = M._m3_event_seq();
  const turnBefore = M._m3_turn();
  const rejected = M._m3_end_turn();
  require(rejected === 0, `end-turn after defeat must return 0 (QA-API01), got ${rejected}`);
  require(snapshot(M) === before, 'rejected end-turn mutated state');
  require(M._m3_event_seq() === seqBefore, 'rejected end-turn emitted event');
  require(M._m3_turn() === turnBefore, 'rejected end-turn advanced turn');
  const err = M._m3_last_error ? M.UTF8ToString(M._m3_last_error()) : '';
  require(err.length > 0, 'rejected end-turn must expose _m3_last_error');
  results.push('PASS end-turn after defeat returns 0, state unchanged, error exposed');

  // --- Ca dương tính: trận mới, end-turn hợp lệ phải trả 1 và xử lý lượt. ---
  M._m3_init(0, 20261008);
  require(M._m3_defeat() === 0, 'fresh fixture must not start defeated');
  const beforeValid = snapshot(M);
  const accepted = M._m3_end_turn();
  require(accepted === 1, `valid end-turn must return 1, got ${accepted}`);
  require(snapshot(M) !== beforeValid, 'valid end-turn must process the turn');
  results.push('PASS valid end-turn returns 1 and processes the turn');

  return results;
}

if (typeof process !== 'undefined' && process.versions?.node) {
  const results = await runEndTurnContractRegression();
  results.forEach(line => console.log(line));
  console.log(`WASM EndTurnContract: ${results.length} PASS / 0 FAIL`);
}
