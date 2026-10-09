// =============================================================================
//  M3UETypes.cpp  -  Cài đặt chuyển đổi giữa lõi game và UE
// =============================================================================
#include "M3UETypes.h"

namespace M3Conv
{

M3::EColor ToCore(EM3Color Value)
{
	switch (Value)
	{
	case EM3Color::Red:    return M3::EColor::Red;
	case EM3Color::Blue:   return M3::EColor::Blue;
	case EM3Color::Green:  return M3::EColor::Green;
	case EM3Color::Yellow: return M3::EColor::Yellow;
	case EM3Color::Purple: return M3::EColor::Purple;
	case EM3Color::Cyan:   return M3::EColor::Cyan;
	default:               return M3::EColor::None;
	}
}

EM3Color FromCore(M3::EColor Value)
{
	switch (Value)
	{
	case M3::EColor::Red:    return EM3Color::Red;
	case M3::EColor::Blue:   return EM3Color::Blue;
	case M3::EColor::Green:  return EM3Color::Green;
	case M3::EColor::Yellow: return EM3Color::Yellow;
	case M3::EColor::Purple: return EM3Color::Purple;
	case M3::EColor::Cyan:   return EM3Color::Cyan;
	default:                 return EM3Color::None;
	}
}

M3::ERole ToCore(EM3Role Value)
{
	switch (Value)
	{
	case EM3Role::Supporter: return M3::ERole::Supporter;
	case EM3Role::Healer:    return M3::ERole::Healer;
	case EM3Role::Defender:  return M3::ERole::Defender;
	case EM3Role::Counter:   return M3::ERole::Counter;
	case EM3Role::Deflecter: return M3::ERole::Deflecter;
	default:                 return M3::ERole::Attacker;
	}
}

EM3Role FromCore(M3::ERole Value)
{
	switch (Value)
	{
	case M3::ERole::Supporter: return EM3Role::Supporter;
	case M3::ERole::Healer:    return EM3Role::Healer;
	case M3::ERole::Defender:  return EM3Role::Defender;
	case M3::ERole::Counter:   return EM3Role::Counter;
	case M3::ERole::Deflecter: return EM3Role::Deflecter;
	default:                   return EM3Role::Attacker;
	}
}

M3::EBlockKind ToCore(EM3BlockKind Value)
{
	switch (Value)
	{
	case EM3BlockKind::Obstacle:   return M3::EBlockKind::Obstacle;
	case EM3BlockKind::LineClear:  return M3::EBlockKind::LineClear;
	case EM3BlockKind::SquareBomb: return M3::EBlockKind::SquareBomb;
	case EM3BlockKind::ColorBomb:  return M3::EBlockKind::ColorBomb;
	default:                       return M3::EBlockKind::Normal;
	}
}

EM3BlockKind FromCore(M3::EBlockKind Value)
{
	switch (Value)
	{
	case M3::EBlockKind::Obstacle:   return EM3BlockKind::Obstacle;
	case M3::EBlockKind::LineClear:  return EM3BlockKind::LineClear;
	case M3::EBlockKind::SquareBomb: return EM3BlockKind::SquareBomb;
	case M3::EBlockKind::ColorBomb:  return EM3BlockKind::ColorBomb;
	default:                         return EM3BlockKind::Normal;
	}
}

FString Utf8(const std::string& In)
{
	return FString(UTF8_TO_TCHAR(In.c_str()));
}

FLinearColor ColorToLinear(M3::EColor Value)
{
	// Bảng màu đơn giản nhưng phân biệt rõ ràng cho 6 kênh nối.
	switch (Value)
	{
	case M3::EColor::Red:    return FLinearColor(0.92f, 0.20f, 0.22f);
	case M3::EColor::Blue:   return FLinearColor(0.16f, 0.42f, 0.95f);
	case M3::EColor::Green:  return FLinearColor(0.20f, 0.76f, 0.36f);
	case M3::EColor::Yellow: return FLinearColor(0.98f, 0.80f, 0.16f);
	case M3::EColor::Purple: return FLinearColor(0.62f, 0.30f, 0.90f);
	case M3::EColor::Cyan:   return FLinearColor(0.16f, 0.82f, 0.86f);
	default:                 return FLinearColor(0.45f, 0.45f, 0.48f);
	}
}

FLinearColor RoleToLinearEM3(EM3Role Role)
{
	switch (Role)
	{
	case EM3Role::Attacker:  return FLinearColor(0.95f, 0.35f, 0.30f);
	case EM3Role::Supporter: return FLinearColor(0.35f, 0.60f, 0.98f);
	case EM3Role::Healer:    return FLinearColor(0.35f, 0.90f, 0.55f);
	case EM3Role::Defender:  return FLinearColor(0.85f, 0.75f, 0.35f);
	case EM3Role::Counter:   return FLinearColor(0.75f, 0.35f, 0.95f);
	case EM3Role::Deflecter: return FLinearColor(0.35f, 0.90f, 0.95f);
	default:                 return FLinearColor::White;
	}
}

M3::FBlock ToCore(const FM3Cell& Cell)
{
	(void)Cell;
	return M3::FBlock();
}

} // namespace M3Conv

namespace M3UE
{
FString RoleDisplayName(M3::ERole Role)
{
	// Tên tiếng Việt cho UI; bảng kỹ năng lấy từ M3::FSkillCatalog.
	switch (Role)
	{
	case M3::ERole::Attacker:  return TEXT("Attacker (gây sát thương)");
	case M3::ERole::Supporter: return TEXT("Supporter (buff/debuff)");
	case M3::ERole::Healer:    return TEXT("Healer (hồi máu)");
	case M3::ERole::Defender:  return TEXT("Defender (giảm sát thương)");
	case M3::ERole::Counter:   return TEXT("Counter (khi boss BREAK)");
	case M3::ERole::Deflecter: return TEXT("Deflecter (4x match-4)");
	default:                   return TEXT("-");
	}
}
} // namespace M3UE
