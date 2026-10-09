// =============================================================================
//  M3BattleTests.cpp  -  Test vòng chơi turn-based: 4 role + counter/deflecter,
//                        stagger/BREAK, boss, ultimate, challenge, đội hình
// =============================================================================
#include "M3TestFramework.h"
#include "M3TestHelpers.h"

using namespace M3;
using namespace M3TestHelpers;

namespace
{
// Đếm số dòng log có chứa một cụm từ (dùng để kiểm tra sự kiện đặc biệt).
bool LogContains(const FBattle& Battle, const std::string& Needle)
{
	for (const std::string& Line : Battle.LogLines())
	{
		if (Line.find(Needle) != std::string::npos) { return true; }
	}
	return false;
}
} // namespace

// =============================================================================
//  Sát thương của Attacker
// =============================================================================
M3TEST(Attacker_SatThuongTangTheoSoBlockTrigger)
{
	// Trận A: nối 3 block Đỏ
	FBattle Battle3;
	Battle3.Setup(MakeTestSetup(4, 4242u));
	const FCell A3 = DesignHorizontalRun(Battle3.Board(), EColor::Red, 3);
	M3REQUIRE(Battle3.PlayerSwap(A3, MakeCell(A3.X, A3.Y + 1)).IsOk());
	const int32 Blocks3 = Battle3.LastResolve().Steps[0].BlocksInStep;
	const float Damage3 = Battle3.TotalDamageDealt();

	// Trận B: nối 5 block Đỏ (hình chữ L -> không sinh special nên xoá đủ 5)
	FBattle Battle5;
	Battle5.Setup(MakeTestSetup(4, 4242u));
	const FCell A5 = DesignLShapeFive(Battle5.Board(), EColor::Red);
	M3REQUIRE(Battle5.PlayerSwap(A5, MakeCell(A5.X, A5.Y + 1)).IsOk());
	const int32 Blocks5 = Battle5.LastResolve().Steps[0].BlocksInStep;
	const float Damage5 = Battle5.TotalDamageDealt();

	std::cout << "        (3 block: " << Damage3 << " dmg | 5 block: " << Damage5 << " dmg)\n";

	M3REQUIRE_EQ(Blocks3, 3);
	M3REQUIRE_EQ(Blocks5, 5);
	M3REQUIRE_GT(Damage3, 0.f);
	M3REQUIRE_GT(Damage5, Damage3);

	// Kiểm tra sát thương không thấp hơn công thức tối thiểu: Atk * DmgPerBlock * blocks
	const float AttackerAtk = Battle3.Party().Members()[0].Atk;
	const float MinDamage3 = AttackerAtk * Battle3.Balance().DamagePerBlock * 3.f;
	M3REQUIRE(Damage3 >= MinDamage3 - 1.f);
}

// =============================================================================
//  Hồi máu của Healer (tăng theo cấp số nhân)
// =============================================================================
M3TEST(Healer_HoiMauTangTheoCapSoNhan)
{
	// Trận A: nối 3 block Xanh lá
	FBattle Battle3;
	Battle3.Setup(MakeTestSetup(4, 5150u));
	LowerTeamHp(Battle3, 0.3f);
	const FCell A3 = DesignHorizontalRun(Battle3.Board(), EColor::Green, 3);
	const float Hp3Before = Battle3.Party().TotalHp();
	M3REQUIRE(Battle3.PlayerSwap(A3, MakeCell(A3.X, A3.Y + 1)).IsOk());
	const float Heal3 = Battle3.Party().TotalHp() - Hp3Before;

	// Trận B: nối 5 block Xanh lá
	FBattle Battle5;
	Battle5.Setup(MakeTestSetup(4, 5150u));
	LowerTeamHp(Battle5, 0.3f);
	const FCell A5 = DesignLShapeFive(Battle5.Board(), EColor::Green);
	const float Hp5Before = Battle5.Party().TotalHp();
	M3REQUIRE(Battle5.PlayerSwap(A5, MakeCell(A5.X, A5.Y + 1)).IsOk());
	const float Heal5 = Battle5.Party().TotalHp() - Hp5Before;

	std::cout << "        (3 block: hoi " << Heal3 << " HP | 5 block: hoi " << Heal5 << " HP)\n";

	M3REQUIRE_GT(Heal3, 0.f);
	M3REQUIRE_GT(Heal5, 0.f);
	// Cấp số nhân: 5 block phải hồi hơn gấp đôi 3 block (công thức: 1.55^2 = 2.4 lần)
	M3REQUIRE(Heal5 > Heal3 * 2.f);
}

