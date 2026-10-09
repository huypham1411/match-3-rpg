// =============================================================================
//  M3TestHelpers.h  -  Các bàn thiết kế sẵn cho test (đọc được bằng mắt)
//  ---------------------------------------------------------------------------
//  Ý tưởng: mọi test đều dựa trên một "nền sạch" không có match sẵn, sau đó ta
//  đặt vài block để TỰ TAY tạo ra đúng loại match cần kiểm tra. Nhờ vậy kết quả
//  test không phụ thuộc may mắn của bàn random.
// =============================================================================
#pragma once

#include "M3Battle.h"
#include "M3Board.h"
#include "M3Content.h"
#include "M3Matcher.h"
#include "M3Resolver.h"

namespace M3TestHelpers
{
using namespace M3;

// -----------------------------------------------------------------------------
// Nền "sạch": màu = (x + 2y) % số_màu
//  -> không có 3 ô liền nhau cùng màu, cũng không có ô vuông 2x2 nào.
// -----------------------------------------------------------------------------
inline void FillCleanBoard(FBoard& Board)
{
	const int32 Colors = Board.NumColors();
	for (int32 Y = 0; Y < Board.Height(); ++Y)
	{
		for (int32 X = 0; X < Board.Width(); ++X)
		{
			Board.SetCell(MakeCell(X, Y), FBlock::MakeNormal(ColorFromIndex((X + 2 * Y) % Colors)));
		}
	}
}

// Màu phụ trợ thứ Offset quanh màu X: luôn khác X, các Offset khác nhau cho màu khác nhau.
inline EColor SafeColor(EColor X, int32 Offset)
{
	return ColorFromIndex(((ColorIndex(X) + Offset) % kNumColors + kNumColors) % kNumColors);
}

// -----------------------------------------------------------------------------
// Đường nối ngang N block màu X, cần đúng 1 nước swap để hoàn thành.
//   Hàng 2: các block X trải từ cột 0..N-1, CHỪA cột Gap (2) làm "khe".
//   Trên khe: 1 block X -> swap xuống khe là thành đường nối N block.
//   N = 3 -> không sinh special | N = 4 -> LineClear | N = 5 -> ColorBomb
// Trả về ô chứa block X nằm trên khe (swap nó với ô ngay dưới).
// -----------------------------------------------------------------------------
inline FCell DesignHorizontalRun(FBoard& Board, EColor X, int32 N)
{
	FillCleanBoard(Board);

	const int32 Gap = 2;
	const int32 Row = 2;
	const EColor GapColor = SafeColor(X, 3);
	const EColor Aux1 = SafeColor(X, 1);
	const EColor Aux2 = SafeColor(X, 2);
	const EColor Aux3 = SafeColor(X, 4);
	const EColor Aux4 = SafeColor(X, 5);

	// Hàng 0: xen kẽ 2 màu khác X -> không có run, và chặn run dọc với hàng 2.
	for (int32 C = 0; C <= N + 1 && C < Board.Width(); ++C)
	{
		Board.SetCell(MakeCell(C, 0), FBlock::MakeNormal((C % 2 == 0) ? Aux1 : Aux2));
	}
	// Hàng 3: tương tự để không tạo run dọc 3 ô.
	for (int32 C = 0; C <= N + 1 && C < Board.Width(); ++C)
	{
		Board.SetCell(MakeCell(C, 3), FBlock::MakeNormal((C % 2 == 0) ? Aux2 : Aux1));
	}

	// Hàng 1: hai ô cạnh khe phải khác màu sẽ rơi xuống khe (GapColor).
	Board.SetCell(MakeCell(Gap - 1, 1), FBlock::MakeNormal(Aux1));
	Board.SetCell(MakeCell(Gap + 1, 1), FBlock::MakeNormal(Aux2));
	Board.SetCell(MakeCell(Gap, 1), FBlock::MakeNormal(X));               // block sẽ rơi xuống

	// Hàng 2: đặt block X, chừa khe.
	for (int32 C = 0; C <= N - 1 && C < Board.Width(); ++C)
	{
		if (C == Gap) { continue; }
		Board.SetCell(MakeCell(C, Row), FBlock::MakeNormal(X));
	}
	Board.SetCell(MakeCell(Gap, Row), FBlock::MakeNormal(GapColor));      // ô bị đổi chỗ đi

	// Ô ngay sau đường nối: khác X để run không dài thêm ngoài ý muốn.
	if (N < Board.Width())     { Board.SetCell(MakeCell(N, Row), FBlock::MakeNormal(Aux3)); }
	if (N + 1 < Board.Width()) { Board.SetCell(MakeCell(N + 1, Row), FBlock::MakeNormal(Aux4)); }

	// Quanh khe phía trên: đảm bảo không dính run dọc.
	Board.SetCell(MakeCell(Gap, 0), FBlock::MakeNormal(Aux3));
	Board.SetCell(MakeCell(Gap - 1, 0), FBlock::MakeNormal(Aux4));
	Board.SetCell(MakeCell(Gap + 1, 0), FBlock::MakeNormal(Aux4));

	return MakeCell(Gap, 1);   // swap với MakeCell(Gap, 2)
}

// -----------------------------------------------------------------------------
// Hình chữ L gồm 5 block màu X, độ dài run lớn nhất = 3
//  -> KHÔNG sinh special, nên cả 5 block bị xoá ngay trong bước đầu tiên.
//  Dùng để so sánh "càng nhiều block trigger thì hiệu ứng càng mạnh".
//  Sau swap (3,1) <-> (3,2): hàng 2 có (1,2)(2,2)(3,2) = X X X
//                            cột  3 có (3,2)(3,3)(3,4) = X X X
// -----------------------------------------------------------------------------
inline FCell DesignLShapeFive(FBoard& Board, EColor X)
{
	FillCleanBoard(Board);

	const EColor Swapped = SafeColor(X, 3);
	const EColor Aux1 = SafeColor(X, 1);
	const EColor Aux2 = SafeColor(X, 2);
	const EColor Aux3 = SafeColor(X, 4);
	const EColor Aux4 = SafeColor(X, 5);

	// Nhóm chữ L.
	Board.SetCell(MakeCell(1, 2), FBlock::MakeNormal(X));
	Board.SetCell(MakeCell(2, 2), FBlock::MakeNormal(X));
	Board.SetCell(MakeCell(3, 2), FBlock::MakeNormal(Swapped));   // thành X sau khi swap
	Board.SetCell(MakeCell(3, 3), FBlock::MakeNormal(X));
	Board.SetCell(MakeCell(3, 4), FBlock::MakeNormal(X));
	Board.SetCell(MakeCell(3, 1), FBlock::MakeNormal(X));         // block rơi xuống

	// Chặn match phụ quanh vùng thiết kế.
	Board.SetCell(MakeCell(2, 1), FBlock::MakeNormal(Aux1));
	Board.SetCell(MakeCell(4, 1), FBlock::MakeNormal(Aux2));
	Board.SetCell(MakeCell(3, 0), FBlock::MakeNormal(Aux3));
	Board.SetCell(MakeCell(2, 0), FBlock::MakeNormal(Aux4));
	Board.SetCell(MakeCell(4, 0), FBlock::MakeNormal(Aux4));
	Board.SetCell(MakeCell(4, 2), FBlock::MakeNormal(Aux1));
	Board.SetCell(MakeCell(0, 2), FBlock::MakeNormal(Aux2));
	Board.SetCell(MakeCell(2, 3), FBlock::MakeNormal(Aux2));
	Board.SetCell(MakeCell(4, 3), FBlock::MakeNormal(Aux3));
	Board.SetCell(MakeCell(2, 4), FBlock::MakeNormal(Aux3));
	Board.SetCell(MakeCell(4, 4), FBlock::MakeNormal(Aux2));
	Board.SetCell(MakeCell(3, 5), FBlock::MakeNormal(Aux1));

	return MakeCell(3, 1);   // swap với MakeCell(3, 2)
}

// -----------------------------------------------------------------------------
// Ô vuông 2x2 màu X + 1 vật cản ngay cạnh -> phải bị gỡ khi resolve.
// -----------------------------------------------------------------------------
inline void DesignSquarePlusObstacle(FBoard& Board, EColor X)
{
	FillCleanBoard(Board);
	const EColor Aux1 = SafeColor(X, 1);
	const EColor Aux2 = SafeColor(X, 2);

	Board.SetCell(MakeCell(1, 1), FBlock::MakeNormal(X));
	Board.SetCell(MakeCell(2, 1), FBlock::MakeNormal(X));
	Board.SetCell(MakeCell(1, 2), FBlock::MakeNormal(X));
	Board.SetCell(MakeCell(2, 2), FBlock::MakeNormal(X));

	// Vật cản trong bán kính 1 của ô (2,2).
	Board.SetCell(MakeCell(3, 2), FBlock::MakeObstacle(1));

	// Chặn match phụ quanh ô vuông.
	Board.SetCell(MakeCell(0, 1), FBlock::MakeNormal(Aux1));
	Board.SetCell(MakeCell(3, 1), FBlock::MakeNormal(Aux2));
	Board.SetCell(MakeCell(0, 2), FBlock::MakeNormal(Aux2));
	Board.SetCell(MakeCell(1, 0), FBlock::MakeNormal(Aux2));
	Board.SetCell(MakeCell(2, 0), FBlock::MakeNormal(Aux1));
	Board.SetCell(MakeCell(1, 3), FBlock::MakeNormal(Aux1));
	Board.SetCell(MakeCell(2, 3), FBlock::MakeNormal(Aux2));
}

// Đặt 1 block cầu vồng vào ô chỉ định.
inline FCell PutColorBomb(FBoard& Board, const FCell& Cell, EColor Color = EColor::Red)
{
	Board.SetCell(Cell, FBlock::MakeSpecial(Color, EBlockKind::ColorBomb));
	return Cell;
}

// -----------------------------------------------------------------------------
// Cấu hình trận gọn cho test: không vật cản, không challenge, 4 lượt/turn.
// -----------------------------------------------------------------------------
inline FBattleSetup MakeTestSetup(int32 TeamSize = 4, uint32 Seed = 12345u)
{
	FBattleSetup Setup = FContentLibrary::DefaultBattleSetup(TeamSize, Seed);
	Setup.StartObstacles = 0;
	Setup.Balance.MovesPerTurn = 4;
	Setup.Challenges.clear();
	return Setup;
}

// Đưa cả đội về 30% máu để đo lượng hồi máu chính xác.
inline void LowerTeamHp(FBattle& Battle, float Percent = 0.3f)
{
	for (FCharacterState& M : Battle.Party().Members())
	{
		M.Hp = M.HpMax * Percent;
	}
}

} // namespace M3TestHelpers
