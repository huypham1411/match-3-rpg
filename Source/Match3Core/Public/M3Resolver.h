// =============================================================================
//  M3Resolver.h  -  Thực thi một nước đi: xoá block, kích special, rơi, lặp lại
//  ---------------------------------------------------------------------------
//  Đây là trái tim của phần match-3. Một "nước đi" gồm nhiều bước (cascade):
//    swap -> tìm match -> xoá (kèm kích hoạt special nằm trong vùng xoá)
//         -> vật cản bị phá -> rơi + sinh mới -> nếu lại có match thì lặp lại
//
//  FResolveOutcome là "hoá đơn" mà lớp combat dùng để tính hiệu ứng nhân vật:
//  bao nhiêu block mỗi màu bị kích hoạt, bao nhiêu vật cản bị gỡ, combo mấy tầng.
// =============================================================================
#pragma once

#include "M3Board.h"
#include "M3Matcher.h"
#include "M3Types.h"

namespace M3
{

// Một bước xoá trong 1 nước đi.
struct FClearStep
{
	int32              Cascade = 1;          // 1 = lần xoá đầu, 2 = sau khi rơi lại nối tiếp...
	std::vector<FCell> ClearedCells;         // ô block bị xoá (không gồm vật cản)
	std::vector<FCell> ClearedObstacles;     // ô vật cản bị phá trong bước này
	std::vector<FCell> SpecialsSpawned;      // ô sinh ra special mới
	std::vector<EBlockKind> SpawnedKinds;
	std::vector<FCell> SpecialsActivated;    // special bị kích hoạt trong bước này
	bool               bFromColorBombSwap = false;
	int32              BlocksInStep = 0;
};

struct FResolveOutcome
{
	bool        bValid = false;                       // nước đi hợp lệ (tạo được match) không
	std::string InvalidReason;

	std::vector<FClearStep> Steps;

	int32 CascadeCount          = 0;    // số tầng combo
	int32 TotalBlocksCleared    = 0;    // tổng block bị xoá (không tính vật cản)
	int32 TotalObstaclesCleared = 0;    // tổng vật cản bị gỡ
	int32 MaxBlocksInStep       = 0;    // bước nhiều block nhất -> cơ sở tính sát thương
	int32 MaxBlocksSameColor    = 0;    // nhiều block CÙNG MÀU nhất trong 1 bước
	EColor MaxColor             = EColor::None;

	// Số block bị xoá theo từng màu trong cả nước đi -> "số block trigger" của mỗi nhân vật.
	int32 ClearedByColor[kNumColors] = { 0, 0, 0, 0, 0, 0 };

	// Số lần "match-4" (ô vuông 2x2 hoặc hàng/cột 4) -> nạp stack cho Deflecter.
	int32 FourMatchEvents  = 0;
	int32 ColorBombSwaps   = 0;    // số lần đổi chỗ block cầu vồng
	bool  bAnyMatch        = false;

	int32 BlocksOfColor(EColor C) const
	{
		const int32 Idx = ColorIndex(C);
		return (Idx >= 0) ? ClearedByColor[Idx] : 0;
	}
};

class MATCH3CORE_API FResolver
{
public:
	explicit FResolver(FBoard& InBoard) : Board(InBoard) {}

	// Đổi chỗ 2 ô rồi giải toàn bộ match. Nếu nước đi KHÔNG tạo được match và
	// không liên quan tới block cầu vồng, bàn sẽ được trả về trạng thái cũ và
	// outcome.bValid = false.
	FResolveOutcome ResolveSwap(const FCell& A, const FCell& B);

	// Giải bàn khi đang có match sẵn (ví dụ sau khi boss đặt vật cản hoặc kỹ năng
	// làm thay đổi bàn). Không swap gì cả.
	FResolveOutcome ResolveExisting();

	// Xoá thủ công một danh sách ô (kỹ năng / skill của nhân vật).
	FResolveOutcome ResolveManualClear(const std::vector<FCell>& CellsToClear, const std::string& Reason);

private:
	// Đổi chỗ có liên quan tới block cầu vồng: kích hoạt toàn bộ block cùng màu
	// với block bị đổi chỗ (không cần tạo thành đường nối 3).
	FResolveOutcome ResolveSwap_ColorBombKick(const FCell& A, const FCell& B, const FBlock& BeforeA, const FBlock& BeforeB);

	// Vòng lặp chính: xoá -> rơi -> lặp cho đến khi bàn hết match.
	FResolveOutcome ResolveLoopInternal(const FCell* PreferredCell, bool bKickWithColorBomb,
	                                    const FCell& BombCell, const FCell& TargetCell);

	FBoard& Board;
};

} // namespace M3
