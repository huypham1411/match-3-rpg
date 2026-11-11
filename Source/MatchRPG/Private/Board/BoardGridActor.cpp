// Copyright MatchRPG. The playable board: mirrors the core grid into 3D blocks.
#include "Board/BoardGridActor.h"

#include "Battle/MatchRPGSimHost.h"
#include "Blocks/BlockVisualActor.h"
#include "Content/MatchRPGAssets.h"
#include "Core/MatchTypes.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Materials/MaterialInterface.h"

ABoardGridActor::ABoardGridActor()
{
	PrimaryActorTick.bCanEverTick = true;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	SetRootComponent(Root);
}

ABoardGridActor::~ABoardGridActor()
{
	// FMatchRPGSimHost is a plain C++ object, so nothing else will free it.
	delete SimHost;
	SimHost = nullptr;
}

void ABoardGridActor::BeginPlay()
{
	Super::BeginPlay();

	if (SimHost == nullptr)
	{
		SimHost = new FMatchRPGSimHost();
		SimHost->InitializeDefaults();
	}

	ApplyPaletteDefaults();
	StartBattle(1, 20261007);
}

void ABoardGridActor::ApplyPaletteDefaults()
{
	// Prefer a designer-assigned palette; otherwise build one on the fly so the
	// project runs with an empty Content/ folder.
	RuntimePalette = PaletteAsset;
	if (RuntimePalette == nullptr)
	{
		RuntimePalette = NewObject<UMatchRPGBlockPaletteAsset>(this, TEXT("RuntimeBlockPalette"));
	}
	if (RuntimePalette != nullptr)
	{
		MatchRPGAssets::FillPaletteDefaults(*RuntimePalette);
	}
}

float ABoardGridActor::GetCellSize() const
{
	return FMath::Max(10.0f, CellSize);
}

FVector ABoardGridActor::GetBoardOrigin() const
{
	if (SimHost == nullptr) { return GetActorLocation(); }

	const float Width = static_cast<float>(SimHost->Sim.GetBoard().GetWidth());
	const float Height = static_cast<float>(SimHost->Sim.GetBoard().GetHeight());
	return GetActorLocation() + FVector(-Width * GetCellSize() * 0.5f, -Height * GetCellSize() * 0.5f, 0.0f);
}

FVector ABoardGridActor::GetCellWorldLocation(int32 X, int32 Y) const
{
	const FVector Origin = GetBoardOrigin();
	return Origin + FVector((static_cast<float>(X) + 0.5f) * GetCellSize(), (static_cast<float>(Y) + 0.5f) * GetCellSize(), 0.0f);
}

void ABoardGridActor::StartBattle(int32 StageNumber, int32 Seed)
{
	if (SimHost == nullptr) { return; }

	SimHost->StartBattle(StageNumber, Seed);
	RebuildViews();
}

void ABoardGridActor::RestartBattle()
{
	if (SimHost == nullptr) { return; }
	SimHost->RestartBattle();
	RebuildViews();
}

void ABoardGridActor::RebuildViews()
{
	if (SimHost == nullptr) { return; }

	for (int32 i = 0; i < BlockViews.Num(); ++i)
	{
		if (BlockViews[i] != nullptr) { BlockViews[i]->Destroy(); }
	}
	BlockViews.Reset();

	UWorld* World = GetWorld();
	if (World == nullptr) { return; }

	const int32 Count = SimHost->Sim.GetBoard().GetCellCount();
	BlockViews.Reserve(Count);

	FActorSpawnParameters SpawnParameters;
	SpawnParameters.Owner = this;
	SpawnParameters.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	for (int32 Index = 0; Index < Count; ++Index)
	{
		const int32 X = Index % SimHost->Sim.GetBoard().GetWidth();
		const int32 Y = Index / SimHost->Sim.GetBoard().GetWidth();

		ABlockVisualActor* View = World->SpawnActor<ABlockVisualActor>(
			ABlockVisualActor::StaticClass(), GetCellWorldLocation(X, Y), FRotator::ZeroRotator, SpawnParameters);

		if (View != nullptr)
		{
			View->SetActorLocation(GetCellWorldLocation(X, Y));
			ConfigureBlockView(*View, X, Y);
		}
		BlockViews.Add(View);
	}

	RefreshViews();
}

