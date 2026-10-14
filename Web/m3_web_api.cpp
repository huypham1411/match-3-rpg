// =============================================================================
//  m3_web_api.cpp  -  Cầu nối C cho JavaScript (biên dịch bằng Emscripten -> WASM)
//  ---------------------------------------------------------------------------
//  Bản chơi web KHÔNG viết lại luật chơi: nó gọi đúng lõi M3:: trong
//  Source/Match3Core. File này chỉ là lớp "vỏ" xuất các hàm phẳng cho JS:
//    - không dùng class/struct qua biên giới WASM (chỉ int/float/char*)
//    - chuỗi trả về nằm trong một buffer tĩnh; JS phải đọc ngay sau mỗi lần gọi
//  Nhờ vậy web và Unreal dùng chung một nguồn luật, sửa một chỗ là cả hai đổi.
// =============================================================================
#include "M3Battle.h"
#include "M3Content.h"
#include "M3Skills.h"
#include "M3Team.h"

#include <string>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define M3WEB_API extern "C" EMSCRIPTEN_KEEPALIVE
#else
#define M3WEB_API extern "C"
#endif

namespace
{
	M3::FBattle gBattle;
	bool  gActive = false;
	int   gStage = 0;

	// Buffer cho chuỗi UTF-8 trả về JS (chỉ dùng 1 chuỗi một lúc).
	std::string gText;
	std::string gLastError;

	// Ô gợi ý nước đi hợp lệ.
	int   gHintAX = -1, gHintAY = -1, gHintBX = -1, gHintBY = -1;

	const char* Keep(const std::string& Text)
	{
		gText = Text;
		return gText.c_str();
	}

	bool EnsureActive()
	{
		if (!gActive) { gBattle.Setup(M3::FContentLibrary::DefaultBattleSetup(4, 20261008u)); gActive = true; }
		return true;
	}

	void RefreshHint()
	{
		gHintAX = gHintAY = gHintBX = gHintBY = -1;
		if (!gActive) { return; }

		M3::FCell A, B;
		if (gBattle.Board().FindAnyPossibleMove(A, B))
		{
			gHintAX = A.X; gHintAY = A.Y;
			gHintBX = B.X; gHintBY = B.Y;
		}
	}
}

// -----------------------------------------------------------------------------
// Khởi tạo / chọn map
// -----------------------------------------------------------------------------
M3WEB_API int m3_init(int stageIndex, unsigned seed)
{
	const std::vector<M3::FBattleSetup> Stages = M3::FContentLibrary::CampaignStages(seed);
	if (Stages.empty())
	{
		gBattle.Setup(M3::FContentLibrary::DefaultBattleSetup(4, seed));
		gStage = 0;
	}
	else
	{
		gStage = (stageIndex < 0) ? 0 : (stageIndex % static_cast<int>(Stages.size()));
		gBattle.Setup(Stages[static_cast<size_t>(gStage)]);
	}
	gActive = true;
	RefreshHint();
	return gStage;
}

M3WEB_API int m3_stage_count()
{
	return static_cast<int>(M3::FContentLibrary::CampaignStages().size());
}

M3WEB_API const char* m3_stage_name(int index)
{
	const std::vector<M3::FBattleSetup> Stages = M3::FContentLibrary::CampaignStages();
	if (index < 0 || index >= static_cast<int>(Stages.size())) { return Keep("?"); }
	return Keep(Stages[static_cast<size_t>(index)].BossName);
}

// -----------------------------------------------------------------------------
// Bàn nối
// -----------------------------------------------------------------------------
M3WEB_API int m3_width()  { EnsureActive(); return gBattle.Board().Width(); }
M3WEB_API int m3_height() { EnsureActive(); return gBattle.Board().Height(); }

// Màu: 0 = không màu, 1..6 = Đỏ, Xanh dương, Xanh lá, Vàng, Tím, Cyan
M3WEB_API int m3_cell_color(int x, int y)
{
	EnsureActive();
	const M3::FBlock* Block = gBattle.Board().TryGet(x, y);
	return Block ? static_cast<int>(Block->Color) : 0;
}

// Loại: 0 thường, 1 vật cản, 2 nổ hàng/cột, 3 nổ vuông, 4 cầu vồng, -1 ô trống
M3WEB_API int m3_cell_kind(int x, int y)
{
	EnsureActive();
	const M3::FBlock* Block = gBattle.Board().TryGet(x, y);
	if (!Block) { return -1; }
	if (Block->IsEmpty()) { return -1; }
	return static_cast<int>(Block->Kind);
}

