// Copyright MatchRPG. Headless deterministic battle simulation.
#include "Core/BattleSimCore.h"

namespace MatchRPG
{

namespace
{
	FBattleEvent MakeEvent(FBattleEvent::EKind Kind, int32 Turn)
	{
		FBattleEvent Event;
		Event.Kind = Kind;
		Event.Turn = Turn;
		return Event;
	}

	/** How many stacks a status may pile up to. Guard has its own ceiling. */
	int32 GetStatusStackCap(const FEffectScaleRules& Scales, EStatusType Type)
	{
		if (Type == EStatusType::Guard) { return FMath::Max(1, Scales.GuardMaxStacks); }
		return FMath::Max(2, Scales.BuffMaxStacks * 2);
	}
}

FBattleSimCore::FBattleSimCore()
{
	ObstaclesClearedPerType.SetNum(static_cast<int32>(EObstacleType::Count));
	for (int32 i = 0; i < ObstaclesClearedPerType.Num(); ++i) { ObstaclesClearedPerType[i] = 0; }
}

void FBattleSimCore::Reset()
{
	Stage = FStageDefinitionRow();
	Roster.Reset();
	Skills.Reset();
	Team.Reset();
	Boss = FBattleBossState();
	Log.Reset();
	Result = FBattleResult();
	LastOutcome = FResolveOutcome();
	Phase = EBattlePhase::NotStarted;
	Turn = 0;
	MovesLeft = 0;
	MovesUsedThisTurn = 0;
	bActedThisTurn = false;
	BurstChainCount = 0;
	bFullBurstFiredThisTurn = false;
	Score = 0;
	TotalDamageDealt = 0;
	TotalHealingDone = 0;
	SpecialsTriggeredTotal = 0;
	ObstaclesClearedTotal = 0;
	ElementAmpThisTurn = 0.0f;
	ObstaclesClearedPerType.Reset();
	ObstaclesClearedPerType.SetNum(static_cast<int32>(EObstacleType::Count));
	for (int32 i = 0; i < ObstaclesClearedPerType.Num(); ++i) { ObstaclesClearedPerType[i] = 0; }
}

void FBattleSimCore::Setup(const FStageDefinitionRow& InStage, const TArray<FCharacterDefinitionRow>& InRoster, const FTeamFormation& InFormation, uint64 Seed)
{
	Reset();

	Stage = InStage;
	Roster = InRoster;
	ContentCore::BuildSkillLibrary(Skills);

	Rng.Seed(Seed);
	Resolver = FMatchResolver(&Rng);

	Board.Initialize(Stage.Board, &Rng);
	Board.SetTurn(1);
	Board.FillRandomBoard();

	// --- boss -------------------------------------------------------------
	Boss = FBattleBossState();
	Boss.DefinitionId = Stage.Boss.Id;
	Boss.MaxHp = Stage.Boss.MaxHp;
	Boss.Hp = Boss.MaxHp;
	Boss.StaggerMax = Stage.Boss.StaggerMax;
	Boss.Stagger = Boss.StaggerMax;
	Boss.BreakTurnsLeft = 0;
	Boss.ScriptIndex = 0;
	Boss.bAlive = true;
	Boss.Script = Stage.Boss.Script;

	// --- team -------------------------------------------------------------
	for (int32 Slot = 0; Slot < MaxTeamSlots; ++Slot)
	{
		const FTeamSlot& SlotDefinition = InFormation.Slots[Slot];
		if (SlotDefinition.IsEmpty()) { continue; }

		FCharacterDefinitionRow Row;
		if (!ContentCore::FindCharacter(Roster, SlotDefinition.CharacterId, Row)) { continue; }

		FBattleCombatant Combatant;
		Combatant.SlotIndex = Slot;
		Combatant.CharacterId = Row.Id;
		Combatant.Role = Row.Role;
		Combatant.BoundColor = Row.BoundColor;

		int32 HpBonus = 0;
		int32 AtkBonus = 0;
		int32 DefBonus = 0;
		for (int32 Equipment = 0; Equipment < EquipmentSlotsPerCharacter; ++Equipment)
		{
			Combatant.Equipment[Equipment] = SlotDefinition.Equipment[Equipment];
			if (!SlotDefinition.Equipment[Equipment].IsEmpty())
			{
				HpBonus += SlotDefinition.Equipment[Equipment].HpBonus;
				AtkBonus += SlotDefinition.Equipment[Equipment].AtkBonus;
				DefBonus += SlotDefinition.Equipment[Equipment].DefBonus;
			}
		}

		Combatant.MaxHp = Row.MaxHp + HpBonus;
		Combatant.Hp = Combatant.MaxHp;
		Combatant.Atk = Row.Atk + AtkBonus;
		Combatant.HealPower = Row.HealPower;
		Combatant.SupportPower = Row.SupportPower;
		Combatant.Def = Row.Def + DefBonus;
		Combatant.UltGauge = 0.0f;
		Combatant.UltChargeMultiplier = Row.UltChargeMultiplier > 0.0f ? Row.UltChargeMultiplier : 1.0f;
		Combatant.DeflectorStacks = 0;
		Combatant.ManualSkillId = Row.ManualSkillId;
		Combatant.UltimateId = Row.UltimateId;
		Combatant.ManualCooldown = 0;
		Combatant.bAlive = true;
		Combatant.PetId = SlotDefinition.PetId;

		Team.Add(Combatant);
	}

	Result.ObjectivesTotal = Stage.Objectives.Num();
	Result.ObjectiveMet.Reset();
	Result.ObjectiveMet.SetNum(Stage.Objectives.Num());
	for (int32 i = 0; i < Result.ObjectiveMet.Num(); ++i) { Result.ObjectiveMet[i] = 0; }
	Result.ObstaclesClearedPerType.SetNum(static_cast<int32>(EObstacleType::Count));
	for (int32 i = 0; i < Result.ObstaclesClearedPerType.Num(); ++i) { Result.ObstaclesClearedPerType[i] = 0; }

	Phase = EBattlePhase::PlayerTurn;
	Turn = 1;
	AddLog(FBattleEvent::EKind::BattleStart);
	BeginPlayerTurn();
	EvaluateResult();
}

// ---------------------------------------------------------------------------
// Turn machine
// ---------------------------------------------------------------------------

void FBattleSimCore::BeginPlayerTurn()
{
	MovesLeft = FMath::Max(1, Stage.MovesPerTurn);
	MovesUsedThisTurn = 0;
	bActedThisTurn = false;
	BurstChainCount = 0;
	bFullBurstFiredThisTurn = false;
	Board.SetTurn(Turn);

	// A break lasts whole player turns: it ticks down here, never mid-phase.
	if (Boss.bBroken)
	{
		--Boss.BreakTurnsLeft;
		if (Boss.BreakTurnsLeft <= 0)
		{
			Boss.bBroken = false;
			const float Growth = Stage.Boss.BreakStaggerGrowthOverride > 0.0f
				? Stage.Boss.BreakStaggerGrowthOverride
				: Stage.Scales.BreakStaggerGrowth;
			Boss.StaggerMax *= FMath::Max(1.0f, Growth);
			Boss.Stagger = Boss.StaggerMax;
		}
	}

	AddLog(FBattleEvent::EKind::TurnStart);

	if (Stage.Board.bAllowAutoShuffle && !Board.HasAnyLegalMove())
	{
		const bool bShuffled = Board.Shuffle();
		FBattleEvent Event = MakeEvent(FBattleEvent::EKind::Shuffle, Turn);
		Event.Amount = bShuffled ? 1 : 0;
		AddLog(Event);
	}

	// Settle anything the boss left behind before handing control back.
	const FResolveOutcome Outcome = Resolver.ResolveBoard(Board, Stage.Scales, 4);
	if (Outcome.bMoveAccepted)
	{
		LastOutcome = Outcome;
		ApplyResolve(Outcome);
	}

	CheckEndConditions();
}

bool FBattleSimCore::TrySwap(const FIntPoint& A, const FIntPoint& B)
{
	if (Phase != EBattlePhase::PlayerTurn || MovesLeft <= 0) { return false; }

	const FResolveOutcome Outcome = Resolver.ResolveSwap(Board, A, B, Stage.Scales);
	if (!Outcome.bMoveAccepted) { return false; }

	LastOutcome = Outcome;
	bActedThisTurn = true;
	++MovesUsedThisTurn;
	--MovesLeft;

	FBattleEvent Event = MakeEvent(FBattleEvent::EKind::MatchResolved, Turn);
	Event.Amount = Outcome.TotalBlocksCleared;
	Event.CascadeLevel = Outcome.MaxCascadeDepth;
	Event.Value = Outcome.CascadeMultiplier;
	AddLog(Event);

	ApplyResolve(Outcome);
	CheckEndConditions();

	if (!IsFinished() && MovesLeft <= 0) { EndPlayerTurn(false); }
	else { EvaluateResult(); }
	return true;
}

void FBattleSimCore::EndTurn()
{
	if (Phase != EBattlePhase::PlayerTurn || IsFinished()) { return; }
	EndPlayerTurn(true);
}

void FBattleSimCore::EndPlayerTurn(bool bVoluntary)
{
	AddLog(FBattleEvent::EKind::TurnEnd);

	// 1) upkeep first, so the statuses the player stacked during the turn lose one
	//    tick here and still cover the boss phase.
	TickTeamTurnEnd();
	TickStatuses(Boss.Statuses);
	Board.TickTemporaryFlags();

	for (int32 i = 0; i < Team.Num(); ++i)
	{
		if (Team[i].ManualCooldown > 0) { --Team[i].ManualCooldown; }
	}

	// 2) Defender passive: "end the turn without doing anything" -> the whole team
	//    takes much less from the boss this phase. Applied after the tick so it is
	//    still active when the boss acts.
	if (!bActedThisTurn)
	{
		for (int32 i = 0; i < Team.Num(); ++i)
		{
			if (!Team[i].bAlive || Team[i].Role != ERoleType::Defender) { continue; }
			ApplyStatusToTeam(EStatusType::DamageCut, Stage.Scales.DefenderIdleDamageCut, 1, 1, i);
			FBattleEvent Event = MakeEvent(FBattleEvent::EKind::Guard, Turn);
			Event.SlotIndex = i;
			Event.Role = ERoleType::Defender;
			Event.Value = Stage.Scales.DefenderIdleDamageCut;
			Event.Status = EStatusType::DamageCut;
			AddLog(Event);
		}
	}

	// 3) Deflector: a fully charged deflector drains the stagger gauge far faster
	//    than ordinary damage could.
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		FBattleCombatant& Combatant = Team[i];
		if (!Combatant.bAlive || Combatant.Role != ERoleType::Deflector) { continue; }
		if (Combatant.DeflectorStacks < Stage.Scales.DeflectorMaxStacks) { continue; }

		Combatant.DeflectorStacks = 0;
		const float Drain = Boss.StaggerMax * Stage.Scales.DeflectorStaggerPercent;
		DrainStagger(Drain);
		ApplyStatusToTeam(EStatusType::DamageCut, Stage.Scales.DeflectorDamageCut, 1, 1, i);

		FBattleEvent Event = MakeEvent(FBattleEvent::EKind::Retaliate, Turn);
		Event.SlotIndex = i;
		Event.Role = ERoleType::Deflector;
		Event.Value = Drain;
		AddLog(Event);
	}

