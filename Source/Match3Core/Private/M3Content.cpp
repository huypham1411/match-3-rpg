// =============================================================================
//  M3Content.cpp  -  Nội dung mẫu (xem chú thích trong M3Content.h)
// =============================================================================
#include "M3Content.h"

namespace M3
{

std::vector<FCharacterDef> FContentLibrary::StarterCharacters()
{
	std::vector<FCharacterDef> Out;

	// Attacker - màu Đỏ - nối block Đỏ là gây sát thương lên boss.
	{
		FCharacterDef Def;
		Def.Id = "char.attacker.blade";
		Def.Name = "Lôi Kiếm Sĩ";
		Def.Role = ERole::Attacker;
		Def.MatchColor = EColor::Red;
		Def.Element = EElement::Thunder;
		Def.BaseAtk = 320.f;
		Def.BaseHp  = 2600.f;
		Def.BasicSkillName = "Tập trung công kích";
		Def.BasicSkillDesc = "+40% sát thương cho mọi đường nối trong turn.";
		Def.UltimateName   = "Chém quyết định";
		Def.UltimateDesc   = "Sát thương cực lớn, chain được với ultimate khác.";
		Out.push_back(Def);
	}

	// Supporter - màu Xanh dương - buff đội / debuff boss (tăng stagger nhận vào).
	{
		FCharacterDef Def;
		Def.Id = "char.supporter.oracle";
		Def.Name = "Tinh Linh Chú Thuật";
		Def.Role = ERole::Supporter;
		Def.MatchColor = EColor::Blue;
		Def.Element = EElement::Water;
		Def.BaseAtk = 220.f;
		Def.BaseHp  = 2800.f;
		Def.BasicSkillName = "Gỡ chướng ngại";
		Def.BasicSkillDesc = "Gỡ 1 vật cản trên bàn (hoặc 1 debuff của boss).";
		Def.UltimateName   = "Phá giải";
		Def.UltimateDesc   = "Gỡ nhiều vật cản + tăng mạnh lượng stagger boss nhận vào.";
		Out.push_back(Def);
	}

	// Healer - màu Xanh lá - hồi máu TĂNG THEO CẤP SỐ NHÂN theo số block.
	{
		FCharacterDef Def;
		Def.Id = "char.healer.priestess";
		Def.Name = "Thánh Nữ Ánh Sáng";
		Def.Role = ERole::Healer;
		Def.MatchColor = EColor::Green;
		Def.Element = EElement::Light;
		Def.BaseAtk = 180.f;
		Def.BaseHp  = 3000.f;
		Def.BasicSkillName = "Hộ thuẫn";
		Def.BasicSkillDesc = "Hồi 12% máu toàn đội, chặn boss đặt vật cản 1 turn.";
		Def.UltimateName   = "Hồi sinh chi quang";
		Def.UltimateDesc   = "Hồi 55% máu tối đa + miễn nhiễm sát thương 1 turn.";
		Out.push_back(Def);
	}

	// Defender - KHÔNG có block. Kích hoạt khi bạn kết thúc turn mà không làm gì.
	{
		FCharacterDef Def;
		Def.Id = "char.defender.bulwark";
		Def.Name = "Thiết Giáp Vệ Binh";
		Def.Role = ERole::Defender;
		Def.MatchColor = EColor::None;
		Def.Element = EElement::None;
		Def.BaseAtk = 150.f;
		Def.BaseHp  = 4200.f;
		Def.BasicSkillName = "Thành lũy";
		Def.BasicSkillDesc = "Giảm 40% sát thương AoE của boss.";
		Def.UltimateName   = "Bất diệt thành";
		Def.UltimateDesc   = "Giảm 65% sát thương nhận vào 2 turn + hồi máu nhẹ.";
		Out.push_back(Def);
	}

	return Out;
}

std::vector<FCharacterDef> FContentLibrary::ExtraCharacters()
{
	std::vector<FCharacterDef> Out;

	// Counter: chỉ ra tay khi thanh stagger của boss VỠ (BREAK).
	{
		FCharacterDef Def;
		Def.Id = "char.counter.avenger";
		Def.Name = "Bóng Tối Báo Thù";
		Def.Role = ERole::Counter;
		Def.MatchColor = EColor::None;
		Def.Element = EElement::Dark;
		Def.BaseAtk = 300.f;
		Def.BaseHp  = 2500.f;
		Def.BasicSkillName = "Phản kích";
		Def.BasicSkillDesc = "CHỈ dùng được khi boss BREAK.";
		Def.UltimateName   = "Nghịch chuyển";
		Def.UltimateDesc   = "Sát thương lớn, mạnh hơn khi boss đang BREAK.";
		Out.push_back(Def);
	}

	// Deflecter: tích 4 lần match-4 -> cuối turn tự phá stagger nhanh hơn.
	{
		FCharacterDef Def;
		Def.Id = "char.deflecter.dancer";
		Def.Name = "Vũ Nữ Phản Chấn";
		Def.Role = ERole::Deflecter;
		Def.MatchColor = EColor::None;
		Def.Element = EElement::Thunder;
		Def.BaseAtk = 240.f;
		Def.BaseHp  = 2700.f;
		Def.BasicSkillName = "Dẫn truyền";
		Def.BasicSkillDesc = "Nạp ngay 1 stack match-4.";
		Def.UltimateName   = "Vỡ thiên địa";
		Def.UltimateDesc   = "Phá ngay một phần lớn thanh stagger của boss.";
		Out.push_back(Def);
	}

	// Mage - màu Tím - nối block Tím gây sát thương Ma Pháp + debuff Suy Yếu Ma Pháp lên boss.
	{
		FCharacterDef Def;
		Def.Id = "char.mage.arcane";
		Def.Name = "Ma Pháp Sĩ Cổ Đại";
		Def.Role = ERole::Mage;
		Def.DamageType = EDamageType::Magic;
		Def.MatchColor = EColor::Purple;
		Def.Element = EElement::Dark;
		Def.BaseAtk = 330.f;
		Def.BaseHp  = 2400.f;
		Def.BasicSkillName = "Pháp thuật bùng nổ";
		Def.BasicSkillDesc = "Sát thương Ma Pháp + gây debuff Suy Yếu Ma Pháp (+25% sát thương phép nhận vào).";
		Def.UltimateName   = "Bão Thiên Thạch";
		Def.UltimateDesc   = "Gây sát thương Ma Pháp cực lớn, giảm 30% kháng phép của boss.";
		Out.push_back(Def);
	}

	// Mage 2 - màu Cyan - Ma Pháp Băng
	{
		FCharacterDef Def;
		Def.Id = "char.mage.frost";
		Def.Name = "Băng Chú Sĩ";
		Def.Role = ERole::Mage;
		Def.DamageType = EDamageType::Magic;
		Def.MatchColor = EColor::Cyan;
		Def.Element = EElement::Water;
		Def.BaseAtk = 300.f;
		Def.BaseHp  = 2500.f;
		Def.BasicSkillName = "Pháp thuật bùng nổ";
		Def.BasicSkillDesc = "Sát thương Ma Pháp + gây debuff Suy Yếu Ma Pháp.";
		Def.UltimateName   = "Bão Thiên Thạch";
		Def.UltimateDesc   = "Gây sát thương Ma Pháp cực lớn, giảm 30% kháng phép của boss.";
		Out.push_back(Def);
	}

	return Out;
}

std::vector<FCharacterDef> FContentLibrary::AllCharacters()
{
	std::vector<FCharacterDef> Out = StarterCharacters();
	const std::vector<FCharacterDef> Extra = ExtraCharacters();
	Out.insert(Out.end(), Extra.begin(), Extra.end());
	return Out;
}

std::vector<FEquipment> FContentLibrary::StarterEquipment()
{
	std::vector<FEquipment> Out;

	FEquipment Sword;
	Sword.Id = "equip.sword.thunder";
	Sword.Name = "Lôi Kiếm";
	Sword.Element = EElement::Thunder;
	Sword.AtkBonus = 60.f;
	Sword.ElementDamageBonus = 0.08f;
	Out.push_back(Sword);

	FEquipment Armor;
	Armor.Id = "equip.armor.guard";
	Armor.Name = "Giáp Hộ Vệ";
	Armor.Element = EElement::None;
	Armor.HpBonus = 500.f;
	Armor.StaggerBonus = 0.05f;
	Out.push_back(Armor);

	FEquipment Ring;
	Ring.Id = "equip.ring.storm";
	Ring.Name = "Nhẫn Bão Tố";
	Ring.Element = EElement::Water;
	Ring.AtkBonus = 35.f;
	Ring.ElementDamageBonus = 0.05f;
	Out.push_back(Ring);

	return Out;
}

std::vector<FChallenge> FContentLibrary::StarterChallenges()
{
	std::vector<FChallenge> Out;
	Out.push_back(FChallenge::Make(FChallenge::EKind::ClearAllObstacles, "challenge.obstacles",
		"Gỡ sạch vật cản trên bàn", 0));
	Out.push_back(FChallenge::Make(FChallenge::EKind::WinWithinTurns, "challenge.turns",
		"Thắng trong 12 turn", 12));
	Out.push_back(FChallenge::Make(FChallenge::EKind::NoMemberDowned, "challenge.nodeath",
		"Không thành viên nào gục", 0));
	return Out;
}

FBattleSetup FContentLibrary::DefaultBattleSetup(int32 TeamSize, uint32 Seed)
{
	FBattleSetup Setup = FBattleSetup::DefaultStarter();
	Setup.Seed = Seed;
	Setup.Balance = FBalance::Default();

	for (const FCharacterDef& Def : StarterCharacters())
	{
		if (static_cast<int32>(Setup.Roster.size()) >= TeamSize) { break; }
		Setup.Roster.push_back(Def);
	}
	for (const FCharacterDef& Def : ExtraCharacters())
	{
		if (static_cast<int32>(Setup.Roster.size()) >= TeamSize) { break; }
		Setup.Roster.push_back(Def);
	}

	Setup.StartingEquipment = StarterEquipment();
	Setup.Challenges = StarterChallenges();
	return Setup;
}

std::vector<FBattleSetup> FContentLibrary::CampaignStages(uint32 Seed)
{
	std::vector<FBattleSetup> Stages;

	// Map 1: làm quen - ít vật cản, boss yếu, nhiều lượt.
	{
		FBattleSetup S = DefaultBattleSetup(4, Seed);
		S.BossName = "Chimera Lửa";
		S.BossHp = 4500.f;
		S.BossAtk = 140.f;
		S.BossStagger = 900.f;
		S.StartObstacles = 2;
		S.Balance.MovesPerTurn = 4;
		Stages.push_back(S);
	}

	// Map 2: boss khoẻ hơn, xuất hiện nhiều vật cản hơn.
	{
		FBattleSetup S = DefaultBattleSetup(5, Seed + 1u);
		S.BossName = "Cự Thú Nham Thạch";
		S.BossHp = 8000.f;
		S.BossAtk = 200.f;
		S.BossStagger = 1400.f;
		S.StartObstacles = 4;
		S.Balance.MovesPerTurn = 4;
		S.Balance.BossObstaclesPerAction = 2;
		Stages.push_back(S);
	}

	// Map 3: đội 6 người, chỉ 3 lượt nối mỗi turn -> cần dùng kỹ năng + ultimate hợp lý.
	{
		FBattleSetup S = DefaultBattleSetup(6, Seed + 2u);
		S.BossName = "Tinh Linh Hư Không";
		S.BossHp = 12000.f;
		S.BossAtk = 260.f;
		S.BossStagger = 2000.f;
		S.StartObstacles = 5;
		S.Balance.MovesPerTurn = 3;
		S.Balance.BossObstaclesPerAction = 3;
		Stages.push_back(S);
	}

	// Map 4: Ma Vương Hư Không (Giảm 50% sát thương Vật Lý - cần Mage / sát thương Ma Pháp)
	{
		FBattleSetup S = DefaultBattleSetup(6, Seed + 3u);
		S.BossName = "Ma Vương Hư Không";
		S.BossHp = 16000.f;
		S.BossAtk = 300.f;
		S.BossStagger = 2500.f;
		S.StartObstacles = 4;
		S.Balance.MovesPerTurn = 4;
		S.Balance.BossObstaclesPerAction = 2;
		S.Challenges.clear();
		S.Challenges.push_back(FChallenge::MakeRequireRole(ERole::Mage, "challenge.mage_req", "Chiến thắng với ít nhất 1 Mage trong đội", 1));
		S.Challenges.push_back(FChallenge::MakeRequireDistinct(4, "challenge.variety", "Đội hình gồm ít nhất 4 class khác nhau"));
		S.Challenges.push_back(FChallenge::Make(FChallenge::EKind::WinWithinTurns, "challenge.turns", "Thắng trong 15 turn", 15));
		Stages.push_back(S);
	}

	return Stages;
}


} // namespace M3
