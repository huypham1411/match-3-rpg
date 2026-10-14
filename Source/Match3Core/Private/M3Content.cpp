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
		Def.SpriteKey = "attacker.1";
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
		Def.SpriteKey = "supporter.1";
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
		Def.SpriteKey = "healer.1";
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
		Def.SpriteKey = "defender.1";
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
		Def.SpriteKey = "counter.1";
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
		Def.SpriteKey = "deflecter.1";
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
		Def.SpriteKey = "mage.1";
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
		Def.SpriteKey = "mage.2";
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

// =============================================================================
//  Kẻ địch: 4 cấp bậc (Normal / Elite / MidBoss / Boss)
//  Mỗi địch có "chu kì hành động" riêng -> đa dạng cách tác động lên bàn match.
// =============================================================================
std::vector<FEnemyDef> FContentLibrary::MinionEnemies()
{
	std::vector<FEnemyDef> Out;

	// Quái thường: máu thấp, chỉ đánh thường + thỉnh thoảng gài bẫy.
	{
		FEnemyDef D = FEnemyDef::Make("enemy.minion.goblin", "Yêu Tinh Tro", EEnemyTier::Normal, 700.f, 70.f, "minion");
		D.Element = EElement::Fire;
		D.Pattern = { EBossAction::AoEAttack, EBossAction::SingleTargetAttack, EBossAction::SpawnTraps };
		Out.push_back(D);
	}
	{
		FEnemyDef D = FEnemyDef::Make("enemy.minion.imp", "Tiểu Quỷ Lửa", EEnemyTier::Normal, 620.f, 88.f, "minion");
		D.Element = EElement::Fire;
		D.Pattern = { EBossAction::SingleTargetAttack, EBossAction::AoEAttack, EBossAction::ScrambleColors };
		Out.push_back(D);
	}
	{
		FEnemyDef D = FEnemyDef::Make("enemy.minion.slime", "Nhớt Độc", EEnemyTier::Normal, 900.f, 55.f, "minion");
		D.Element = EElement::Water;
		D.Pattern = { EBossAction::AoEAttack, EBossAction::WeakenTeam, EBossAction::SpawnObstacles };
		Out.push_back(D);
	}

	return Out;
}

std::vector<FEnemyDef> FContentLibrary::EliteEnemies()
{
	std::vector<FEnemyDef> Out;

	{
		FEnemyDef D = FEnemyDef::Make("enemy.elite.warlock", "Tà Pháp Sư", EEnemyTier::Elite, 2100.f, 130.f, "elite");
		D.Element = EElement::Dark;
		D.MagResist = 0.15f;
		D.Pattern = { EBossAction::LockCells, EBossAction::SpawnTraps, EBossAction::AoEAttack };
		Out.push_back(D);
	}
	{
		FEnemyDef D = FEnemyDef::Make("enemy.elite.golem", "Thạch Nhân Vệ", EEnemyTier::Elite, 2800.f, 110.f, "elite");
		D.Element = EElement::None;
		D.PhysResist = 0.20f;
		D.Pattern = { EBossAction::SpawnObstacles, EBossAction::SingleTargetAttack, EBossAction::SelfBuff };
		Out.push_back(D);
	}
	{
		FEnemyDef D = FEnemyDef::Make("enemy.elite.wraith", "Oan Linh", EEnemyTier::Elite, 1800.f, 150.f, "elite");
		D.Element = EElement::Dark;
		D.Pattern = { EBossAction::DrainUltimate, EBossAction::ScrambleColors, EBossAction::AoEAttack };
		Out.push_back(D);
	}

	return Out;
}

std::vector<FEnemyDef> FContentLibrary::MidBossEnemies()
{
	std::vector<FEnemyDef> Out;

	{
		FEnemyDef D = FEnemyDef::Make("enemy.midboss.warden", "Ngục Chủ Nham Thạch", EEnemyTier::MidBoss, 7000.f, 210.f, "midboss");
		D.Element = EElement::None;
		D.Stagger = 1200.f;
		D.TotalPhases = 2;
		D.Pattern = { EBossAction::SpawnObstacles, EBossAction::LockCells, EBossAction::AoEAttack,
		              EBossAction::SelfBuff, EBossAction::SummonMinion };
		Out.push_back(D);
	}
	{
		FEnemyDef D = FEnemyDef::Make("enemy.midboss.seer", "Tiên Tri Hư Không", EEnemyTier::MidBoss, 6000.f, 190.f, "midboss");
		D.Element = EElement::Dark;
		D.MagResist = 0.25f;
		D.Stagger = 1000.f;
		D.TotalPhases = 2;
		D.Pattern = { EBossAction::ScrambleColors, EBossAction::DrainUltimate, EBossAction::BossChargeAttack,
		              EBossAction::WeakenTeam };
		Out.push_back(D);
	}

	return Out;
}

