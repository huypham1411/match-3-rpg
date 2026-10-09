// =============================================================================
//  M3BossActor.cpp
// =============================================================================
#include "M3BossActor.h"

#include "Components/SkeletalMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"

AM3BossActor::AM3BossActor()
{
	PrimaryActorTick.bCanEverTick = true;

	Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("BossMesh"));
	SetRootComponent(Mesh);
	Mesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

void AM3BossActor::BeginPlay()
{
	Super::BeginPlay();

	if (!VisualSet) { VisualSet = UM3VisualSet::CreateDefaultVisualSet(this); }

	if (VisualSet)
	{
		const FM3BlockVisual Visual = VisualSet->BossVisual;
		Mesh->SetStaticMesh(Visual.Mesh);
		if (Visual.Material)
		{
			DynMat = UMaterialInstanceDynamic::Create(Visual.Material, this);
			DynMat->SetVectorParameterValue(TEXT("Color"), Visual.Tint);
			Mesh->SetMaterial(0, DynMat);
		}
		Mesh->SetWorldScale3D(Visual.Scale);
	}

	RefreshFromBattle();
}

UM3CombatSubsystem* AM3BossActor::GetCombat() const
{
	if (const UWorld* World = GetWorld())
	{
		if (UGameInstance* GameInstance = World->GetGameInstance())
		{
			return GameInstance->GetSubsystem<UM3CombatSubsystem>();
		}
	}
	return nullptr;
}

void AM3BossActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	AddActorLocalRotation(FRotator(0.f, SpinSpeed * DeltaSeconds, 0.f));

	RefreshFromBattle();
}

void AM3BossActor::RefreshFromBattle()
{
	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat || !Combat->IsBattleActive()) { return; }

	const M3::FBossState& Boss = Combat->GetBattle().Boss();
	const FVector BaseScale = VisualSet ? VisualSet->BossVisual.Scale : FVector(3.f);
	const FLinearColor BaseTint = VisualSet ? VisualSet->BossVisual.Tint : FLinearColor(0.85f, 0.12f, 0.25f);

	// Boss nhỏ dần khi mất máu (phản hồi trực quan rất dễ đọc).
	const float HpPercent = FMath::Clamp(Boss.HpPercent(), 0.05f, 1.f);
	Mesh->SetWorldScale3D(BaseScale * (0.45f + 0.55f * HpPercent));

	// Khi BREAK: xoay nhanh + đổi màu sáng.
	if (Boss.bBroken)
	{
		SpinSpeed = 260.f;
		if (DynMat) { DynMat->SetVectorParameterValue(TEXT("Color"), FLinearColor(1.f, 0.9f, 0.25f)); }
	}
	else
	{
		SpinSpeed = 30.f;
		if (DynMat) { DynMat->SetVectorParameterValue(TEXT("Color"), BaseTint); }
	}

	// Boss ngất thì hạ thấp xuống một chút cho dễ nhận ra.
	const float Z = Boss.bBroken ? 60.f : 110.f;
	SetActorLocation(FVector(GetActorLocation().X, GetActorLocation().Y, Z));
	(void)BaseTint;
}
