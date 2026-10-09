// =============================================================================
//  M3Battle.cpp  -  Cài đặt toàn bộ vòng chơi turn-based
//  ---------------------------------------------------------------------------
//  Đọc theo thứ tự: Setup -> PlayerSwap (kích hiệu ứng) -> UseBasicSkill /
//  UseUltimate -> AdvanceTurn (Defender/Deflecter + boss hành động + sang turn).
// =============================================================================
#include "M3Battle.h"

namespace M3
{

// =============================================================================
//  FBattleSetup
// =============================================================================
FBattleSetup FBattleSetup::DefaultStarter()
{
	FBattleSetup Setup;
	Setup.BossName    = "Chimera Lửa";
	Setup.BossHp      = 6000.f;
	Setup.BossAtk     = 180.f;
	Setup.BossStagger = 1200.f;
	Setup.MovesPerTurn = 4;
	Setup.StartObstacles = 3;
	Setup.Seed = 20261008u;
	return Setup;
}

// =============================================================================
//  Setup
// =============================================================================
void FBattle::Setup(const FBattleSetup& InSetup)
{
	Cfg = InSetup.Balance;

	// --- Bàn ---
	BoardState.Reset(InSetup.BoardWidth, InSetup.BoardHeight, InSetup.Seed, InSetup.NumColors);
	Rng.Reseed(InSetup.Seed ^ 0x9E3779B9u);

	// --- Đội hình ---
	Team = FParty();
	for (const FCharacterDef& Def : InSetup.Roster) { Team.AddCharacter(Def); }
	for (int32 i = 0; i < Team.MemberCount(); ++i)
	{
		const int32 MaxSlots = std::min<int32>(FParty::kMaxEquipmentPerMember, static_cast<int32>(InSetup.StartingEquipment.size()));
		for (int32 e = 0; e < MaxSlots; ++e) { Team.Equip(i, InSetup.StartingEquipment[static_cast<size_t>(e)]); }
	}
	Team.RecomputeStats(Cfg);
	for (FCharacterState& M : Team.Members()) { M.UltimateCharge = 0; }

	// --- Boss ---
	BossState = FBossState();
	BossState.Name       = InSetup.BossName;
	BossState.Hp         = InSetup.BossHp;
	BossState.HpMax      = InSetup.BossHp;
	BossState.Atk        = InSetup.BossAtk;
	BossState.Stagger    = InSetup.BossStagger;
	BossState.StaggerMax = InSetup.BossStagger;
	BossState.StaggerRate = Cfg.BossStaggerRate;
	BossState.bBroken = false;
	BossState.BreakTurnsLeft = 0;
	BossState.PatternIndex = 0;

	EffectsState.Clear();
	ChallengeList = InSetup.Challenges;
	LogText.clear();

	TurnIndex = 1;
	MovesRemaining  = Cfg.MovesPerTurn;
	MovesUsedInTurn = 0;
	UltimatesUsedInTurn = 0;
	for (bool& b : bBasicSkillUsedThisTurn) { b = false; }

	DamageDealtTotal = 0.f;
	DamageTakenTotal = 0.f;
	MaxBlocksInSingleMove = 0;
	MaxStarsReached = 0;
	LastOutcome = FResolveOutcome();

	bVictory = false;
	bDefeat  = false;
	bSetup   = true;

	// Vật cản ban đầu do boss đặt (map nào cũng có "chướng ngại" của trận).
	if (InSetup.StartObstacles > 0) { BoardState.PlaceRandomObstacles(InSetup.StartObstacles, 1); }

	AddLog("=== Trận đấu bắt đầu: " + BossState.Name + " ===");
	AddLog("Đội hình " + ToText(Team.MemberCount()) + " người, mỗi turn có " + ToText(Cfg.MovesPerTurn) + " lượt nối.");
	UpdateChallenges();
	CheckBattleEnd();
}

// =============================================================================
//  Nước đi của người chơi
// =============================================================================
FActionResult FBattle::PlayerSwap(const FCell& A, const FCell& B)
{
	if (!bSetup)      { return FActionResult::Fail(EActionResult::Invalid, "Chưa thiết lập trận."); }
	if (IsFinished()) { return FActionResult::Fail(EActionResult::Finished, "Trận đã kết thúc."); }
	if (MovesRemaining <= 0)
	{
		return FActionResult::Fail(EActionResult::NoActions, "Hết lượt nối trong turn này.");
	}

	FResolver Resolver(BoardState);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(A, B);
	if (!Outcome.bValid)
	{
		return FActionResult::Fail(EActionResult::NoMatch, Outcome.InvalidReason);
	}

	LastOutcome = Outcome;
	MovesUsedInTurn += 1;
	MovesRemaining    -= 1;
	MaxBlocksInSingleMove = std::max(MaxBlocksInSingleMove, Outcome.MaxBlocksInStep);

	AddLog("Nối " + ToText(Outcome.TotalBlocksCleared) + " block, " + ToText(Outcome.CascadeCount)
		+ " tầng combo" + (Outcome.TotalObstaclesCleared > 0 ? (" , gỡ " + ToText(Outcome.TotalObstaclesCleared) + " vật cản") : "")
		+ (Outcome.ColorBombSwaps > 0 ? " , kích hoạt block cầu vồng!" : "") + ".");

	ApplyMatchEffects(Outcome);

	// Bàn bí nước đi (không còn swap nào tạo được match) -> trộn lại, tránh kẹt game.
	if (!BoardState.HasAnyPossibleMove())
	{
		BoardState.Shuffle();
		BoardState.EnsurePlayable();
		AddLog("Bàn không còn nước đi hợp lệ -> tự trộn lại.");
	}

	UpdateChallenges();
	CheckBattleEnd();

	// Hết lượt trong turn -> boss được hành động.
	if (!IsFinished() && MovesRemaining <= 0)
	{
		AdvanceTurn(false);
	}

	return FActionResult::Ok("Nước đi hợp lệ.");
}

// -----------------------------------------------------------------------------
// Biến kết quả nối thành hiệu ứng cho từng nhân vật
// -----------------------------------------------------------------------------
void FBattle::ApplyMatchEffects(const FResolveOutcome& Outcome)
{
	// Kiểm tra điều kiện Phá Chiêu (Skill Break QTE) khi Boss đang nạp tuyệt kĩ
	if (BossState.bCharging)
	{
		if (BossState.SkillBreakKind == ESkillBreakKind::ComboCount)
		{
			BossState.SkillBreakCurrent = static_cast<int32>(Outcome.Steps.size());
		}
		else if (BossState.SkillBreakKind == ESkillBreakKind::BlockCount)
		{
			BossState.SkillBreakCurrent += Outcome.TotalBlocksCleared;
		}

		if (BossState.SkillBreakCurrent >= BossState.SkillBreakRequired)
		{
			BossState.bCharging = false;
			AddLog("PHÁ CHIÊU THÀNH CÔNG! Đã phá vỡ chiêu nạp của " + BossState.Name + "! Tuyệt kĩ của Boss bị ngắt!");
		}
	}

	// 1) Nhân vật CÓ block: attacker -> sát thương, supporter -> buff/debuff, healer -> hồi máu.
	for (int32 i = 0; i < Team.MemberCount(); ++i)
	{
		FCharacterState* M = Team.TryGet(i);
		if (!M || !M->bAlive) { continue; }

		const EColor Color = M->Def.MatchColor;
		const int32 Blocks = (Color == EColor::None) ? 0 : Outcome.BlocksOfColor(Color);
		if (Blocks <= 0) { continue; }

		// Nạp ultimate: mỗi block đúng màu của nhân vật cộng thêm charge.
		M->UltimateCharge = std::min(Cfg.UltimateMaxCharge, M->UltimateCharge + Blocks * Cfg.UltimateChargePerBlock);

		switch (M->Def.Role)
		{
		case ERole::Attacker:
		{
			const float Damage = ComputeMatchDamage(i, Outcome);
			DealDamageToBoss(Damage, M->Def.Name, M->Def.DamageType);
			break;
		}
		case ERole::Mage:
		{
			const float Damage = ComputeMageDamage(i, Outcome);
			DealDamageToBoss(Damage, M->Def.Name, EDamageType::Magic);
			ApplyMageMatchDebuff(i, Outcome);
			break;
		}
		case ERole::Supporter:
			ApplySupportEffect(i, Outcome);
			break;

		case ERole::Healer:
		{
			const float Heal = ComputeHealAmount(i, Outcome);
			const float Done = Team.HealAll(Heal);
			AddLog(M->Def.Name + " hồi " + ToText(Done) + " HP cho cả đội (" + ToText(Blocks) + " block "
				+ ColorName(Color) + ").");
			break;
		}
		default:
			break;   // Defender / Counter / Deflecter không có block
		}
	}

	// 2) Deflecter tích stack từ mỗi lần match-4 (ô vuông hoặc hàng/cột 4).
	if (Outcome.FourMatchEvents > 0)
	{
		for (FCharacterState* D : Team.FindAllByRole(ERole::Deflecter))
		{
			D->DeflectStacks = std::min(Cfg.DeflectStacksRequired, D->DeflectStacks + Outcome.FourMatchEvents);
			AddLog(D->Def.Name + " tích lũy match-4: " + ToText(D->DeflectStacks) + "/" + ToText(Cfg.DeflectStacksRequired) + ".");
		}
	}
}

float FBattle::ComputeMatchDamage(int32 AttackerIndex, const FResolveOutcome& Outcome) const
{
	const FCharacterState* M = Team.TryGet(AttackerIndex);
	if (!M) { return 0.f; }

	const int32 Blocks = Outcome.BlocksOfColor(M->Def.MatchColor);
	if (Blocks <= 0) { return 0.f; }

	// Combo: nối được càng nhiều tầng (cascade) thì sát thương càng cao.
	const float ComboMul = std::min(Cfg.MaxComboMultiplier,
		1.f + Cfg.ComboBonusPerCascade * static_cast<float>(std::max(0, Outcome.CascadeCount - 1)));

	float Damage = M->Atk * Cfg.DamagePerBlock * static_cast<float>(Blocks) * ComboMul;

	// Trang bị gây thêm sát thương theo thuộc tính -> cộng dồn %.
	float ElementBonus = 0.f;
	for (const FEquipment& E : M->Equipment) { ElementBonus += E.ElementDamageBonus; }
	Damage *= (1.f + ElementBonus);

	// Buff của Supporter.
	Damage *= EffectsState.AtkMultiplier();
	return Damage;
}

float FBattle::ComputeMageDamage(int32 MageIndex, const FResolveOutcome& Outcome) const
{
	const FCharacterState* M = Team.TryGet(MageIndex);
	if (!M) { return 0.f; }

	const int32 Blocks = Outcome.BlocksOfColor(M->Def.MatchColor);
	if (Blocks <= 0) { return 0.f; }

	const float ComboMul = std::min(Cfg.MaxComboMultiplier,
		1.f + Cfg.ComboBonusPerCascade * static_cast<float>(std::max(0, Outcome.CascadeCount - 1)));

	float Damage = M->Atk * Cfg.DamagePerBlock * static_cast<float>(Blocks) * ComboMul;

	float ElementBonus = 0.f;
	for (const FEquipment& E : M->Equipment) { ElementBonus += E.ElementDamageBonus; }
	Damage *= (1.f + ElementBonus);

	Damage *= EffectsState.AtkMultiplier();
	return Damage;
}

void FBattle::ApplyMageMatchDebuff(int32 MageIndex, const FResolveOutcome& Outcome)
{
	const FCharacterState* M = Team.TryGet(MageIndex);
	if (!M) { return; }

	const int32 Blocks = Outcome.BlocksOfColor(M->Def.MatchColor);
	if (Blocks < 3) { return; }

	FTeamBuff Debuff;
	Debuff.Id = "debuff.boss.magic_vuln";
	Debuff.Source = M->Def.Name;
	Debuff.Stacks = 1;
	Debuff.TurnsLeft = 2;
	Debuff.bDebuffOnBoss = true;
	EffectsState.AddStack(Debuff, 3);
	AddLog(M->Def.Name + " yểm debuff Suy Yếu Ma Pháp lên " + BossState.Name + " (+25% sát thương ma pháp nhận vào).");
}


float FBattle::ComputeHealAmount(int32 HealerIndex, const FResolveOutcome& Outcome) const
{
	const FCharacterState* M = Team.TryGet(HealerIndex);
	if (!M) { return 0.f; }

	const int32 Blocks = Outcome.BlocksOfColor(M->Def.MatchColor);
	if (Blocks < 3) { return 0.f; }

	// Hồi máu TĂNG THEO CẤP SỐ NHÂN với số block trigger (đúng thiết kế).
	float Heal = M->Atk * Cfg.HealPerBlock * std::pow(Cfg.HealExpBase, static_cast<float>(Blocks - 3));

	// Chặn trên để healer không phá game.
	const float Cap = M->Atk * Cfg.HealPerBlock * Cfg.HealMaxMultiplier;
	Heal = std::min(Heal, Cap);
	return Heal;
}

void FBattle::ApplySupportEffect(int32 SupporterIndex, const FResolveOutcome& Outcome)
{
	const FCharacterState* M = Team.TryGet(SupporterIndex);
	if (!M) { return; }

	const int32 Blocks = Outcome.BlocksOfColor(M->Def.MatchColor);
	if (Blocks < 3) { return; }

	// Số block càng nhiều -> stack càng cao -> hoặc tăng hệ số, hoặc kéo dài số turn.
	const int32 Stacks = 1 + (Blocks - 3) / 2;
	const int32 Turns  = 2 + (Blocks / 3);

	// Buff cho đội: tăng sát thương match + tăng lượng stagger gây lên boss.
	FTeamBuff Buff;
	Buff.Id     = "buff.supporter.rally";
	Buff.Source = M->Def.Name;
	Buff.Stacks = Stacks;
	Buff.AtkPerStack     = Cfg.BuffAtkPerStack;
	Buff.StaggerPerStack = Cfg.BuffStaggerPerStack;
	Buff.TurnsLeft = Turns;
	EffectsState.AddStack(Buff, Cfg.BuffMaxStacks);

	AddLog(M->Def.Name + " buff đội x" + ToText(Stacks) + " (" + ToText(Turns) + " turn) từ "
		+ ToText(Blocks) + " block " + ColorName(M->Def.MatchColor) + ".");
}

float FBattle::DealDamageToBoss(float RawDamage, const std::string& SourceName, EDamageType DamageType)
{
	if (RawDamage <= 0.f || BossState.Hp <= 0.f) { return 0.f; }

	// Tính toán kháng vật lý / kháng phép của Boss
	float Resist = 0.f;
	if (DamageType == EDamageType::Physical)
	{
		Resist += BossState.PhysResist;
	}
	else if (DamageType == EDamageType::Magic)
	{
		Resist += BossState.MagResist;
		// Debuff Suy Yếu Ma Pháp do Mage gây ra
		for (const FTeamBuff& Buff : EffectsState.Buffs)
		{
			if (Buff.Id == "debuff.boss.magic_vuln")
			{
				Resist -= 0.25f * static_cast<float>(Buff.Stacks);
			}
		}
	}

	const float FinalResist = std::min(0.9f, std::max(-0.5f, Resist));

	// Khi boss BREAK (thanh stagger vỡ) -> nhận thêm sát thương.
	const float Final = RawDamage * (1.f - FinalResist) * (BossState.bBroken ? Cfg.BreakDamageMultiplier : 1.f);

	BossState.Hp = std::max(0.f, BossState.Hp - Final);
	DamageDealtTotal += Final;

	AddLog(SourceName + " gây " + ToText(Final) + " sát thương " + DamageTypeName(DamageType) + " lên " + BossState.Name
		+ " (HP boss: " + ToText(BossState.Hp) + "/" + ToText(BossState.HpMax) + ").");

	// Sát thương lên boss làm giảm thanh stagger.

	ReduceStagger(Final * Cfg.StaggerPerDamage * EffectsState.StaggerMultiplier() * BossState.StaggerRate, SourceName);

	if (BossState.Hp <= 0.f) { CheckBattleEnd(); }
	return Final;
}

void FBattle::ReduceStagger(float Amount, const std::string& SourceName)
{
	if (BossState.StaggerMax <= 0.f) { return; }

	BossState.Stagger = std::max(0.f, BossState.Stagger - Amount);
	AddLog("Stagger boss còn " + ToText(BossState.Stagger) + "/" + ToText(BossState.StaggerMax) + ".");

	if (BossState.Stagger <= 0.f) { CheckStaggerBreak(); }
	(void)SourceName;
}

void FBattle::CheckStaggerBreak()
{
	if (BossState.bBroken) { return; }

	// Thanh stagger VỠ: boss ngất, nhận thêm sát thương, và Counter được phép ra tay.
	BossState.bBroken = true;
	BossState.BreakTurnsLeft = Cfg.BreakDurationTurns;
	BossState.Stagger = 0.f;
	AddLog("!! THANH STAGGER VỠ - " + BossState.Name + " bị BREAK trong " + ToText(Cfg.BreakDurationTurns) + " turn !!");

	// Counter: chỉ kích hoạt khi thanh stagger vỡ.
	for (FCharacterState* C : Team.FindAllByRole(ERole::Counter))
	{
		const float Damage = C->Atk * Cfg.CounterDamageMultiplier;
		AddLog(C->Def.Name + " (Counter) phản kích khi boss vỡ stagger!");
		DealDamageToBoss(Damage, C->Def.Name + " [Counter]");
	}

	// Deflecter giúp hạ stagger nhanh hơn -> giảm luôn thời gian ngất một chút nếu có nhiều deflecter.
	UpdateChallenges();
	CheckBattleEnd();
}

// =============================================================================
//  Kỹ năng chủ động
// =============================================================================
FActionResult FBattle::UseBasicSkill(int32 MemberIndex, const FCell& TargetCell)
{
	if (!bSetup)      { return FActionResult::Fail(EActionResult::Invalid, "Chưa thiết lập trận."); }
	if (IsFinished()) { return FActionResult::Fail(EActionResult::Finished, "Trận đã kết thúc."); }

	FCharacterState* M = Team.TryGet(MemberIndex);
	if (!M)           { return FActionResult::Fail(EActionResult::Invalid, "Nhân vật không tồn tại."); }
	if (!M->bAlive)   { return FActionResult::Fail(EActionResult::NotReady, M->Def.Name + " đã gục."); }
	if (M->BasicCooldown > 0)
	{
		return FActionResult::Fail(EActionResult::NotReady,
			"Kỹ năng của " + M->Def.Name + " còn hồi chiêu " + ToText(M->BasicCooldown) + " turn.");
	}

	const int32 RoleIdx = static_cast<int32>(M->Def.Role);
	if (bBasicSkillUsedThisTurn[RoleIdx])
	{
		return FActionResult::Fail(EActionResult::NotReady, "Mỗi role chỉ dùng kỹ năng 1 lần trong 1 turn.");
	}

	const FSkillDefinition Skill = FSkillCatalog::BasicForRole(M->Def.Role);
	if (Skill.bRequiresBossBreak && !BossState.bBroken)
	{
		return FActionResult::Fail(EActionResult::NotReady, Skill.Name + ": chỉ dùng được khi boss đang BREAK.");
	}

	switch (Skill.Kind)
	{
	case ESkillKind::BuffDamage:
	{
		// Attacker: tăng sát thương cho MỌI block match trong turn này.
		FTeamBuff Buff;
		Buff.Id = "buff.attacker.focus";
		Buff.Source = M->Def.Name;
		Buff.Stacks = 1;
		Buff.AtkPerStack = 0.40f;
		Buff.TurnsLeft = 1;
		EffectsState.AddStack(Buff, 1);
		AddLog(M->Def.Name + " dùng " + Skill.Name + ": +40% sát thương match trong turn.");
		break;
	}

	case ESkillKind::PurgeObstacle:
	{
		// Supporter: Gỡ 1 vật cản / Bẫy đếm ngược (nếu có TargetCell hợp lệ thì gỡ đúng ô đó, ngược lại gỡ ngẫu nhiên)
		bool bClearedTarget = false;
		if (BoardState.InBounds(TargetCell))
		{
			FBlock& TargetBlock = BoardState.At(TargetCell);
			if (TargetBlock.IsObstacle() || TargetBlock.IsCountTrap() || TargetBlock.bLocked)
			{
				const std::string TargetName = BlockKindName(TargetBlock.Kind);
				BoardState.ClearCell(TargetCell);
				BoardState.ApplyGravityAndRefill();
				AddLog(M->Def.Name + " (Chỉ định) gỡ thành công " + TargetName + " tại ô ("
					+ ToText(TargetCell.X) + ", " + ToText(TargetCell.Y) + ").");
				bClearedTarget = true;
			}
		}

		if (!bClearedTarget)
		{
			const int32 Removed = BoardState.ClearRandomObstacles(1);
			if (Removed > 0)
			{
				AddLog(M->Def.Name + " dùng " + Skill.Name + ": gỡ 1 vật cản ngẫu nhiên.");
			}
			else
			{
				// Không còn vật cản -> dùng để xoá debuff của boss.
				const size_t Before = EffectsState.Buffs.size();
				for (size_t i = 0; i < EffectsState.Buffs.size(); ++i)
				{
					if (EffectsState.Buffs[i].Id.rfind("debuff.boss", 0) == 0)
					{
						EffectsState.Buffs.erase(EffectsState.Buffs.begin() + static_cast<long long>(i));
						break;
					}
				}
				AddLog(M->Def.Name + " dùng " + Skill.Name + ": "
					+ (EffectsState.Buffs.size() < Before ? "gỡ 1 debuff của boss." : "không có gì để gỡ."));
			}
		}
		break;
	}

	case ESkillKind::Aegis:
	{
		// Healer: hồi máu + chặn boss đặt vật cản trong 1 turn.
		const float Heal = Team.HealAll(Team.TotalHpMax() * 0.12f);
		FTeamBuff Buff;
		Buff.Id = "buff.healer.aegis";
		Buff.Source = M->Def.Name;
		Buff.Stacks = 1;
		Buff.TurnsLeft = 1;
		Buff.bBlocksObstacles = true;
		EffectsState.AddStack(Buff, 1);
		AddLog(M->Def.Name + " dùng " + Skill.Name + ": hồi " + ToText(Heal) + " HP và chặn boss tạo vật cản.");
		break;
	}

	case ESkillKind::Bulwark:
	{
		// Defender: khiên giảm sát thương (bảo vệ toàn đội hoặc mục tiêu cụ thể)
		FTeamBuff Buff;
		Buff.Id = "buff.defender.bulwark";
		Buff.Source = M->Def.Name;
		Buff.Stacks = 1;
		Buff.DamageTakenPerStack = 0.50f;
		Buff.TurnsLeft = 1;

		if (TargetCell.X >= 0)
		{
			const int32 TargetIdx = TargetCell.X;
			FCharacterState* TargetMem = Team.TryGet(TargetIdx);
			if (TargetMem && TargetMem->bAlive)
			{
				Buff.CoveredMemberIndex = TargetIdx;
				Buff.DamageTakenPerStack = 0.80f; // Bảo vệ 1 người -> giảm 80% sát thương
				EffectsState.AddStack(Buff, 1);
				AddLog(M->Def.Name + " (Defender) xông ra bảo vệ " + TargetMem->Def.Name
					+ "! Giảm 80% sát thương đòn nhắm vào " + TargetMem->Def.Name + ".");
				break;
			}
		}

		Buff.CoveredMemberIndex = -1;
		EffectsState.AddStack(Buff, 1);
		AddLog(M->Def.Name + " dùng " + Skill.Name + ": giảm 50% sát thương nhận vào turn này cho toàn đội.");
		break;
	}

	case ESkillKind::CounterStrike:
	{
		// Counter: đòn nặng trong cửa sổ BREAK.
		const float Damage = M->Atk * 1.8f;
		DealDamageToBoss(Damage, M->Def.Name + " [Counter]");
		break;
	}

	case ESkillKind::DeflectSurge:
		{
			// Deflecter: nạp nhanh stack match-4.
			M->DeflectStacks = std::min(Cfg.DeflectStacksRequired, M->DeflectStacks + 1);
			AddLog(M->Def.Name + " dùng " + Skill.Name + ": match-4 stack " + ToText(M->DeflectStacks)
				+ "/" + ToText(Cfg.DeflectStacksRequired) + ".");
			break;
		}

	case ESkillKind::MageBlast:
		{
			const float Damage = M->Atk * 1.6f;
			DealDamageToBoss(Damage, M->Def.Name + " [Bão Phép]", EDamageType::Magic);
			FTeamBuff Debuff;
			Debuff.Id = "debuff.boss.magic_vuln";
			Debuff.Source = M->Def.Name;
			Debuff.Stacks = 1;
			Debuff.TurnsLeft = 2;
			Debuff.bDebuffOnBoss = true;
			EffectsState.AddStack(Debuff, 3);
			AddLog(M->Def.Name + " dùng " + Skill.Name + ": gây sát thương Ma Pháp và yểm debuff Suy Yếu Ma Pháp.");
			break;
		}

	default:
		break;
	}


	M->BasicCooldown = Skill.Cooldown;
	bBasicSkillUsedThisTurn[RoleIdx] = true;
	return FActionResult::Ok("Đã dùng " + Skill.Name + ".");
}

// =============================================================================
//  Ultimate (nạp theo turn + theo block, chain được nhiều ultimate)
// =============================================================================
FActionResult FBattle::UseUltimate(int32 MemberIndex)
{
	if (!bSetup)      { return FActionResult::Fail(EActionResult::Invalid, "Chưa thiết lập trận."); }
	if (IsFinished()) { return FActionResult::Fail(EActionResult::Finished, "Trận đã kết thúc."); }

	FCharacterState* M = Team.TryGet(MemberIndex);
	if (!M)         { return FActionResult::Fail(EActionResult::Invalid, "Nhân vật không tồn tại."); }
	if (!M->bAlive) { return FActionResult::Fail(EActionResult::NotReady, M->Def.Name + " đã gục."); }
	if (M->UltimateCharge < Cfg.UltimateMaxCharge)
	{
		return FActionResult::Fail(EActionResult::NotReady,
			"Ultimate chưa đầy: " + ToText(M->UltimateCharge) + "/" + ToText(Cfg.UltimateMaxCharge) + ".");
	}

	M->UltimateCharge = 0;
	UltimatesUsedInTurn += 1;

	// CHAIN: càng nhiều ultimate trong cùng 1 turn thì hệ số càng cao (kiểu full burst).
	const float ChainMul = 1.f + Cfg.UltimateChainStep * static_cast<float>(UltimatesUsedInTurn - 1);
	const FSkillDefinition Skill = FSkillCatalog::UltimateForRole(M->Def.Role);

	AddLog(M->Def.Name + " tung Ultimate: " + Skill.Name + " (chain x" + ToText(ChainMul) + ").");

	switch (Skill.Kind)
	{
	case ESkillKind::UltimateDamage:
	{
		// Sát thương cực lớn, nhân theo số block đã trigger trong nước đi gần nhất.
		const int32 Blocks = std::max(3, LastOutcome.MaxBlocksInStep);
		const float Damage = M->Atk * Cfg.UltimateAttackerPower * ChainMul * (1.f + 0.05f * Blocks);
		DealDamageToBoss(Damage, M->Def.Name + " [Ultimate]");
		break;
	}

	case ESkillKind::UltimateSupport:
	{
		// Gỡ vật cản + phá mạnh stagger (mở cửa sổ BREAK).
		const int32 Removed = BoardState.ClearRandomObstacles(Cfg.UltimateObstaclePurge);
		FTeamBuff Debuff;
		Debuff.Id = "debuff.boss.shatter";
		Debuff.Source = M->Def.Name;
		Debuff.Stacks = 1;
		Debuff.StaggerPerStack = 0.50f;
		Debuff.TurnsLeft = 2;
		Debuff.bDebuffOnBoss = true;
		EffectsState.AddStack(Debuff, 3);

		const float StaggerDamage = BossState.StaggerMax * Cfg.UltimateStaggerPercent * ChainMul;
		ReduceStagger(StaggerDamage, M->Def.Name + " [Ultimate]");
		AddLog("Gỡ " + ToText(Removed) + " vật cản, phá " + ToText(StaggerDamage) + " stagger.");
		break;
	}

	case ESkillKind::UltimateHeal:
	{
		// Hồi % máu tối đa cho cả đội + miễn nhiễm sát thương 1 turn.
		const float Heal = Team.HealAll(Team.TotalHpMax() * Cfg.UltimateHealPercent);
		FTeamBuff Buff;
		Buff.Id = "buff.healer.invuln";
		Buff.Source = M->Def.Name;
		Buff.Stacks = 1;
		Buff.DamageTakenPerStack = 1.0f;   // 100% -> miễn nhiễm
		Buff.TurnsLeft = 1;
		EffectsState.AddStack(Buff, 1);
		AddLog("Hồi " + ToText(Heal) + " HP cho đội, miễn nhiễm sát thương 1 turn.");
		break;
	}

	case ESkillKind::UltimateGuard:
	{
		FTeamBuff Buff;
		Buff.Id = "buff.defender.fortress";
		Buff.Source = M->Def.Name;
		Buff.Stacks = 1;
		Buff.DamageTakenPerStack = 0.65f;
		Buff.TurnsLeft = 2;
		EffectsState.AddStack(Buff, 1);
		const float Heal = Team.HealAll(Team.TotalHpMax() * 0.15f);
		AddLog("Thành lũy: giảm 65% sát thương nhận vào trong 2 turn, hồi " + ToText(Heal) + " HP.");
		break;
	}

	case ESkillKind::UltimateMage:
	{
		const int32 Blocks = std::max(3, LastOutcome.MaxBlocksInStep);
		const float Damage = M->Atk * Cfg.UltimateAttackerPower * ChainMul * (1.f + 0.06f * Blocks);
		BossState.MagResist = std::max(0.f, BossState.MagResist - 0.30f);
		const int32 Cleared = BoardState.ClearRandomObstacles(1);
		DealDamageToBoss(Damage, M->Def.Name + " [Ultimate Mage]", EDamageType::Magic);
		AddLog(M->Def.Name + " giáng Bão Thiên Thạch, giảm 30% kháng phép boss và gỡ " + ToText(Cleared) + " vật cản.");
		break;
	}

	default:
		break;
	}


	// FULL BURST: cả đội đều đã tung ultimate trong cùng 1 turn.
	if (UltimatesUsedInTurn >= Team.AliveCount() && Team.AliveCount() > 1)
	{
		FTeamBuff Burst;
		Burst.Id = "buff.chain.fullburst";
		Burst.Source = "Full Burst";
		Burst.Stacks = 1;
		Burst.AtkPerStack = Cfg.FullBurstBonus;
		Burst.StaggerPerStack = Cfg.FullBurstBonus;
		Burst.TurnsLeft = 2;
		EffectsState.AddStack(Burst, 1);
		AddLog("*** FULL BURST! Toàn đội chain ultimate - hiệu ứng cộng thêm trong 2 turn. ***");
	}

	CheckBattleEnd();
	return FActionResult::Ok("Đã tung " + Skill.Name + ".");
}

// =============================================================================
//  Kết thúc turn
// =============================================================================
FActionResult FBattle::EndTurn()
{
	if (!bSetup)      { return FActionResult::Fail(EActionResult::Invalid, "Chưa thiết lập trận."); }
	if (IsFinished()) { return FActionResult::Fail(EActionResult::Finished, "Trận đã kết thúc."); }

	if (MovesUsedInTurn == 0) { AddLog("Người chơi kết thúc turn mà không nối được gì."); }
	AdvanceTurn(true);
	return FActionResult::Ok("Đã kết thúc turn.");
}

void FBattle::AdvanceTurn(bool bExplicitEarlyEnd)
{
	if (IsFinished()) { return; }

	// ---------------------------------------------------------------------
	// 1) Defender: nếu người chơi KHÔNG làm gì trong turn (kết thúc sớm),
	//    giảm sát thương boss gây ra cho toàn đội ở lượt kế tiếp.
	// ---------------------------------------------------------------------
	if (bExplicitEarlyEnd && MovesUsedInTurn == 0)
	{
		for (FCharacterState* D : Team.FindAllByRole(ERole::Defender))
		{
			FTeamBuff Shield;
			Shield.Id = "buff.defender.stance";
			Shield.Source = D->Def.Name;
			Shield.Stacks = 1;
			Shield.DamageTakenPerStack = Cfg.DefenderDamageReduction;
			Shield.TurnsLeft = Cfg.DefenderShieldTurns;
			EffectsState.AddStack(Shield, 1);
			AddLog(D->Def.Name + " (Defender) dựng thế thủ: giảm "
				+ ToText(Cfg.DefenderDamageReduction * 100.f) + "% sát thương boss gây ra.");
		}
	}

	// ---------------------------------------------------------------------
	// 2) Deflecter: đủ 4 stack match-4 -> cuối turn tự kích hoạt, hạ stagger nhanh hơn.
	// ---------------------------------------------------------------------
	for (FCharacterState* D : Team.FindAllByRole(ERole::Deflecter))
	{
		if (D->DeflectStacks < Cfg.DeflectStacksRequired) { continue; }

		D->DeflectStacks = 0;
		const float StaggerDamage = BossState.StaggerMax * Cfg.DeflectStaggerPercent;
		AddLog(D->Def.Name + " (Deflecter) giải phóng " + ToText(Cfg.DeflectStacksRequired)
			+ " stack match-4 -> phá " + ToText(StaggerDamage) + " stagger!");
		ReduceStagger(StaggerDamage, D->Def.Name + " [Deflecter]");
	}

	// ---------------------------------------------------------------------
	// 3) Kiểm tra bẫy đếm ngược (CountTrap) nổ vào cuối turn.
	// ---------------------------------------------------------------------
	std::vector<FCell> ExplodedTraps;
	if (BoardState.TickTraps(ExplodedTraps) > 0)
	{
		const float TrapDamage = 130.f * static_cast<float>(ExplodedTraps.size());
		const float Done = Team.DamageAll(TrapDamage);
		DamageTakenTotal += Done;
		AddLog("BẪY ĐẾM NGƯỢC NỔ! Gây " + ToText(Done) + " sát thương lên toàn đội!");
	}

	// ---------------------------------------------------------------------
	// 4) Boss hành động (trừ khi đang bị BREAK).
	// ---------------------------------------------------------------------
	if (!IsFinished()) { BossAction(); }

	// ---------------------------------------------------------------------
	// 5) Hết hạn buff/debuff.
	// ---------------------------------------------------------------------
	EffectsState.TickTurn();

	// ---------------------------------------------------------------------
	// 6) Nạp ultimate theo turn + hồi chiêu kỹ năng.
	// ---------------------------------------------------------------------
	for (FCharacterState& M : Team.Members())
	{
		if (!M.bAlive) { continue; }
		M.UltimateCharge = std::min(Cfg.UltimateMaxCharge, M.UltimateCharge + Cfg.UltimateChargePerTurn);
		M.BasicCooldown = std::max(0, M.BasicCooldown - 1);
	}

	// ---------------------------------------------------------------------
	// 7) Sang turn mới.
	// ---------------------------------------------------------------------
	TurnIndex += 1;
	MovesRemaining  = Cfg.MovesPerTurn;
	MovesUsedInTurn = 0;
	UltimatesUsedInTurn = 0;
	for (bool& b : bBasicSkillUsedThisTurn) { b = false; }

	AddLog("--- Turn " + ToText(TurnIndex) + " bắt đầu: " + ToText(MovesRemaining) + " lượt nối ---");

	// Tính toán dự định hành động tiếp theo của Boss cho UI hiển thị viền đỏ nhắm mục tiêu
	const int32 NextActionIdx = BossState.PatternIndex % 7;
	BossState.IntentAction = static_cast<EBossAction>(NextActionIdx);
	if (BossState.IntentAction == EBossAction::SingleTargetAttack)
	{
		const std::vector<int32> Alive = Team.AliveIndices();
		if (!Alive.empty())
		{
			int32 TargetIdx = Alive[0];
			float LowestHpPct = 1.0f;
			for (int32 idx : Alive)
			{
				if (Team.Members()[idx].HpPercent() < LowestHpPct)
				{
					LowestHpPct = Team.Members()[idx].HpPercent();
					TargetIdx = idx;
				}
			}
			BossState.IntentTargetMemberIndex = TargetIdx;
		}
		else { BossState.IntentTargetMemberIndex = -1; }
	}
	else
	{
		BossState.IntentTargetMemberIndex = -1;
	}

	UpdateChallenges();
	CheckBattleEnd();
}

void FBattle::BossAction()
{
	// Đang bị vỡ stagger: boss ngất, không hành động.
	if (BossState.bBroken)
	{
		BossState.BreakTurnsLeft -= 1;
		AddLog(BossState.Name + " đang BREAK, mất lượt hành động (còn "
			+ ToText(std::max(0, BossState.BreakTurnsLeft)) + " turn).");

		if (BossState.BreakTurnsLeft <= 0)
		{
			BossState.bBroken = false;
			BossState.Stagger = BossState.StaggerMax * 0.75f;   // hồi lại 75% thanh stagger
			AddLog(BossState.Name + " hồi tỉnh, thanh stagger được nạp lại.");
		}
		return;
	}

	// Hỗ trợ 6 dạng hành động của Boss (AoE, SingleTarget, SpawnObstacles, SpawnTraps, SelfBuff, WeakenTeam)
	const int32 ActionIndex = BossState.PatternIndex % 6;
	BossState.PatternIndex += 1;

	switch (static_cast<EBossAction>(ActionIndex))
	{
	case EBossAction::AoEAttack:
	{
		float Damage = BossState.Atk * 0.8f * BossState.SelfBuffAtkMultiplier(); // sát thương AoE cơ bản nhân hệ số Buff
		Damage *= EffectsState.DamageTakenMultiplier();          // khiên / Defender / miễn nhiễm
		const float Done = Team.DamageAll(Damage);
		DamageTakenTotal += Done;
		AddLog(BossState.Name + " dùng AoE: đội nhận " + ToText(Done) + " sát thương (hệ số nhận vào x"
			+ ToText(EffectsState.DamageTakenMultiplier()) + ").");
		break;
	}

	case EBossAction::SingleTargetAttack:
	{
		const std::vector<int32> Alive = Team.AliveIndices();
		if (!Alive.empty())
		{
			// Ưu tiên nhắm vào nhân vật có % HP thấp nhất
			int32 TargetIdx = Alive[0];
			float LowestHpPct = 1.0f;
			for (int32 idx : Alive)
			{
				if (Team.Members()[idx].HpPercent() < LowestHpPct)
				{
					LowestHpPct = Team.Members()[idx].HpPercent();
					TargetIdx = idx;
				}
			}

			FCharacterState& Target = Team.Members()[TargetIdx];
			float SingleTakenMult = EffectsState.DamageTakenMultiplier();

			// Kiểm tra Defender có đang bật đỡ đòn riêng cho TargetIdx hay không
			for (const FTeamBuff& Buff : EffectsState.Buffs)
			{
				if (Buff.CoveredMemberIndex == TargetIdx)
				{
					SingleTakenMult *= (1.f - Buff.DamageTakenPerStack);
					AddLog("[ĐỠ ĐÒN] Defender xông ra chặn đòn đơn thể bảo vệ " + Target.Def.Name + "!");
					break;
				}
			}

			float Damage = BossState.Atk * 1.6f * BossState.SelfBuffAtkMultiplier() * SingleTakenMult;
			const float Done = Team.DamageMember(TargetIdx, Damage);
			DamageTakenTotal += Done;
			AddLog(BossState.Name + " tung đòn ĐƠN THỂ dứt điểm vào " + Target.Def.Name + ": gây " + ToText(Done) + " sát thương!");

			if (!Target.bAlive && Target.Def.MatchColor != EColor::None)
			{
				const int32 Replaced = BoardState.ReplaceColorWithObstacles(Target.Def.MatchColor);
				AddLog("NHÂN VẬT GỤC: " + Target.Def.Name + " gục ngã! " + ToText(Replaced) + " block màu "
					+ ColorName(Target.Def.MatchColor) + " trên bàn biến thành Vật cản!");
			}
		}
		break;
	}

	case EBossAction::BossChargeAttack:
	{
		if (BossState.bCharging)
		{
			// Phá chiêu thất bại -> Tuyệt kĩ nổ cực mạnh
			BossState.bCharging = false;
			float Damage = BossState.Atk * 2.2f * BossState.SelfBuffAtkMultiplier() * EffectsState.DamageTakenMultiplier();
			const float Done = Team.DamageAll(Damage);
			DamageTakenTotal += Done;
			AddLog("PHÁ CHIÊU THẤT BẠI! " + BossState.Name + " giáng Tuyệt kĩ nổ " + ToText(Done) + " sát thương lên toàn đội!");
		}
		else
		{
			// Bắt đầu nạp tuyệt kĩ (Skill Break QTE)
			BossState.bCharging = true;
			BossState.SkillBreakKind = ESkillBreakKind::ComboCount;
			BossState.SkillBreakRequired = 3; // Nối combo >= 3 trong 1 nước
			BossState.SkillBreakCurrent = 0;
			AddLog(BossState.Name + " bắt đầu NẠP TUYỆT KĨ! Yêu cầu phá chiêu: Tạo chuỗi combo >= 3 trong lượt nối!");
		}
		break;
	}

	case EBossAction::SpawnObstacles:
	{
		if (EffectsState.BlocksObstacleSpawn())
		{
			AddLog(BossState.Name + " định tạo vật cản nhưng bị Hộ thuẫn chặn!");
			break;
		}
		const std::vector<FCell> Placed = BoardState.PlaceRandomObstacles(Cfg.BossObstaclesPerAction, 1);
		AddLog(BossState.Name + " tạo " + ToText(static_cast<int32>(Placed.size())) + " vật cản lên bàn.");
		break;
	}

	case EBossAction::SpawnTraps:
	{
		const std::vector<FCell> Placed = BoardState.PlaceRandomTraps(2, 3);
		AddLog(BossState.Name + " gài " + ToText(static_cast<int32>(Placed.size())) + " Bẫy đếm ngược (3 turn) lên bàn!");
		break;
	}

	case EBossAction::SelfBuff:
	{
		BossState.SelfBuffStacks += 1;
		AddLog(BossState.Name + " tịnh quán vận công! Sát thương tăng thành +"
			+ ToText(BossState.SelfBuffStacks * 10) + "%.");
		break;
	}

	case EBossAction::WeakenTeam:
	default:
	{
		FTeamBuff Debuff;
		Debuff.Id = "debuff.boss.weaken";
		Debuff.Source = BossState.Name;
		Debuff.Stacks = 1;
		Debuff.AtkPerStack = -0.12f;      // giảm 12% sát thương match mỗi stack
		Debuff.TurnsLeft = static_cast<int32>(std::max(1.f, Cfg.BossWeakenTurns));
		EffectsState.AddStack(Debuff, 5);
		AddLog(BossState.Name + " gây debuff lên đội: -12% sát thương match trong "
			+ ToText(Debuff.TurnsLeft) + " turn.");
		break;
	}
	}
}

FActionResult FBattle::UseReviveSkill(int32 MemberIndex, int32 TargetMemberIndex)
{
	if (!bSetup)      { return FActionResult::Fail(EActionResult::Invalid, "Chưa thiết lập trận."); }
	if (IsFinished()) { return FActionResult::Fail(EActionResult::Finished, "Trận đã kết thúc."); }

	FCharacterState* Caster = Team.TryGet(MemberIndex);
	if (!Caster || !Caster->bAlive) { return FActionResult::Fail(EActionResult::NotReady, "Người thi triển không khả dụng."); }

	FCharacterState* Target = Team.TryGet(TargetMemberIndex);
	if (!Target) { return FActionResult::Fail(EActionResult::Invalid, "Nhân vật mục tiêu không tồn tại."); }
	if (Target->bAlive) { return FActionResult::Fail(EActionResult::Invalid, Target->Def.Name + " vẫn còn sống."); }

	const bool Ok = Team.ReviveMember(TargetMemberIndex, 0.50f);
	if (Ok)
	{
		AddLog("HỒI SINH: " + Caster->Def.Name + " hồi sinh thành công " + Target->Def.Name + " với 50% HP!");
		BoardState.EnsurePlayable();
	}
	return Ok ? FActionResult::Ok("Đã hồi sinh " + Target->Def.Name + ".") : FActionResult::Fail(EActionResult::Invalid, "Hồi sinh thất bại.");
}

// =============================================================================
//  Challenge / kết thúc trận / đánh giá sao
// =============================================================================
void FBattle::UpdateChallenges()
{
	for (FChallenge& Challenge : ChallengeList)
	{
		if (Challenge.bCompleted) { continue; }

		switch (Challenge.Kind)
		{
		case FChallenge::EKind::ClearAllObstacles:
			if (BoardState.ObstacleCount() == 0)
			{
				Challenge.bCompleted = true;
				AddLog("[Challenge] Hoàn thành: " + Challenge.Description);
			}
			break;

		case FChallenge::EKind::WinWithinTurns:
			if (bVictory && TurnIndex <= Challenge.Value)
			{
				Challenge.bCompleted = true;
				AddLog("[Challenge] Hoàn thành: " + Challenge.Description);
			}
			break;

		case FChallenge::EKind::NoMemberDowned:
			// Chỉ tính khi thắng; nếu có người gục thì điều kiện này không bao giờ xong.
			if (bVictory && Team.AliveCount() == Team.MemberCount())
			{
				Challenge.bCompleted = true;
				AddLog("[Challenge] Hoàn thành: " + Challenge.Description);
			}
			break;

		case FChallenge::EKind::TriggerManyInOneMove:
			if (MaxBlocksInSingleMove >= Challenge.Value)
			{
				Challenge.bCompleted = true;
				AddLog("[Challenge] Hoàn thành: " + Challenge.Description);
			}
			break;

		case FChallenge::EKind::RequireRoleCount:
		{
			int32 Count = 0;
			for (const FCharacterState& M : Team.Members())
			{
				if (M.Def.Role == Challenge.TargetRole) { ++Count; }
			}
			if (bVictory && Count >= Challenge.Value)
			{
				Challenge.bCompleted = true;
				AddLog("[Challenge] Hoàn thành: " + Challenge.Description);
			}
			break;
		}

		case FChallenge::EKind::RequireDistinctClasses:
		{
			std::vector<ERole> Roles;
			for (const FCharacterState& M : Team.Members())
			{
				if (std::find(Roles.begin(), Roles.end(), M.Def.Role) == Roles.end())
				{
					Roles.push_back(M.Def.Role);
				}
			}
			if (bVictory && static_cast<int32>(Roles.size()) >= Challenge.Value)
			{
				Challenge.bCompleted = true;
				AddLog("[Challenge] Hoàn thành: " + Challenge.Description);
			}
			break;
		}
		}
	}
}


void FBattle::CheckBattleEnd()
{
	if (IsFinished()) { return; }

	if (BossState.Hp <= 0.f)
	{
		if (BossState.CurrentPhase < BossState.TotalPhases)
		{
			BossState.CurrentPhase++;
			BossState.Hp = BossState.HpMax;
			BossState.Stagger = BossState.StaggerMax;
			BossState.bBroken = false;
			BossState.BreakTurnsLeft = 0;
			AddLog("!!! BOSS CHUYỂN SANG PHASE " + ToText(BossState.CurrentPhase) + "/" + ToText(BossState.TotalPhases) + " !!!");
			return;
		}
		BossState.Hp = 0.f;
		bVictory = true;
		AddLog("=== CHIẾN THẮNG sau " + ToText(TurnIndex) + " turn ===");
		UpdateChallenges();
		MaxStarsReached = EvaluateStars();
		AddLog("Đánh giá: " + ToText(MaxStarsReached) + " sao.");
		return;
	}

	if (Team.AllDead())
	{
		bDefeat = true;
		AddLog("=== THẤT BẠI: toàn đội đã gục ===");
	}
}

int32 FBattle::EvaluateStars() const
{
	if (!bVictory) { return 0; }

	int32 Stars = Cfg.MinStars;
	for (const FChallenge& Challenge : ChallengeList)
	{
		if (Challenge.bCompleted) { Stars += 1; }
	}
	return std::max(Cfg.MinStars, std::min(Cfg.MaxStars, Stars));
}

FBattleSnapshot FBattle::Snapshot() const
{
	FBattleSnapshot Snap;
	Snap.Turn = TurnIndex;
	Snap.MovesLeft = MovesRemaining;
	Snap.MovesPerTurn = Cfg.MovesPerTurn;

	Snap.BossHp = BossState.Hp;
	Snap.BossHpMax = BossState.HpMax;
	Snap.Stagger = BossState.Stagger;
	Snap.StaggerMax = BossState.StaggerMax;
	Snap.bBroken = BossState.bBroken;

	Snap.TeamHp = Team.TotalHp();
	Snap.TeamHpMax = Team.TotalHpMax();
	Snap.TeamAliveCount = Team.AliveCount();

	Snap.Obstacles = BoardState.ObstacleCount();
	Snap.Stars = MaxStarsReached;
	Snap.bVictory = bVictory;
	Snap.bDefeat = bDefeat;
	Snap.UltimateChainCount = UltimatesUsedInTurn;
	return Snap;
}

// =============================================================================
//  Log
// =============================================================================
void FBattle::AddLog(const std::string& Line)
{
	LogText.push_back(Line);
	// Giữ log gọn để UI đọc nhanh.
	constexpr size_t MaxLines = 400;
	if (LogText.size() > MaxLines) { LogText.erase(LogText.begin()); }
}

const std::string& FBattle::LastLog() const
{
	static const std::string Empty;
	return LogText.empty() ? Empty : LogText.back();
}

// =============================================================================
//  Tiện ích nội bộ
// =============================================================================
int32 FBattle::FindMemberIndexByRole(ERole Role) const
{
	for (int32 i = 0; i < Team.MemberCount(); ++i)
	{
		if (Team.Members()[static_cast<size_t>(i)].Def.Role == Role) { return i; }
	}
	return -1;
}

FCharacterState* FBattle::FindMemberByColor(EColor Color)
{
	return Team.FindByColor(Color);
}

void FBattle::RebuildPartyStats()
{
	Team.RecomputeStats(Cfg);
}

void FBattle::TickTurnStart()
{
	// Hiện chưa cần xử lý gì riêng ở đầu turn; giữ hàm để dễ mở rộng về sau.
}

} // namespace M3