std::vector<FEnemyDef> FContentLibrary::BossEnemies()
{
	std::vector<FEnemyDef> Out;

	{
		FEnemyDef D = FEnemyDef::Make("enemy.boss.chimera", "Chimera Lửa", EEnemyTier::Boss, 4500.f, 140.f, "boss");
		D.Element = EElement::Fire;
		D.Stagger = 900.f;
		D.Pattern = { EBossAction::AoEAttack, EBossAction::SingleTargetAttack, EBossAction::SpawnObstacles,
		              EBossAction::WeakenTeam, EBossAction::SpawnTraps, EBossAction::SelfBuff };
		Out.push_back(D);
	}
	{
		FEnemyDef D = FEnemyDef::Make("enemy.boss.voidlord", "Ma Vương Hư Không", EEnemyTier::Boss, 16000.f, 300.f, "boss");
		D.Element = EElement::Dark;
		D.DamageType = EDamageType::Magic;
		D.PhysResist = 0.50f;   // cần Mage / sát thương Ma Pháp
		D.Stagger = 2500.f;
		D.TotalPhases = 2;
		D.Pattern = { EBossAction::AoEAttack, EBossAction::BossChargeAttack, EBossAction::ScrambleColors,
		              EBossAction::LockCells, EBossAction::DrainUltimate, EBossAction::SummonMinion,
		              EBossAction::SingleTargetAttack };
		Out.push_back(D);
	}

	return Out;
}

std::vector<FEnemyDef> FContentLibrary::AllEnemies()
{
	std::vector<FEnemyDef> Out;
	const std::vector<std::vector<FEnemyDef>> Groups = {
		MinionEnemies(), EliteEnemies(), MidBossEnemies(), BossEnemies()
	};
	for (const std::vector<FEnemyDef>& G : Groups)
	{
		Out.insert(Out.end(), G.begin(), G.end());
	}
	return Out;
}

FEnemyDef FContentLibrary::FindEnemy(const std::string& Id)
{
	for (const FEnemyDef& D : AllEnemies())
	{
		if (D.Id == Id) { return D; }
	}
	return FEnemyDef();
}

