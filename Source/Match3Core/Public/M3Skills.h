// =============================================================================
//  M3Skills.h  -  Danh mục kỹ năng (dữ liệu mô tả, engine-agnostic)
//  ---------------------------------------------------------------------------
//  Mỗi role có 1 kỹ năng chủ động (bấm tay, có hồi chiêu) + 1 ultimate (nạp
//  theo turn và theo số block đúng màu của nhân vật).
//  Hành vi cụ thể nằm trong M3Battle.cpp (hàm UseBasicSkill/UseUltimate) để dễ
//  đọc và dễ chỉnh; ở đây chỉ là bảng dữ liệu cho UI hiển thị.
// =============================================================================
#pragma once

#include "M3Balance.h"
#include "M3Types.h"

namespace M3
{

enum class ESkillKind : std::uint8_t
{
	BuffDamage = 0,     // Attacker: tăng sát thương match trong turn
	PurgeObstacle,      // Supporter: gỡ 1 vật cản trên bàn
	Aegis,              // Healer: hồi máu + chặn boss gây bất lợi lên bàn
	Bulwark,            // Defender: khiên giảm sát thương AoE
	CounterStrike,      // Counter: chỉ dùng được khi boss BREAK
	DeflectSurge,       // Deflecter: tăng tốc tích stack / hạ stagger
	MageBlast,          // Mage: sát thương Ma Pháp + gây Suy Yếu Ma Pháp lên boss
	UltimateDamage,     // ultimate attacker
	UltimateSupport,    // ultimate supporter
	UltimateHeal,       // ultimate healer
	UltimateGuard,      // ultimate defender
	UltimateMage        // ultimate mage: bão thiên thạch ma pháp
};


struct FSkillDefinition
{
	ESkillKind  Kind = ESkillKind::BuffDamage;
	std::string Id   = "skill.none";
	std::string Name = "Kỹ năng";
	std::string Desc = "";
	int32       Cooldown = 3;    // số turn hồi chiêu (ultimate bỏ qua, dùng charge)
	bool        bUltimate = false;
	// Điều kiện kích hoạt đặc biệt (Counter cần boss đang BREAK, v.v.)
	bool bRequiresBossBreak = false;
};

// Bảng kỹ năng theo role. Trả về bản ghi mô tả để UI + gameplay dùng chung.
struct MATCH3CORE_API FSkillCatalog
{
	static FSkillDefinition BasicForRole(ERole Role);
	static FSkillDefinition UltimateForRole(ERole Role);
	static std::vector<FSkillDefinition> AllSkills();
};

} // namespace M3
