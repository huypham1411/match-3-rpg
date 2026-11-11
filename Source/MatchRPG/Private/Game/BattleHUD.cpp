// Copyright MatchRPG. Canvas HUD implementation.
#include "Game/BattleHUD.h"

#include "Battle/MatchRPGSimHost.h"
#include "Board/BoardGridActor.h"
#include "Core/BattleSimCore.h"
#include "Core/MatchTypes.h"
#include "Core/SkillCore.h"

#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "Engine/World.h"
#include "EngineUtils.h"

namespace
{
	const FLinearColor PanelColor(0.02f, 0.03f, 0.06f, 0.72f);
	const FLinearColor BossBarColor(0.85f, 0.18f, 0.22f, 1.0f);
	const FLinearColor StaggerBarColor(0.95f, 0.72f, 0.16f, 1.0f);
	const FLinearColor StaggerBrokenColor(0.30f, 0.85f, 0.95f, 1.0f);
	const FLinearColor BarBackColor(0.08f, 0.09f, 0.12f, 0.9f);
	const FLinearColor BattleTextColor(0.92f, 0.94f, 0.98f, 1.0f);
	const FLinearColor MeterBarColor(0.35f, 0.78f, 0.95f, 1.0f);

}

ABattleHUD::ABattleHUD()
{
}

void ABattleHUD::BeginPlay()
{
	Super::BeginPlay();
	CachedBoard = FindBoardActor();
}

ABoardGridActor* ABattleHUD::FindBoardActor()
{
	if (CachedBoard != nullptr) { return CachedBoard; }

	UWorld* World = GetWorld();
	if (World == nullptr) { return nullptr; }

	for (TActorIterator<ABoardGridActor> It(World); It; ++It)
	{
		CachedBoard = *It;
		break;
	}
	return CachedBoard;
}

void ABattleHUD::DrawLabel(const FString& Text, float X, float Y, const FLinearColor& Color, float Scale)
{
	if (Canvas == nullptr || GEngine == nullptr) { return; }
	UFont* Font = GEngine->GetSmallFont();
	DrawText(Text, Color, X, Y, Font, Scale, false);
}

void ABattleHUD::DrawPanel(float X, float Y, float Width, float Height, const FLinearColor& Color)
{
	if (Canvas == nullptr) { return; }
	DrawRect(Color, X, Y, Width, Height);
}

void ABattleHUD::DrawBar(float X, float Y, float Width, float Height, float Fraction, const FLinearColor& FillColor, const FLinearColor& BackColor)
{
	if (Canvas == nullptr) { return; }
	DrawRect(BackColor, X, Y, Width, Height);
	const float Clamped = FMath::Clamp(Fraction, 0.0f, 1.0f);
	DrawRect(FillColor, X, Y, Width * Clamped, Height);
}

void ABattleHUD::DrawHUD()
{
	Super::DrawHUD();

	if (Canvas == nullptr) { return; }

	ABoardGridActor* Board = FindBoardActor();
	if (Board == nullptr) { return; }

	FMatchRPGSimHost* Host = Board->GetSimHostMutable();
	if (Host == nullptr) { return; }

	const float ScreenW = Canvas->SizeX;
	const float ScreenH = Canvas->SizeY;

	DrawBossPanel(ScreenW);
	DrawObjectivePanel(ScreenH);
	DrawTeamPanel(ScreenW, ScreenH);
	DrawTurnPanel(ScreenW, ScreenH);
	DrawLogPanel(ScreenW);

	if (Host->Sim.IsFinished())
	{
		DrawResultOverlay(ScreenW, ScreenH);
	}
}

