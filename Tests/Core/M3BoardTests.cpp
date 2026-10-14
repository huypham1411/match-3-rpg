// =============================================================================
//  M3BoardTests.cpp  -  Test bàn nối, dò match, special, rơi, vật cản
// =============================================================================
#include "M3TestFramework.h"
#include "M3TestHelpers.h"

using namespace M3;
using namespace M3TestHelpers;

// -----------------------------------------------------------------------------
M3TEST(BanKhoiTao_KhongCoMatchSan_VaLuonCoNuocDi)
{
	FBoard Board(8, 8, 111u, 6);

	M3REQUIRE(!FMatcher::FindMatches(Board).bHasMatch);
	M3REQUIRE(Board.HasAnyPossibleMove());
	M3REQUIRE_EQ(Board.ObstacleCount(), 0);
}

// -----------------------------------------------------------------------------
M3TEST(NuocDiKhongTaoMatch_ThiBiTuChoi_VaBanGiuNguyen)
{
	FBoard Board(8, 8, 222u, 6);
	FillCleanBoard(Board);

	const std::string Before = Board.ToAscii();
	FResolver Resolver(Board);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(MakeCell(0, 0), MakeCell(1, 0));

	M3REQUIRE(!Outcome.bValid);
	M3REQUIRE_EQ(Board.ToAscii(), Before);   // bàn phải được trả về y như cũ
}

// -----------------------------------------------------------------------------
M3TEST(DoMatch_Ngang3O_Va_Doc3O)
{
	FBoard Board = FBoard::FromAscii({
		"RRR.....",
		"........",
		"........",
		"........"
	});

	const FMatchResult Result = FMatcher::FindMatches(Board);
	M3REQUIRE(Result.bHasMatch);
	M3REQUIRE_EQ(static_cast<int32>(Result.Groups.size()), 1);
	M3REQUIRE_EQ(static_cast<int32>(Result.Groups[0].Cells.size()), 3);
	M3REQUIRE_EQ(Result.Groups[0].MaxRunLength, 3);
	M3REQUIRE(Result.Groups[0].SpecialKind == EBlockKind::Normal);   // run 3: không sinh special
}

// -----------------------------------------------------------------------------
M3TEST(Match4Ngang_SinhBlockNoHangHoacCot)
{
	FBoard Board = FBoard::FromAscii({
		"RRRR....",
		"........",
		"........"
	});
	const FMatchResult Result = FMatcher::FindMatches(Board);
	M3REQUIRE(Result.bHasMatch);
	M3REQUIRE(Result.Groups[0].SpecialKind == EBlockKind::LineClear);
}

// -----------------------------------------------------------------------------
M3TEST(Match4Vuong_SinhBlockNoVuong)
{
	FBoard Board = FBoard::FromAscii({
		"RR......",
		"RR......",
		"........"
	});
	const FMatchResult Result = FMatcher::FindMatches(Board);
	M3REQUIRE(Result.bHasMatch);
	M3REQUIRE(Result.Groups[0].bSquare);
	M3REQUIRE(Result.Groups[0].SpecialKind == EBlockKind::SquareBomb);
}

// -----------------------------------------------------------------------------
M3TEST(Match5Ngang_SinhBlockCauVong)
{
	FBoard Board = FBoard::FromAscii({
		"RRRRR...",
		"........",
		"........"
	});
	const FMatchResult Result = FMatcher::FindMatches(Board);
	M3REQUIRE(Result.bHasMatch);
	M3REQUIRE(Result.Groups[0].SpecialKind == EBlockKind::ColorBomb);
	M3REQUIRE_EQ(Result.Groups[0].MaxRunLength, 5);
}

// -----------------------------------------------------------------------------
M3TEST(XoaRun3_DemDungSoBlockTheoMau)
{
	FBoard Board(8, 8, 333u, 6);
	const FCell A = DesignHorizontalRun(Board, EColor::Red, 3);

	FResolver Resolver(Board);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(A, MakeCell(A.X, A.Y + 1));

	M3REQUIRE(Outcome.bValid);
	M3REQUIRE_EQ(Outcome.Steps[0].BlocksInStep, 3);        // bước đầu xoá đúng 3 block
	M3REQUIRE(Outcome.BlocksOfColor(EColor::Red) >= 3);
	M3REQUIRE_EQ(Outcome.ColorBombSwaps, 0);
}

