// Copyright MatchRPG. Unreal automation tests for the engine-agnostic core.
//
// Run them inside the editor (Session Frontend > Automation) or headless:
//   UnrealEditor-Cmd.exe "<path>/MatchRPG.uproject" -ExecCmds="Automation RunTests MatchRPG" -unattended -nullrhi -testexit="Automation Test Queue Empty"
//
// These mirror a subset of Tools/host_tests/main.cpp so the rules are covered even
// on a machine that has the engine but no standalone C++ compiler.
#include "Misc/AutomationTest.h"

#include "Core/BattleSimCore.h"
#include "Core/CombatMathCore.h"
#include "Core/ContentCore.h"
#include "Core/MatchBoardCore.h"
#include "Core/MatchFinderCore.h"
#include "Core/MatchRng.h"
#include "Core/MatchTypes.h"

#if WITH_DEV_AUTOMATION_TESTS

using namespace MatchRPG;

namespace
{
	const int32 TestFlags = EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter;

	/** Filler colour that never lines up: (x + 2y) mod 5. */
	FBlockCell MakeFiller(int32 X, int32 Y)
	{
		return FMatchBoardCore::MakeNormalBlock(ColorFromIndex((X + 2 * Y) % 5), ESpecialType::None, 0);
	}

	void FillSafeBoard(FMatchBoardCore& Board)
	{
		for (int32 Y = 0; Y < Board.GetHeight(); ++Y)
		{
			for (int32 X = 0; X < Board.GetWidth(); ++X)
			{
				Board.SetCell(X, Y, MakeFiller(X, Y));
			}
		}
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FMatchRPGBoardGenerationTest, "MatchRPG.Core.BoardGeneration", TestFlags)
bool FMatchRPGBoardGenerationTest::RunTest(const FString& Parameters)
{
	FMatchRng Rng(4242);
	FMatchBoardCore Board;
	Board.Initialize(ContentCore::BuildDefaultBoardRules(), &Rng);
	Board.FillRandomBoard();

	TestEqual(TEXT("board is 8x8"), Board.GetCellCount(), 64);
	TestFalse(TEXT("generated board has no finished match"), Board.HasImmediateMatch());
	TestTrue(TEXT("generated board has at least one legal move"), Board.HasAnyLegalMove());

	int32 Holes = 0;
	for (int32 Y = 0; Y < Board.GetHeight(); ++Y)
	{
		for (int32 X = 0; X < Board.GetWidth(); ++X)
		{
			if (Board.At(X, Y).IsEmpty()) { ++Holes; }
		}
	}
	TestEqual(TEXT("no empty cells"), Holes, 0);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FMatchRPGLine4SpecialTest, "MatchRPG.Core.Line4CreatesSpecial", TestFlags)
bool FMatchRPGLine4SpecialTest::RunTest(const FString& Parameters)
{
	FMatchRng Rng(21);
	FMatchBoardCore Board;
	Board.Initialize(ContentCore::BuildDefaultBoardRules(), &Rng);
	FillSafeBoard(Board);

	Board.SetCell(1, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(2, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(3, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(4, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Blue, ESpecialType::None, 0));
	Board.SetCell(4, 3, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));

	FMatchResolver Resolver(&Rng);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(Board, FIntPoint(4, 3), FIntPoint(4, 4), ContentCore::BuildDefaultScales());

	TestTrue(TEXT("swap accepted"), Outcome.bMoveAccepted);
	TestTrue(TEXT("at least one cascade step"), Outcome.Steps.Num() >= 1);
	if (Outcome.Steps.Num() >= 1)
	{
		TestEqual(TEXT("a special was created"), Outcome.Steps[0].CreatedSpecials.Num(), 1);
		TestEqual(TEXT("row-clear special"), static_cast<int32>(Board.At(4, 4).Special), static_cast<int32>(ESpecialType::LineRow));
	}

	const FTriggerEvent* Red = Outcome.FindTrigger(EBlockColor::Red);
	TestNotNull(TEXT("red trigger recorded"), Red);
	if (Red != nullptr)
	{
		TestTrue(TEXT("4 blocks of red triggered"), Red->BlockCount >= 4);
	}
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FMatchRPGSquareBreakerTest, "MatchRPG.Core.SquareBreakerBreaksObstacles", TestFlags)
bool FMatchRPGSquareBreakerTest::RunTest(const FString& Parameters)
{
	FMatchRng Rng(31);
	FMatchBoardCore Board;
	Board.Initialize(ContentCore::BuildDefaultBoardRules(), &Rng);
	FillSafeBoard(Board);

	Board.SetCell(3, 6, MakeFiller(4, 6));
	Board.SetCell(2, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(3, 4, FMatchBoardCore::MakeNormalBlock(EBlockColor::Blue, ESpecialType::None, 0));
	Board.SetCell(2, 5, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(3, 5, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(3, 3, FMatchBoardCore::MakeNormalBlock(EBlockColor::Red, ESpecialType::None, 0));
	Board.SetCell(4, 5, FMatchBoardCore::MakeObstacleBlock(EObstacleType::Ice, 0));
	Board.SetCell(1, 4, FMatchBoardCore::MakeObstacleBlock(EObstacleType::Rock, 0));

	FMatchResolver Resolver(&Rng);
	const FResolveOutcome Outcome = Resolver.ResolveSwap(Board, FIntPoint(3, 3), FIntPoint(3, 4), ContentCore::BuildDefaultScales());

	TestTrue(TEXT("square match is a legal move"), Outcome.bMoveAccepted);
	TestFalse(TEXT("ice destroyed by the square"), Board.At(4, 5).IsObstacle());
	TestTrue(TEXT("rock survives but is cracked"), Board.At(1, 4).IsObstacle() && Board.At(1, 4).Hp == 1);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FMatchRPGCombatScalingTest, "MatchRPG.Core.CombatScaling", TestFlags)
bool FMatchRPGCombatScalingTest::RunTest(const FString& Parameters)
{
	const FEffectScaleRules Scales = ContentCore::BuildDefaultScales();

	TestEqual(TEXT("3 blocks is the baseline"), CombatMath::ComputeDamageMultiplier(Scales, 3, 0, 1.0f), 1.0f);
	TestTrue(TEXT("6 blocks more than doubles damage"), CombatMath::ComputeDamageMultiplier(Scales, 6, 0, 1.0f) > 2.0f);
	TestTrue(TEXT("damage respects the ceiling"), CombatMath::ComputeDamageMultiplier(Scales, 40, 0, 4.0f) <= Scales.DamageMaxMultiplier);

	TestEqual(TEXT("heal baseline"), CombatMath::ComputeHealMultiplier(Scales, 3), 1.0f);
	// 1.18^4
	TestTrue(TEXT("heal grows exponentially"), CombatMath::ComputeHealMultiplier(Scales, 7) > 1.9f);
	TestTrue(TEXT("heal respects the ceiling"), CombatMath::ComputeHealMultiplier(Scales, 60) <= Scales.HealMaxMultiplier);

	TestTrue(TEXT("a longer combo gives more buff stacks"), CombatMath::ComputeSupportStacks(Scales, 6) > CombatMath::ComputeSupportStacks(Scales, 3));
	TestTrue(TEXT("a longer combo extends the duration"), CombatMath::ComputeSupportDuration(Scales, 6) > CombatMath::ComputeSupportDuration(Scales, 3));

	TestEqual(TEXT("deflector ignores 3-matches"), CombatMath::ComputeDeflectorCharge(Scales, EMatchShape::Line3), 0);
	TestEqual(TEXT("line 4 charges the deflector"), CombatMath::ComputeDeflectorCharge(Scales, EMatchShape::Line4), 1);
	TestEqual(TEXT("5-in-a-line charges double"), CombatMath::ComputeDeflectorCharge(Scales, EMatchShape::Line5), 2);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FMatchRPGBattleLoopTest, "MatchRPG.Core.BattleLoop", TestFlags)
bool FMatchRPGBattleLoopTest::RunTest(const FString& Parameters)
{
	FStageDefinitionRow Stage;
	ContentCore::BuildDemoStage(Stage);

	TArray<FCharacterDefinitionRow> Roster;
	ContentCore::BuildFullRoster(Roster);

	FTeamFormation Formation;
	ContentCore::BuildStarterFormation(Roster, Formation);
	TestEqual(TEXT("starter team has 4 heroes"), Formation.CountFilled(), 4);

	FBattleSimCore Sim;
	Sim.Setup(Stage, Roster, Formation, 777);

	TestEqual(TEXT("battle starts on turn 1"), Sim.GetTurn(), 1);
	TestEqual(TEXT("moves per turn come from the stage"), Sim.GetMovesLeft(), Stage.MovesPerTurn);

	int32 Iterations = 0;
	while (!Sim.IsFinished() && Iterations < 4000)
	{
		++Iterations;

		for (int32 i = 0; i < Sim.GetTeam().Num(); ++i)
		{
			if (Sim.GetTeam()[i].IsUltimateReady(Sim.GetScales().UltGaugeMax))
			{
				Sim.FireUltimate(i);
			}
		}

		FIntPoint A;
		FIntPoint B;
		if (Sim.FindHint(A, B)) { Sim.TrySwap(A, B); }
		else { Sim.EndTurn(); }
	}

	TestTrue(TEXT("battle terminates"), Sim.IsFinished());
	TestTrue(TEXT("result is produced"), Sim.GetResult().bFinished);
	TestTrue(TEXT("star rating is in range"), Sim.GetResult().Stars >= 0 && Sim.GetResult().Stars <= 3);

	int32 SpawnedObstacles = 0;
	int32 Breaks = 0;
	for (int32 i = 0; i < Sim.GetLog().Num(); ++i)
	{
		if (Sim.GetLog()[i].Kind == FBattleEvent::EKind::ObstacleSpawned) { SpawnedObstacles += Sim.GetLog()[i].Amount; }
		if (Sim.GetLog()[i].Kind == FBattleEvent::EKind::Break) { ++Breaks; }
	}
	TestTrue(TEXT("the boss placed obstacles"), SpawnedObstacles > 0);
	TestTrue(TEXT("the stagger gauge broke at least once"), Breaks >= 1);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FMatchRPGDeterminismTest, "MatchRPG.Core.Determinism", TestFlags)
bool FMatchRPGDeterminismTest::RunTest(const FString& Parameters)
{
	FStageDefinitionRow Stage;
	ContentCore::BuildDemoStage(Stage);
	Stage.Boss.MaxHp = 60000;

	TArray<FCharacterDefinitionRow> Roster;
	ContentCore::BuildFullRoster(Roster);

	FTeamFormation Formation;
	ContentCore::BuildStarterFormation(Roster, Formation);

	int32 Scores[2] = { 0, 0 };
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
			if (Sim.FindHint(A, B)) { Sim.TrySwap(A, B); }
			else { Sim.EndTurn(); }
		}
		Scores[Run] = Sim.GetResult().Score;
	}

	TestEqual(TEXT("same seed yields the same score"), Scores[0], Scores[1]);
	return true;
}

#endif // WITH_DEV_AUTOMATION_TESTS