	CheckEndConditions();
	if (IsFinished()) { EvaluateResult(); return; }

	// 4) boss phase
	RunBossPhase();
	CheckEndConditions();
	if (IsFinished()) { EvaluateResult(); return; }

	// 5) out of turns?
	if (Turn >= Stage.TurnLimit)
	{
		Phase = EBattlePhase::Defeat;
		AddLog(FBattleEvent::EKind::Defeat);
		EvaluateResult();
		return;
	}

	++Turn;
	BeginPlayerTurn();
	EvaluateResult();
}

void FBattleSimCore::RunBossPhase()
{
	if (!Boss.bAlive) { return; }
	Phase = EBattlePhase::BossTurn;

	if (Boss.GetStatusStacks(EStatusType::Stun) > 0)
	{
		FBattleEvent Event = MakeEvent(FBattleEvent::EKind::BossAction, Turn);
		Event.Amount = 0;
		Event.Status = EStatusType::Stun;
		AddLog(Event);
	}
	else
	{
		const FBossActionRow* Action = GetCurrentBossAction();
		if (Action != nullptr) { ExecuteBossAction(*Action); }
		AdvanceBossScript();
	}

	if (Stage.Boss.bEnrageBelowHalfHp && !Boss.bEnraged && Boss.GetHpPercent() <= 0.5f)
	{
		Boss.bEnraged = true;
	}

	SettleBoardAfterBossAction();
	Phase = EBattlePhase::PlayerTurn;
}

const FBossActionRow* FBattleSimCore::GetCurrentBossAction() const
{
	if (Boss.Script.Num() == 0) { return nullptr; }
	const int32 Index = Boss.ScriptIndex % Boss.Script.Num();
	return &Boss.Script[Index];
}

void FBattleSimCore::AdvanceBossScript()
{
	if (Boss.Script.Num() == 0) { return; }
	Boss.ScriptIndex = (Boss.ScriptIndex + 1) % Boss.Script.Num();
}