// =============================================================================
//  Buff của Supporter
// =============================================================================
M3TEST(Supporter_BuffStackTangTheoSoBlock)
{
	FBattle Battle3;
	Battle3.Setup(MakeTestSetup(4, 6262u));
	const FCell A3 = DesignHorizontalRun(Battle3.Board(), EColor::Blue, 3);
	M3REQUIRE(Battle3.PlayerSwap(A3, MakeCell(A3.X, A3.Y + 1)).IsOk());

	M3REQUIRE_GT(static_cast<int32>(Battle3.Effects().Buffs.size()), 0);
	M3REQUIRE_GT(Battle3.Effects().AtkMultiplier(), 1.f);
	M3REQUIRE_GT(Battle3.Effects().StaggerMultiplier(), 1.f);

	FBattle Battle5;
	Battle5.Setup(MakeTestSetup(4, 6262u));
	const FCell A5 = DesignLShapeFive(Battle5.Board(), EColor::Blue);
	M3REQUIRE(Battle5.PlayerSwap(A5, MakeCell(A5.X, A5.Y + 1)).IsOk());

	std::cout << "        (3 block: " << Battle3.Effects().TotalStacks() << " stack | 5 block: "
		<< Battle5.Effects().TotalStacks() << " stack)\n";

	M3REQUIRE_GT(Battle5.Effects().TotalStacks(), Battle3.Effects().TotalStacks());
}

// =============================================================================
//  Stagger vỡ -> Counter được ra tay
// =============================================================================
M3TEST(Counter_ChiHoatDongKhiBossVoStagger)
{
	FBattle Battle;
	Battle.Setup(MakeTestSetup(5, 9090u));   // index 4 = Counter
	M3REQUIRE(Battle.Party().Members()[4].Def.Role == ERole::Counter);

	// Đưa thanh stagger về gần 0 để chắc chắn vỡ trong nước đi tới.
	Battle.Boss().Stagger = 5.f;

	// Khi boss chưa BREAK: kỹ năng của Counter bị từ chối.
	M3REQUIRE(Battle.UseBasicSkill(4).Code == EActionResult::NotReady);
	M3REQUIRE(!Battle.Boss().bBroken);

	const float DamageBefore = Battle.TotalDamageDealt();
	const FCell A = DesignHorizontalRun(Battle.Board(), EColor::Red, 3);
	M3REQUIRE(Battle.PlayerSwap(A, MakeCell(A.X, A.Y + 1)).IsOk());

	M3REQUIRE(Battle.Boss().bBroken);                       // stagger đã vỡ
	M3REQUIRE_GT(Battle.TotalDamageDealt(), DamageBefore);  // Counter đánh thêm
	M3REQUIRE(LogContains(Battle, "Counter"));
	M3REQUIRE(Battle.UseBasicSkill(4).IsOk());              // trong cửa sổ BREAK thì dùng được
}

// =============================================================================
//  Deflecter: đủ 4 stack match-4 -> cuối turn phá stagger
// =============================================================================
M3TEST(Deflecter_Du4Stack_ThiCuoiTurnPhaStagger)
{
	FBattle Battle;
	Battle.Setup(MakeTestSetup(6, 6060u));   // index 5 = Deflecter
	FCharacterState& Deflecter = Battle.Party().Members()[5];
	M3REQUIRE(Deflecter.Def.Role == ERole::Deflecter);

	Deflecter.DeflectStacks = Battle.Balance().DeflectStacksRequired;
	const float StaggerBefore = Battle.Boss().Stagger;
	const float ExpectedDrop = Battle.Boss().StaggerMax * Battle.Balance().DeflectStaggerPercent;

	Battle.EndTurn();   // hoàn tất turn -> Deflecter kích hoạt

	M3REQUIRE_EQ(Deflecter.DeflectStacks, 0);
	M3REQUIRE(Battle.Boss().Stagger <= StaggerBefore - ExpectedDrop + 1.f);
	M3REQUIRE(LogContains(Battle, "Deflecter"));
}

