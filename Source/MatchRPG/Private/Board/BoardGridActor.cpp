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

	OriginalActorLocation = GetActorLocation();

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

void ABoardGridActor::ConfigureBlockViewFromCell(ABlockVisualActor& View, const MatchRPG::FBlockCell& Cell) const
{
	if (RuntimePalette == nullptr) { return; }

	UStaticMesh* FallbackMesh = MatchRPGAssets::ResolveMesh(RuntimePalette->FallbackBlockMesh, MatchRPGAssets::LoadEngineCube());
	UMaterialInterface* FallbackMaterial = MatchRPGAssets::ResolveMaterial(RuntimePalette->FallbackMaterial, MatchRPGAssets::LoadDefaultShapeMaterial());

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

		View.ApplyStyle(Mesh, Material, Color, ScaleMultiplier);
	}
}

void ABoardGridActor::ConfigureBlockView(ABlockVisualActor& View, int32 X, int32 Y) const
{
	if (SimHost == nullptr) { return; }
	const MatchRPG::FMatchBoardCore& Board = SimHost->Sim.GetBoard();
	if (!Board.IsInBounds(X, Y)) { return; }
	ConfigureBlockViewFromCell(View, Board.At(X, Y));
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

void ABoardGridActor::TriggerCameraShake(float AmplitudeUnits, float DurationSeconds)
{
	if (CameraShakeTimer <= 0.0f)
	{
		OriginalActorLocation = GetActorLocation();
	}
	CameraShakeAmplitude = AmplitudeUnits;
	CameraShakeDuration = FMath::Max(0.01f, DurationSeconds);
	CameraShakeTimer = CameraShakeDuration;
}

void ABoardGridActor::EnterAnimPhase(EBoardAnimPhase NewPhase, float Duration)
{
	AnimPhase = NewPhase;
	AnimPhaseDuration = Duration;
	AnimPhaseTimer = 0.0f;
}

void ABoardGridActor::StartSwapAnimation(int32 AX, int32 AY, int32 BX, int32 BY, bool bValidSwap)
{
	AnimSwapAX = AX;
	AnimSwapAY = AY;
	AnimSwapBX = BX;
	AnimSwapBY = BY;

	const int32 Width = SimHost->Sim.GetBoard().GetWidth();
	const int32 IndexA = AY * Width + AX;
	const int32 IndexB = BY * Width + BX;

	if (bValidSwap)
	{
		CurrentOutcome = SimHost->Sim.GetLastOutcome();
		CurrentCascadeStep = 0;

		// Phase 1: Swap slide (140ms)
		EnterAnimPhase(EBoardAnimPhase::SwapSlide, 0.14f);

		const float Scale = GetCellSize() / 100.0f * 0.92f;
		if (BlockViews.IsValidIndex(IndexA) && BlockViews[IndexA] != nullptr)
		{
			BlockViews[IndexA]->SetTarget(GetCellWorldLocation(BX, BY), Scale, true);
		}
		if (BlockViews.IsValidIndex(IndexB) && BlockViews[IndexB] != nullptr)
		{
			BlockViews[IndexB]->SetTarget(GetCellWorldLocation(AX, AY), Scale, true);
		}
		// Swap views in pool so IndexA and IndexB point to their respective cell locations
		BlockViews.Swap(IndexA, IndexB);
	}
	else
	{
		// Invalid swap: slide toward each other for 60ms, then spring back and shake for 60ms (Total: 120ms)
		EnterAnimPhase(EBoardAnimPhase::InvalidSwapSlide, 0.06f);

		const FVector LocA = GetCellWorldLocation(AX, AY);
		const FVector LocB = GetCellWorldLocation(BX, BY);
		const float Scale = GetCellSize() / 100.0f * 0.92f;

		if (BlockViews.IsValidIndex(IndexA) && BlockViews[IndexA] != nullptr)
		{
			BlockViews[IndexA]->SetTarget(FMath::Lerp(LocA, LocB, 0.35f), Scale, true);
		}
		if (BlockViews.IsValidIndex(IndexB) && BlockViews[IndexB] != nullptr)
		{
			BlockViews[IndexB]->SetTarget(FMath::Lerp(LocB, LocA, 0.35f), Scale, true);
		}
	}
}

void ABoardGridActor::PlayCascadeStep(int32 StepIndex)
{
	if (!CurrentOutcome.Steps.IsValidIndex(StepIndex))
	{
		EnterAnimPhase(EBoardAnimPhase::Idle, 0.0f);
		RefreshViews();
		return;
	}

	CurrentCascadeStep = StepIndex;
	const MatchRPG::FResolveStepResult& Step = CurrentOutcome.Steps[StepIndex];
	const int32 Width = SimHost->Sim.GetBoard().GetWidth();

	// Phase 2: Match Highlight (100ms)
	EnterAnimPhase(EBoardAnimPhase::MatchHighlight, 0.10f);

	bool bTriggerShake = (Step.SpecialsTriggered > 0) || (StepIndex >= 2);

	for (int32 i = 0; i < Step.ClearedCells.Num(); ++i)
	{
		const FIntPoint& Pt = Step.ClearedCells[i];
		const int32 Index = Pt.Y * Width + Pt.X;
		if (BlockViews.IsValidIndex(Index) && BlockViews[Index] != nullptr)
		{
			BlockViews[Index]->PlayMatchHighlight(0.10f);
		}
	}

	// Trigger special feedback and camera shake
	for (int32 g = 0; g < Step.Groups.Num(); ++g)
	{
		const MatchRPG::FMatchGroup& Grp = Step.Groups[g];
		if (Grp.AwardedSpecial == MatchRPG::ESpecialType::AreaBomb || Grp.Shape == MatchRPG::EMatchShape::LTShape)
		{
			bTriggerShake = true;
		}
		if (Grp.AwardedSpecial != MatchRPG::ESpecialType::None && SimHost->Sim.GetBoard().IsInBounds(Grp.Pivot))
		{
			const int32 PivotIdx = Grp.Pivot.Y * Width + Grp.Pivot.X;
			if (BlockViews.IsValidIndex(PivotIdx) && BlockViews[PivotIdx] != nullptr)
			{
				BlockViews[PivotIdx]->PlaySpecialActivation(static_cast<uint8>(Grp.AwardedSpecial));
			}
		}
	}

	if (bTriggerShake)
	{
		TriggerCameraShake(4.0f, 0.08f); // 4px amplitude, 80ms duration
	}
}

void ABoardGridActor::UpdateAnimationQueue(float DeltaSeconds)
{
	if (AnimPhase == EBoardAnimPhase::Idle) { return; }

	AnimPhaseTimer += DeltaSeconds;
	if (AnimPhaseTimer < AnimPhaseDuration) { return; }

	const int32 Width = SimHost->Sim.GetBoard().GetWidth();

	switch (AnimPhase)
	{
	case EBoardAnimPhase::SwapSlide:
	{
		// 140ms swap slide completed -> start cascade step 0
		PlayCascadeStep(0);
		break;
	}

	case EBoardAnimPhase::InvalidSwapSlide:
	{
		// 60ms slide toward completed -> enter return and shake phase (60ms)
		EnterAnimPhase(EBoardAnimPhase::InvalidSwapReturn, 0.06f);
		const int32 IndexA = AnimSwapAY * Width + AnimSwapAX;
		const int32 IndexB = AnimSwapBY * Width + AnimSwapBX;
		const float Scale = GetCellSize() / 100.0f * 0.92f;

		const FVector LocA = GetCellWorldLocation(AnimSwapAX, AnimSwapAY);
		const FVector LocB = GetCellWorldLocation(AnimSwapBX, AnimSwapBY);
		const FVector DirA = (LocB - LocA).GetSafeNormal();

		if (BlockViews.IsValidIndex(IndexA) && BlockViews[IndexA] != nullptr)
		{
			BlockViews[IndexA]->SetTarget(LocA, Scale, true);
			BlockViews[IndexA]->PlayInvalidSwap(DirA, 0.12f);
		}
		if (BlockViews.IsValidIndex(IndexB) && BlockViews[IndexB] != nullptr)
		{
			BlockViews[IndexB]->SetTarget(LocB, Scale, true);
			BlockViews[IndexB]->PlayInvalidSwap(-DirA, 0.12f);
		}
		break;
	}

	case EBoardAnimPhase::InvalidSwapReturn:
	{
		// 120ms total invalid swap sequence completed
		EnterAnimPhase(EBoardAnimPhase::Idle, 0.0f);
		RefreshViews();
		break;
	}

	case EBoardAnimPhase::MatchHighlight:
	{
		// 100ms match highlight completed -> enter Break Pop phase (120ms)
		EnterAnimPhase(EBoardAnimPhase::BreakPop, 0.12f);
		if (CurrentOutcome.Steps.IsValidIndex(CurrentCascadeStep))
		{
			const MatchRPG::FResolveStepResult& Step = CurrentOutcome.Steps[CurrentCascadeStep];
			for (int32 i = 0; i < Step.ClearedCells.Num(); ++i)
			{
				const FIntPoint& Pt = Step.ClearedCells[i];
				const int32 Index = Pt.Y * Width + Pt.X;
				if (BlockViews.IsValidIndex(Index) && BlockViews[Index] != nullptr)
				{
					BlockViews[Index]->PlayBreak(0.12f);
				}
			}
		}
		break;
	}

	case EBoardAnimPhase::BreakPop:
	{
		// 120ms break pop completed -> enter Gravity Fall phase (180ms)
		EnterAnimPhase(EBoardAnimPhase::GravityFall, 0.18f);
		const float Scale = GetCellSize() / 100.0f * 0.92f;

		if (CurrentOutcome.Steps.IsValidIndex(CurrentCascadeStep))
		{
			const MatchRPG::FResolveStepResult& Step = CurrentOutcome.Steps[CurrentCascadeStep];
			if (Step.BoardSnapshot.Num() == BlockViews.Num())
			{
				for (int32 Index = 0; Index < BlockViews.Num(); ++Index)
				{
					const int32 X = Index % Width;
					const int32 Y = Index / Width;
					const MatchRPG::FBlockCell& Cell = Step.BoardSnapshot[Index];

					ABlockVisualActor* View = BlockViews[Index];
					if (View == nullptr) { continue; }

					ConfigureBlockViewFromCell(*View, Cell);
					const bool bVisible = Cell.IsNormal() || Cell.IsObstacle();
					FVector TargetPos = GetCellWorldLocation(X, Y);
					if (Cell.IsObstacle()) { TargetPos.Z += 10.0f; }
					if (Cell.HasSpecial()) { TargetPos.Z += 25.0f; }

					View->SetTarget(TargetPos, Scale, bVisible);
					View->TriggerLandingSquash(0.04f); // Squash & stretch upon landing
				}
			}
		}
		break;
	}

	case EBoardAnimPhase::GravityFall:
	{
		// 180ms gravity fall completed -> enter Refill Drop phase (160ms)
		EnterAnimPhase(EBoardAnimPhase::RefillDrop, 0.16f);
		for (int32 Index = 0; Index < BlockViews.Num(); ++Index)
		{
			if (BlockViews[Index] != nullptr)
			{
				BlockViews[Index]->TriggerLandingSquash(0.04f);
			}
		}
		break;
	}

	case EBoardAnimPhase::RefillDrop:
	{
		// 160ms refill drop completed -> check for next cascade step
		const int32 NextStep = CurrentCascadeStep + 1;
		if (NextStep < CurrentOutcome.Steps.Num())
		{
			PlayCascadeStep(NextStep);
		}
		else
		{
			EnterAnimPhase(EBoardAnimPhase::Idle, 0.0f);
			RefreshViews();
		}
		break;
	}

	default:
		break;
	}
}

void ABoardGridActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// Update Camera / Board shake (4px amplitude, 80ms duration)
	if (CameraShakeTimer > 0.0f)
	{
		CameraShakeTimer = FMath::Max(0.0f, CameraShakeTimer - DeltaSeconds);
		const float ShakeProgress = 1.0f - (CameraShakeTimer / CameraShakeDuration);
		const float DampedAmp = CameraShakeAmplitude * (1.0f - ShakeProgress);
		const FVector ShakeOffset(
			FMath::RandRange(-DampedAmp, DampedAmp),
			FMath::RandRange(-DampedAmp, DampedAmp),
			FMath::RandRange(-DampedAmp * 0.5f, DampedAmp * 0.5f)
		);
		SetActorLocation(OriginalActorLocation + ShakeOffset);
		if (CameraShakeTimer <= 0.0f)
		{
			SetActorLocation(OriginalActorLocation);
		}
	}

	UpdateAnimationQueue(DeltaSeconds);

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
	// Input locked during animation playback
	if (IsAnimating()) { return false; }

	int32 X = INDEX_NONE;
	int32 Y = INDEX_NONE;
	if (!PickCellFromScreen(PlayerController, ScreenX, ScreenY, X, Y))
	{
		ClearSelection();
		return false;
	}

	if (SimHost == nullptr) { return false; }

	// First cell click
	if (SimHost->SelectedX == INDEX_NONE)
	{
		SimHost->SelectedX = X;
		SimHost->SelectedY = Y;
		RefreshViews();
		return false;
	}

	// Click same cell to deselect
	if (SimHost->SelectedX == X && SimHost->SelectedY == Y)
	{
		ClearSelection();
		return false;
	}

	// Click non-adjacent cell to change selection
	if (!SimHost->Sim.GetBoard().AreAdjacent(FIntPoint(SimHost->SelectedX, SimHost->SelectedY), FIntPoint(X, Y)))
	{
		SimHost->SelectedX = X;
		SimHost->SelectedY = Y;
		RefreshViews();
		return false;
	}

	// Adjacent swap attempt
	const int32 AX = SimHost->SelectedX;
	const int32 AY = SimHost->SelectedY;
	const int32 BX = X;
	const int32 BY = Y;

	SimHost->ClearSelection();

	const bool bSwapped = SimHost->TrySwapCells(AX, AY, BX, BY);
	StartSwapAnimation(AX, AY, BX, BY, bSwapped);

	return bSwapped;
}