void ABoardGridActor::ConfigureBlockView(ABlockVisualActor& View, int32 X, int32 Y) const
{
	if (SimHost == nullptr || RuntimePalette == nullptr) { return; }

	const MatchRPG::FMatchBoardCore& Board = SimHost->Sim.GetBoard();
	if (!Board.IsInBounds(X, Y)) { return; }

	const MatchRPG::FBlockCell& Cell = Board.At(X, Y);

	UStaticMesh* FallbackMesh = MatchRPGAssets::ResolveMesh(RuntimePalette->FallbackBlockMesh, MatchRPGAssets::LoadEngineCube());
	UMaterialInterface* FallbackMaterial = MatchRPGAssets::ResolveMaterial(RuntimePalette->FallbackMaterial, MatchRPGAssets::LoadDefaultShapeMaterial());
	const float BaseScale = GetCellSize() / 100.0f * 0.92f;

	if (Cell.IsObstacle())
	{
		const int32 StyleIndex = static_cast<int32>(Cell.Obstacle);
		if (RuntimePalette->ObstacleStyles.IsValidIndex(StyleIndex))
		{
			const FMatchRPGObstacleStyle& Style = RuntimePalette->ObstacleStyles[StyleIndex];
			UStaticMesh* Mesh = MatchRPGAssets::ResolveMesh(Style.Mesh, FallbackMesh);
			UMaterialInterface* Material = MatchRPGAssets::ResolveMaterial(Style.Material, FallbackMaterial);
			View.ApplyStyle(Mesh, Material, Style.DisplayColor, Style.ScaleMultiplier);
		}
		return;
	}

	if (Cell.IsNormal())
	{
		const int32 StyleIndex = MatchRPG::IndexFromColor(Cell.Color);
		FLinearColor Color(1.0f, 1.0f, 1.0f, 1.0f);
		UStaticMesh* Mesh = FallbackMesh;
		UMaterialInterface* Material = FallbackMaterial;
		float ScaleMultiplier = 1.0f;

		if (RuntimePalette->ColorStyles.IsValidIndex(StyleIndex))
		{
			const FMatchRPGColorStyle& Style = RuntimePalette->ColorStyles[StyleIndex];
			Color = Style.DisplayColor;
			Mesh = MatchRPGAssets::ResolveMesh(Style.BlockMesh, FallbackMesh);
			Material = MatchRPGAssets::ResolveMaterial(Style.BlockMaterial, FallbackMaterial);
		}

		// Special blocks read as taller, jammed ones as washed out.
		if (Cell.HasSpecial())
		{
			ScaleMultiplier = 1.12f;
			Color = Color * 1.35f;
		}
		if (Cell.bJammed)
		{
			Color = FLinearColor(0.35f, 0.35f, 0.38f, 1.0f);
		}
		if (Cell.bLocked)
		{
			Color = Color * 0.7f;
		}

		(void)BaseScale;
		View.ApplyStyle(Mesh, Material, Color, ScaleMultiplier);
	}
}

void ABoardGridActor::RefreshViews()
{
	if (SimHost == nullptr) { return; }

	const MatchRPG::FMatchBoardCore& Board = SimHost->Sim.GetBoard();
	const int32 Width = Board.GetWidth();
	const float Scale = GetCellSize() / 100.0f * 0.92f;

	for (int32 Index = 0; Index < BlockViews.Num(); ++Index)
	{
		ABlockVisualActor* View = BlockViews[Index];
		if (View == nullptr) { continue; }

		const int32 X = Index % Width;
		const int32 Y = Index / Width;
		if (!Board.IsInBounds(X, Y)) { continue; }

		ConfigureBlockView(*View, X, Y);

		const MatchRPG::FBlockCell& Cell = Board.At(X, Y);
		const bool bVisible = Cell.IsNormal() || Cell.IsObstacle();

		FVector Location = GetCellWorldLocation(X, Y);
		if (Cell.IsObstacle()) { Location.Z += 10.0f; }
		if (Cell.HasSpecial()) { Location.Z += 25.0f; }

		if (SimHost->SelectedX == X && SimHost->SelectedY == Y)
		{
			Location.Z += 45.0f;
			View->SetTarget(Location, Scale * 1.25f, bVisible);
		}
		else
		{
			View->SetTarget(Location, Scale, bVisible);
		}
	}
}

void ABoardGridActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// Các khối 3D tự chạy hoạt ảnh của chúng. Tick ở đây chỉ làm một việc nhỏ:
	// chép nhật ký trận đấu ra Output Log của Unreal, để khi gỡ lỗi trong editor
	// bạn đọc được đúng những dòng luật mà sân chơi in ra ở chế độ chữ.
	if (SimHost != nullptr)
	{
		SimHost->FlushNewEventsToLog();
	}
}

void ABoardGridActor::EndTurn()
{
	if (SimHost == nullptr) { return; }
	SimHost->EndTurn();
	RefreshViews();
}

bool ABoardGridActor::FireUltimate(int32 SlotIndex)
{
	if (SimHost == nullptr) { return false; }
	const bool bFired = SimHost->FireUltimate(SlotIndex);
	RefreshViews();
	return bFired;
}

bool ABoardGridActor::FireManualSkill(int32 SlotIndex)
{
	if (SimHost == nullptr) { return false; }
	const bool bUsed = SimHost->FireManualSkill(SlotIndex);
	RefreshViews();
	return bUsed;
}

FString ABoardGridActor::PullTenGacha()
{
	if (SimHost == nullptr) { return FString(); }
	return SimHost->PullTenGacha();
}

int32 ABoardGridActor::GetSelectedX() const
{
	return SimHost != nullptr ? SimHost->SelectedX : INDEX_NONE;
}

int32 ABoardGridActor::GetSelectedY() const
{
	return SimHost != nullptr ? SimHost->SelectedY : INDEX_NONE;
}

void ABoardGridActor::ClearSelection()
{
	if (SimHost == nullptr) { return; }
	SimHost->ClearSelection();
	RefreshViews();
}

bool ABoardGridActor::PickCellFromScreen(APlayerController* PlayerController, float ScreenX, float ScreenY, int32& OutX, int32& OutY) const
{
	if (PlayerController == nullptr || SimHost == nullptr) { return false; }

	FVector WorldOrigin;
	FVector WorldDirection;
	if (!PlayerController->DeprojectScreenPositionToWorld(ScreenX, ScreenY, WorldOrigin, WorldDirection))
	{
		return false;
	}

	// Intersect the cursor ray with the plane the board sits on.
	const float BoardZ = GetBoardOrigin().Z;
	if (FMath::IsNearlyZero(WorldDirection.Z))
	{
		return false;
	}
	const float Distance = (BoardZ - WorldOrigin.Z) / WorldDirection.Z;
	if (Distance <= 0.0f)
	{
		return false;
	}

	const FVector Hit = WorldOrigin + WorldDirection * Distance;
	const FVector Local = Hit - GetBoardOrigin();
	const float Size = GetCellSize();

	OutX = FMath::FloorToInt(Local.X / Size);
	OutY = FMath::FloorToInt(Local.Y / Size);

	return SimHost->Sim.GetBoard().IsInBounds(OutX, OutY);
}

bool ABoardGridActor::HandleBoardClick(APlayerController* PlayerController, float ScreenX, float ScreenY)
{
	int32 X = INDEX_NONE;
	int32 Y = INDEX_NONE;
	if (!PickCellFromScreen(PlayerController, ScreenX, ScreenY, X, Y))
	{
		ClearSelection();
		return false;
	}

	if (SimHost == nullptr) { return false; }

	const int32 PreviousX = SimHost->SelectedX;
	const int32 PreviousY = SimHost->SelectedY;

	const bool bSwapped = SimHost->SelectCell(X, Y);
	RefreshViews();

	// A rejected swap should not leave a half-finished selection behind.
	if (!bSwapped && PreviousX != INDEX_NONE && SimHost->SelectedX == INDEX_NONE)
	{
		SimHost->SelectedX = X;
		SimHost->SelectedY = Y;
		RefreshViews();
	}
	return bSwapped;
}
