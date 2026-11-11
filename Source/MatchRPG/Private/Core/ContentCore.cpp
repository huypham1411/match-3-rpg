// Copyright MatchRPG. Built-in content: default roster, skills, gacha pool, demo stage.
#include "Core/ContentCore.h"

namespace MatchRPG
{

namespace
{
	/** Skill ids: 1xx = manual skills, 2xx = ultimates. */
	const int32 Skill_Attacker_Manual = 100;
	const int32 Skill_Supporter_Manual = 101;
	const int32 Skill_Healer_Manual = 102;
	const int32 Skill_Defender_Manual = 103;
	const int32 Skill_Counter_Manual = 104;
	const int32 Skill_Deflector_Manual = 105;

	const int32 Skill_Attacker_Ultimate = 200;
	const int32 Skill_Supporter_Ultimate = 201;
	const int32 Skill_Healer_Ultimate = 202;
	const int32 Skill_Defender_Ultimate = 203;
	const int32 Skill_Counter_Ultimate = 204;
	const int32 Skill_Deflector_Ultimate = 205;

	FSkillEffectRow MakeDamageEffect(float AtkFraction, ESkillScaleMode Scale)
	{
		FSkillEffectRow Effect;
		Effect.Kind = ESkillEffectKind::Damage;
		Effect.Scale = Scale;
		Effect.BaseValue = AtkFraction;
		Effect.Target = ETargetMode::Boss;
		return Effect;
	}

	FSkillEffectRow MakeTeamStatus(EStatusType Status, float Potency, int32 Stacks, int32 Duration)
	{
		FSkillEffectRow Effect;
		Effect.Kind = ESkillEffectKind::ApplyStatusTeam;
		Effect.Status = Status;
		Effect.BaseValue = Potency;
		Effect.BaseStacks = Stacks;
		Effect.BaseDuration = Duration;
		Effect.Target = ETargetMode::Team;
		return Effect;
	}

	FSkillEffectRow MakeBossStatus(EStatusType Status, float Potency, int32 Stacks, int32 Duration)
	{
		FSkillEffectRow Effect;
		Effect.Kind = ESkillEffectKind::ApplyStatusBoss;
		Effect.Status = Status;
		Effect.BaseValue = Potency;
		Effect.BaseStacks = Stacks;
		Effect.BaseDuration = Duration;
		Effect.Target = ETargetMode::Boss;
		Effect.bCountsAsBossDebuff = true;
		return Effect;
	}

	FCharacterDefinitionRow MakeHero(int32 Id, ERoleType Role, EBlockColor Color, int32 Rarity, int32 Hp, int32 Atk, int32 Heal, int32 Support, int32 Def)
	{
		FCharacterDefinitionRow Row;
		Row.Id = Id;
		Row.Role = Role;
		Row.BoundColor = Color;
		Row.Rarity = Rarity;
		Row.MaxHp = Hp;
		Row.Atk = Atk;
		Row.HealPower = Heal;
		Row.SupportPower = Support;
		Row.Def = Def;
		Row.ManualSkillId = Skill_Attacker_Manual + (static_cast<int32>(Role));
		Row.UltimateId = Skill_Attacker_Ultimate + (static_cast<int32>(Role));
		return Row;
	}

	FGachaEntryRow MakeGachaEntry(int32 CharacterId, int32 Rarity, float Weight)
	{
		FGachaEntryRow Entry;
		Entry.CharacterId = CharacterId;
		Entry.Rarity = Rarity;
		Entry.Weight = Weight;
		return Entry;
	}

	FBossActionRow MakeBossAction(EBossActionType Type, int32 Magnitude)
	{
		FBossActionRow Row;
		Row.Type = Type;
		Row.Magnitude = Magnitude;
		return Row;
	}

