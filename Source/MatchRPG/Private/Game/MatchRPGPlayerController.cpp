// Copyright MatchRPG. Mouse/keyboard glue between the player and the board.
#include "Game/MatchRPGPlayerController.h"

#include "Battle/MatchRPGSimHost.h"
#include "Board/BoardGridActor.h"
#include "Core/BattleSimCore.h"

#include "Engine/World.h"
#include "EngineUtils.h"
#include "InputCoreTypes.h"

AMatchRPGPlayerController::AMatchRPGPlayerController()
{
	bShowMouseCursor = true;
	bEnableClickEvents = true;
	bEnableMouseOverEvents = false;
}

void AMatchRPGPlayerController::BeginPlay()
{
	Super::BeginPlay();

	// Board interaction needs a visible cursor that is not locked to the viewport.
	FInputModeGameAndUI InputMode;
	InputMode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
	InputMode.SetHideCursorDuringCapture(false);
	SetInputMode(InputMode);

	if (CachedBoard == nullptr)
	{
		UWorld* World = GetWorld();
		for (TActorIterator<ABoardGridActor> It(World); It; ++It)
		{
			CachedBoard = *It;
			break;
		}
	}
}

ABoardGridActor* AMatchRPGPlayerController::GetBoard()
{
	if (CachedBoard != nullptr) { return CachedBoard; }

	UWorld* World = GetWorld();
	if (World == nullptr) { return nullptr; }

	for (TActorIterator<ABoardGridActor> It(World); It; ++It)
	{
		CachedBoard = *It;
		break;
	}
	return CachedBoard;
}

void AMatchRPGPlayerController::SetupInputComponent()
{
	Super::SetupInputComponent();

	if (InputComponent == nullptr) { return; }

	InputComponent->BindKey(EKeys::LeftMouseButton, IE_Pressed, this, &AMatchRPGPlayerController::OnBoardClick);
	InputComponent->BindKey(EKeys::SpaceBar, IE_Pressed, this, &AMatchRPGPlayerController::OnEndTurn);
	InputComponent->BindKey(EKeys::H, IE_Pressed, this, &AMatchRPGPlayerController::OnHint);
	InputComponent->BindKey(EKeys::G, IE_Pressed, this, &AMatchRPGPlayerController::OnGachaPull);
	InputComponent->BindKey(EKeys::R, IE_Pressed, this, &AMatchRPGPlayerController::OnRestartStage);

	InputComponent->BindKey(EKeys::One, IE_Pressed, this, &AMatchRPGPlayerController::OnUltimate1);
	InputComponent->BindKey(EKeys::Two, IE_Pressed, this, &AMatchRPGPlayerController::OnUltimate2);
	InputComponent->BindKey(EKeys::Three, IE_Pressed, this, &AMatchRPGPlayerController::OnUltimate3);
	InputComponent->BindKey(EKeys::Four, IE_Pressed, this, &AMatchRPGPlayerController::OnUltimate4);
	InputComponent->BindKey(EKeys::Five, IE_Pressed, this, &AMatchRPGPlayerController::OnUltimate5);
	InputComponent->BindKey(EKeys::Six, IE_Pressed, this, &AMatchRPGPlayerController::OnUltimate6);

	InputComponent->BindKey(EKeys::Q, IE_Pressed, this, &AMatchRPGPlayerController::OnSkill1);
	InputComponent->BindKey(EKeys::W, IE_Pressed, this, &AMatchRPGPlayerController::OnSkill2);
	InputComponent->BindKey(EKeys::E, IE_Pressed, this, &AMatchRPGPlayerController::OnSkill3);
	InputComponent->BindKey(EKeys::T, IE_Pressed, this, &AMatchRPGPlayerController::OnSkill4);
	InputComponent->BindKey(EKeys::Y, IE_Pressed, this, &AMatchRPGPlayerController::OnSkill5);
	InputComponent->BindKey(EKeys::U, IE_Pressed, this, &AMatchRPGPlayerController::OnSkill6);
}

