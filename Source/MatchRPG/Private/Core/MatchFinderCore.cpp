// Copyright MatchRPG. Match detection, special-block creation and cascade resolution.
#include "Core/MatchFinderCore.h"

namespace MatchRPG
{

namespace
{
	/** Damage bookkeeping for the obstacles caught in one cascade step. */
	struct FStepTriggerBoard
	{
		int32 CellCount = 0;
		TArray<uint8> InTrigger;
		TArray<uint8> PivotProtected;
		TArray<uint8> SpecialConsumed;
		TArray<int32> BasicDamage;
		TArray<int32> SpecialDamage;
		TArray<int32> Queue;

		void Init(int32 InCellCount)
		{
			CellCount = InCellCount;
			InTrigger.Reset();     InTrigger.SetNum(CellCount);
			PivotProtected.Reset(); PivotProtected.SetNum(CellCount);
			SpecialConsumed.Reset(); SpecialConsumed.SetNum(CellCount);
			BasicDamage.Reset();   BasicDamage.SetNum(CellCount);
			SpecialDamage.Reset(); SpecialDamage.SetNum(CellCount);
			for (int32 i = 0; i < CellCount; ++i)
			{
				InTrigger[i] = 0;
				PivotProtected[i] = 0;
				SpecialConsumed[i] = 0;
				BasicDamage[i] = 0;
				SpecialDamage[i] = 0;
			}
			Queue.Reset();
			Queue.Reserve(CellCount);
		}

		bool MarkTriggered(int32 Index)
		{
			if (Index < 0 || Index >= CellCount) { return false; }
			if (InTrigger[Index] != 0) { return false; }
			InTrigger[Index] = 1;
			Queue.Add(Index);
			return true;
		}

		void AddBasicDamage(int32 Index, int32 Amount)
		{
			if (Index < 0 || Index >= CellCount) { return; }
			if (Amount > BasicDamage[Index]) { BasicDamage[Index] = Amount; }
		}

		void AddSpecialDamage(int32 Index, int32 Amount)
		{
			if (Index < 0 || Index >= CellCount) { return; }
			if (Amount > SpecialDamage[Index]) { SpecialDamage[Index] = Amount; }
		}
	};

	bool GroupContainsCell(const FMatchGroup& Group, const FIntPoint& Point)
	{
		for (int32 i = 0; i < Group.Cells.Num(); ++i)
		{
			if (Group.Cells[i] == Point) { return true; }
		}
		return false;
	}

	/** Does the group contain a cell orthogonally adjacent to Point? */
	bool HasOrthogonalNeighbourInGroup(const FMatchGroup& Group, const FIntPoint& Point, bool bHorizontal)
	{
		for (int32 i = 0; i < Group.Cells.Num(); ++i)
		{
			const FIntPoint& Other = Group.Cells[i];
			if (bHorizontal)
			{
				if (Other.Y == Point.Y && FMath::Abs(Other.X - Point.X) == 1) { return true; }
			}
			else
			{
				if (Other.X == Point.X && FMath::Abs(Other.Y - Point.Y) == 1) { return true; }
			}
		}
		return false;
	}

