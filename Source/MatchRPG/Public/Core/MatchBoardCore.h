// Copyright MatchRPG. Engine-agnostic match-3 board: storage, gravity, refill, obstacles.
#pragma once

#include "Core/MatchCoreCompat.h"
#include "Core/MatchRng.h"
#include "Core/MatchTypes.h"

namespace MatchRPG
{

/**
 * FMatchBoardCore
 *
 * The whole match-3 board as plain data plus pure functions. No UObject, no
 * actor, no ticking: the UE layer only mirrors this state into 3D block actors.
 * That split is what lets the headless test harness exercise the real rules.
 *
 * Coordinate system: (0,0) is the TOP-LEFT cell, +X goes right, +Y goes DOWN.
 * Gravity therefore pulls cells towards increasing Y.
 */
class FMatchBoardCore
{
public:
	FMatchBoardCore();

	/** Must be called before use. Rng may be null (an internal one is used). */
	void Initialize(const FBoardRules& InRules, FMatchRng* InRng);
	void Reset();

	// -- access ------------------------------------------------------------
	const FBoardRules& GetRules() const { return Rules; }
	int32 GetWidth() const { return Rules.Width; }
	int32 GetHeight() const { return Rules.Height; }
	int32 GetCellCount() const { return Rules.Width * Rules.Height; }

	int32 ToIndex(int32 X, int32 Y) const { return Y * Rules.Width + X; }
	bool IsInBounds(int32 X, int32 Y) const
	{
		return X >= 0 && Y >= 0 && X < Rules.Width && Y < Rules.Height;
	}
	bool IsInBounds(const FIntPoint& P) const { return IsInBounds(P.X, P.Y); }

	FBlockCell& At(int32 X, int32 Y) { return Cells[ToIndex(X, Y)]; }
	const FBlockCell& At(int32 X, int32 Y) const { return Cells[ToIndex(X, Y)]; }
	FBlockCell& AtPoint(const FIntPoint& P) { return At(P.X, P.Y); }
	const FBlockCell& AtPoint(const FIntPoint& P) const { return At(P.X, P.Y); }

	/** Returns true and writes the cell when the coordinate is inside the board. */
	bool TryGetCell(int32 X, int32 Y, FBlockCell& OutCell) const;
	bool TryGetCell(const FIntPoint& P, FBlockCell& OutCell) const { return TryGetCell(P.X, P.Y, OutCell); }

	int32 GetTurn() const { return CurrentTurn; }
	void SetTurn(int32 InTurn) { CurrentTurn = InTurn; }

	const TArray<FBlockCell>& GetCells() const { return Cells; }

	// -- construction ------------------------------------------------------
	/** Writes a cell directly. Used by tests to build known positions. */
	void SetCell(int32 X, int32 Y, const FBlockCell& Cell);
	/** Random board that starts without any already-complete match. */
	void FillRandomBoard();
	/** Convenience factory: a plain elemental block. */
	static FBlockCell MakeNormalBlock(EBlockColor Color, ESpecialType Special, int32 Turn);
	static FBlockCell MakeObstacleBlock(EObstacleType Type, int32 Turn);

	// -- player moves ------------------------------------------------------
	/** Both cells must exist and neither may be locked/obstacle/empty. */
	bool CanSwap(const FIntPoint& A, const FIntPoint& B) const;
	bool AreAdjacent(const FIntPoint& A, const FIntPoint& B) const;
	/** Swaps unconditionally (used by special blocks and shuffles). */
	void SwapCells(const FIntPoint& A, const FIntPoint& B);
	/** Swaps, then reports whether either cell now sits in a match. Reverts when not. */
	bool TrySwapAndValidate(const FIntPoint& A, const FIntPoint& B);
	/** Cheap "is there any 3-run through this cell" test. */
	bool HasMatchThrough(int32 X, int32 Y) const;

	// -- gravity & refill --------------------------------------------------
	/** Collapses floating cells downwards. Returns the number of cells that moved. */
	int32 ApplyGravity();
	/** Fills holes from the top. Queued obstacles drop first, then random blocks.
	 *  Returns the number of filled cells. */
	int32 Refill();

	/** Obstacles queued by the boss enter the board through the top of columns. */
	void EnqueueSpawn(EObstacleType Type, int32 Count);
	int32 GetPendingSpawnCount() const { return PendingSpawns.Num(); }

	// -- obstacles ---------------------------------------------------------
	/** Applies `Amount` damage. Returns true when the obstacle was destroyed. */
	bool DamageObstacle(int32 X, int32 Y, int32 Amount, bool bFromSpecial);
	/** Removes an obstacle outright (no hp left). */
	bool DestroyObstacle(int32 X, int32 Y);
	int32 CountObstacles(EObstacleType Type) const;
	int32 CountObstaclesOfAnyType() const;
	int32 CountObstaclesByTag(int32 ObstacleTypeAsInt) const;
	int32 FindObstacleCounts(TArray<int32>& OutCountsPerType) const;

	// -- board debuffs -----------------------------------------------------
	/** Suppresses (or restores) one colour. Returns how many cells changed. */
	int32 SetColorJammed(EBlockColor Color, bool bJammed);
	int32 JamCellsOfColor(EBlockColor Color, bool bJammed, int32 Turns);
	int32 LockRandomCells(int32 Count, int32 Turns, bool bOnlyMatchable);
	int32 FreeRandomCells(int32 Count);
	/** Applies -1 to every temporary counter and clears expired flags. */
	int32 TickTemporaryFlags();

	// -- queries -----------------------------------------------------------
	bool HasImmediateMatch() const;
	bool HasAnyLegalMove() const;
	/** Writes a legal swap when one exists. */
	bool FindHint(FIntPoint& OutA, FIntPoint& OutB) const;
	/** Re-randomises colours in place until the board is playable again. */
	bool Shuffle();

	// -- debug -------------------------------------------------------------
	/** One character per cell, row-major, '\n' between rows, NUL terminated.
	 *  Colour letters: r/b/g/y/p (uppercase = carries a special, '?' = jammed).
	 *  Obstacles: i=Ice x=Rock c=Crate n=Chain  '.' = hole. */
	void DebugSnapshot(TArray<MRPGChar>& OutChars) const;
	static int32 GetSnapshotLength(const FBoardRules& InRules) { return InRules.Width * InRules.Height + InRules.Height + 1; }

private:
	EBlockColor RollColor() const;
	FIntPoint IndexToPoint(int32 Index) const;
	/** Random colour that does not complete a run at (X,Y); used by FillRandomBoard. */
	EBlockColor RollSafeColor(int32 X, int32 Y) const;
	int32 CountRunLength(int32 X, int32 Y, int32 StepX, int32 StepY, EBlockColor Color) const;
	bool WouldMatchAt(int32 X, int32 Y) const;
	/** Is (X,Y) part of a 2x2 single-colour square? ("match-4 vuông"). */
	bool IsPartOfSquare(int32 X, int32 Y) const;

	FBoardRules Rules;
	TArray<FBlockCell> Cells;
	TArray<EObstacleType> PendingSpawns;
	FMatchRng* Rng = nullptr;
	FMatchRng FallbackRng;
	int32 CurrentTurn = 0;
};

} // namespace MatchRPG
