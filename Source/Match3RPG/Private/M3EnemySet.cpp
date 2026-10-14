// =============================================================================
//  M3EnemySet.cpp  -  Cài đặt Data Asset bộ địch
// =============================================================================
#include "M3EnemySet.h"

namespace
{
	M3::EEnemyTier ToCoreTier(EM3EnemyTier Value)
	{
		switch (Value)
		{
		case EM3EnemyTier::Elite:   return M3::EEnemyTier::Elite;
		case EM3EnemyTier::MidBoss: return M3::EEnemyTier::MidBoss;
		case EM3EnemyTier::Boss:    return M3::EEnemyTier::Boss;
		default:                    return M3::EEnemyTier::Normal;
		}
	}

	EM3EnemyTier FromCoreTier(M3::EEnemyTier Value)
	{
		switch (Value)
		{
		case M3::EEnemyTier::Elite:   return EM3EnemyTier::Elite;
		case M3::EEnemyTier::MidBoss: return EM3EnemyTier::MidBoss;
		case M3::EEnemyTier::Boss:    return EM3EnemyTier::Boss;
		default:                      return EM3EnemyTier::Normal;
		}
	}

	M3::EBossAction ToCoreAction(EM3BossAction Value)
	{
		switch (Value)
		{
		case EM3BossAction::SingleTargetAttack: return M3::EBossAction::SingleTargetAttack;
		case EM3BossAction::SpawnObstacles:     return M3::EBossAction::SpawnObstacles;
		case EM3BossAction::WeakenTeam:         return M3::EBossAction::WeakenTeam;
		case EM3BossAction::SpawnTraps:         return M3::EBossAction::SpawnTraps;
		case EM3BossAction::SelfBuff:           return M3::EBossAction::SelfBuff;
		case EM3BossAction::BossChargeAttack:   return M3::EBossAction::BossChargeAttack;
		case EM3BossAction::LockCells:          return M3::EBossAction::LockCells;
		case EM3BossAction::ScrambleColors:     return M3::EBossAction::ScrambleColors;
		case EM3BossAction::DrainUltimate:      return M3::EBossAction::DrainUltimate;
		case EM3BossAction::SummonMinion:       return M3::EBossAction::SummonMinion;
		default:                                return M3::EBossAction::AoEAttack;
		}
	}

	EM3BossAction FromCoreAction(M3::EBossAction Value)
	{
		switch (Value)
		{
		case M3::EBossAction::SingleTargetAttack: return EM3BossAction::SingleTargetAttack;
		case M3::EBossAction::SpawnObstacles:     return EM3BossAction::SpawnObstacles;
		case M3::EBossAction::WeakenTeam:         return EM3BossAction::WeakenTeam;
		case M3::EBossAction::SpawnTraps:         return EM3BossAction::SpawnTraps;
		case M3::EBossAction::SelfBuff:           return EM3BossAction::SelfBuff;
		case M3::EBossAction::BossChargeAttack:   return EM3BossAction::BossChargeAttack;
		case M3::EBossAction::LockCells:          return EM3BossAction::LockCells;
		case M3::EBossAction::ScrambleColors:     return EM3BossAction::ScrambleColors;
		case M3::EBossAction::DrainUltimate:      return EM3BossAction::DrainUltimate;
		case M3::EBossAction::SummonMinion:       return EM3BossAction::SummonMinion;
		default:                                  return EM3BossAction::AoEAttack;
		}
	}

	// Chu kì mặc định khi người thiết kế để trống Pattern.
	TArray<M3::EBossAction> DefaultPatternForTier(M3::EEnemyTier Tier)
	{
		switch (Tier)
		{
		case M3::EEnemyTier::Boss:
			return { M3::EBossAction::AoEAttack, M3::EBossAction::SingleTargetAttack,
			         M3::EBossAction::SpawnObstacles, M3::EBossAction::BossChargeAttack };
		case M3::EEnemyTier::MidBoss:
			return { M3::EBossAction::SpawnObstacles, M3::EBossAction::LockCells, M3::EBossAction::AoEAttack };
		case M3::EEnemyTier::Elite:
			return { M3::EBossAction::SingleTargetAttack, M3::EBossAction::SpawnTraps };
		default:
			return { M3::EBossAction::AoEAttack, M3::EBossAction::SingleTargetAttack };
		}
	}
}