M3WEB_API int m3_cell_charges(int x, int y)
{
	EnsureActive();
	const M3::FBlock* Block = gBattle.Board().TryGet(x, y);
	return Block ? Block->Charges : 0;
}

M3WEB_API int m3_cell_variant(int x, int y)
{
	EnsureActive();
	const M3::FBlock* Block = gBattle.Board().TryGet(x, y);
	return Block ? Block->Variant : 0;
}

// Ô bị địch khoá (Phong Ấn): 1 = đang bị khoá, 0 = bình thường.
M3WEB_API int m3_cell_locked(int x, int y)
{
	EnsureActive();
	const M3::FBlock* Block = gBattle.Board().TryGet(x, y);
	return (Block && Block->bLocked) ? 1 : 0;
}

M3WEB_API const char* m3_last_error()
{
	return Keep(gLastError);
}

// -----------------------------------------------------------------------------
// Hành động
// -----------------------------------------------------------------------------
M3WEB_API int m3_try_swap(int x1, int y1, int x2, int y2)
{
	EnsureActive();
	const M3::FActionResult Result = gBattle.PlayerSwap(M3::MakeCell(x1, y1), M3::MakeCell(x2, y2));
	if (!Result.IsOk()) { gLastError = Result.Message; }
	else { gLastError.clear(); }
	RefreshHint();
	return Result.IsOk() ? 1 : 0;
}

M3WEB_API int m3_activate_cell(int x, int y)
{
	EnsureActive();
	const M3::FActionResult Result = gBattle.ActivateSpecialCell(M3::MakeCell(x, y));
	RefreshHint();
	return Result.IsOk() ? 1 : 0;
}

M3WEB_API int m3_use_skill(int memberIndex)
{
	EnsureActive();
	return gBattle.UseBasicSkill(memberIndex).IsOk() ? 1 : 0;
}

M3WEB_API int m3_use_skill_target(int memberIndex, int targetX, int targetY)
{
	EnsureActive();
	return gBattle.UseBasicSkill(memberIndex, M3::MakeCell(targetX, targetY)).IsOk() ? 1 : 0;
}

M3WEB_API int m3_use_ultimate(int memberIndex)
{
	EnsureActive();
	return gBattle.UseUltimate(memberIndex).IsOk() ? 1 : 0;
}

M3WEB_API int m3_end_turn()
{
	EnsureActive();
	gBattle.EndTurn();
	RefreshHint();
	return 1;
}

M3WEB_API int m3_hint_ax() { return gHintAX; }
M3WEB_API int m3_hint_ay() { return gHintAY; }
M3WEB_API int m3_hint_bx() { return gHintBX; }
M3WEB_API int m3_hint_by() { return gHintBY; }

// -----------------------------------------------------------------------------
// Trạng thái trận
// -----------------------------------------------------------------------------
M3WEB_API int   m3_turn()         { EnsureActive(); return gBattle.Turn(); }
M3WEB_API int   m3_moves_left()   { EnsureActive(); return gBattle.MovesLeft(); }
M3WEB_API int   m3_moves_per_turn(){ EnsureActive(); return gBattle.Balance().MovesPerTurn; }
M3WEB_API int   m3_obstacles()    { EnsureActive(); return gBattle.Board().ObstacleCount(); }
M3WEB_API int   m3_boss_phase()        { EnsureActive(); return gBattle.Boss().CurrentPhase; }
M3WEB_API int   m3_boss_total_phases() { EnsureActive(); return gBattle.Boss().TotalPhases; }
M3WEB_API int   m3_boss_self_buffs()   { EnsureActive(); return gBattle.Boss().SelfBuffStacks; }
M3WEB_API int   m3_boss_intent_action() { EnsureActive(); return static_cast<int>(gBattle.Boss().IntentAction); }
M3WEB_API int   m3_boss_intent_target() { EnsureActive(); return gBattle.Boss().IntentTargetMemberIndex; }
M3WEB_API int   m3_boss_charging()      { EnsureActive(); return gBattle.Boss().bCharging ? 1 : 0; }
M3WEB_API int   m3_boss_break_req()     { EnsureActive(); return gBattle.Boss().SkillBreakRequired; }
M3WEB_API int   m3_boss_break_cur()     { EnsureActive(); return gBattle.Boss().SkillBreakCurrent; }
M3WEB_API int   m3_unlock_skill_node(int memberIndex, int nodeIndex)
{
	EnsureActive();
	M3::FCharacterState* M = gBattle.Party().TryGet(memberIndex);
	if (!M) { return 0; }
	const bool Ok = M->UnlockSkillNode(nodeIndex);
	if (Ok) { gBattle.Party().RecomputeStats(gBattle.Balance()); }
	return Ok ? 1 : 0;
}

