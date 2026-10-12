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