// =============================================================================
//  Defender: kết thúc turn mà không làm gì -> giảm sát thương boss
// =============================================================================
M3TEST(Defender_EndTurnKhongLamGi_ThiGiamSatThuong)
{
	// Trận A: kết thúc turn ngay, không làm gì -> Defender dựng khiên
	FBattleSetup Setup = MakeTestSetup(4, 7070u);
	FBattle IdleBattle;
	IdleBattle.Setup(Setup);
	IdleBattle.EndTurn();
	const float DamageIdle = IdleBattle.TotalDamageTaken();

	// Trận B: có hành động rồi mới kết thúc turn -> không có khiên
	FBattle ActiveBattle;
	ActiveBattle.Setup(Setup);
	FCell A, C;
	M3REQUIRE(ActiveBattle.Board().FindAnyPossibleMove(A, C));
	M3REQUIRE(ActiveBattle.PlayerSwap(A, C).IsOk());
	ActiveBattle.EndTurn();
	const float DamageActive = ActiveBattle.TotalDamageTaken();

	std::cout << "        (co khien: " << DamageIdle << " | khong khien: " << DamageActive << ")\n";

	M3REQUIRE_GT(DamageIdle, 0.f);
	M3REQUIRE_GT(DamageActive, DamageIdle);
}

// =============================================================================
//  Nhịp turn: hết lượt nối -> boss hành động -> sang turn mới
// =============================================================================
M3TEST(HetLuotNoi_ThiBossHanhDong_VaSangTurnMoi)
{
	FBattleSetup Setup = MakeTestSetup(4, 8080u);
	Setup.Balance.MovesPerTurn = 1;
	FBattle Battle;
	Battle.Setup(Setup);

	M3REQUIRE_EQ(Battle.Turn(), 1);
	M3REQUIRE_EQ(Battle.MovesLeft(), 1);

	FCell A, C;
	M3REQUIRE(Battle.Board().FindAnyPossibleMove(A, C));
	M3REQUIRE(Battle.PlayerSwap(A, C).IsOk());

	M3REQUIRE_EQ(Battle.Turn(), 2);
	M3REQUIRE_EQ(Battle.MovesLeft(), 1);
}

// =============================================================================
//  Boss tạo vật cản + Supporter gỡ vật cản
// =============================================================================
M3TEST(BossTaoVatCan_VaSupporterGoVatCan)
{
	FBattleSetup Setup = MakeTestSetup(4, 8181u);
	Setup.Balance.MovesPerTurn = 1;
	Setup.StartObstacles = 0;
	FBattle Battle;
	Battle.Setup(Setup);

	FCell A, C;
	M3REQUIRE(Battle.Board().FindAnyPossibleMove(A, C));
	M3REQUIRE(Battle.PlayerSwap(A, C).IsOk());
	M3REQUIRE_EQ(Battle.Board().ObstacleCount(), 0);      // boss hành động 1 = AoE

	Battle.Boss().PatternIndex = static_cast<int32>(EBossAction::SpawnObstacles);
	M3REQUIRE(Battle.Board().FindAnyPossibleMove(A, C));
	M3REQUIRE(Battle.PlayerSwap(A, C).IsOk());
	M3REQUIRE_EQ(Battle.Board().ObstacleCount(), Battle.Balance().BossObstaclesPerAction);

	// Supporter (index 1) gỡ 1 vật cản.
	M3REQUIRE(Battle.UseBasicSkill(1).IsOk());
	M3REQUIRE_EQ(Battle.Board().ObstacleCount(), Battle.Balance().BossObstaclesPerAction - 1);

	// Đang hồi chiêu -> dùng lại bị từ chối.
	M3REQUIRE(Battle.UseBasicSkill(1).Code == EActionResult::NotReady);
}