M3WEB_API float m3_boss_hp_pct()  { EnsureActive(); return gBattle.Boss().HpPercent(); }
M3WEB_API float m3_stagger_pct()  { EnsureActive(); return gBattle.Boss().StaggerPercent(); }
M3WEB_API int   m3_boss_broken()  { EnsureActive(); return gBattle.Boss().bBroken ? 1 : 0; }
M3WEB_API int   m3_boss_break_turns() { EnsureActive(); return gBattle.Boss().BreakTurnsLeft; }
M3WEB_API float m3_boss_hp()      { EnsureActive(); return gBattle.Boss().Hp; }
M3WEB_API float m3_boss_hp_max()  { EnsureActive(); return gBattle.Boss().HpMax; }
M3WEB_API float m3_team_hp_pct()  { EnsureActive(); return gBattle.Party().TotalHpMax() > 0.f ? gBattle.Party().TotalHp() / gBattle.Party().TotalHpMax() : 0.f; }
M3WEB_API int   m3_stars()        { EnsureActive(); return gBattle.EvaluateStars(); }
M3WEB_API int   m3_victory()      { EnsureActive(); return gBattle.IsVictory() ? 1 : 0; }
M3WEB_API int   m3_defeat()       { EnsureActive(); return gBattle.IsDefeat() ? 1 : 0; }
M3WEB_API int   m3_finished()     { EnsureActive(); return gBattle.IsFinished() ? 1 : 0; }
M3WEB_API float m3_damage_dealt() { EnsureActive(); return gBattle.TotalDamageDealt(); }
M3WEB_API float m3_damage_taken() { EnsureActive(); return gBattle.TotalDamageTaken(); }
M3WEB_API int   m3_total_blocks() { EnsureActive(); return gBattle.LastResolve().TotalBlocksCleared; }
M3WEB_API int   m3_last_cascade_count() { EnsureActive(); return gBattle.LastResolve().CascadeCount; }
M3WEB_API int   m3_added_charge() { EnsureActive(); return gBattle.Balance().UltimateChargePerBlock; }


M3WEB_API const char* m3_boss_name() { EnsureActive(); return Keep(gBattle.Boss().Name); }

// -----------------------------------------------------------------------------
// Nhân vật trong đội
// -----------------------------------------------------------------------------
M3WEB_API int m3_member_count() { EnsureActive(); return gBattle.Party().MemberCount(); }

M3WEB_API const char* m3_member_name(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	return Keep(Member ? Member->Def.Name : "-");
}

M3WEB_API const char* m3_member_role(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	return Keep(Member ? M3::RoleName(Member->Def.Role) : "-");
}

M3WEB_API const char* m3_member_skill(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	if (!Member) { return Keep("-"); }
	return Keep(M3::FSkillCatalog::BasicForRole(Member->Def.Role).Name);
}

M3WEB_API const char* m3_member_ultimate(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	if (!Member) { return Keep("-"); }
	return Keep(M3::FSkillCatalog::UltimateForRole(Member->Def.Role).Name);
}

M3WEB_API int m3_member_color(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	return Member ? static_cast<int>(Member->Def.MatchColor) : 0;
}

M3WEB_API int m3_member_role_id(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	return Member ? static_cast<int>(Member->Def.Role) : -1;
}

M3WEB_API int m3_member_damage_type(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	return Member ? static_cast<int>(Member->Def.DamageType) : 0;
}


M3WEB_API float m3_member_hp_pct(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	return Member ? Member->HpPercent() : 0.f;
}

M3WEB_API int m3_member_ultimate_pct(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	if (!Member) { return 0; }
	const int Max = gBattle.Balance().UltimateMaxCharge;
	return Max > 0 ? (Member->UltimateCharge * 100) / Max : 0;
}

M3WEB_API int m3_member_cooldown(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	return Member ? Member->BasicCooldown : 0;
}