// -----------------------------------------------------------------------------
// Chuyển đổi sang dạng lõi
// -----------------------------------------------------------------------------
M3::FEnemyDef UM3EnemySet::ToCore(const FM3EnemyEntry& Entry)
{
	M3::FEnemyDef Def;
	Def.Id = TCHAR_TO_UTF8(*Entry.Id.ToString());
	Def.Name = TCHAR_TO_UTF8(*Entry.DisplayName.ToString());
	if (Def.Name.empty()) { Def.Name = Def.Id; }

	Def.Tier = ToCoreTier(Entry.Tier);
	Def.SpriteKey = TCHAR_TO_UTF8(*Entry.SpriteKey);
	Def.Hp = FMath::Max(1.f, Entry.Hp);
	Def.Atk = FMath::Max(1.f, Entry.Atk);
	Def.Stagger = FMath::Max(0.f, Entry.Stagger);
	Def.PhysResist = FMath::Clamp(Entry.PhysResistPercent, 0.f, 90.f) / 100.f;
	Def.MagResist  = FMath::Clamp(Entry.MagResistPercent, 0.f, 90.f) / 100.f;
	Def.TotalPhases = FMath::Max(1, Entry.TotalPhases);

	if (Entry.Pattern.Num() > 0)
	{
		for (const EM3BossAction Action : Entry.Pattern) { Def.Pattern.push_back(ToCoreAction(Action)); }
	}
	else
	{
		for (const M3::EBossAction Action : DefaultPatternForTier(Def.Tier)) { Def.Pattern.push_back(Action); }
	}
	return Def;
}

std::vector<M3::FEnemyDef> UM3EnemySet::ToCoreEnemies() const
{
	std::vector<M3::FEnemyDef> Out;
	Out.reserve(static_cast<size_t>(Enemies.Num()));
	for (const FM3EnemyEntry& Entry : Enemies) { Out.push_back(ToCore(Entry)); }
	return Out;
}

const FM3EnemyEntry* UM3EnemySet::FindEnemy(FName Id) const
{
	return Enemies.FindByPredicate([Id](const FM3EnemyEntry& Entry) { return Entry.Id == Id; });
}

TArray<FString> UM3EnemySet::GetStageTitles() const
{
	TArray<FString> Out;
	for (const FM3StageLineup& Stage : Stages) { Out.Add(Stage.Title.ToString()); }
	return Out;
}

// -----------------------------------------------------------------------------
// Dựng cấu hình trận từ một màn trong Data Asset
// -----------------------------------------------------------------------------
bool UM3EnemySet::BuildStageSetup(int32 StageIndex, M3::FBattleSetup& InOutSetup) const
{
	if (!Stages.IsValidIndex(StageIndex)) { return false; }

	const FM3StageLineup& Stage = Stages[StageIndex];
	std::vector<M3::FEnemyDef> Lineup;
	for (const FName Id : Stage.EnemyIds)
	{
		if (const FM3EnemyEntry* Entry = FindEnemy(Id))
		{
			Lineup.push_back(ToCore(*Entry));
		}
	}
	if (Lineup.empty()) { return false; }

	InOutSetup.Enemies = std::move(Lineup);
	InOutSetup.MovesPerTurn = FMath::Max(1, Stage.MovesPerTurn);
	InOutSetup.StartObstacles = FMath::Max(0, Stage.StartObstacles);

	M3::FStageStory& Story = InOutSetup.Story;
	Story.ChapterId = TCHAR_TO_UTF8(*Stage.ChapterId);
	Story.ChapterTitle = TCHAR_TO_UTF8(*Stage.ChapterTitle);
	Story.StageTitle = TCHAR_TO_UTF8(*Stage.StageTitle);
	Story.Brief = TCHAR_TO_UTF8(*Stage.Brief);

	Story.IntroLines.clear();
	for (const FString& Line : Stage.IntroLines) { Story.IntroLines.push_back(TCHAR_TO_UTF8(*Line)); }
	Story.VictoryLines.clear();
	for (const FString& Line : Stage.VictoryLines) { Story.VictoryLines.push_back(TCHAR_TO_UTF8(*Line)); }
	Story.DefeatLines.clear();
	for (const FString& Line : Stage.DefeatLines) { Story.DefeatLines.push_back(TCHAR_TO_UTF8(*Line)); }

	return true;
}