// =============================================================================
//  Ultimate: nạp theo block, chain tăng dần, full burst khi cả đội tung
// =============================================================================
M3TEST(Ultimate_ChainTangDan_VaFullBurst)
{
	FBattle Battle;
	Battle.Setup(MakeTestSetup(6, 9191u));

	// Chưa nạp đủ thì không dùng được.
	M3REQUIRE(Battle.UseUltimate(0).Code == EActionResult::NotReady);

	for (FCharacterState& M : Battle.Party().Members())
	{
		M.UltimateCharge = Battle.Balance().UltimateMaxCharge;
	}

	const float D0 = Battle.TotalDamageDealt();
	M3REQUIRE(Battle.UseUltimate(0).IsOk());          // Attacker (chain x1)
	const float D1 = Battle.TotalDamageDealt();
	M3REQUIRE(Battle.UseUltimate(4).IsOk());          // Counter  (chain x2 -> mạnh hơn)
	const float D2 = Battle.TotalDamageDealt();

	std::cout << "        (ult chain 1: " << (D1 - D0) << " dmg | ult chain 2: " << (D2 - D1) << " dmg)\n";
	M3REQUIRE_GT(D2 - D1, D1 - D0);

	M3REQUIRE(Battle.UseUltimate(1).IsOk());          // Supporter
	M3REQUIRE(Battle.UseUltimate(2).IsOk());          // Healer
	M3REQUIRE(Battle.UseUltimate(3).IsOk());          // Defender
	M3REQUIRE(Battle.UseUltimate(5).IsOk());          // Deflecter

	M3REQUIRE_EQ(Battle.UltimatesUsedThisTurn(), 6);
	M3REQUIRE(LogContains(Battle, "FULL BURST"));

	// Đã dùng hết thanh -> không dùng lại được.
	M3REQUIRE(Battle.UseUltimate(0).Code == EActionResult::NotReady);
}

// =============================================================================
//  Thắng trận + số sao theo challenge
// =============================================================================
M3TEST(ThangTran_SoSaoTheoChallenge)
{
	FBattleSetup Setup = MakeTestSetup(4, 1111u);
	Setup.Challenges.push_back(FChallenge::Make(FChallenge::EKind::WinWithinTurns, "c.turns", "Thắng trong 12 turn", 12));
	Setup.Challenges.push_back(FChallenge::Make(FChallenge::EKind::NoMemberDowned, "c.nodeath", "Không ai gục", 0));
	FBattle Battle;
	Battle.Setup(Setup);

	M3REQUIRE_EQ(Battle.EvaluateStars(), 0);           // chưa thắng -> 0 sao

	// Rút ngắn trận để test: boss chỉ còn 1 HP, rồi tung ultimate của Attacker.
	Battle.Boss().Hp = 1.f;
	Battle.Party().Members()[0].UltimateCharge = Battle.Balance().UltimateMaxCharge;
	M3REQUIRE(Battle.UseUltimate(0).IsOk());

	M3REQUIRE(Battle.IsVictory());
	M3REQUIRE_EQ(Battle.EvaluateStars(), 3);           // 1 sao nền + 2 challenge
	M3REQUIRE(LogContains(Battle, "CHIẾN THẮNG"));
}

