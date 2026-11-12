// Copyright MatchRPG. Core (engine-agnostic) type definitions.
#pragma once

#include "Core/MatchCoreCompat.h"

namespace MatchRPG
{

// ---------------------------------------------------------------------------
// Board vocabulary
// ---------------------------------------------------------------------------

/** Block colour == "element". Each hero is bound to one colour; matching that
 *  colour is the connection point that makes the hero act. */
enum class EBlockColor : uint8
{
	None = 0,
	Red,
	Blue,
	Green,
	Yellow,
	Purple,
	Count UMETA(Hidden)
};

/** Red..Purple, i.e. the colours a normal block may have. */
static const int32 MaxBlockColors = 5;

enum class EBlockKind : uint8
{
	Empty = 0,   // hole: nothing here (falls empty during refill)
	Normal,      // matchable elemental block
	Obstacle     // boss-placed blocker, never matchable
};

/** Obstacles the boss pushes onto the board. */
enum class EObstacleType : uint8
{
	None = 0,
	Ice,     // 2 hp - ordinary match damage counts, the "challenge" fodder
	Rock,    // 3 hp - only special blocks / square matches damage it
	Crate,   // 2 hp - blocks matching and blocks falling, specials only
	Chain,   // 1 hp - locks the cell (cannot swap), cleared by any adjacent match
	Count UMETA(Hidden)
};

/** Special blocks produced by larger matches. */
enum class ESpecialType : uint8
{
	None = 0,
	LineRow,        // clears its whole row
	LineCol,        // clears its whole column
	AreaBomb,       // clears the 3x3 around it (L/T shape)
	SquareBreaker,  // 2x2 square match: damages obstacles in a ring around itself
	SwapAll,        // 5-in-a-line: detonates every block it is swapped with
	Count UMETA(Hidden)
};

/** Shape of a detected match group. */
enum class EMatchShape : uint8
{
	None = 0,
	Line3,
	Line4,
	Line5,
	Square4,
	LTShape
};

/**
 * Per-obstacle behaviour table. Kept data-driven so designers can retune
 * obstacles without touching the resolver.
 */
struct FObstacleProfile
{
	int32 Hp = 1;
	bool bDamagedByBasicMatch = false; // a plain 3-match next to it hurt it
	bool bDamagedBySpecial = true;     // striped/bomb/square hits hurt it
	bool bBlocksMatching = true;       // occupies a cell, never matchable
	bool bBlocksFalling = false;       // holds the column (crate/rock)
	bool bLocksCell = false;           // cannot be swapped/moved (chain)
};

/** A single cell of the board. */
struct FBlockCell
{
	EBlockColor Color = EBlockColor::None;
	EBlockKind Kind = EBlockKind::Empty;
	EObstacleType Obstacle = EObstacleType::None;
	ESpecialType Special = ESpecialType::None;
	int32 Hp = 0;
	bool bJammed = false;   // colour suppressed by a boss debuff, cannot match
	bool bLocked = false;   // temporary lock from a boss action
	int32 JamTurnsLeft = 0;
	int32 LockTurnsLeft = 0;
	/** Colour a SwapAll block will detonate once swapped (set at swap time). */
	EBlockColor SwapAllColor = EBlockColor::None;
	int32 SpawnTurn = 0;

	/** Returns the cell to the pristine "hole" state. */
	void Clear()
	{
		Color = EBlockColor::None;
		Kind = EBlockKind::Empty;
		Obstacle = EObstacleType::None;
		Special = ESpecialType::None;
		Hp = 0;
		bJammed = false;
		bLocked = false;
		JamTurnsLeft = 0;
		LockTurnsLeft = 0;
		SwapAllColor = EBlockColor::None;
	}

