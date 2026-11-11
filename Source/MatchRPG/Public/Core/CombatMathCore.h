// Copyright MatchRPG. All damage / heal / stagger formulas in one place.
#pragma once

#include "Core/MatchCoreCompat.h"
#include "Core/MatchTypes.h"

namespace MatchRPG
{
/**
 * Pure math. No state, no engine types. Every number a designer may want to
 * rebalance is taken from FEffectScaleRules so tuning never means editing code
 * spread over several files.
 *
 * The design contract these formulas implement:
 *   - Attacker: damage grows with the number of triggered blocks (combo).
 *   - Healer:   healing grows exponentially with the number of triggered blocks.
 *   - Supporter: both the stack count and the duration grow with the trigger count.
 *   - Everything is further multiplied by the cascade depth reached by the move.
 */
namespace CombatMath
{
	/** ~1.0 at a plain 3-match; grows with extra blocks and cascade depth. */
	float ComputeDamageMultiplier(const FEffectScaleRules& Scales, int32 TriggerCount, int32 SpecialCount, float CascadeMultiplier);

	/** Exponential in the number of extra blocks. */
	float ComputeHealMultiplier(const FEffectScaleRules& Scales, int32 TriggerCount);

	int32 ComputeSupportStacks(const FEffectScaleRules& Scales, int32 TriggerCount);
	int32 ComputeSupportDuration(const FEffectScaleRules& Scales, int32 TriggerCount);
	float ComputeSupportPotency(const FEffectScaleRules& Scales, int32 TriggerCount);

	/** Gauge gained from a match, or from the end-of-turn tick. */
	float ComputeUltimateGauge(const FEffectScaleRules& Scales, int32 TriggerCount, int32 SpecialCount, bool bEndOfTurnTick, float ChargeMultiplier);

	/** Cascade bonus for a given depth (level 0 == the player's own match). */
	float ComputeCascadeMultiplier(const FEffectScaleRules& Scales, int32 CascadeLevel);

	/** How much of the stagger gauge a hit removes. Debuffs raise StaggerRateBonus. */
	float ComputeStaggerDrain(float Damage, float StaggerPerDamage, float StaggerRateBonus);

	/** Mitigation applied on top of defence, clamped to [0, 0.9]. */
	float ComputeIncomingDamage(float RawDamage, float Defence, float MitigationPercent);

	/** Deflector charge earned by finishing a match of this shape.
	 *  Line3 gives nothing: the deflector lives off 4-matches and 5-matches. */
	int32 ComputeDeflectorCharge(const FEffectScaleRules& Scales, EMatchShape Shape);

	float ClampMultiplier(float Value, float MaxValue);

	/** Deterministic per-hit variance so big numbers do not look flat. */
	float ApplyVariance(float Value, float Spread, float Roll01);
}
} // namespace MatchRPG
