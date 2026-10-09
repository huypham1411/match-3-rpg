// =============================================================================
//  M3PlayerPawn.cpp
// =============================================================================
#include "M3PlayerPawn.h"

#include "Camera/CameraComponent.h"
#include "EngineUtils.h"
#include "M3BoardActor.h"

AM3PlayerPawn::AM3PlayerPawn()
{
	PrimaryActorTick.bCanEverTick = true;

	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
	SetRootComponent(Camera);
	Camera->SetFieldOfView(70.f);
}

void AM3PlayerPawn::BeginPlay()
{
	Super::BeginPlay();
	TryPlaceCamera();
}

void AM3PlayerPawn::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// Bàn có thể được sinh ra sau pawn 1-2 frame -> thử lại cho tới khi đặt được camera.
	if (!bCameraPlaced) { TryPlaceCamera(); }
}

void AM3PlayerPawn::TryPlaceCamera()
{
	UWorld* World = GetWorld();
	if (!World) { return; }

	for (TActorIterator<AM3BoardActor> It(World); It; ++It)
	{
		if (AM3BoardActor* Board = *It)
		{
			SetActorLocation(Board->GetIdealCameraLocation());
			SetActorRotation(Board->GetIdealCameraRotation());
			bCameraPlaced = true;
			return;
		}
	}
}
