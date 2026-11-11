// Copyright MatchRPG. Headless, deterministic battle simulation (turn loop + boss AI).
#pragma once

#include "Core/CombatMathCore.h"
#include "Core/ContentCore.h"
#include "Core/MatchBoardCore.h"
#include "Core/MatchFinderCore.h"
#include "Core/MatchRng.h"
#include "Core/MatchTypes.h"
#include "Core/SkillCore.h"

namespace MatchRPG
{

enum class EBattlePhase : uint8
{
	NotStarted = 0,
	PlayerTurn,
	BossTurn,
	Victory,
	Defeat
};

struct FActiveStatus
{
	EStatusType Type = EStatusType::None;
	int32 Stacks = 0;
	int32 TurnsLeft = 0;
	int32 SourceSlot = INDEX_NONE;
	float ValuePerStack = 0.0f;
};

struct FBattleCombatant
{
	int32 SlotIndex = INDEX_NONE;
	int32 CharacterId = INDEX_NONE;
	ERoleType Role = ERoleType::Attacker;
	EBlockColor BoundColor = EBlockColor::None;

	int32 MaxHp = 0;
	int32 Hp = 0;
	int32 Atk = 0;
	int32 HealPower = 0;
	int32 SupportPower = 0;
	int32 Def = 0;

	float UltGauge = 0.0f;
	float UltChargeMultiplier = 1.0f;
	int32 DeflectorStacks = 0;
	int32 ManualSkillId = INDEX_NONE;
	int32 UltimateId = INDEX_NONE;
	int32 ManualCooldown = 0;
	bool bAlive = true;

	FEquipmentSlot Equipment[EquipmentSlotsPerCharacter];
	int32 PetId = INDEX_NONE;
	TArray<FActiveStatus> Statuses;

	bool IsUltimateReady(float UltGaugeMax) const { return bAlive && UltGauge >= UltGaugeMax; }
	int32 GetStatusStacks(EStatusType Type) const
	{
		int32 Total = 0;
		for (int32 i = 0; i < Statuses.Num(); ++i)
		{
			if (Statuses[i].Type == Type) { Total += Statuses[i].Stacks; }
		}
		return Total;
	}
	float GetStatusValue(EStatusType Type) const
	{
		float Total = 0.0f;
		for (int32 i = 0; i < Statuses.Num(); ++i)
		{
			if (Statuses[i].Type == Type) { Total += Statuses[i].ValuePerStack * static_cast<float>(Statuses[i].Stacks); }
		}
		return Total;
	}
};

struct FBattleBossState
{
	int32 DefinitionId = INDEX_NONE;
	int32 MaxHp = 0;
	int32 Hp = 0;
	float StaggerMax = 0.0f;
	float Stagger = 0.0f;
	bool bBroken = false;
	int32 BreakTurnsLeft = 0;
	int32 BreakCount = 0;
	int32 ScriptIndex = 0;
	bool bAlive = true;
	bool bEnraged = false;
	TArray<FActiveStatus> Statuses;
	TArray<FBossActionRow> Script;
	FBossActionRow PendingTelegraph;
	bool bHasTelegraph = false;
	int32 TelegraphTurnsLeft = 0;

	float GetStatusValue(EStatusType Type) const
	{
		float Total = 0.0f;
		for (int32 i = 0; i < Statuses.Num(); ++i)
		{
			if (Statuses[i].Type == Type) { Total += Statuses[i].ValuePerStack * static_cast<float>(Statuses[i].Stacks); }
		}
		return Total;
	}
	int32 GetStatusStacks(EStatusType Type) const
	{
		int32 Total = 0;
		for (int32 i = 0; i < Statuses.Num(); ++i)
		{
			if (Statuses[i].Type == Type) { Total += Statuses[i].Stacks; }
		}
		return Total;
	}
	float GetStaggerPercent() const { return StaggerMax > 0.0f ? FMath::Clamp(Stagger / StaggerMax, 0.0f, 1.0f) : 0.0f; }
	float GetHpPercent() const { return MaxHp > 0 ? FMath::Clamp(static_cast<float>(Hp) / static_cast<float>(MaxHp), 0.0f, 1.0f) : 0.0f; }
};

/** Structured battle log: the HUD formats it, the tests assert on it. */
struct FBattleEvent
{
	enum class EKind : uint8
	{
		BattleStart = 0,
		TurnStart,
		TurnEnd,
		MatchResolved,
		Cascade,
		Damage,
		Heal,
		Buff,
		Debuff,
		Guard,
		Ultimate,
		ManualSkill,
		ChainBurst,
		FullBurst,
		StaggerDrain,
		Break,
		Retaliate,
		ObstacleSpawned,
		ObstacleCleared,
		BoardDebuff,
		BossAction,
		Victory,
		Defeat,
		Idle,
		Shuffle
	};

