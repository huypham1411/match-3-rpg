// =============================================================================
//  M3GameMode.cpp
// =============================================================================
#include "M3GameMode.h"

#include "Components/DirectionalLightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Materials/MaterialInstanceDynamic.h"

#include "M3BoardActor.h"
#include "M3BossActor.h"
#include "M3CombatSubsystem.h"
#include "M3HUD.h"
#include "M3PartyMemberActor.h"
#include "M3PlayerController.h"
#include "M3PlayerPawn.h"
#include "M3UETypes.h"
#include "M3VisualSet.h"

AM3GameMode::AM3GameMode()
{
	DefaultPawnClass      = AM3PlayerPawn::StaticClass();
	PlayerControllerClass = AM3PlayerController::StaticClass();
	HUDClass              = AM3HUD::StaticClass();
}

void AM3GameMode::BeginPlay()
{
	Super::BeginPlay();

	if (!VisualSet)
	{
		VisualSet = UM3VisualSet::CreateDefaultVisualSet(this);
	}

	EnsureWorldDecor();
	SpawnGameplayActors();
	LayoutPartyActors();
	RefreshPartyVisuals();
}

// -----------------------------------------------------------------------------
// Sàn + đèn: đủ để nhìn rõ bàn nối trong một level trống
// -----------------------------------------------------------------------------
void AM3GameMode::EnsureWorldDecor()
{
	UWorld* World = GetWorld();
	if (!World) { return; }

	// --- Sàn ---
	bool bHasFloor = false;
	for (TActorIterator<AStaticMeshActor> It(World); It; ++It) { bHasFloor = true; break; }

	if (!bHasFloor && VisualSet)
	{
		const FM3BlockVisual Floor = VisualSet->FloorVisual;
		if (Floor.Mesh)
		{
			AStaticMeshActor* FloorActor = World->SpawnActor<AStaticMeshActor>(FVector(0.f, 0.f, -30.f), FRotator::ZeroRotator);
			if (FloorActor)
			{
				FloorActor->SetMobility(EComponentMobility::Movable);
				if (UStaticMeshComponent* Comp = FloorActor->GetStaticMeshComponent())
				{
					Comp->SetStaticMesh(Floor.Mesh);
					Comp->SetWorldScale3D(Floor.Scale);
					if (Floor.Material)
					{
						if (UMaterialInstanceDynamic* DynMat = UMaterialInstanceDynamic::Create(Floor.Material, FloorActor))
						{
							DynMat->SetVectorParameterValue(TEXT("Color"), Floor.Tint);
							Comp->SetMaterial(0, DynMat);
						}
					}
				}
			}
		}
	}

	// --- Ánh sáng (chỉ sinh nếu level chưa có) ---
	bool bHasLight = false;
	for (TActorIterator<ADirectionalLight> It(World); It; ++It) { bHasLight = true; break; }

	if (!bHasLight)
	{
		if (ADirectionalLight* Sun = World->SpawnActor<ADirectionalLight>(FVector(0.f, 0.f, 1200.f), FRotator(-55.f, 30.f, 0.f)))
		{
			if (UDirectionalLightComponent* Comp = Cast<UDirectionalLightComponent>(Sun->GetLightComponent()))
			{
				Comp->SetMobility(EComponentMobility::Movable);
				Comp->SetIntensity(6.f);
			}
		}
	}

	bool bHasSky = false;
	for (TActorIterator<ASkyLight> It(World); It; ++It) { bHasSky = true; break; }

	if (!bHasSky)
	{
		if (ASkyLight* Sky = World->SpawnActor<ASkyLight>(FVector(0.f, 0.f, 600.f), FRotator::ZeroRotator))
		{
			if (USkyLightComponent* Comp = Sky->GetLightComponent())
			{
				Comp->SetMobility(EComponentMobility::Movable);
				Comp->SetIntensity(1.2f);
			}
		}
	}
}

// -----------------------------------------------------------------------------
// Bàn nối + boss
// -----------------------------------------------------------------------------
void AM3GameMode::SpawnGameplayActors()
{
	UWorld* World = GetWorld();
	if (!World) { return; }

	if (!BoardActor)
	{
		BoardActor = World->SpawnActor<AM3BoardActor>(BoardLocation, FRotator::ZeroRotator);
		if (BoardActor)
		{
			BoardActor->VisualSet = VisualSet;
			BoardActor->CellSize = 110.f;
		}
	}

	if (!BossActor)
	{
		const float Depth = 8 * 110.f;   // kích thước bàn mặc định 8x8
		BossActor = World->SpawnActor<AM3BossActor>(
			BoardLocation + FVector(0.f, Depth * 0.85f, 110.f), FRotator::ZeroRotator);
		if (BossActor)
		{
			BossActor->VisualSet = VisualSet;
		}
	}
}

// -----------------------------------------------------------------------------
// Đội hình: xếp các nhân vật phía trước bàn, mỗi người một vị trí
// -----------------------------------------------------------------------------
void AM3GameMode::LayoutPartyActors()
{
	UWorld* World = GetWorld();
	if (!World) { return; }

	UM3CombatSubsystem* Combat = World->GetGameInstance() ? World->GetGameInstance()->GetSubsystem<UM3CombatSubsystem>() : nullptr;
	const int32 MemberCount = (Combat && Combat->IsBattleActive()) ? Combat->GetBattle().Party().MemberCount() : 4;

	PartyActors.Reset();
	const float RowY = BoardLocation.Y - (8 * 110.f) * 0.62f;

	for (int32 Index = 0; Index < MemberCount; ++Index)
	{
		const float OffsetX = (Index - (MemberCount - 1) * 0.5f) * PartySpacing;
		AM3PartyMemberActor* Actor = World->SpawnActor<AM3PartyMemberActor>(
			BoardLocation + FVector(OffsetX, RowY, 0.f), FRotator::ZeroRotator);
		if (!Actor) { continue; }

		Actor->SetupForMember(Index, VisualSet);
		PartyActors.Add(Actor);
	}
}

void AM3GameMode::RefreshPartyVisuals()
{
	for (int32 i = 0; i < PartyActors.Num(); ++i)
	{
		if (AM3PartyMemberActor* Actor = PartyActors[i])
		{
			Actor->SetupForMember(i, VisualSet);
		}
	}
}

AM3BoardActor* AM3GameMode::GetBoardActor() const
{
	if (BoardActor) { return BoardActor; }

	if (UWorld* World = GetWorld())
	{
		for (TActorIterator<AM3BoardActor> It(World); It; ++It) { return *It; }
	}
	return nullptr;
}

void AM3GameMode::GoToStage(int32 StageIndex)
{
	UWorld* World = GetWorld();
	if (!World) { return; }

	if (UGameInstance* GameInstance = World->GetGameInstance())
	{
		if (UM3CombatSubsystem* Combat = GameInstance->GetSubsystem<UM3CombatSubsystem>())
		{
			Combat->StartStage(StageIndex);
		}
	}

	// Đội hình có thể đổi số người theo map -> dựng lại actor nhân vật.
	for (AM3PartyMemberActor* Actor : PartyActors)
	{
		if (Actor) { Actor->Destroy(); }
	}
	PartyActors.Reset();
	LayoutPartyActors();
}