// -----------------------------------------------------------------------------
M3TEST(Match4Vuong_TuDongGoVatCan)
{
	FBoard Board(8, 8, 444u, 6);
	DesignSquarePlusObstacle(Board, EColor::Red);
	M3REQUIRE_EQ(Board.ObstacleCount(), 1);

	FResolver Resolver(Board);
	const FResolveOutcome Outcome = Resolver.ResolveExisting();

	M3REQUIRE(Outcome.bValid);
	M3REQUIRE_GT(Outcome.TotalObstaclesCleared, 0);              // vật cản bị gỡ
	M3REQUIRE(!Board.At(3, 2).IsObstacle());

	// Phải sinh một block nổ vuông để dùng cho các nước sau.
	bool bSpawnedBomb = false;
	for (const EBlockKind Kind : Outcome.Steps[0].SpawnedKinds)
	{
		if (Kind == EBlockKind::SquareBomb) { bSpawnedBomb = true; }
	}
	M3REQUIRE(bSpawnedBomb);
}

// -----------------------------------------------------------------------------
M3TEST(BlockCauVong_DoiCho_KichHoatToanBoMauDoiUng)
{
	FBoard Board(8, 8, 555u, 6);
	FillCleanBoard(Board);

	// Đếm số block màu Xanh lá có trên bàn trước khi kích bom.
	int32 GreenCount = 0;
	for (int32 Y = 0; Y < Board.Height(); ++Y)
	{
		for (int32 X = 0; X < Board.Width(); ++X)
		{
			if (Board.At(X, Y).Color == EColor::Green) { ++GreenCount; }
		}
	}
	M3REQUIRE_GT(GreenCount, 3);

	const FCell BombCell = PutColorBomb(Board, MakeCell(0, 0), EColor::Red);
	const FCell PartnerCell = MakeCell(0, 1);   // màu Xanh lá nhờ nền pattern

	FResolver Resolver(Board);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(BombCell, PartnerCell);

	M3REQUIRE(Outcome.bValid);
	M3REQUIRE_EQ(Outcome.ColorBombSwaps, 1);
	M3REQUIRE(Outcome.BlocksOfColor(EColor::Green) >= GreenCount);   // kích hoạt cả màu đó
	M3REQUIRE(Outcome.bAnyMatch);
}

// -----------------------------------------------------------------------------
M3TEST(RoiVaSinhMoi_BanLuonDay_VatCanDungYen)
{
	FBoard Board(8, 8, 666u, 6);
	FillCleanBoard(Board);
	Board.SetCell(MakeCell(2, 5), FBlock::MakeObstacle(2));

	// Đục vài ô để mô phỏng vừa bị xoá.
	Board.ClearCell(MakeCell(0, 7));
	Board.ClearCell(MakeCell(2, 7));
	Board.ClearCell(MakeCell(2, 4));

	const int32 ObstaclesBefore = Board.ObstacleCount();
	Board.ApplyGravityAndRefill();

	// Không còn ô trống.
	for (int32 Y = 0; Y < Board.Height(); ++Y)
	{
		for (int32 X = 0; X < Board.Width(); ++X)
		{
			M3REQUIRE(!Board.At(X, Y).IsEmpty());
		}
	}

	// Vật cản vẫn nguyên vị trí và số charge.
	M3REQUIRE_EQ(Board.ObstacleCount(), ObstaclesBefore);
	M3REQUIRE(Board.At(2, 5).IsObstacle());
	M3REQUIRE_EQ(Board.At(2, 5).Charges, 2);
}

// -----------------------------------------------------------------------------
M3TEST(TronBan_GiuVatCan_VaVanConNuocDi)
{
	FBoard Board(8, 8, 777u, 6);
	Board.SetCell(MakeCell(4, 4), FBlock::MakeObstacle(1));
	Board.SetCell(MakeCell(0, 0), FBlock::MakeObstacle(1));

	Board.Shuffle();
	Board.EnsurePlayable();

	M3REQUIRE_EQ(Board.ObstacleCount(), 2);
	M3REQUIRE(Board.At(4, 4).IsObstacle());
	M3REQUIRE(!FMatcher::FindMatches(Board).bHasMatch);
	M3REQUIRE(Board.HasAnyPossibleMove());
}