// -----------------------------------------------------------------------------
// Sinh Data Asset mẫu từ bộ địch đang có trong lõi
// -----------------------------------------------------------------------------
UM3EnemySet* UM3EnemySet::CreateDefaultEnemySet(UObject* Outer)
{
	UM3EnemySet* Set = NewObject<UM3EnemySet>(Outer ? Outer : GetTransientPackage());
	if (!Set) { return nullptr; }

	// 1) Danh mục địch lấy từ lõi.
	for (const M3::FEnemyDef& Def : M3::FContentLibrary::AllEnemies())
	{
		FM3EnemyEntry Entry;
		Entry.Id = FName(UTF8_TO_TCHAR(Def.Id.c_str()));
		Entry.DisplayName = FText::FromString(UTF8_TO_TCHAR(Def.Name.c_str()));
		Entry.Tier = FromCoreTier(Def.Tier);
		Entry.SpriteKey = UTF8_TO_TCHAR(Def.SpriteKey.c_str());
		Entry.Hp = Def.Hp;
		Entry.Atk = Def.Atk;
		Entry.Stagger = Def.Stagger;
		Entry.PhysResistPercent = Def.PhysResist * 100.f;
		Entry.MagResistPercent = Def.MagResist * 100.f;
		Entry.TotalPhases = Def.TotalPhases;

		for (const M3::EBossAction Action : Def.Pattern) { Entry.Pattern.Add(FromCoreAction(Action)); }
		Set->Enemies.Add(MoveTemp(Entry));
	}

	// 2) Các màn lấy từ chiến dịch mẫu của lõi.
	for (const M3::FBattleSetup& StageSetup : M3::FContentLibrary::CampaignStages())
	{
		FM3StageLineup Stage;
		Stage.Title = FText::FromString(UTF8_TO_TCHAR(StageSetup.Story.StageTitle.c_str()));
		Stage.MovesPerTurn = StageSetup.Balance.MovesPerTurn;
		Stage.StartObstacles = StageSetup.StartObstacles;

		for (const M3::FEnemyDef& Def : StageSetup.BuildEnemyList())
		{
			Stage.EnemyIds.Add(FName(UTF8_TO_TCHAR(Def.Id.c_str())));
		}

		Stage.ChapterId = UTF8_TO_TCHAR(StageSetup.Story.ChapterId.c_str());
		Stage.ChapterTitle = UTF8_TO_TCHAR(StageSetup.Story.ChapterTitle.c_str());
		Stage.StageTitle = UTF8_TO_TCHAR(StageSetup.Story.StageTitle.c_str());
		Stage.Brief = UTF8_TO_TCHAR(StageSetup.Story.Brief.c_str());
		for (const std::string& Line : StageSetup.Story.IntroLines) { Stage.IntroLines.Add(UTF8_TO_TCHAR(Line.c_str())); }
		for (const std::string& Line : StageSetup.Story.VictoryLines) { Stage.VictoryLines.Add(UTF8_TO_TCHAR(Line.c_str())); }
		for (const std::string& Line : StageSetup.Story.DefeatLines) { Stage.DefeatLines.Add(UTF8_TO_TCHAR(Line.c_str())); }

		Set->Stages.Add(MoveTemp(Stage));
	}

	return Set;
}

// -----------------------------------------------------------------------------
// Kiểm tra dữ liệu
// -----------------------------------------------------------------------------
TArray<FString> UM3EnemySet::ValidateEnemySet() const
{
	TArray<FString> Problems;

	TSet<FName> SeenIds;
	for (const FM3EnemyEntry& Entry : Enemies)
	{
		if (Entry.Id.IsNone())
		{
			Problems.Add(TEXT("Có địch chưa đặt Id."));
			continue;
		}
		if (SeenIds.Contains(Entry.Id))
		{
			Problems.Add(FString::Printf(TEXT("Trùng Id địch: %s"), *Entry.Id.ToString()));
		}
		SeenIds.Add(Entry.Id);

		if (Entry.Hp <= 0.f) { Problems.Add(FString::Printf(TEXT("%s: Hp phải lớn hơn 0."), *Entry.Id.ToString())); }
		if (Entry.Atk <= 0.f) { Problems.Add(FString::Printf(TEXT("%s: Atk phải lớn hơn 0."), *Entry.Id.ToString())); }
		if (Entry.Tier == EM3EnemyTier::Normal && Entry.Stagger > 0.f)
		{
			Problems.Add(FString::Printf(TEXT("%s: quái thường không nên có thanh stagger."), *Entry.Id.ToString()));
		}
	}

	for (int32 Index = 0; Index < Stages.Num(); ++Index)
	{
		const FM3StageLineup& Stage = Stages[Index];
		if (Stage.EnemyIds.Num() == 0)
		{
			Problems.Add(FString::Printf(TEXT("Màn %d (%s) chưa có địch nào."), Index, *Stage.Title.ToString()));
		}
		for (const FName Id : Stage.EnemyIds)
		{
			if (!SeenIds.Contains(Id))
			{
				Problems.Add(FString::Printf(TEXT("Màn %d tham chiếu địch không tồn tại: %s"), Index, *Id.ToString()));
			}
		}
	}

	return Problems;
}
