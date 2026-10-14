// =============================================================================
//  M3GameMode.h  -  Dựng thế giới tối thiểu để game chạy trong MỌI level
//  ---------------------------------------------------------------------------
//  Bạn có thể mở một map TRỐNG hoàn toàn rồi bấm Play: GameMode này sẽ tự sinh
//  sàn, đèn, bàn nối, boss, đội hình. Nhờ vậy project không phụ thuộc vào asset
//  nào có sẵn - chỉ cần build C++ là chơi được.
// =============================================================================
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"

#include "M3GameMode.generated.h"

class AM3BoardActor;
class AM3BossActor;
class AM3PartyMemberActor;
class UM3VisualSet;

UCLASS()
class MATCH3RPG_API AM3GameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AM3GameMode();

	virtual void BeginPlay() override;

	// Vị trí bàn nối trong thế giới
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Match3")
	FVector BoardLocation = FVector(0.f, 0.f, 0.f);

	// Khoảng cách giữa 2 nhân vật trong đội
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Match3")
	float PartySpacing = 260.f;

	// Bộ hình ảnh dùng chung (gán trong Editor nếu bạn có asset riêng)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Match3")
	UM3VisualSet* VisualSet = nullptr;

	// Gọi lại khi bạn muốn đổi map (nút "Map kế tiếp" trên HUD)
	UFUNCTION(BlueprintCallable, Category = "Match3")
	void GoToStage(int32 StageIndex);

	UFUNCTION(BlueprintCallable, Category = "Match3")
	AM3BoardActor* GetBoardActor() const;

private:
	UPROPERTY() AM3BoardActor* BoardActor = nullptr;
	// Mỗi địch trong trận là một actor riêng (nhiều quái / nhiều boss cùng lúc).
	UPROPERTY() TArray<AM3BossActor*> EnemyActors;
	UPROPERTY() TArray<AM3PartyMemberActor*> PartyActors;

	void EnsureWorldDecor();
	void SpawnGameplayActors();
	void LayoutEnemyActors();
	void ClearEnemyActors();
	void LayoutPartyActors();
	void RefreshPartyVisuals();
};
