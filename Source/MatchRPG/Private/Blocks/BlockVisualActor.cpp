// Copyright MatchRPG. One 3D block on the board.
#include "Blocks/BlockVisualActor.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"

ABlockVisualActor::ABlockVisualActor()
{
	PrimaryActorTick.bCanEverTick = true;

	MeshComponent = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("BlockMesh"));
	SetRootComponent(MeshComponent);

	// Blocks are pure presentation: no collision, no shadows, no physics.
	MeshComponent->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	MeshComponent->SetGenerateOverlapEvents(false);
	MeshComponent->SetCastShadow(false);
	MeshComponent->SetMobility(EComponentMobility::Movable);
}

void ABlockVisualActor::ApplyStyle(UStaticMesh* Mesh, UMaterialInterface* BaseMaterial, const FLinearColor& Color, float InScaleMultiplier)
{
	if (Mesh != nullptr && MeshComponent->GetStaticMesh() != Mesh)
	{
		MeshComponent->SetStaticMesh(Mesh);
	}

	if (BaseMaterial != nullptr)
	{
		// One dynamic instance per actor so each block can carry its own colour.
		if (DynamicMaterial == nullptr || AppliedBaseMaterial != BaseMaterial)
		{
			DynamicMaterial = UMaterialInstanceDynamic::Create(BaseMaterial, this);
			AppliedBaseMaterial = BaseMaterial;
			MeshComponent->SetMaterial(0, DynamicMaterial);
		}
	}

	if (DynamicMaterial != nullptr)
	{
		// BasicShapeMaterial exposes "Color"; a few other engine materials use
		// "BaseColor". Setting a parameter a material does not declare is harmless.
		DynamicMaterial->SetVectorParameterValue(TEXT("Color"), Color);
		DynamicMaterial->SetVectorParameterValue(TEXT("BaseColor"), Color);
	}

	TargetScaleMultiplier = FMath::Max(0.05f, InScaleMultiplier);
}

void ABlockVisualActor::SetTarget(const FVector& InLocation, float InScale, bool bInVisible)
{
	TargetLocation = InLocation;
	TargetScale = InScale;
	bTargetVisible = bInVisible;
}

void ABlockVisualActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// Fast, frame-rate independent easing: blocks snap into place but still read
	// as "falling" rather than teleporting.
	const float DesiredScale = bTargetVisible ? (TargetScale * TargetScaleMultiplier) : 0.0f;
	CurrentAlpha = FMath::FInterpTo(CurrentAlpha, bTargetVisible ? 1.0f : 0.0f, DeltaSeconds, 18.0f);
	CurrentScale = FMath::FInterpTo(CurrentScale, DesiredScale, DeltaSeconds, 16.0f);

	SetActorLocation(FMath::VInterpTo(GetActorLocation(), TargetLocation, DeltaSeconds, 16.0f));
	MeshComponent->SetWorldScale3D(FVector(CurrentScale));

	const bool bRendered = bTargetVisible || CurrentScale > 0.02f;
	if (MeshComponent->IsVisible() != bRendered)
	{
		MeshComponent->SetVisibility(bRendered, true);
	}
}