void FBattleSimCore::ExecuteBossAction(const FBossActionRow& Action)
{
	FBattleEvent Event = MakeEvent(FBattleEvent::EKind::BossAction, Turn);
	Event.Status = Action.Status;
	Event.Obstacle = Action.Obstacle;
	Event.Amount = Action.Magnitude;
	AddLog(Event);

	const float EnrageMultiplier = (Boss.bEnraged && Stage.Boss.bEnrageBelowHalfHp) ? Action.EnrageMultiplier : 1.0f;

	switch (Action.Type)
	{
	case EBossActionType::SpawnObstacle:
		SpawnObstacles(Action.Obstacle, FMath::Max(1, Action.ObstacleCount > 0 ? Action.ObstacleCount : Action.Magnitude));
		break;

	case EBossActionType::DamageAll:
		{
			const float Damage = static_cast<float>(Action.Magnitude) * EnrageMultiplier;
			for (int32 i = 0; i < Team.Num(); ++i)
			{
				if (!Team[i].bAlive) { continue; }
				DealDamageToCombatant(i, Damage, true);
			}
		}
		break;

	case EBossActionType::DamageOne:
		{
			const int32 Target = FindRandomAliveSlot();
			if (Target != INDEX_NONE)
			{
				DealDamageToCombatant(Target, static_cast<float>(Action.Magnitude) * EnrageMultiplier, true);
			}
		}
		break;

	case EBossActionType::ApplyStatus:
		{
			const int32 Duration = FMath::Max(1, Action.StatusTurns);
			if (Action.Target == ETargetMode::Self)
			{
				ApplyStatusToBoss(Action.Status, Action.StatusValue, 1, Duration, INDEX_NONE, false);
			}
			else
			{
				for (int32 i = 0; i < Team.Num(); ++i)
				{
					if (!Team[i].bAlive) { continue; }
					ApplyStatusToCombatant(i, Action.Status, Action.StatusValue, 1, Duration, INDEX_NONE);
				}
			}
		}
		break;

	case EBossActionType::JamColor:
		{
			const int32 ColorCount = FMath::Max(1, Stage.Board.ColorCount);
			const EBlockColor Color = ColorFromIndex(Rng.Range(ColorCount));
			const int32 Turns = FMath::Max(1, Action.StatusTurns);
			Board.JamCellsOfColor(Color, true, Turns);

			FBattleEvent JamEvent = MakeEvent(FBattleEvent::EKind::BoardDebuff, Turn);
			JamEvent.Color = Color;
			JamEvent.Amount = Turns;
			AddLog(JamEvent);
		}
		break;

	case EBossActionType::LockCells:
		{
			const int32 Count = FMath::Max(1, Action.Magnitude);
			const int32 Turns = FMath::Max(1, Action.StatusTurns);
			Board.LockRandomCells(Count, Turns, true);
		}
		break;

	case EBossActionType::DrainUltimate:
		{
			const float Amount = static_cast<float>(FMath::Max(0, Action.Magnitude));
			for (int32 i = 0; i < Team.Num(); ++i)
			{
				Team[i].UltGauge = FMath::Max(0.0f, Team[i].UltGauge - Amount);
			}
		}
		break;

	case EBossActionType::CleanseSelf:
		Boss.Statuses.Reset();
		break;

	default:
		break;
	}
}

void FBattleSimCore::SettleBoardAfterBossAction()
{
	Board.ApplyGravity();
	Board.Refill();
}

void FBattleSimCore::SpawnObstacles(EObstacleType Type, int32 Count)
{
	if (Type == EObstacleType::None || Count <= 0) { return; }

	const int32 Width = Board.GetWidth();
	const int32 Height = Board.GetHeight();
	const int32 PreferredRows = FMath::Max(1, Height / 2);

	int32 Placed = 0;
	int32 Attempts = 0;
	const int32 MaxAttempts = Count * 40;

	while (Placed < Count && Attempts < MaxAttempts)
	{
		++Attempts;
		const int32 X = Rng.Range(Width);
		const int32 Y = Rng.Range(PreferredRows);

		FBlockCell& Cell = Board.At(X, Y);
		if (!Cell.IsNormal() || Cell.Special != ESpecialType::None) { continue; }

		Cell = FMatchBoardCore::MakeObstacleBlock(Type, Turn);
		++Placed;

		FBattleEvent Event = MakeEvent(FBattleEvent::EKind::ObstacleSpawned, Turn);
		Event.Obstacle = Type;
		Event.Amount = 1;
		AddLog(Event);
	}
}

// ---------------------------------------------------------------------------
// Player skills
// ---------------------------------------------------------------------------

bool FBattleSimCore::FireUltimate(int32 SlotIndex)
{
	if (Phase != EBattlePhase::PlayerTurn) { return false; }
	if (!Team.IsValidIndex(SlotIndex)) { return false; }

	FBattleCombatant& Combatant = Team[SlotIndex];
	if (!Combatant.bAlive) { return false; }
	if (Combatant.UltGauge < Stage.Scales.UltGaugeMax) { return false; }

	const FSkillDefinitionRow* Skill = Skills.Find(Combatant.UltimateId);
	if (Skill == nullptr) { return false; }
	if (Skill->bRequiresBossBroken && !Boss.bBroken) { return false; }

	Combatant.UltGauge = 0.0f;
	++BurstChainCount;

	FBattleEvent Event = MakeEvent(FBattleEvent::EKind::Ultimate, Turn);
	Event.SlotIndex = SlotIndex;
	Event.Role = Combatant.Role;
	Event.TriggerCount = BurstChainCount;
	AddLog(Event);

	if (!bFullBurstFiredThisTurn && BurstChainCount >= Stage.Scales.FullBurstChainLength)
	{
		bFullBurstFiredThisTurn = true;
		AddLog(FBattleEvent::EKind::FullBurst);
	}
	else if (BurstChainCount > 1)
	{
		AddLog(FBattleEvent::EKind::ChainBurst);
	}

	FireSkillEffects(*Skill, SlotIndex, 0, true);

	CheckEndConditions();
	EvaluateResult();
	return true;
}

bool FBattleSimCore::FireManualSkill(int32 SlotIndex)
{
	if (Phase != EBattlePhase::PlayerTurn) { return false; }
	if (!Team.IsValidIndex(SlotIndex)) { return false; }

	FBattleCombatant& Combatant = Team[SlotIndex];
	if (!Combatant.bAlive || Combatant.ManualCooldown > 0) { return false; }

	const FSkillDefinitionRow* Skill = Skills.Find(Combatant.ManualSkillId);
	if (Skill == nullptr) { return false; }
	if (Skill->bRequiresBossBroken && !Boss.bBroken) { return false; }

	Combatant.ManualCooldown = FMath::Max(0, Skill->CooldownTurns);
	FBattleEvent Event = MakeEvent(FBattleEvent::EKind::ManualSkill, Turn);
	Event.SlotIndex = SlotIndex;
	Event.Role = Combatant.Role;
	AddLog(Event);
	FireSkillEffects(*Skill, SlotIndex, 0, false);

	CheckEndConditions();
	EvaluateResult();
	return true;
}