// -----------------------------------------------------------------------------
// Stress test: chơi 300 nước ngẫu nhiên trên bàn, không được kẹt / treo / lỗi.
M3TEST(Choi300NuocNgauNhien_KhongKetBan)
{
	FBoard Board(8, 8, 888u, 6);
	FResolver Resolver(Board);
	Board.PlaceRandomObstacles(3, 1);

	int32 PlayedMoves = 0;
	int32 TotalCleared = 0;
	int32 TotalObstacles = 0;

	for (int32 Step = 0; Step < 300; ++Step)
	{
		FCell A, B;
		if (!Board.FindAnyPossibleMove(A, B))
		{
			Board.Shuffle();
			Board.EnsurePlayable();
			continue;
		}

		const FResolveOutcome Outcome = Resolver.ResolveSwap(A, B);
		M3REQUIRE(Outcome.bValid);
		M3REQUIRE_GT(Outcome.TotalBlocksCleared, 0);
		M3REQUIRE(Outcome.CascadeCount >= 1);
		M3REQUIRE(Outcome.CascadeCount <= 64);

		TotalCleared += Outcome.TotalBlocksCleared;
		TotalObstacles += Outcome.TotalObstaclesCleared;
		++PlayedMoves;

		// Bàn phải luôn đầy block (trừ ô vật cản).
		for (int32 Y = 0; Y < Board.Height(); ++Y)
		{
			for (int32 X = 0; X < Board.Width(); ++X)
			{
				M3REQUIRE(!Board.At(X, Y).IsEmpty());
			}
		}
	}

	std::cout << "        (da choi " << PlayedMoves << " nuoc, xoa " << TotalCleared
		<< " block, go " << TotalObstacles << " vat can)\n";
	M3REQUIRE_GT(PlayedMoves, 250);
}

// -----------------------------------------------------------------------------
// Test cascade: khi match 1 làm block phía trên rơi xuống và tạo match 2,
// CascadeCount phải tăng thành 2 (hoặc cao hơn) và ghi nhận đúng số bước.
M3TEST(CascadeCombo_KhiBlockRoiTaoMatchMoi_TangCascadeCountVaMultiplier)
{
	FBoard Board = FBoard::FromAscii({
		"GRPG",
		"GYGP",
		"YBPY",
		"RBRR",
		"YPGY"
	}, 12345u);

	M3REQUIRE(!FMatcher::FindMatches(Board).bHasMatch);

	// Đặt ô (2,4) là B để khi swap (1,4) với (2,4), Cột 1 tại Y=2,3,4 thành B, B, B (Cascade 1).
	Board.SetCell(MakeCell(2, 4), FBlock::MakeNormal(EColor::Blue));

	FResolver Resolver(Board);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(MakeCell(1, 4), MakeCell(2, 4));

	M3REQUIRE(Outcome.bValid);
	M3REQUIRE(Outcome.CascadeCount >= 2);
	M3REQUIRE(Outcome.Steps.size() >= 2);
	M3REQUIRE(Outcome.bAnyMatch);
}

// -----------------------------------------------------------------------------
M3TEST(Match5KhongThangHang_SinhBomKhoiAreaBomb)
{
	FBoard Board = FBoard::FromAscii({
		"RRR.....",
		"R.......",
		"R.......",
		"........"
	});
	const FMatchResult Result = FMatcher::FindMatches(Board);
	M3REQUIRE(Result.bHasMatch);
	M3REQUIRE_EQ(static_cast<int32>(Result.Groups.size()), 1);
	M3REQUIRE_EQ(static_cast<int32>(Result.Groups[0].Cells.size()), 5);
	M3REQUIRE_EQ(Result.Groups[0].SpecialKind, EBlockKind::AreaBomb);
}

// -----------------------------------------------------------------------------
M3TEST(BlockDacBiet_DiChuyenTuDoKhongCanMatchMau)
{
	FBoard Board(8, 8, 9999u, 6);
	FillCleanBoard(Board);

	// Đặt 1 block LineClear tại (2, 2)
	Board.SetCell(MakeCell(2, 2), FBlock::MakeSpecial(EColor::Red, EBlockKind::LineClear, 0));

	FResolver Resolver(Board);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(MakeCell(2, 2), MakeCell(2, 3));

	M3REQUIRE(Outcome.bValid);
	M3REQUIRE_GT(Outcome.TotalBlocksCleared, 0);
	M3REQUIRE(Outcome.Steps.size() >= 1);
	M3REQUIRE_GT(static_cast<int32>(Outcome.Steps[0].SpecialsActivated.size()), 0);
}