	EKind Kind = EKind::TurnStart;
	int32 Turn = 0;
	int32 SlotIndex = INDEX_NONE;
	int32 Amount = 0;
	float Value = 0.0f;
	EBlockColor Color = EBlockColor::None;
	ERoleType Role = ERoleType::Attacker;
	int32 TriggerCount = 0;
	int32 CascadeLevel = 0;
	ESpecialType Special = ESpecialType::None;
	EObstacleType Obstacle = EObstacleType::None;
	EStatusType Status = EStatusType::None;
	bool bBoss = false;
	bool bCrit = false;
};

struct FBattleResult
{
	bool bFinished = false;
	bool bVictory = false;
	int32 TurnsUsed = 0;
	int32 Stars = 0;
	int32 Score = 0;
	int32 ObjectivesMet = 0;
	int32 ObjectivesTotal = 0;
	int32 ObstaclesCleared = 0;
	int32 Breaks = 0;
	/** 0/1 flags rather than bool: TArray<bool> does not behave identically in
	 *  both build worlds (std::vector<bool> is a bitfield). */
	TArray<uint8> ObjectiveMet;
	TArray<int32> ObstaclesClearedPerType;
};

/**
 * FBattleSimCore
 *
 * Owns the board, the team, the boss and the turn state machine. Runs entirely
 * headless - the UE layer only reads its state to draw 3D blocks and the HUD.
 * Given the same seed it replays identically, which is what makes it testable.
 */
class FBattleSimCore
{
public:
	FBattleSimCore();

	/** Builds the whole battle. Team is a formation of up to 6 slots referencing roster ids. */
	void Setup(const FStageDefinitionRow& InStage, const TArray<FCharacterDefinitionRow>& InRoster, const FTeamFormation& InFormation, uint64 Seed);
	void Reset();

	// -- player actions ----------------------------------------------------
	/** Consumes one move on success. Returns false when the swap is illegal or it is
	 *  not the player's turn (no move is spent in that case). */
	bool TrySwap(const FIntPoint& A, const FIntPoint& B);
	/** Ends the player's turn immediately. Triggers the defender passive when the
	 *  player has not acted yet. */
	void EndTurn();
	bool FireUltimate(int32 SlotIndex);
	bool FireManualSkill(int32 SlotIndex);
	bool FindHint(FIntPoint& OutA, FIntPoint& OutB) const { return Board.FindHint(OutA, OutB); }

	// -- read-only state ---------------------------------------------------
	const FMatchBoardCore& GetBoard() const { return Board; }
	const FBattleBossState& GetBoss() const { return Boss; }
	const TArray<FBattleCombatant>& GetTeam() const { return Team; }
	const TArray<FBattleEvent>& GetLog() const { return Log; }
	const FBattleResult& GetResult() const { return Result; }
	const FStageDefinitionRow& GetStage() const { return Stage; }
	const FResolveOutcome& GetLastOutcome() const { return LastOutcome; }
	const TArray<FCharacterDefinitionRow>& GetRoster() const { return Roster; }
	const FSkillLibrary& GetSkillLibrary() const { return Skills; }
	const FEffectScaleRules& GetScales() const { return Stage.Scales; }

	EBattlePhase GetPhase() const { return Phase; }
	int32 GetTurn() const { return Turn; }
	int32 GetMovesLeft() const { return MovesLeft; }
	int32 GetBurstChainCount() const { return BurstChainCount; }
	bool IsFinished() const { return Phase == EBattlePhase::Victory || Phase == EBattlePhase::Defeat; }
	bool HasActedThisTurn() const { return bActedThisTurn; }
	/** Total deflector charge across the team, used by the HUD. */
	int32 GetDeflectorStacks() const;

private:
	// -- turn machine ------------------------------------------------------
	void BeginPlayerTurn();
	void EndPlayerTurn(bool bVoluntary);
	void RunBossPhase();
	void CheckEndConditions();

