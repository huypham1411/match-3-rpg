// =============================================================================
//  M3EnemySet.h  -  DATA ASSET riêng cho BỘ ĐỊCH (quái / tinh anh / trùm)
//  ---------------------------------------------------------------------------
//  Đây là chỗ bạn sửa bộ địch mà KHÔNG cần chạm vào lõi luật chơi:
//    Content Browser -> chuột phải -> Miscellaneous -> Data Asset -> M3EnemySet
//    (hoặc nhân bản DA_M3EnemySet mẫu do CreateDefaultEnemySet sinh ra).
//
//  Trong đó có 2 phần:
//    1) Enemies : danh mục địch (id, cấp bậc, chỉ số, kháng, chu kì hành động...)
//    2) Stages  : các màn, mỗi màn là danh sách id địch + story của màn
//
//  UM3CombatSubsystem sẽ ưu tiên dùng Data Asset này; không gán gì thì nó rơi về
//  bộ địch mặc định trong lõi (M3::FContentLibrary) nên game vẫn chạy được ngay.
//
//  Vì sao phải chuyển đổi qua M3::FEnemyDef? Vì luật chơi nằm ở module
//  Match3Core (không phụ thuộc Unreal) và được dùng chung với bản web WASM.
// =============================================================================
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"

#include "M3Battle.h"
#include "M3Content.h"
#include "M3Types.h"

#include "M3EnemySet.generated.h"

// ---------------------------------------------------------------------------
// Enum phía UE (giữ đúng thứ tự với enum trong lõi)
// ---------------------------------------------------------------------------
UENUM(BlueprintType)
enum class EM3EnemyTier : uint8
{
	Normal  UMETA(DisplayName = "Quái thường"),
	Elite   UMETA(DisplayName = "Quái tinh anh"),
	MidBoss UMETA(DisplayName = "Trùm giữa màn"),
	Boss    UMETA(DisplayName = "Trùm cuối màn")
};

UENUM(BlueprintType)
enum class EM3BossAction : uint8
{
	AoEAttack           UMETA(DisplayName = "Sát thương diện rộng"),
	SingleTargetAttack  UMETA(DisplayName = "Đòn đơn thể"),
	SpawnObstacles      UMETA(DisplayName = "Tạo vật cản"),
	WeakenTeam          UMETA(DisplayName = "Suy yếu đội"),
	SpawnTraps          UMETA(DisplayName = "Gài bẫy đếm ngược"),
	SelfBuff            UMETA(DisplayName = "Vận công tăng sát thương"),
	BossChargeAttack    UMETA(DisplayName = "Nạp tuyệt kĩ"),
	LockCells           UMETA(DisplayName = "Phong ấn ô"),
	ScrambleColors      UMETA(DisplayName = "Đảo màu block"),
	DrainUltimate       UMETA(DisplayName = "Hút ultimate"),
	SummonMinion        UMETA(DisplayName = "Triệu hồi quái")
};

// ---------------------------------------------------------------------------
// Một địch trong Data Asset
// ---------------------------------------------------------------------------
USTRUCT(BlueprintType)
struct MATCH3RPG_API FM3EnemyEntry
{
	GENERATED_BODY()

	// Mã duy nhất, dùng để tham chiếu từ FM3StageLineup.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Địch")
	FName Id = NAME_None;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Địch")
	FText DisplayName;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Địch")
	EM3EnemyTier Tier = EM3EnemyTier::Normal;

	// Khoá tra hình ở lớp UI (2D pixel ở bản web, thay mesh ở bản UE). Rỗng = tự suy theo cấp bậc.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Địch")
	FString SpriteKey;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Chỉ số", meta = (ClampMin = "1.0"))
	float Hp = 700.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Chỉ số", meta = (ClampMin = "1.0"))
	float Atk = 70.f;

	// Máu thanh stagger. Quái thường / tinh anh nên để 0; trùm thì nên có.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Chỉ số", meta = (ClampMin = "0.0"))
	float Stagger = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Chỉ số", meta = (ClampMin = "0.0", ClampMax = "90.0"))
	float PhysResistPercent = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Chỉ số", meta = (ClampMin = "0.0", ClampMax = "90.0"))
	float MagResistPercent = 0.f;

	// Số phase: trùm chết lần đầu sẽ hồi máu và đánh tiếp (1 = chỉ một phase).
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Chỉ số", meta = (ClampMin = "1"))
	int32 TotalPhases = 1;

	// Chu kì hành động: địch dùng lần lượt các chiêu này rồi quay vòng.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hành động")
	TArray<EM3BossAction> Pattern;
};

// ---------------------------------------------------------------------------
// Một màn: danh sách địch + story
// ---------------------------------------------------------------------------
USTRUCT(BlueprintType)
struct MATCH3RPG_API FM3StageLineup
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Màn")
	FText Title;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Màn", meta = (ClampMin = "1"))
	int32 MovesPerTurn = 4;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Màn", meta = (ClampMin = "0"))
	int32 StartObstacles = 3;

	// Id các địch xuất trận (lấy từ danh mục Enemies ở trên). Trùm nên để ở giữa hàng.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Màn")
	TArray<FName> EnemyIds;

	// ------------------------- Story của màn -------------------------
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Story")
	FString ChapterId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Story")
	FString ChapterTitle;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Story")
	FString StageTitle;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Story", meta = (MultiLine = "true"))
	FString Brief;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Story")
	TArray<FString> IntroLines;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Story")
	TArray<FString> VictoryLines;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Story")
	TArray<FString> DefeatLines;
};

// ---------------------------------------------------------------------------
// Data Asset: BỘ ĐỊCH
// ---------------------------------------------------------------------------
UCLASS(BlueprintType)
class MATCH3RPG_API UM3EnemySet : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	// Danh mục địch của game.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Bộ địch")
	TArray<FM3EnemyEntry> Enemies;

	// Các màn dựng từ danh mục trên (mỗi màn có thể gồm nhiều địch).
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Bộ địch")
	TArray<FM3StageLineup> Stages;

	// Tên các màn (cho UI/Blueprint đọc).
	UFUNCTION(BlueprintPure, Category = "Match3|EnemySet")
	TArray<FString> GetStageTitles() const;

	UFUNCTION(BlueprintPure, Category = "Match3|EnemySet")
	int32 GetStageCount() const { return Stages.Num(); }

	// Tìm một địch theo Id (nullptr nếu không có).
	const FM3EnemyEntry* FindEnemy(FName Id) const;

	// Chuyển 1 địch trong Data Asset sang dạng lõi.
	static M3::FEnemyDef ToCore(const FM3EnemyEntry& Entry);

	// Chuyển cả danh mục sang dạng lõi.
	std::vector<M3::FEnemyDef> ToCoreEnemies() const;

	// Dựng cấu hình trận của màn thứ StageIndex (địch + story + số lượt nối).
	// Trả về false nếu màn không tồn tại hoặc không có địch hợp lệ.
	bool BuildStageSetup(int32 StageIndex, M3::FBattleSetup& InOutSetup) const;

	// Dựng sẵn một bộ địch mặc định (lấy từ lõi) -> tiện tạo Data Asset mẫu trong Editor.
	UFUNCTION(BlueprintCallable, Category = "Match3|EnemySet", meta = (DisplayName = "Tạo bộ địch mặc định"))
	static UM3EnemySet* CreateDefaultEnemySet(UObject* Outer);

	// Kiểm tra dữ liệu: trả về danh sách lỗi (rỗng = hợp lệ).
	UFUNCTION(BlueprintCallable, Category = "Match3|EnemySet")
	TArray<FString> ValidateEnemySet() const;
};