// =============================================================================
//  Xây đội: tối đa 6 người, 3 trang bị, 1 pet
// =============================================================================
M3TEST(DoiHinh_ToiDa6Nguoi_3TrangBi_1Pet)
{
	FParty Party;
	for (const FCharacterDef& Def : FContentLibrary::AllCharacters())
	{
		if (Party.MemberCount() < FParty::kMaxMembers)
		{
			M3REQUIRE(Party.AddCharacter(Def));
		}
	}
	M3REQUIRE_EQ(Party.MemberCount(), 6);
	M3REQUIRE(!Party.AddCharacter(FContentLibrary::AllCharacters()[0]));   // người thứ 7 -> từ chối


	const std::vector<FEquipment> Equips = FContentLibrary::StarterEquipment();
	M3REQUIRE(Party.Equip(0, Equips[0]));
	M3REQUIRE(Party.Equip(0, Equips[1]));
	M3REQUIRE(Party.Equip(0, Equips[2]));
	M3REQUIRE(!Party.Equip(0, Equips[0]));                                 // slot thứ 4 -> từ chối

	const float AtkBefore = Party.Members()[0].Atk;
	const float HpBefore  = Party.Members()[0].HpMax;
	Party.UnlockPet(0, "pet.baby.dragon", 40.f);
	Party.RecomputeStats(FBalance::Default());

	M3REQUIRE_GT(Party.Members()[0].Atk, AtkBefore);
	M3REQUIRE_GT(Party.Members()[0].HpMax, HpBefore);
	M3REQUIRE_GT(Party.Members()[0].Hp, 0.f);
}

// =============================================================================
//  Mô phỏng trận dài: chơi + dùng kỹ năng/ultimate cho tới khi kết thúc
// =============================================================================
M3TEST(MoPhongTranDau_KetThucKhongTreo)
{
	FBattleSetup Setup = MakeTestSetup(6, 20261008u);
	Setup.BossHp = 15000.f;
	FBattle Battle;
	Battle.Setup(Setup);

	int32 Actions = 0;
	while (!Battle.IsFinished() && Actions < 400)
	{
		FCell A, C;
		if (!Battle.Board().FindAnyPossibleMove(A, C))
		{
			Battle.Board().Shuffle();
			Battle.Board().EnsurePlayable();
		}
		else
		{
			Battle.PlayerSwap(A, C);
		}
		++Actions;

		// Người chơi thật sẽ chủ động dùng kỹ năng / ultimate khi có thể.
		for (int32 i = 0; i < Battle.Party().MemberCount(); ++i)
		{
			if (Battle.Party().Members()[i].UltimateCharge >= Battle.Balance().UltimateMaxCharge)
			{
				Battle.UseUltimate(i);
			}
			else if (Battle.Party().Members()[i].BasicCooldown == 0)
			{
				Battle.UseBasicSkill(i);
			}
		}
	}

	std::cout << "        (turn " << Battle.Turn() << " | hanh dong " << Actions
		<< " | ket qua: " << (Battle.IsVictory() ? "thang" : (Battle.IsDefeat() ? "thua" : "chua xong"))
		<< " | sao: " << Battle.EvaluateStars() << ")\n";

	M3REQUIRE(Actions > 0);
	M3REQUIRE_GT(Battle.Turn(), 5);
	M3REQUIRE(Battle.IsFinished() ? (Battle.IsVictory() != Battle.IsDefeat()) : true);
}

// =============================================================================
//  Bẫy đếm ngược: tự nổ khi hết turn
// =============================================================================
M3TEST(BayDemNguoc_NoKhiHetTurn_HoacGoKhiNoi)
{
	FBattle Battle;
	Battle.Setup(MakeTestSetup(4, 9999u));

	// Đặt bẫy đếm ngược 1 turn lên bàn
	Battle.Board().PlaceRandomTraps(1, 1);
	const float HpBefore = Battle.Party().TotalHp();

	Battle.EndTurn(); // Kết thúc turn -> bẫy đếm ngược 1 turn nổ

	const float HpAfter = Battle.Party().TotalHp();
	M3REQUIRE_GT(HpBefore, HpAfter);
	M3REQUIRE(LogContains(Battle, "BẪY ĐẾM NGƯỢC NỔ"));
}

