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
 * whatever the board says it should look like. That is why the whole 3D look can
 * be replaced (cube -> character statue -> animated prop) without the gameplay
 * noticing.
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

	bool IsVisiblyEmpty() const { return !bTargetVisible; }

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

	FVector TargetLocation = FVector::ZeroVector;
	float TargetScale = 1.0f;
	float TargetScaleMultiplier = 1.0f;
	float CurrentScale = 1.0f;
	bool bTargetVisible = true;
	float CurrentAlpha = 1.0f;
};
