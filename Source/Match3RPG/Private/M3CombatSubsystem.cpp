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

FString UM3CombatSubsystem::GetLastMessage() const
{
	return bBattleActive ? M3Conv::Utf8(Battle.LastLog()) : TEXT("");
}
