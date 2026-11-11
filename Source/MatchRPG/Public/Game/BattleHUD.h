// Copyright MatchRPG. Canvas HUD: boss bars, team status, objectives, log.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"

#include "BattleHUD.generated.h"

class ABoardGridActor;

/**
 * ABattleHUD
 *
 * Draws the whole battle UI with plain Canvas calls. Deliberately no UMG: the
 * project has no .uasset content at all, so the HUD must be able to render from
 * pure code the moment the level starts. Replacing it with a UMG widget later is
 * a self-contained change.
 */
UCLASS()
class MATCHRPG_API ABattleHUD : public AHUD
{
	GENERATED_BODY()

public:
	ABattleHUD();

	virtual void BeginPlay() override;
	virtual void DrawHUD() override;

private:
	ABoardGridActor* FindBoardActor();

	void DrawBossPanel(float ScreenW);
	void DrawTeamPanel(float ScreenW, float ScreenH);
	void DrawObjectivePanel(float ScreenH);
	void DrawLogPanel(float ScreenW);
	void DrawTurnPanel(float ScreenW, float ScreenH);
	void DrawResultOverlay(float ScreenW, float ScreenH);
	void DrawLabel(const FString& Text, float X, float Y, const FLinearColor& Color, float Scale = 1.0f);
	void DrawBar(float X, float Y, float Width, float Height, float Fraction, const FLinearColor& FillColor, const FLinearColor& BackColor);
	void DrawPanel(float X, float Y, float Width, float Height, const FLinearColor& Color);

	UPROPERTY(Transient)
	TObjectPtr<ABoardGridActor> CachedBoard;
};
