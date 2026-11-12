// Copyright MatchRPG. Skill / ultimate definitions (data-driven, no engine types).
#pragma once

#include "Core/MatchCoreCompat.h"
#include "Core/MatchTypes.h"

namespace MatchRPG
{

enum class ESkillSlotKind : uint8
{
	Manual = 0,   // the one hand-activated basic skill each hero owns
	Ultimate      // the chainable charge-bar attack
};

/** Everything a skill is allowed to do. New behaviour == new enum value,
 *  which keeps "skills stay varied but never break the game" reviewable in
 *  one table instead of scattered special cases. */
enum class ESkillEffectKind : uint8
{
	Damage = 0,
	Heal,
	ApplyStatusTeam,
	ApplyStatusBoss,
	ClearObstacles,
	ClearBoardDebuffs,   // un-jam / unlock cells
	ChargeUltimate,
	AddMoves,
	AddDeflectorStacks,
	DirectStaggerDrain
};

/** How the effect magnitude reacts to the situation. */
enum class ESkillScaleMode : uint8
{
	Fixed = 0,
	TriggerCount,    // scales with how many blocks the current match triggered
	BurstChain       // scales with how deep the ultimate chain got (GBF-style chain burst)
};

struct FSkillEffectRow
{
	ESkillEffectKind Kind = ESkillEffectKind::Damage;
	ESkillScaleMode Scale = ESkillScaleMode::Fixed;
	/** Damage/Heal: fraction of the owner's Atk / HealPower. Status: potency per stack. */
	float BaseValue = 1.0f;
	int32 BaseStacks = 1;
	int32 BaseDuration = 1;
	int32 TargetCount = 1;
	EStatusType Status = EStatusType::None;
	EObstacleType Obstacle = EObstacleType::None;
	ETargetMode Target = ETargetMode::Self;
	/** Debuffs land on the boss and also chip the stagger gauge. */
	bool bCountsAsBossDebuff = false;
};

struct FSkillDefinitionRow
{
	int32 Id = INDEX_NONE;
	ESkillSlotKind Kind = ESkillSlotKind::Manual;
	ERoleType OwnerRole = ERoleType::Attacker;
	/** e.g. a Counter's skill may only fire while the stagger gauge is broken. */
	bool bRequiresBossBroken = false;
	int32 CooldownTurns = 0;
	/** Multiplies the chain-burst bonus this skill contributes. */
	float ChainWeight = 1.0f;
	TArray<FSkillEffectRow> Effects;
};

/** Immutable library of skills, built once by ContentCore. */
class FSkillLibrary
{
public:
	void Reset() { Definitions.Reset(); }
	void Add(const FSkillDefinitionRow& Definition) { Definitions.Add(Definition); }
	int32 Num() const { return Definitions.Num(); }
	const FSkillDefinitionRow* Find(int32 SkillId) const
	{
		for (int32 i = 0; i < Definitions.Num(); ++i)
		{
			if (Definitions[i].Id == SkillId) { return &Definitions[i]; }
		}
		return nullptr;
	}
	const TArray<FSkillDefinitionRow>& GetAll() const { return Definitions; }

private:
	TArray<FSkillDefinitionRow> Definitions;
};

} // namespace MatchRPG
