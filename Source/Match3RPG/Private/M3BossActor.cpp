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

	const M3::FEnemyState* Enemy = GetOwnEnemy();
	if (!Enemy) { SetActorHiddenInGame(true); return; }

	// Địch đã gục -> ẩn hẳn actor của nó đi (UI web vẽ mờ, còn 3D thì ẩn cho gọn).
	if (!Enemy->bAlive)
	{
		SetActorHiddenInGame(true);
		return;
	}
	SetActorHiddenInGame(false);

	// Cấp bậc quyết định kích thước gốc: quái thường nhỏ, trùm to.
	float TierScale = 0.55f;
	FLinearColor TierTint(0.45f, 0.55f, 0.35f);
	switch (Enemy->Tier())
	{
	case M3::EEnemyTier::Elite:   TierScale = 0.85f; TierTint = FLinearColor(0.30f, 0.55f, 0.90f); break;
	case M3::EEnemyTier::MidBoss: TierScale = 1.55f; TierTint = FLinearColor(0.95f, 0.55f, 0.15f); break;
	case M3::EEnemyTier::Boss:    TierScale = 2.20f; TierTint = FLinearColor(0.85f, 0.12f, 0.25f); break;
	default: break;
	}

	const FVector BaseScale = (VisualSet ? VisualSet->BossVisual.Scale : FVector(3.f)) * TierScale;
	const FLinearColor BaseTint = TierTint;

	// Địch nhỏ dần khi mất máu (phản hồi trực quan rất dễ đọc).
	const float HpPercent = FMath::Clamp(Enemy->HpPercent(), 0.05f, 1.f);
	Mesh->SetWorldScale3D(BaseScale * (0.45f + 0.55f * HpPercent));

	// Khi BREAK: xoay nhanh + đổi màu sáng.
	if (Enemy->bBroken)
	{
		SpinSpeed = 260.f;
		if (DynMat) { DynMat->SetVectorParameterValue(TEXT("Color"), FLinearColor(1.f, 0.9f, 0.25f)); }
	}
	else
	{
		SpinSpeed = 30.f;
		if (DynMat) { DynMat->SetVectorParameterValue(TEXT("Color"), BaseTint); }
	}

	// Địch đang bị ngất thì hạ thấp xuống một chút cho dễ nhận ra.
	const float Z = Enemy->bBroken ? 60.f : 110.f;
	SetActorLocation(FVector(GetActorLocation().X, GetActorLocation().Y, Z));
}

// -----------------------------------------------------------------------------
// Gán actor theo 1 địch cụ thể; cấp bậc quyết định kích thước / màu.
// -----------------------------------------------------------------------------
void AM3BossActor::SetupForEnemy(int32 InEnemyIndex, UM3VisualSet* InVisualSet)
{
	EnemyIndex = InEnemyIndex;
	if (InVisualSet) { VisualSet = InVisualSet; }
	RefreshFromBattle();
}

// Trạng thái động của ĐÚNG địch mà actor này đang thể hiện.
const M3::FEnemyState* AM3BossActor::GetOwnEnemy() const
{
	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat || !Combat->IsBattleActive()) { return nullptr; }

	const M3::FBattle& Battle = Combat->GetBattle();
	return Battle.TryGetEnemy(EnemyIndex);
}