M3WEB_API int m3_member_alive(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	return (Member && Member->bAlive) ? 1 : 0;
}

M3WEB_API int m3_member_deflect_stacks(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	return Member ? Member->DeflectStacks : 0;
}

// -----------------------------------------------------------------------------
// Hiệu ứng đội & debuff (Buffs / Debuffs)
// -----------------------------------------------------------------------------
M3WEB_API int m3_effect_count()
{
	EnsureActive();
	return static_cast<int>(gBattle.Effects().Buffs.size());
}

M3WEB_API const char* m3_effect_id(int index)
{
	EnsureActive();
	const auto& Buffs = gBattle.Effects().Buffs;
	if (index < 0 || index >= static_cast<int>(Buffs.size())) { return Keep(""); }
	return Keep(Buffs[static_cast<size_t>(index)].Id);
}

M3WEB_API const char* m3_effect_source(int index)
{
	EnsureActive();
	const auto& Buffs = gBattle.Effects().Buffs;
	if (index < 0 || index >= static_cast<int>(Buffs.size())) { return Keep(""); }
	return Keep(Buffs[static_cast<size_t>(index)].Source);
}

M3WEB_API int m3_effect_stacks(int index)
{
	EnsureActive();
	const auto& Buffs = gBattle.Effects().Buffs;
	if (index < 0 || index >= static_cast<int>(Buffs.size())) { return 0; }
	return Buffs[static_cast<size_t>(index)].Stacks;
}

M3WEB_API int m3_effect_turns(int index)
{
	EnsureActive();
	const auto& Buffs = gBattle.Effects().Buffs;
	if (index < 0 || index >= static_cast<int>(Buffs.size())) { return 0; }
	return Buffs[static_cast<size_t>(index)].TurnsLeft;
}

M3WEB_API int m3_effect_is_boss(int index)
{
	EnsureActive();
	const auto& Buffs = gBattle.Effects().Buffs;
	if (index < 0 || index >= static_cast<int>(Buffs.size())) { return 0; }
	return Buffs[static_cast<size_t>(index)].bDebuffOnBoss ? 1 : 0;
}

M3WEB_API int m3_effect_target_member(int index)
{
	EnsureActive();
	const auto& Buffs = gBattle.Effects().Buffs;
	if (index < 0 || index >= static_cast<int>(Buffs.size())) { return -1; }
	return Buffs[static_cast<size_t>(index)].CoveredMemberIndex;
}

M3WEB_API const char* m3_effect_description(int index)
{
	EnsureActive();
	const auto& Buffs = gBattle.Effects().Buffs;
	if (index < 0 || index >= static_cast<int>(Buffs.size())) { return Keep(""); }
	const auto& B = Buffs[static_cast<size_t>(index)];
	std::string Desc;
	if (B.Id == "buff.supporter.rally")
	{
		Desc = "Cổ Vũ: +" + M3::ToText(B.Stacks * 15) + "% sát thương & +" + M3::ToText(B.Stacks * 25) + "% stagger";
	}
	else if (B.Id == "buff.defender.bulwark" || B.Id == "buff.defender.stance")
	{
		Desc = "Khiên Chắn: Giảm " + M3::ToText(B.DamageTakenPerStack * 100.f) + "% sát thương nhận vào";
	}
	else if (B.Id == "buff.defender.fortress")
	{
		Desc = "Thành Lũy Kiên Cố: Giảm 65% sát thương toàn đội";
	}
	else if (B.Id == "buff.healer.aegis")
	{
		Desc = "Bảo Hộ: Chặn boss sinh vật cản / bẫy";
	}
	else if (B.Id == "buff.attacker.focus")
	{
		Desc = "Tập Trung: +40% sát thương match";
	}
	else if (B.Id == "debuff.boss.magic_vuln")
	{
		Desc = "Suy Yếu Ma Pháp: Nhận thêm " + M3::ToText(B.Stacks * 25) + "% sát thương phép";
	}
	else if (B.Id == "buff.chain.fullburst")
	{
		Desc = "Full Burst: +35% sát thương và stagger toàn đội";
	}
	else
	{
		Desc = B.Id + " (" + M3::ToText(B.Stacks) + " stack, " + M3::ToText(B.TurnsLeft) + " turn)";
	}
	return Keep(Desc);
}

