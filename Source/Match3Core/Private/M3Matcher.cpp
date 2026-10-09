// =============================================================================
//  M3Matcher.cpp  -  Thuật toán dò đường nối
// =============================================================================
#include "M3Matcher.h"

namespace M3
{
namespace
{
// Đếm độ dài run ngang đi qua ô (X,Y). Trả về độ dài và đầu/cuối của run.
int32 HorizontalRunLength(const FBoard& B, int32 X, int32 Y, int32& OutStart, int32& OutEnd)
{
	const EColor C = B.At(X, Y).Color;
	if (!B.At(X, Y).IsMatchable()) { OutStart = X; OutEnd = X; return 0; }

	int32 Start = X;
	while (Start - 1 >= 0 && B.At(Start - 1, Y).IsMatchable() && B.At(Start - 1, Y).Color == C) { --Start; }
	int32 End = X;
	while (End + 1 < B.Width() && B.At(End + 1, Y).IsMatchable() && B.At(End + 1, Y).Color == C) { ++End; }

	OutStart = Start;
	OutEnd = End;
	return End - Start + 1;
}

// Đếm độ dài run dọc đi qua ô (X,Y).
int32 VerticalRunLength(const FBoard& B, int32 X, int32 Y, int32& OutStart, int32& OutEnd)
{
	const EColor C = B.At(X, Y).Color;
	if (!B.At(X, Y).IsMatchable()) { OutStart = Y; OutEnd = Y; return 0; }

	int32 Start = Y;
	while (Start - 1 >= 0 && B.At(X, Start - 1).IsMatchable() && B.At(X, Start - 1).Color == C) { --Start; }
	int32 End = Y;
	while (End + 1 < B.Height() && B.At(X, End + 1).IsMatchable() && B.At(X, End + 1).Color == C) { ++End; }

	OutStart = Start;
	OutEnd = End;
	return End - Start + 1;
}

bool ContainsCell(const std::vector<FCell>& Cells, const FCell& C)
{
	return std::find(Cells.begin(), Cells.end(), C) != Cells.end();
}

// Ô vuông 2x2 cùng màu (match-4 vuông): kiểm tra cửa sổ có góc trên-trái (X,Y).
bool IsSquareWindow(const FBoard& B, int32 X, int32 Y)
{
	if (X + 1 >= B.Width() || Y + 1 >= B.Height()) { return false; }
	const FBlock& A = B.At(X, Y);
	if (!A.IsMatchable()) { return false; }
	for (int32 dy = 0; dy <= 1; ++dy)
	{
		for (int32 dx = 0; dx <= 1; ++dx)
		{
			const FBlock& N = B.At(X + dx, Y + dy);
			if (!N.IsMatchable() || N.Color != A.Color) { return false; }
		}
	}
	return true;
}
} // namespace

// -----------------------------------------------------------------------------
// Gộp 2 nhóm: thêm các ô của Src vào Dst (không trùng), cộng cờ vuông, gộp run.
// -----------------------------------------------------------------------------
static void MergeGroup(FMatchGroup& Dst, const FMatchGroup& Src)
{
	for (const FCell& C : Src.Cells)
	{
		if (!ContainsCell(Dst.Cells, C)) { Dst.Cells.push_back(C); }
	}
	Dst.bSquare = Dst.bSquare || Src.bSquare;
	Dst.MaxRunLength = std::max(Dst.MaxRunLength, Src.MaxRunLength);
}

FMatchResult FMatcher::FindMatches(const FBoard& Board, const FCell* PreferredCell)
{
	FMatchResult Result;

	// ---------------------------------------------------------------------
	// Bước 1+2: tìm run >= 3 theo hàng và cột, gộp các run dính nhau thành nhóm.
	// ---------------------------------------------------------------------
	auto AddRun = [&Result](const std::vector<FCell>& RunCells, EColor Color, int32 RunLength)
	{
		FMatchGroup Run;
		Run.Cells = RunCells;
		Run.Color = Color;
		Run.MaxRunLength = RunLength;

		// Tìm các nhóm đang tồn tại có chung ô với run này -> gộp lại.
		int32 Target = -1;
		for (int32 i = 0; i < static_cast<int32>(Result.Groups.size()); ++i)
		{
			bool bShares = false;
			for (const FCell& C : RunCells)
			{
				if (ContainsCell(Result.Groups[static_cast<size_t>(i)].Cells, C)) { bShares = true; break; }
			}
			if (!bShares) { continue; }

			if (Target < 0)
			{
				MergeGroup(Result.Groups[static_cast<size_t>(i)], Run);
				Target = i;
			}
			else
			{
				MergeGroup(Result.Groups[static_cast<size_t>(Target)], Result.Groups[static_cast<size_t>(i)]);
				Result.Groups[static_cast<size_t>(i)].Cells.clear(); // đánh dấu để dọn sau
			}
		}

		if (Target < 0) { Result.Groups.push_back(Run); }
	};

	// Hàng ngang
	for (int32 Y = 0; Y < Board.Height(); ++Y)
	{
		int32 X = 0;
		while (X < Board.Width())
		{
			if (!Board.At(X, Y).IsMatchable()) { ++X; continue; }

			const EColor C = Board.At(X, Y).Color;
			int32 End = X;
			while (End + 1 < Board.Width() && Board.At(End + 1, Y).IsMatchable() && Board.At(End + 1, Y).Color == C) { ++End; }

			const int32 Len = End - X + 1;
			if (Len >= 3)
			{
				std::vector<FCell> RunCells;
				for (int32 i = X; i <= End; ++i) { RunCells.push_back(MakeCell(i, Y)); }
				AddRun(RunCells, C, Len);
			}
			X = End + 1;
		}
	}

	// Cột dọc
	for (int32 X = 0; X < Board.Width(); ++X)
	{
		int32 Y = 0;
		while (Y < Board.Height())
		{
			if (!Board.At(X, Y).IsMatchable()) { ++Y; continue; }

			const EColor C = Board.At(X, Y).Color;
			int32 End = Y;
			while (End + 1 < Board.Height() && Board.At(X, End + 1).IsMatchable() && Board.At(X, End + 1).Color == C) { ++End; }

			const int32 Len = End - Y + 1;
			if (Len >= 3)
			{
				std::vector<FCell> RunCells;
				for (int32 i = Y; i <= End; ++i) { RunCells.push_back(MakeCell(X, i)); }
				AddRun(RunCells, C, Len);
			}
			Y = End + 1;
		}
	}

	// Bỏ các nhóm rỗng (đã bị gộp vào nhóm khác).
	Result.Groups.erase(
		std::remove_if(Result.Groups.begin(), Result.Groups.end(),
			[](const FMatchGroup& G) { return G.Cells.empty(); }),
		Result.Groups.end());

	// ---------------------------------------------------------------------
	// Bước 3: thêm ô vuông 2x2 (match-4 vuông) vào nhóm tương ứng.
	// ---------------------------------------------------------------------
	for (int32 Y = 0; Y + 1 < Board.Height(); ++Y)
	{
		for (int32 X = 0; X + 1 < Board.Width(); ++X)
		{
			if (!IsSquareWindow(Board, X, Y)) { continue; }

			const EColor C = Board.At(X, Y).Color;
			const std::vector<FCell> SquareCells = {
				MakeCell(X, Y), MakeCell(X + 1, Y), MakeCell(X, Y + 1), MakeCell(X + 1, Y + 1)
			};

			// Có nhóm nào chứa ít nhất 1 ô của vuông này không? -> gộp vào nhóm đó.
			bool bMerged = false;
			for (FMatchGroup& G : Result.Groups)
			{
				bool bShares = false;
				for (const FCell& Sc : SquareCells)
				{
					if (ContainsCell(G.Cells, Sc)) { bShares = true; break; }
				}
				if (!bShares) { continue; }

				for (const FCell& Sc : SquareCells)
				{
					if (!ContainsCell(G.Cells, Sc)) { G.Cells.push_back(Sc); }
				}
				G.bSquare = true;
				bMerged = true;
				break;
			}

			// Không dính nhóm nào (vuông "trơ") -> tự thành 1 nhóm mới.
			if (!bMerged)
			{
				FMatchGroup SquareGroup;
				SquareGroup.Cells = SquareCells;
				SquareGroup.Color = C;
				SquareGroup.bSquare = true;
				SquareGroup.MaxRunLength = 2;   // vuông chỉ có run dài 2, nhưng vẫn là match-4
				Result.Groups.push_back(SquareGroup);
			}
		}
	}

	// ---------------------------------------------------------------------
	// Bước 4: tính độ dài run dài nhất của mỗi nhóm + chọn special + vị trí đặt.
	// ---------------------------------------------------------------------
	for (FMatchGroup& G : Result.Groups)
	{
		int32 BestRun = 2;
		bool  bBestHorizontal = true;
		for (const FCell& C : G.Cells)
		{
			int32 HS, HE;
			int32 VS, VE;
			const int32 HRun = HorizontalRunLength(Board, C.X, C.Y, HS, HE);
			const int32 VRun = VerticalRunLength(Board, C.X, C.Y, VS, VE);
			if (HRun > BestRun) { BestRun = HRun; bBestHorizontal = true; }
			if (VRun > BestRun) { BestRun = VRun; bBestHorizontal = false; }
		}
		G.MaxRunLength = std::max(G.MaxRunLength, BestRun);

		if (G.MaxRunLength >= 5)
		{
			G.SpecialKind = EBlockKind::ColorBomb;
		}
		else if (G.bSquare)
		{
			G.SpecialKind = EBlockKind::SquareBomb;
		}
		else if (G.MaxRunLength == 4)
		{
			G.SpecialKind = EBlockKind::LineClear;
		}
		else
		{
			G.SpecialKind = EBlockKind::Normal;
		}

		// Vị trí đặt special:
		//  - Ưu tiên ô người chơi vừa swap tới (giống cảm giác Candy Crush).
		//  - Nếu không có, chọn ô "giữa nhóm" (tổng khoảng cách tới các ô khác nhỏ nhất).
		if (PreferredCell && Board.InBounds(*PreferredCell) && ContainsCell(G.Cells, *PreferredCell))
		{
			G.SpecialCell = *PreferredCell;
		}
		else
		{
			int32 BestScore = 0x7FFFFFFF;
			FCell Best = G.Cells.front();
			for (const FCell& A : G.Cells)
			{
				int32 Score = 0;
				for (const FCell& B : G.Cells) { Score += ManhattanDistance(A, B); }
				if (Score < BestScore) { BestScore = Score; Best = A; }
			}
			G.SpecialCell = Best;
		}
	}

	// Nhóm có 3 ô và không có gì đặc biệt thì vẫn là match hợp lệ (special = Normal).
	Result.bHasMatch = !Result.Groups.empty();
	return Result;
}

bool FMatcher::IsCellInMatch(const FBoard& Board, const FCell& Cell)
{
	if (!Board.InBounds(Cell) || !Board.At(Cell).IsMatchable()) { return false; }

	int32 S, E;
	if (HorizontalRunLength(Board, Cell.X, Cell.Y, S, E) >= 3) { return true; }
	if (VerticalRunLength(Board, Cell.X, Cell.Y, S, E) >= 3)     { return true; }

	// Kiểm tra thuộc ô vuông 2x2 nào đó.
	for (int32 dy = -1; dy <= 0; ++dy)
	{
		for (int32 dx = -1; dx <= 0; ++dx)
		{
			if (IsSquareWindow(Board, Cell.X + dx, Cell.Y + dy)) { return true; }
		}
	}
	return false;
}

std::vector<FCell> FMatchResult::CollectCells() const
{
	std::vector<FCell> Out;
	for (const FMatchGroup& G : Groups)
	{
		for (const FCell& C : G.Cells)
		{
			if (!ContainsCell(Out, C)) { Out.push_back(C); }
		}
	}
	return Out;
}

} // namespace M3
