// Copyright MatchRPG. Lookup tables shared by the core, the HUD and the tests.
#include "Core/MatchTypes.h"

namespace MatchRPG
{

const MRPGChar* ToText(ERoleType Role)
{
	switch (Role)
	{
	case ERoleType::Attacker:  return MRPG_TEXT("Attacker");
	case ERoleType::Supporter: return MRPG_TEXT("Supporter");
	case ERoleType::Healer:    return MRPG_TEXT("Healer");
	case ERoleType::Defender:  return MRPG_TEXT("Defender");
	case ERoleType::Counter:   return MRPG_TEXT("Counter");
	case ERoleType::Deflector: return MRPG_TEXT("Deflector");
	default:                   return MRPG_TEXT("None");
	}
}

const MRPGChar* ToText(EBlockColor Color)
{
	switch (Color)
	{
	case EBlockColor::Red:    return MRPG_TEXT("Red");
	case EBlockColor::Blue:   return MRPG_TEXT("Blue");
	case EBlockColor::Green:  return MRPG_TEXT("Green");
	case EBlockColor::Yellow: return MRPG_TEXT("Yellow");
	case EBlockColor::Purple: return MRPG_TEXT("Purple");
	default:                  return MRPG_TEXT("None");
	}
}

const MRPGChar* ToText(ESpecialType Special)
{
	switch (Special)
	{
	case ESpecialType::LineRow:       return MRPG_TEXT("RowClear");
	case ESpecialType::LineCol:       return MRPG_TEXT("ColClear");
	case ESpecialType::AreaBomb:      return MRPG_TEXT("AreaBomb");
	case ESpecialType::SquareBreaker: return MRPG_TEXT("SquareBreaker");
	case ESpecialType::SwapAll:       return MRPG_TEXT("SwapAll");
	default:                          return MRPG_TEXT("None");
	}
}

const MRPGChar* ToText(EObstacleType Obstacle)
{
	switch (Obstacle)
	{
	case EObstacleType::Ice:   return MRPG_TEXT("Ice");
	case EObstacleType::Rock:  return MRPG_TEXT("Rock");
	case EObstacleType::Crate: return MRPG_TEXT("Crate");
	case EObstacleType::Chain: return MRPG_TEXT("Chain");
	default:                   return MRPG_TEXT("None");
	}
}

const MRPGChar* ToText(EMatchShape Shape)
{
	switch (Shape)
	{
	case EMatchShape::Line3:   return MRPG_TEXT("Line3");
	case EMatchShape::Line4:   return MRPG_TEXT("Line4");
	case EMatchShape::Line5:   return MRPG_TEXT("Line5");
	case EMatchShape::Square4: return MRPG_TEXT("Square4");
	case EMatchShape::LTShape: return MRPG_TEXT("LTShape");
	default:                   return MRPG_TEXT("None");
	}
}

const MRPGChar* ToText(EStatusType Status)
{
	switch (Status)
	{
	case EStatusType::AtkUp:      return MRPG_TEXT("AtkUp");
	case EStatusType::AtkDown:    return MRPG_TEXT("AtkDown");
	case EStatusType::DefUp:      return MRPG_TEXT("DefUp");
	case EStatusType::DefDown:    return MRPG_TEXT("DefDown");
	case EStatusType::DamageCut:  return MRPG_TEXT("DamageCut");
	case EStatusType::Regen:      return MRPG_TEXT("Regen");
	case EStatusType::Poison:     return MRPG_TEXT("Poison");
	case EStatusType::StaggerUp:  return MRPG_TEXT("StaggerUp");
	case EStatusType::Stun:       return MRPG_TEXT("Stun");
	case EStatusType::ElementAmp: return MRPG_TEXT("ElementAmp");
	case EStatusType::Guard:      return MRPG_TEXT("Guard");
	default:                      return MRPG_TEXT("None");
	}
}

const MRPGChar* ToText(EBossActionType Action)
{
	switch (Action)
	{
	case EBossActionType::SpawnObstacle: return MRPG_TEXT("SpawnObstacle");
	case EBossActionType::ApplyStatus:   return MRPG_TEXT("ApplyStatus");
	case EBossActionType::DamageAll:     return MRPG_TEXT("DamageAll");
	case EBossActionType::DamageOne:     return MRPG_TEXT("DamageOne");
	case EBossActionType::JamColor:      return MRPG_TEXT("JamColor");
	case EBossActionType::LockCells:     return MRPG_TEXT("LockCells");
	case EBossActionType::DrainUltimate: return MRPG_TEXT("DrainUltimate");
	case EBossActionType::CleanseSelf:   return MRPG_TEXT("CleanseSelf");
	default:                             return MRPG_TEXT("None");
	}
}

EBlockColor ColorFromIndex(int32 Index)
{
	if (Index < 0 || Index >= MaxBlockColors) { return EBlockColor::None; }
	return static_cast<EBlockColor>(static_cast<int32>(EBlockColor::Red) + Index);
}

int32 IndexFromColor(EBlockColor Color)
{
	const int32 Raw = static_cast<int32>(Color) - static_cast<int32>(EBlockColor::Red);
	return (Raw >= 0 && Raw < MaxBlockColors) ? Raw : INDEX_NONE;
}

FObstacleProfile GetObstacleProfile(EObstacleType Type)
{
	FObstacleProfile Profile;
	switch (Type)
	{
	case EObstacleType::Ice:
		// The "challenge fodder": a normal adjacent match softens it.
		Profile.Hp = 2;
		Profile.bDamagedByBasicMatch = true;
		Profile.bDamagedBySpecial = true;
		break;
	case EObstacleType::Rock:
		// Tough: only specials and square matches crack it.
		Profile.Hp = 3;
		Profile.bDamagedByBasicMatch = false;
		Profile.bDamagedBySpecial = true;
		Profile.bBlocksFalling = true;
		break;
	case EObstacleType::Crate:
		// Furniture: neither matchable nor falling; specials only.
		Profile.Hp = 2;
		Profile.bDamagedByBasicMatch = false;
		Profile.bDamagedBySpecial = true;
		Profile.bBlocksFalling = true;
		break;
	case EObstacleType::Chain:
		// Locks its cell; any adjacent match snaps it.
		Profile.Hp = 1;
		Profile.bDamagedByBasicMatch = true;
		Profile.bDamagedBySpecial = true;
		Profile.bLocksCell = true;
		break;
	default:
		Profile.Hp = 0;
		Profile.bDamagedByBasicMatch = false;
		Profile.bDamagedBySpecial = false;
		Profile.bBlocksMatching = false;
		break;
	}
	return Profile;
}

FStatusDefinition GetStatusDefinition(EStatusType Type)
{
	FStatusDefinition Def;
	Def.Type = Type;
	switch (Type)
	{
	case EStatusType::AtkDown:
		Def.Polarity = EStatusPolarity::Debuff;
		Def.bTargetsBoss = true;
		break;
	case EStatusType::DefDown:
		Def.Polarity = EStatusPolarity::Debuff;
		Def.bTargetsBoss = true;
		break;
	case EStatusType::Poison:
		Def.Polarity = EStatusPolarity::Debuff;
		Def.bTargetsBoss = true;
		break;
	case EStatusType::StaggerUp:
		// "debuff tăng stagger": a debuff on the boss that accelerates the drain.
		Def.Polarity = EStatusPolarity::Debuff;
		Def.bTargetsBoss = true;
		break;
	case EStatusType::AtkUp:
	case EStatusType::DefUp:
	case EStatusType::DamageCut:
	case EStatusType::Regen:
	case EStatusType::ElementAmp:
	case EStatusType::Guard:
		Def.Polarity = EStatusPolarity::Buff;
		Def.bTargetsBoss = false;
		break;
	case EStatusType::Stun:
		Def.Polarity = EStatusPolarity::Debuff;
		Def.bTargetsBoss = true;
		break;
	default:
		break;
	}
	return Def;
}

bool IsBossStatus(EStatusType Type) { return GetStatusDefinition(Type).bTargetsBoss; }

} // namespace MatchRPG