void FBattleSimCore::FireSkillEffects(const FSkillDefinitionRow& Skill, int32 SlotIndex, int32 TriggerCount, bool bUltimate)
{
	if (!Team.IsValidIndex(SlotIndex)) { return; }
	FBattleCombatant& Caster = Team[SlotIndex];

	float ChainBonus = 0.0f;
	if (bUltimate)
	{
		ChainBonus = static_cast<float>(FMath::Max(0, BurstChainCount - 1)) * Stage.Scales.ChainDamageBonusPerStep;
		if (BurstChainCount >= Stage.Scales.FullBurstChainLength)
		{
			ChainBonus += Stage.Scales.FullBurstDamageBonus * FMath::Max(0.5f, Skill.ChainWeight);
		}
	}

	const float Outgoing = GetOutgoingDamageMultiplier(Caster, Caster.BoundColor);

	for (int32 e = 0; e < Skill.Effects.Num(); ++e)
	{
		const FSkillEffectRow& Effect = Skill.Effects[e];

		switch (Effect.Kind)
		{
		case ESkillEffectKind::Damage:
			{
				float Multiplier = 1.0f;
				if (Effect.Scale == ESkillScaleMode::TriggerCount)
				{
					Multiplier = CombatMath::ComputeDamageMultiplier(Stage.Scales, TriggerCount, 0, 1.0f);
				}
				else if (Effect.Scale == ESkillScaleMode::BurstChain)
				{
					Multiplier = 1.0f + ChainBonus;
				}
				const float Raw = static_cast<float>(Caster.Atk) * Effect.BaseValue * Multiplier * Outgoing;
				DealDamageToBoss(Raw, SlotIndex, false, TriggerCount, 0, Caster.BoundColor);
			}
			break;

		case ESkillEffectKind::Heal:
			{
				float Multiplier = 1.0f;
				if (Effect.Scale == ESkillScaleMode::TriggerCount)
				{
					Multiplier = CombatMath::ComputeHealMultiplier(Stage.Scales, TriggerCount);
				}
				const float Amount = static_cast<float>(Caster.HealPower) * Effect.BaseValue * Multiplier * (1.0f + ChainBonus);
				if (Effect.Target == ETargetMode::Team) { HealTeamLowestFirst(Amount, FMath::Max(1, Effect.TargetCount)); }
				else { HealCombatant(SlotIndex, Amount); }
			}
			break;

		case ESkillEffectKind::ApplyStatusTeam:
			{
				const int32 Stacks = FMath::Max(1, Effect.BaseStacks) + (bUltimate ? BurstChainCount / 2 : 0);
				ApplyStatusToTeam(Effect.Status, Effect.BaseValue, Stacks, FMath::Max(1, Effect.BaseDuration), SlotIndex);
			}
			break;

		case ESkillEffectKind::ApplyStatusBoss:
			{
				const int32 Stacks = FMath::Max(1, Effect.BaseStacks) + (bUltimate ? BurstChainCount / 2 : 0);
				ApplyStatusToBoss(Effect.Status, Effect.BaseValue, Stacks, FMath::Max(1, Effect.BaseDuration), SlotIndex, Effect.bCountsAsBossDebuff);
			}
			break;

		case ESkillEffectKind::ClearObstacles:
			{
				// "None" means: whatever the stage's challenge is asking the player to clear.
				EObstacleType Target = Effect.Obstacle;
				if (Target == EObstacleType::None)
				{
					for (int32 o = 0; o < Stage.Objectives.Num(); ++o)
					{
						if (Stage.Objectives[o].Type == EObjectiveType::ClearObstacles)
						{
							Target = static_cast<EObstacleType>(Stage.Objectives[o].Param);
							break;
						}
					}
				}

				int32 Removed = 0;
				const int32 Want = FMath::Max(1, Effect.TargetCount);
				for (int32 Y = 0; Y < Board.GetHeight() && Removed < Want; ++Y)
				{
					for (int32 X = 0; X < Board.GetWidth() && Removed < Want; ++X)
					{
						const FBlockCell& Cell = Board.At(X, Y);
						if (!Cell.IsObstacle()) { continue; }
						if (Target != EObstacleType::None && Cell.Obstacle != Target) { continue; }

						const EObstacleType RemovedType = Cell.Obstacle;
						if (Board.DestroyObstacle(X, Y))
						{
							++Removed;
							const int32 Index = static_cast<int32>(RemovedType);
							if (Index > 0 && Index < ObstaclesClearedPerType.Num()) { ++ObstaclesClearedPerType[Index]; }
							++ObstaclesClearedTotal;

							FBattleEvent Event = MakeEvent(FBattleEvent::EKind::ObstacleCleared, Turn);
							Event.Obstacle = RemovedType;
							Event.SlotIndex = SlotIndex;
							AddLog(Event);
						}
					}
				}
				Board.ApplyGravity();
				Board.Refill();
			}
			break;

		case ESkillEffectKind::ClearBoardDebuffs:
			Board.FreeRandomCells(FMath::Max(1, Effect.TargetCount));
			break;

		case ESkillEffectKind::ChargeUltimate:
			Caster.UltGauge = FMath::Min(Stage.Scales.UltGaugeMax, Caster.UltGauge + Effect.BaseValue);
			break;

		case ESkillEffectKind::AddMoves:
			MovesLeft += FMath::Max(1, Effect.TargetCount);
			break;

		case ESkillEffectKind::AddDeflectorStacks:
			Caster.DeflectorStacks = FMath::Min(Stage.Scales.DeflectorMaxStacks, Caster.DeflectorStacks + FMath::Max(1, Effect.TargetCount));
			break;

		case ESkillEffectKind::DirectStaggerDrain:
			DrainStagger(Boss.StaggerMax * Effect.BaseValue);
			break;

		default:
			break;
		}
	}
}

// ---------------------------------------------------------------------------
// Match effects
// ---------------------------------------------------------------------------