	FChallengeObjectiveRow MakeObjective(EObjectiveType Type, int32 Param, int32 Target, bool bPrimary)
	{
		FChallengeObjectiveRow Row;
		Row.Type = Type;
		Row.Param = Param;
		Row.Target = Target;
		Row.bPrimary = bPrimary;
		return Row;
	}
}

namespace ContentCore
{

FBoardRules BuildDefaultBoardRules()
{
	FBoardRules Rules;
	Rules.Width = 8;
	Rules.Height = 8;
	Rules.ColorCount = 5;
	Rules.bEnableSquareMatch = true;
	Rules.SquareObstacleDamage = 2;
	Rules.SquareObstacleRadius = 1;
	Rules.Line4ObstacleDamage = 1;
	Rules.bMatch5CreatesSwapAll = true;
	Rules.bMatch5AlsoClearsOwnLine = true;
	Rules.SpecialObstacleDamage = 1;
	Rules.AreaBombObstacleDamage = 2;
	Rules.MaxCascadeDepth = 12;
	Rules.bAllowAutoShuffle = true;
	Rules.bRefillFromTop = true;
	return Rules;
}

FEffectScaleRules BuildDefaultScales()
{
	FEffectScaleRules Scales;
	Scales.DamagePerBlock = 0.30f;
	Scales.DamageQuadratic = 0.05f;
	Scales.DamageMaxMultiplier = 12.0f;

	Scales.HealGrowthPerBlock = 1.18f;
	Scales.HealMaxMultiplier = 24.0f;

	Scales.BuffStacksAtBase = 1;
	Scales.BuffStacksPerExtraBlock = 1;
	Scales.BuffDurationAtBase = 2;
	Scales.BuffDurationPerExtraBlock = 1;
	Scales.BuffMaxStacks = 8;
	Scales.SupportPotencyPerStack = 0.05f;

	Scales.CascadeMultiplierPerLevel = 0.25f;

	Scales.UltGaugePerTurn = 12.0f;
	Scales.UltGaugePerTriggeredBlock = 1.5f;
	Scales.UltGaugePerSpecial = 4.0f;
	Scales.UltGaugeMax = 100.0f;
	Scales.FullBurstChainLength = 3;
	Scales.FullBurstDamageBonus = 0.50f;
	Scales.FullBurstStaggerBonus = 0.50f;
	Scales.ChainDamageBonusPerStep = 0.15f;

	Scales.StaggerPerDamage = 0.65f;
	Scales.StaggerFromDebuff = 0.15f;
	Scales.BreakDamageBonus = 0.30f;
	Scales.BreakStaggerGrowth = 1.25f;
	Scales.BreakDurationTurns = 1;

	Scales.DeflectorMaxStacks = 4;
	Scales.DeflectorChargePerLine4 = 1;
	Scales.DeflectorChargePerSquare = 1;
	Scales.DeflectorChargePerLine5 = 2;
	Scales.DeflectorStaggerPercent = 0.25f;
	Scales.DeflectorDamageCut = 0.35f;

	Scales.DefenderIdleDamageCut = 0.60f;
	Scales.DefenderGuardStacksPerMatch = 1;
	Scales.GuardDamageCutPerStack = 0.03f;
	Scales.GuardMaxStacks = 10;
	return Scales;
}

void BuildStarterRoster(TArray<FCharacterDefinitionRow>& OutRoster)
{
	// The four heroes every account begins with: one per basic role.
	OutRoster.Add(MakeHero(1, ERoleType::Attacker, EBlockColor::Red, 4, 1150, 135, 60, 60, 45));
	OutRoster.Add(MakeHero(2, ERoleType::Supporter, EBlockColor::Blue, 4, 1050, 70, 70, 90, 40));
	OutRoster.Add(MakeHero(3, ERoleType::Healer, EBlockColor::Green, 4, 1000, 60, 110, 70, 38));
	// The defender still owns a colour so it generates Guard stacks, but its real
	// payoff is the "ended the turn without acting" mitigation.
	OutRoster.Add(MakeHero(4, ERoleType::Defender, EBlockColor::Yellow, 4, 1400, 75, 60, 60, 80));
}

void BuildGachaRoster(TArray<FCharacterDefinitionRow>& OutRoster)
{
	// Gacha-only heroes include the two special roles.
	OutRoster.Add(MakeHero(5, ERoleType::Counter, EBlockColor::Purple, 5, 1100, 150, 60, 60, 45));
	OutRoster.Add(MakeHero(6, ERoleType::Deflector, EBlockColor::Blue, 5, 1200, 95, 70, 75, 55));
	OutRoster.Add(MakeHero(7, ERoleType::Attacker, EBlockColor::Purple, 3, 950, 110, 55, 55, 35));
	OutRoster.Add(MakeHero(8, ERoleType::Healer, EBlockColor::Blue, 3, 900, 55, 92, 60, 32));
	OutRoster.Add(MakeHero(9, ERoleType::Supporter, EBlockColor::Green, 3, 880, 60, 60, 78, 30));
	OutRoster.Add(MakeHero(10, ERoleType::Attacker, EBlockColor::Yellow, 5, 1250, 165, 65, 70, 50));
	OutRoster.Add(MakeHero(11, ERoleType::Defender, EBlockColor::Red, 3, 1300, 70, 55, 55, 72));
}

void BuildFullRoster(TArray<FCharacterDefinitionRow>& OutRoster)
{
	OutRoster.Reset();
	BuildStarterRoster(OutRoster);
	BuildGachaRoster(OutRoster);
}

bool FindCharacter(const TArray<FCharacterDefinitionRow>& Roster, int32 CharacterId, FCharacterDefinitionRow& OutRow)
{
	for (int32 i = 0; i < Roster.Num(); ++i)
	{
		if (Roster[i].Id == CharacterId)
		{
			OutRow = Roster[i];
			return true;
		}
	}
	return false;
}

void BuildSkillLibrary(FSkillLibrary& OutLibrary)
{
	OutLibrary.Reset();

	// --- manual skills ----------------------------------------------------
	{
		// Attacker: "raise the damage of every match this turn".
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Attacker_Manual;
		Skill.Kind = ESkillSlotKind::Manual;
		Skill.OwnerRole = ERoleType::Attacker;
		Skill.CooldownTurns = 3;
		Skill.Effects.Add(MakeTeamStatus(EStatusType::AtkUp, 0.30f, 1, 1));
		Skill.Effects.Add(MakeTeamStatus(EStatusType::ElementAmp, 0.15f, 1, 1));
		OutLibrary.Add(Skill);
	}
	{
		// Supporter: "remove one blocking block" - obstacle or a board debuff.
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Supporter_Manual;
		Skill.Kind = ESkillSlotKind::Manual;
		Skill.OwnerRole = ERoleType::Supporter;
		Skill.CooldownTurns = 3;

		FSkillEffectRow Obstacle;
		Obstacle.Kind = ESkillEffectKind::ClearObstacles;
		Obstacle.BaseValue = 0.0f;
		Obstacle.TargetCount = 1;
		Obstacle.Target = ETargetMode::Team;
		Obstacle.Obstacle = EObstacleType::None; // None => whatever the stage is asking for
		Skill.Effects.Add(Obstacle);

		FSkillEffectRow Cleanse;
		Cleanse.Kind = ESkillEffectKind::ClearBoardDebuffs;
		Cleanse.BaseValue = 0.0f;
		Cleanse.TargetCount = 2;
		Cleanse.Target = ETargetMode::Team;
		Skill.Effects.Add(Cleanse);
		OutLibrary.Add(Skill);
	}
	{
		// Healer: healing effectiveness plus a short immunity window.
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Healer_Manual;
		Skill.Kind = ESkillSlotKind::Manual;
		Skill.OwnerRole = ERoleType::Healer;
		Skill.CooldownTurns = 3;
		Skill.Effects.Add(MakeTeamStatus(EStatusType::Regen, 0.06f, 2, 2));
		Skill.Effects.Add(MakeTeamStatus(EStatusType::DamageCut, 0.30f, 1, 1));
		OutLibrary.Add(Skill);
	}
	{
		// Defender: stacking mitigation for the whole team.
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Defender_Manual;
		Skill.Kind = ESkillSlotKind::Manual;
		Skill.OwnerRole = ERoleType::Defender;
		Skill.CooldownTurns = 3;
		Skill.Effects.Add(MakeTeamStatus(EStatusType::Guard, 0.03f, 4, 2));
		Skill.Effects.Add(MakeTeamStatus(EStatusType::DefUp, 0.20f, 1, 2));
		OutLibrary.Add(Skill);
	}
	{
		// Counter: only while the stagger gauge is broken.
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Counter_Manual;
		Skill.Kind = ESkillSlotKind::Manual;
		Skill.OwnerRole = ERoleType::Counter;
		Skill.CooldownTurns = 2;
		Skill.bRequiresBossBroken = true;
		Skill.Effects.Add(MakeDamageEffect(1.80f, ESkillScaleMode::Fixed));
		OutLibrary.Add(Skill);
	}
	{
		// Deflector: manually top up the deflector charge.
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Deflector_Manual;
		Skill.Kind = ESkillSlotKind::Manual;
		Skill.OwnerRole = ERoleType::Deflector;
		Skill.CooldownTurns = 4;

		FSkillEffectRow Charge;
		Charge.Kind = ESkillEffectKind::AddDeflectorStacks;
		Charge.BaseValue = 0.0f;
		Charge.TargetCount = 1;
		Charge.Target = ETargetMode::Self;
		Skill.Effects.Add(Charge);

		FSkillEffectRow Stagger;
		Stagger.Kind = ESkillEffectKind::DirectStaggerDrain;
		Stagger.BaseValue = 0.08f;
		Stagger.Target = ETargetMode::Boss;
		Skill.Effects.Add(Stagger);
		OutLibrary.Add(Skill);
	}

	// --- ultimates --------------------------------------------------------
	{
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Attacker_Ultimate;
		Skill.Kind = ESkillSlotKind::Ultimate;
		Skill.OwnerRole = ERoleType::Attacker;
		Skill.ChainWeight = 1.4f;
		Skill.Effects.Add(MakeDamageEffect(4.20f, ESkillScaleMode::BurstChain));
		OutLibrary.Add(Skill);
	}
	{
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Supporter_Ultimate;
		Skill.Kind = ESkillSlotKind::Ultimate;
		Skill.OwnerRole = ERoleType::Supporter;
		Skill.ChainWeight = 1.0f;
		Skill.Effects.Add(MakeTeamStatus(EStatusType::AtkUp, 0.32f, 2, 3));
		Skill.Effects.Add(MakeTeamStatus(EStatusType::ElementAmp, 0.12f, 1, 3));
		Skill.Effects.Add(MakeBossStatus(EStatusType::DefDown, 0.25f, 2, 3));
		OutLibrary.Add(Skill);
	}
	{
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Healer_Ultimate;
		Skill.Kind = ESkillSlotKind::Ultimate;
		Skill.OwnerRole = ERoleType::Healer;
		Skill.ChainWeight = 1.0f;

		FSkillEffectRow Heal;
		Heal.Kind = ESkillEffectKind::Heal;
		Heal.Scale = ESkillScaleMode::Fixed;
		Heal.BaseValue = 2.20f;
		Heal.Target = ETargetMode::Team;
		Skill.Effects.Add(Heal);
		Skill.Effects.Add(MakeTeamStatus(EStatusType::Regen, 0.08f, 3, 3));
		OutLibrary.Add(Skill);
	}
	{
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Defender_Ultimate;
		Skill.Kind = ESkillSlotKind::Ultimate;
		Skill.OwnerRole = ERoleType::Defender;
		Skill.ChainWeight = 0.8f;
		Skill.Effects.Add(MakeTeamStatus(EStatusType::DamageCut, 0.50f, 1, 2));
		Skill.Effects.Add(MakeTeamStatus(EStatusType::Guard, 0.03f, 5, 3));
		OutLibrary.Add(Skill);
	}
	{
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Counter_Ultimate;
		Skill.Kind = ESkillSlotKind::Ultimate;
		Skill.OwnerRole = ERoleType::Counter;
		Skill.ChainWeight = 1.6f;
		Skill.bRequiresBossBroken = true;
		Skill.Effects.Add(MakeDamageEffect(6.50f, ESkillScaleMode::BurstChain));
		OutLibrary.Add(Skill);
	}
	{
		FSkillDefinitionRow Skill;
		Skill.Id = Skill_Deflector_Ultimate;
		Skill.Kind = ESkillSlotKind::Ultimate;
		Skill.OwnerRole = ERoleType::Deflector;
		Skill.ChainWeight = 1.2f;

		FSkillEffectRow Stagger;
		Stagger.Kind = ESkillEffectKind::DirectStaggerDrain;
		Stagger.BaseValue = 0.35f;
		Stagger.Target = ETargetMode::Boss;
		Skill.Effects.Add(Stagger);
		Skill.Effects.Add(MakeDamageEffect(2.00f, ESkillScaleMode::BurstChain));
		OutLibrary.Add(Skill);
	}
}

void BuildGachaPool(const TArray<FCharacterDefinitionRow>& Roster, FGachaPoolRow& OutPool)
{
	OutPool.Entries.Reset();
	for (int32 i = 0; i < Roster.Num(); ++i)
	{
		const FCharacterDefinitionRow& Hero = Roster[i];
		// Starters are part of the pool too (duplicates give future "awakening" fodder).
		OutPool.Entries.Add(MakeGachaEntry(Hero.Id, Hero.Rarity, Hero.Rarity >= 5 ? 0.35f : 1.0f));
	}
	OutPool.PityThreshold = 90;
	OutPool.SoftPityWindow = 15;
	OutPool.SoftPityStepBonus = 0.06f;
	OutPool.BaseFiveStarRate = 0.006f;
	OutPool.BaseFourStarRate = 0.051f;
}

void BuildStarterEquipment(TArray<FEquipmentSlot>& OutItems)
{
	OutItems.Reset();

	FEquipmentSlot Ember;
	Ember.ItemId = 10;
	Ember.Element = EBlockColor::Red;
	Ember.ElementBonus = 0.10f;
	Ember.AtkBonus = 20;
	OutItems.Add(Ember);

	FEquipmentSlot Tide;
	Tide.ItemId = 11;
	Tide.Element = EBlockColor::Blue;
	Tide.ElementBonus = 0.08f;
	Tide.HpBonus = 80;
	OutItems.Add(Tide);

	FEquipmentSlot Verdant;
	Verdant.ItemId = 12;
	Verdant.Element = EBlockColor::Green;
	Verdant.ElementBonus = 0.08f;
	Verdant.DefBonus = 10;
	OutItems.Add(Verdant);

	FEquipmentSlot Sunplate;
	Sunplate.ItemId = 13;
	Sunplate.Element = EBlockColor::Yellow;
	Sunplate.ElementBonus = 0.08f;
	Sunplate.DefBonus = 14;
	OutItems.Add(Sunplate);

	FEquipmentSlot Dusk;
	Dusk.ItemId = 14;
	Dusk.Element = EBlockColor::Purple;
	Dusk.ElementBonus = 0.12f;
	Dusk.AtkBonus = 15;
	OutItems.Add(Dusk);
}

void BuildStarterFormation(const TArray<FCharacterDefinitionRow>& Roster, FTeamFormation& OutFormation)
{
	TArray<FEquipmentSlot> Items;
	BuildStarterEquipment(Items);

	int32 SlotIndex = 0;
	for (int32 i = 0; i < Roster.Num() && SlotIndex < MaxTeamSlots; ++i)
	{
		const FCharacterDefinitionRow& Hero = Roster[i];
		// Only the four starters (shipped with the account) go in the default team.
		if (Hero.Id > 4) { continue; }

		FTeamSlot& Slot = OutFormation.Slots[SlotIndex];
		Slot.CharacterId = Hero.Id;
		Slot.bPetSlotUnlocked = false;
		Slot.PetId = INDEX_NONE;

		// Give each hero the gear matching its own element.
		for (int32 ItemIndex = 0; ItemIndex < Items.Num(); ++ItemIndex)
		{
			if (Items[ItemIndex].Element == Hero.BoundColor)
			{
				Slot.Equipment[0] = Items[ItemIndex];
			}
		}
		++SlotIndex;
	}
}

void BuildDemoStage(FStageDefinitionRow& OutStage)
{
	OutStage.StageId = 1;
	OutStage.MovesPerTurn = 4;
	OutStage.TurnLimit = 15;
	OutStage.StarTurnThreshold = 10;
	OutStage.FirstClearGemReward = 60;
	OutStage.Board = BuildDefaultBoardRules();
	OutStage.Scales = BuildDefaultScales();

	OutStage.Boss.Id = 1;
	OutStage.Boss.MaxHp = 12000;
	OutStage.Boss.StaggerMax = 900.0f;
	OutStage.Boss.BreakDurationTurns = 1;
	OutStage.Boss.bEnrageBelowHalfHp = true;

	// The boss cycle: obstacles, AoE, a debuff that blocks matching, a heavy hit,
	// then a bigger AoE once it is wounded.
	FBossActionRow SpawnIce = MakeBossAction(EBossActionType::SpawnObstacle, 4);
	SpawnIce.Obstacle = EObstacleType::Ice;
	OutStage.Boss.Script.Add(SpawnIce);

	FBossActionRow AoE1 = MakeBossAction(EBossActionType::DamageAll, 150);
	AoE1.Target = ETargetMode::Team;
	AoE1.EnrageMultiplier = 1.6f;
	OutStage.Boss.Script.Add(AoE1);

	FBossActionRow Weaken = MakeBossAction(EBossActionType::ApplyStatus, 0);
	Weaken.Status = EStatusType::AtkDown;
	Weaken.StatusValue = 0.20f;
	Weaken.StatusTurns = 2;
	Weaken.Target = ETargetMode::Team;
	OutStage.Boss.Script.Add(Weaken);

	FBossActionRow Jam = MakeBossAction(EBossActionType::JamColor, 0);
	Jam.StatusTurns = 2;
	OutStage.Boss.Script.Add(Jam);

	FBossActionRow Heavy = MakeBossAction(EBossActionType::DamageOne, 320);
	Heavy.Target = ETargetMode::RandomAlly;
	OutStage.Boss.Script.Add(Heavy);

	FBossActionRow SpawnRock = MakeBossAction(EBossActionType::SpawnObstacle, 2);
	SpawnRock.Obstacle = EObstacleType::Rock;
	OutStage.Boss.Script.Add(SpawnRock);

	FBossActionRow Lock = MakeBossAction(EBossActionType::LockCells, 3);
	Lock.StatusTurns = 2;
	OutStage.Boss.Script.Add(Lock);

	// Challenge objectives -> drive the 1..3 star rating of the map.
	OutStage.Objectives.Add(MakeObjective(EObjectiveType::ClearObstacles, static_cast<int32>(EObstacleType::Ice), 6, true));
	OutStage.Objectives.Add(MakeObjective(EObjectiveType::BreakBoss, 0, 1, true));
	OutStage.Objectives.Add(MakeObjective(EObjectiveType::FinishWithinTurns, 0, 10, false));
}

} // namespace ContentCore

// ---------------------------------------------------------------------------
// FGachaCore
// ---------------------------------------------------------------------------

void FGachaCore::Initialize(const FGachaPoolRow& InPool, FMatchRng* InRng)
{
	Pool = InPool;
	if (InRng != nullptr) { Rng = InRng; }
	else { Rng = &FallbackRng; }
	Reset();
}

void FGachaCore::Reset()
{
	PityCounter = Pool.PityCounterStart;
	PullsSinceFiveStar = 0;
	TotalPulls = 0;
}

int32 FGachaCore::PickRarity(bool& bOutWasPity)
{
	bOutWasPity = false;

	if (PityCounter + 1 >= Pool.PityThreshold)
	{
		bOutWasPity = true;
		return 5;
	}

	float FiveStarRate = Pool.BaseFiveStarRate;
	const int32 SoftStart = FMath::Max(0, Pool.PityThreshold - Pool.SoftPityWindow);
	if (PityCounter > SoftStart)
	{
		FiveStarRate += static_cast<float>(PityCounter - SoftStart) * Pool.SoftPityStepBonus;
	}

	const float Roll = Rng->Fraction();
	if (Roll < FiveStarRate) { return 5; }
	if (Roll < FiveStarRate + Pool.BaseFourStarRate) { return 4; }
	return 3;
}

int32 FGachaCore::PickCharacterOfRarity(int32 Rarity)
{
	TArray<int32> Candidates;
	TArray<float> Weights;
	float TotalWeight = 0.0f;

	for (int32 i = 0; i < Pool.Entries.Num(); ++i)
	{
		if (Pool.Entries[i].Rarity != Rarity) { continue; }
		Candidates.Add(Pool.Entries[i].CharacterId);
		Weights.Add(Pool.Entries[i].Weight);
		TotalWeight += Pool.Entries[i].Weight;
	}

	if (Candidates.Num() == 0)
	{
		// No hero of that rarity exists: take anything so a pull is never empty.
		for (int32 i = 0; i < Pool.Entries.Num(); ++i)
		{
			Candidates.Add(Pool.Entries[i].CharacterId);
			Weights.Add(Pool.Entries[i].Weight);
			TotalWeight += Pool.Entries[i].Weight;
		}
	}
	if (Candidates.Num() == 0) { return INDEX_NONE; }

	float Roll = Rng->Fraction() * TotalWeight;
	for (int32 i = 0; i < Candidates.Num(); ++i)
	{
		Roll -= Weights[i];
		if (Roll <= 0.0f) { return Candidates[i]; }
	}
	return Candidates[Candidates.Num() - 1];
}

FGachaPullResult FGachaCore::PullOnce()
{
	FGachaPullResult Result;

	bool bWasPity = false;
	const int32 Rarity = PickRarity(bWasPity);
	Result.Rarity = Rarity;
	Result.CharacterId = PickCharacterOfRarity(Rarity);
	Result.bWasPity = bWasPity;

	++TotalPulls;
	if (Rarity >= 5)
	{
		PityCounter = 0;
		PullsSinceFiveStar = 0;
	}
	else
	{
		++PityCounter;
		++PullsSinceFiveStar;
	}
	return Result;
}

void FGachaCore::PullTen(TArray<FGachaPullResult>& OutResults)
{
	OutResults.Reset();
	for (int32 i = 0; i < 10; ++i) { OutResults.Add(PullOnce()); }
}

} // namespace MatchRPG
