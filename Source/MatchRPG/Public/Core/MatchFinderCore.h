// Copyright MatchRPG. Match detection, special-block creation and cascade resolution.
#pragma once

#include "Core/MatchBoardCore.h"
#include "Core/MatchRng.h"
#include "Core/MatchTypes.h"

namespace MatchRPG
{

/** One connected group of same-coloured blocks produced by a single match. */
struct FMatchGroup
{
	TArray<FIntPoint> Cells;
	EBlockColor Color = EBlockColor::None;
	EMatchShape Shape = EMatchShape::None;
	/** Where the awarded special block is created. */
	FIntPoint Pivot = FIntPoint(-1, -1);
	ESpecialType AwardedSpecial = ESpecialType::None;
	bool bHorizontal = false;
	int32 Length = 0;
};

/** Aggregated "how hard did this colour hit" record for one cascade step.
 *  This is the number the whole combat system scales from: the more blocks of a
 *  colour are triggered, the stronger that hero's action becomes. */
struct FTriggerEvent
{
	EBlockColor Color = EBlockColor::None;
	int32 BlockCount = 0;
	int32 SpecialCount = 0;
	EMatchShape BestShape = EMatchShape::None;
	bool bSquareMatchInvolved = false;

	/** Convenience: extra blocks beyond the base 3-block match. */
	int32 GetExtraBlocks() const { return FMath::Max(0, BlockCount - 3); }
};

/** Result of one cascade step (the player's swap, then every chain reaction). */
struct FResolveStepResult
{
	int32 StepIndex = 0;
	TArray<FMatchGroup> Groups;
	TArray<FTriggerEvent> Triggers;
	TArray<FIntPoint> ClearedCells;
	TArray<FIntPoint> CreatedSpecials;
	int32 ObstaclesDestroyed = 0;
	int32 SpecialsTriggered = 0;
	int32 TotalBlocksCleared = 0;
	bool bHadMatch = false;
	bool bSwapAllDetonation = false;
	/** Which obstacle types were removed this step, for objective bookkeeping. */
	TArray<EObstacleType> DestroyedObstacleTypes;
};

/** Accumulated result of a full player move, including all cascades. */
struct FResolveOutcome
{
	TArray<FResolveStepResult> Steps;
	bool bMoveAccepted = false;
	int32 TotalBlocksCleared = 0;
	int32 ObstaclesDestroyed = 0;
	int32 SpecialsCreated = 0;
	int32 SpecialsTriggered = 0;
	int32 MaxCascadeDepth = 0;
	/** Score multiplier the cascade reached (1.0 for a single clear). */
	float CascadeMultiplier = 1.0f;
	/** Per-colour totals merged across every cascade step. */
	TArray<FTriggerEvent> MergedTriggers;

	const FTriggerEvent* FindTrigger(EBlockColor Color) const
	{
		for (int32 i = 0; i < MergedTriggers.Num(); ++i)
		{
			if (MergedTriggers[i].Color == Color) { return &MergedTriggers[i]; }
		}
		return nullptr;
	}
};

/**
 * Pure detection helpers. No board mutation happens here.
 */
class FMatchFinderCore
{
public:
	/** Scans runs and squares, then merges them into connected groups.
	 *  PreferredCell (optional) is the cell the player just moved into; it becomes
	 *  the pivot of the group that contains it, which is where the special lands. */
	static void FindGroups(const FMatchBoardCore& Board, TArray<FMatchGroup>& OutGroups, const FIntPoint* PreferredCell = nullptr);

	/** Classifies a group (Line3/Line4/Line5/Square4/LTShape) and picks its pivot. */
	static EMatchShape ClassifyGroup(const FMatchBoardCore& Board, const FMatchGroup& Group, FIntPoint& OutPivot, bool& bOutHorizontal);

	/** Which special block a shape awards. */
	static ESpecialType ShapeToSpecial(const FBoardRules& Rules, EMatchShape Shape, bool bHorizontal);

	static bool IsBetterShape(EMatchShape Candidate, EMatchShape Current);
};

/**
 * Applies full moves to a board: validate the swap, expand special blocks,
 * damage obstacles, clear, drop, refill, and repeat while new matches appear.
 */
class FMatchResolver
{
public:
	explicit FMatchResolver(FMatchRng* InRng = nullptr);

	/** Handles a player swap end to end. bMoveAccepted is false for an illegal swap. */
	FResolveOutcome ResolveSwap(FMatchBoardCore& Board, const FIntPoint& A, const FIntPoint& B, const FEffectScaleRules& Scales);

	/** Settles any matches already present without a swap (boss drops, shuffles). */
	FResolveOutcome ResolveBoard(FMatchBoardCore& Board, const FEffectScaleRules& Scales, int32 MaxSteps = 8);

private:
	FResolveStepResult ProcessStep(FMatchBoardCore& Board, const FEffectScaleRules& Scales, int32 StepIndex, const FIntPoint* SwapA, const FIntPoint* SwapB);
	void MergeStepIntoOutcome(const FResolveStepResult& Step, FResolveOutcome& OutOutcome, const FEffectScaleRules& Scales) const;

	FMatchRng* Rng = nullptr;
};

} // namespace MatchRPG
