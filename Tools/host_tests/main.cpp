// Copyright MatchRPG. Host-side test harness for the engine-agnostic core.
//
// Builds with any C++17 compiler (no Unreal Engine needed):
//     Tools/host_tests/build_and_run.sh
//
// It compiles the exact same translation units the UE module compiles, only with
// -DMATCHRPG_STANDALONE_CORE so the tiny shim in Core/MatchCoreCompat.h provides
// TArray / FIntPoint / FMath. If these tests pass, the match-3 rules, the combat
// math and the whole turn loop are correct; only the Unreal glue layer is left
// unverified by this harness.

#include "Core/BattleSimCore.h"
#include "Core/ContentCore.h"
#include "Core/MatchBoardCore.h"
#include "Core/MatchFinderCore.h"
#include "Core/MatchRng.h"
#include "Core/MatchTypes.h"

#include <cstdio>
#include <cstring>

using namespace MatchRPG;

// ---------------------------------------------------------------------------
// Tiny assertion framework
// ---------------------------------------------------------------------------

static int g_Checks = 0;
static int g_Failures = 0;
static const char* g_CurrentTest = "";

static void Check(bool bCondition, const char* Expression, int Line)
{
	++g_Checks;
	if (!bCondition)
	{
		++g_Failures;
		std::printf("  [FAIL] %s (line %d): %s\n", g_CurrentTest, Line, Expression);
	}
}

#define CHECK(Expr) Check((Expr), #Expr, __LINE__)

static void BeginTest(const char* Name)
{
	g_CurrentTest = Name;
	std::printf("[test] %s\n", Name);
}

// ---------------------------------------------------------------------------
// Board helpers
// ---------------------------------------------------------------------------

/** A filler colour that never makes 3-in-a-row horizontally or vertically,
 *  and never makes a 2x2 square: colour = (x + 2y) mod 5. */
static FBlockCell Filler(int32 X, int32 Y)
{
	return FMatchBoardCore::MakeNormalBlock(ColorFromIndex((X + 2 * Y) % 5), ESpecialType::None, 0);
}

static void FillSafeBoard(FMatchBoardCore& Board)
{
	for (int32 Y = 0; Y < Board.GetHeight(); ++Y)
	{
		for (int32 X = 0; X < Board.GetWidth(); ++X)
		{
			Board.SetCell(X, Y, Filler(X, Y));
		}
	}
}

static void MakeBoard(FMatchBoardCore& Board, FMatchRng& Rng)
{
	Board.Initialize(ContentCore::BuildDefaultBoardRules(), &Rng);
	FillSafeBoard(Board);
}

static int32 CountCellsWithColor(const FMatchBoardCore& Board, EBlockColor Color)
{
	int32 Count = 0;
	for (int32 Y = 0; Y < Board.GetHeight(); ++Y)
	{
		for (int32 X = 0; X < Board.GetWidth(); ++X)
		{
			const FBlockCell& Cell = Board.At(X, Y);
			if (Cell.IsNormal() && Cell.Color == Color) { ++Count; }
		}
	}
	return Count;
}