	bool IsEmpty() const { return Kind == EBlockKind::Empty && Obstacle == EObstacleType::None; }
	bool IsNormal() const { return Kind == EBlockKind::Normal; }
	bool IsObstacle() const { return Kind == EBlockKind::Obstacle; }
	bool HasSpecial() const { return Special != ESpecialType::None; }
	/** Can this cell take part in a colour match right now? */
	bool IsMatchable() const { return Kind == EBlockKind::Normal && !bJammed && Color != EBlockColor::None; }
	/** Can the player drag this cell? */
	bool CanSwap() const
	{
		if (bLocked || IsObstacle() || IsEmpty()) { return false; }
		if (Obstacle != EObstacleType::None) { return false; }
		return true;
	}
	/** Does gravity move this cell downwards? Crates and rocks hold their column. */
	bool IsNonFalling() const
	{
		return Obstacle == EObstacleType::Rock || Obstacle == EObstacleType::Crate;
	}
};

/** Rules that define how the board itself behaves. Tuned per stage. */
struct FBoardRules
{
	int32 Width = 8;
	int32 Height = 8;
	int32 ColorCount = 5;

	/** "match-4 vuông": a 2x2 square of one colour counts as a valid match and is
	 *  the designated obstacle remover for challenge objectives. */
	bool bEnableSquareMatch = true;
	int32 SquareObstacleDamage = 2;
	int32 SquareObstacleRadius = 1; // ring of cells around the square that also get hit

	/** 4-in-a-line -> striped block (row/column clear). */
	int32 Line4ObstacleDamage = 1;

	/** 5-in-a-line -> SwapAll ("explode everything it is swapped with"). */
	bool bMatch5CreatesSwapAll = true;
	/** Fallback reading of the same rule: the 5-line also clears its own row+column. */
	bool bMatch5AlsoClearsOwnLine = true;

	int32 SpecialObstacleDamage = 1;   // striped activation
	int32 AreaBombObstacleDamage = 2;  // L/T bomb

	int32 MaxCascadeDepth = 12;
	int32 MaxMovesWithoutProgress = 3; // triggers a shuffle when no legal swap exists
	bool bAllowAutoShuffle = true;
	bool bRefillFromTop = true;
};

/** Curves that translate "how many blocks were triggered" into effect power.
 *  Everything the designer may want to rebalance lives here. */
struct FEffectScaleRules
{
	// Attacker: linear term + a mild quadratic term so big triggers feel great.
	float DamagePerBlock = 0.30f;      // +30% of base damage per block beyond 3
	float DamageQuadratic = 0.05f;     // extra growth with the square of the count
	float DamageMaxMultiplier = 12.0f;

	// Healer: exponential, as specified ("heal theo cấp số nhân").
	float HealGrowthPerBlock = 1.18f;
	float HealMaxMultiplier = 24.0f;

	// Supporter: stack count and duration both grow with the trigger count.
	int32 BuffStacksAtBase = 1;
	int32 BuffStacksPerExtraBlock = 1;  // every 1 extra block past 3
	int32 BuffDurationAtBase = 2;
	int32 BuffDurationPerExtraBlock = 1;
	int32 BuffMaxStacks = 8;
	float SupportPotencyPerStack = 0.05f;

	// Cascade bonus (chained clears in one swap).
	float CascadeMultiplierPerLevel = 0.25f;

	// Ultimate gauge ("change bar").
	float UltGaugePerTurn = 12.0f;
	float UltGaugePerTriggeredBlock = 1.5f;
	float UltGaugePerSpecial = 4.0f;
	float UltGaugeMax = 100.0f;
	/** Number of chained ultimates inside one burst window that upgrades to Full Burst. */
	int32 FullBurstChainLength = 3;
	float FullBurstDamageBonus = 0.50f;
	float FullBurstStaggerBonus = 0.50f;
	float ChainDamageBonusPerStep = 0.15f;

	// Stagger ("thanh stagger").
	float StaggerPerDamage = 0.65f;      // gauge removed per point of damage dealt
	float StaggerFromDebuff = 0.15f;     // debuffing the boss accelerates the drain
	float BreakDamageBonus = 0.30f;      // damage the boss takes while broken
	float BreakStaggerGrowth = 1.25f;    // gauge max grows after each break
	int32 BreakDurationTurns = 1;