	// -- match effects -----------------------------------------------------
	void ApplyResolve(const FResolveOutcome& Outcome);
	void ApplyColorTrigger(const FTriggerEvent& Trigger, int32 CascadeLevel, float FinalCascadeMultiplier);
	void ChargeDeflectors(const FResolveOutcome& Outcome);
	void HandleStaggerBreak();
	void RunCounterRetaliation();

	// -- combat primitives -------------------------------------------------
	void DealDamageToBoss(float RawDamage, int32 SourceSlot, bool bFromMatch, int32 TriggerCount, int32 CascadeLevel, EBlockColor Color);
	void DealDamageToCombatant(int32 SlotIndex, float RawDamage, bool bFromBossAction);
	void HealCombatant(int32 SlotIndex, float Amount);
	void HealTeamLowestFirst(float Amount, int32 MaxTargets);
	void ApplyStatusToCombatant(int32 SlotIndex, EStatusType Type, float ValuePerStack, int32 Stacks, int32 Duration, int32 SourceSlot);
	void ApplyStatusToTeam(EStatusType Type, float ValuePerStack, int32 Stacks, int32 Duration, int32 SourceSlot);
	void ApplyStatusToBoss(EStatusType Type, float ValuePerStack, int32 Stacks, int32 Duration, int32 SourceSlot, bool bChipsStagger);
	void TickStatuses(TArray<FActiveStatus>& Statuses);
	void TickTeamTurnEnd();
	int32 DrainStagger(float Amount);
	void FireSkillEffects(const FSkillDefinitionRow& Skill, int32 SlotIndex, int32 TriggerCount, bool bUltimate);

	// -- helpers -----------------------------------------------------------
	float GetElementBonus(const FBattleCombatant& Combatant, EBlockColor Color) const;
	float GetOutgoingDamageMultiplier(const FBattleCombatant& Combatant, EBlockColor Color) const;
	float GetTeamMitigation(int32 SlotIndex) const;
	int32 FindFirstAliveSlot() const;
	int32 FindLowestHpSlot() const;
	int32 FindRandomAliveSlot();
	int32 CountAliveTeam() const;
	void AddLog(FBattleEvent::EKind Kind);
	void AddLog(const FBattleEvent& Event);
	void UpdateObjectives();
	void EvaluateResult();
	void SpawnObstacles(EObstacleType Type, int32 Count);
	void SettleBoardAfterBossAction();
	const FBossActionRow* GetCurrentBossAction() const;
	void ExecuteBossAction(const FBossActionRow& Action);
	void AdvanceBossScript();

	// -- state -------------------------------------------------------------
	FStageDefinitionRow Stage;
	TArray<FCharacterDefinitionRow> Roster;
	FSkillLibrary Skills;
	FMatchBoardCore Board;
	FMatchResolver Resolver;
	FMatchRng Rng;

	TArray<FBattleCombatant> Team;
	FBattleBossState Boss;
	TArray<FBattleEvent> Log;
	FBattleResult Result;
	FResolveOutcome LastOutcome;

	EBattlePhase Phase = EBattlePhase::NotStarted;
	int32 Turn = 0;
	int32 MovesLeft = 0;
	int32 MovesUsedThisTurn = 0;
	bool bActedThisTurn = false;
	int32 BurstChainCount = 0;
	bool bFullBurstFiredThisTurn = false;
	int32 Score = 0;
	int32 TotalDamageDealt = 0;
	int32 TotalHealingDone = 0;
	int32 SpecialsTriggeredTotal = 0;
	TArray<int32> ObstaclesClearedPerType;
	int32 ObstaclesClearedTotal = 0;
	float ElementAmpThisTurn = 0.0f;

	/** A Counter is nearly useless while the boss is standing. */
	static constexpr float CounterDamageScaleWhenNotBroken = 0.30f;
};

} // namespace MatchRPG
