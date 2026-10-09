// =============================================================================
//  M3PartyMemberActor.h  -  Hình ảnh 1 nhân vật trong đội (đổi model dễ dàng)
//  ---------------------------------------------------------------------------
//  Đây là chỗ bạn thay model nhân vật 3D:
//    - Có Skeletal Mesh + Animation Blueprint -> gán vào SkeletalMesh.
//    - Chưa có -> dùng mesh tĩnh (M3VisualSet.PartyMesh) làm chỗ đứng tạm.
//  Actor tự nảy lên khi role của nhân vật vừa được kích hoạt trong nước đi.
// =============================================================================
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"

#include "M3CombatSubsystem.h"
#include "M3VisualSet.h"

#include "M3PartyMemberActor.generated.h"

class UStaticMeshComponent;
class USkeletalMeshComponent;
class UTextRenderComponent;
class UMaterialInstanceDynamic;

UCLASS()
class MATCH3RPG_API AM3PartyMemberActor : public AActor
{
	GENERATED_BODY()

public:
	AM3PartyMemberActor();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	// Gán nhân vật theo chỉ số trong bàn (MemberIndex = vị trí trong đội hình)
	UFUNCTION(BlueprintCallable, Category = "Match3")
	void SetupForMember(int32 InMemberIndex, UM3VisualSet* InVisualSet);

	// Nhấp nháy khi nhân vật này vừa tác động (role được kích hoạt)
	UFUNCTION(BlueprintCallable, Category = "Match3")
	void PulseAction();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Match3")
	UM3VisualSet* VisualSet = nullptr;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Match3")
	USkeletalMesh* SkeletalMeshToUse = nullptr;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Match3")
	UClass* AnimationBlueprintClass = nullptr;

private:
	UPROPERTY() USceneComponent* Root = nullptr;
	UPROPERTY() UStaticMeshComponent* FallbackMesh = nullptr;
	UPROPERTY() USkeletalMeshComponent* SkeletalMesh = nullptr;
	UPROPERTY() UTextRenderComponent* NameText = nullptr;
	UPROPERTY() UMaterialInstanceDynamic* DynMat = nullptr;

	UM3CombatSubsystem* GetCombat() const;

	int32 MemberIndex = 0;
	float PulseTimer = 0.f;
};
