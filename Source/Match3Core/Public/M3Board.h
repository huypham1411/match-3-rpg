// =============================================================================
//  M3Board.h  -  Bàn nối match-3 (dữ liệu thuần, không có hình ảnh)
//  ---------------------------------------------------------------------------
//  Lớp này chỉ giữ trạng thái ô và các thao tác hợp lệ trên bàn:
//    - swap 2 ô, kiểm tra hợp lệ
//    - rơi + sinh block mới (gravity/refill)
//    - đặt/gỡ vật cản (obstacle) mà boss tạo ra
//  Toàn bộ hình ảnh (mesh, material, animation) nằm ở module Match3RPG.
// =============================================================================
#pragma once

#include "M3Types.h"
#include "M3Random.h"

namespace M3
{

class MATCH3CORE_API FBoard
{
public:
	FBoard() = default;
	FBoard(int32 InWidth, int32 InHeight, uint32 Seed, int32 InNumColors = kNumColors);

	// Tạo lại bàn rỗng rồi sinh block ngẫu nhiên (không có match sẵn, luôn có nước đi).
	void Reset(int32 InWidth, int32 InHeight, uint32 Seed, int32 InNumColors = kNumColors);

	// ----- Truy cập -----
	int32 Width() const { return SizeX; }
	int32 Height() const { return SizeY; }
	int32 NumColors() const { return ColorsInPlay; }
	int32 CellCount() const { return SizeX * SizeY; }
	bool  InBounds(int32 X, int32 Y) const { return X >= 0 && Y >= 0 && X < SizeX && Y < SizeY; }
	bool  InBounds(const FCell& C) const { return InBounds(C.X, C.Y); }

	FBlock&       At(int32 X, int32 Y) { return Cells[Index(X, Y)]; }
	const FBlock& At(int32 X, int32 Y) const { return Cells[Index(X, Y)]; }
	FBlock&       At(const FCell& C) { return At(C.X, C.Y); }
	const FBlock& At(const FCell& C) const { return At(C.X, C.Y); }

	FBlock*       TryGet(int32 X, int32 Y) { return InBounds(X, Y) ? &At(X, Y) : nullptr; }
	const FBlock* TryGet(int32 X, int32 Y) const { return InBounds(X, Y) ? &At(X, Y) : nullptr; }
	bool          IsEmptyAt(const FCell& C) const { return InBounds(C) && At(C).IsEmpty(); }
	void          SetCell(const FCell& C, const FBlock& B) { if (InBounds(C)) { At(C) = B; } }
	void          ClearCell(const FCell& C) { SetCell(C, FBlock::MakeEmpty()); }

	const std::vector<FBlock>& RawCells() const { return Cells; }

	// ----- Nước đi -----
	// Hai ô phải kề nhau, không rỗng, không phải vật cản, không bị khoá.
	bool CanSwap(const FCell& A, const FCell& B) const;
	// Swap thô (không kiểm tra) - dùng nội bộ cho thuật toán dò nước đi.
	void SwapCells(const FCell& A, const FCell& B);

	// Dò xem còn nước đi nào tạo được match hay không (bàn "chết" thì phải trộn).
	bool FindAnyPossibleMove(FCell& OutA, FCell& OutB) const;
	bool HasAnyPossibleMove() const;

	// ----- Sinh bàn -----
	void FillRandom();          // sinh block vào mọi ô trống
	void EnsurePlayable();      // tránh match sẵn + đảm bảo có nước đi (tự trộn nếu bí)
	void Shuffle();             // trộn các block đang có (giữ vị trí vật cản)

	// ----- Vật cản -----
	bool PlaceObstacle(const FCell& C, int32 InCharges = 1);  // false nếu ô không hợp lệ
	bool RemoveObstacleAt(const FCell& C);
	std::vector<FCell> ObstacleCells() const;
	int32 ObstacleCount() const;
	// Gỡ ngẫu nhiên N vật cản (kỹ năng của Supporter). Trả về số đã gỡ.
	int32 ClearRandomObstacles(int32 Count);
	// Gỡ vật cản trong bán kính Chebyshev quanh Tâm (match-4 vuông).
	std::vector<FCell> ClearObstaclesInArea(const FCell& Center, int32 Radius);
	// Đặt vật cản ngẫu nhiên lên ô trống (boss hành động). Trả về danh sách đã đặt.
	std::vector<FCell> PlaceRandomObstacles(int32 Count, int32 Charges = 1);
	// Đặt bẫy đếm ngược ngẫu nhiên lên ô trống.
	std::vector<FCell> PlaceRandomTraps(int32 Count, int32 CountdownTurns = 3);
	// Giảm đếm ngược của bẫy qua mỗi turn. Trả về số bẫy bị nổ.
	int32 TickTraps(std::vector<FCell>& OutExploded);
	// Thay thế toàn bộ block cùng màu trên bàn thành Vật cản (khi nhân vật màu đó gục).
	int32 ReplaceColorWithObstacles(EColor Color);

	// ----- Địch tác động bàn (nhiều cách khác nhau) -----
	// Khoá ngẫu nhiên N ô trong TurnsLeft turn (không swap, không rơi). Trả về ô đã khoá.
	std::vector<FCell> LockRandomCells(int32 Count, int32 TurnsLeft = 2);
	// Mở khoá các ô đã hết thời gian; gọi mỗi cuối turn. Trả về số ô vừa được mở.
	int32 TickLocks();
	// Đổi NGẪU NHIÊN màu của N block (phá đường nối người chơi đang chuẩn bị). Trả về số ô đã đổi.
	int32 ScrambleRandomColors(int32 Count);

	// ----- Rơi & sinh mới -----
	// Block rơi xuống theo từng cột; vật cản đứng yên và chặn đường rơi.
	// Ô trống còn lại được sinh block mới ở phía trên. Trả về true nếu bàn có thay đổi.
	bool ApplyGravityAndRefill();

	// ----- Tiện ích -----
	EColor RandomColor();
	uint32 GetSeed() const { return Rng.GetSeed(); }
	int32  Index(int32 X, int32 Y) const { return Y * SizeX + X; }
	FCell  CellFromIndex(int32 InIndex) const { return MakeCell(InIndex % SizeX, InIndex / SizeX); }

	// In bàn thành ký tự (debug + test). '#' = vật cản, '.' = ô trống.
	std::string ToAscii() const;
	// Dựng bàn từ ký tự: R/B/G/Y/P/C = màu, '#' = vật cản, '.' = ô trống.
	static FBoard FromAscii(const std::vector<std::string>& Rows, uint32 Seed = 7u);

private:
	int32 SizeX = 0;
	int32 SizeY = 0;
	int32 ColorsInPlay = kNumColors;
	std::vector<FBlock> Cells;
	FRng  Rng{ 1u };
};

} // namespace M3
