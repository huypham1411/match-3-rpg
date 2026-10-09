// =============================================================================
//  M3Skills.cpp  -  Bảng mô tả kỹ năng theo role
// =============================================================================
#include "M3Skills.h"

namespace M3
{

FSkillDefinition FSkillCatalog::BasicForRole(ERole Role)
{
	FSkillDefinition S;
	S.bUltimate = false;
	S.Cooldown  = 3;

	switch (Role)
	{
	case ERole::Attacker:
		S.Kind = ESkillKind::BuffDamage;
		S.Id = "skill.attacker.focus";
		S.Name = "Tập trung công kích";
		S.Desc = "Tăng 40% sát thương của mọi đường nối trong turn này.";
		break;

	case ERole::Supporter:
		S.Kind = ESkillKind::PurgeObstacle;
		S.Id = "skill.supporter.purge";
		S.Name = "Gỡ chướng ngại";
		S.Desc = "Gỡ 1 vật cản (hoặc giảm 1 lớp của vật cản nhiều lớp) trên bàn.";
		break;

	case ERole::Healer:
		S.Kind = ESkillKind::Aegis;
		S.Id = "skill.healer.aegis";
		S.Name = "Hộ thuẫn";
		S.Desc = "Hồi máu toàn đội 12% và chặn boss đặt vật cản trong turn này.";
		break;

	case ERole::Defender:
		S.Kind = ESkillKind::Bulwark;
		S.Id = "skill.defender.bulwark";
		S.Name = "Thành lũy";
		S.Desc = "Giảm 40% sát thương AoE của boss trong lần hành động kế tiếp của boss.";
		S.Cooldown = 2;
		break;

	case ERole::Counter:
		S.Kind = ESkillKind::CounterStrike;
		S.Id = "skill.counter.strike";
		S.Name = "Phản kích";
		S.Desc = "CHỈ dùng được khi thanh stagger của boss đã vỡ: đánh thêm 1 đòn nặng.";
		S.Cooldown = 2;
		S.bRequiresBossBreak = true;
		break;

	case ERole::Deflecter:
		S.Kind = ESkillKind::DeflectSurge;
		S.Id = "skill.deflecter.surge";
		S.Name = "Dẫn truyền";
		S.Desc = "Nạp ngay 1 stack match-4 (tối đa bằng ngưỡng của Deflecter).";
		S.Cooldown = 3;
		break;

	default: break;
	}
	return S;
}

FSkillDefinition FSkillCatalog::UltimateForRole(ERole Role)
{
	FSkillDefinition S;
	S.bUltimate = true;
	S.Cooldown  = 0;

	switch (Role)
	{
	case ERole::Attacker:
		S.Kind = ESkillKind::UltimateDamage;
		S.Id = "ult.attacker";
		S.Name = "Bộc phá - Chém quyết định";
		S.Desc = "Sát thương cực lớn lên boss theo số block đã trigger. Chain được với ultimate khác.";
		break;

	case ERole::Supporter:
		S.Kind = ESkillKind::UltimateSupport;
		S.Id = "ult.supporter";
		S.Name = "Bộc phá - Phá giải";
		S.Desc = "Gỡ nhiều vật cản, đặt debuff tăng mạnh lượng stagger boss nhận vào.";
		break;

	case ERole::Healer:
		S.Kind = ESkillKind::UltimateHeal;
		S.Id = "ult.healer";
		S.Name = "Bộc phá - Hồi sinh chi quang";
		S.Desc = "Hồi 55% máu tối đa cho cả đội và miễn nhiễm sát thương trong 1 turn.";
		break;

	case ERole::Defender:
		S.Kind = ESkillKind::UltimateGuard;
		S.Id = "ult.defender";
		S.Name = "Bộc phá - Bất diệt thành";
		S.Desc = "Giảm mạnh sát thương nhận vào cho cả đội trong 2 turn, hồi máu nhẹ.";
		break;

	case ERole::Counter:
		S.Kind = ESkillKind::UltimateDamage;
		S.Id = "ult.counter";
		S.Name = "Bộc phá - Nghịch chuyển";
		S.Desc = "Sát thương lớn; nếu boss đang BREAK thì sát thương nhân thêm.";
		break;

	case ERole::Deflecter:
		S.Kind = ESkillKind::UltimateSupport;
		S.Id = "ult.deflecter";
		S.Name = "Bộc phá - Vỡ thiên địa";
		S.Desc = "Phá ngay một phần lớn thanh stagger của boss (mở cửa sổ BREAK).";
		break;

	default: break;
	}
	return S;
}

std::vector<FSkillDefinition> FSkillCatalog::AllSkills()
{
	std::vector<FSkillDefinition> Out;
	for (int32 i = 0; i < static_cast<int32>(ERole::Count); ++i)
	{
		const ERole R = static_cast<ERole>(i);
		Out.push_back(BasicForRole(R));
		Out.push_back(UltimateForRole(R));
	}
	return Out;
}

} // namespace M3
