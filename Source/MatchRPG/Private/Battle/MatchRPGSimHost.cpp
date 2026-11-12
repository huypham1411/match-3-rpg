// Copyright MatchRPG. Implementation of the session wrapper around the core.
#include "Battle/MatchRPGSimHost.h"

#include "MatchRPG.h"

void FMatchRPGSimHost::InitializeDefaults()
{
	MatchRPG::ContentCore::BuildFullRoster(Roster);
	MatchRPG::ContentCore::BuildSkillLibrary(Skills);
	MatchRPG::ContentCore::BuildGachaPool(Roster, GachaPool);

	MatchRPG::FMatchRng GachaRng(static_cast<uint64>(Seed) * 7919u + 13u);
	Gacha.Initialize(GachaPool, &GachaRng);

	OwnedCharacterIds.Reset();
	OwnAllStartingHeroes();

	// A brand new account fields the four starters.
	Formation = MatchRPG::FTeamFormation();
	MatchRPG::ContentCore::BuildStarterFormation(Roster, Formation);
}

void FMatchRPGSimHost::OwnAllStartingHeroes()
{
	for (int32 i = 0; i < Roster.Num(); ++i)
	{
		if (Roster[i].Id <= 4) { OwnedCharacterIds.Add(Roster[i].Id); }
	}
}

bool FMatchRPGSimHost::HasHero(int32 CharacterId) const
{
	return OwnedCharacterIds.Contains(CharacterId);
}

void FMatchRPGSimHost::SetMessage(const FString& Text)
{
	LastMessage = Text;
}

void FMatchRPGSimHost::StartBattle(int32 InStageNumber, int32 InSeed)
{
	StageNumber = FMath::Max(1, InStageNumber);
	Seed = InSeed;

	MatchRPG::FStageDefinitionRow Stage;
	MatchRPG::ContentCore::BuildDemoStage(Stage);
	Stage.StageId = StageNumber;
	// Later stages simply hit harder; real stage data belongs in UMatchRPGStageAsset.
	Stage.Boss.MaxHp = Stage.Boss.MaxHp + (StageNumber - 1) * 4000;
	Stage.Boss.Script[2].Magnitude = 150 + (StageNumber - 1) * 40;

	Sim.Setup(Stage, Roster, Formation, static_cast<uint64>(Seed) + static_cast<uint64>(StageNumber) * 101u);
	bBattleActive = true;
	ClearSelection();
	SetMessage(FString::Printf(TEXT("Stage %d - battle started (seed %d)"), StageNumber, Seed));
}

void FMatchRPGSimHost::RestartBattle()
{
	if (bBattleActive)
	{
		StartBattle(StageNumber, Seed + 1);
	}
}

bool FMatchRPGSimHost::SelectCell(int32 X, int32 Y)
{
	const MatchRPG::FMatchBoardCore& Board = Sim.GetBoard();
	if (!Board.IsInBounds(X, Y)) { return false; }

	if (SelectedX == INDEX_NONE)
	{
		SelectedX = X;
		SelectedY = Y;
		return false; // selection made, no swap yet
	}

	if (SelectedX == X && SelectedY == Y)
	{
		ClearSelection();
		return false;
	}

	const bool bWasAdjacent = TrySwapCells(SelectedX, SelectedY, X, Y);
	ClearSelection();
	return bWasAdjacent;
}

bool FMatchRPGSimHost::TrySwapCells(int32 AX, int32 AY, int32 BX, int32 BY)
{
	if (!bBattleActive) { return false; }

	const MatchRPG::FMatchBoardCore& Board = Sim.GetBoard();
	if (!Board.IsInBounds(AX, AY) || !Board.IsInBounds(BX, BY)) { return false; }

	if (!Sim.TrySwap(FIntPoint(AX, AY), FIntPoint(BX, BY)))
	{
		SetMessage(TEXT("No match there - try another swap"));
		return false;
	}

	const MatchRPG::FResolveOutcome& Outcome = Sim.GetLastOutcome();
	SetMessage(FString::Printf(TEXT("Cleared %d blocks, cascade x%.2f, obstacles %d, specials %d"),
		Outcome.TotalBlocksCleared, Outcome.CascadeMultiplier, Outcome.ObstaclesDestroyed, Outcome.SpecialsCreated));
	return true;
}