// -----------------------------------------------------------------------------
M3TEST(KichHoatTaiCho_DoubleTap_BomKhoiAreaBomb)
{
	FBoard Board(8, 8, 8888u, 6);
	FillCleanBoard(Board);

	// Đặt 1 AreaBomb tại (3, 3)
	Board.SetCell(MakeCell(3, 3), FBlock::MakeSpecial(EColor::Blue, EBlockKind::AreaBomb));

	FResolver Resolver(Board);
	const FResolveOutcome Outcome = Resolver.ResolveActivateSpecial(MakeCell(3, 3));

	M3REQUIRE(Outcome.bValid);
	M3REQUIRE(Outcome.TotalBlocksCleared >= 9);
	M3REQUIRE(Outcome.Steps.size() >= 1);
	M3REQUIRE_EQ(static_cast<int32>(Outcome.Steps[0].SpecialsActivated.size()), 1);
}

// -----------------------------------------------------------------------------
M3TEST(Match5KhongThangHang_TaoBomPheTa_GiaoNhauHinhChuL)
{
	FBoard Board(8, 8, 12345u, 6);
	FillCleanBoard(Board);

	// Thiết lập các ô như trường hợp người chơi chụp:
	Board.SetCell(MakeCell(1, 1), FBlock::MakeNormal(EColor::Cyan));
	Board.SetCell(MakeCell(1, 2), FBlock::MakeNormal(EColor::Cyan));
	Board.SetCell(MakeCell(1, 3), FBlock::MakeNormal(EColor::Yellow));
	Board.SetCell(MakeCell(2, 3), FBlock::MakeNormal(EColor::Cyan));
	Board.SetCell(MakeCell(3, 3), FBlock::MakeNormal(EColor::Cyan));
	Board.SetCell(MakeCell(1, 4), FBlock::MakeNormal(EColor::Cyan));

	// Di chuyển ô Cyan (1, 4) lên (1, 3) đổi chỗ với Yellow
	FResolver Resolver(Board);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(MakeCell(1, 4), MakeCell(1, 3));

	M3REQUIRE(Outcome.bValid);
	M3REQUIRE(Outcome.Steps.size() >= 1);

	// Ô giao nhau (1, 3) phải sinh ra Bom Khối (AreaBomb) của phe ta
	bool bSpawnedAreaBomb = false;
	for (size_t s = 0; s < Outcome.Steps[0].SpecialsSpawned.size(); ++s)
	{
		if (Outcome.Steps[0].SpecialsSpawned[s] == MakeCell(1, 3) &&
		    Outcome.Steps[0].SpawnedKinds[s] == EBlockKind::AreaBomb)
		{
			bSpawnedAreaBomb = true;
		}
	}
	M3REQUIRE(bSpawnedAreaBomb);
}

// -----------------------------------------------------------------------------
M3TEST(Match4Doc_SinhTiaSetHang_VaMatch4Ngang_SinhTiaSetCot)
{
	// 1. Kiểm tra 4 dọc -> sinh LineClear Variant 0 (clear HÀNG)
	{
		FBoard Board = FBoard::FromAscii({
			"R.......",
			"R.......",
			"R.......",
			"R.......",
			"........"
		});
		const FMatchResult Result = FMatcher::FindMatches(Board);
		M3REQUIRE(Result.bHasMatch);
		M3REQUIRE_EQ(Result.Groups[0].SpecialKind, EBlockKind::LineClear);
		M3REQUIRE_EQ(Result.Groups[0].SpecialVariant, 0); // 4 dọc -> clear HÀNG (Variant 0)
	}

	// 2. Kiểm tra 4 ngang -> sinh LineClear Variant 1 (clear CỘT)
	{
		FBoard Board = FBoard::FromAscii({
			"RRRR....",
			"........",
			"........",
			"........"
		});
		const FMatchResult Result = FMatcher::FindMatches(Board);
		M3REQUIRE(Result.bHasMatch);
		M3REQUIRE_EQ(Result.Groups[0].SpecialKind, EBlockKind::LineClear);
		M3REQUIRE_EQ(Result.Groups[0].SpecialVariant, 1); // 4 ngang -> clear CỘT (Variant 1)
	}
}