// -----------------------------------------------------------------------------
// Nhiệm vụ (challenge) + nhật ký
// -----------------------------------------------------------------------------
M3WEB_API int m3_challenge_count() { EnsureActive(); return static_cast<int>(gBattle.Challenges().size()); }

M3WEB_API const char* m3_challenge_text(int index)
{
	EnsureActive();
	if (index < 0 || index >= static_cast<int>(gBattle.Challenges().size())) { return Keep(""); }
	return Keep(gBattle.Challenges()[static_cast<size_t>(index)].Description);
}

M3WEB_API int m3_challenge_done(int index)
{
	EnsureActive();
	if (index < 0 || index >= static_cast<int>(gBattle.Challenges().size())) { return 0; }
	return gBattle.Challenges()[static_cast<size_t>(index)].bCompleted ? 1 : 0;
}

M3WEB_API int m3_log_count() { EnsureActive(); return static_cast<int>(gBattle.LogLines().size()); }

M3WEB_API const char* m3_log_line(int index)
{
	EnsureActive();
	if (index < 0 || index >= static_cast<int>(gBattle.LogLines().size())) { return Keep(""); }
	return Keep(gBattle.LogLines()[static_cast<size_t>(index)]);
}

M3WEB_API const char* m3_last_message() { EnsureActive(); return Keep(gBattle.LastLog()); }

// =============================================================================
//  HÀNG ĐỊCH (nhiều quái / nhiều boss, phân cấp) - UI web đọc để vẽ dàn trận
// =============================================================================
M3WEB_API int m3_enemy_count() { EnsureActive(); return gBattle.EnemyCount(); }

M3WEB_API int m3_enemy_alive_count() { EnsureActive(); return gBattle.AliveEnemyCount(); }

M3WEB_API const char* m3_enemy_name(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? Keep(E->Name) : Keep("-");
}

M3WEB_API const char* m3_enemy_id(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? Keep(E->Def.Id) : Keep("");
}

// 0 = Normal, 1 = Elite, 2 = MidBoss, 3 = Boss
M3WEB_API int m3_enemy_tier(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? static_cast<int>(E->Tier()) : 0;
}

M3WEB_API const char* m3_enemy_tier_name(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? Keep(M3::EnemyTierName(E->Tier())) : Keep("-");
}

// Khoá tra hình pixel: "minion" / "elite" / "midboss" / "boss" (hoặc SpriteKey riêng).
M3WEB_API const char* m3_enemy_sprite(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	if (!E) { return Keep(""); }
	return Keep(E->Def.SpriteKey.empty() ? M3::EnemyTierKey(E->Tier()) : E->Def.SpriteKey);
}

M3WEB_API float m3_enemy_hp(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? E->Hp : 0.f;
}

M3WEB_API float m3_enemy_hp_max(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? E->HpMax : 0.f;
}

M3WEB_API float m3_enemy_hp_pct(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? E->HpPercent() : 0.f;
}

M3WEB_API int m3_enemy_alive(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return (E && E->bAlive) ? 1 : 0;
}

M3WEB_API int m3_enemy_has_stagger(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return (E && E->StaggerMax > 0.f) ? 1 : 0;
}

M3WEB_API float m3_enemy_stagger_pct(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? E->StaggerPercent() : 0.f;
}

M3WEB_API int m3_enemy_broken(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return (E && E->bBroken) ? 1 : 0;
}

M3WEB_API int m3_enemy_break_turns(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? E->BreakTurnsLeft : 0;
}

M3WEB_API int m3_enemy_phase(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? E->CurrentPhase : 1;
}

M3WEB_API int m3_enemy_total_phases(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? E->TotalPhases : 1;
}

M3WEB_API int m3_enemy_self_buffs(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? E->SelfBuffStacks : 0;
}

// Hành động địch SẮP dùng (UI vẽ biểu tượng cảnh báo trước khi nó ra tay).
M3WEB_API int m3_enemy_intent_action(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? static_cast<int>(E->IntentAction) : 0;
}

M3WEB_API const char* m3_enemy_intent_name(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? Keep(M3::BossActionName(E->IntentAction)) : Keep("-");
}

M3WEB_API int m3_enemy_intent_target(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? E->IntentTargetMemberIndex : -1;
}

M3WEB_API int m3_enemy_charging(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return (E && E->bCharging) ? 1 : 0;
}

M3WEB_API int m3_enemy_break_cur(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? E->SkillBreakCurrent : 0;
}