bool FMatchRPGSimHost::FireUltimate(int32 SlotIndex)
{
	if (!Sim.FireUltimate(SlotIndex)) { return false; }
	SetMessage(FString::Printf(TEXT("Ultimate fired from slot %d (chain %d)"), SlotIndex, Sim.GetBurstChainCount()));
	return true;
}

bool FMatchRPGSimHost::FireManualSkill(int32 SlotIndex)
{
	if (!Sim.FireManualSkill(SlotIndex)) { return false; }
	SetMessage(FString::Printf(TEXT("Skill used by slot %d"), SlotIndex));
	return true;
}

void FMatchRPGSimHost::EndTurn()
{
	if (!bBattleActive) { return; }
	Sim.EndTurn();
	SetMessage(TEXT("Turn ended"));
}

FString FMatchRPGSimHost::PullTenGacha()
{
	const int32 Cost = 300;
	if (Gems < Cost)
	{
		SetMessage(TEXT("Not enough gems"));
		return LastMessage;
	}
	Gems -= Cost;

	TArray<MatchRPG::FGachaPullResult> Results;
	Gacha.PullTen(Results);

	int32 FiveStars = 0;
	int32 NewHeroes = 0;
	FString Summary;
	for (int32 i = 0; i < Results.Num(); ++i)
	{
		const int32 CharacterId = Results[i].CharacterId;
		if (CharacterId == INDEX_NONE) { continue; }

		if (Results[i].Rarity >= 5) { ++FiveStars; }
		if (!HasHero(CharacterId))
		{
			OwnedCharacterIds.Add(CharacterId);
			++NewHeroes;
		}
		if (i > 0) { Summary += TEXT(" "); }
		Summary += FString::Printf(TEXT("%d*"), Results[i].Rarity);
	}

	SetMessage(FString::Printf(TEXT("10-pull: %s | new heroes: %d, 5-star: %d, pity in %d"),
		*Summary, NewHeroes, FiveStars, GachaPool.PityThreshold - Gacha.GetPityCounter()));
	return LastMessage;
}

FString FMatchRPGSimHost::DescribeBoardCell(int32 X, int32 Y) const
{
	const MatchRPG::FMatchBoardCore& Board = Sim.GetBoard();
	if (!Board.IsInBounds(X, Y)) { return FString(); }

	const MatchRPG::FBlockCell& Cell = Board.At(X, Y);
	if (Cell.IsObstacle())
	{
		return FString::Printf(TEXT("%s (%d hp)"), MatchRPG::ToText(Cell.Obstacle), Cell.Hp);
	}
	if (Cell.IsNormal())
	{
		return FString::Printf(TEXT("%s%s%s"),
			MatchRPG::ToText(Cell.Color),
			Cell.Special != MatchRPG::ESpecialType::None ? *FString::Printf(TEXT(" +%s"), MatchRPG::ToText(Cell.Special)) : TEXT(""),
			Cell.bJammed ? TEXT(" [jammed]") : TEXT(""));
	}
	return TEXT("empty");
}

// ---------------------------------------------------------------------------
// Nhật ký trận đấu -> Output Log của Unreal
// ---------------------------------------------------------------------------

void FMatchRPGSimHost::FlushNewEventsToLog()
{
	const TArray<MatchRPG::FBattleEvent>& Log = Sim.GetLog();

	// Chỉ in phần mới: Tick gọi hàm này mỗi khung hình nên phải rẻ.
	for (; LoggedEventCount < Log.Num(); ++LoggedEventCount)
	{
		UE_LOG(LogMatchRPG, Log, TEXT("%s"), *DescribeBattleEvent(Log[LoggedEventCount]));
	}
}

