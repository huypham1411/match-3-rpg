// =============================================================================
//  M3BossActor.h  -  Hình ảnh boss (đổi model tại M3VisualSet.BossVisual)
//  ---------------------------------------------------------------------------
//  Actor này KHÔNG chứa luật chơi. Nó chỉ đọc trạng thái từ M3CombatSubsystem và
//  thể hiện bằng hình: to/nhỏ theo % máu, xoay nhanh khi boss bị BREAK.
// =============================================================================
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"

#include "M3CombatSubsystem.h"
#include "M3VisualSet.h"

#include "M3BossActor.generated.h"

class UStaticMeshComponent;
class UMaterialInstanceDynamic;

UCLASS()
class MATCH3RPG_API AM3BossActor : public AActor
{
	GENERATED_BODY()

public:
	AM3BossActor();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Match3")
	UM3VisualSet* VisualSet = nullptr;

	// Skeletal mesh boss (nếu bạn có model nhân vật/ quái 3D). Bỏ trống thì dùng mesh tĩnh.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Match3")
	class USkeletalMeshComponent* SkeletalMesh = nullptr;

private:
	UPROPERTY() UStaticMeshComponent* Mesh = nullptr;
	UPROPERTY() UMaterialInstanceDynamic* DynMat = nullptr;

	UM3CombatSubsystem* GetCombat() const;
	void RefreshFromBattle();
	float SpinSpeed = 30.f;
};