void FBattleSimCore::ApplyResolve(const FResolveOutcome& Outcome)
{
	SpecialsTriggeredTotal += Outcome.SpecialsTriggered;

	for (int32 s = 0; s < Outcome.Steps.Num(); ++s)
	{
		const FResolveStepResult& Step = Outcome.Steps[s];

		for (int32 d = 0; d < Step.DestroyedObstacleTypes.Num(); ++d)
		{
			const int32 Index = static_cast<int32>(Step.DestroyedObstacleTypes[d]);
			if (Index > 0 && Index < ObstaclesClearedPerType.Num()) { ++ObstaclesClearedPerType[Index]; }
			++ObstaclesClearedTotal;

			FBattleEvent Event = MakeEvent(FBattleEvent::EKind::ObstacleCleared, Turn);
			Event.Obstacle = Step.DestroyedObstacleTypes[d];
			AddLog(Event);
		}

		if (Step.StepIndex > 0)
		{
			FBattleEvent Event = MakeEvent(FBattleEvent::EKind::Cascade, Turn);
			Event.CascadeLevel = Step.StepIndex;
			Event.Amount = Step.TotalBlocksCleared;
			AddLog(Event);
		}

		const float CascadeMultiplier = CombatMath::ComputeCascadeMultiplier(Stage.Scales, Step.StepIndex);
		for (int32 t = 0; t < Step.Triggers.Num(); ++t)
		{
			ApplyColorTrigger(Step.Triggers[t], Step.StepIndex, CascadeMultiplier);
		}
	}

	ChargeDeflectors(Outcome);
	UpdateObjectives();
}

void FBattleSimCore::ApplyColorTrigger(const FTriggerEvent& Trigger, int32 CascadeLevel, float FinalCascadeMultiplier)
{
	if (Trigger.BlockCount <= 0) { return; }

	for (int32 i = 0; i < Team.Num(); ++i)
	{
		FBattleCombatant& Combatant = Team[i];
		if (!Combatant.bAlive) { continue; }
		if (Combatant.BoundColor != Trigger.Color) { continue; }

		// Every triggered block of this hero's colour feeds its charge bar.
		const float Gauge = CombatMath::ComputeUltimateGauge(Stage.Scales, Trigger.BlockCount, Trigger.SpecialCount, false, Combatant.UltChargeMultiplier);
		Combatant.UltGauge = FMath::Min(Stage.Scales.UltGaugeMax, Combatant.UltGauge + Gauge);

		const float Element = GetElementBonus(Combatant, Trigger.Color);
		const float Outgoing = GetOutgoingDamageMultiplier(Combatant, Trigger.Color);

		switch (Combatant.Role)
		{
		case ERoleType::Attacker:
			{
				const float Multiplier = CombatMath::ComputeDamageMultiplier(Stage.Scales, Trigger.BlockCount, Trigger.SpecialCount, FinalCascadeMultiplier);
				float Raw = static_cast<float>(Combatant.Atk) * Multiplier * (1.0f + Element) * Outgoing;
				Raw = CombatMath::ApplyVariance(Raw, 0.08f, Rng.Fraction());
				DealDamageToBoss(Raw, i, true, Trigger.BlockCount, CascadeLevel, Trigger.Color);
			}
			break;

		case ERoleType::Supporter:
			{
				const int32 Stacks = CombatMath::ComputeSupportStacks(Stage.Scales, Trigger.BlockCount);
				const int32 Duration = CombatMath::ComputeSupportDuration(Stage.Scales, Trigger.BlockCount);
				const float PowerScale = static_cast<float>(Combatant.SupportPower) / 70.0f;

				ApplyStatusToTeam(EStatusType::AtkUp, 0.05f * PowerScale, Stacks, Duration, i);
				// The debuff on the boss is also what accelerates the stagger gauge.
				ApplyStatusToBoss(EStatusType::AtkDown, 0.05f * PowerScale, Stacks, Duration, i, true);
			}
			break;

		case ERoleType::Healer:
			{
				const float Multiplier = CombatMath::ComputeHealMultiplier(Stage.Scales, Trigger.BlockCount);
				const float Amount = static_cast<float>(Combatant.HealPower) * Multiplier * (1.0f + Element);
				HealTeamLowestFirst(Amount, 3);
			}
			break;

		case ERoleType::Defender:
			{
				const int32 Stacks = Stage.Scales.DefenderGuardStacksPerMatch * FMath::Max(1, Trigger.BlockCount - 2);
				ApplyStatusToTeam(EStatusType::Guard, Stage.Scales.GuardDamageCutPerStack, Stacks, 2, i);
			}
			break;

		case ERoleType::Counter:
			{
				// "chỉ phát động kĩ năng này khi thanh stagger boss vỡ"
				const float Multiplier = CombatMath::ComputeDamageMultiplier(Stage.Scales, Trigger.BlockCount, Trigger.SpecialCount, FinalCascadeMultiplier);
				const float RoleScale = Boss.bBroken ? 2.20f : CounterDamageScaleWhenNotBroken;
				float Raw = static_cast<float>(Combatant.Atk) * Multiplier * RoleScale * (1.0f + Element) * Outgoing;
				Raw = CombatMath::ApplyVariance(Raw, 0.08f, Rng.Fraction());
				DealDamageToBoss(Raw, i, true, Trigger.BlockCount, CascadeLevel, Trigger.Color);
			}
			break;

		case ERoleType::Deflector:
		default:
			// The deflector earns nothing from ordinary matches: it charges off
			// 4-matches and drains the gauge at the end of the turn.
			break;
		}
	}
}

void FBattleSimCore::ChargeDeflectors(const FResolveOutcome& Outcome)
{
	for (int32 s = 0; s < Outcome.Steps.Num(); ++s)
	{
		const FResolveStepResult& Step = Outcome.Steps[s];
		for (int32 g = 0; g < Step.Groups.Num(); ++g)
		{
			const FMatchGroup& Group = Step.Groups[g];

			const int32 Charge = CombatMath::ComputeDeflectorCharge(Stage.Scales, Group.Shape);
			if (Charge <= 0) { continue; }

			for (int32 i = 0; i < Team.Num(); ++i)
			{
				FBattleCombatant& Combatant = Team[i];
				if (!Combatant.bAlive || Combatant.Role != ERoleType::Deflector) { continue; }

				const bool bWasFull = Combatant.DeflectorStacks >= Stage.Scales.DeflectorMaxStacks;
				Combatant.DeflectorStacks = FMath::Min(Stage.Scales.DeflectorMaxStacks, Combatant.DeflectorStacks + Charge);

				FBattleEvent Event = MakeEvent(FBattleEvent::EKind::Buff, Turn);
				Event.SlotIndex = i;
				Event.Role = ERoleType::Deflector;
				Event.Amount = Charge;
				Event.TriggerCount = Combatant.DeflectorStacks;
				Event.bCrit = !bWasFull && Combatant.DeflectorStacks >= Stage.Scales.DeflectorMaxStacks;
				AddLog(Event);
			}
		}
	}
}

