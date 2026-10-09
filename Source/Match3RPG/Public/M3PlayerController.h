// =============================================================================
//  M3PlayerController.h  -  Nhận input: chọn ô để nối, phím tắt kỹ năng
//  ---------------------------------------------------------------------------
//  Cách chơi:
//    - Click ô thứ nhất rồi click ô kề bên để đổi chỗ (kéo/thả cũng được).
//    - Phím 1..6     = kỹ năng chủ động của nhân vật 1..6.
//    - NumPad 1..6   = ultimate của nhân vật 1..6.
//    - Tab/Enter/Space = kết thúc turn, R = chơi lại, N = map kế tiếp.
//
//  Ghi chú kỹ thuật: các phím được xử lý trực tiếp trong InputKey() thay vì qua
//  ActionMapping, nên bạn KHÔNG cần khai báo gì thêm trong DefaultInput.ini.
//  Việc chọn ô làm bằng TOÁN (chiếu chuột xuống mặt phẳng bàn), không dùng
//  line trace -> block không cần bật collision.
// =============================================================================
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"

#include "M3CombatSubsystem.h"
#include "M3UETypes.h"

#include "M3PlayerController.generated.h"

class AM3BoardActor;
class AM3GameMode;

UCLASS()
class MATCH3RPG_API AM3PlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	AM3PlayerController();

	virtual void BeginPlay() override;
	virtual bool InputKey(const FInputKeyEventArgs& EventArgs) override;

	// ----- API dùng chung cho HUD / phím tắt -----
	void HandleSkill(int32 MemberIndex, bool bUltimate);
	void HandleEndTurn();
	void HandleRestart();
	void HandleNextStage();

protected:
	// ----- Tiện ích -----
	AM3BoardActor* GetBoard() const;
	AM3GameMode* GetGameMode() const;
	UM3CombatSubsystem* GetCombat() const;
	bool ProjectMouseToBoard(FVector& OutWorld, int32& OutX, int32& OutY) const;
	void ClearPendingCell();

	// Xử lý click chuột trái: ưu tiên nút trên HUD, sau đó tới ô trên bàn.
	void OnSelectPressed();

	// Ô đang chờ để đổi chỗ (click ô đầu tiên)
	bool bHasPendingCell = false;
	FM3Cell PendingCell;
};
