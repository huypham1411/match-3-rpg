// =============================================================================
//  M3PlayerController.cpp
// =============================================================================
#include "M3PlayerController.h"

#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "InputCoreTypes.h"
#include "InputKeyEventArgs.h"

#include "M3BoardActor.h"
#include "M3GameMode.h"
#include "M3HUD.h"

AM3PlayerController::AM3PlayerController()
{
	PrimaryActorTick.bCanEverTick = true;
	bShowMouseCursor = true;
	bEnableClickEvents = true;
	bEnableMouseOverEvents = true;
}

void AM3PlayerController::BeginPlay()
{
	Super::BeginPlay();

	// Cho phép vừa chơi vừa bấm chuột lên HUD (HUD vẽ bằng canvas nên không chặn chuột).
	FInputModeGameAndUI InputMode;
	InputMode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
	InputMode.SetHideCursorDuringCapture(false);
	SetInputMode(InputMode);
}

// -----------------------------------------------------------------------------
// Xử lý phím trực tiếp: đơn giản, không phụ thuộc ActionMapping trong .ini
// -----------------------------------------------------------------------------
bool AM3PlayerController::InputKey(const FInputKeyEventArgs& EventArgs)
{
	if (EventArgs.Event == IE_Pressed)
	{
		// Phím số 1..6 -> kỹ năng chủ động của nhân vật tương ứng
		static const FKey SkillKeys[6] = {
			EKeys::One, EKeys::Two, EKeys::Three, EKeys::Four, EKeys::Five, EKeys::Six
		};
		// NumPad 1..6 -> ultimate
		static const FKey UltimateKeys[6] = {
			EKeys::NumPadOne, EKeys::NumPadTwo, EKeys::NumPadThree,
			EKeys::NumPadFour, EKeys::NumPadFive, EKeys::NumPadSix
		};

		for (int32 i = 0; i < 6; ++i)
		{
			if (EventArgs.Key == SkillKeys[i])    { HandleSkill(i, false); return true; }
			if (EventArgs.Key == UltimateKeys[i]) { HandleSkill(i, true);  return true; }
		}

		if (EventArgs.Key == EKeys::Tab || EventArgs.Key == EKeys::Enter || EventArgs.Key == EKeys::SpaceBar)
		{
			HandleEndTurn();
			return true;
		}
		if (EventArgs.Key == EKeys::R) { HandleRestart();   return true; }
		if (EventArgs.Key == EKeys::N) { HandleNextStage(); return true; }
		if (EventArgs.Key == EKeys::LeftMouseButton) { OnSelectPressed(); return true; }
	}

	return Super::InputKey(EventArgs);
}

UM3CombatSubsystem* AM3PlayerController::GetCombat() const
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

AM3BoardActor* AM3PlayerController::GetBoard() const
{
	if (const UWorld* World = GetWorld())
	{
		for (TActorIterator<AM3BoardActor> It(World); It; ++It) { return *It; }
	}
	return nullptr;
}

AM3GameMode* AM3PlayerController::GetGameMode() const
{
	return GetWorld() ? GetWorld()->GetAuthGameMode<AM3GameMode>() : nullptr;
}

// -----------------------------------------------------------------------------
// Chiếu vị trí chuột xuống mặt phẳng bàn (Z của actor bàn)
// -----------------------------------------------------------------------------
bool AM3PlayerController::ProjectMouseToBoard(FVector& OutWorld, int32& OutX, int32& OutY) const
{
	AM3BoardActor* Board = GetBoard();
	if (!Board) { return false; }

	FVector WorldLocation;
	FVector WorldDirection;
	if (!DeprojectMousePositionToWorld(WorldLocation, WorldDirection)) { return false; }
	if (FMath::IsNearlyZero(WorldDirection.Z)) { return false; }

	const float PlaneZ = Board->GetActorLocation().Z;
	const float T = (PlaneZ - WorldLocation.Z) / WorldDirection.Z;
	if (T <= 0.f) { return false; }

	OutWorld = WorldLocation + WorldDirection * T;
	return Board->WorldToCell(OutWorld, OutX, OutY);
}

void AM3PlayerController::ClearPendingCell()
{
	bHasPendingCell = false;
	if (AM3BoardActor* Board = GetBoard()) { Board->ClearSelection(); }
}

// -----------------------------------------------------------------------------
// Click chuột trái
// -----------------------------------------------------------------------------
void AM3PlayerController::OnSelectPressed()
{
	// 1) Ưu tiên nút trên HUD (kỹ năng / ultimate / kết thúc turn / đổi map)
	if (AM3HUD* Match3HUD = Cast<AM3HUD>(GetHUD()))
	{
		float MouseX = 0.f;
		float MouseY = 0.f;
		if (GetMousePosition(MouseX, MouseY))
		{
			if (Match3HUD->HandleClickAt(FVector2D(MouseX, MouseY), this)) { return; }
		}
	}

	// 2) Chọn ô trên bàn nối
	FVector World;
	int32 CellX = 0;
	int32 CellY = 0;
	if (!ProjectMouseToBoard(World, CellX, CellY)) { return; }

	AM3BoardActor* Board = GetBoard();
	UM3CombatSubsystem* Combat = GetCombat();
	if (!Board || !Combat || Combat->IsFinished()) { return; }

	// Ô đầu tiên: chỉ chọn (highlight)
	if (!bHasPendingCell)
	{
		bHasPendingCell = true;
		PendingCell = FM3Cell(CellX, CellY);
		Board->SelectCell(CellX, CellY);
		return;
	}

	// Click lại ô đang chọn -> bỏ chọn
	if (PendingCell.X == CellX && PendingCell.Y == CellY)
	{
		ClearPendingCell();
		return;
	}

	// Click ô kề nhau -> đổi chỗ = 1 nước đi
	const bool bAdjacent = (FMath::Abs(PendingCell.X - CellX) + FMath::Abs(PendingCell.Y - CellY)) == 1;
	if (bAdjacent)
	{
		Combat->TrySwap(PendingCell.X, PendingCell.Y, CellX, CellY);
		ClearPendingCell();
		return;
	}

	// Click ô xa -> chuyển lựa chọn sang ô mới
	PendingCell = FM3Cell(CellX, CellY);
	Board->SelectCell(CellX, CellY);
}

// -----------------------------------------------------------------------------
// Hành động (dùng chung cho cả click HUD và phím tắt)
// -----------------------------------------------------------------------------
void AM3PlayerController::HandleSkill(int32 MemberIndex, bool bUltimate)
{
	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat) { return; }

	if (bUltimate) { Combat->UseUltimate(MemberIndex); }
	else           { Combat->UseBasicSkill(MemberIndex); }
}

void AM3PlayerController::HandleEndTurn()
{
	if (UM3CombatSubsystem* Combat = GetCombat()) { Combat->EndTurn(); }
	ClearPendingCell();
}

void AM3PlayerController::HandleRestart()
{
	if (UM3CombatSubsystem* Combat = GetCombat()) { Combat->RestartStage(); }
	ClearPendingCell();
}

void AM3PlayerController::HandleNextStage()
{
	UM3CombatSubsystem* Combat = GetCombat();
	const int32 NextIndex = Combat ? (Combat->GetStageIndex() + 1) : 0;

	if (AM3GameMode* Mode = GetGameMode()) { Mode->GoToStage(NextIndex); }
	ClearPendingCell();
}