void FBattleSimCore::HandleStaggerBreak()
{
	Boss.bBroken = true;
	const int32 Duration = Stage.Boss.BreakDurationTurns > 0 ? Stage.Boss.BreakDurationTurns : Stage.Scales.BreakDurationTurns;
	// +1 because the counter ticks down at the start of the *next* player turn.
	Boss.BreakTurnsLeft = FMath::Max(1, Duration) + 1;
	++Boss.BreakCount;

	AddLog(FBattleEvent::EKind::Break);
	RunCounterRetaliation();
	UpdateObjectives();
}

void FBattleSimCore::RunCounterRetaliation()
{
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		FBattleCombatant& Combatant = Team[i];
		if (!Combatant.bAlive || Combatant.Role != ERoleType::Counter) { continue; }

		const float Multiplier = CombatMath::ComputeDamageMultiplier(Stage.Scales, 6, 0, 1.0f) * 1.5f;
		const float Element = GetElementBonus(Combatant, Combatant.BoundColor);
		const float Outgoing = GetOutgoingDamageMultiplier(Combatant, Combatant.BoundColor);
		const float Raw = static_cast<float>(Combatant.Atk) * Multiplier * 1.8f * (1.0f + Element) * Outgoing;

		FBattleEvent Event = MakeEvent(FBattleEvent::EKind::Retaliate, Turn);
		Event.SlotIndex = i;
		Event.Role = ERoleType::Counter;
		AddLog(Event);

		DealDamageToBoss(Raw, i, false, 6, 0, Combatant.BoundColor);
	}
}

// ---------------------------------------------------------------------------
// Combat primitives
// ---------------------------------------------------------------------------

float FBattleSimCore::GetElementBonus(const FBattleCombatant& Combatant, EBlockColor Color) const
{
	if (Color == EBlockColor::None) { return 0.0f; }

	float Bonus = 0.0f;
	for (int32 e = 0; e < EquipmentSlotsPerCharacter; ++e)
	{
		if (Combatant.Equipment[e].IsEmpty()) { continue; }
		if (Combatant.Equipment[e].Element == Color) { Bonus += Combatant.Equipment[e].ElementBonus; }
	}
	return Bonus;
}

float FBattleSimCore::GetOutgoingDamageMultiplier(const FBattleCombatant& Combatant, EBlockColor Color) const
{
	float Multiplier = 1.0f;
	Multiplier += Combatant.GetStatusValue(EStatusType::AtkUp);
	Multiplier += Combatant.GetStatusValue(EStatusType::ElementAmp);
	Multiplier -= Combatant.GetStatusValue(EStatusType::AtkDown);
	(void)Color;
	return FMath::Max(0.10f, Multiplier);
}

float FBattleSimCore::GetTeamMitigation(int32 SlotIndex) const
{
	if (!Team.IsValidIndex(SlotIndex)) { return 0.0f; }

	const FBattleCombatant& Combatant = Team[SlotIndex];
	float Mitigation = 0.0f;
	Mitigation += Combatant.GetStatusValue(EStatusType::DamageCut);
	Mitigation += Combatant.GetStatusValue(EStatusType::DefUp);
	Mitigation += Combatant.GetStatusValue(EStatusType::Guard);
	return FMath::Clamp(Mitigation, 0.0f, 0.90f);
}

void FBattleSimCore::DealDamageToBoss(float RawDamage, int32 SourceSlot, bool bFromMatch, int32 TriggerCount, int32 CascadeLevel, EBlockColor Color)
{
	if (!Boss.bAlive || RawDamage <= 0.0f) { return; }

	float Damage = RawDamage;
	Damage *= (1.0f + Boss.GetStatusValue(EStatusType::DefDown));
	if (Boss.bBroken) { Damage *= (1.0f + Stage.Scales.BreakDamageBonus); }

	const int32 Applied = FMath::Max(1, FMath::RoundToInt(Damage));
	Boss.Hp = FMath::Max(0, Boss.Hp - Applied);
	TotalDamageDealt += Applied;
	Score += Applied;

	FBattleEvent Event = MakeEvent(FBattleEvent::EKind::Damage, Turn);
	Event.SlotIndex = SourceSlot;
	Event.Amount = Applied;
	Event.Color = Color;
	Event.TriggerCount = TriggerCount;
	Event.CascadeLevel = CascadeLevel;
	Event.bBoss = true;
	Event.bCrit = bFromMatch && Boss.bBroken;
	AddLog(Event);

	if (Boss.Hp <= 0)
	{
		Boss.bAlive = false;
		return;
	}

	const float StaggerPerDamage = Stage.Boss.StaggerPerDamageOverride > 0.0f
		? Stage.Boss.StaggerPerDamageOverride
		: Stage.Scales.StaggerPerDamage;
	const float RateBonus = Boss.GetStatusValue(EStatusType::StaggerUp);
	DrainStagger(CombatMath::ComputeStaggerDrain(static_cast<float>(Applied), StaggerPerDamage, RateBonus));
}

int32 FBattleSimCore::DrainStagger(float Amount)
{
	if (!Boss.bAlive || Boss.bBroken || Amount <= 0.0f) { return 0; }

	const float Before = Boss.Stagger;
	Boss.Stagger = FMath::Max(0.0f, Boss.Stagger - Amount);
	const float Drained = Before - Boss.Stagger;

	if (Drained > 0.0f)
	{
		FBattleEvent Event = MakeEvent(FBattleEvent::EKind::StaggerDrain, Turn);
		Event.Value = Drained;
		Event.Amount = FMath::RoundToInt(Stage.Scales.UltGaugeMax > 0.0f ? (Boss.GetStaggerPercent() * 100.0f) : 0.0f);
		AddLog(Event);
	}

	if (Boss.Stagger <= 0.0f && !Boss.bBroken)
	{
		HandleStaggerBreak();
	}
	return FMath::RoundToInt(Drained);
}

void FBattleSimCore::DealDamageToCombatant(int32 SlotIndex, float RawDamage, bool bFromBossAction)
{
	if (!Team.IsValidIndex(SlotIndex)) { return; }
	FBattleCombatant& Combatant = Team[SlotIndex];
	if (!Combatant.bAlive) { return; }

	const float Mitigation = GetTeamMitigation(SlotIndex);
	const float Damage = CombatMath::ComputeIncomingDamage(RawDamage, static_cast<float>(Combatant.Def), Mitigation);

	const int32 Applied = FMath::Max(1, FMath::RoundToInt(Damage));
	Combatant.Hp = FMath::Max(0, Combatant.Hp - Applied);

	FBattleEvent Event = MakeEvent(FBattleEvent::EKind::Damage, Turn);
	Event.SlotIndex = SlotIndex;
	Event.Role = Combatant.Role;
	Event.Amount = Applied;
	Event.bBoss = false;
	Event.bCrit = bFromBossAction;
	AddLog(Event);

	if (Combatant.Hp <= 0)
	{
		Combatant.bAlive = false;
		// Losing a hero also wipes the buffs the team had stacked on it.
		Combatant.Statuses.Reset();
	}
}

