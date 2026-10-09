// =============================================================================
//  M3BoardActor.h  -  Vẽ bàn nối bằng hình 3D và nhận chọn ô
//  ---------------------------------------------------------------------------
//  Actor này giữ 1 StaticMeshComponent cho mỗi ô (tối đa 8x8 = 64 ô) và đồng bộ
//  hình ảnh với trạng thái bàn trong lõi game. Khi cần thay model block, bạn chỉ
//  cần đổi M3VisualSet (Data Asset) - code dưới đây không đổi.
// =============================================================================
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"

#include "M3CombatSubsystem.h"
#include "M3UETypes.h"
#include "M3VisualSet.h"

#include "M3BoardActor.generated.h"

class UStaticMeshComponent;
class UMaterialInstanceDynamic;

UCLASS()
class MATCH3RPG_API AM3BoardActor : public AActor
{
	GENERATED_BODY()

public:
	AM3BoardActor();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	// Khoảng cách giữa 2 tâm ô (đơn vị world = cm)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Match3")
	float CellSize = 110.f;

	// Bộ hình ảnh. Bỏ trống -> tự dựng bộ mặc định từ asset của engine.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Match3")
	UM3VisualSet* VisualSet = nullptr;

	// ---------- Toạ độ ----------
	UFUNCTION(BlueprintPure, Category = "Match3") FVector CellToWorld(int32 X, int32 Y) const;
	UFUNCTION(BlueprintPure, Category = "Match3") bool WorldToCell(const FVector& World, int32& OutX, int32& OutY) const;
	UFUNCTION(BlueprintPure, Category = "Match3") FVector GetBoardCenter() const;
	UFUNCTION(BlueprintPure, Category = "Match3") FVector GetBoardSize() const;
	UFUNCTION(BlueprintPure, Category = "Match3") FVector GetIdealCameraLocation() const;
	UFUNCTION(BlueprintPure, Category = "Match3") FRotator GetIdealCameraRotation() const;

	// ---------- Chọn ô (để swap) ----------
	UFUNCTION(BlueprintCallable, Category = "Match3") void SelectCell(int32 X, int32 Y);
	UFUNCTION(BlueprintCallable, Category = "Match3") void ClearSelection();
	UFUNCTION(BlueprintPure, Category = "Match3") bool HasSelection() const { return bHasSelection; }
	UFUNCTION(BlueprintPure, Category = "Match3") FM3Cell GetSelectedCell() const { return SelectedCell; }

	// Vẽ lại toàn bộ ô theo trạng thái bàn hiện tại.
	UFUNCTION(BlueprintCallable, Category = "Match3")
	void RefreshVisuals(bool bForce = false);

protected:
	UPROPERTY(VisibleAnywhere, Category = "Match3")
	USceneComponent* Root;

	UPROPERTY()
	TArray<UStaticMeshComponent*> CellComponents;

	UPROPERTY()
	TArray<UMaterialInstanceDynamic*> CellMaterials;

private:
	UM3CombatSubsystem* GetCombat() const;
	void BuildCellComponents();
	void ApplyVisualToCell(int32 Index, UStaticMeshComponent* Comp, const M3::FBlock& Block, bool bSelected);

	int32 BoardWidth = 8;
	int32 BoardHeight = 8;
	int32 LastRevision = -1;
	bool  bHasSelection = false;
	FM3Cell SelectedCell;
	float PulseTime = 0.f;
};
