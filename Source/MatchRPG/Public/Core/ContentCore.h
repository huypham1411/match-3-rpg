// Copyright MatchRPG. Built-in content: default roster, skills, gacha pool, demo stage.
#pragma once

#include "Core/MatchCoreCompat.h"
#include "Core/MatchRng.h"
#include "Core/MatchTypes.h"
#include "Core/SkillCore.h"

namespace MatchRPG
{

/** A gacha pool entry. */
struct FGachaEntryRow
{
	int32 CharacterId = INDEX_NONE;
	int32 Rarity = 3;
	float Weight = 1.0f;
};

struct FGachaPoolRow
{
	TArray<FGachaEntryRow> Entries;
	/** Hard pity: a 5-star is guaranteed at this pull index. */
	int32 PityThreshold = 90;
	int32 PityCounterStart = 0;
	/** Soft pity ramps the 5-star rate up over the last N pulls before hard pity. */
	int32 SoftPityWindow = 15;
	float SoftPityStepBonus = 0.06f;
	float BaseFiveStarRate = 0.006f;
	float BaseFourStarRate = 0.051f;
};

/**
 * All content factories.
 *
 * These are plain C++ so the project plays out of the box with ZERO .uasset
 * files. DataAssets in the editor layer only *override* these rows; nothing is
 * required to boot, and the 3D model references stay swappable per row.
 */
namespace ContentCore
{
	/** The 4 starter heroes the player owns from the beginning:
	 *  attacker / supporter / healer / defender. The defender is not bound to a
	 *  block colour - its payoff is the "ended the turn without acting" passive
	 *  plus Guard stacks. */
	void BuildStarterRoster(TArray<FCharacterDefinitionRow>& OutRoster);

	/** Extra gacha-only heroes, including the special Counter and Deflector roles. */
	void BuildGachaRoster(TArray<FCharacterDefinitionRow>& OutRoster);

	/** Full roster: starters then gacha-only. */
	void BuildFullRoster(TArray<FCharacterDefinitionRow>& OutRoster);

	bool FindCharacter(const TArray<FCharacterDefinitionRow>& Roster, int32 CharacterId, FCharacterDefinitionRow& OutRow);

	/** One manual skill and one ultimate per role, plus a few hero-exclusive ones. */
	void BuildSkillLibrary(FSkillLibrary& OutLibrary);

	void BuildGachaPool(const TArray<FCharacterDefinitionRow>& Roster, FGachaPoolRow& OutPool);

	/** A playable demo stage: 4 swaps per turn, ice blocks to clear, boss with AoE. */
	void BuildDemoStage(FStageDefinitionRow& OutStage);

	/** Default gear the player starts with, so the 3 equipment slots are meaningful
	 *  from the first battle. */
	void BuildStarterEquipment(TArray<FEquipmentSlot>& OutItems);

	/** Default formation: the four starters, in slot order, wearing starter gear. */
	void BuildStarterFormation(const TArray<FCharacterDefinitionRow>& Roster, FTeamFormation& OutFormation);

	/** Shared board rules used by every stage unless it overrides them. */
	FBoardRules BuildDefaultBoardRules();

	/** Shared tuning curve used by every stage unless it overrides them. */
	FEffectScaleRules BuildDefaultScales();
}

/** Gacha pull results. */
struct FGachaPullResult
{
	int32 CharacterId = INDEX_NONE;
	int32 Rarity = 3;
	bool bWasPity = false;
};

/** Deterministic gacha. Pity counters live in the instance. */
class FGachaCore
{
public:
	void Initialize(const FGachaPoolRow& InPool, FMatchRng* InRng);
	void Reset();

	/** Single pull. Advances pity, picks a rarity, then a hero of that rarity. */
	FGachaPullResult PullOnce();
	void PullTen(TArray<FGachaPullResult>& OutResults);

	int32 GetPityCounter() const { return PityCounter; }
	int32 GetPullsSinceLastFiveStar() const { return PullsSinceFiveStar; }
	int32 GetTotalPulls() const { return TotalPulls; }

private:
	int32 PickRarity(bool& bOutWasPity);
	int32 PickCharacterOfRarity(int32 Rarity);

	FGachaPoolRow Pool;
	FMatchRng* Rng = nullptr;
	FMatchRng FallbackRng;
	int32 PityCounter = 0;
	int32 PullsSinceFiveStar = 0;
	int32 TotalPulls = 0;
};

} // namespace MatchRPG