void FBattleSimCore::HealCombatant(int32 SlotIndex, float Amount)
{
	if (!Team.IsValidIndex(SlotIndex) || Amount <= 0.0f) { return; }
	FBattleCombatant& Combatant = Team[SlotIndex];
	if (!Combatant.bAlive) { return; }

	const int32 Healed = FMath::Max(1, FMath::RoundToInt(Amount));
	const int32 Before = Combatant.Hp;
	Combatant.Hp = FMath::Min(Combatant.MaxHp, Combatant.Hp + Healed);
	const int32 Applied = Combatant.Hp - Before;
	TotalHealingDone += Applied;
	Score += Applied / 2;

	if (Applied <= 0) { return; }

	FBattleEvent Event = MakeEvent(FBattleEvent::EKind::Heal, Turn);
	Event.SlotIndex = SlotIndex;
	Event.Role = Combatant.Role;
	Event.Amount = Applied;
	AddLog(Event);
}

void FBattleSimCore::HealTeamLowestFirst(float Amount, int32 MaxTargets)
{
	float Remaining = Amount;
	for (int32 Target = 0; Target < MaxTargets && Remaining > 1.0f; ++Target)
	{
		const int32 Slot = FindLowestHpSlot();
		if (Slot == INDEX_NONE) { break; }

		FBattleCombatant& Combatant = Team[Slot];
		const int32 Missing = Combatant.MaxHp - Combatant.Hp;
		if (Missing <= 0) { break; }

		const int32 Heal = FMath::Min(Missing, FMath::Max(1, FMath::RoundToInt(Remaining)));
		HealCombatant(Slot, static_cast<float>(Heal));
		Remaining -= static_cast<float>(Heal);
	}
}

void FBattleSimCore::ApplyStatusToCombatant(int32 SlotIndex, EStatusType Type, float ValuePerStack, int32 Stacks, int32 Duration, int32 SourceSlot)
{
	if (!Team.IsValidIndex(SlotIndex) || Type == EStatusType::None) { return; }
	FBattleCombatant& Combatant = Team[SlotIndex];
	if (!Combatant.bAlive) { return; }

	const int32 Cap = GetStatusStackCap(Stage.Scales, Type);
	const int32 AddStacks = FMath::Max(1, Stacks);

	bool bFound = false;
	for (int32 i = 0; i < Combatant.Statuses.Num(); ++i)
	{
		FActiveStatus& Status = Combatant.Statuses[i];
		if (Status.Type != Type) { continue; }

		Status.Stacks = FMath::Min(Cap, Status.Stacks + AddStacks);
		Status.TurnsLeft = FMath::Max(Status.TurnsLeft, Duration);
		Status.ValuePerStack = FMath::Max(Status.ValuePerStack, ValuePerStack);
		bFound = true;
		break;
	}

	if (!bFound)
	{
		FActiveStatus Status;
		Status.Type = Type;
		Status.Stacks = FMath::Min(Cap, AddStacks);
		Status.TurnsLeft = Duration;
		Status.SourceSlot = SourceSlot;
		Status.ValuePerStack = ValuePerStack;
		Combatant.Statuses.Add(Status);
	}

	const FStatusDefinition Definition = GetStatusDefinition(Type);
	FBattleEvent Event = MakeEvent(Definition.Polarity == EStatusPolarity::Debuff ? FBattleEvent::EKind::Debuff : FBattleEvent::EKind::Buff, Turn);
	Event.SlotIndex = SlotIndex;
	Event.Status = Type;
	Event.Amount = AddStacks;
	Event.Value = ValuePerStack;
	AddLog(Event);
}

void FBattleSimCore::ApplyStatusToTeam(EStatusType Type, float ValuePerStack, int32 Stacks, int32 Duration, int32 SourceSlot)
{
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		if (!Team[i].bAlive) { continue; }
		ApplyStatusToCombatant(i, Type, ValuePerStack, Stacks, Duration, SourceSlot);
	}
}

void FBattleSimCore::ApplyStatusToBoss(EStatusType Type, float ValuePerStack, int32 Stacks, int32 Duration, int32 SourceSlot, bool bChipsStagger)
{
	if (!Boss.bAlive || Type == EStatusType::None) { return; }

	const int32 Cap = GetStatusStackCap(Stage.Scales, Type);
	const int32 AddStacks = FMath::Max(1, Stacks);

	bool bFound = false;
	for (int32 i = 0; i < Boss.Statuses.Num(); ++i)
	{
		FActiveStatus& Status = Boss.Statuses[i];
		if (Status.Type != Type) { continue; }

		Status.Stacks = FMath::Min(Cap, Status.Stacks + AddStacks);
		Status.TurnsLeft = FMath::Max(Status.TurnsLeft, Duration);
		Status.ValuePerStack = FMath::Max(Status.ValuePerStack, ValuePerStack);
		bFound = true;
		break;
	}

	if (!bFound)
	{
		FActiveStatus Status;
		Status.Type = Type;
		Status.Stacks = FMath::Min(Cap, AddStacks);
		Status.TurnsLeft = Duration;
		Status.SourceSlot = SourceSlot;
		Status.ValuePerStack = ValuePerStack;
		Boss.Statuses.Add(Status);
	}

	const FStatusDefinition Definition = GetStatusDefinition(Type);
	FBattleEvent Event = MakeEvent(Definition.Polarity == EStatusPolarity::Debuff ? FBattleEvent::EKind::Debuff : FBattleEvent::EKind::Buff, Turn);
	Event.SlotIndex = SourceSlot;
	Event.Status = Type;
	Event.Amount = AddStacks;
	Event.Value = ValuePerStack;
	Event.bBoss = true;
	AddLog(Event);

	// "debuff tăng stagger": debuffing the boss also chips the gauge.
	if (bChipsStagger && !Boss.bBroken)
	{
		DrainStagger(Boss.StaggerMax * Stage.Scales.StaggerFromDebuff * static_cast<float>(AddStacks));
	}
}

void FBattleSimCore::TickStatuses(TArray<FActiveStatus>& Statuses)
{
	for (int32 i = Statuses.Num() - 1; i >= 0; --i)
	{
		--Statuses[i].TurnsLeft;
		if (Statuses[i].TurnsLeft <= 0) { Statuses.RemoveAt(i); }
	}
}