void ABattleHUD::DrawBossPanel(float ScreenW)
{
	FMatchRPGSimHost* Host = CachedBoard != nullptr ? CachedBoard->GetSimHostMutable() : nullptr;
	if (Host == nullptr) { return; }

	const MatchRPG::FBattleBossState& Boss = Host->Sim.GetBoss();
	const float PanelX = ScreenW * 0.5f - 300.0f;
	const float PanelY = 20.0f;

	DrawPanel(PanelX - 12.0f, PanelY - 10.0f, 624.0f, 92.0f, PanelColor);
	DrawLabel(FString::Printf(TEXT("BOSS  %d / %d    stagger break x%d"),
		Boss.Hp, Boss.MaxHp, Boss.BreakCount), PanelX, PanelY, BattleTextColor, 1.1f);

	DrawBar(PanelX, PanelY + 24.0f, 600.0f, 16.0f, Boss.GetHpPercent(), BossBarColor, BarBackColor);

	const FLinearColor StaggerColor = Boss.bBroken ? StaggerBrokenColor : StaggerBarColor;
	const float StaggerFraction = Boss.bBroken ? 1.0f : Boss.GetStaggerPercent();
	DrawBar(PanelX, PanelY + 46.0f, 600.0f, 12.0f, StaggerFraction, StaggerColor, BarBackColor);
	DrawLabel(Boss.bBroken
		? FString::Printf(TEXT("STAGGER BROKEN - counters active (%d turn left)"), Boss.BreakTurnsLeft)
		: FString::Printf(TEXT("stagger %.0f / %.0f"), Boss.Stagger, Boss.StaggerMax),
		PanelX, PanelY + 62.0f, StaggerColor);
}

void ABattleHUD::DrawObjectivePanel(float ScreenH)
{
	FMatchRPGSimHost* Host = CachedBoard != nullptr ? CachedBoard->GetSimHostMutable() : nullptr;
	if (Host == nullptr) { return; }

	const MatchRPG::FBattleResult& Result = Host->Sim.GetResult();
	const MatchRPG::FStageDefinitionRow& Stage = Host->Sim.GetStage();

	const float X = 24.0f;
	float Y = 130.0f;
	DrawPanel(X - 10.0f, Y - 10.0f, 320.0f, 30.0f + Stage.Objectives.Num() * 20.0f, PanelColor);
	DrawLabel(FString::Printf(TEXT("CHALLENGE  (%d/%d met)"), Result.ObjectivesMet, Result.ObjectivesTotal), X, Y, BattleTextColor, 1.0f);
	Y += 22.0f;

	for (int32 i = 0; i < Stage.Objectives.Num(); ++i)
	{
		const MatchRPG::FChallengeObjectiveRow& Objective = Stage.Objectives[i];
		const bool bMet = Result.ObjectiveMet.IsValidIndex(i) && Result.ObjectiveMet[i] != 0;

		FString Text;
		switch (Objective.Type)
		{
		case MatchRPG::EObjectiveType::ClearObstacles:
			{
				const int32 Index = Objective.Param;
				const int32 Cleared = Host->Sim.GetResult().ObstaclesClearedPerType.IsValidIndex(Index)
					? Host->Sim.GetResult().ObstaclesClearedPerType[Index] : 0;
				Text = FString::Printf(TEXT("Clear %s blocks  %d/%d"),
					MatchRPG::ToText(static_cast<MatchRPG::EObstacleType>(Objective.Param)), Cleared, Objective.Target);
			}
			break;
		case MatchRPG::EObjectiveType::FinishWithinTurns:
			Text = FString::Printf(TEXT("Finish within %d turns  (now %d)"), Objective.Target, Host->Sim.GetTurn());
			break;
		case MatchRPG::EObjectiveType::NoDeaths:
			Text = TEXT("Nobody falls");
			break;
		case MatchRPG::EObjectiveType::TriggerSpecials:
			Text = FString::Printf(TEXT("Trigger %d special blocks"), Objective.Target);
			break;
		case MatchRPG::EObjectiveType::BreakBoss:
			Text = FString::Printf(TEXT("Break the boss %d time(s)  %d/%d"), Objective.Target, Host->Sim.GetBoss().BreakCount, Objective.Target);
			break;
		case MatchRPG::EObjectiveType::ReachScore:
			Text = FString::Printf(TEXT("Reach score %d  (%d)"), Objective.Target, Host->Sim.GetResult().Score);
			break;
		default:
			Text = TEXT("Objective");
			break;
		}

		DrawLabel(FString::Printf(TEXT("%s %s%s"), bMet ? TEXT("[x]") : TEXT("[ ]"), *Text,
			Objective.bPrimary ? TEXT("") : TEXT("  (bonus)")),
			X, Y, bMet ? FLinearColor(0.45f, 0.92f, 0.45f, 1.0f) : FLinearColor(0.75f, 0.78f, 0.85f, 1.0f));
		Y += 20.0f;
	}
}

