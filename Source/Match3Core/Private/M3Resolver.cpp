// =============================================================================
//  M3Resolver.cpp  -  Cài đặt vòng lặp xoá / kích special / rơi / cascade
// =============================================================================
#include "M3Resolver.h"

namespace M3
{
namespace
{
// Yêu cầu sinh special sau khi xoá (do một nhóm match quyết định).
struct FSpawnRequest
{
	FCell      Cell;
	EBlockKind Kind = EBlockKind::Normal;
	EColor     Color = EColor::None;
	int32      Variant = 0;
	int32      RunLength = 3;
	// Các ô của nhóm match sinh ra special này (dùng để quét vật cản quanh cả nhóm).
	std::vector<FCell> GroupCells;
};

void AddUnique(std::vector<FCell>& Vec, const FCell& C)
{
	if (std::find(Vec.begin(), Vec.end(), C) == Vec.end()) { Vec.push_back(C); }
}

bool HasCell(const std::vector<FCell>& Vec, const FCell& C)
{
	return std::find(Vec.begin(), Vec.end(), C) != Vec.end();
}

void RemoveCell(std::vector<FCell>& Vec, const FCell& C)
{
	Vec.erase(std::remove(Vec.begin(), Vec.end(), C), Vec.end());
}

// Màu xuất hiện nhiều nhất trong tập ô (dùng khi block cầu vồng bị cuốn vào vùng xoá).
EColor DominantColor(const FBoard& Board, const std::vector<FCell>& Cells)
{
	int32 Count[kNumColors] = { 0, 0, 0, 0, 0, 0 };
	for (const FCell& C : Cells)
	{
		if (!Board.InBounds(C)) { continue; }
		const int32 Idx = ColorIndex(Board.At(C).Color);
		if (Idx >= 0) { Count[Idx] += 1; }
	}
	int32 Best = -1;
	EColor BestColor = EColor::None;
	for (int32 i = 0; i < kNumColors; ++i)
	{
		if (Count[i] > Best)
		{
			Best = Count[i];
			BestColor = ColorFromIndex(i);
		}
	}
	return BestColor;
}

// Mở rộng tập ô cần xoá: nếu trong tập có special thì special đó kéo theo vùng của nó.
// Chạy đệ quy để bắt được dây chuyền special-kích-special.
void ExpandWithSpecials(const FBoard& Board, std::vector<FCell>& InOutCells, std::vector<FCell>& OutActivated, int32 Depth)
{
	if (Depth > 4) { return; }

	const std::vector<FCell> Snapshot = InOutCells;
	for (const FCell& C : Snapshot)
	{
		if (!Board.InBounds(C) || HasCell(OutActivated, C)) { continue; }

		const FBlock& B = Board.At(C);
		if (!B.IsSpecial()) { continue; }

		OutActivated.push_back(C);

		switch (B.Kind)
		{
		case EBlockKind::LineClear:
			if (B.Variant == 0)
			{
				for (int32 X = 0; X < Board.Width(); ++X) { AddUnique(InOutCells, MakeCell(X, C.Y)); }
			}
			else
			{
				for (int32 Y = 0; Y < Board.Height(); ++Y) { AddUnique(InOutCells, MakeCell(C.X, Y)); }
			}
			break;

		case EBlockKind::SquareBomb:
		{
			// Tự động tìm 1 vật cản / bẫy ngẫu nhiên trên bàn để nhắm bắn phá hủy!
			std::vector<FCell> Targets;
			for (int32 Y = 0; Y < Board.Height(); ++Y)
			{
				for (int32 X = 0; X < Board.Width(); ++X)
				{
					if (Board.At(X, Y).IsObstacle() || Board.At(X, Y).IsCountTrap())
					{
						Targets.push_back(MakeCell(X, Y));
					}
				}
			}
			if (!Targets.empty())
			{
				AddUnique(InOutCells, Targets[0]);
			}
			// Nổ xung quanh vị trí xuất phát
			for (int32 dy = -1; dy <= 1; ++dy)
			{
				for (int32 dx = -1; dx <= 1; ++dx)
				{
					const FCell N = MakeCell(C.X + dx, C.Y + dy);
					if (Board.InBounds(N)) { AddUnique(InOutCells, N); }
				}
			}
			break;
		}

		case EBlockKind::AreaBomb:
		{
			// Bom nổ diện rộng 3x3 xung quanh tâm bom
			for (int32 dy = -1; dy <= 1; ++dy)
			{
				for (int32 dx = -1; dx <= 1; ++dx)
				{
					const FCell N = MakeCell(C.X + dx, C.Y + dy);
					if (Board.InBounds(N)) { AddUnique(InOutCells, N); }
				}
			}
			break;
		}


		case EBlockKind::ColorBomb:
		{
			// Cầu vồng bị cuốn vào vùng xoá: kéo theo toàn bộ màu chủ đạo của vùng đó.
			const EColor Target = DominantColor(Board, InOutCells);
			if (Target != EColor::None)
			{
				for (int32 Y = 0; Y < Board.Height(); ++Y)
				{
					for (int32 X = 0; X < Board.Width(); ++X)
					{
						if (Board.At(X, Y).Color == Target && !Board.At(X, Y).IsObstacle())
						{
							AddUnique(InOutCells, MakeCell(X, Y));
						}
					}
				}
			}
			break;
		}

		default: break;
		}
	}

	// Nếu vùng vừa phình ra và có thêm special mới -> đệ quy tiếp.
	if (InOutCells.size() != Snapshot.size()) { ExpandWithSpecials(Board, InOutCells, OutActivated, Depth + 1); }
}

// -----------------------------------------------------------------------------
// Thực thi 1 bước xoá: tách block/vật cản, xoá, đếm theo màu, sinh special, rơi.
// -----------------------------------------------------------------------------
void RunClearStep(FBoard& Board, FResolveOutcome& Outcome, int32 CascadeIndex,
                  std::vector<FCell> ToClear, const std::vector<FSpawnRequest>& Spawns,
                  bool bFromColorBombSwap)
{
	FClearStep Step;
	Step.Cascade = CascadeIndex;
	Step.bFromColorBombSwap = bFromColorBombSwap;

	// 1) Kích hoạt dây chuyền special nằm trong vùng xoá.
	ExpandWithSpecials(Board, ToClear, Step.SpecialsActivated, 0);

	// 2) Ô đặt special mới KHÔNG bị xoá (giống Candy Crush: block biến thành special).
	// Nhưng block đó thuộc tổ hợp match vừa tạo, nên vẫn tính điểm/màu cho combo đó.
	int32 ColorCount[kNumColors] = { 0, 0, 0, 0, 0, 0 };
	for (const FSpawnRequest& S : Spawns)
	{
		const int32 Idx = ColorIndex(S.Color);
		if (Idx >= 0)
		{
			ColorCount[Idx] += 1;
			Outcome.ClearedByColor[Idx] += 1;
		}
		Step.BlocksInStep += 1;
		RemoveCell(ToClear, S.Cell);
	}

	// 3) Tách: block thì xoá, vật cản thì chỉ mất 1 lớp.
	std::vector<FCell> BlockCells;
	std::vector<FCell> ObstacleHits;
	for (const FCell& C : ToClear)
	{
		if (!Board.InBounds(C)) { continue; }
		const FBlock& B = Board.At(C);
		if (B.IsObstacle()) { ObstacleHits.push_back(C); }
		else if (!B.IsEmpty()) { BlockCells.push_back(C); }
	}

	// 4) Xoá block + đếm theo màu (đây là "số block trigger" của từng nhân vật).
	for (const FCell& C : BlockCells)
	{
		const FBlock B = Board.At(C);
		const int32 Idx = ColorIndex(B.Color);
		if (Idx >= 0)
		{
			ColorCount[Idx] += 1;
			Outcome.ClearedByColor[Idx] += 1;
		}
		Board.At(C) = FBlock::MakeEmpty();
		Step.ClearedCells.push_back(C);
		Step.BlocksInStep += 1;
	}

	// 5) Phá vật cản trong vùng ảnh hưởng (mỗi lần trúng -1 charge).
	for (const FCell& C : ObstacleHits)
	{
		Board.At(C).Charges -= 1;
		if (Board.At(C).Charges <= 0)
		{
			Board.At(C) = FBlock::MakeEmpty();
			Step.ClearedObstacles.push_back(C);
		}
	}

	// 6) Sinh special mới vào đúng ô đã chọn.
	for (const FSpawnRequest& S : Spawns)
	{
		if (!Board.InBounds(S.Cell)) { continue; }
		// LineClear cần biết hướng: run 4 ngang -> nổ ngang, run 4 dọc -> nổ dọc.
		Board.SetCell(S.Cell, FBlock::MakeSpecial(S.Color, S.Kind, S.Variant));
		Step.SpecialsSpawned.push_back(S.Cell);
		Step.SpawnedKinds.push_back(S.Kind);
	}

	// 7) Cập nhật thống kê của cả nước đi.
	Outcome.TotalBlocksCleared += Step.BlocksInStep;
	Outcome.TotalObstaclesCleared += static_cast<int32>(Step.ClearedObstacles.size());
	Outcome.MaxBlocksInStep = std::max(Outcome.MaxBlocksInStep, Step.BlocksInStep);
	if (Step.BlocksInStep > 0) { Outcome.bAnyMatch = true; }
	for (int32 i = 0; i < kNumColors; ++i)
	{
		if (ColorCount[i] > Outcome.MaxBlocksSameColor)
		{
			Outcome.MaxBlocksSameColor = ColorCount[i];
			Outcome.MaxColor = ColorFromIndex(i);
		}
	}

	Outcome.Steps.push_back(Step);

	// 8) Rơi + sinh block mới cho lượt kế tiếp.
	Board.ApplyGravityAndRefill();
	Outcome.CascadeCount = CascadeIndex;
}

// Tìm nhóm match và biến nó thành (danh sách ô cần xoá) + (danh sách special cần sinh).
void BuildMatchClear(const FBoard& Board, const FMatchResult& Match, std::vector<FCell>& OutToClear,
                     std::vector<FSpawnRequest>& OutSpawns, FResolveOutcome& InOutOutcome)
{
	for (const FMatchGroup& G : Match.Groups)
	{
		for (const FCell& C : G.Cells) { AddUnique(OutToClear, C); }

		// match-4 (ô vuông hoặc hàng/cột 4) -> nạp stack cho Deflecter.
		if (G.MaxRunLength >= 4 || G.bSquare) { InOutOutcome.FourMatchEvents += 1; }

		if (G.SpecialKind == EBlockKind::Normal) { continue; }

		FSpawnRequest S;
		S.Cell = G.SpecialCell;
		S.Kind = G.SpecialKind;
		S.Color = G.Color;
		S.RunLength = G.MaxRunLength;
		S.GroupCells = G.Cells;

		if (G.SpecialKind == EBlockKind::LineClear)
		{
			S.Variant = G.SpecialVariant;
		}

		OutSpawns.push_back(S);
	}
}
} // namespace

// -----------------------------------------------------------------------------
// API công khai
// -----------------------------------------------------------------------------
FResolveOutcome FResolver::ResolveSwap_ColorBombKick(const FCell& A, const FCell& B, const FBlock& BeforeA, const FBlock& BeforeB)
{
	// Sau khi swap: block trước ở A giờ nằm ở B và ngược lại.
	FCell BombCell = A;
	FCell TargetCell = B;
	if (BeforeA.Kind == EBlockKind::ColorBomb)
	{
		BombCell = B;
		TargetCell = A;
	}
	(void)BeforeB;
	return ResolveLoopInternal(nullptr, true, BombCell, TargetCell);
}

FResolveOutcome FResolver::ResolveLoopInternal(const FCell* PreferredCell, bool bKickWithColorBomb,
                                               const FCell& BombCell, const FCell& TargetCell,
                                               const std::vector<FCell>* KickSpecialCells)
{
	FResolveOutcome Outcome;
	Outcome.bValid = true;

	// Giới hạn an toàn: nếu logic có bug thì vòng lặp vẫn dừng ở đây.
	const int32 MaxCascade = 64;

	for (int32 Cascade = 1; Cascade <= MaxCascade; ++Cascade)
	{
		std::vector<FCell> ToClear;
		std::vector<FSpawnRequest> Spawns;
		bool bColorBombStep = false;

		if (Cascade == 1 && bKickWithColorBomb)
		{
			// --- Bước mở màn: đổi chỗ block cầu vồng ---------------
			// Xoá cầu vồng + toàn bộ block cùng màu với block đem đi đổi chỗ.
			bColorBombStep = true;
			Outcome.ColorBombSwaps += 1;
			AddUnique(ToClear, BombCell);

			const bool bBothBombs = Board.InBounds(TargetCell) && Board.At(TargetCell).Kind == EBlockKind::ColorBomb;
			const EColor Target = Board.InBounds(TargetCell) ? Board.At(TargetCell).Color : EColor::None;

			for (int32 Y = 0; Y < Board.Height(); ++Y)
			{
				for (int32 X = 0; X < Board.Width(); ++X)
				{
					const FBlock& Bl = Board.At(X, Y);
					if (Bl.IsObstacle() || Bl.IsEmpty()) { continue; }

					// Hai block cầu vồng đổi chỗ nhau -> xoá cả bàn (rất hiếm, rất mạnh).
					const bool bHit = bBothBombs || (Target != EColor::None && Bl.Color == Target);
					if (bHit) { AddUnique(ToClear, MakeCell(X, Y)); }
				}
			}
		}
		else if (Cascade == 1 && KickSpecialCells && !KickSpecialCells->empty())
		{
			// --- Kích hoạt tự do block đặc biệt (Line/Square/Area bomb) ---
			for (const FCell& C : *KickSpecialCells)
			{
				if (Board.InBounds(C)) { AddUnique(ToClear, C); }
			}
			// Đồng thời gom cả các match thông thường khác nếu nước đi vừa tạo ra match!
			const FMatchResult Match = FMatcher::FindMatches(Board);
			if (Match.bHasMatch)
			{
				BuildMatchClear(Board, Match, ToClear, Spawns, Outcome);
			}
		}
		else
		{
			// --- Các bước còn lại: tìm match bình thường ------------
			const FMatchResult Match = FMatcher::FindMatches(Board, (Cascade == 1) ? PreferredCell : nullptr);
			if (!Match.bHasMatch) { break; }

			BuildMatchClear(Board, Match, ToClear, Spawns, Outcome);

			// Match-4 ô vuông: TỰ ĐỘNG phá vật cản quanh ô đó ngay khi vừa tạo.
			for (const FSpawnRequest& S : Spawns)
			{
				if (S.Kind != EBlockKind::SquareBomb) { continue; }

				// Quét cả ô đặt special LẪN mọi ô của khối vuông, để vật cản nằm
				// ở bất kỳ cạnh nào của khối 2x2 cũng bị phá.
				std::vector<FCell> BlastCenters;
				AddUnique(BlastCenters, S.Cell);
				for (const FCell& C : S.GroupCells) { AddUnique(BlastCenters, C); }

				for (const FCell& Center : BlastCenters)
				{
					for (int32 dy = -1; dy <= 1; ++dy)
					{
						for (int32 dx = -1; dx <= 1; ++dx)
						{
							const FCell N = MakeCell(Center.X + dx, Center.Y + dy);
							if (Board.InBounds(N) && Board.At(N).IsObstacle()) { AddUnique(ToClear, N); }
						}
					}
				}
			}

			if (ToClear.empty() && Spawns.empty()) { break; }
		}

		RunClearStep(Board, Outcome, Cascade, ToClear, Spawns, bColorBombStep);
	}

	return Outcome;
}

FResolveOutcome FResolver::ResolveSwap(const FCell& A, const FCell& B)
{
	FResolveOutcome Outcome;

	if (!Board.CanSwap(A, B))
	{
		Outcome.bValid = false;
		Outcome.InvalidReason = "Hai ô không hợp lệ để đổi chỗ (vật cản / ô trống / block khoá / không kề nhau).";
		return Outcome;
	}

	const FBlock BeforeA = Board.At(A);
	const FBlock BeforeB = Board.At(B);

	Board.SwapCells(A, B);

	// --- Trường hợp đặc biệt: đổi chỗ với block cầu vồng ---
	// Kích hoạt TOÀN BỘ block cùng màu với block đem đi đổi chỗ (đúng thiết kế match-5).
	const bool bABomb = (BeforeA.Kind == EBlockKind::ColorBomb);
	const bool bBBomb = (BeforeB.Kind == EBlockKind::ColorBomb);
	if (bABomb || bBBomb)
	{
		return ResolveSwap_ColorBombKick(A, B, BeforeA, BeforeB);
	}

	const bool bASpecial = BeforeA.IsSpecial();
	const bool bBSpecial = BeforeB.IsSpecial();

	// --- Đổi chỗ có chứa block đặc biệt (LineClear, SquareBomb, AreaBomb) ---
	if (bASpecial || bBSpecial)
	{
		// Người chơi di chuyển tự do block đặc biệt để kích hoạt hiệu ứng ngay!
		// Sau swap: BeforeA giờ ở B, BeforeB giờ ở A.
		std::vector<FCell> TriggerCells;
		if (bASpecial)
		{
			TriggerCells.push_back(B);
		}
		if (bBSpecial)
		{
			TriggerCells.push_back(A);
		}
		return ResolveLoopInternal(nullptr, false, FCell(), FCell(), &TriggerCells);
	}

	// --- Nước đi thường: phải tạo ra match thì mới hợp lệ ---
	const FMatchResult Probe = FMatcher::FindMatches(Board);
	if (!Probe.bHasMatch)
	{
		Board.SwapCells(A, B);   // trả bàn về như cũ
		Outcome.bValid = false;
		Outcome.InvalidReason = "Nước đi không tạo được đường nối nào.";
		return Outcome;
	}

	// Ưu tiên đặt special ở ô mà block vừa "đi tới" (cảm giác giống Candy Crush).
	const std::vector<FCell> ProbeCells = Probe.CollectCells();
	const FCell* Preferred = HasCell(ProbeCells, B) ? &B : &A;

	return ResolveLoopInternal(Preferred, false, A, B);
}

FResolveOutcome FResolver::ResolveActivateSpecial(const FCell& C)
{
	FResolveOutcome Outcome;
	if (!Board.InBounds(C) || !Board.At(C).IsSpecial())
	{
		Outcome.bValid = false;
		Outcome.InvalidReason = "Ô này không phải là block đặc biệt để kích hoạt.";
		return Outcome;
	}

	std::vector<FCell> KickCells = { C };
	return ResolveLoopInternal(nullptr, false, FCell(), FCell(), &KickCells);
}

FResolveOutcome FResolver::ResolveExisting()
{
	return ResolveLoopInternal(nullptr, false, FCell(), FCell());
}


FResolveOutcome FResolver::ResolveManualClear(const std::vector<FCell>& CellsToClear, const std::string& Reason)
{
	FResolveOutcome Outcome;
	Outcome.bValid = true;

	// Bước 1: xoá đúng những ô được yêu cầu (kỹ năng), không sinh special.
	std::vector<FCell> ToClear = CellsToClear;
	RunClearStep(Board, Outcome, 1, ToClear, std::vector<FSpawnRequest>(), false);
	Outcome.InvalidReason = Reason;

	// Bước 2: bàn vừa thay đổi, có thể phát sinh match mới -> chạy tiếp cascade.
	FResolveOutcome CascadeOutcome = ResolveLoopInternal(nullptr, false, FCell(), FCell());
	CascadeOutcome.bValid = true;
	// Gộp kết quả cascade vào kết quả trả về.
	for (const FClearStep& S : CascadeOutcome.Steps) { Outcome.Steps.push_back(S); }
	for (int32 i = 0; i < kNumColors; ++i) { Outcome.ClearedByColor[i] += CascadeOutcome.ClearedByColor[i]; }
	Outcome.TotalBlocksCleared    += CascadeOutcome.TotalBlocksCleared;
	Outcome.TotalObstaclesCleared += CascadeOutcome.TotalObstaclesCleared;
	Outcome.MaxBlocksInStep        = std::max(Outcome.MaxBlocksInStep, CascadeOutcome.MaxBlocksInStep);
	Outcome.FourMatchEvents       += CascadeOutcome.FourMatchEvents;
	Outcome.bAnyMatch              = Outcome.bAnyMatch || CascadeOutcome.bAnyMatch;
	Outcome.CascadeCount           = Outcome.CascadeCount + CascadeOutcome.CascadeCount;
	if (CascadeOutcome.MaxBlocksSameColor > Outcome.MaxBlocksSameColor)
	{
		Outcome.MaxBlocksSameColor = CascadeOutcome.MaxBlocksSameColor;
		Outcome.MaxColor = CascadeOutcome.MaxColor;
	}
	// Đánh số lại các bước cho liền mạch (bước kỹ năng là 1, cascade nối tiếp sau đó).
	for (int32 i = 0; i < static_cast<int32>(Outcome.Steps.size()); ++i)
	{
		Outcome.Steps[static_cast<size_t>(i)].Cascade = i + 1;
	}
	Outcome.CascadeCount = static_cast<int32>(Outcome.Steps.size());
	return Outcome;
}

} // namespace M3