	bool IsSquareCorner(const FMatchBoardCore& Board, const FMatchGroup& Group, const FIntPoint& Point)
	{
		for (int32 DX = 0; DX < 2; ++DX)
		{
			for (int32 DY = 0; DY < 2; ++DY)
			{
				const FIntPoint Base(Point.X - DX, Point.Y - DY);
				if (!Board.IsInBounds(Base) || !Board.IsInBounds(Base.X + 1, Base.Y + 1)) { continue; }
				const FIntPoint P00 = Base;
				const FIntPoint P10(Base.X + 1, Base.Y);
				const FIntPoint P01(Base.X, Base.Y + 1);
				const FIntPoint P11(Base.X + 1, Base.Y + 1);
				if (GroupContainsCell(Group, P00) && GroupContainsCell(Group, P10) &&
					GroupContainsCell(Group, P01) && GroupContainsCell(Group, P11))
				{
					return true;
				}
			}
		}
		return false;
	}
}

// ---------------------------------------------------------------------------
// FMatchFinderCore
// ---------------------------------------------------------------------------

bool FMatchFinderCore::IsBetterShape(EMatchShape Candidate, EMatchShape Current)
{
	auto Rank = [](EMatchShape Shape) -> int32
	{
		switch (Shape)
		{
		case EMatchShape::Line3:   return 1;
		case EMatchShape::Line4:   return 2;
		case EMatchShape::LTShape: return 3;
		case EMatchShape::Square4: return 4;
		case EMatchShape::Line5:   return 5;
		default:                   return 0;
		}
	};
	return Rank(Candidate) > Rank(Current);
}

ESpecialType FMatchFinderCore::ShapeToSpecial(const FBoardRules& Rules, EMatchShape Shape, bool bHorizontal)
{
	switch (Shape)
	{
	case EMatchShape::Line5:
		// "match-5: kích hoạt toàn bộ các block được đổi chỗ với nó"
		return Rules.bMatch5CreatesSwapAll ? ESpecialType::SwapAll : (bHorizontal ? ESpecialType::LineRow : ESpecialType::LineCol);
	case EMatchShape::Line4:
		return bHorizontal ? ESpecialType::LineRow : ESpecialType::LineCol;
	case EMatchShape::Square4:
		// "match-4 vuông": the designated obstacle breaker.
		return ESpecialType::SquareBreaker;
	case EMatchShape::LTShape:
		return ESpecialType::AreaBomb;
	default:
		return ESpecialType::None;
	}
}

EMatchShape FMatchFinderCore::ClassifyGroup(const FMatchBoardCore& Board, const FMatchGroup& Group, FIntPoint& OutPivot, bool& bOutHorizontal)
{
	const int32 Count = Group.Cells.Num();
	OutPivot = FIntPoint(-1, -1);
	bOutHorizontal = false;
	if (Count <= 0) { return EMatchShape::None; }

	int32 MinX = Group.Cells[0].X;
	int32 MaxX = Group.Cells[0].X;
	int32 MinY = Group.Cells[0].Y;
	int32 MaxY = Group.Cells[0].Y;
	for (int32 i = 1; i < Count; ++i)
	{
		MinX = FMath::Min(MinX, Group.Cells[i].X);
		MaxX = FMath::Max(MaxX, Group.Cells[i].X);
		MinY = FMath::Min(MinY, Group.Cells[i].Y);
		MaxY = FMath::Max(MaxY, Group.Cells[i].Y);
	}

	const bool bSingleRow = (MinY == MaxY);
	const bool bSingleColumn = (MinX == MaxX);

	if (bSingleRow || bSingleColumn)
	{
		bOutHorizontal = bSingleRow;
		OutPivot = bSingleRow ? FIntPoint((MinX + MaxX) / 2, MinY) : FIntPoint(MinX, (MinY + MaxY) / 2);
		if (Count >= 5) { return EMatchShape::Line5; }
		if (Count == 4) { return EMatchShape::Line4; }
		return EMatchShape::Line3;
	}

	if (Count == 4)
	{
		// A non-straight 4-cell group can only be a solid square.
		OutPivot = FIntPoint(MinX, MinY);
		return EMatchShape::Square4;
	}

	// L / T / plus shapes: pivot on the cell that extends both ways.
	for (int32 i = 0; i < Count; ++i)
	{
		const FIntPoint& P = Group.Cells[i];
		const bool bHasHorizontal = HasOrthogonalNeighbourInGroup(Group, P, true);
		const bool bHasVertical = HasOrthogonalNeighbourInGroup(Group, P, false);
		if (bHasHorizontal && bHasVertical)
		{
			OutPivot = P;
			return EMatchShape::LTShape;
		}
	}

	// Fallback (should be unreachable): treat as an area bomb at the first cell.
	OutPivot = Group.Cells[0];
	return EMatchShape::LTShape;
}

void FMatchFinderCore::FindGroups(const FMatchBoardCore& Board, TArray<FMatchGroup>& OutGroups, const FIntPoint* PreferredCell)
{
	OutGroups.Reset();

	const FBoardRules& Rules = Board.GetRules();
	const int32 Width = Board.GetWidth();
	const int32 Height = Board.GetHeight();
	const int32 CellCount = Board.GetCellCount();

	TArray<uint8> Marked;
	Marked.SetNum(CellCount);
	for (int32 i = 0; i < CellCount; ++i) { Marked[i] = 0; }

	// Horizontal runs of 3+.
	for (int32 Y = 0; Y < Height; ++Y)
	{
		int32 X = 0;
		while (X < Width)
		{
			const FBlockCell& Cell = Board.At(X, Y);
			if (!Cell.IsMatchable()) { ++X; continue; }

			const EBlockColor Color = Cell.Color;
			int32 RunEnd = X + 1;
			while (RunEnd < Width)
			{
				const FBlockCell& Next = Board.At(RunEnd, Y);
				if (!Next.IsMatchable() || Next.Color != Color) { break; }
				++RunEnd;
			}
			if (RunEnd - X >= 3)
			{
				for (int32 i = X; i < RunEnd; ++i) { Marked[Board.ToIndex(i, Y)] = 1; }
			}
			X = RunEnd;
		}
	}

	// Vertical runs of 3+.
	for (int32 X = 0; X < Width; ++X)
	{
		int32 Y = 0;
		while (Y < Height)
		{
			const FBlockCell& Cell = Board.At(X, Y);
			if (!Cell.IsMatchable()) { ++Y; continue; }

			const EBlockColor Color = Cell.Color;
			int32 RunEnd = Y + 1;
			while (RunEnd < Height)
			{
				const FBlockCell& Next = Board.At(X, RunEnd);
				if (!Next.IsMatchable() || Next.Color != Color) { break; }
				++RunEnd;
			}
			if (RunEnd - Y >= 3)
			{
				for (int32 i = Y; i < RunEnd; ++i) { Marked[Board.ToIndex(X, i)] = 1; }
			}
			Y = RunEnd;
		}
	}

	// "match-4 vuông": a solid 2x2 square of one colour is a match on its own.
	if (Rules.bEnableSquareMatch)
	{
		for (int32 Y = 0; Y + 1 < Height; ++Y)
		{
			for (int32 X = 0; X + 1 < Width; ++X)
			{
				const FBlockCell& Origin = Board.At(X, Y);
				if (!Origin.IsMatchable()) { continue; }

				bool bAllMatch = true;
				for (int32 DX = 0; DX < 2 && bAllMatch; ++DX)
				{
					for (int32 DY = 0; DY < 2 && bAllMatch; ++DY)
					{
						const FBlockCell& Neighbour = Board.At(X + DX, Y + DY);
						if (!Neighbour.IsMatchable() || Neighbour.Color != Origin.Color) { bAllMatch = false; }
					}
				}
				if (!bAllMatch) { continue; }

				for (int32 DX = 0; DX < 2; ++DX)
				{
					for (int32 DY = 0; DY < 2; ++DY) { Marked[Board.ToIndex(X + DX, Y + DY)] = 1; }
				}
			}
		}
	}

	// Merge everything that touches into connected same-colour components.
	TArray<uint8> Visited;
	Visited.SetNum(CellCount);
	for (int32 i = 0; i < CellCount; ++i) { Visited[i] = 0; }

	TArray<int32> Stack;
	for (int32 Start = 0; Start < CellCount; ++Start)
	{
		if (Marked[Start] == 0 || Visited[Start] != 0) { continue; }

		const FBlockCell& StartCell = Board.At(Start % Width, Start / Width);
		const EBlockColor Color = StartCell.Color;

		FMatchGroup Group;
		Group.Color = Color;

		Stack.Reset();
		Stack.Add(Start);
		Visited[Start] = 1;

		while (Stack.Num() > 0)
		{
			const int32 Index = Stack.Last();
			Stack.RemoveAt(Stack.Num() - 1);

			const int32 X = Index % Width;
			const int32 Y = Index / Width;
			Group.Cells.Add(FIntPoint(X, Y));

			const int32 NeighbourX[4] = { 1, -1, 0, 0 };
			const int32 NeighbourY[4] = { 0, 0, 1, -1 };
			for (int32 Direction = 0; Direction < 4; ++Direction)
			{
				const int32 NX = X + NeighbourX[Direction];
				const int32 NY = Y + NeighbourY[Direction];
				if (!Board.IsInBounds(NX, NY)) { continue; }

				const int32 NeighbourIndex = Board.ToIndex(NX, NY);
				if (Marked[NeighbourIndex] == 0 || Visited[NeighbourIndex] != 0) { continue; }

				const FBlockCell& Neighbour = Board.At(NX, NY);
				if (!Neighbour.IsMatchable() || Neighbour.Color != Color) { continue; }

				Visited[NeighbourIndex] = 1;
				Stack.Add(NeighbourIndex);
			}
		}

		bool bHorizontal = false;
		FIntPoint Pivot(-1, -1);
		Group.Shape = ClassifyGroup(Board, Group, Pivot, bHorizontal);
		Group.bHorizontal = bHorizontal;
		Group.Length = Group.Cells.Num();

		// The block the player actually moved into is the natural place for the reward.
		if (PreferredCell != nullptr && GroupContainsCell(Group, *PreferredCell))
		{
			Pivot = *PreferredCell;
		}
		Group.Pivot = Pivot;
		Group.AwardedSpecial = ShapeToSpecial(Rules, Group.Shape, bHorizontal);

		OutGroups.Add(Group);
	}
}

// ---------------------------------------------------------------------------
// FMatchResolver
// ---------------------------------------------------------------------------

FMatchResolver::FMatchResolver(FMatchRng* InRng) : Rng(InRng)
{
}

FResolveStepResult FMatchResolver::ProcessStep(FMatchBoardCore& Board, const FEffectScaleRules& Scales, int32 StepIndex, const FIntPoint* SwapA, const FIntPoint* SwapB)
{
	FResolveStepResult Step;
	Step.StepIndex = StepIndex;

	const FBoardRules& Rules = Board.GetRules();
	const int32 Width = Board.GetWidth();
	const int32 Height = Board.GetHeight();

	// The cell the player dropped into becomes the pivot when it belongs to a group.
	const FIntPoint* Preferred = (StepIndex == 0) ? SwapB : nullptr;
	FMatchFinderCore::FindGroups(Board, Step.Groups, Preferred);

	FStepTriggerBoard Trigger;
	Trigger.Init(Board.GetCellCount());

	// --- SwapAll fusion -----------------------------------------------------
	// Swapping a 5-line block activates every block it was swapped with.
	if (StepIndex == 0 && SwapA != nullptr && SwapB != nullptr)
	{
		const FIntPoint Swapped[2] = { *SwapA, *SwapB };
		for (int32 i = 0; i < 2; ++i)
		{
			const FIntPoint Position = Swapped[i];
			if (!Board.IsInBounds(Position)) { continue; }

			const FBlockCell& Cell = Board.AtPoint(Position);
			if (Cell.Special != ESpecialType::SwapAll) { continue; }

			Step.bSwapAllDetonation = true;
			const EBlockColor Target = (Cell.SwapAllColor != EBlockColor::None) ? Cell.SwapAllColor : Cell.Color;
			Trigger.MarkTriggered(Board.ToIndex(Position.X, Position.Y));

			if (Target != EBlockColor::None)
			{
				for (int32 Y = 0; Y < Height; ++Y)
				{
					for (int32 X = 0; X < Width; ++X)
					{
						const FBlockCell& Other = Board.At(X, Y);
						if (Other.IsNormal() && Other.Color == Target) { Trigger.MarkTriggered(Board.ToIndex(X, Y)); }
					}
				}
			}
			// The block it traded places with is part of the detonation too.
			const FIntPoint Partner = Swapped[1 - i];
			Trigger.MarkTriggered(Board.ToIndex(Partner.X, Partner.Y));
		}
	}

	if (Step.Groups.Num() == 0 && !Step.bSwapAllDetonation)
	{
		Step.bHadMatch = false;
		return Step;
	}
	Step.bHadMatch = true;

	// --- seed the trigger set from the detected groups ----------------------
	for (int32 g = 0; g < Step.Groups.Num(); ++g)
	{
		const FMatchGroup& Group = Step.Groups[g];
		for (int32 c = 0; c < Group.Cells.Num(); ++c)
		{
			const FIntPoint& Point = Group.Cells[c];
			Trigger.MarkTriggered(Board.ToIndex(Point.X, Point.Y));
		}
		if (Group.AwardedSpecial != ESpecialType::None && Board.IsInBounds(Group.Pivot))
		{
			Trigger.PivotProtected[Board.ToIndex(Group.Pivot.X, Group.Pivot.Y)] = 1;
		}
	}

	// --- an ordinary block chips obstacles it touches -----------------------
	for (int32 Index = 0; Index < Trigger.CellCount; ++Index)
	{
		if (Trigger.InTrigger[Index] == 0) { continue; }
		const int32 X = Index % Width;
		const int32 Y = Index / Width;
		if (!Board.At(X, Y).IsNormal()) { continue; }

		const int32 NeighbourX[4] = { 1, -1, 0, 0 };
		const int32 NeighbourY[4] = { 0, 0, 1, -1 };
		for (int32 Direction = 0; Direction < 4; ++Direction)
		{
			const int32 NX = X + NeighbourX[Direction];
			const int32 NY = Y + NeighbourY[Direction];
			if (!Board.IsInBounds(NX, NY)) { continue; }

			const FBlockCell& Neighbour = Board.At(NX, NY);
			if (!Neighbour.IsObstacle()) { continue; }
			if (!GetObstacleProfile(Neighbour.Obstacle).bDamagedByBasicMatch) { continue; }
			Trigger.AddBasicDamage(Board.ToIndex(NX, NY), 1);
		}
	}

	// --- a square match shatters the obstacles around it --------------------
	for (int32 g = 0; g < Step.Groups.Num(); ++g)
	{
		const FMatchGroup& Group = Step.Groups[g];
		if (Group.Shape != EMatchShape::Square4) { continue; }

		const int32 Radius = FMath::Max(1, Rules.SquareObstacleRadius);
		for (int32 c = 0; c < Group.Cells.Num(); ++c)
		{
			const FIntPoint& Point = Group.Cells[c];
			for (int32 OffsetY = -Radius; OffsetY <= Radius; ++OffsetY)
			{
				for (int32 OffsetX = -Radius; OffsetX <= Radius; ++OffsetX)
				{
					const int32 NX = Point.X + OffsetX;
					const int32 NY = Point.Y + OffsetY;
					if (!Board.IsInBounds(NX, NY)) { continue; }
					if (!Board.At(NX, NY).IsObstacle()) { continue; }
					Trigger.AddSpecialDamage(Board.ToIndex(NX, NY), Rules.SquareObstacleDamage);
				}
			}
		}
	}

	// --- expand special blocks, chaining into each other --------------------
	while (Trigger.Queue.Num() > 0)
	{
		const int32 Index = Trigger.Queue[0];
		Trigger.Queue.RemoveAt(0);

		const int32 X = Index % Width;
		const int32 Y = Index / Width;
		const ESpecialType Special = Board.At(X, Y).Special;
		if (Special == ESpecialType::None) { continue; }
		if (Trigger.SpecialConsumed[Index] != 0) { continue; }
		Trigger.SpecialConsumed[Index] = 1;
		++Step.SpecialsTriggered;

		switch (Special)
		{
		case ESpecialType::LineRow:
			for (int32 i = 0; i < Width; ++i)
			{
				Trigger.MarkTriggered(Board.ToIndex(i, Y));
				if (Board.At(i, Y).IsObstacle()) { Trigger.AddSpecialDamage(Board.ToIndex(i, Y), Rules.SpecialObstacleDamage); }
			}
			break;

		case ESpecialType::LineCol:
			for (int32 j = 0; j < Height; ++j)
			{
				Trigger.MarkTriggered(Board.ToIndex(X, j));
				if (Board.At(X, j).IsObstacle()) { Trigger.AddSpecialDamage(Board.ToIndex(X, j), Rules.SpecialObstacleDamage); }
			}
			break;

		case ESpecialType::AreaBomb:
			for (int32 OffsetY = -1; OffsetY <= 1; ++OffsetY)
			{
				for (int32 OffsetX = -1; OffsetX <= 1; ++OffsetX)
				{
					const int32 NX = X + OffsetX;
					const int32 NY = Y + OffsetY;
					if (!Board.IsInBounds(NX, NY)) { continue; }
					Trigger.MarkTriggered(Board.ToIndex(NX, NY));
					if (Board.At(NX, NY).IsObstacle()) { Trigger.AddSpecialDamage(Board.ToIndex(NX, NY), Rules.AreaBombObstacleDamage); }
				}
			}
			break;

		case ESpecialType::SquareBreaker:
			for (int32 OffsetY = -1; OffsetY <= 1; ++OffsetY)
			{
				for (int32 OffsetX = -1; OffsetX <= 1; ++OffsetX)
				{
					if (OffsetX == 0 && OffsetY == 0) { continue; }
					const int32 NX = X + OffsetX;
					const int32 NY = Y + OffsetY;
					if (!Board.IsInBounds(NX, NY)) { continue; }
					Trigger.MarkTriggered(Board.ToIndex(NX, NY));
					if (Board.At(NX, NY).IsObstacle()) { Trigger.AddSpecialDamage(Board.ToIndex(NX, NY), Rules.SquareObstacleDamage); }
				}
			}
			break;

		case ESpecialType::SwapAll:
			{
				const FBlockCell& Cell = Board.At(X, Y);
				const EBlockColor Target = (Cell.SwapAllColor != EBlockColor::None) ? Cell.SwapAllColor : Cell.Color;
				Trigger.MarkTriggered(Index);
				for (int32 Y2 = 0; Y2 < Height; ++Y2)
				{
					for (int32 X2 = 0; X2 < Width; ++X2)
					{
						const FBlockCell& Other = Board.At(X2, Y2);
						if (Target != EBlockColor::None && Other.IsNormal() && Other.Color == Target)
						{
							Trigger.MarkTriggered(Board.ToIndex(X2, Y2));
						}
						if (!Other.IsObstacle()) { continue; }
						// Obstacles neighbouring the detonated colours get caught.
						if (FMath::Abs(X2 - X) <= 1 && FMath::Abs(Y2 - Y) <= 1)
						{
							Trigger.AddSpecialDamage(Board.ToIndex(X2, Y2), Rules.SpecialObstacleDamage);
						}
					}
				}
			}
			break;

		default:
			break;
		}
	}

	// --- aggregate per colour ----------------------------------------------
	for (int32 Index = 0; Index < Trigger.CellCount; ++Index)
	{
		if (Trigger.InTrigger[Index] == 0) { continue; }

		const int32 X = Index % Width;
		const int32 Y = Index / Width;
		const FBlockCell& Cell = Board.At(X, Y);
		if (!Cell.IsNormal() || Cell.Color == EBlockColor::None) { continue; }

		FTriggerEvent* Event = nullptr;
		for (int32 t = 0; t < Step.Triggers.Num(); ++t)
		{
			if (Step.Triggers[t].Color == Cell.Color) { Event = &Step.Triggers[t]; break; }
		}
		if (Event == nullptr)
		{
			FTriggerEvent NewEvent;
			NewEvent.Color = Cell.Color;
			Step.Triggers.Add(NewEvent);
			Event = &Step.Triggers.Last();
		}
		++Event->BlockCount;
		if (Cell.Special != ESpecialType::None && Trigger.SpecialConsumed[Index] != 0) { ++Event->SpecialCount; }
	}

	for (int32 g = 0; g < Step.Groups.Num(); ++g)
	{
		const FMatchGroup& Group = Step.Groups[g];
		if (Group.Color == EBlockColor::None) { continue; }

		for (int32 t = 0; t < Step.Triggers.Num(); ++t)
		{
			FTriggerEvent& Event = Step.Triggers[t];
			if (Event.Color != Group.Color) { continue; }
			if (FMatchFinderCore::IsBetterShape(Group.Shape, Event.BestShape)) { Event.BestShape = Group.Shape; }
			if (Group.Shape == EMatchShape::Square4) { Event.bSquareMatchInvolved = true; }
		}
	}

	// --- damage the obstacles caught in the blast ---------------------------
	for (int32 Index = 0; Index < Trigger.CellCount; ++Index)
	{
		if (Trigger.BasicDamage[Index] <= 0 && Trigger.SpecialDamage[Index] <= 0) { continue; }

		const int32 X = Index % Width;
		const int32 Y = Index / Width;
		if (!Board.At(X, Y).IsObstacle()) { continue; }

		// Read the type before damaging: a destroyed obstacle clears its own cell.
		const EObstacleType ObstacleType = Board.At(X, Y).Obstacle;

		bool bDestroyed = false;
		if (Trigger.BasicDamage[Index] > 0)
		{
			bDestroyed = Board.DamageObstacle(X, Y, Trigger.BasicDamage[Index], false);
		}
		if (!bDestroyed && Trigger.SpecialDamage[Index] > 0)
		{
			bDestroyed = Board.DamageObstacle(X, Y, Trigger.SpecialDamage[Index], true);
		}
		if (bDestroyed)
		{
			++Step.ObstaclesDestroyed;
			Step.DestroyedObstacleTypes.Add(ObstacleType);
			Step.ClearedCells.Add(FIntPoint(X, Y));
		}
	}

	// --- clear the triggered blocks ----------------------------------------
	for (int32 Index = 0; Index < Trigger.CellCount; ++Index)
	{
		if (Trigger.InTrigger[Index] == 0) { continue; }
		if (Trigger.PivotProtected[Index] != 0) { continue; }

		const int32 X = Index % Width;
		const int32 Y = Index / Width;
		FBlockCell& Cell = Board.At(X, Y);
		if (!Cell.IsNormal()) { continue; }

		Step.ClearedCells.Add(FIntPoint(X, Y));
		Cell.Clear();
	}

	// --- leave the awarded special blocks behind ----------------------------
	for (int32 g = 0; g < Step.Groups.Num(); ++g)
	{
		const FMatchGroup& Group = Step.Groups[g];
		if (Group.AwardedSpecial == ESpecialType::None) { continue; }
		if (!Board.IsInBounds(Group.Pivot)) { continue; }

		Board.AtPoint(Group.Pivot) = FMatchBoardCore::MakeNormalBlock(Group.Color, Group.AwardedSpecial, Board.GetTurn());
		Step.CreatedSpecials.Add(Group.Pivot);
	}

	Board.ApplyGravity();
	Board.Refill();

	Step.TotalBlocksCleared = Step.ClearedCells.Num();
	return Step;
}

void FMatchResolver::MergeStepIntoOutcome(const FResolveStepResult& Step, FResolveOutcome& OutOutcome, const FEffectScaleRules& Scales) const
{
	OutOutcome.Steps.Add(Step);
	OutOutcome.TotalBlocksCleared += Step.TotalBlocksCleared;
	OutOutcome.ObstaclesDestroyed += Step.ObstaclesDestroyed;
	OutOutcome.SpecialsCreated += Step.CreatedSpecials.Num();
	OutOutcome.SpecialsTriggered += Step.SpecialsTriggered;
	OutOutcome.MaxCascadeDepth = FMath::Max(OutOutcome.MaxCascadeDepth, Step.StepIndex);

	const float StepMultiplier = 1.0f + static_cast<float>(Step.StepIndex) * Scales.CascadeMultiplierPerLevel;
	OutOutcome.CascadeMultiplier = FMath::Max(OutOutcome.CascadeMultiplier, StepMultiplier);

	for (int32 t = 0; t < Step.Triggers.Num(); ++t)
	{
		const FTriggerEvent& Source = Step.Triggers[t];

		FTriggerEvent* Target = nullptr;
		for (int32 i = 0; i < OutOutcome.MergedTriggers.Num(); ++i)
		{
			if (OutOutcome.MergedTriggers[i].Color == Source.Color) { Target = &OutOutcome.MergedTriggers[i]; break; }
		}
		if (Target == nullptr)
		{
			FTriggerEvent NewEvent;
			NewEvent.Color = Source.Color;
			OutOutcome.MergedTriggers.Add(NewEvent);
			Target = &OutOutcome.MergedTriggers.Last();
		}
		Target->BlockCount += Source.BlockCount;
		Target->SpecialCount += Source.SpecialCount;
		if (FMatchFinderCore::IsBetterShape(Source.BestShape, Target->BestShape)) { Target->BestShape = Source.BestShape; }
		Target->bSquareMatchInvolved = Target->bSquareMatchInvolved || Source.bSquareMatchInvolved;
	}
}

FResolveOutcome FMatchResolver::ResolveSwap(FMatchBoardCore& Board, const FIntPoint& A, const FIntPoint& B, const FEffectScaleRules& Scales)
{
	FResolveOutcome Outcome;

	if (!Board.TrySwapAndValidate(A, B))
	{
		Outcome.bMoveAccepted = false;
		return Outcome;
	}
	Outcome.bMoveAccepted = true;

	const int32 MaxSteps = FMath::Max(1, Board.GetRules().MaxCascadeDepth);
	for (int32 StepIndex = 0; StepIndex < MaxSteps; ++StepIndex)
	{
		const FResolveStepResult Step = ProcessStep(Board, Scales, StepIndex, &A, &B);
		if (!Step.bHadMatch) { break; }
		MergeStepIntoOutcome(Step, Outcome, Scales);
	}

	return Outcome;
}

FResolveOutcome FMatchResolver::ResolveBoard(FMatchBoardCore& Board, const FEffectScaleRules& Scales, int32 MaxSteps)
{
	FResolveOutcome Outcome;
	const int32 Steps = FMath::Min(FMath::Max(1, MaxSteps), FMath::Max(1, Board.GetRules().MaxCascadeDepth));

	for (int32 StepIndex = 0; StepIndex < Steps; ++StepIndex)
	{
		const FResolveStepResult Step = ProcessStep(Board, Scales, StepIndex, nullptr, nullptr);
		if (!Step.bHadMatch) { break; }
		MergeStepIntoOutcome(Step, Outcome, Scales);
	}

	Outcome.bMoveAccepted = Outcome.Steps.Num() > 0;
	return Outcome;
}

} // namespace MatchRPG
