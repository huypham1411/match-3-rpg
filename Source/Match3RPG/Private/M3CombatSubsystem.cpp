// =============================================================================
//  M3CombatSubsystem.cpp
// =============================================================================
#include "M3CombatSubsystem.h"

#include "M3UETypes.h"

void UM3CombatSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	// Vào game là có trận luôn (map 1) để bấm là chơi được ngay.
	ApplyStage(0);
}

void UM3CombatSubsystem::Deinitialize()
{
	Super::Deinitialize();
}

void UM3CombatSubsystem::ApplyStage(int32 InStageIndex)
{
	// Ưu tiên BỘ ĐỊCH trong Data Asset nếu nhà thiết kế đã gán;
	// không gán gì thì rơi về chiến dịch mặc định trong lõi.
	if (EnemySet && EnemySet->GetStageCount() > 0)
	{
		StageIndex = FMath::Clamp(InStageIndex, 0, EnemySet->GetStageCount() - 1);

		M3::FBattleSetup Setup = M3::FContentLibrary::DefaultBattleSetup(6, 20261008u);
		if (EnemySet->BuildStageSetup(StageIndex, Setup))
		{
			Battle.Setup(Setup);
			bBattleActive = true;
			MarkChanged();
			UE_LOG(LogTemp, Log, TEXT("[Match3] Bat dau man %d tu Data Asset - %d dich"),
				StageIndex + 1, Battle.EnemyCount());
			return;
		}
		UE_LOG(LogTemp, Warning, TEXT("[Match3] Data Asset man %d khong dung duoc, quay ve chien dich mac dinh."),
			StageIndex + 1);
	}

	const std::vector<M3::FBattleSetup> Stages = M3::FContentLibrary::CampaignStages();

	StageIndex = (Stages.empty()) ? 0 : FMath::Clamp(InStageIndex, 0, static_cast<int32>(Stages.size()) - 1);

	if (Stages.empty())
	{
		// Trường hợp không có map nào: dựng trận mặc định.
		Battle.Setup(M3::FContentLibrary::DefaultBattleSetup(4, 20261008u));
	}
	else
	{
		Battle.Setup(Stages[static_cast<size_t>(StageIndex)]);
	}

	bBattleActive = true;
	MarkChanged();

	UE_LOG(LogTemp, Log, TEXT("[Match3] Bat dau map %d - boss %s"),
		StageIndex + 1, *M3Conv::Utf8(Battle.Boss().Name));
}

void UM3CombatSubsystem::StartStage(int32 InStageIndex)
{
	ApplyStage(InStageIndex);
}

void UM3CombatSubsystem::SetEnemySet(UM3EnemySet* InEnemySet)
{
	EnemySet = InEnemySet;

	// Có bộ địch mới -> chơi lại từ màn đầu của bộ đó.
	ApplyStage(0);
}

int32 UM3CombatSubsystem::GetStageCount() const
{
	if (EnemySet && EnemySet->GetStageCount() > 0) { return EnemySet->GetStageCount(); }
	return static_cast<int32>(M3::FContentLibrary::CampaignStages().size());
}

void UM3CombatSubsystem::RestartStage()
{
	ApplyStage(StageIndex);
}

void UM3CombatSubsystem::NextStage()
{
	ApplyStage(StageIndex + 1);
}

bool UM3CombatSubsystem::TrySwap(int32 X1, int32 Y1, int32 X2, int32 Y2)
{
	if (!bBattleActive) { return false; }

	const M3::FActionResult Result = Battle.PlayerSwap(M3::MakeCell(X1, Y1), M3::MakeCell(X2, Y2));
	if (!Result.IsOk())
	{
		UE_LOG(LogTemp, Verbose, TEXT("[Match3] Nuoc di khong hop le: %s"), *M3Conv::Utf8(Result.Message));
		MarkChanged();   // vẫn báo để HUD hiện dòng thông báo
		return false;
	}

	MarkChanged();
	return true;
}

bool UM3CombatSubsystem::UseBasicSkill(int32 MemberIndex)
{
	if (!bBattleActive) { return false; }
	const M3::FActionResult Result = Battle.UseBasicSkill(MemberIndex);
	MarkChanged();
	return Result.IsOk();
}