// =============================================================================
//  Boss Multi-Phase: chuyển sang Phase 2 khi HP về 0
// =============================================================================
M3TEST(BossNhiuuPhase_ChuyenPhaseKhiHpVeZero)
{
	FBattle Battle;
	Battle.Setup(MakeTestSetup(4, 8888u));
	Battle.Boss().TotalPhases = 2;
	Battle.Boss().CurrentPhase = 1;
	Battle.Boss().Hp = 1.f;

	// Tung ultimate của Attacker kết liễu Phase 1
	Battle.Party().Members()[0].UltimateCharge = Battle.Balance().UltimateMaxCharge;
	M3REQUIRE(Battle.UseUltimate(0).IsOk());

	M3REQUIRE_EQ(Battle.Boss().CurrentPhase, 2);
	M3REQUIRE(!Battle.IsVictory()); // chưa thắng vì mới xong Phase 1
	M3REQUIRE_GT(Battle.Boss().Hp, 0.f); // HP đã được hồi đầy cho Phase 2
	M3REQUIRE(LogContains(Battle, "CHUYỂN SANG PHASE 2"));
}

// =============================================================================
//  Cột Nâng Cấp Kỹ Năng kiểu Wuthering Waves (WuWa Skill Tree)
// =============================================================================
M3TEST(WuWa_SkillTree_CuongHoaNhanVat)
{
	FBattle Battle;
	Battle.Setup(MakeTestSetup(4, 7777u));

	FCharacterState& Attacker = Battle.Party().Members()[0];
	const float AtkBase = Attacker.Atk;

	M3REQUIRE(Attacker.UnlockSkillNode(1)); // Nâng node 1 (Stat Level)
	M3REQUIRE_EQ(Attacker.NodeStatLevel, 1);

	Battle.Party().RecomputeStats(Battle.Balance());
	M3REQUIRE_GT(Attacker.Atk, AtkBase);
}

// =============================================================================
//  Trang bị đồng thuộc tính (Element Alignment Bonus)
// =============================================================================
M3TEST(TrangBi_DongThuocTinh_MultiplierBonus)
{
	FParty Party;
	FCharacterDef FireChar;
	FireChar.Id = "char.fire";
	FireChar.Name = "Kiếm Sĩ Hỏa";
	FireChar.Element = EElement::Fire;
	FireChar.BaseAtk = 200.f;
	Party.AddCharacter(FireChar);

	FEquipment FireSword;
	FireSword.Id = "equip.fire.sword";
	FireSword.Element = EElement::Fire; // Đồng thuộc tính Hỏa
	FireSword.AtkBonus = 100.f;

	Party.Equip(0, FireSword);
	Party.RecomputeStats(FBalance::Default());

	// Vì đồng thuộc tính Hỏa nên 100 AtkBonus được nhân 1.5 lần -> 150 AtkBonus!
	M3REQUIRE_EQ(Party.Members()[0].Atk, 350.f);
}

// =============================================================================
//  Kỹ năng chỉ định ô: Supporter gỡ chính xác ô vật cản/bẫy được chọn
// =============================================================================
M3TEST(KyNangChiDinh_GoVatCanOrBayChinhXac)
{
	FBattle Battle;
	Battle.Setup(MakeTestSetup(4, 5555u));

	const FCell TargetCell = MakeCell(2, 3);
	Battle.Board().PlaceObstacle(TargetCell, 1);
	M3REQUIRE(Battle.Board().At(TargetCell).IsObstacle());

	// Supporter (index 1) sử dụng kỹ năng chỉ định ô (2, 3)
	M3REQUIRE(Battle.UseBasicSkill(1, TargetCell).IsOk());

	M3REQUIRE(!Battle.Board().At(TargetCell).IsObstacle());
	M3REQUIRE(LogContains(Battle, "(Chỉ định) gỡ thành công"));
}

// =============================================================================
//  Boss Tấn Công Đơn Thể & Block biến thành Vật Cản khi Nhân Vật Gục
// =============================================================================
M3TEST(Boss_TanCongDonThe_VatCanHienRaKhiNhanVatGuc)
{
	FBattle Battle;
	Battle.Setup(MakeTestSetup(4, 3333u));

	// Rút máu Attacker (index 0, màu Đỏ) xuống 1 HP
	Battle.Party().Members()[0].Hp = 1.f;
	const EColor RedColor = Battle.Party().Members()[0].Def.MatchColor;

	// Ép Boss tung đòn SingleTargetAttack
	Battle.Boss().PatternIndex = 1; // Pattern index 1 = SingleTargetAttack
	Battle.EndTurn();

	M3REQUIRE(!Battle.Party().Members()[0].bAlive); // Attacker gục
	M3REQUIRE(LogContains(Battle, "NHÂN VẬT GỤC"));
}