	// Deflector ("only charges from 4-matches, quadruple swap required").
	int32 DeflectorMaxStacks = 4;
	int32 DeflectorChargePerLine4 = 1;
	int32 DeflectorChargePerSquare = 1;
	int32 DeflectorChargePerLine5 = 2;
	float DeflectorStaggerPercent = 0.25f; // % of stagger max removed when it fires
	float DeflectorDamageCut = 0.35f;      // extra team mitigation while the shield is up

	// Defender ("ends the turn without acting").
	float DefenderIdleDamageCut = 0.60f;
	int32 DefenderGuardStacksPerMatch = 1;
	float GuardDamageCutPerStack = 0.03f;
	int32 GuardMaxStacks = 10;
};

// ---------------------------------------------------------------------------
// Combat vocabulary
// ---------------------------------------------------------------------------

/** Roles, exactly the six the design calls for. */
enum class ERoleType : uint8
{
	Attacker = 0,  // damage scales with triggered blocks / combo
	Supporter,     // buff + debuff, stack count and duration scale
	Healer,        // exponential heal scaling
	Defender,      // mitigates the boss AoE when the player idles, Guard on match
	Counter,       // only acts while the boss stagger gauge is broken
	Deflector,     // charges off 4-matches, drains stagger at turn end
	Count UMETA(Hidden)
};

enum class EStatusType : uint8
{
	None = 0,
	AtkUp,
	AtkDown,
	DefUp,
	DefDown,
	DamageCut,     // team mitigation
	Regen,
	Poison,
	StaggerUp,     // accelerates stagger drain on the boss
	Stun,
	ElementAmp,    // +X% damage for one element
	Guard,         // stacking mitigation generated by the defender
	Count UMETA(Hidden)
};

/** Where the status lives. */
enum class EStatusPolarity : uint8 { Buff = 0, Debuff };

struct FStatusDefinition
{
	EStatusType Type = EStatusType::None;
	EStatusPolarity Polarity = EStatusPolarity::Buff;
	/** true => applies to the boss instead of the team. */
	bool bTargetsBoss = false;
	/** true => the magnitude is additive per stack, false => the largest stack wins. */
	bool bStackAdditive = true;
};

enum class ETargetMode : uint8
{
	Self = 0,
	Team,        // every living hero
	LowestHpAlly,
	Boss,
	RandomAlly
};

enum class EBossActionType : uint8
{
	None = 0,
	SpawnObstacle,   // push N obstacles onto the board
	ApplyStatus,     // debuff the team / buff itself
	DamageAll,       // AoE the whole team
	DamageOne,       // heavy hit on one hero
	JamColor,        // suppress one colour for N turns (blocks matching)
	LockCells,       // lock random cells for N turns
	DrainUltimate,   // remove ultimate gauge
	CleanseSelf      // remove its own debuffs
};

struct FBossActionRow
{
	EBossActionType Type = EBossActionType::DamageAll;
	int32 Magnitude = 120;
	EObstacleType Obstacle = EObstacleType::Ice;
	int32 ObstacleCount = 3;
	EStatusType Status = EStatusType::AtkDown;
	float StatusValue = 0.20f;
	int32 StatusTurns = 2;
	ETargetMode Target = ETargetMode::Team;
	/** >0 => the attack is telegraphed this many turns in advance (shown in the HUD). */
	int32 TelegraphTurns = 0;
	/** Multiplies Magnitude when the boss is below half HP. */
	float EnrageMultiplier = 1.5f;
};

struct FBossDefinitionRow
{
	int32 Id = 1;
	/** <= 0 means "use the stage scale rules". */
	float StaggerPerDamageOverride = 0.0f;
	float BreakStaggerGrowthOverride = 0.0f;
	int32 MaxHp = 12000;
	float StaggerMax = 1000.0f;
	int32 BreakDurationTurns = 1;
	bool bEnrageBelowHalfHp = true;
	/** Cycled in order, one entry per boss phase. */
	TArray<FBossActionRow> Script;
};

// ---------------------------------------------------------------------------
// Heroes / progression vocabulary
// ---------------------------------------------------------------------------

struct FCharacterDefinitionRow
{
	int32 Id = INDEX_NONE;
	ERoleType Role = ERoleType::Attacker;
	/** None => this hero never fires from a colour match (pure passive). */
	EBlockColor BoundColor = EBlockColor::Red;
	int32 Rarity = 4;
	int32 MaxHp = 1200;
	int32 Atk = 120;
	int32 HealPower = 90;
	int32 SupportPower = 70;
	int32 Def = 40;
	float UltChargeMultiplier = 1.0f;
	int32 ManualSkillId = INDEX_NONE;  // the one hand-activated basic skill
	int32 UltimateId = INDEX_NONE;     // the chainable ultimate
	/** A 3D model reference lives in the UE layer (UCharacterAssetRow), not here. */
};

struct FEquipmentSlot
{
	int32 ItemId = INDEX_NONE;
	int32 Level = 1;
	/** Matching this element amplifies the corresponding colour's effects. */
	EBlockColor Element = EBlockColor::None;
	float ElementBonus = 0.0f;
	int32 AtkBonus = 0;
	int32 HpBonus = 0;
	int32 DefBonus = 0;
	bool IsEmpty() const { return ItemId == INDEX_NONE; }
};

static const int32 EquipmentSlotsPerCharacter = 3;

struct FTeamSlot
{
	int32 CharacterId = INDEX_NONE;
	FEquipmentSlot Equipment[EquipmentSlotsPerCharacter];
	int32 PetId = INDEX_NONE;
	bool bPetSlotUnlocked = false;
	bool IsEmpty() const { return CharacterId == INDEX_NONE; }
};

static const int32 MaxTeamSlots = 6;

struct FTeamFormation
{
	FTeamSlot Slots[MaxTeamSlots];

