// =============================================================================
//  M3Board.cpp  -  Cài đặt bàn nối
// =============================================================================
#include "M3Board.h"

#include "M3Matcher.h"

namespace M3
{

FBoard::FBoard(int32 InWidth, int32 InHeight, uint32 Seed, int32 InNumColors)
{
	Reset(InWidth, InHeight, Seed, InNumColors);
}

void FBoard::Reset(int32 InWidth, int32 InHeight, uint32 Seed, int32 InNumColors)
{
	// Bàn nhỏ hơn 3x3 thì không thể có match-3, nên chặn ở mức tối thiểu.
	SizeX = std::max(3, InWidth);
	SizeY = std::max(3, InHeight);
	ColorsInPlay = std::max(3, std::min(InNumColors, kNumColors));

	Rng.Reseed(Seed);
	Cells.assign(static_cast<size_t>(SizeX) * static_cast<size_t>(SizeY), FBlock::MakeEmpty());

	FillRandom();
	EnsurePlayable();
}

// -----------------------------------------------------------------------------
// Nước đi
// -----------------------------------------------------------------------------
bool FBoard::CanSwap(const FCell& A, const FCell& B) const
{
	if (!InBounds(A) || !InBounds(B))          { return false; }
	if (ManhattanDistance(A, B) != 1)          { return false; }  // chỉ cho phép 2 ô kề nhau

	const FBlock& BA = At(A);
	const FBlock& BB = At(B);
	// Vật cản / ô trống / block bị khoá: không đổi chỗ được.
	if (BA.IsEmpty() || BB.IsEmpty())          { return false; }
	if (BA.IsObstacle() || BB.IsObstacle())    { return false; }
	if (BA.bLocked || BB.bLocked)              { return false; }
	return true;
}

void FBoard::SwapCells(const FCell& A, const FCell& B)
{
	if (!InBounds(A) || !InBounds(B)) { return; }
	std::swap(At(A), At(B));
}

bool FBoard::FindAnyPossibleMove(FCell& OutA, FCell& OutB) const
{
	// Dò ngây thơ: thử mọi cặp ô kề nhau, mô phỏng swap rồi hỏi FMatcher.
	// 8x8 = 112 cặp -> vẫn rất nhanh, đổi lại code cực dễ hiểu.
	FBoard& Self = const_cast<FBoard&>(*this);
	const FBoard Backup = *this;

	for (int32 Y = 0; Y < SizeY; ++Y)
	{
		for (int32 X = 0; X < SizeX; ++X)
		{
			const FCell A = MakeCell(X, Y);
			const FCell Neighbours[2] = { MakeCell(X + 1, Y), MakeCell(X, Y + 1) };

			for (const FCell& B : Neighbours)
			{
				if (!CanSwap(A, B)) { continue; }

				Self.SwapCells(A, B);
				const bool bMatch = FMatcher::FindMatches(Self).bHasMatch;
				Self.SwapCells(A, B);   // trả lại nguyên trạng

				if (bMatch)
				{
					OutA = A;
					OutB = B;
					return true;
				}
			}
		}
	}

	(void)Backup;
	return false;
}

bool FBoard::HasAnyPossibleMove() const
{
	FCell A, B;
	return FindAnyPossibleMove(A, B);
}

// -----------------------------------------------------------------------------
// Sinh bàn
// -----------------------------------------------------------------------------
EColor FBoard::RandomColor()
{
	return ColorFromIndex(Rng.Range(0, ColorsInPlay));
}

void FBoard::FillRandom()
{
	for (FBlock& B : Cells)
	{
		if (B.IsEmpty())
		{
			B = FBlock::MakeNormal(RandomColor());
		}
	}
}

void FBoard::EnsurePlayable()
{
	// Vòng 1: phá mọi match có sẵn (bàn mở màn không được tự nổ).
	for (int32 Guard = 0; Guard < 2000; ++Guard)
	{
		const FMatchResult M = FMatcher::FindMatches(*this);
		if (!M.bHasMatch) { break; }
		const std::vector<FCell> CellsToFix = M.CollectCells();
		for (const FCell& C : CellsToFix)
		{
			if (InBounds(C) && !At(C).IsObstacle()) { At(C).Color = RandomColor(); }
		}
	}

	// Vòng 2: bàn phải còn ít nhất 1 nước đi, nếu bí thì trộn lại.
	for (int32 Attempt = 0; Attempt < 40; ++Attempt)
	{
		if (HasAnyPossibleMove()) { return; }
		Shuffle();
		// Sau khi trộn vẫn có thể lòi ra match sẵn -> phá tiếp.
		for (int32 Guard = 0; Guard < 500; ++Guard)
		{
			const FMatchResult M = FMatcher::FindMatches(*this);
			if (!M.bHasMatch) { break; }
			for (const FCell& C : M.CollectCells())
			{
				if (InBounds(C) && !At(C).IsObstacle()) { At(C).Color = RandomColor(); }
			}
		}
	}
}

void FBoard::Shuffle()
{
	// Trộn "màu" của các block đang có, giữ nguyên vị trí vật cản và ô trống.
	std::vector<int32> Playable;
	for (int32 i = 0; i < CellCount(); ++i)
	{
		if (Cells[static_cast<size_t>(i)].IsMatchable()) { Playable.push_back(i); }
	}
	if (Playable.size() < 2) { return; }

	std::vector<EColor> Colors;
	Colors.reserve(Playable.size());
	for (int32 idx : Playable) { Colors.push_back(Cells[static_cast<size_t>(idx)].Color); }

	// Fisher-Yates
	for (size_t i = Colors.size(); i > 1; --i)
	{
		const size_t j = static_cast<size_t>(Rng.Range(0, static_cast<int32>(i)));
		std::swap(Colors[i - 1], Colors[j]);
	}
	for (size_t i = 0; i < Playable.size(); ++i)
	{
		Cells[static_cast<size_t>(Playable[i])].Color = Colors[i];
	}
}

// -----------------------------------------------------------------------------
// Vật cản
// -----------------------------------------------------------------------------
bool FBoard::PlaceObstacle(const FCell& C, int32 InCharges)
{
	if (!InBounds(C)) { return false; }
	const FBlock& B = At(C);
	// Chỉ đặt vật cản lên ô trống hoặc ô đang là block thường. Vật cản "ăn" block đó.
	if (!(B.IsEmpty() || (B.Kind == EBlockKind::Normal && !B.bLocked))) { return false; }

	FBlock NewBlock = FBlock::MakeObstacle(std::max(1, InCharges));
	At(C) = NewBlock;
	return true;
}

bool FBoard::RemoveObstacleAt(const FCell& C)
{
	if (!InBounds(C) || !At(C).IsObstacle()) { return false; }
	At(C) = FBlock::MakeEmpty();
	return true;
}

std::vector<FCell> FBoard::ObstacleCells() const
{
	std::vector<FCell> Out;
	for (int32 Y = 0; Y < SizeY; ++Y)
	{
		for (int32 X = 0; X < SizeX; ++X)
		{
			if (At(X, Y).IsObstacle()) { Out.push_back(MakeCell(X, Y)); }
		}
	}
	return Out;
}

int32 FBoard::ObstacleCount() const
{
	int32 Count = 0;
	for (const FBlock& B : Cells) { if (B.IsObstacle()) { ++Count; } }
	return Count;
}

int32 FBoard::ClearRandomObstacles(int32 Count)
{
	std::vector<FCell> Obstacles = ObstacleCells();
	int32 Removed = 0;
	while (Removed < Count && !Obstacles.empty())
	{
		const int32 Pick = Rng.Range(0, static_cast<int32>(Obstacles.size()));
		// Gỡ luôn cả ô vật cản (không quan tâm số charge) - đây là kỹ năng.
		RemoveObstacleAt(Obstacles[static_cast<size_t>(Pick)]);
		Obstacles.erase(Obstacles.begin() + Pick);
		++Removed;
	}
	return Removed;
}

std::vector<FCell> FBoard::ClearObstaclesInArea(const FCell& Center, int32 Radius)
{
	std::vector<FCell> Destroyed;
	for (int32 dy = -Radius; dy <= Radius; ++dy)
	{
		for (int32 dx = -Radius; dx <= Radius; ++dx)
		{
			const FCell C = MakeCell(Center.X + dx, Center.Y + dy);
			if (!InBounds(C) || !At(C).IsObstacle()) { continue; }

			// Vật cản có nhiều "charge": mỗi lần trúng trừ 1 charge.
			At(C).Charges -= 1;
			if (At(C).Charges <= 0)
			{
				At(C) = FBlock::MakeEmpty();
				Destroyed.push_back(C);
			}
		}
	}
	return Destroyed;
}

std::vector<FCell> FBoard::PlaceRandomObstacles(int32 Count, int32 Charges)
{
	std::vector<FCell> Placed;
	if (Count <= 0) { return Placed; }

	// Ưu tiên các ô nằm trên nửa dưới bàn (chỗ người chơi hay nối) để tạo áp lực.
	std::vector<FCell> Candidates;
	for (int32 Y = 0; Y < SizeY; ++Y)
	{
		for (int32 X = 0; X < SizeX; ++X)
		{
			const FCell C = MakeCell(X, Y);
			const FBlock& B = At(C);
			if (B.IsEmpty() || (B.Kind == EBlockKind::Normal && !B.bLocked)) { Candidates.push_back(C); }
		}
	}

	while (static_cast<int32>(Placed.size()) < Count && !Candidates.empty())
	{
		const int32 Pick = Rng.Range(0, static_cast<int32>(Candidates.size()));
		const FCell C = Candidates[static_cast<size_t>(Pick)];
		Candidates.erase(Candidates.begin() + Pick);
		if (PlaceObstacle(C, Charges)) { Placed.push_back(C); }
	}
	return Placed;
}

std::vector<FCell> FBoard::PlaceRandomTraps(int32 Count, int32 CountdownTurns)
{
	std::vector<FCell> Placed;
	if (Count <= 0) { return Placed; }

	std::vector<FCell> Candidates;
	for (int32 Y = 0; Y < SizeY; ++Y)
	{
		for (int32 X = 0; X < SizeX; ++X)
		{
			const FCell C = MakeCell(X, Y);
			const FBlock& B = At(C);
			if (B.Kind == EBlockKind::Normal && !B.bLocked) { Candidates.push_back(C); }
		}
	}

	while (static_cast<int32>(Placed.size()) < Count && !Candidates.empty())
	{
		const int32 Pick = Rng.Range(0, static_cast<int32>(Candidates.size()));
		const FCell C = Candidates[static_cast<size_t>(Pick)];
		Candidates.erase(Candidates.begin() + Pick);
		SetCell(C, FBlock::MakeCountTrap(CountdownTurns));
		Placed.push_back(C);
	}
	return Placed;
}

int32 FBoard::TickTraps(std::vector<FCell>& OutExploded)
{
	OutExploded.clear();
	for (int32 Y = 0; Y < SizeY; ++Y)
	{
		for (int32 X = 0; X < SizeX; ++X)
		{
			FBlock& B = At(X, Y);
			if (B.Kind == EBlockKind::CountTrap)
			{
				B.Charges--;
				if (B.Charges <= 0)
				{
					const FCell C = MakeCell(X, Y);
					OutExploded.push_back(C);
					ClearCell(C);
				}
			}
		}
	}
	return static_cast<int32>(OutExploded.size());
}

int32 FBoard::ReplaceColorWithObstacles(EColor Color)
{
	if (Color == EColor::None) { return 0; }
	int32 Count = 0;
	for (FBlock& B : Cells)
	{
		if (B.Color == Color && B.Kind == EBlockKind::Normal)
		{
			B = FBlock::MakeObstacle(1);
			Count++;
		}
	}
	return Count;
}

// -----------------------------------------------------------------------------
// Rơi & sinh mới
// -----------------------------------------------------------------------------
bool FBoard::ApplyGravityAndRefill()
{
	bool bChanged = false;

	for (int32 X = 0; X < SizeX; ++X)
	{
		// WriteY = ô trống gần đáy nhất trong "đoạn" hiện tại (đoạn bị chặn bởi vật cản
		// hoặc block bị khoá). Duyệt từ dưới lên, gặp block thì kéo xuống WriteY.
		int32 WriteY = SizeY - 1;

		for (int32 Y = SizeY - 1; Y >= -1; --Y)
		{
			const bool bWall = (Y < 0) || At(X, Y).IsObstacle() || At(X, Y).bLocked;
			if (bWall)
			{
				// Chạm đáy đoạn: lấp các ô trống phía trên WriteY bằng block mới.
				for (int32 FillY = WriteY; FillY > Y; --FillY)
				{
					At(X, FillY) = FBlock::MakeNormal(RandomColor());
					bChanged = true;
				}
				WriteY = Y - 1;
				continue;
			}

			if (!At(X, Y).IsEmpty())
			{
				if (WriteY != Y)
				{
					std::swap(At(X, WriteY), At(X, Y));
					bChanged = true;
				}
				--WriteY;
			}
		}
	}

	return bChanged;
}

// -----------------------------------------------------------------------------
// Debug / test
// -----------------------------------------------------------------------------
std::string FBoard::ToAscii() const
{
	std::string Out;
	for (int32 Y = 0; Y < SizeY; ++Y)
	{
		for (int32 X = 0; X < SizeX; ++X)
		{
			const FBlock& B = At(X, Y);
			if (B.IsObstacle())            { Out += '#'; }
			else if (B.IsEmpty())          { Out += '.'; }
			else if (B.Kind == EBlockKind::LineClear)  { Out += (B.Variant == 0 ? 'h' : 'v'); }
			else if (B.Kind == EBlockKind::SquareBomb) { Out += 'Q'; }
			else if (B.Kind == EBlockKind::ColorBomb)  { Out += '*'; }
			else                           { Out += ColorChar(B.Color); }
		}
		Out += '\n';
	}
	return Out;
}

FBoard FBoard::FromAscii(const std::vector<std::string>& Rows, uint32 Seed)
{
	int32 W = 3;
	for (const std::string& R : Rows) { W = std::max<int32>(W, static_cast<int32>(R.size())); }
	const int32 H = std::max<int32>(3, static_cast<int32>(Rows.size()));

	FBoard Board(W, H, Seed);
	// Xoá bàn vừa sinh để dựng đúng theo ký tự.
	for (int32 i = 0; i < Board.CellCount(); ++i) { Board.Cells[static_cast<size_t>(i)] = FBlock::MakeEmpty(); }

	for (int32 Y = 0; Y < static_cast<int32>(Rows.size()); ++Y)
	{
		const std::string& Row = Rows[static_cast<size_t>(Y)];
		for (int32 X = 0; X < static_cast<int32>(Row.size()); ++X)
		{
			const char Ch = Row[static_cast<size_t>(X)];
			if (Ch == '#')      { Board.At(X, Y) = FBlock::MakeObstacle(1); }
			else if (Ch == '.') { Board.At(X, Y) = FBlock::MakeEmpty(); }
			else                { Board.At(X, Y) = FBlock::MakeNormal(ColorFromChar(Ch)); }
		}
	}
	return Board;
}

} // namespace M3