FString DescribeBattleEvent(const MatchRPG::FBattleEvent& Event)
{
	using EKind = MatchRPG::FBattleEvent::EKind;

	// Một dòng cho mỗi sự kiện. Số trong ngoặc vuông là lượt, để bạn lọc log theo lượt.
	const FString Prefix = FString::Printf(TEXT("[turn %2d] "), Event.Turn);

	switch (Event.Kind)
	{
	case EKind::BattleStart:   return Prefix + TEXT("tran dau bat dau");
	case EKind::TurnStart:     return Prefix + TEXT("--- bat dau luot ---");
	case EKind::TurnEnd:       return Prefix + TEXT("--- ket thuc luot, boss hanh dong ---");
	case EKind::MatchResolved: return Prefix + FString::Printf(TEXT("no %d o"), Event.Amount);
	case EKind::Cascade:       return Prefix + FString::Printf(TEXT("cascade tang %d, no them %d o"), Event.CascadeLevel + 1, Event.Amount);
	case EKind::Damage:
		return Event.bBoss
			? Prefix + FString::Printf(TEXT("doi danh boss %d sat thuong%s"), Event.Amount, Event.bCrit ? TEXT(" (dang vo stagger)") : TEXT(""))
			: Prefix + FString::Printf(TEXT("boss danh o doi %d mat %d mau"), Event.SlotIndex, Event.Amount);
	case EKind::Heal:          return Prefix + FString::Printf(TEXT("hoi %d mau cho o doi %d"), Event.Amount, Event.SlotIndex);
	case EKind::Buff:          return Prefix + FString::Printf(TEXT("buff %s x%d"), MatchRPG::ToText(Event.Status), Event.Amount);
	case EKind::Debuff:        return Prefix + FString::Printf(TEXT("debuff %s x%d"), MatchRPG::ToText(Event.Status), Event.Amount);
	case EKind::Guard:         return Prefix + TEXT("defender giam sat thuong cho ca doi");
	case EKind::Ultimate:      return Prefix + FString::Printf(TEXT("ban ultimate tu o doi %d"), Event.SlotIndex);
	case EKind::ManualSkill:   return Prefix + FString::Printf(TEXT("dung ky nang o doi %d"), Event.SlotIndex);
	case EKind::ChainBurst:    return Prefix + TEXT("chain burst");
	case EKind::FullBurst:     return Prefix + TEXT(">>> FULL BURST <<<");
	case EKind::StaggerDrain:  return Prefix + TEXT("thanh stagger tut");
	case EKind::Break:         return Prefix + TEXT(">>> BOSS VO STAGGER <<<");
	case EKind::Retaliate:     return Prefix + FString::Printf(TEXT("%s kich hoat"), MatchRPG::ToText(Event.Role));
	case EKind::ObstacleSpawned: return Prefix + FString::Printf(TEXT("boss tha %s xuong ban"), MatchRPG::ToText(Event.Obstacle));
	case EKind::ObstacleCleared: return Prefix + FString::Printf(TEXT("pha duoc %s"), MatchRPG::ToText(Event.Obstacle));
	case EKind::BoardDebuff:   return Prefix + FString::Printf(TEXT("boss khoa mau %s"), MatchRPG::ToText(Event.Color));
	case EKind::BossAction:    return Prefix + FString::Printf(TEXT("boss hanh dong (%s)"), MatchRPG::ToText(Event.Status));
	case EKind::Victory:       return Prefix + TEXT("*** THANG ***");
	case EKind::Defeat:        return Prefix + TEXT("*** THUA ***");
	case EKind::Shuffle:       return Prefix + TEXT("xao lai ban vi het nuoc di");
	case EKind::Idle:          return Prefix + TEXT("khong lam gi");
	default:                   return Prefix + TEXT("(su kien khac)");
	}
}
