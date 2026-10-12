// =============================================================================
//  M3Matcher.h  -  Dò các đường nối trên bàn (thuần thuật toán, không sửa bàn)
//  ---------------------------------------------------------------------------
//  Luật dò:
//    1. Quét mọi hàng/cột, tìm "run" >= 3 block cùng màu.
//    2. Các run dính nhau (chung ít nhất 1 ô) gộp thành 1 nhóm.
//    3. Quét thêm ô vuông 2x2 cùng màu -> "match-4 vuông".
//    4. Từ độ dài run lớn nhất của nhóm mà quyết định special sinh ra:
//         run >= 5        -> ColorBomb  (đổi chỗ để kích hoạt cả màu)
//         có ô vuông 2x2  -> SquareBomb  (nổ 3x3 + phá vật cản)
//         run == 4        -> LineClear   (nổ cả hàng hoặc cả cột)
//         run == 3        -> không sinh special
// =============================================================================
#pragma once

#include "M3Board.h"
#include "M3Types.h"

namespace M3
{

struct FMatchGroup
{
	std::vector<FCell> Cells;                 // mọi ô thuộc nhóm
	EColor       Color = EColor::None;
	bool         bSquare = false;             // nhóm này chứa ô vuông 2x2
	int32        MaxRunLength = 0;            // độ dài run thẳng dài nhất trong nhóm
	EBlockKind   SpecialKind = EBlockKind::Normal;  // special sẽ sinh ra (Normal = không)
	int32        SpecialVariant = 0;          // LineClear: 0 = clear HÀNG, 1 = clear CỘT
	FCell        SpecialCell;                 // vị trí đặt special
};

struct MATCH3CORE_API FMatchResult
{
	std::vector<FMatchGroup> Groups;
	bool bHasMatch = false;

	// Hợp nhất mọi ô của mọi nhóm (dùng để biết cần xoá những ô nào).
	std::vector<FCell> CollectCells() const;
};

struct MATCH3CORE_API FMatcher
{
	// PreferredCell: ô vừa được người chơi swap tới. Nếu ô đó nằm trong nhóm,
	// special sinh ra sẽ đặt đúng ở đó (giống Candy Crush). Có thể truyền nullptr.
	static FMatchResult FindMatches(const FBoard& Board, const FCell* PreferredCell = nullptr);

	// Kiểm tra nhanh một ô có nằm trong đường nối >= 3 không (dùng khi dò nước đi).
	static bool IsCellInMatch(const FBoard& Board, const FCell& Cell);
};

} // namespace M3
