// Copyright MatchRPG. The playable board: mirrors the core grid into 3D blocks.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/MatchFinderCore.h"

#include "BoardGridActor.generated.h"

class ABlockVisualActor;
class UMatchRPGBlockPaletteAsset;
struct FMatchRPGSimHost;

UENUM(BlueprintType)
enum class EBoardAnimPhase : uint8
{
	Idle,
	SwapSlide,
	InvalidSwapSlide,
	InvalidSwapReturn,
	MatchHighlight,
	BreakPop,
	GravityFall,
	RefillDrop
};

/**
 * ABoardGridActor
 *
 * Owns the session (FMatchRPGSimHost: roster, gacha, battle simulation) and keeps
 * a pool of ABlockVisualActor in sync with the board inside that simulation.
 *
 * Implements AnimationStepQueue to play sequential step-by-step match-3 animations:
 * Swap (140ms) -> Highlight (100ms) -> Break (120ms) -> Gravity (180ms) -> Refill (160ms).
 */
UCLASS()
class MATCHRPG_API ABoardGridActor : public AActor
{
	GENERATED_BODY()

public:
	ABoardGridActor();
	virtual ~ABoardGridActor() override;

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	/** Optional: assign one in the level, otherwise a built-in palette is used. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MatchRPG")
	TObjectPtr<UMatchRPGBlockPaletteAsset> PaletteAsset;

	/** Fully rebuilds the visual pool (needed when the grid size changes). */
	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	void RebuildViews();

	/** Pushes the current simulation state into the block actors. Call after any action. */
	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	void RefreshViews();

	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	void StartBattle(int32 StageNumber, int32 Seed);

	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	void RestartBattle();

	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	void EndTurn();

	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	bool FireUltimate(int32 SlotIndex);

	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	bool FireManualSkill(int32 SlotIndex);

	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	FString PullTenGacha();

	/** Cell the player currently has selected (-1 when nothing is selected). */
	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	int32 GetSelectedX() const;

	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	int32 GetSelectedY() const;

	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	void ClearSelection();

	/** Converts a screen position into a board cell. False when the ray misses. */
	bool PickCellFromScreen(class APlayerController* PlayerController, float ScreenX, float ScreenY, int32& OutX, int32& OutY) const;

	/** Click handling: select, then swap, queued through AnimationStepQueue. */
	bool HandleBoardClick(class APlayerController* PlayerController, float ScreenX, float ScreenY);

	/** Board -> world mapping, also used for the boss placeholder. */
	FVector GetCellWorldLocation(int32 X, int32 Y) const;
	FVector GetBoardOrigin() const;
	float GetCellSize() const;

	// -- read access for the HUD -------------------------------------------------
	const FMatchRPGSimHost* GetSimHost() const { return SimHost; }
	FMatchRPGSimHost* GetSimHostMutable() { return SimHost; }

	/** True while any step animation is currently playing (input locked). */
	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	bool IsAnimating() const { return AnimPhase != EBoardAnimPhase::Idle; }

	/** Punchy camera / board shake (4px amplitude, 80ms duration). */
	UFUNCTION(BlueprintCallable, Category = "MatchRPG")
	void TriggerCameraShake(float AmplitudeUnits = 4.0f, float DurationSeconds = 0.08f);

private:
	void ApplyPaletteDefaults();
	void ConfigureBlockView(ABlockVisualActor& View, int32 X, int32 Y) const;
	void ConfigureBlockViewFromCell(ABlockVisualActor& View, const MatchRPG::FBlockCell& Cell) const;

	void UpdateAnimationQueue(float DeltaSeconds);
	void StartSwapAnimation(int32 AX, int32 AY, int32 BX, int32 BY, bool bValidSwap);
	void EnterAnimPhase(EBoardAnimPhase NewPhase, float Duration);
	void PlayCascadeStep(int32 StepIndex);

	UPROPERTY()
	TArray<TObjectPtr<ABlockVisualActor>> BlockViews;

	/** Board geometry: the grid is centred on this actor's origin. */
	UPROPERTY(EditAnywhere, Category = "MatchRPG|Layout")
	float CellSize = 120.0f;

	UPROPERTY(EditAnywhere, Category = "MatchRPG|Layout")
	float BlockHeightScale = 0.55f;

	/** Runtime-only palette built from engine primitives when no asset is assigned. */
	UPROPERTY(Transient)
	TObjectPtr<UMatchRPGBlockPaletteAsset> RuntimePalette;

	FMatchRPGSimHost* SimHost = nullptr;

	// Animation Step Queue State
	EBoardAnimPhase AnimPhase = EBoardAnimPhase::Idle;
	float AnimPhaseTimer = 0.0f;
	float AnimPhaseDuration = 0.0f;

	int32 AnimSwapAX = INDEX_NONE;
	int32 AnimSwapAY = INDEX_NONE;
	int32 AnimSwapBX = INDEX_NONE;
	int32 AnimSwapBY = INDEX_NONE;

	MatchRPG::FResolveOutcome CurrentOutcome;
	int32 CurrentCascadeStep = 0;

	// Camera / Board shake
	float CameraShakeTimer = 0.0f;
	float CameraShakeDuration = 0.08f;
	float CameraShakeAmplitude = 4.0f;
	FVector OriginalActorLocation = FVector::ZeroVector;
};