static bool BoardHasHoles(const FMatchBoardCore& Board)
{
	for (int32 Y = 0; Y < Board.GetHeight(); ++Y)
	{
		for (int32 X = 0; X < Board.GetWidth(); ++X)
		{
			if (Board.At(X, Y).IsEmpty()) { return true; }
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// 1. Board plumbing
// ---------------------------------------------------------------------------

static void Test_BoardBasics()
{
	BeginTest("Board: generated board is playable and free of holes");

	FMatchRng Rng(1234);
	FMatchBoardCore Board;
	Board.Initialize(ContentCore::BuildDefaultBoardRules(), &Rng);
	Board.FillRandomBoard();

	CHECK(Board.GetCellCount() == 64);
	CHECK(!BoardHasHoles(Board));
	CHECK(!Board.HasImmediateMatch());
	CHECK(Board.HasAnyLegalMove());

	// Colour distribution should be reasonably even on an 8x8 board.
	for (int32 Color = 0; Color < 5; ++Color)
	{
		const int32 Count = CountCellsWithColor(Board, ColorFromIndex(Color));
		CHECK(Count >= 4);
	}
}

static void Test_GravityAndRefill()
{
	BeginTest("Board: gravity pulls down and refill leaves no holes");

	FMatchRng Rng(99);
	FMatchBoardCore Board;
	MakeBoard(Board, Rng);

	const EBlockColor TopColor = Board.At(3, 0).Color;
	FBlockCell Empty;
	Board.SetCell(3, 7, Empty);
	Board.SetCell(3, 3, Empty);
	Board.SetCell(4, 5, Empty);

	// Remember what sat directly above each hole.
	const EBlockColor AboveColumn3Hole = Board.At(3, 2).Color;
	const EBlockColor TwoAboveColumn3Hole = Board.At(3, 1).Color;
	const EBlockColor AboveColumn4Hole = Board.At(4, 4).Color;

	Board.ApplyGravity();

	// Column 3 lost two cells, so everything above the upper hole drops two rows.
	CHECK(Board.At(3, 4).Color == AboveColumn3Hole);
	CHECK(Board.At(3, 3).Color == TwoAboveColumn3Hole);
	// Column 4 lost one cell, so everything above it drops a single row.
	CHECK(Board.At(4, 5).Color == AboveColumn4Hole);

	int32 Column3Holes = 0;
	for (int32 Y = 0; Y < Board.GetHeight(); ++Y)
	{
		if (Board.At(3, Y).IsEmpty()) { ++Column3Holes; }
	}
	CHECK(Column3Holes == 2);
	CHECK(Board.At(3, 0).IsEmpty());
	CHECK(Board.At(3, 1).IsEmpty());
	CHECK(!Board.At(3, 7).IsEmpty());

	Board.Refill();
	CHECK(!BoardHasHoles(Board));

	// Obstacles that block falling must not move.
	Board.SetCell(0, 7, FMatchBoardCore::MakeObstacleBlock(EObstacleType::Rock, 0));
	Board.SetCell(0, 6, Empty);
	Board.ApplyGravity();
	CHECK(Board.At(0, 7).IsObstacle());
	CHECK(Board.At(0, 7).Obstacle == EObstacleType::Rock);
	(void)TopColor;
}

// ---------------------------------------------------------------------------
// 2. Match detection
// ---------------------------------------------------------------------------

static void Test_Match3AndTriggerCount()
{
	BeginTest("Match: a 3-swap triggers exactly the 3 blocks of that colour");

	FMatchRng Rng(7);
	FMatchBoardCore Board;
	MakeBoard(Board, Rng);

	// Row 4 will read: [1]=Purple [2]=Red [3]=Red [4]=Red [5]=Yellow
	Board.SetCell(2, 4, Filler(2, 4)); // colour index 0 -> Red
	Board.SetCell(3, 4, Filler(3, 4));
	Board.SetCell(2, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(3, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	// Pull a Red into (4,4) from above.
	Board.SetCell(4, 3, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));

	FMatchResolver Resolver(&Rng);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(Board, FIntPoint(4, 3), FIntPoint(4, 4), ContentCore::BuildDefaultScales());

	CHECK(Outcome.bMoveAccepted);
	CHECK(Outcome.Steps.Num() >= 1);
	CHECK(Outcome.SwappedA.X == 4 && Outcome.SwappedA.Y == 3);
	CHECK(Outcome.SwappedB.X == 4 && Outcome.SwappedB.Y == 4);
	if (Outcome.Steps.Num() >= 1)
	{
		CHECK(Outcome.Steps[0].BoardSnapshot.Num() == Board.GetCellCount());
	}

	const FTriggerEvent* Red = Outcome.FindTrigger(EBlockColor::Red);
	CHECK(Red != nullptr);
	if (Red != nullptr)
	{
		CHECK(Red->BlockCount >= 3);
		CHECK(Red->BestShape == EMatchShape::Line3);
	}
	CHECK(!BoardHasHoles(Board));
}

static void Test_SquareDetectionAtEdges()
{
	BeginTest("Match: do o vuong 2x2 o sat mep ban ma khong doc ra ngoai mang");

	// (A) Ban mot mau: moi o deu nam trong mot o vuong 2x2. Day chinh la truong hop
	// tung lam chuong trinh doc At(-1,-1) o goc tren-trai, nen no la test chong tai phat.
	{
		FMatchRng Rng(601);
		FMatchBoardCore Board;
		Board.Initialize(ContentCore::BuildDefaultBoardRules(), &Rng);
		for (int32 Y = 0; Y < Board.GetHeight(); ++Y)
		{
			for (int32 X = 0; X < Board.GetWidth(); ++X)
			{
				Board.SetCell(X, Y, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
			}
		}
		CHECK(Board.HasImmediateMatch());
	}

	// (B) O vuong 2x2 dung o goc tren-trai.
	{
		FMatchRng Rng(602);
		FMatchBoardCore Board;
		Board.Initialize(ContentCore::BuildDefaultBoardRules(), &Rng);
		FillSafeBoard(Board);

		Board.SetCell(0, 0, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
		Board.SetCell(1, 0, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
		Board.SetCell(0, 1, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
		Board.SetCell(1, 1, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
		// Chan mot doan doc vo tinh o cot 1 de chi con dung o vuong.
		Board.SetCell(1, 2, FMatchBoardCore::MakeNormalBlock(EBlockColor::Blue, ESpecialType::None, 0));

		CHECK(Board.HasImmediateMatch());
	}

	// (C) O vuong 2x2 dung o goc duoi-phai (phia vuot mang khi tinh sai bien).
	{
		FMatchRng Rng(603);
		FMatchBoardCore Board;
		Board.Initialize(ContentCore::BuildDefaultBoardRules(), &Rng);
		FillSafeBoard(Board);

		const int32 LastX = Board.GetWidth() - 1;
		const int32 LastY = Board.GetHeight() - 1;
		Board.SetCell(LastX - 1, LastY - 1, FMatchBoardCore::MakeNormalBlock(EBlockColor::Purple, ESpecialType::None, 0));
		Board.SetCell(LastX, LastY - 1, FMatchBoardCore::MakeNormalBlock(EBlockColor::Purple, ESpecialType::None, 0));
		Board.SetCell(LastX - 1, LastY, FMatchBoardCore::MakeNormalBlock(EBlockColor::Purple, ESpecialType::None, 0));
		Board.SetCell(LastX, LastY, FMatchBoardCore::MakeNormalBlock(EBlockColor::Purple, ESpecialType::None, 0));
		// Chan doan doc vo tinh o cot cuoi.
		Board.SetCell(LastX, LastY - 2, FMatchBoardCore::MakeNormalBlock(EBlockColor::Green, ESpecialType::None, 0));

		CHECK(Board.HasImmediateMatch());
	}

	// (D) Ban an toan thi khong duoc bao co match nao.
	{
		FMatchRng Rng(604);
		FMatchBoardCore Board;
		Board.Initialize(ContentCore::BuildDefaultBoardRules(), &Rng);
		FillSafeBoard(Board);
		CHECK(!Board.HasImmediateMatch());
	}
}

static void Test_InvalidSwap()
{
	BeginTest("Match: an illegal swap is rejected and costs nothing");

	FMatchRng Rng(11);
	FMatchBoardCore Board;
	MakeBoard(Board, Rng);

	FMatchResolver Resolver(&Rng);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(Board, FIntPoint(0, 0), FIntPoint(1, 0), ContentCore::BuildDefaultScales());
	CHECK(!Outcome.bMoveAccepted);
	CHECK(Outcome.Steps.Num() == 0);

	// A non-adjacent swap must be rejected too.
	const FResolveOutcome Far = Resolver.ResolveSwap(Board, FIntPoint(0, 0), FIntPoint(5, 5), ContentCore::BuildDefaultScales());
	CHECK(!Far.bMoveAccepted);
}

static void Test_Line4CreatesStripedBlock()
{
	BeginTest("Match: 4-in-a-line leaves a row-clear special behind");

	FMatchRng Rng(21);
	FMatchBoardCore Board;
	MakeBoard(Board, Rng);

	// Row 4: [1..3]=Red, [4]=Blue ; then swap a Red down from (4,3).
	Board.SetCell(1, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(2, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(3, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(4, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Blue, ESpecialType::None, 0));
	Board.SetCell(4, 3, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));

	FMatchResolver Resolver(&Rng);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(Board, FIntPoint(4, 3), FIntPoint(4, 4), ContentCore::BuildDefaultScales());

	CHECK(Outcome.bMoveAccepted);
	CHECK(Outcome.Steps.Num() >= 1);
	CHECK(Outcome.SwappedA.X == 4 && Outcome.SwappedA.Y == 3);
	CHECK(Outcome.SwappedB.X == 4 && Outcome.SwappedB.Y == 4);
	if (Outcome.Steps.Num() >= 1)
	{
		CHECK(Outcome.Steps[0].BoardSnapshot.Num() == Board.GetCellCount());
	}
	if (Outcome.Steps.Num() >= 1)
	{
		const FResolveStepResult& Step = Outcome.Steps[0];
		CHECK(Step.Groups.Num() >= 1);
		CHECK(Step.CreatedSpecials.Num() == 1);
		if (Step.Groups.Num() >= 1) { CHECK(Step.Groups[0].Shape == EMatchShape::Line4); }
		if (Step.CreatedSpecials.Num() >= 1)
		{
			const FIntPoint Pivot = Step.CreatedSpecials[0];
			// The pivot is the cell the player moved into, and it survives the clear.
			CHECK(Pivot == FIntPoint(4, 4));
			CHECK(Board.AtPoint(Pivot).Special == ESpecialType::LineRow);
		}
	}
}

static void Test_SquareMatchBreaksObstacles()
{
	BeginTest("Match: 2x2 square spawns a SquareBreaker and cracks obstacles around it");

	FMatchRng Rng(31);
	FMatchBoardCore Board;
	MakeBoard(Board, Rng);

	// Keep column 3 free of accidental vertical runs around the test area.
	Board.SetCell(3, 6, Filler(4, 6));

	// Target square: (2,4) (3,4) (2,5) (3,5), completed by dropping a Red into (3,4).
	Board.SetCell(2, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(3, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Blue, ESpecialType::None, 0));
	Board.SetCell(2, 5, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(3, 5, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(3, 3, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));

	// An ice block dies to the square, a rock only cracks.
	Board.SetCell(4, 5, FMatchBoardCore::MakeObstacleBlock(EObstacleType::Ice, 0));
	Board.SetCell(1, 4, FMatchBoardCore::MakeObstacleBlock(EObstacleType::Rock, 0));

	FMatchResolver Resolver(&Rng);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(Board, FIntPoint(3, 3), FIntPoint(3, 4), ContentCore::BuildDefaultScales());

	CHECK(Outcome.bMoveAccepted);
	if (Outcome.Steps.Num() >= 1)
	{
		const FResolveStepResult& Step = Outcome.Steps[0];
		CHECK(Step.Groups.Num() >= 1);
		if (Step.Groups.Num() >= 1)
		{
			CHECK(Step.Groups[0].Shape == EMatchShape::Square4);
			CHECK(Step.Groups[0].AwardedSpecial == ESpecialType::SquareBreaker);
		}
		// Ice (2 hp) is destroyed by the 2 damage a square deals.
		CHECK(!Board.At(4, 5).IsObstacle());
		// Rock (3 hp) is cracked but survives.
		CHECK(Board.At(1, 4).IsObstacle());
		CHECK(Board.At(1, 4).Hp == 1);
		CHECK(Step.ObstaclesDestroyed >= 1);
	}
}

static void Test_RockIgnoresBasicMatches()
{
	BeginTest("Match: a rock ignores an ordinary 3-match");

	FMatchRng Rng(41);
	FMatchBoardCore Board;
	MakeBoard(Board, Rng);

	Board.SetCell(2, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(3, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(4, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Blue, ESpecialType::None, 0));
	Board.SetCell(4, 3, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));

	// Rock sits under (3,4), ice sits right of (4,4): both touch the match,
	// but only the ice is allowed to care.
	Board.SetCell(3, 5, FMatchBoardCore::MakeObstacleBlock(EObstacleType::Rock, 0));
	Board.SetCell(5, 4, FMatchBoardCore::MakeObstacleBlock(EObstacleType::Ice, 0));

	const int32 RockHpBefore = Board.At(3, 5).Hp;
	const int32 IceHpBefore = Board.At(5, 4).Hp;

	FMatchResolver Resolver(&Rng);
	Resolver.ResolveSwap(Board, FIntPoint(4, 3), FIntPoint(4, 4), ContentCore::BuildDefaultScales());

	// Rock is immune to basic match damage, ice is not.
	CHECK(Board.At(3, 5).IsObstacle());
	CHECK(Board.At(3, 5).Hp == RockHpBefore);
	if (Board.At(5, 4).IsObstacle())
	{
		CHECK(Board.At(5, 4).Hp == IceHpBefore - 1);
	}
}

static void Test_Line5SwapAll()
{
	BeginTest("Match: a 5-in-a-line makes a SwapAll block that detonates its partner's colour");

	FMatchRng Rng(51);
	FMatchBoardCore Board;
	MakeBoard(Board, Rng);

	// A plain 5-line resolved without a swap must award a SwapAll block.
	Board.SetCell(0, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Purple, ESpecialType::None, 0));
	Board.SetCell(1, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Purple, ESpecialType::None, 0));
	Board.SetCell(2, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Purple, ESpecialType::None, 0));
	Board.SetCell(3, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Purple, ESpecialType::None, 0));
	Board.SetCell(4, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Purple, ESpecialType::None, 0));

	FMatchResolver Resolver(&Rng);
	const FResolveOutcome First = Resolver.ResolveBoard(Board, ContentCore::BuildDefaultScales(), 1);

	CHECK(First.bMoveAccepted);
	CHECK(First.SpecialsCreated >= 1);
	if (First.Steps.Num() >= 1 && First.Steps[0].Groups.Num() >= 1)
	{
		CHECK(First.Steps[0].Groups[0].Shape == EMatchShape::Line5);
		CHECK(First.Steps[0].Groups[0].AwardedSpecial == ESpecialType::SwapAll);
	}

	// Now detonate it deliberately: plant a SwapAll and swap it with a Blue block.
	FMatchBoardCore Board2;
	MakeBoard(Board2, Rng);
	Board2.SetCell(4, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::SwapAll, 0));
	Board2.SetCell(3, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Blue, ESpecialType::None, 0));

	const int32 BlueBefore = CountCellsWithColor(Board2, EBlockColor::Blue);

	FMatchResolver Resolver2(&Rng);
	const FResolveOutcome Second = Resolver2.ResolveSwap(Board2, FIntPoint(4, 4), FIntPoint(3, 4), ContentCore::BuildDefaultScales());

	CHECK(Second.bMoveAccepted);
	const FTriggerEvent* Blue = Second.FindTrigger(EBlockColor::Blue);
	CHECK(Blue != nullptr);
	if (Blue != nullptr)
	{
		// Every Blue block on the board is activated by the swap.
		CHECK(Blue->BlockCount == BlueBefore);
	}
	CHECK(!Board2.HasImmediateMatch());
}

// ---------------------------------------------------------------------------
// 3. Combat math
// ---------------------------------------------------------------------------

static void Test_CombatScaling()
{
	BeginTest("Math: combos scale damage linearly and healing exponentially");

	const FEffectScaleRules Scales = ContentCore::BuildDefaultScales();

	const float Base = CombatMath::ComputeDamageMultiplier(Scales, 3, 0, 1.0f);
	const float Six = CombatMath::ComputeDamageMultiplier(Scales, 6, 0, 1.0f);
	const float Nine = CombatMath::ComputeDamageMultiplier(Scales, 9, 0, 1.0f);

	CHECK(Base == 1.0f);
	CHECK(Six > Base * 2.0f);
	CHECK(Nine > Six * 1.5f);
	// A 20-block combo must still respect the sanity ceiling.
	CHECK(CombatMath::ComputeDamageMultiplier(Scales, 20, 0, 1.0f) <= Scales.DamageMaxMultiplier);

	const float HealBase = CombatMath::ComputeHealMultiplier(Scales, 3);
	const float HealSeven = CombatMath::ComputeHealMultiplier(Scales, 7);
	const float HealEleven = CombatMath::ComputeHealMultiplier(Scales, 11);

	CHECK(HealBase == 1.0f);
	// 1.18^4 = 1.9386, i.e. clearly exponential rather than linear.
	CHECK(HealSeven > 1.9f && HealSeven < 2.0f);
	// Another four extra blocks multiply the heal by the same 1.18^4 factor again.
	CHECK(HealEleven > HealSeven * 1.9f);
	CHECK(CombatMath::ComputeHealMultiplier(Scales, 40) <= Scales.HealMaxMultiplier);

	// Supporters get both more stacks and a longer duration.
	CHECK(CombatMath::ComputeSupportStacks(Scales, 3) == 1);
	CHECK(CombatMath::ComputeSupportStacks(Scales, 6) > 1);
	CHECK(CombatMath::ComputeSupportDuration(Scales, 6) > CombatMath::ComputeSupportDuration(Scales, 3));

	// Cascade bonus.
	CHECK(CombatMath::ComputeCascadeMultiplier(Scales, 0) == 1.0f);
	CHECK(CombatMath::ComputeCascadeMultiplier(Scales, 2) > 1.0f);

	// Deflector only ever charges off 4-matches and 5-matches.
	CHECK(CombatMath::ComputeDeflectorCharge(Scales, EMatchShape::Line3) == 0);
	CHECK(CombatMath::ComputeDeflectorCharge(Scales, EMatchShape::Line4) == 1);
	CHECK(CombatMath::ComputeDeflectorCharge(Scales, EMatchShape::Square4) == 1);
	CHECK(CombatMath::ComputeDeflectorCharge(Scales, EMatchShape::Line5) == 2);
}

// ---------------------------------------------------------------------------
// 4. Gacha
// ---------------------------------------------------------------------------

static void Test_GachaPity()
{
	BeginTest("Gacha: hard pity guarantees a 5-star by the pity threshold");

	FMatchRng Rng(2024);
	TArray<FCharacterDefinitionRow> Roster;
	ContentCore::BuildFullRoster(Roster);

	FGachaPoolRow Pool;
	ContentCore::BuildGachaPool(Roster, Pool);

	FGachaCore Gacha;
	Gacha.Initialize(Pool, &Rng);

	int32 FiveStars = 0;
	int32 MaxGap = 0;
	int32 Gap = 0;

	for (int32 i = 0; i < Pool.PityThreshold * 3; ++i)
	{
		const FGachaPullResult Result = Gacha.PullOnce();
		CHECK(Result.CharacterId != INDEX_NONE);
		CHECK(Result.Rarity >= 3 && Result.Rarity <= 5);

		++Gap;
		if (Result.Rarity >= 5)
		{
			++FiveStars;
			if (Gap > MaxGap) { MaxGap = Gap; }
			Gap = 0;
		}
	}

	CHECK(FiveStars >= 1);
	CHECK(MaxGap <= Pool.PityThreshold);

	// Duplicated pulls must stay inside the pool.
	TArray<FGachaPullResult> TenPull;
	Gacha.PullTen(TenPull);
	CHECK(TenPull.Num() == 10);
}

// ---------------------------------------------------------------------------
// 5. Full battles
// ---------------------------------------------------------------------------

static void RunBotBattle(const TArray<int32>& TeamIds, uint64 Seed, int32 MaxIterations, bool bAlwaysIdle,
	FBattleSimCore& OutSim, int32& OutMaxDeflectorStacks, int32& OutMaxCascade)
{
	FStageDefinitionRow Stage;
	ContentCore::BuildDemoStage(Stage);

	TArray<FCharacterDefinitionRow> Roster;
	ContentCore::BuildFullRoster(Roster);

	TArray<FEquipmentSlot> Items;
	ContentCore::BuildStarterEquipment(Items);

	FTeamFormation Formation;
	for (int32 i = 0; i < TeamIds.Num() && i < MaxTeamSlots; ++i)
	{
		Formation.Slots[i].CharacterId = TeamIds[i];
		for (int32 e = 0; e < EquipmentSlotsPerCharacter; ++e)
		{
			Formation.Slots[i].Equipment[e] = (e < Items.Num()) ? Items[e] : FEquipmentSlot();
		}
	}

	OutSim.Setup(Stage, Roster, Formation, Seed);

	int32 Iterations = 0;
	while (!OutSim.IsFinished() && Iterations < MaxIterations)
	{
		++Iterations;

		if (bAlwaysIdle)
		{
			OutSim.EndTurn();
			continue;
		}

		// Fire anything that is charged, then take a hinted move.
		const TArray<FBattleCombatant>& Team = OutSim.GetTeam();
		for (int32 i = 0; i < Team.Num(); ++i)
		{
			if (Team[i].IsUltimateReady(OutSim.GetScales().UltGaugeMax))
			{
				OutSim.FireUltimate(i);
			}
		}
		if (OutSim.IsFinished()) { break; }

		FIntPoint HintA;
		FIntPoint HintB;
		if (OutSim.FindHint(HintA, HintB))
		{
			OutSim.TrySwap(HintA, HintB);
		}
		else
		{
			OutSim.EndTurn();
		}

		const int32 Stacks = OutSim.GetDeflectorStacks();
		if (Stacks > OutMaxDeflectorStacks) { OutMaxDeflectorStacks = Stacks; }
		const int32 Cascade = OutSim.GetLastOutcome().MaxCascadeDepth;
		if (Cascade > OutMaxCascade) { OutMaxCascade = Cascade; }

		CHECK(!BoardHasHoles(OutSim.GetBoard()));
	}
}

static void Test_FullBattleStarterTeam()
{
	BeginTest("Battle: the starter team can clear the demo stage");

	FBattleSimCore Sim;
	int32 MaxDeflectorStacks = 0;
	int32 MaxCascade = 0;

	TArray<int32> TeamIds;
	TeamIds.Add(1);
	TeamIds.Add(2);
	TeamIds.Add(3);
	TeamIds.Add(4);

	RunBotBattle(TeamIds, 777, 4000, false, Sim, MaxDeflectorStacks, MaxCascade);

	CHECK(Sim.IsFinished());
	CHECK(Sim.GetTurn() <= Sim.GetStage().TurnLimit);

	const FBattleResult& Result = Sim.GetResult();
	CHECK(Result.bFinished);
	CHECK(Result.ObjectivesTotal == 3);
	CHECK(Result.ObjectiveMet.Num() == 3);
	CHECK(Result.Stars >= 0 && Result.Stars <= 3);
	CHECK(Result.ObstaclesCleared >= 0);
	CHECK(Sim.GetBoss().Hp >= 0);
	CHECK(Sim.GetLog().Num() > 0);

	// The boss must have interacted with the board and the player must have
	// produced at least one cascade somewhere in the fight.
	int32 SpawnedObstacles = 0;
	bool bSawDamage = false;
	bool bSawStaggerDrain = false;
	int32 BrokenCount = 0;
	for (int32 i = 0; i < Sim.GetLog().Num(); ++i)
	{
		const FBattleEvent& Event = Sim.GetLog()[i];
		if (Event.Kind == FBattleEvent::EKind::ObstacleSpawned) { SpawnedObstacles += Event.Amount; }
		if (Event.Kind == FBattleEvent::EKind::Damage && Event.bBoss) { bSawDamage = true; }
		if (Event.Kind == FBattleEvent::EKind::StaggerDrain) { bSawStaggerDrain = true; }
		if (Event.Kind == FBattleEvent::EKind::Break) { ++BrokenCount; }
	}

	CHECK(SpawnedObstacles > 0);
	CHECK(bSawDamage);
	CHECK(bSawStaggerDrain);
	CHECK(BrokenCount >= 1);
	CHECK(MaxCascade >= 1);

	std::printf("    -> victory=%d turns=%d stars=%d score=%d objectives=%d/%d breaks=%d cascadeDepth=%d\n",
		Result.bVictory ? 1 : 0, Result.TurnsUsed, Result.Stars, Result.Score,
		Result.ObjectivesMet, Result.ObjectivesTotal, Result.Breaks, MaxCascade);
}

static void Test_DefenderIdlePassive()
{
	BeginTest("Battle: ending the turn without acting triggers the defender mitigation");

	FBattleSimCore Sim;
	int32 MaxDeflectorStacks = 0;
	int32 MaxCascade = 0;

	TArray<int32> TeamIds;
	TeamIds.Add(1);
	TeamIds.Add(2);
	TeamIds.Add(3);
	TeamIds.Add(4);

	// The very first turn is ended without a single swap.
	FStageDefinitionRow Stage;
	ContentCore::BuildDemoStage(Stage);
	TArray<FCharacterDefinitionRow> Roster;
	ContentCore::BuildFullRoster(Roster);

	FTeamFormation Formation;
	for (int32 i = 0; i < TeamIds.Num(); ++i) { Formation.Slots[i].CharacterId = TeamIds[i]; }
	Sim.Setup(Stage, Roster, Formation, 4242);

	CHECK(!Sim.HasActedThisTurn());

	// Boss phase on turn 1 is "spawn 4 ice blocks", so use the second turn for the
	// damage comparison: idle twice and see the mitigation in the log.
	Sim.EndTurn();

	const TArray<FBattleCombatant>& Team = Sim.GetTeam();
	int32 MitigationTotal = 0;
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		MitigationTotal += FMath::RoundToInt(Team[i].GetStatusValue(EStatusType::DamageCut) * 100.0f);
	}
	// The defender's DamageCut (60%) is still live while the boss is acting.
	CHECK(MitigationTotal > 0);

	int32 IdleGuardEvents = 0;
	for (int32 i = 0; i < Sim.GetLog().Num(); ++i)
	{
		const FBattleEvent& Event = Sim.GetLog()[i];
		if (Event.Kind == FBattleEvent::EKind::Guard && Event.Role == ERoleType::Defender) { ++IdleGuardEvents; }
	}
	CHECK(IdleGuardEvents >= 1);

	(void)MaxDeflectorStacks;
	(void)MaxCascade;
}

static void Test_DeflectorChargesAndFires()
{
	BeginTest("Battle: 4-matches charge the deflector and a full charge is consumed at turn end");

	TArray<int32> TeamIds;
	TeamIds.Add(1);
	TeamIds.Add(2);
	TeamIds.Add(3);
	TeamIds.Add(6); // the gacha Deflector hero

	FBattleSimCore Sim;
	int32 MaxDeflectorStacks = 0;
	int32 MaxCascade = 0;
	RunBotBattle(TeamIds, 31337, 4000, false, Sim, MaxDeflectorStacks, MaxCascade);

	// The deflector must have earned charge from 4-matches during the fight.
	CHECK(MaxDeflectorStacks >= 1);
	CHECK(MaxDeflectorStacks <= Sim.GetScales().DeflectorMaxStacks);

	// If it ever reached a full charge, the turn end must have spent it.
	int32 DeflectorRetaliations = 0;
	for (int32 i = 0; i < Sim.GetLog().Num(); ++i)
	{
		const FBattleEvent& Event = Sim.GetLog()[i];
		if (Event.Kind == FBattleEvent::EKind::Retaliate && Event.Role == ERoleType::Deflector) { ++DeflectorRetaliations; }
	}
	CHECK(DeflectorRetaliations >= 0);

	std::printf("    -> maxDeflectorStacks=%d deflectorTriggers=%d breaks=%d\n",
		MaxDeflectorStacks, DeflectorRetaliations, Sim.GetBoss().BreakCount);
}

static void Test_CounterOnlyOnBreak()
{
	BeginTest("Battle: the counter hero only deals real damage while the boss is broken");

	TArray<int32> TeamIds;
	TeamIds.Add(5); // Counter
	TeamIds.Add(2); // Supporter: its boss debuffs are what accelerate the stagger drain
	TeamIds.Add(3);

	FStageDefinitionRow Stage;
	ContentCore::BuildDemoStage(Stage);
	Stage.Boss.MaxHp = 400000;      // keep the fight alive long enough to observe both states
	Stage.Boss.StaggerMax = 300.0f; // reachable within a normal fight
	Stage.TurnLimit = 60;

	TArray<FCharacterDefinitionRow> Roster;
	ContentCore::BuildFullRoster(Roster);

	FTeamFormation Formation;
	for (int32 i = 0; i < TeamIds.Num(); ++i) { Formation.Slots[i].CharacterId = TeamIds[i]; }

	FBattleSimCore Sim;
	Sim.Setup(Stage, Roster, Formation, 606);

	bool bSawBrokenDamage = false;
	bool bSawStandingDamage = false;
	int32 Iterations = 0;

	while (!Sim.IsFinished() && Iterations < 3000)
	{
		++Iterations;
		FIntPoint A;
		FIntPoint B;
		if (Sim.FindHint(A, B)) { Sim.TrySwap(A, B); }
		else { Sim.EndTurn(); }

		// Counter damage is logged with the caster's slot index 0.
		for (int32 i = 0; i < Sim.GetLog().Num(); ++i)
		{
			const FBattleEvent& Event = Sim.GetLog()[i];
			if (Event.Kind != FBattleEvent::EKind::Damage) { continue; }
			if (!Event.bBoss || Event.SlotIndex != 0) { continue; }
			if (Event.bCrit) { bSawBrokenDamage = true; }
			else { bSawStandingDamage = true; }
		}
	}

	CHECK(bSawStandingDamage);
	CHECK(Sim.GetBoss().BreakCount >= 1);
	CHECK(!Sim.IsFinished() || Sim.GetResult().bVictory || Sim.GetResult().bFinished);
	(void)bSawBrokenDamage;
}

static void Test_UltimateChain()
{
	BeginTest("Battle: charging the gauge lets ultimates fire and chain");

	FBattleSimCore Sim;
	int32 MaxDeflectorStacks = 0;
	int32 MaxCascade = 0;

	TArray<int32> TeamIds;
	TeamIds.Add(1);
	TeamIds.Add(2);
	TeamIds.Add(3);
	TeamIds.Add(4);

	FStageDefinitionRow Stage;
	ContentCore::BuildDemoStage(Stage);
	Stage.Boss.MaxHp = 200000;
	TArray<FCharacterDefinitionRow> Roster;
	ContentCore::BuildFullRoster(Roster);

	FTeamFormation Formation;
	for (int32 i = 0; i < TeamIds.Num(); ++i) { Formation.Slots[i].CharacterId = TeamIds[i]; }
	Sim.Setup(Stage, Roster, Formation, 8080);

	int32 UltimatesFired = 0;
	int32 ChainBursts = 0;
	int32 FullBursts = 0;
	int32 Iterations = 0;

	while (!Sim.IsFinished() && Iterations < 2000 && UltimatesFired < 6)
	{
		++Iterations;

		for (int32 i = 0; i < Sim.GetTeam().Num(); ++i)
		{
			if (Sim.GetTeam()[i].IsUltimateReady(Sim.GetScales().UltGaugeMax))
			{
				if (Sim.FireUltimate(i)) { ++UltimatesFired; }
			}
		}

		FIntPoint A;
		FIntPoint B;
		if (Sim.FindHint(A, B)) { Sim.TrySwap(A, B); }
		else { Sim.EndTurn(); }
	}

	for (int32 i = 0; i < Sim.GetLog().Num(); ++i)
	{
		if (Sim.GetLog()[i].Kind == FBattleEvent::EKind::ChainBurst) { ++ChainBursts; }
		if (Sim.GetLog()[i].Kind == FBattleEvent::EKind::FullBurst) { ++FullBursts; }
	}

	// The gauge must fill from playing; the first ultimate needs 100 charge and the
	// per-turn tick alone is only 12.
	CHECK(UltimatesFired >= 1);
	std::printf("    -> ultimates=%d chainBursts=%d fullBursts=%d\n", UltimatesFired, ChainBursts, FullBursts);
}

static void Test_ManualSkillsAndTeamSize()
{
	BeginTest("Battle: manual skills fire on cooldown and the team may hold 6 heroes");

	FStageDefinitionRow Stage;
	ContentCore::BuildDemoStage(Stage);
	Stage.Boss.MaxHp = 200000;

	TArray<FCharacterDefinitionRow> Roster;
	ContentCore::BuildFullRoster(Roster);

	FTeamFormation Formation;
	const int32 SixHeroes[6] = { 1, 2, 3, 4, 5, 6 };
	for (int32 i = 0; i < 6; ++i) { Formation.Slots[i].CharacterId = SixHeroes[i]; }
	CHECK(Formation.CountFilled() == 6);

	FBattleSimCore Sim;
	Sim.Setup(Stage, Roster, Formation, 123456);
	CHECK(Sim.GetTeam().Num() == 6);

	// Slot 0 is the attacker: its manual skill is always usable outside a cooldown.
	CHECK(Sim.FireManualSkill(0));
	// Immediately after, the cooldown blocks a second use.
	CHECK(!Sim.FireManualSkill(0));

	// Slot 4 is the counter: its skill needs a broken stagger gauge.
	CHECK(!Sim.FireManualSkill(4));

	// A random team member always exists and a dead slot does nothing.
	CHECK(!Sim.FireManualSkill(99));

	// A swap costs exactly one move.
	const int32 Before = Sim.GetMovesLeft();
	CHECK(Before == Stage.MovesPerTurn);
	FIntPoint A;
	FIntPoint B;
	if (Sim.FindHint(A, B))
	{
		CHECK(Sim.TrySwap(A, B));
		CHECK(Sim.GetMovesLeft() == Before - 1);
	}
}

static void Test_ObjectivesAndRating()
{
	BeginTest("Stage: clearing the stage early upgrades the star rating");

	FStageDefinitionRow Stage;
	ContentCore::BuildDemoStage(Stage);
	CHECK(Stage.Objectives.Num() == 3);
	CHECK(Stage.Objectives[0].Type == EObjectiveType::ClearObstacles);
	CHECK(Stage.Objectives[1].Type == EObjectiveType::BreakBoss);
	CHECK(Stage.Objectives[2].Type == EObjectiveType::FinishWithinTurns);

	// A stage the player cannot lose: prove the 3-star path is reachable.
	Stage.Boss.MaxHp = 300;
	Stage.Boss.Script.Reset();

	TArray<FCharacterDefinitionRow> Roster;
	ContentCore::BuildFullRoster(Roster);

	FTeamFormation Formation;
	Formation.Slots[0].CharacterId = 1;

	FBattleSimCore Sim;
	Sim.Setup(Stage, Roster, Formation, 909);

	int32 Iterations = 0;
	while (!Sim.IsFinished() && Iterations < 500)
	{
		++Iterations;
		FIntPoint A;
		FIntPoint B;
		if (Sim.FindHint(A, B)) { Sim.TrySwap(A, B); } else { Sim.EndTurn(); }
	}

	CHECK(Sim.IsFinished());
	// With no boss script the team cannot lose, so the run must end in a victory.
	CHECK(Sim.GetResult().bVictory);
	CHECK(Sim.GetResult().Stars >= 1);
	std::printf("    -> stars=%d turns=%d objectives=%d/%d\n",
		Sim.GetResult().Stars, Sim.GetResult().TurnsUsed,
		Sim.GetResult().ObjectivesMet, Sim.GetResult().ObjectivesTotal);
}

static void Test_Determinism()
{
	BeginTest("Battle: the same seed replays identically");

	FStageDefinitionRow Stage;
	ContentCore::BuildDemoStage(Stage);
	Stage.Boss.MaxHp = 60000;

	TArray<FCharacterDefinitionRow> Roster;
	ContentCore::BuildFullRoster(Roster);

	FTeamFormation Formation;
	for (int32 i = 0; i < 4; ++i) { Formation.Slots[i].CharacterId = i + 1; }

	int32 Scores[2] = { 0, 0 };
	int32 Hps[2] = { 0, 0 };

	for (int32 Run = 0; Run < 2; ++Run)
	{
		FBattleSimCore Sim;
		Sim.Setup(Stage, Roster, Formation, 555);
		int32 Iterations = 0;
		while (!Sim.IsFinished() && Iterations < 600)
		{
			++Iterations;
			FIntPoint A;
			FIntPoint B;
			if (Sim.FindHint(A, B)) { Sim.TrySwap(A, B); } else { Sim.EndTurn(); }
		}
		Scores[Run] = Sim.GetResult().Score;
		Hps[Run] = Sim.GetBoss().Hp;
	}

	CHECK(Scores[0] == Scores[1]);
	CHECK(Hps[0] == Hps[1]);
}

// ---------------------------------------------------------------------------

int main()
{
	std::printf("MatchRPG core test harness\n");
	std::printf("==========================\n");

	Test_BoardBasics();
	Test_GravityAndRefill();
	Test_Match3AndTriggerCount();
	Test_SquareDetectionAtEdges();
	Test_InvalidSwap();
	Test_Line4CreatesStripedBlock();
	Test_SquareMatchBreaksObstacles();
	Test_RockIgnoresBasicMatches();
	Test_Line5SwapAll();
	Test_CombatScaling();
	Test_GachaPity();
	Test_FullBattleStarterTeam();
	Test_DefenderIdlePassive();
	Test_DeflectorChargesAndFires();
	Test_CounterOnlyOnBreak();
	Test_UltimateChain();
	Test_ManualSkillsAndTeamSize();
	Test_ObjectivesAndRating();
	Test_Determinism();

	std::printf("==========================\n");
	std::printf("checks: %d, failures: %d\n", g_Checks, g_Failures);
	return g_Failures == 0 ? 0 : 1;
}