// -----------------------------------------------------------------------------
M3TEST(MoveLineClear_ClearHangVaCotTuDo)
{
	// 1. Di chuyển LineClear HÀNG (Variant 0) -> kích nổ sạch toàn bộ hàng
	{
		FBoard Board(8, 8, 5555u, 6);
		FillCleanBoard(Board);

		// Đặt 1 block LineClear hàng (Variant 0) tại (3, 3)
		Board.SetCell(MakeCell(3, 3), FBlock::MakeSpecial(EColor::Purple, EBlockKind::LineClear, 0));

		FResolver Resolver(Board);
		// Đổi chỗ (3, 3) sang (4, 3) không có match 3 màu
		const FResolveOutcome Outcome = Resolver.ResolveSwap(MakeCell(3, 3), MakeCell(4, 3));

		M3REQUIRE(Outcome.bValid);
		M3REQUIRE(Outcome.TotalBlocksCleared >= 8); // Quét cả hàng 8 ô
		M3REQUIRE(Outcome.Steps.size() >= 1);
		M3REQUIRE_GT(static_cast<int32>(Outcome.Steps[0].SpecialsActivated.size()), 0);
	}

	// 2. Di chuyển LineClear CỘT (Variant 1) -> kích nổ sạch toàn bộ cột
	{
		FBoard Board(8, 8, 6666u, 6);
		FillCleanBoard(Board);

		// Đặt 1 block LineClear cột (Variant 1) tại (2, 2)
		Board.SetCell(MakeCell(2, 2), FBlock::MakeSpecial(EColor::Purple, EBlockKind::LineClear, 1));

		FResolver Resolver(Board);
		// Đổi chỗ (2, 2) sang (2, 3) không có match 3 màu
		const FResolveOutcome Outcome = Resolver.ResolveSwap(MakeCell(2, 2), MakeCell(2, 3));

		M3REQUIRE(Outcome.bValid);
		M3REQUIRE(Outcome.TotalBlocksCleared >= 8); // Quét cả cột 8 ô
		M3REQUIRE(Outcome.Steps.size() >= 1);
		M3REQUIRE_GT(static_cast<int32>(Outcome.Steps[0].SpecialsActivated.size()), 0);
	}
}

// -----------------------------------------------------------------------------
// Combo "chuỗi 4" (LineClear) + "bom" (SquareBomb) đổi chỗ CHO NHAU
//   -> nổ 3 HÀNG + 3 CỘT quanh ô đổi chỗ (giống Candy Crush)
M3TEST(ComboChuoi4VaBom_No3HangVa3Cot)
{
	FBoard Board(8, 8, 2401u, 6);
	FillCleanBoard(Board);

	const FCell LineCell = MakeCell(3, 3);
	const FCell BombCell = MakeCell(3, 4);
	Board.SetCell(LineCell, FBlock::MakeSpecial(EColor::Red, EBlockKind::LineClear, 0));
	Board.SetCell(BombCell, FBlock::MakeSpecial(EColor::Red, EBlockKind::SquareBomb));

	FResolver Resolver(Board);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(LineCell, BombCell);

	M3REQUIRE(Outcome.bValid);

	// Vùng nổ = 3 hàng (3,4,5) + 3 cột (2,3,4), trừ 9 ô giao nhau -> 39 ô.
	M3REQUIRE_EQ(Outcome.Steps[0].BlocksInStep, 39);

	const std::vector<FCell>& Cleared = Outcome.Steps[0].ClearedCells;
	auto WasCleared = [&Cleared](int32 X, int32 Y)
	{
		for (const FCell& C : Cleared)
		{
			if (C.X == X && C.Y == Y) { return true; }
		}
		return false;
	};

	M3REQUIRE(WasCleared(0, 3));    // đầu hàng trên của vùng nổ
	M3REQUIRE(WasCleared(7, 5));    // đầu hàng dưới của vùng nổ
	M3REQUIRE(WasCleared(2, 0));    // đầu cột trái của vùng nổ
	M3REQUIRE(WasCleared(4, 7));    // đầu cột phải của vùng nổ
	M3REQUIRE(!WasCleared(0, 0));   // nằm ngoài vùng thì không bị xoá
}

// -----------------------------------------------------------------------------
// Combo "chuỗi 4" + "chuỗi 4" -> 1 hàng + 1 cột (dấu cộng)
M3TEST(ComboChuoi4VaChuoi4_No1HangVa1Cot)
{
	FBoard Board(8, 8, 2402u, 6);
	FillCleanBoard(Board);

	const FCell A = MakeCell(3, 3);
	const FCell B = MakeCell(3, 4);
	Board.SetCell(A, FBlock::MakeSpecial(EColor::Blue, EBlockKind::LineClear, 0));
	Board.SetCell(B, FBlock::MakeSpecial(EColor::Blue, EBlockKind::LineClear, 1));

	FResolver Resolver(Board);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(A, B);

	M3REQUIRE(Outcome.bValid);
	M3REQUIRE_EQ(Outcome.Steps[0].BlocksInStep, 15);   // hàng 4 + cột 3, trừ 1 ô chung
}
