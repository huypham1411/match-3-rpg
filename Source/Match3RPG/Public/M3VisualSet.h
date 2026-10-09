// =============================================================================
//  M3VisualSet.h  -  Bộ hình ảnh (asset) cho bàn nối, boss, nhân vật
//  ---------------------------------------------------------------------------
//  Đây chính là chỗ bạn THAY ASSET: gán mesh/material khác cho từng màu block,
//  cho vật cản, cho các block special... mà không cần sửa code gameplay.
//  Nếu không gán gì, game tự dựng bộ mặc định từ hình cơ bản của engine
//  (/Engine/BasicShapes) nên vẫn chạy được ngay.
// =============================================================================
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"

#include "M3Types.h"
#include "M3UETypes.h"

#include "M3VisualSet.generated.h"

class UStaticMesh;
class UMaterialInterface;
class UMaterialInstanceDynamic;

// Một cấu hình hiển thị (mesh + material + màu + kích thước)
USTRUCT(BlueprintType)
struct FM3BlockVisual
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visual")
	UStaticMesh* Mesh = nullptr;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visual")
	UMaterialInterface* Material = nullptr;

	// Nếu material có tham số vector tên "Color" thì giá trị này sẽ được truyền vào.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visual")
	FLinearColor Tint = FLinearColor::White;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visual")
	FVector Scale = FVector(0.9f, 0.9f, 0.9f);

	// Nâng/hạ mesh so với mặt bàn (dùng cho vật cản, hiệu ứng...)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visual")
	float ZOffset = 0.f;
};

// Một dòng tra cứu: màu block -> cấu hình hiển thị
USTRUCT(BlueprintType)
struct FM3BlockVisualEntry
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visual")
	EM3Color Color = EM3Color::Red;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visual")
	FM3BlockVisual Visual;
};

UCLASS(BlueprintType)
class MATCH3RPG_API UM3VisualSet : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	// Hình của block thường, theo từng màu.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blocks")
	TArray<FM3BlockVisualEntry> BlockVisuals;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Special")
	FM3BlockVisual ObstacleVisual;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Special")
	FM3BlockVisual LineClearVisual;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Special")
	FM3BlockVisual SquareBombVisual;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Special")
	FM3BlockVisual ColorBombVisual;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Actors")
	FM3BlockVisual BossVisual;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Actors")
	FM3BlockVisual FloorVisual;

	// Mesh thay thế cho nhân vật khi bạn CHƯA gán Skeletal Mesh.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Actors")
	UStaticMesh* PartyMesh = nullptr;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Actors")
	UMaterialInterface* PartyMaterial = nullptr;

	// Tra cứu: special ưu tiên hơn màu; không tìm thấy thì trả về mặc định.
	FM3BlockVisual ResolveVisual(M3::EBlockKind Kind, M3::EColor Color) const;

	// Dựng bộ mặc định từ asset có sẵn của engine -> game chạy được ngay.
	UFUNCTION(BlueprintCallable, Category = "Match3")
	static UM3VisualSet* CreateDefaultVisualSet(UObject* Outer);
};
