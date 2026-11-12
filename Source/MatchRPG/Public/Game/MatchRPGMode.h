// Copyright MatchRPG. Game mode + procedural arena bootstrap.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"

#include "MatchRPGMode.generated.h"

class ABoardGridActor;
class ACameraActor;
class AActor;
class UMatchRPGBlockPaletteAsset;
class UMatchRPGStageAsset;

/**
 * AMatchRPGMode
 *
 * The project ships no .umap, no Blueprint and no imported art, so the game mode
 * builds the arena at BeginPlay: camera, lighting, board and a boss placeholder.
 * Pressing Play in *any* empty level is therefore enough to get a running match-3
 * RPG. Named MatchRPGMode to match Config/DefaultEngine.ini.
 */
UCLASS()
class MATCHRPG_API AMatchRPGMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AMatchRPGMode();

	virtual void BeginPlay() override;

	/** Optional: assign a palette DataAsset to restyle every block at once. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MatchRPG")
	TObjectPtr<UMatchRPGBlockPaletteAsset> BlockPalette;

	/** Optional: assign a stage DataAsset to override the built-in demo stage. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MatchRPG")
	TObjectPtr<class UMatchRPGStageAsset> StageOverride;

	/** Set false to keep the level's own camera and lighting. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MatchRPG|Bootstrap")
	bool bBuildArenaAutomatically = true;

	/** Kept for debugging: the actors the bootstrap created. */
	UPROPERTY(Transient)
	TObjectPtr<ABoardGridActor> BoardActor;

	UPROPERTY(Transient)
	TObjectPtr<ACameraActor> ArenaCamera;

	UPROPERTY(Transient)
	TObjectPtr<AActor> BossPlaceholder;

private:
	void EnsureArenaSetup();
	void EnsureLighting();
	void EnsureCamera();
	void EnsureBoard();
	void EnsureBossPlaceholder();

	/** Positions the camera so the whole 8x8 board plus the boss are framed. */
	void FrameBoard(ABoardGridActor& Board);
};
