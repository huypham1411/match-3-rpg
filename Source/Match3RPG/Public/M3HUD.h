// =============================================================================
//  M3HUD.h  -  Giao diện vẽ bằng code (không cần asset UMG nào)
//  ---------------------------------------------------------------------------
//  Vì sao vẽ bằng code? Để project chạy được ngay sau khi build, không phụ thuộc
//  file .uasset. Khi bạn muốn giao diện đẹp hơn, hãy thay AM3HUD bằng widget
//  UMG (Blueprint) và đọc dữ liệu từ UM3CombatSubsystem - API đã sẵn sàng.
// =============================================================================
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"

#include "M3CombatSubsystem.h"
#include "M3UETypes.h"

#include "M3HUD.generated.h"

class AM3PlayerController;

// Một nút bấm trên HUD (vẽ + tự xử lý click, không cần UMG)
struct FM3HudButton
{
	FName  Action = NAME_None;   // "skill" / "ultimate" / "endturn" / "restart" / "nextstage"
	int32  MemberIndex = -1;
	FVector2D Min = FVector2D::ZeroVector;
	FVector2D Max = FVector2D::ZeroVector;
	bool   bEnabled = true;

	bool Contains(const FVector2D& Point) const
	{
		return Point.X >= Min.X && Point.X <= Max.X && Point.Y >= Min.Y && Point.Y <= Max.Y;
	}
};

UCLASS()
class MATCH3RPG_API AM3HUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void DrawHUD() override;

	// Được PlayerController gọi khi người chơi bấm chuột trái.
	// Trả về true nếu click rơi vào một nút của HUD.
	bool HandleClickAt(const FVector2D& ScreenPosition, AM3PlayerController* PC);

	// Gợi ý hiển thị ở đáy màn hình.
	FString GetHintText() const;

private:
	TArray<FM3HudButton> Buttons;

	UM3CombatSubsystem* GetCombat() const;

	void DrawPanel(float X, float Y, float W, float H, const FLinearColor& Color);
	void DrawBar(float X, float Y, float W, float H, float Percent, const FLinearColor& Fill, const FLinearColor& Back);
	void DrawLabel(const FString& Text, float X, float Y, const FLinearColor& Color, int32 FontSize = 14, bool bBold = false);
	void DrawButton(AM3PlayerController* PC, const FName& Action, int32 MemberIndex, float X, float Y, float W, float H,
		const FString& Label, bool bEnabled, const FLinearColor& Color);

	void DrawBossPanel(float ScreenW);
	void DrawTeamPanel(AM3PlayerController* PC);
	void DrawInfoPanel(float ScreenW, float ScreenH);
	void DrawLogPanel(float ScreenW);
	void DrawStoryPanel(float ScreenW);
	void DrawGameOverBanner(float ScreenW, float ScreenH);
};