	int32 CountFilled() const
	{
		int32 Count = 0;
		for (int32 i = 0; i < MaxTeamSlots; ++i) { if (!Slots[i].IsEmpty()) { ++Count; } }
		return Count;
	}
};

// ---------------------------------------------------------------------------
// Stage / challenge vocabulary
// ---------------------------------------------------------------------------

enum class EObjectiveType : uint8
{
	ClearObstacles = 0,   // Param = EObstacleType, Target = how many
	FinishWithinTurns,    // Target = turn budget for the bonus star
	NoDeaths,
	TriggerSpecials,      // Target = number of special blocks triggered
	BreakBoss,            // Target = number of stagger breaks
	ReachScore            // Target = score threshold
};

struct FChallengeObjectiveRow
{
	EObjectiveType Type = EObjectiveType::ClearObstacles;
	int32 Param = static_cast<int32>(EObstacleType::Ice);
	int32 Target = 4;
	/** A primary objective is required for the star bonus; secondary is score only. */
	bool bPrimary = true;
};

struct FStageDefinitionRow
{
	int32 StageId = 1;
	/** Player swaps allowed before the boss takes its phase. */
	int32 MovesPerTurn = 4;
	int32 TurnLimit = 15;
	/** Star bonus when the stage is cleared within this many turns. */
	int32 StarTurnThreshold = 10;
	int32 FirstClearGemReward = 60;

	FBoardRules Board;
	FEffectScaleRules Scales;
	FBossDefinitionRow Boss;
	TArray<FChallengeObjectiveRow> Objectives;
};

// ---------------------------------------------------------------------------
// Small helpers shared by the UI and the tests
// ---------------------------------------------------------------------------

const MRPGChar* ToText(ERoleType Role);
const MRPGChar* ToText(EBlockColor Color);
const MRPGChar* ToText(ESpecialType Special);
const MRPGChar* ToText(EObstacleType Obstacle);
const MRPGChar* ToText(EMatchShape Shape);
const MRPGChar* ToText(EStatusType Status);
const MRPGChar* ToText(EBossActionType Action);

EBlockColor ColorFromIndex(int32 Index);
int32 IndexFromColor(EBlockColor Color);
FObstacleProfile GetObstacleProfile(EObstacleType Type);
FStatusDefinition GetStatusDefinition(EStatusType Type);
bool IsBossStatus(EStatusType Type);

} // namespace MatchRPG
