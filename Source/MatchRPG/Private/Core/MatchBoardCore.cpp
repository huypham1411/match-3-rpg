// Copyright MatchRPG. Engine-agnostic match-3 board implementation.
#include "Core/MatchBoardCore.h"

namespace MatchRPG
{

namespace
{
	/** Uppercase colour letter for the debug snapshot. */
	MRPGChar ColorLetter(EBlockColor Color)
	{
		switch (Color)
		{
		case EBlockColor::Red:    return MRPG_TEXT('R');
		case EBlockColor::Blue:   return MRPG_TEXT('B');
		case EBlockColor::Green:  return MRPG_TEXT('G');
		case EBlockColor::Yellow: return MRPG_TEXT('Y');
		case EBlockColor::Purple: return MRPG_TEXT('P');
		default:                  return MRPG_TEXT('.');
		}
	}

	MRPGChar ToLowerChar(MRPGChar C)
	{
		return (C >= MRPG_TEXT('A') && C <= MRPG_TEXT('Z')) ? static_cast<MRPGChar>(C - MRPG_TEXT('A') + MRPG_TEXT('a')) : C;
	}
}

FMatchBoardCore::FMatchBoardCore()
{
	FallbackRng.Seed(0x51ED270Bu);
	Rng = &FallbackRng;
}

void FMatchBoardCore::Initialize(const FBoardRules& InRules, FMatchRng* InRng)
{
	Rules = InRules;
	Rules.Width = FMath::Max(3, Rules.Width);
	Rules.Height = FMath::Max(3, Rules.Height);
	Rules.ColorCount = FMath::Clamp(Rules.ColorCount, 3, MaxBlockColors);
	if (InRng != nullptr) { Rng = InRng; }
	Reset();
}

void FMatchBoardCore::Reset()
{
	Cells.Reset();
	Cells.SetNum(Rules.Width * Rules.Height);
	for (int32 i = 0; i < Cells.Num(); ++i) { Cells[i].Clear(); }
	PendingSpawns.Reset();
	CurrentTurn = 0;
}

bool FMatchBoardCore::TryGetCell(int32 X, int32 Y, FBlockCell& OutCell) const
{
	if (!IsInBounds(X, Y)) { return false; }
	OutCell = At(X, Y);
	return true;
}

void FMatchBoardCore::SetCell(int32 X, int32 Y, const FBlockCell& Cell)
{
	if (IsInBounds(X, Y)) { At(X, Y) = Cell; }
}

FBlockCell FMatchBoardCore::MakeNormalBlock(EBlockColor Color, ESpecialType Special, int32 Turn)
{
	FBlockCell Cell;
	Cell.Kind = EBlockKind::Normal;
	Cell.Color = Color;
	Cell.Special = Special;
	Cell.SpawnTurn = Turn;
	return Cell;
}

FBlockCell FMatchBoardCore::MakeObstacleBlock(EObstacleType Type, int32 Turn)
{
	FBlockCell Cell;
	Cell.Kind = EBlockKind::Obstacle;
	Cell.Obstacle = Type;
	Cell.Color = EBlockColor::None;
	Cell.Hp = GetObstacleProfile(Type).Hp;
	Cell.SpawnTurn = Turn;
	return Cell;
}

EBlockColor FMatchBoardCore::RollColor() const
{
	return ColorFromIndex(Rng->Range(Rules.ColorCount));
}

EBlockColor FMatchBoardCore::RollSafeColor(int32 X, int32 Y) const
{
	TArray<EBlockColor> Candidates;
	for (int32 i = 0; i < Rules.ColorCount; ++i) { Candidates.Add(ColorFromIndex(i)); }

	for (int32 i = Candidates.Num() - 1; i >= 0; --i)
	{
		const EBlockColor C = Candidates[i];
		const bool bLeftRun = (X >= 2) && At(X - 1, Y).Color == C && At(X - 2, Y).Color == C;
		const bool bUpRun = (Y >= 2) && At(X, Y - 1).Color == C && At(X, Y - 2).Color == C;
		if (bLeftRun || bUpRun) { Candidates.RemoveAt(i); }
	}

	if (Candidates.Num() == 0) { return RollColor(); }
	return Candidates[Rng->Range(Candidates.Num())];
}

void FMatchBoardCore::FillRandomBoard()
{
	for (int32 Y = 0; Y < Rules.Height; ++Y)
	{
		for (int32 X = 0; X < Rules.Width; ++X)
		{
			At(X, Y) = MakeNormalBlock(RollSafeColor(X, Y), ESpecialType::None, CurrentTurn);
		}
	}

	// RollSafeColor only guards straight runs, so 2x2 squares can still slip in.
	// Break them deterministically instead of hoping for a lucky roll.
	for (int32 Guard = 0; Guard < 500 && HasImmediateMatch(); ++Guard)
	{
		bool bPatched = false;
		for (int32 Y = 0; Y < Rules.Height && !bPatched; ++Y)
		{
			for (int32 X = 0; X < Rules.Width && !bPatched; ++X)
			{
				if (WouldMatchAt(X, Y))
				{
					At(X, Y).Color = RollColor();
					bPatched = true;
				}
			}
		}
		if (!bPatched) { break; }
	}

	if (!HasAnyLegalMove()) { Shuffle(); }
}

bool FMatchBoardCore::AreAdjacent(const FIntPoint& A, const FIntPoint& B) const
{
	const int32 DX = FMath::Abs(A.X - B.X);
	const int32 DY = FMath::Abs(A.Y - B.Y);
	return (DX + DY) == 1;
}

bool FMatchBoardCore::CanSwap(const FIntPoint& A, const FIntPoint& B) const
{
	if (!IsInBounds(A) || !IsInBounds(B)) { return false; }
	if (!AreAdjacent(A, B)) { return false; }
	return AtPoint(A).CanSwap() && AtPoint(B).CanSwap();
}

void FMatchBoardCore::SwapCells(const FIntPoint& A, const FIntPoint& B)
{
	if (!IsInBounds(A) || !IsInBounds(B)) { return; }

	FBlockCell Temp = AtPoint(A);
	AtPoint(A) = AtPoint(B);
	AtPoint(B) = Temp;

	// A SwapAll block remembers the colour it was just paired with: that is the
	// colour it detonates ("kích hoạt toàn bộ các block được đổi chỗ với nó").
	if (AtPoint(A).Special == ESpecialType::SwapAll && AtPoint(B).IsNormal())
	{
		AtPoint(A).SwapAllColor = AtPoint(B).Color;
	}
	if (AtPoint(B).Special == ESpecialType::SwapAll && AtPoint(A).IsNormal())
	{
		AtPoint(B).SwapAllColor = AtPoint(A).Color;
	}
}

bool FMatchBoardCore::TrySwapAndValidate(const FIntPoint& A, const FIntPoint& B)
{
	if (!CanSwap(A, B)) { return false; }

	// Combining with a SwapAll block is always a legal move.
	if (AtPoint(A).Special == ESpecialType::SwapAll || AtPoint(B).Special == ESpecialType::SwapAll)
	{
		SwapCells(A, B);
		return true;
	}

	SwapCells(A, B);
	if (WouldMatchAt(A.X, A.Y) || WouldMatchAt(B.X, B.Y)) { return true; }

	SwapCells(A, B);
	// The revert also undoes the SwapAll bookkeeping above; nothing else was mutated.
	return false;
}

int32 FMatchBoardCore::CountRunLength(int32 X, int32 Y, int32 StepX, int32 StepY, EBlockColor Color) const
{
	int32 Count = 0;
	int32 CX = X;
	int32 CY = Y;
	while (IsInBounds(CX, CY))
	{
		const FBlockCell& Cell = At(CX, CY);
		if (!Cell.IsMatchable() || Cell.Color != Color) { break; }
		++Count;
		CX += StepX;
		CY += StepY;
	}
	return Count;
}

bool FMatchBoardCore::HasMatchThrough(int32 X, int32 Y) const
{
	if (!IsInBounds(X, Y)) { return false; }
	const FBlockCell& Cell = At(X, Y);
	if (!Cell.IsMatchable()) { return false; }

	const EBlockColor C = Cell.Color;
	const int32 Horizontal = 1 + CountRunLength(X - 1, Y, -1, 0, C) + CountRunLength(X + 1, Y, 1, 0, C);
	if (Horizontal >= 3) { return true; }
	const int32 Vertical = 1 + CountRunLength(X, Y - 1, 0, -1, C) + CountRunLength(X, Y + 1, 0, 1, C);
	return Vertical >= 3;
}

bool FMatchBoardCore::IsPartOfSquare(int32 X, int32 Y) const
{
	if (!Rules.bEnableSquareMatch || !IsInBounds(X, Y)) { return false; }

	const FBlockCell& Cell = At(X, Y);
	if (!Cell.IsMatchable()) { return false; }

	for (int32 OffsetX = -1; OffsetX <= 0; ++OffsetX)
	{
		for (int32 OffsetY = -1; OffsetY <= 0; ++OffsetY)
		{
			const int32 BaseX = X + OffsetX;
			const int32 BaseY = Y + OffsetY;
			// Cần kiểm tra CẢ hai góc của ô vuông. Chỉ kiểm tra góc dưới-phải là sai:
			// BaseX = -1 vẫn cho BaseX + 1 = 0 là hợp lệ, rồi At(-1, -1) đọc ra ngoài mảng.
			if (!IsInBounds(BaseX, BaseY) || !IsInBounds(BaseX + 1, BaseY + 1)) { continue; }

			bool bAllMatch = true;
			for (int32 DX = 0; DX < 2 && bAllMatch; ++DX)
			{
				for (int32 DY = 0; DY < 2 && bAllMatch; ++DY)
				{
					const FBlockCell& Neighbour = At(BaseX + DX, BaseY + DY);
					if (!Neighbour.IsMatchable() || Neighbour.Color != Cell.Color) { bAllMatch = false; }
				}
			}
			if (bAllMatch) { return true; }
		}
	}
	return false;
}

bool FMatchBoardCore::WouldMatchAt(int32 X, int32 Y) const
{
	return HasMatchThrough(X, Y) || IsPartOfSquare(X, Y);
}

bool FMatchBoardCore::HasImmediateMatch() const
{
	for (int32 Y = 0; Y < Rules.Height; ++Y)
	{
		for (int32 X = 0; X < Rules.Width; ++X)
		{
			if (WouldMatchAt(X, Y)) { return true; }
		}
	}
	return false;
}

bool FMatchBoardCore::FindHint(FIntPoint& OutA, FIntPoint& OutB) const
{
	// Copy of the board so the const-ness of the query is preserved.
	FMatchBoardCore Scratch;
	Scratch.Initialize(Rules, Rng);
	Scratch.Cells = Cells;

	static const int32 Offsets[2][2] = { { 1, 0 }, { 0, 1 } };
	for (int32 Y = 0; Y < Rules.Height; ++Y)
	{
		for (int32 X = 0; X < Rules.Width; ++X)
		{
			const FIntPoint A(X, Y);
			for (int32 i = 0; i < 2; ++i)
			{
				const FIntPoint B(X + Offsets[i][0], Y + Offsets[i][1]);
				if (!Scratch.IsInBounds(B)) { continue; }
				if (Scratch.TrySwapAndValidate(A, B))
				{
					OutA = A;
					OutB = B;
					return true;
				}
			}
		}
	}
	return false;
}

bool FMatchBoardCore::HasAnyLegalMove() const
{
	FIntPoint A;
	FIntPoint B;
	return FindHint(A, B);
}

int32 FMatchBoardCore::ApplyGravity()
{
	int32 Moved = 0;
	for (int32 X = 0; X < Rules.Width; ++X)
	{
		int32 WriteY = Rules.Height - 1;
		for (int32 Y = Rules.Height - 1; Y >= 0; --Y)
		{
			FBlockCell& Cell = At(X, Y);
			if (Cell.IsEmpty()) { continue; }

			// Rocks and crates hold their cell: everything above stacks on top of them.
			if (Cell.IsNonFalling())
			{
				WriteY = Y - 1;
				continue;
			}

			if (WriteY != Y)
			{
				At(X, WriteY) = Cell;
				Cell.Clear();
				++Moved;
			}
			--WriteY;
		}
	}
	return Moved;
}

int32 FMatchBoardCore::Refill()
{
	int32 Filled = 0;
	for (int32 X = 0; X < Rules.Width; ++X)
	{
		for (int32 Y = 0; Y < Rules.Height; ++Y)
		{
			FBlockCell& Cell = At(X, Y);
			if (!Cell.IsEmpty()) { continue; }

			if (PendingSpawns.Num() > 0)
			{
				// Obstacles the boss queued drop in from above.
				const EObstacleType Type = PendingSpawns[0];
				PendingSpawns.RemoveAt(0);
				Cell = MakeObstacleBlock(Type, CurrentTurn);
			}
			else
			{
				Cell = MakeNormalBlock(RollColor(), ESpecialType::None, CurrentTurn);
			}
			++Filled;
		}
	}
	return Filled;
}

void FMatchBoardCore::EnqueueSpawn(EObstacleType Type, int32 Count)
{
	for (int32 i = 0; i < Count; ++i) { PendingSpawns.Add(Type); }
}

bool FMatchBoardCore::DamageObstacle(int32 X, int32 Y, int32 Amount, bool bFromSpecial)
{
	if (!IsInBounds(X, Y) || Amount <= 0) { return false; }

	FBlockCell& Cell = At(X, Y);
	if (!Cell.IsObstacle()) { return false; }

	const FObstacleProfile Profile = GetObstacleProfile(Cell.Obstacle);
	if (bFromSpecial && !Profile.bDamagedBySpecial) { return false; }
	if (!bFromSpecial && !Profile.bDamagedByBasicMatch) { return false; }

	Cell.Hp -= Amount;
	if (Cell.Hp <= 0)
	{
		Cell.Clear();
		return true;
	}
	return false;
}

bool FMatchBoardCore::DestroyObstacle(int32 X, int32 Y)
{
	if (!IsInBounds(X, Y)) { return false; }
	FBlockCell& Cell = At(X, Y);
	if (!Cell.IsObstacle()) { return false; }
	Cell.Clear();
	return true;
}

int32 FMatchBoardCore::CountObstacles(EObstacleType Type) const
{
	int32 Count = 0;
	for (int32 i = 0; i < Cells.Num(); ++i)
	{
		if (Cells[i].IsObstacle() && Cells[i].Obstacle == Type) { ++Count; }
	}
	return Count;
}

int32 FMatchBoardCore::CountObstaclesOfAnyType() const
{
	int32 Count = 0;
	for (int32 i = 0; i < Cells.Num(); ++i)
	{
		if (Cells[i].IsObstacle()) { ++Count; }
	}
	return Count;
}

int32 FMatchBoardCore::CountObstaclesByTag(int32 ObstacleTypeAsInt) const
{
	if (ObstacleTypeAsInt <= 0 || ObstacleTypeAsInt >= static_cast<int32>(EObstacleType::Count)) { return 0; }
	return CountObstacles(static_cast<EObstacleType>(ObstacleTypeAsInt));
}

int32 FMatchBoardCore::FindObstacleCounts(TArray<int32>& OutCountsPerType) const
{
	const int32 TypeCount = static_cast<int32>(EObstacleType::Count);
	OutCountsPerType.Reset();
	OutCountsPerType.SetNum(TypeCount);
	for (int32 i = 0; i < TypeCount; ++i) { OutCountsPerType[i] = 0; }

	int32 Total = 0;
	for (int32 i = 0; i < Cells.Num(); ++i)
	{
		if (!Cells[i].IsObstacle()) { continue; }
		const int32 Index = static_cast<int32>(Cells[i].Obstacle);
		if (Index > 0 && Index < TypeCount) { ++OutCountsPerType[Index]; ++Total; }
	}
	return Total;
}

int32 FMatchBoardCore::SetColorJammed(EBlockColor Color, bool bJammed)
{
	int32 Changed = 0;
	for (int32 i = 0; i < Cells.Num(); ++i)
	{
		FBlockCell& Cell = Cells[i];
		if (!Cell.IsNormal() || Cell.Color != Color) { continue; }
		if (Cell.bJammed != bJammed) { ++Changed; }
		Cell.bJammed = bJammed;
	}
	return Changed;
}

int32 FMatchBoardCore::JamCellsOfColor(EBlockColor Color, bool bJammed, int32 Turns)
{
	const int32 Changed = SetColorJammed(Color, bJammed);
	if (bJammed)
	{
		for (int32 i = 0; i < Cells.Num(); ++i)
		{
			FBlockCell& Cell = Cells[i];
			if (Cell.IsNormal() && Cell.Color == Color && Cell.bJammed)
			{
				Cell.JamTurnsLeft = FMath::Max(Cell.JamTurnsLeft, Turns);
			}
		}
	}
	return Changed;
}

int32 FMatchBoardCore::LockRandomCells(int32 Count, int32 Turns, bool bOnlyMatchable)
{
	TArray<int32> Candidates;
	for (int32 i = 0; i < Cells.Num(); ++i)
	{
		if (bOnlyMatchable && !Cells[i].IsNormal()) { continue; }
		if (Cells[i].IsEmpty() || Cells[i].bLocked) { continue; }
		Candidates.Add(i);
	}

	int32 LockedCount = 0;
	while (LockedCount < Count && Candidates.Num() > 0)
	{
		const int32 Pick = Rng->Range(Candidates.Num());
		Cells[Candidates[Pick]].bLocked = true;
		Cells[Candidates[Pick]].LockTurnsLeft = FMath::Max(1, Turns);
		Candidates.RemoveAt(Pick);
		++LockedCount;
	}
	return LockedCount;
}

int32 FMatchBoardCore::FreeRandomCells(int32 Count)
{
	TArray<int32> Candidates;
	for (int32 i = 0; i < Cells.Num(); ++i)
	{
		if (Cells[i].bLocked || Cells[i].bJammed) { Candidates.Add(i); }
	}

	int32 Freed = 0;
	while (Freed < Count && Candidates.Num() > 0)
	{
		const int32 Pick = Rng->Range(Candidates.Num());
		Cells[Candidates[Pick]].bLocked = false;
		Cells[Candidates[Pick]].bJammed = false;
		Cells[Candidates[Pick]].LockTurnsLeft = 0;
		Cells[Candidates[Pick]].JamTurnsLeft = 0;
		Candidates.RemoveAt(Pick);
		++Freed;
	}
	return Freed;
}

int32 FMatchBoardCore::TickTemporaryFlags()
{
	int32 Expired = 0;
	for (int32 i = 0; i < Cells.Num(); ++i)
	{
		FBlockCell& Cell = Cells[i];
		if (Cell.bJammed && Cell.JamTurnsLeft > 0)
		{
			--Cell.JamTurnsLeft;
			if (Cell.JamTurnsLeft <= 0) { Cell.bJammed = false; ++Expired; }
		}
		if (Cell.bLocked && Cell.LockTurnsLeft > 0)
		{
			--Cell.LockTurnsLeft;
			if (Cell.LockTurnsLeft <= 0) { Cell.bLocked = false; ++Expired; }
		}
	}
	return Expired;
}

bool FMatchBoardCore::Shuffle()
{
	static const int32 MaxAttempts = 60;

	for (int32 Attempt = 0; Attempt < MaxAttempts; ++Attempt)
	{
		TArray<int32> Matchable;
		TArray<EBlockColor> OldColors;
		for (int32 i = 0; i < Cells.Num(); ++i)
		{
			if (Cells[i].IsNormal() && !Cells[i].bLocked)
			{
				Matchable.Add(i);
				OldColors.Add(Cells[i].Color);
			}
		}
		if (Matchable.Num() < 6) { return false; }

		TArray<EBlockColor> NewColors = OldColors;
		Rng->Shuffle(NewColors);
		for (int32 i = 0; i < Matchable.Num(); ++i) { Cells[Matchable[i]].Color = NewColors[i]; }

		if (!HasImmediateMatch() && HasAnyLegalMove()) { return true; }

		// Undo and try again with a fresh permutation.
		for (int32 i = 0; i < Matchable.Num(); ++i) { Cells[Matchable[i]].Color = OldColors[i]; }
	}

	// Last resort: hard re-roll of every matchable colour.
	for (int32 i = 0; i < Cells.Num(); ++i)
	{
		if (Cells[i].IsNormal() && !Cells[i].bLocked) { Cells[i].Color = RollColor(); }
	}
	return !HasImmediateMatch();
}

void FMatchBoardCore::DebugSnapshot(TArray<MRPGChar>& OutChars) const
{
	OutChars.Reset();
	OutChars.Reserve(GetSnapshotLength(Rules));

	for (int32 Y = 0; Y < Rules.Height; ++Y)
	{
		for (int32 X = 0; X < Rules.Width; ++X)
		{
			const FBlockCell& Cell = At(X, Y);
			MRPGChar Glyph = MRPG_TEXT('.');

			if (Cell.IsObstacle())
			{
				switch (Cell.Obstacle)
				{
				case EObstacleType::Ice:   Glyph = MRPG_TEXT('i'); break;
				case EObstacleType::Rock:  Glyph = MRPG_TEXT('x'); break;
				case EObstacleType::Crate: Glyph = MRPG_TEXT('c'); break;
				case EObstacleType::Chain: Glyph = MRPG_TEXT('n'); break;
				default:                   Glyph = MRPG_TEXT('o'); break;
				}
			}
			else if (Cell.IsNormal())
			{
				Glyph = ColorLetter(Cell.Color);
				if (Cell.bJammed) { Glyph = MRPG_TEXT('?'); }
				else if (Cell.Special == ESpecialType::None) { Glyph = ToLowerChar(Glyph); }
			}
			OutChars.Add(Glyph);
		}
		OutChars.Add(MRPG_TEXT('\n'));
	}
	OutChars.Add(MRPG_TEXT('\0'));
}

} // namespace MatchRPG
