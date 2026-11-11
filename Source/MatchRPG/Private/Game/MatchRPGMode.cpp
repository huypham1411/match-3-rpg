// Copyright MatchRPG. Game mode + procedural arena bootstrap.
#include "Game/MatchRPGMode.h"

#include "Battle/MatchRPGSimHost.h"
#include "Board/BoardGridActor.h"
#include "Content/MatchRPGAssets.h"
#include "Core/MatchTypes.h"
#include "Game/BattleHUD.h"
#include "Game/MatchRPGPlayerController.h"

#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"

AMatchRPGMode::AMatchRPGMode()
{
	// The board is driven by the mouse cursor and key bindings on the controller,
	// so no pawn is needed.
	DefaultPawnClass = nullptr;
	PlayerControllerClass = AMatchRPGPlayerController::StaticClass();
	HUDClass = ABattleHUD::StaticClass();
}

void AMatchRPGMode::BeginPlay()
{
	Super::BeginPlay();

	if (bBuildArenaAutomatically)
	{
		EnsureArenaSetup();
	}
}

void AMatchRPGMode::EnsureArenaSetup()
{
	UWorld* World = GetWorld();
	if (World == nullptr) { return; }

	EnsureBoard();
	EnsureLighting();
	EnsureBossPlaceholder();
	EnsureCamera();
}

void AMatchRPGMode::EnsureBoard()
{
	UWorld* World = GetWorld();
	if (World == nullptr) { return; }

	// Reuse a board that is already placed in the level.
	if (BoardActor == nullptr)
	{
		for (TActorIterator<ABoardGridActor> It(World); It; ++It)
		{
			BoardActor = *It;
			break;
		}
	}

	if (BoardActor == nullptr)
	{
		FActorSpawnParameters SpawnParameters;
		SpawnParameters.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		BoardActor = World->SpawnActor<ABoardGridActor>(ABoardGridActor::StaticClass(), FVector::ZeroVector, FRotator::ZeroRotator, SpawnParameters);
	}

	if (BoardActor != nullptr && BlockPalette != nullptr)
	{
		BoardActor->PaletteAsset = BlockPalette;
	}
}

void AMatchRPGMode::EnsureLighting()
{
	UWorld* World = GetWorld();
	if (World == nullptr) { return; }

	// Keep the level's own lighting when it already has a directional light.
	for (TActorIterator<ADirectionalLight> It(World); It; ++It)
	{
		return;
	}

	FActorSpawnParameters SpawnParameters;
	SpawnParameters.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	// Key light: high and slightly to the side.
	ADirectionalLight* KeyLight = World->SpawnActor<ADirectionalLight>(
		ADirectionalLight::StaticClass(), FVector(0.0f, 0.0f, 1500.0f), FRotator(-55.0f, -35.0f, 0.0f), SpawnParameters);

	// Fill light from the opposite side so unlit block faces stay readable.
	ADirectionalLight* FillLight = World->SpawnActor<ADirectionalLight>(
		ADirectionalLight::StaticClass(), FVector(0.0f, 0.0f, 1500.0f), FRotator(30.0f, 145.0f, 0.0f), SpawnParameters);

	if (KeyLight != nullptr)
	{
		if (ULightComponent* LightComponent = KeyLight->GetLightComponent())
		{
			LightComponent->SetIntensity(3.5f);
		}
	}
	if (FillLight != nullptr)
	{
		if (ULightComponent* LightComponent = FillLight->GetLightComponent())
		{
			LightComponent->SetIntensity(1.2f);
		}
	}
}

void AMatchRPGMode::EnsureBossPlaceholder()
{
	UWorld* World = GetWorld();
	if (World == nullptr || BossPlaceholder != nullptr) { return; }

	FActorSpawnParameters SpawnParameters;
	SpawnParameters.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	// Spawn a bare actor and give it a runtime-created movable component: a
	// level-placed AStaticMeshActor would keep its Static mobility and reject
	// SetStaticMesh/SetMaterial after registration.
	const FTransform SpawnTransform(FRotator::ZeroRotator, FVector(0.0f, 780.0f, 300.0f), FVector(1.0f));
	AActor* BossHost = World->SpawnActor<AActor>(AActor::StaticClass(), SpawnTransform, SpawnParameters);
	if (BossHost == nullptr) { return; }
	BossPlaceholder = BossHost;

	UStaticMeshComponent* MeshComponent = NewObject<UStaticMeshComponent>(BossHost, TEXT("BossPlaceholderMesh"));
	if (MeshComponent == nullptr) { return; }

	MeshComponent->SetupAttachment(BossHost->GetRootComponent());
	MeshComponent->RegisterComponent();
	MeshComponent->SetMobility(EComponentMobility::Movable);
	MeshComponent->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	MeshComponent->SetCastShadow(false);
	MeshComponent->SetWorldTransform(SpawnTransform);

	if (UStaticMesh* Sphere = MatchRPGAssets::LoadEngineSphere())
	{
		MeshComponent->SetStaticMesh(Sphere);
	}
	if (UMaterialInterface* BaseMaterial = MatchRPGAssets::LoadDefaultShapeMaterial())
	{
		if (UMaterialInstanceDynamic* Dynamic = UMaterialInstanceDynamic::Create(BaseMaterial, BossHost))
		{
			const FLinearColor BossColor(0.55f, 0.08f, 0.12f, 1.0f);
			Dynamic->SetVectorParameterValue(TEXT("Color"), BossColor);
			Dynamic->SetVectorParameterValue(TEXT("BaseColor"), BossColor);
			MeshComponent->SetMaterial(0, Dynamic);
		}
	}

	// Scale the sphere up to a boss silhouette (the mesh is 100 units across).
	MeshComponent->SetWorldScale3D(FVector(3.2f));
}

void AMatchRPGMode::EnsureCamera()
{
	UWorld* World = GetWorld();
	if (World == nullptr) { return; }

	if (ArenaCamera == nullptr)
	{
		// A single fixed vantage point keeps the whole board readable.
		const FVector CameraLocation(0.0f, -1150.0f, 880.0f);
		const FRotator CameraRotation(-38.0f, 90.0f, 0.0f);

		FActorSpawnParameters SpawnParameters;
		SpawnParameters.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		ArenaCamera = World->SpawnActor<ACameraActor>(ACameraActor::StaticClass(), CameraLocation, CameraRotation, SpawnParameters);
	}

	if (ArenaCamera == nullptr) { return; }

	if (APlayerController* PlayerController = World->GetFirstPlayerController())
	{
		PlayerController->SetViewTarget(ArenaCamera);
	}

	if (BoardActor != nullptr)
	{
		FrameBoard(*BoardActor);
	}
}

void AMatchRPGMode::FrameBoard(ABoardGridActor& Board)
{
	if (ArenaCamera == nullptr) { return; }

	// Pull the camera back just enough that the tallest possible stack still fits.
	const float BoardSize = static_cast<float>(FMath::Max(Board.GetSimHost() != nullptr
		? Board.GetSimHost()->Sim.GetBoard().GetWidth() : 8,
		Board.GetSimHost() != nullptr ? Board.GetSimHost()->Sim.GetBoard().GetHeight() : 8));
	const float Distance = FMath::Max(1150.0f, BoardSize * Board.GetCellSize() * 1.5f);
	const FVector CameraLocation(0.0f, -Distance, Distance * 0.76f);
	const FRotator CameraRotation(-38.0f, 90.0f, 0.0f);

	ArenaCamera->SetActorLocationAndRotation(CameraLocation, CameraRotation);
}