void AMatchRPGPlayerController::HandleBoardClick(float ScreenX, float ScreenY)
{
	ABoardGridActor* Board = GetBoard();
	if (Board == nullptr) { return; }

	Board->HandleBoardClick(this, ScreenX, ScreenY);
}

void AMatchRPGPlayerController::OnBoardClick()
{
	float MouseX = 0.0f;
	float MouseY = 0.0f;
	if (!GetMousePosition(MouseX, MouseY)) { return; }

	HandleBoardClick(MouseX, MouseY);
}

void AMatchRPGPlayerController::OnEndTurn()
{
	ABoardGridActor* Board = GetBoard();
	if (Board != nullptr) { Board->EndTurn(); }
}

void AMatchRPGPlayerController::OnHint()
{
	ABoardGridActor* Board = GetBoard();
	if (Board == nullptr) { return; }

	FMatchRPGSimHost* Host = Board->GetSimHostMutable();
	if (Host == nullptr) { return; }

	FIntPoint A;
	FIntPoint B;
	if (Host->Sim.FindHint(A, B) && Host->Sim.TrySwap(A, B))
	{
		Host->LastMessage = FString::Printf(TEXT("Hint: swapped (%d,%d) with (%d,%d)"), A.X, A.Y, B.X, B.Y);
		Board->RefreshViews();
	}
}

void AMatchRPGPlayerController::OnGachaPull()
{
	ABoardGridActor* Board = GetBoard();
	if (Board != nullptr) { Board->PullTenGacha(); }
}

void AMatchRPGPlayerController::OnRestartStage()
{
	ABoardGridActor* Board = GetBoard();
	if (Board != nullptr) { Board->RestartBattle(); }
}

void AMatchRPGPlayerController::OnUltimateSlot(int32 SlotIndex)
{
	ABoardGridActor* Board = GetBoard();
	if (Board == nullptr) { return; }

	if (!Board->FireUltimate(SlotIndex))
	{
		FMatchRPGSimHost* Host = Board->GetSimHostMutable();
		if (Host != nullptr)
		{
			Host->LastMessage = FString::Printf(TEXT("Slot %d has no charged ultimate"), SlotIndex);
		}
	}
}

void AMatchRPGPlayerController::OnSkillSlot(int32 SlotIndex)
{
	ABoardGridActor* Board = GetBoard();
	if (Board == nullptr) { return; }

	if (!Board->FireManualSkill(SlotIndex))
	{
		FMatchRPGSimHost* Host = Board->GetSimHostMutable();
		if (Host != nullptr)
		{
			Host->LastMessage = FString::Printf(TEXT("Slot %d cannot use its skill right now"), SlotIndex);
		}
	}
}

void AMatchRPGPlayerController::OnUltimate1() { OnUltimateSlot(0); }
void AMatchRPGPlayerController::OnUltimate2() { OnUltimateSlot(1); }
void AMatchRPGPlayerController::OnUltimate3() { OnUltimateSlot(2); }
void AMatchRPGPlayerController::OnUltimate4() { OnUltimateSlot(3); }
void AMatchRPGPlayerController::OnUltimate5() { OnUltimateSlot(4); }
void AMatchRPGPlayerController::OnUltimate6() { OnUltimateSlot(5); }

void AMatchRPGPlayerController::OnSkill1() { OnSkillSlot(0); }
void AMatchRPGPlayerController::OnSkill2() { OnSkillSlot(1); }
void AMatchRPGPlayerController::OnSkill3() { OnSkillSlot(2); }
void AMatchRPGPlayerController::OnSkill4() { OnSkillSlot(3); }
void AMatchRPGPlayerController::OnSkill5() { OnSkillSlot(4); }
void AMatchRPGPlayerController::OnSkill6() { OnSkillSlot(5); }