M3WEB_API int m3_enemy_break_req(int index)
{
	EnsureActive();
	const M3::FEnemyState* E = gBattle.TryGetEnemy(index);
	return E ? E->SkillBreakRequired : 0;
}

M3WEB_API int m3_target_enemy() { EnsureActive(); return gBattle.TargetEnemyIndex(); }

M3WEB_API int m3_set_target_enemy(int index)
{
	EnsureActive();
	return gBattle.SetTargetEnemy(index) ? 1 : 0;
}

M3WEB_API int m3_primary_enemy() { EnsureActive(); return gBattle.PrimaryEnemyIndex(); }

// Tên hiển thị của 1 hành động địch (UI tra bảng chú giải).
M3WEB_API const char* m3_action_name(int actionId)
{
	if (actionId < 0 || actionId >= static_cast<int>(M3::EBossAction::Count)) { return Keep("-"); }
	return Keep(M3::BossActionName(static_cast<M3::EBossAction>(actionId)));
}

// =============================================================================
//  STORY (chương / màn) - UI web đọc để hiển thị trước và sau trận
// =============================================================================
M3WEB_API const char* m3_story_chapter_title() { EnsureActive(); return Keep(gBattle.Story().ChapterTitle); }
M3WEB_API const char* m3_story_stage_title()   { EnsureActive(); return Keep(gBattle.Story().StageTitle); }
M3WEB_API const char* m3_story_brief()         { EnsureActive(); return Keep(gBattle.Story().Brief); }

M3WEB_API int m3_story_intro_count() { EnsureActive(); return static_cast<int>(gBattle.Story().IntroLines.size()); }

M3WEB_API const char* m3_story_intro_line(int index)
{
	EnsureActive();
	const auto& Lines = gBattle.Story().IntroLines;
	if (index < 0 || index >= static_cast<int>(Lines.size())) { return Keep(""); }
	return Keep(Lines[static_cast<size_t>(index)]);
}

M3WEB_API int m3_story_victory_count() { EnsureActive(); return static_cast<int>(gBattle.Story().VictoryLines.size()); }

M3WEB_API const char* m3_story_victory_line(int index)
{
	EnsureActive();
	const auto& Lines = gBattle.Story().VictoryLines;
	if (index < 0 || index >= static_cast<int>(Lines.size())) { return Keep(""); }
	return Keep(Lines[static_cast<size_t>(index)]);
}

// --- Thư viện story (đọc trước khi vào màn, cho màn chọn chương) ---
M3WEB_API int m3_story_chapter_count()
{
	return static_cast<int>(M3::FContentLibrary::StoryChapters().size());
}

M3WEB_API const char* m3_story_chapter_stage_title(int index)
{
	const auto& Chapters = M3::FContentLibrary::StoryChapters();
	if (index < 0 || index >= static_cast<int>(Chapters.size())) { return Keep(""); }
	return Keep(Chapters[static_cast<size_t>(index)].StageTitle);
}

M3WEB_API const char* m3_story_chapter_brief(int index)
{
	const auto& Chapters = M3::FContentLibrary::StoryChapters();
	if (index < 0 || index >= static_cast<int>(Chapters.size())) { return Keep(""); }
	return Keep(Chapters[static_cast<size_t>(index)].Brief);
}

// Tên màn hiển thị trên ô chọn map: ưu tiên story, không có thì lấy tên trùm chính.
M3WEB_API const char* m3_stage_title(int index)
{
	const std::vector<M3::FBattleSetup> Stages = M3::FContentLibrary::CampaignStages();
	if (index < 0 || index >= static_cast<int>(Stages.size())) { return Keep("?"); }
	const M3::FBattleSetup& S = Stages[static_cast<size_t>(index)];
	if (!S.Story.StageTitle.empty()) { return Keep(S.Story.StageTitle); }
	const std::vector<M3::FEnemyDef> Lineup = S.BuildEnemyList();
	return Keep(Lineup.empty() ? std::string("?") : Lineup.back().Name);
}

M3WEB_API int m3_stage_enemy_count(int index)
{
	const std::vector<M3::FBattleSetup> Stages = M3::FContentLibrary::CampaignStages();
	if (index < 0 || index >= static_cast<int>(Stages.size())) { return 0; }
	return static_cast<int>(Stages[static_cast<size_t>(index)].BuildEnemyList().size());
}