void ABattleHUD::DrawTeamPanel(float ScreenW, float ScreenH)
{
	FMatchRPGSimHost* Host = CachedBoard != nullptr ? CachedBoard->GetSimHostMutable() : nullptr;
	if (Host == nullptr) { return; }

	const TArray<MatchRPG::FBattleCombatant>& Team = Host->Sim.GetTeam();
	const float PanelWidth = 232.0f;
	const float PanelHeight = 28.0f + Team.Num() * 40.0f;
	const float X = 24.0f;
	const float Y = ScreenH - PanelHeight - 24.0f;

	DrawPanel(X - 10.0f, Y - 10.0f, PanelWidth, PanelHeight, PanelColor);

	float RowY = Y;
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		const MatchRPG::FBattleCombatant& Combatant = Team[i];
		const bool bUltReady = Combatant.IsUltimateReady(Host->Sim.GetScales().UltGaugeMax);

		FLinearColor NameColor = Combatant.bAlive ? BattleTextColor : FLinearColor(0.5f, 0.5f, 0.5f, 1.0f);
		if (bUltReady) { NameColor = FLinearColor(1.0f, 0.9f, 0.35f, 1.0f); }

		DrawLabel(FString::Printf(TEXT("[%d] %s  %s%s"), i, MatchRPG::ToText(Combatant.Role),
			MatchRPG::ToText(Combatant.BoundColor),
			Combatant.ManualCooldown > 0 ? *FString::Printf(TEXT("  cd%d"), Combatant.ManualCooldown) : TEXT("")),
			X, RowY, NameColor);

		const float HpFraction = Combatant.MaxHp > 0 ? static_cast<float>(Combatant.Hp) / static_cast<float>(Combatant.MaxHp) : 0.0f;
		DrawBar(X, RowY + 14.0f, 200.0f, 8.0f, HpFraction, FLinearColor(0.30f, 0.80f, 0.40f, 1.0f), BarBackColor);

		const float GaugeFraction = Host->Sim.GetScales().UltGaugeMax > 0.0f
			? Combatant.UltGauge / Host->Sim.GetScales().UltGaugeMax : 0.0f;
		DrawBar(X, RowY + 24.0f, 200.0f, 5.0f, GaugeFraction, MeterBarColor, BarBackColor);

		if (Combatant.Role == MatchRPG::ERoleType::Deflector)
		{
			DrawLabel(FString::Printf(TEXT("deflector %d/%d"), Combatant.DeflectorStacks, Host->Sim.GetScales().DeflectorMaxStacks),
				X + 140.0f, RowY + 14.0f, FLinearColor(0.8f, 0.6f, 1.0f, 1.0f));
		}

		RowY += 40.0f;
	}
}

void ABattleHUD::DrawTurnPanel(float ScreenW, float ScreenH)
{
	FMatchRPGSimHost* Host = CachedBoard != nullptr ? CachedBoard->GetSimHostMutable() : nullptr;
	if (Host == nullptr) { return; }

	const float X = ScreenW - 340.0f;
	const float Y = ScreenH - 84.0f;

	DrawPanel(X - 10.0f, Y - 26.0f, 330.0f, 74.0f, PanelColor);
	DrawLabel(FString::Printf(TEXT("Turn %d / %d     Moves left: %d"), Host->Sim.GetTurn(), Host->Sim.GetStage().TurnLimit, Host->Sim.GetMovesLeft()),
		X, Y - 18.0f, BattleTextColor, 1.1f);

	DrawLabel(FString::Printf(TEXT("Score %d   Burst chain %d   Gems %d   Deflector %d"),
		Host->Sim.GetResult().Score, Host->Sim.GetBurstChainCount(), Host->Gems, Host->Sim.GetDeflectorStacks()),
		X, Y, FLinearColor(0.8f, 0.85f, 0.95f, 1.0f));

	DrawLabel(TEXT("LMB select/swap  |  Space end turn  |  1-6 ultimate  |  QWERTY skill  |  H hint  |  G gacha x10  |  R restart"),
		X - 10.0f, Y + 24.0f, FLinearColor(0.6f, 0.65f, 0.75f, 1.0f));

	if (!Host->LastMessage.IsEmpty())
	{
		DrawLabel(Host->LastMessage, X, Y + 40.0f, FLinearColor(0.95f, 0.85f, 0.55f, 1.0f));
	}
}

