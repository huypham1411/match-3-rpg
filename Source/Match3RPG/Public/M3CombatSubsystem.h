// =============================================================================
//  M3CombatSubsystem.h  -  Cầu nối giữa UE và lõi luật chơi
//  ---------------------------------------------------------------------------
//  Subsystem sống cùng GameInstance nên tồn tại xuyên suốt phiên chơi. Nó giữ
//  một đối tượng M3::FBattle (lõi luật chơi) và bọc lại thành API cho UE:
//    - Bấm/gọi được từ Blueprint (UFUNCTION BlueprintCallable)
//    - Báo cho các actor biết "trạng thái đã đổi" qua biến Revision
//  Muốn đổi luật chơi -> sửa code trong Source/Match3Core, không cần sửa file này.
// =============================================================================
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"

#include "M3Battle.h"
#include "M3Content.h"
#include "M3Team.h"

#include "M3EnemySet.h"

#include "M3CombatSubsystem.generated.h"

UCLASS()
class MATCH3RPG_API UM3CombatSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	// ---------- Điều khiển trận ----------
	UFUNCTION(BlueprintCallable, Category = "Match3")
	void StartStage(int32 StageIndex = 0);

	UFUNCTION(BlueprintCallable, Category = "Match3")
	void RestartStage();

	UFUNCTION(BlueprintCallable, Category = "Match3")
	void NextStage();

	// ---------- Bộ địch (Data Asset) ----------
	// Gán bộ địch cho trận. Bỏ trống -> dùng bộ địch mặc định trong lõi.
	UFUNCTION(BlueprintCallable, Category = "Match3|EnemySet")
	void SetEnemySet(UM3EnemySet* InEnemySet);

	UFUNCTION(BlueprintPure, Category = "Match3|EnemySet")
	UM3EnemySet* GetEnemySet() const { return EnemySet; }

	// Số màn hiện có (theo Data Asset nếu đã gán, ngược lại theo chiến dịch mặc định).
	UFUNCTION(BlueprintPure, Category = "Match3|EnemySet")
	int32 GetStageCount() const;

	// Đổi chỗ 2 ô kề nhau. Trả về true nếu nước đi hợp lệ.
	UFUNCTION(BlueprintCallable, Category = "Match3")
	bool TrySwap(int32 X1, int32 Y1, int32 X2, int32 Y2);

	UFUNCTION(BlueprintCallable, Category = "Match3")
	bool UseBasicSkill(int32 MemberIndex);

	UFUNCTION(BlueprintCallable, Category = "Match3")
	bool UseUltimate(int32 MemberIndex);

	UFUNCTION(BlueprintCallable, Category = "Match3")
	void EndTurn();

	// ---------- Truy vấn trạng thái (cho HUD/actor đọc) ----------
	UFUNCTION(BlueprintPure, Category = "Match3") bool IsBattleActive() const { return bBattleActive; }
	UFUNCTION(BlueprintPure, Category = "Match3") int32 GetTurn() const;
	UFUNCTION(BlueprintPure, Category = "Match3") int32 GetMovesLeft() const;
	UFUNCTION(BlueprintPure, Category = "Match3") int32 GetObstacleCount() const;
	UFUNCTION(BlueprintPure, Category = "Match3") float GetBossHpPercent() const;
	UFUNCTION(BlueprintPure, Category = "Match3") float GetStaggerPercent() const;
	UFUNCTION(BlueprintPure, Category = "Match3") bool IsBossBroken() const;
	UFUNCTION(BlueprintPure, Category = "Match3") float GetTeamHpPercent() const;
	UFUNCTION(BlueprintPure, Category = "Match3") int32 GetStars() const;
	UFUNCTION(BlueprintPure, Category = "Match3") bool IsVictory() const;
	UFUNCTION(BlueprintPure, Category = "Match3") bool IsDefeat() const;
	UFUNCTION(BlueprintPure, Category = "Match3") bool IsFinished() const;
	UFUNCTION(BlueprintPure, Category = "Match3") int32 GetStageIndex() const { return StageIndex; }
	UFUNCTION(BlueprintPure, Category = "Match3") FString GetBossName() const;
	UFUNCTION(BlueprintPure, Category = "Match3") FString GetLastMessage() const;

	// ---------- Hàng địch (nhiều quái / nhiều boss) ----------
	UFUNCTION(BlueprintPure, Category = "Match3|Enemy") int32 GetEnemyCount() const;
	UFUNCTION(BlueprintPure, Category = "Match3|Enemy") int32 GetEnemyAliveCount() const;
	UFUNCTION(BlueprintPure, Category = "Match3|Enemy") FString GetEnemyName(int32 EnemyIndex) const;
	// 0 = Quái thường, 1 = Tinh anh, 2 = Trùm giữa màn, 3 = Trùm cuối màn
	UFUNCTION(BlueprintPure, Category = "Match3|Enemy") int32 GetEnemyTier(int32 EnemyIndex) const;
	UFUNCTION(BlueprintPure, Category = "Match3|Enemy") FString GetEnemyTierName(int32 EnemyIndex) const;
	UFUNCTION(BlueprintPure, Category = "Match3|Enemy") float GetEnemyHpPercent(int32 EnemyIndex) const;
	UFUNCTION(BlueprintPure, Category = "Match3|Enemy") bool IsEnemyAlive(int32 EnemyIndex) const;
	UFUNCTION(BlueprintPure, Category = "Match3|Enemy") float GetEnemyStaggerPercent(int32 EnemyIndex) const;
	UFUNCTION(BlueprintPure, Category = "Match3|Enemy") bool IsEnemyBroken(int32 EnemyIndex) const;
	UFUNCTION(BlueprintPure, Category = "Match3|Enemy") FString GetEnemyIntentName(int32 EnemyIndex) const;
	UFUNCTION(BlueprintPure, Category = "Match3|Enemy") int32 GetEnemyIntentTarget(int32 EnemyIndex) const;

	// Mục tiêu đang được ngắm + đổi mục tiêu (click thẻ địch trên HUD).
	UFUNCTION(BlueprintCallable, Category = "Match3|Enemy") int32 GetTargetEnemy() const;
	UFUNCTION(BlueprintCallable, Category = "Match3|Enemy") bool SetTargetEnemy(int32 EnemyIndex);
	UFUNCTION(BlueprintCallable, Category = "Match3|Enemy") void CycleTargetEnemy();

	// ---------- Story của màn ----------
	UFUNCTION(BlueprintPure, Category = "Match3|Story") FString GetStoryChapterTitle() const;
	UFUNCTION(BlueprintPure, Category = "Match3|Story") FString GetStoryStageTitle() const;
	UFUNCTION(BlueprintPure, Category = "Match3|Story") FString GetStoryBrief() const;
	UFUNCTION(BlueprintPure, Category = "Match3|Story") int32 GetStoryIntroCount() const;
	UFUNCTION(BlueprintPure, Category = "Match3|Story") FString GetStoryIntroLine(int32 Index) const;

	// Số thứ tự thay đổi trạng thái: actor so sánh để biết khi nào cần vẽ lại.
	int32 GetRevision() const { return Revision; }

	const M3::FBattle& GetBattle() const { return Battle; }
	M3::FBattle& GetMutableBattle() { return Battle; }

private:
	M3::FBattle Battle;          // lõi luật chơi (thuần C++)
	bool  bBattleActive = false;
	int32 Revision = 0;
	int32 StageIndex = 0;

	// Bộ địch do nhà thiết kế gán trong Editor (có thể để trống).
	UPROPERTY(EditAnywhere, Category = "Match3")
	UM3EnemySet* EnemySet = nullptr;

	void MarkChanged() { ++Revision; }
	void ApplyStage(int32 InStageIndex);
};