// =============================================================================
//  DÒNG NHỊP SỰ KIỆN - UI đọc để phát lại thành animation (kiểu FF/GBF)
// =============================================================================
// Cách dùng ở JS:
//   1. Trước hành động: ghi lại seq = m3_event_seq()
//   2. Gọi hành động (m3_try_swap / m3_use_skill / m3_end_turn ...)
//   3. Nếu m3_event_seq() > seq -> có nhịp mới, đọc m3_event_count() và phát lần lượt.
M3WEB_API int m3_event_seq() { EnsureActive(); return gBattle.EventSeq(); }

M3WEB_API int m3_event_count() { EnsureActive(); return static_cast<int>(gBattle.Events().size()); }

M3WEB_API int m3_event_kind(int index)
{
	EnsureActive();
	if (index < 0 || index >= static_cast<int>(gBattle.Events().size())) { return -1; }
	return static_cast<int>(gBattle.Events()[static_cast<size_t>(index)].Kind);
}

// 0..12 (so với enum trong lõi). Giữ tên cho JS tự kiểm tra chéo.
M3WEB_API const char* m3_event_kind_key(int index)
{
	EnsureActive();
	if (index < 0 || index >= static_cast<int>(gBattle.Events().size())) { return Keep(""); }
	return Keep(M3::BattleEventName(gBattle.Events()[static_cast<size_t>(index)].Kind));
}

M3WEB_API int m3_event_member(int index)
{
	EnsureActive();
	if (index < 0 || index >= static_cast<int>(gBattle.Events().size())) { return -1; }
	return gBattle.Events()[static_cast<size_t>(index)].MemberIndex;
}

M3WEB_API int m3_event_enemy(int index)
{
	EnsureActive();
	if (index < 0 || index >= static_cast<int>(gBattle.Events().size())) { return -1; }
	return gBattle.Events()[static_cast<size_t>(index)].EnemyIndex;
}

M3WEB_API float m3_event_amount(int index)
{
	EnsureActive();
	if (index < 0 || index >= static_cast<int>(gBattle.Events().size())) { return 0.f; }
	return gBattle.Events()[static_cast<size_t>(index)].Amount;
}

M3WEB_API int m3_event_value(int index)
{
	EnsureActive();
	if (index < 0 || index >= static_cast<int>(gBattle.Events().size())) { return 0; }
	return gBattle.Events()[static_cast<size_t>(index)].Value;
}

M3WEB_API int m3_event_big(int index)
{
	EnsureActive();
	if (index < 0 || index >= static_cast<int>(gBattle.Events().size())) { return 0; }
	return gBattle.Events()[static_cast<size_t>(index)].bBig ? 1 : 0;
}

M3WEB_API const char* m3_event_text(int index)
{
	EnsureActive();
	if (index < 0 || index >= static_cast<int>(gBattle.Events().size())) { return Keep(""); }
	return Keep(gBattle.Events()[static_cast<size_t>(index)].Text);
}

// =============================================================================
//  HÌNH ẢNH NHÂN VẬT: khoá tra sprite (class + biến thể) do lõi quyết định
// =============================================================================
M3WEB_API const char* m3_member_sprite(int index)
{
	EnsureActive();
	const M3::FCharacterState* Member = gBattle.Party().TryGet(index);
	if (!Member) { return Keep(""); }
	if (!Member->Def.SpriteKey.empty()) { return Keep(Member->Def.SpriteKey); }
	// Chưa khai báo -> suy ra biến thể 1 theo class (khớp tên role trong pixelart.js).
	std::string Key = "attacker.1";
	switch (Member->Def.Role)
	{
	case M3::ERole::Supporter: Key = "supporter.1"; break;
	case M3::ERole::Healer:    Key = "healer.1";    break;
	case M3::ERole::Defender:  Key = "defender.1";  break;
	case M3::ERole::Counter:   Key = "counter.1";   break;
	case M3::ERole::Deflecter: Key = "deflecter.1"; break;
	case M3::ERole::Mage:      Key = "mage.1";      break;
	default:                   Key = "attacker.1";  break;
	}
	return Keep(Key);
}