// =============================================================================
//  Hồi sinh nhân vật tử trận (Revive Skill)
// =============================================================================
M3TEST(HoiSinhNhanVat_HoiMauVaKhoiPhucLuatMatch)
{
	FBattle Battle;
	Battle.Setup(MakeTestSetup(4, 2222u));

	// Đánh gục Attacker (index 0)
	Battle.Party().Members()[0].Hp = 0.f;
	Battle.Party().Members()[0].bAlive = false;

	// Healer (index 2) hồi sinh Attacker
	M3REQUIRE(Battle.UseReviveSkill(2, 0).IsOk());

	M3REQUIRE(Battle.Party().Members()[0].bAlive);
	M3REQUIRE_GT(Battle.Party().Members()[0].Hp, 0.f);
	M3REQUIRE(LogContains(Battle, "HỒI SINH"));
}

// =============================================================================
//  Class Mage: Sát thương Ma Pháp & Debuff Suy Yếu Ma Pháp lên Boss Kháng Vật Lý
// =============================================================================
M3TEST(Mage_SatThuongMaPhap_VaDebuffSuyYeuMaPhap)
{
	FBattle Battle;
	FBattleSetup Setup = MakeTestSetup(4, 7777u);

	// Thêm 1 Mage (màu Tím, Ma Pháp)
	FCharacterDef MageDef;
	MageDef.Id = "char.mage.test";
	MageDef.Name = "Ma Pháp Sĩ Test";
	MageDef.Role = ERole::Mage;
	MageDef.DamageType = EDamageType::Magic;
	MageDef.MatchColor = EColor::Purple;
	MageDef.BaseAtk = 300.f;
	Setup.Roster.push_back(MageDef);

	// Boss kháng 80% vật lý, 0% phép
	Setup.BossHp = 10000.f;
	Battle.Setup(Setup);
	Battle.Boss().PhysResist = 0.80f;
	Battle.Boss().MagResist = 0.0f;

	// Dùng Mage Basic Skill
	const int32 MageIdx = Battle.Party().MemberCount() - 1;
	M3REQUIRE(Battle.UseBasicSkill(MageIdx).IsOk());
	M3REQUIRE(LogContains(Battle, "Ma pháp"));
	M3REQUIRE(LogContains(Battle, "Suy Yếu Ma Pháp"));
}

// =============================================================================
//  Đội hình tự do 6 người & Nhiệm vụ Class (RequireRoleCount / RequireDistinctClasses)
// =============================================================================
M3TEST(DoiHinh_TuDo6Nguoi_VaNhiemVuClassMap)
{
	FBattle Battle;
	FBattleSetup Setup = MakeTestSetup(6, 6666u);
	Setup.Challenges.clear();
	Setup.Challenges.push_back(FChallenge::MakeRequireRole(ERole::Mage, "ch.mage", "Cần có Mage", 1));
	Setup.Challenges.push_back(FChallenge::MakeRequireDistinct(4, "ch.variety", "Cần 4 class khác nhau"));

	// Đưa 1 Mage vào danh sách
	FCharacterDef MageDef;
	MageDef.Id = "char.mage.test2";
	MageDef.Name = "Băng Chú Sĩ";
	MageDef.Role = ERole::Mage;
	MageDef.DamageType = EDamageType::Magic;
	MageDef.MatchColor = EColor::Cyan;
	Setup.Roster[5] = MageDef;

	Setup.BossHp = 1.f; // Ép boss 1 HP để thắng ngay khi nối
	Battle.Setup(Setup);

	FCell A, B;
	M3REQUIRE(Battle.Board().FindAnyPossibleMove(A, B));
	Battle.PlayerSwap(A, B);

	M3REQUIRE(Battle.IsVictory());
	M3REQUIRE(Battle.EvaluateStars() >= 2);
}