bool UM3CombatSubsystem::UseUltimate(int32 MemberIndex)
{
	if (!bBattleActive) { return false; }
	const M3::FActionResult Result = Battle.UseUltimate(MemberIndex);
	MarkChanged();
	return Result.IsOk();
}

void UM3CombatSubsystem::EndTurn()
{
	if (!bBattleActive) { return; }
	Battle.EndTurn();
	MarkChanged();
}

// -----------------------------------------------------------------------------
// Truy vấn
// -----------------------------------------------------------------------------
int32 UM3CombatSubsystem::GetTurn() const        { return bBattleActive ? Battle.Turn() : 0; }
int32 UM3CombatSubsystem::GetMovesLeft() const   { return bBattleActive ? Battle.MovesLeft() : 0; }
int32 UM3CombatSubsystem::GetObstacleCount() const { return bBattleActive ? Battle.Board().ObstacleCount() : 0; }
float UM3CombatSubsystem::GetBossHpPercent() const { return bBattleActive ? Battle.Boss().HpPercent() : 0.f; }
float UM3CombatSubsystem::GetStaggerPercent() const { return bBattleActive ? Battle.Boss().StaggerPercent() : 0.f; }
bool  UM3CombatSubsystem::IsBossBroken() const   { return bBattleActive && Battle.Boss().bBroken; }
float UM3CombatSubsystem::GetTeamHpPercent() const
{
	if (!bBattleActive) { return 0.f; }
	const float Max = Battle.Party().TotalHpMax();
	return (Max > 0.f) ? (Battle.Party().TotalHp() / Max) : 0.f;
}
int32 UM3CombatSubsystem::GetStars() const       { return bBattleActive ? Battle.EvaluateStars() : 0; }
bool  UM3CombatSubsystem::IsVictory() const      { return bBattleActive && Battle.IsVictory(); }
bool  UM3CombatSubsystem::IsDefeat() const       { return bBattleActive && Battle.IsDefeat(); }
bool  UM3CombatSubsystem::IsFinished() const     { return bBattleActive && Battle.IsFinished(); }

FString UM3CombatSubsystem::GetBossName() const
{
	return bBattleActive ? M3Conv::Utf8(Battle.Boss().Name) : TEXT("-");
}

// -----------------------------------------------------------------------------
// Hàng địch (nhiều quái / nhiều boss)
// -----------------------------------------------------------------------------
int32 UM3CombatSubsystem::GetEnemyCount() const
{
	return bBattleActive ? Battle.EnemyCount() : 0;
}

int32 UM3CombatSubsystem::GetEnemyAliveCount() const
{
	return bBattleActive ? Battle.AliveEnemyCount() : 0;
}

FString UM3CombatSubsystem::GetEnemyName(int32 EnemyIndex) const
{
	const M3::FEnemyState* Enemy = bBattleActive ? Battle.TryGetEnemy(EnemyIndex) : nullptr;
	return Enemy ? M3Conv::Utf8(Enemy->Name) : TEXT("-");
}

int32 UM3CombatSubsystem::GetEnemyTier(int32 EnemyIndex) const
{
	const M3::FEnemyState* Enemy = bBattleActive ? Battle.TryGetEnemy(EnemyIndex) : nullptr;
	return Enemy ? static_cast<int32>(Enemy->Tier()) : 0;
}

FString UM3CombatSubsystem::GetEnemyTierName(int32 EnemyIndex) const
{
	const M3::FEnemyState* Enemy = bBattleActive ? Battle.TryGetEnemy(EnemyIndex) : nullptr;
	return Enemy ? M3Conv::Utf8(std::string(M3::EnemyTierName(Enemy->Tier()))) : TEXT("-");
}

float UM3CombatSubsystem::GetEnemyHpPercent(int32 EnemyIndex) const
{
	const M3::FEnemyState* Enemy = bBattleActive ? Battle.TryGetEnemy(EnemyIndex) : nullptr;
	return Enemy ? Enemy->HpPercent() : 0.f;
}

