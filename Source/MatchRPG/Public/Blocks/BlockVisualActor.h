// Copyright MatchRPG. One 3D block on the board.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"

#include "BlockVisualActor.generated.h"

class UStaticMeshComponent;
class UStaticMesh;
class UMaterialInterface;
class UMaterialInstanceDynamic;

/**
 * ABlockVisualActor
 *
 * A single block. The match-3 rules never touch this class - it only mirrors a
 * cell of FMatchBoardCore as a mesh with a colour, and slides/scales towards
 * whatever the board says it should look like.
 */
UCLASS()
class MATCHRPG_API ABlockVisualActor : public AActor
{
	GENERATED_BODY()

public:
	ABlockVisualActor();

	/** Applies the look of a board cell. Passing an obstacle style switches the mesh. */
	void ApplyStyle(UStaticMesh* Mesh, UMaterialInterface* BaseMaterial, const FLinearColor& Color, float InScaleMultiplier);

	/** Where the block wants to be; Tick interpolates towards it. */
	void SetTarget(const FVector& InLocation, float InScale, bool bInVisible);

	/** Instantly places block without interpolation (used before drop animation). */
	void SetTargetInstant(const FVector& InLocation, float InScale, bool bInVisible);

	/** Squash & stretch upon landing: Z -15%, XY +8% in 40ms. */
	void TriggerLandingSquash(float Duration = 0.04f);

	/** Flashes block before break (100ms). */
	void PlayMatchHighlight(float Duration = 0.10f);

	/** Breaks/pops block to zero scale (120ms). */
	void PlayBreak(float Duration = 0.12f);

	/** Invalid swap: elastic slide back and shake (120ms). */
	void PlayInvalidSwap(const FVector& InShakeDirection, float Duration = 0.12f);

	/** Distinctive VFX pulse for special block detonation. */
	void PlaySpecialActivation(uint8 SpecialType);

	bool IsVisiblyEmpty() const { return !bTargetVisible && CurrentScale <= 0.02f; }
	bool IsPlayingAnimation() const;

	virtual void Tick(float DeltaSeconds) override;

protected:
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Block")
	TObjectPtr<UStaticMeshComponent> MeshComponent;

private:
	UPROPERTY(Transient)
	TObjectPtr<UMaterialInstanceDynamic> DynamicMaterial;

	/** Which material the dynamic instance above was created from. */
	UPROPERTY(Transient)
	TObjectPtr<UMaterialInterface> AppliedBaseMaterial;

	FLinearColor CurrentDisplayColor = FLinearColor::White;

	FVector TargetLocation = FVector::ZeroVector;
	float TargetScale = 1.0f;
	float TargetScaleMultiplier = 1.0f;
	float CurrentScale = 1.0f;
	bool bTargetVisible = true;
	float CurrentAlpha = 1.0f;

	// Squash & Stretch
	float SquashDuration = 0.04f;
	float SquashTimer = 0.0f;

	// Match Highlight Flash
	float HighlightDuration = 0.10f;
	float HighlightTimer = 0.0f;

	// Break / Pop
	float BreakDuration = 0.12f;
	float BreakTimer = 0.0f;
	bool bIsBreaking = false;

	// Invalid Swap Shake
	float ShakeDuration = 0.12f;
	float ShakeTimer = 0.0f;
	FVector ShakeDirection = FVector::ZeroVector;

	// Special Activation Flash
	float SpecialPulseDuration = 0.15f;
	float SpecialPulseTimer = 0.0f;
	uint8 ActiveSpecialType = 0;
};
