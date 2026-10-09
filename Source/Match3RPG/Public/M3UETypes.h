// =============================================================================
//  M3UETypes.h  -  Kiểu dữ liệu cầu nối giữa lõi game (M3::) và Unreal Engine
//  ---------------------------------------------------------------------------
//  Lõi game cố tình KHÔNG dùng kiểu của UE (không UENUM/USTRUCT, không FString).
//  File này làm 2 việc:
//    1) Khai báo enum/struct của UE để bạn dùng được trong Blueprint và Editor.
//    2) Cung cấp hàm chuyển đổi qua lại + tiện ích (màu, chuỗi, toạ độ).
//  Nhờ vậy bạn có thể thay model/asset, thêm Data Asset... mà không phải chạm
//  vào phần luật chơi.
// =============================================================================
#pragma once

#include "CoreMinimal.h"

#include "M3Types.h"

#include "M3UETypes.generated.h"

// ---------------------------------------------------------------------------
// Enum phía UE (giữ đúng thứ tự với enum trong lõi)
// ---------------------------------------------------------------------------
UENUM(BlueprintType)
enum class EM3Color : uint8
{
	None   UMETA(DisplayName = "Không màu"),
	Red    UMETA(DisplayName = "Đỏ"),
	Blue   UMETA(DisplayName = "Xanh dương"),
	Green  UMETA(DisplayName = "Xanh lá"),
	Yellow UMETA(DisplayName = "Vàng"),
	Purple UMETA(DisplayName = "Tím"),
	Cyan   UMETA(DisplayName = "Cyan")
};

UENUM(BlueprintType)
enum class EM3Role : uint8
{
	Attacker,
	Supporter,
	Healer,
	Defender,
	Counter,
	Deflecter
};

UENUM(BlueprintType)
enum class EM3BlockKind : uint8
{
	Normal,
	Obstacle,
	LineClear,
	SquareBomb,
	ColorBomb
};

// ---------------------------------------------------------------------------
// Toạ độ ô trên bàn (dùng cho Blueprint / UI)
// ---------------------------------------------------------------------------
USTRUCT(BlueprintType)
struct FM3Cell
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Match3")
	int32 X = 0;

	UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Match3")
	int32 Y = 0;

	FM3Cell() = default;
	FM3Cell(int32 InX, int32 InY) : X(InX), Y(InY) {}

	M3::FCell ToCore() const { return M3::MakeCell(X, Y); }
	static FM3Cell FromCore(const M3::FCell& Cell) { return FM3Cell(Cell.X, Cell.Y); }
};

// ---------------------------------------------------------------------------
// Hàm chuyển đổi + tiện ích
// ---------------------------------------------------------------------------
namespace M3Conv
{
	// Enum
	M3::EColor      ToCore(EM3Color Value);
	EM3Color        FromCore(M3::EColor Value);
	M3::ERole       ToCore(EM3Role Value);
	EM3Role         FromCore(M3::ERole Value);
	M3::EBlockKind  ToCore(EM3BlockKind Value);
	EM3BlockKind    FromCore(M3::EBlockKind Value);

	// Chuỗi: lõi dùng std::string (UTF-8), UE dùng FString
	FString Utf8(const std::string& In);

	// Màu hiển thị của từng block (dùng cho material/mesh)
	FLinearColor ColorToLinear(M3::EColor Value);
	// Màu đại diện cho role (dùng cho khung nhân vật)
	FLinearColor RoleToLinearEM3(EM3Role Role);

	M3::FBlock ToCore(const FM3Cell& Cell);   // (ô trống - giữ để mở rộng)
}

// ---------------------------------------------------------------------------
// Tiện ích hiển thị (đặt ở UE vì cần FLinearColor)
// ---------------------------------------------------------------------------
namespace M3UE
{
	// Màu block theo màu gốc của lõi
	FORCEINLINE FLinearColor BlockColor(M3::EColor Color) { return M3Conv::ColorToLinear(Color); }

	// Tên hiển thị của role
	FString RoleDisplayName(M3::ERole Role);
}