void ABattleHUD::DrawLogPanel(float ScreenW)
{
	FMatchRPGSimHost* Host = CachedBoard != nullptr ? CachedBoard->GetSimHostMutable() : nullptr;
	if (Host == nullptr) { return; }

	const TArray<MatchRPG::FBattleEvent>& Log = Host->Sim.GetLog();
	const int32 MaxLines = 12;
	const int32 First = FMath::Max(0, Log.Num() - MaxLines);

	const float X = ScreenW - 356.0f;
	const float Y = 130.0f;

	DrawPanel(X - 10.0f, Y - 10.0f, 346.0f, 24.0f + (Log.Num() - First) * 18.0f, PanelColor);
	DrawLabel(TEXT("BATTLE LOG"), X, Y, BattleTextColor, 1.0f);

	float LineY = Y + 20.0f;
	for (int32 i = First; i < Log.Num(); ++i)
	{
		// Wording lives in DescribeBattleEvent() so the screen feed and the Output
		// Log can never disagree about what just happened.
		DrawLabel(DescribeBattleEvent(Log[i]), X, LineY, FLinearColor(0.78f, 0.82f, 0.9f, 1.0f));
		LineY += 18.0f;
	}
}

void ABattleHUD::DrawResultOverlay(float ScreenW, float ScreenH)
{
	FMatchRPGSimHost* Host = CachedBoard != nullptr ? CachedBoard->GetSimHostMutable() : nullptr;
	if (Host == nullptr) { return; }

	const MatchRPG::FBattleResult& Result = Host->Sim.GetResult();

	const float Width = 520.0f;
	const float Height = 190.0f;
	const float X = ScreenW * 0.5f - Width * 0.5f;
	const float Y = ScreenH * 0.5f - Height * 0.5f;

	DrawPanel(X, Y, Width, Height, FLinearColor(0.03f, 0.04f, 0.07f, 0.92f));
	DrawLabel(Result.bVictory ? TEXT("STAGE CLEAR") : TEXT("DEFEAT"),
		X + 24.0f, Y + 20.0f, Result.bVictory ? FLinearColor(0.45f, 0.95f, 0.5f, 1.0f) : FLinearColor(0.95f, 0.4f, 0.4f, 1.0f), 1.6f);

	FString Stars;
	for (int32 i = 0; i < 3; ++i)
	{
		Stars += (i < Result.Stars) ? TEXT("* ") : TEXT("- ");
	}
	DrawLabel(FString::Printf(TEXT("Rating %s   (%d/3)"), *Stars, Result.Stars), X + 24.0f, Y + 62.0f, FLinearColor(1.0f, 0.9f, 0.4f, 1.0f), 1.2f);

	DrawLabel(FString::Printf(TEXT("Turns used: %d    Score: %d    Breaks: %d    Obstacles cleared: %d"),
		Result.TurnsUsed, Result.Score, Result.Breaks, Result.ObstaclesCleared),
		X + 24.0f, Y + 92.0f, BattleTextColor);

	DrawLabel(FString::Printf(TEXT("Objectives %d / %d met"), Result.ObjectivesMet, Result.ObjectivesTotal),
		X + 24.0f, Y + 116.0f, BattleTextColor);

	DrawLabel(TEXT("Press R to restart the stage"), X + 24.0f, Y + 148.0f, FLinearColor(0.7f, 0.75f, 0.85f, 1.0f));
}
