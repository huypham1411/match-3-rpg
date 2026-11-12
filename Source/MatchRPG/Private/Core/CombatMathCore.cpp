// Copyright MatchRPG. Damage / heal / stagger formulas.
#include "Core/CombatMathCore.h"

namespace MatchRPG
{
namespace CombatMath
{

float ClampMultiplier(float Value, float MaxValue)
{
	if (MaxValue <= 0.0f) { return Value; }
	return FMath::Min(Value, MaxValue);
}

float ComputeCascadeMultiplier(const FEffectScaleRules& Scales, int32 CascadeLevel)
{
	return 1.0f + static_cast<float>(FMath::Max(0, CascadeLevel)) * Scales.CascadeMultiplierPerLevel;
}

float ComputeDamageMultiplier(const FEffectScaleRules& Scales, int32 TriggerCount, int32 SpecialCount, float CascadeMultiplier)
{
	const int32 Extra = FMath::Max(0, TriggerCount - 3);
	const float Linear = static_cast<float>(Extra) * Scales.DamagePerBlock;
	const float Quadratic = static_cast<float>(Extra * Extra) * Scales.DamageQuadratic;
	// Every special block caught in the blast is worth roughly two extra blocks.
	const float SpecialBonus = static_cast<float>(FMath::Max(0, SpecialCount)) * Scales.DamagePerBlock * 2.0f;

	const float Raw = 1.0f + Linear + Quadratic + SpecialBonus;
	return ClampMultiplier(Raw * FMath::Max(0.01f, CascadeMultiplier), Scales.DamageMaxMultiplier);
}

float ComputeHealMultiplier(const FEffectScaleRules& Scales, int32 TriggerCount)
{
	const int32 Extra = FMath::Max(0, TriggerCount - 3);
	const float Growth = FMath::Max(1.0f, Scales.HealGrowthPerBlock);
	float Result = 1.0f;
	for (int32 i = 0; i < Extra; ++i) { Result *= Growth; }
	return ClampMultiplier(Result, Scales.HealMaxMultiplier);
}

int32 ComputeSupportStacks(const FEffectScaleRules& Scales, int32 TriggerCount)
{
	const int32 Extra = FMath::Max(0, TriggerCount - 3);
	const int32 Stacks = Scales.BuffStacksAtBase + Extra * Scales.BuffStacksPerExtraBlock;
	return FMath::Clamp(Stacks, 1, FMath::Max(1, Scales.BuffMaxStacks));
}

int32 ComputeSupportDuration(const FEffectScaleRules& Scales, int32 TriggerCount)
{
	const int32 Extra = FMath::Max(0, TriggerCount - 3);
	return FMath::Max(1, Scales.BuffDurationAtBase + Extra * Scales.BuffDurationPerExtraBlock);
}

float ComputeSupportPotency(const FEffectScaleRules& Scales, int32 TriggerCount)
{
	return static_cast<float>(ComputeSupportStacks(Scales, TriggerCount)) * Scales.SupportPotencyPerStack;
}

float ComputeUltimateGauge(const FEffectScaleRules& Scales, int32 TriggerCount, int32 SpecialCount, bool bEndOfTurnTick, float ChargeMultiplier)
{
	float Gauge = 0.0f;
	if (bEndOfTurnTick)
	{
		Gauge += Scales.UltGaugePerTurn;
	}
	else
	{
		Gauge += static_cast<float>(FMath::Max(0, TriggerCount)) * Scales.UltGaugePerTriggeredBlock;
		Gauge += static_cast<float>(FMath::Max(0, SpecialCount)) * Scales.UltGaugePerSpecial;
	}
	return Gauge * FMath::Max(0.0f, ChargeMultiplier);
}

float ComputeStaggerDrain(float Damage, float StaggerPerDamage, float StaggerRateBonus)
{
	if (Damage <= 0.0f) { return 0.0f; }
	return Damage * StaggerPerDamage * (1.0f + FMath::Max(0.0f, StaggerRateBonus));
}

float ComputeIncomingDamage(float RawDamage, float Defence, float MitigationPercent)
{
	const float AfterDefence = RawDamage - FMath::Max(0.0f, Defence);
	const float Clamped = FMath::Max(0.0f, AfterDefence);
	const float Mitigation = FMath::Clamp(MitigationPercent, 0.0f, 0.9f);
	return FMath::Max(0.0f, Clamped * (1.0f - Mitigation));
}

float ApplyVariance(float Value, float Spread, float Roll01)
{
	if (Spread <= 0.0f) { return Value; }
	const float Offset = (FMath::Clamp(Roll01, 0.0f, 1.0f) * 2.0f - 1.0f) * Spread;
	return Value * (1.0f + Offset);
}

int32 ComputeDeflectorCharge(const FEffectScaleRules& Scales, EMatchShape Shape)
{
	switch (Shape)
	{
	case EMatchShape::Line4:   return FMath::Max(0, Scales.DeflectorChargePerLine4);
	case EMatchShape::Square4: return FMath::Max(0, Scales.DeflectorChargePerSquare);
	case EMatchShape::Line5:   return FMath::Max(0, Scales.DeflectorChargePerLine5);
	default:                   return 0;
	}
}

} // namespace CombatMath
} // namespace MatchRPG