bool UM3CombatSubsystem::IsEnemyAlive(int32 EnemyIndex) const
{
	const M3::FEnemyState* Enemy = bBattleActive ? Battle.TryGetEnemy(EnemyIndex) : nullptr;
	return Enemy && Enemy->bAlive;
}

float UM3CombatSubsystem::GetEnemyStaggerPercent(int32 EnemyIndex) const
{
	const M3::FEnemyState* Enemy = bBattleActive ? Battle.TryGetEnemy(EnemyIndex) : nullptr;
	return Enemy ? Enemy->StaggerPercent() : 0.f;
}

bool UM3CombatSubsystem::IsEnemyBroken(int32 EnemyIndex) const
{
	const M3::FEnemyState* Enemy = bBattleActive ? Battle.TryGetEnemy(EnemyIndex) : nullptr;
	return Enemy && Enemy->bBroken;
}

FString UM3CombatSubsystem::GetEnemyIntentName(int32 EnemyIndex) const
{
	const M3::FEnemyState* Enemy = bBattleActive ? Battle.TryGetEnemy(EnemyIndex) : nullptr;
	if (!Enemy) { return TEXT("-"); }
	return M3Conv::Utf8(std::string(M3::BossActionName(Enemy->IntentAction)));
}

int32 UM3CombatSubsystem::GetEnemyIntentTarget(int32 EnemyIndex) const
{
	const M3::FEnemyState* Enemy = bBattleActive ? Battle.TryGetEnemy(EnemyIndex) : nullptr;
	return Enemy ? Enemy->IntentTargetMemberIndex : -1;
}

int32 UM3CombatSubsystem::GetTargetEnemy() const
{
	return bBattleActive ? Battle.TargetEnemyIndex() : 0;
}

bool UM3CombatSubsystem::SetTargetEnemy(int32 EnemyIndex)
{
	if (!bBattleActive) { return false; }
	const bool Ok = Battle.SetTargetEnemy(EnemyIndex);
	MarkChanged();
	return Ok;
}

void UM3CombatSubsystem::CycleTargetEnemy()
{
	if (!bBattleActive) { return; }

	const int32 Count = Battle.EnemyCount();
	if (Count <= 0) { return; }

	const int32 Current = Battle.TargetEnemyIndex();
	for (int32 Step = 1; Step <= Count; ++Step)
	{
		const int32 Candidate = (Current + Step) % Count;
		if (Battle.IsValidEnemyIndex(Candidate) && Battle.Enemies()[static_cast<size_t>(Candidate)].bAlive)
		{
			Battle.SetTargetEnemy(Candidate);
			MarkChanged();
			return;
		}
	}
}

// -----------------------------------------------------------------------------
// Story của màn
// -----------------------------------------------------------------------------
FString UM3CombatSubsystem::GetStoryChapterTitle() const
{
	return bBattleActive ? M3Conv::Utf8(Battle.Story().ChapterTitle) : TEXT("");
}

FString UM3CombatSubsystem::GetStoryStageTitle() const
{
	return bBattleActive ? M3Conv::Utf8(Battle.Story().StageTitle) : TEXT("");
}

FString UM3CombatSubsystem::GetStoryBrief() const
{
	return bBattleActive ? M3Conv::Utf8(Battle.Story().Brief) : TEXT("");
}

int32 UM3CombatSubsystem::GetStoryIntroCount() const
{
	return bBattleActive ? static_cast<int32>(Battle.Story().IntroLines.size()) : 0;
}

FString UM3CombatSubsystem::GetStoryIntroLine(int32 Index) const
{
	if (!bBattleActive) { return TEXT(""); }
	const std::vector<std::string>& Lines = Battle.Story().IntroLines;
	if (Index < 0 || Index >= static_cast<int32>(Lines.size())) { return TEXT(""); }
	return M3Conv::Utf8(Lines[static_cast<size_t>(Index)]);
}

FString UM3CombatSubsystem::GetLastMessage() const
{
	return bBattleActive ? M3Conv::Utf8(Battle.LastLog()) : TEXT("");
}
