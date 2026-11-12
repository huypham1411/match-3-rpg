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
	CurrentDisplayColor = Color;

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

void ABlockVisualActor::SetTargetInstant(const FVector& InLocation, float InScale, bool bInVisible)
{
	TargetLocation = InLocation;
	TargetScale = InScale;
	bTargetVisible = bInVisible;
	CurrentScale = bInVisible ? (InScale * TargetScaleMultiplier) : 0.0f;
	SetActorLocation(InLocation);
	MeshComponent->SetWorldScale3D(FVector(CurrentScale));
	MeshComponent->SetVisibility(bInVisible, true);
}

void ABlockVisualActor::TriggerLandingSquash(float Duration)
{
	SquashDuration = FMath::Max(0.01f, Duration);
	SquashTimer = SquashDuration;
}

void ABlockVisualActor::PlayMatchHighlight(float Duration)
{
	HighlightDuration = FMath::Max(0.01f, Duration);
	HighlightTimer = HighlightDuration;
}

void ABlockVisualActor::PlayBreak(float Duration)
{
	BreakDuration = FMath::Max(0.01f, Duration);
	BreakTimer = BreakDuration;
	bIsBreaking = true;
}

void ABlockVisualActor::PlayInvalidSwap(const FVector& InShakeDirection, float Duration)
{
	ShakeDuration = FMath::Max(0.01f, Duration);
	ShakeTimer = ShakeDuration;
	ShakeDirection = InShakeDirection;
}

void ABlockVisualActor::PlaySpecialActivation(uint8 SpecialType)
{
	SpecialPulseDuration = 0.15f;
	SpecialPulseTimer = SpecialPulseDuration;
	ActiveSpecialType = SpecialType;
}

bool ABlockVisualActor::IsPlayingAnimation() const
{
	return SquashTimer > 0.0f || HighlightTimer > 0.0f || BreakTimer > 0.0f || ShakeTimer > 0.0f || SpecialPulseTimer > 0.0f;
}

void ABlockVisualActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// 1. Invalid Swap Shake Offset (damped spring over 120ms)
	FVector ComputedLocation = TargetLocation;
	if (ShakeTimer > 0.0f)
	{
		ShakeTimer = FMath::Max(0.0f, ShakeTimer - DeltaSeconds);
		const float Progress = 1.0f - (ShakeTimer / ShakeDuration);
		const float Decay = FMath::Exp(-Progress * 6.0f);
		const float Oscillation = FMath::Sin(Progress * 28.0f) * Decay * 20.0f;
		ComputedLocation += ShakeDirection * Oscillation;
	}
	SetActorLocation(FMath::VInterpTo(GetActorLocation(), ComputedLocation, DeltaSeconds, 22.0f));

	// 2. Squash & Stretch: Z -15%, XY +8% in 40ms
	FVector SquashVector(1.0f, 1.0f, 1.0f);
	if (SquashTimer > 0.0f)
	{
		SquashTimer = FMath::Max(0.0f, SquashTimer - DeltaSeconds);
		const float Progress = 1.0f - (SquashTimer / SquashDuration);
		const float Wave = FMath::Sin(Progress * PI);
		SquashVector.Z = 1.0f - 0.15f * Wave;  // -15%
		SquashVector.X = 1.0f + 0.08f * Wave;  // +8%
		SquashVector.Y = 1.0f + 0.08f * Wave;  // +8%
	}

	// 3. Break pop & Scale interpolation
	float DesiredScale = bTargetVisible ? (TargetScale * TargetScaleMultiplier) : 0.0f;
	if (bIsBreaking && BreakTimer > 0.0f)
	{
		BreakTimer = FMath::Max(0.0f, BreakTimer - DeltaSeconds);
		const float Ratio = BreakTimer / BreakDuration;
		DesiredScale = TargetScale * TargetScaleMultiplier * (Ratio * 1.15f);
		if (BreakTimer <= 0.0f)
		{
			bIsBreaking = false;
			bTargetVisible = false;
			DesiredScale = 0.0f;
			CurrentScale = 0.0f;
		}
	}

	CurrentScale = FMath::FInterpTo(CurrentScale, DesiredScale, DeltaSeconds, 18.0f);
	MeshComponent->SetWorldScale3D(FVector(CurrentScale) * SquashVector);

	// 4. Color, Match Highlight Flash & Special pulses
	FLinearColor EffectiveColor = CurrentDisplayColor;
	if (HighlightTimer > 0.0f)
	{
		HighlightTimer = FMath::Max(0.0f, HighlightTimer - DeltaSeconds);
		const float Pulse = (HighlightTimer / HighlightDuration);
		EffectiveColor = FMath::Lerp(CurrentDisplayColor, FLinearColor(2.8f, 2.8f, 2.8f, 1.0f), Pulse);
	}
	if (SpecialPulseTimer > 0.0f)
	{
		SpecialPulseTimer = FMath::Max(0.0f, SpecialPulseTimer - DeltaSeconds);
		const float Pulse = (SpecialPulseTimer / SpecialPulseDuration);
		if (ActiveSpecialType == 1 || ActiveSpecialType == 2) // LineRow / LineCol (Laser blue)
		{
			EffectiveColor = FMath::Lerp(EffectiveColor, FLinearColor(1.5f, 2.5f, 4.0f, 1.0f), Pulse);
		}
		else if (ActiveSpecialType == 3) // AreaBomb (Fiery orange)
		{
			EffectiveColor = FMath::Lerp(EffectiveColor, FLinearColor(4.0f, 1.8f, 0.3f, 1.0f), Pulse);
		}
		else if (ActiveSpecialType == 4) // SquareBreaker (Acoustic cyan)
		{
			EffectiveColor = FMath::Lerp(EffectiveColor, FLinearColor(0.5f, 3.2f, 3.0f, 1.0f), Pulse);
		}
		else if (ActiveSpecialType == 5) // SwapAll (Electric gold)
		{
			EffectiveColor = FMath::Lerp(EffectiveColor, FLinearColor(4.0f, 3.2f, 0.6f, 1.0f), Pulse);
		}
	}

	if (DynamicMaterial != nullptr)
	{
		DynamicMaterial->SetVectorParameterValue(TEXT("Color"), EffectiveColor);
		DynamicMaterial->SetVectorParameterValue(TEXT("BaseColor"), EffectiveColor);
	}

	const bool bRendered = bTargetVisible || CurrentScale > 0.02f;
	if (MeshComponent->IsVisible() != bRendered)
	{
		MeshComponent->SetVisibility(bRendered, true);
	}
}