// =============================================================================
//  BỘ ĐỊCH ĐỊNH NGHĨA BÊN NGOÀI LÕI (Web/enemies.js)
// -----------------------------------------------------------------------------
// Nhờ 4 hàm dưới đây, bộ địch của bản web nằm trong 1 file dữ liệu riêng, không
// phải sửa và biên dịch lại lõi. Cách dùng từ JS:
//   m3_custom_stage_begin("Tên màn", 4, 3);
//   m3_custom_stage_add_enemy("id", "Tên", "minion.2", 0 /*tier*/, 700, 70, 0, 0, 0, "0,1,4");
//   m3_custom_stage_start();
// =============================================================================
namespace
{
	bool gCustomBuilding = false;
	std::string gCustomTitle;
	int  gCustomMoves = 4;
	int  gCustomObstacles = 3;
	std::vector<M3::FEnemyDef> gCustomEnemies;

	// Tách chuỗi "0,2,3" thành danh sách hành động.
	std::vector<M3::EBossAction> ParsePattern(const char* Csv)
	{
		std::vector<M3::EBossAction> Out;
		if (!Csv) { return Out; }

		std::string S(Csv);
		size_t Pos = 0;
		while (Pos < S.size())
		{
			const size_t Next = S.find(',', Pos);
			const std::string Token = S.substr(Pos, (Next == std::string::npos) ? std::string::npos : Next - Pos);
			if (!Token.empty())
			{
				const int Value = std::atoi(Token.c_str());
				if (Value >= 0 && Value < static_cast<int>(M3::EBossAction::Count))
				{
					Out.push_back(static_cast<M3::EBossAction>(Value));
				}
			}
			if (Next == std::string::npos) { break; }
			Pos = Next + 1;
		}
		return Out;
	}
}

M3WEB_API void m3_custom_stage_begin(const char* title, int movesPerTurn, int startObstacles)
{
	gCustomBuilding = true;
	gCustomTitle = title ? title : "";
	gCustomMoves = (movesPerTurn > 0) ? movesPerTurn : 4;
	gCustomObstacles = (startObstacles >= 0) ? startObstacles : 3;
	gCustomEnemies.clear();
}

M3WEB_API void m3_custom_stage_add_enemy(const char* id, const char* name, const char* sprite,
                                         int tier, float hp, float atk, float stagger,
                                         int physResistPct, int magResistPct, const char* patternCsv)
{
	if (!gCustomBuilding) { return; }

	M3::FEnemyDef Def;
	Def.Id = id ? id : "enemy.custom";
	Def.Name = name ? name : "Quái";
	Def.Tier = static_cast<M3::EEnemyTier>(tier < 0 ? 0 : (tier > 3 ? 3 : tier));
	Def.Hp = (hp > 0.f) ? hp : 500.f;
	Def.Atk = (atk > 0.f) ? atk : 60.f;
	Def.Stagger = (stagger > 0.f) ? stagger : 0.f;
	Def.PhysResist = static_cast<float>(physResistPct) / 100.f;
	Def.MagResist  = static_cast<float>(magResistPct) / 100.f;
	Def.SpriteKey = sprite ? sprite : "";
	Def.Pattern = ParsePattern(patternCsv);
	gCustomEnemies.push_back(Def);
}

M3WEB_API int m3_custom_stage_enemy_count() { return static_cast<int>(gCustomEnemies.size()); }

M3WEB_API int m3_custom_stage_start()
{
	if (!gCustomBuilding || gCustomEnemies.empty()) { return 0; }

	M3::FBattleSetup Setup = M3::FContentLibrary::DefaultBattleSetup(6, 20261014u);
	Setup.Enemies = gCustomEnemies;
	Setup.Balance.MovesPerTurn = gCustomMoves;
	Setup.StartObstacles = gCustomObstacles;
	Setup.Story.ChapterId = "custom";
	Setup.Story.ChapterTitle = "Màn tuỳ biến";
	Setup.Story.StageTitle = gCustomTitle;
	Setup.Story.Brief = "Màn này dựng từ bộ địch bên ngoài lõi (Web/enemies.js).";

	// Đưa đội lên đủ 6 người để thử được nhiều class khác nhau.
	std::vector<M3::FCharacterDef> Roster = M3::FContentLibrary::AllCharacters();
	Setup.Roster = Roster;

	gBattle.Setup(Setup);
	gActive = true;
	gStage = -1;              // -1 = màn tuỳ biến (không nằm trong chiến dịch)
	gCustomBuilding = false;
	RefreshHint();
	return 1;
}

// Số địch trong màn đang chơi (kể cả màn tuỳ biến).
M3WEB_API int m3_is_custom_stage() { return (gStage < 0) ? 1 : 0; }