// =============================================================================
//  Story: chương + màn (bạn viết tiếp ở đây, UI chỉ đọc ra để hiển thị)
// =============================================================================
std::vector<FStageStory> FContentLibrary::StoryChapters()
{
	std::vector<FStageStory> Out;

	// ---------------------------------------------------------------------
	// Chương 1
	// ---------------------------------------------------------------------
	{
		FStageStory S;
		S.ChapterId = "ch.01";
		S.ChapterTitle = "Chương 1 - Tro Tàn Thức Giấc";
		S.StageTitle = "1-1: Bìa Rừng Cháy";
		S.Brief = "Lửa cháy suốt ba ngày. Thứ bò ra từ tro không còn là thú rừng nữa.";
		S.IntroLines = {
			"Lôi Kiếm Sĩ: Tro còn nóng... có gì đó vừa mới đi qua đây.",
			"Tinh Linh Chú Thuật: Đừng chạm vào - chúng nhiễm tà khí Hư Không.",
		};
		S.VictoryLines = { "Thánh Nữ Ánh Sáng: Đường vào làng đã mở. Nhưng tro vẫn chưa nguội." };
		S.DefeatLines = { "Tinh Linh Chú Thuật: Lùi lại! Chúng ta chưa sẵn sàng cho thứ này." };
		Out.push_back(S);
	}
	{
		FStageStory S;
		S.ChapterId = "ch.01";
		S.ChapterTitle = "Chương 1 - Tro Tàn Thức Giấc";
		S.StageTitle = "1-2: Tàn Tích Làng Tro";
		S.Brief = "Ngôi làng đầu tiên. Không còn ai, chỉ còn những bóng đen canh giữ đống đổ nát.";
		S.IntroLines = {
			"Thiết Giáp Vệ Binh: Một tinh anh cùng bầy quái canh cổng. Ta mở đường, các ngươi đánh trọng tâm.",
		};
		S.VictoryLines = { "Lôi Kiếm Sĩ: Cửa thành đã thủng. Vào trong thôi." };
		S.DefeatLines = { "Thiết Giáp Vệ Binh: Rút! Ta giữ chân chúng." };
		Out.push_back(S);
	}
	{
		FStageStory S;
		S.ChapterId = "ch.01";
		S.ChapterTitle = "Chương 1 - Tro Tàn Thức Giấc";
		S.StageTitle = "1-3: Ngục Chủ Nham Thạch";
		S.Brief = "Kẻ đứng sau đám tro là một tên Ngục Chủ cổ, canh giữ thứ đáng ra phải bị chôn vĩnh viễn.";
		S.IntroLines = {
			"Ngục Chủ Nham Thạch: Ngươi mở cửa ra... là tự đưa thứ đó vào thế gian.",
			"Ma Pháp Sĩ Cổ Đại: Ông ta đang niệm tụng - phá thanh stagger trước khi hắn triệu hồi thêm quái!",
		};
		S.VictoryLines = { "Ma Pháp Sĩ Cổ Đại: Cửa đã mở. Nhưng bóng tối phía sau cánh cửa còn rộng hơn cả ngôi làng này." };
		S.DefeatLines = { "Ngục Chủ Nham Thạch: Ở lại đây, cùng đám tro của các ngươi." };
		Out.push_back(S);
	}

	// ---------------------------------------------------------------------
	// Chương 2
	// ---------------------------------------------------------------------
	{
		FStageStory S;
		S.ChapterId = "ch.02";
		S.ChapterTitle = "Chương 2 - Ma Vương Hư Không";
		S.StageTitle = "2-1: Cánh Cổng Hư Không";
		S.Brief = "Hư Không không có hình dạng, nên nó mượn hình dạng nỗi sợ của ngươi.";
		S.IntroLines = {
			"Bóng Tối Báo Thù: Ta nghe thấy nó gọi tên ta. Cứ để ta đi trước.",
			"Vũ Nữ Phản Chấn: Khoan - hắn hút năng lượng của chúng ta! Kết hợp đường nối đi!",
		};
		S.VictoryLines = { "Bóng Tối Báo Thù: Nó lùi một bước. Chỉ một bước thôi, nhưng là thật." };
		S.DefeatLines = { "Ma Vương Hư Không: Các ngươi mạnh hơn ta tưởng. Nhưng vẫn chưa đủ." };
		Out.push_back(S);
	}

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

// =============================================================================
//  Chiến dịch mẫu: mỗi màn có THỂ gồm nhiều địch (quái thường + tinh anh + trùm).
//  Địch lấy từ thư viện ở trên; story lấy từ StoryChapters().
// =============================================================================
namespace
{
	// Ghép: [trùm chính] ở giữa hàng địch, quái phụ hai bên -> UI vẽ dàn trận.
	void PushEnemy(std::vector<FEnemyDef>& Out, const FEnemyDef& Def) { Out.push_back(Def); }

	FBattleSetup MakeStoryStage(uint32 Seed, int32 TeamSize, const std::string& StoryStageTitle,
	                            std::vector<FEnemyDef> Enemies, int32 StartObstacles, int32 MovesPerTurn)
	{
		FBattleSetup S = FContentLibrary::DefaultBattleSetup(TeamSize, Seed);
		S.Enemies = std::move(Enemies);
		S.StartObstacles = StartObstacles;
		S.Balance.MovesPerTurn = MovesPerTurn;

		// Gắn story của màn (khớp theo tiêu đề màn) nếu có.
		for (const FStageStory& Story : FContentLibrary::StoryChapters())
		{
			if (Story.StageTitle == StoryStageTitle) { S.Story = Story; break; }
		}
		return S;
	}
}

std::vector<FBattleSetup> FContentLibrary::CampaignStages(uint32 Seed)
{
	const std::vector<FEnemyDef> Minions = MinionEnemies();
	const std::vector<FEnemyDef> Elites  = EliteEnemies();
	const std::vector<FEnemyDef> Mids    = MidBossEnemies();
	const std::vector<FEnemyDef> Bosses  = BossEnemies();

	auto Pick = [](const std::vector<FEnemyDef>& List, size_t Index) -> FEnemyDef
	{
		return List.empty() ? FEnemyDef() : List[Index % List.size()];
	};

	std::vector<FBattleSetup> Stages;

	// ---------------------------------------------------------------
	// 1-1: 2 quái thường + 1 boss yếu (làm quen với hàng địch nhiều con).
	// ---------------------------------------------------------------
	{
		std::vector<FEnemyDef> Lineup;
		PushEnemy(Lineup, Pick(Minions, 0));
		PushEnemy(Lineup, Pick(Bosses, 0));     // Chimera Lửa
		PushEnemy(Lineup, Pick(Minions, 1));
		Stages.push_back(MakeStoryStage(Seed, 4, "1-1: Bìa Rừng Cháy", Lineup, 2, 4));
	}

	// ---------------------------------------------------------------
	// 1-2: 2 quái thường + 1 tinh anh + boss -> phải chọn đúng mục tiêu.
	// ---------------------------------------------------------------
	{
		std::vector<FEnemyDef> Lineup;
		PushEnemy(Lineup, Pick(Minions, 2));
		PushEnemy(Lineup, Pick(Elites, 1));     // Thạch Nhân Vệ (kháng vật lý)
		PushEnemy(Lineup, Pick(Bosses, 0));
		PushEnemy(Lineup, Pick(Minions, 0));
		Stages.push_back(MakeStoryStage(Seed + 1u, 5, "1-2: Tàn Tích Làng Tro", Lineup, 3, 4));
	}

	// ---------------------------------------------------------------
	// 1-3: 3 quái + 1 tinh anh + 1 MID-BOSS -> màn khó, cần kỹ năng + ultimate.
	// ---------------------------------------------------------------
	{
		std::vector<FEnemyDef> Lineup;
		PushEnemy(Lineup, Pick(Minions, 0));
		PushEnemy(Lineup, Pick(Elites, 0));     // Tà Pháp Sư (khoá ô)
		PushEnemy(Lineup, Pick(Mids, 0));       // Ngục Chủ Nham Thạch (2 phase, triệu hồi)
		PushEnemy(Lineup, Pick(Minions, 1));
		Stages.push_back(MakeStoryStage(Seed + 2u, 6, "1-3: Ngục Chủ Nham Thạch", Lineup, 4, 3));
	}

	// ---------------------------------------------------------------
	// 2-1: 2 MID-BOSS + nhiều quái + BOSS cuối (Ma Vương Hư Không).
	// ---------------------------------------------------------------
	{
		std::vector<FEnemyDef> Lineup;
		PushEnemy(Lineup, Pick(Minions, 2));
		PushEnemy(Lineup, Pick(Elites, 2));     // Oan Linh (hút ultimate)
		PushEnemy(Lineup, Pick(Mids, 1));       // Tiên Tri Hư Không (2 phase)
		PushEnemy(Lineup, Pick(Bosses, 1));     // Ma Vương Hư Không (kháng vật lý 50%)
		PushEnemy(Lineup, Pick(Minions, 0));

		FBattleSetup S = MakeStoryStage(Seed + 3u, 6, "2-1: Cánh Cổng Hư Không", Lineup, 4, 4);
		S.Balance.BossObstaclesPerAction = 2;
		S.Challenges.clear();
		S.Challenges.push_back(FChallenge::MakeRequireRole(ERole::Mage, "challenge.mage_req",
			"Chiến thắng với ít nhất 1 Mage trong đội", 1));
		S.Challenges.push_back(FChallenge::MakeRequireDistinct(4, "challenge.variety",
			"Đội hình gồm ít nhất 4 class khác nhau"));
		S.Challenges.push_back(FChallenge::Make(FChallenge::EKind::WinWithinTurns, "challenge.turns",
			"Thắng trong 15 turn", 15));
		Stages.push_back(S);
	}

	return Stages;
}


} // namespace M3