void FBattleSimCore::TickTeamTurnEnd()
{
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		FBattleCombatant& Combatant = Team[i];
		if (!Combatant.bAlive) { continue; }

		const float Regen = Combatant.GetStatusValue(EStatusType::Regen);
		if (Regen > 0.0f) { HealCombatant(i, static_cast<float>(Combatant.MaxHp) * Regen); }

		const float Poison = Combatant.GetStatusValue(EStatusType::Poison);
		if (Poison > 0.0f) { DealDamageToCombatant(i, static_cast<float>(Combatant.MaxHp) * Poison, false); }

		const float Gauge = CombatMath::ComputeUltimateGauge(Stage.Scales, 0, 0, true, Combatant.UltChargeMultiplier);
		Combatant.UltGauge = FMath::Min(Stage.Scales.UltGaugeMax, Combatant.UltGauge + Gauge);

		TickStatuses(Combatant.Statuses);
	}
}

// ---------------------------------------------------------------------------
// Queries / bookkeeping
// ---------------------------------------------------------------------------

int32 FBattleSimCore::CountAliveTeam() const
{
	int32 Count = 0;
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		if (Team[i].bAlive) { ++Count; }
	}
	return Count;
}

int32 FBattleSimCore::FindFirstAliveSlot() const
{
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		if (Team[i].bAlive) { return i; }
	}
	return INDEX_NONE;
}

int32 FBattleSimCore::FindLowestHpSlot() const
{
	int32 Best = INDEX_NONE;
	float BestFraction = 2.0f;
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		const FBattleCombatant& Combatant = Team[i];
		if (!Combatant.bAlive || Combatant.MaxHp <= 0) { continue; }

		const float Fraction = static_cast<float>(Combatant.Hp) / static_cast<float>(Combatant.MaxHp);
		if (Fraction < BestFraction)
		{
			BestFraction = Fraction;
			Best = i;
		}
	}
	return Best;
}

int32 FBattleSimCore::FindRandomAliveSlot()
{
	TArray<int32> Alive;
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		if (Team[i].bAlive) { Alive.Add(i); }
	}
	if (Alive.Num() == 0) { return INDEX_NONE; }
	return Alive[Rng.Range(Alive.Num())];
}

int32 FBattleSimCore::GetDeflectorStacks() const
{
	int32 Total = 0;
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		Total += Team[i].DeflectorStacks;
	}
	return Total;
}

void FBattleSimCore::CheckEndConditions()
{
	if (IsFinished()) { return; }

	if (Boss.Hp <= 0 || !Boss.bAlive)
	{
		Boss.Hp = 0;
		Boss.bAlive = false;
		Phase = EBattlePhase::Victory;
		AddLog(FBattleEvent::EKind::Victory);
		return;
	}

	if (CountAliveTeam() <= 0)
	{
		Phase = EBattlePhase::Defeat;
		AddLog(FBattleEvent::EKind::Defeat);
	}
}

void FBattleSimCore::AddLog(FBattleEvent::EKind Kind)
{
	FBattleEvent Event = MakeEvent(Kind, Turn);
	Log.Add(Event);
}

void FBattleSimCore::AddLog(const FBattleEvent& Event)
{
	Log.Add(Event);
}

void FBattleSimCore::UpdateObjectives()
{
	const int32 Count = Stage.Objectives.Num();
	if (Result.ObjectiveMet.Num() != Count)
	{
		Result.ObjectiveMet.Reset();
		Result.ObjectiveMet.SetNum(Count);
		for (int32 i = 0; i < Count; ++i) { Result.ObjectiveMet[i] = 0; }
	}

	for (int32 i = 0; i < Count; ++i)
	{
		const FChallengeObjectiveRow& Objective = Stage.Objectives[i];
		bool bMet = false;

		switch (Objective.Type)
		{
		case EObjectiveType::ClearObstacles:
			{
				const int32 Index = Objective.Param;
				const int32 Cleared = (Index > 0 && Index < ObstaclesClearedPerType.Num()) ? ObstaclesClearedPerType[Index] : 0;
				bMet = Cleared >= Objective.Target;
			}
			break;

		case EObjectiveType::FinishWithinTurns:
			bMet = Turn <= Objective.Target;
			break;

		case EObjectiveType::NoDeaths:
			bMet = CountAliveTeam() == Team.Num();
			break;

		case EObjectiveType::TriggerSpecials:
			bMet = SpecialsTriggeredTotal >= Objective.Target;
			break;

		case EObjectiveType::BreakBoss:
			bMet = Boss.BreakCount >= Objective.Target;
			break;

		case EObjectiveType::ReachScore:
			bMet = Score >= Objective.Target;
			break;

		default:
			break;
		}

		Result.ObjectiveMet[i] = bMet ? 1 : 0;
	}
}

void FBattleSimCore::EvaluateResult()
{
	UpdateObjectives();

	int32 Met = 0;
	int32 PrimaryTotal = 0;
	int32 PrimaryMet = 0;
	int32 SecondaryTotal = 0;
	int32 SecondaryMet = 0;

	for (int32 i = 0; i < Stage.Objectives.Num(); ++i)
	{
		const bool bMet = Result.ObjectiveMet.IsValidIndex(i) && (Result.ObjectiveMet[i] != 0);
		if (bMet) { ++Met; }
		if (Stage.Objectives[i].bPrimary)
		{
			++PrimaryTotal;
			if (bMet) { ++PrimaryMet; }
		}
		else
		{
			++SecondaryTotal;
			if (bMet) { ++SecondaryMet; }
		}
	}

	Result.bFinished = IsFinished();
	Result.bVictory = (Phase == EBattlePhase::Victory);
	Result.TurnsUsed = Turn;
	Result.Score = Score;
	Result.ObstaclesCleared = ObstaclesClearedTotal;
	Result.Breaks = Boss.BreakCount;
	Result.ObjectivesMet = Met;
	Result.ObjectivesTotal = Stage.Objectives.Num();

	for (int32 i = 0; i < ObstaclesClearedPerType.Num() && i < Result.ObstaclesClearedPerType.Num(); ++i)
	{
		Result.ObstaclesClearedPerType[i] = ObstaclesClearedPerType[i];
	}

	int32 Stars = 0;
	if (Result.bVictory)
	{
		Stars = 1;
		const bool bAllPrimary = (PrimaryTotal == 0) || (PrimaryMet == PrimaryTotal);
		const bool bAllSecondary = (SecondaryTotal == 0) || (SecondaryMet == SecondaryTotal);
		if (bAllPrimary) { Stars = 2; }
		if (bAllPrimary && bAllSecondary) { Stars = 3; }
	}
	Result.Stars = Stars;
}

} // namespace MatchRPG
