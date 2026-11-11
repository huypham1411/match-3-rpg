// Copyright MatchRPG. "Sân chơi" học tập: chạy ngoài Unreal, gõ lệnh và xem bàn đổi.
//
// Mục đích: đây là chỗ để bạn NGHỊCH. Không có Unreal, không có đồ hoạ, chỉ có
// luật chơi thật (đúng những file mà game dùng) và một bàn cờ in bằng ký tự.
// Bạn gõ một lệnh, chương trình in ra chuyện gì vừa xảy ra và VÌ SAO.
//
//   Tools/playground/build_and_run.sh          # chế độ gõ lệnh
//   Tools/playground/build_and_run.sh --demo   # chạy kịch bản mẫu rồi thoát
//
// Gõ "help" trong chương trình để xem danh sách lệnh.

#include "Core/BattleSimCore.h"
#include "Core/ContentCore.h"
#include "Core/MatchBoardCore.h"
#include "Core/MatchFinderCore.h"
#include "Core/MatchRng.h"
#include "Core/MatchTypes.h"

#include <cstdio>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#ifdef _WIN32
#include <windows.h>
#endif

using namespace MatchRPG;

// ---------------------------------------------------------------------------
// Trạng thái của sân chơi
// ---------------------------------------------------------------------------

struct FPlayground
{
	FStageDefinitionRow Stage;
	TArray<FCharacterDefinitionRow> Roster;
	FTeamFormation Formation;
	FBattleSimCore Sim;
	int32 Seed = 20261007;
	bool bRunning = true;

	void StartNewBattle(int32 InSeed);
	void PrintBoard() const;
	void PrintState() const;
	void PrintOutcome(const FResolveOutcome& Outcome) const;
	void PrintGroups() const;
	void PrintRules() const;
	void PrintLog(int32 Count) const;
	void PrintHelp() const;
	void ExplainCell(int32 X, int32 Y) const;
	void RunAuto(int32 Turns);
};

/**
 * Bọc một nước đi để LUÔN có kết quả trả về, kể cả khi nước đó không hợp lệ.
 * TrySwap() chỉ trả về true/false, còn ở đây ta muốn in ra lý do cho người học.
 */
static FResolveOutcome DoSwap(FBattleSimCore& Sim, const FIntPoint& A, const FIntPoint& B)
{
	if (Sim.TrySwap(A, B)) { return Sim.GetLastOutcome(); }

	FResolveOutcome Rejected;
	Rejected.bMoveAccepted = false;
	return Rejected;
}

/** Tiện ích: đổi enum thành chữ tiếng Việt cho dễ đọc. */
static std::string RoleName(ERoleType Role)
{
	switch (Role)
	{
	case ERoleType::Attacker:  return "Tan cong (Attacker)";
	case ERoleType::Supporter: return "Ho tro (Supporter)";
	case ERoleType::Healer:    return "Hoi mau (Healer)";
	case ERoleType::Defender:  return "Phong thu (Defender)";
	case ERoleType::Counter:   return "Phan don (Counter)";
	case ERoleType::Deflector: return "Khuech tan (Deflector)";
	default:                   return "?";
	}
}

static std::string ColorNameVn(EBlockColor Color)
{
	switch (Color)
	{
	case EBlockColor::Red:    return "Do";
	case EBlockColor::Blue:   return "Xanh duong";
	case EBlockColor::Green:  return "Xanh la";
	case EBlockColor::Yellow: return "Vang";
	case EBlockColor::Purple: return "Tim";
	default:                  return "Khong mau";
	}
}

static std::string ShapeNameVn(EMatchShape Shape)
{
	switch (Shape)
	{
	case EMatchShape::Line3:   return "3 o thang";
	case EMatchShape::Line4:   return "4 o thang -> tao khoi xoa hang/cot";
	case EMatchShape::Line5:   return "5 o thang -> tao khoi SwapAll";
	case EMatchShape::Square4: return "o vuong 2x2 -> tao khoi pha vat can";
	case EMatchShape::LTShape: return "hinh L/T -> tao bom vung 3x3";
	default:                   return "khong ro";
	}
}

// ---------------------------------------------------------------------------
// In bàn cờ
// ---------------------------------------------------------------------------

void FPlayground::PrintBoard() const
{
	TArray<MRPGChar> Snapshot;
	Sim.GetBoard().DebugSnapshot(Snapshot);

	// Danh sách ô đang được chọn, để bạn thấy mình vừa bấm vào đâu.
	const int32 BoardWidth = Sim.GetBoard().GetWidth();

	std::printf("\n     ");
	for (int32 X = 0; X < BoardWidth; ++X) { std::printf("%2d ", X); }
	std::printf("   <- cot (X)\n");

	int32 Cursor = 0;
	for (int32 Y = 0; Y < Sim.GetBoard().GetHeight(); ++Y)
	{
		std::printf("  %2d ", Y);
		for (int32 X = 0; X < BoardWidth; ++X)
		{
			const MRPGChar Glyph = Snapshot.IsValidIndex(Cursor) ? Snapshot[Cursor] : MRPG_TEXT('?');
			std::printf(" %c ", Glyph);
			++Cursor;
		}
		std::printf("\n");
		++Cursor; // bo ky tu xuong dong trong snapshot
	}

	std::printf("\n  Ky hieu: chu THUONG = khoi thuong (r=do b=xanh duong g=xanh la y=vang p=tim)\n");
	std::printf("           chu HOA    = khoi dac biet cung mau do\n");
	std::printf("           ?          = khoi bi khoa mau (jam)\n");
	std::printf("           i=Ice  x=Rock  c=Crate  n=Chain   .=o trong\n\n");
}

// ---------------------------------------------------------------------------
// In trạng thái trận đấu
// ---------------------------------------------------------------------------

void FPlayground::PrintState() const
{
	const FBattleBossState& Boss = Sim.GetBoss();

	std::printf("\n--- TRAN DAU -------------------------------------------------\n");
	std::printf("  Luot %d / %d    Luot doi cho con lai: %d\n",
		Sim.GetTurn(), Stage.TurnLimit, Sim.GetMovesLeft());

	std::printf("  BOSS  mau %d/%d   (%.0f%%)\n", Boss.Hp, Boss.MaxHp, Boss.GetHpPercent() * 100.0f);
	if (Boss.bBroken)
	{
		std::printf("  STAGGER: VO! Boss dang choang, con %d luot - Counter phat huy manh nhat\n", Boss.BreakTurnsLeft);
	}
	else
	{
		std::printf("  STAGGER: %.0f/%.0f   (ve 0 thi boss vo, da vo %d lan)\n",
			Boss.Stagger, Boss.StaggerMax, Boss.BreakCount);
	}

	std::printf("\n  DOI HINH:\n");
	const TArray<FBattleCombatant>& Team = Sim.GetTeam();
	for (int32 i = 0; i < Team.Num(); ++i)
	{
		const FBattleCombatant& Hero = Team[i];
		std::printf("   [%d] %-22s mau %-10s  HP %5d/%5d  thanh chieu %5.1f/%.0f%s\n",
			i, RoleName(Hero.Role).c_str(), ColorNameVn(Hero.BoundColor).c_str(),
			Hero.Hp, Hero.MaxHp, Hero.UltGauge, Sim.GetScales().UltGaugeMax,
			Hero.IsUltimateReady(Sim.GetScales().UltGaugeMax) ? "  <-- BAM DUOC ULTIMATE" : "");

		if (Hero.Role == ERoleType::Deflector)
		{
			std::printf("        diem deflector: %d/%d (chi tang khi ban tao match-4 hoac o vuong)\n",
				Hero.DeflectorStacks, Sim.GetScales().DeflectorMaxStacks);
		}
		if (Hero.ManualCooldown > 0)
		{
			std::printf("        ky nang thu cong dang hoi chieu: con %d luot\n", Hero.ManualCooldown);
		}
	}

	if (Sim.GetResult().bFinished)
	{
		std::printf("\n  >>> KET THUC: %s   sao: %d/3   diem: %d\n",
			Sim.GetResult().bVictory ? "THANG" : "THUA", Sim.GetResult().Stars, Sim.GetResult().Score);
	}
	std::printf("--------------------------------------------------------------\n\n");
}

// ---------------------------------------------------------------------------
// Giải thích chuyện gì vừa xảy ra sau một nước đi
// ---------------------------------------------------------------------------

void FPlayground::PrintOutcome(const FResolveOutcome& Outcome) const
{
	if (!Outcome.bMoveAccepted)
	{
		std::printf("\n  -> Khong hop le: nuoc nay khong tao ra match nao, nen khong mat luot.\n");
		std::printf("     Thu lenh 'hint' de xem mot nuoc di dung.\n\n");
		return;
	}

	std::printf("\n  === NUOC DI NAY DA LAM GI ===\n");
	std::printf("  So dot no lien tiep: %d  (dot 1 la match ban tu tao, dot 2 tro di la do khoi roi xuong tao them)\n",
		Outcome.Steps.Num());

	for (int32 s = 0; s < Outcome.Steps.Num(); ++s)
	{
		const FResolveStepResult& Step = Outcome.Steps[s];
		std::printf("\n  -- Dot %d --\n", s + 1);

		for (int32 g = 0; g < Step.Groups.Num(); ++g)
		{
			const FMatchGroup& Group = Step.Groups[g];
			std::printf("     Nhom %d: %d o mau %s, hinh dang: %s",
				g + 1, Group.Length, ColorNameVn(Group.Color).c_str(), ShapeNameVn(Group.Shape).c_str());
			if (Group.AwardedSpecial != ESpecialType::None)
			{
				std::printf("  => sinh khoi dac biet %s tai o (%d,%d)",
					ToText(Group.AwardedSpecial), Group.Pivot.X, Group.Pivot.Y);
			}
			std::printf("\n");
		}

		for (int32 t = 0; t < Step.Triggers.Num(); ++t)
		{
			const FTriggerEvent& Trigger = Step.Triggers[t];
			std::printf("     Kich hoat %d o mau %s", Trigger.BlockCount, ColorNameVn(Trigger.Color).c_str());

			// In ra luon: mau nay ung voi nhan vat nao trong doi.
			for (int32 i = 0; i < Sim.GetTeam().Num(); ++i)
			{
				if (Sim.GetTeam()[i].BoundColor == Trigger.Color)
				{
					std::printf("  -> %s se hanh dong", RoleName(Sim.GetTeam()[i].Role).c_str());
				}
			}
			std::printf("\n");
		}

		if (Step.ObstaclesDestroyed > 0)
		{
			std::printf("     Pha huy %d vat can\n", Step.ObstaclesDestroyed);
		}
		if (Step.SpecialsTriggered > 0)
		{
			std::printf("     Kich hoat %d khoi dac biet (co the no day chuyen)\n", Step.SpecialsTriggered);
		}
	}

	std::printf("\n  TONG: xoa %d o, pha %d vat can, tao %d khoi dac biet, he so cascade x%.2f\n\n",
		Outcome.TotalBlocksCleared, Outcome.ObstaclesDestroyed,
		Outcome.SpecialsCreated, Outcome.CascadeMultiplier);
}

// ---------------------------------------------------------------------------
// Xem riêng phần "dò match"
// ---------------------------------------------------------------------------

void FPlayground::PrintGroups() const
{
	TArray<FMatchGroup> Groups;
	FMatchFinderCore::FindGroups(Sim.GetBoard(), Groups);

	std::printf("\n  Bo do match vua quet duoc %d nhom tren ban:\n", Groups.Num());
	if (Groups.Num() == 0)
	{
		std::printf("     (khong co nhom nao - ban dang 'sach', phai doi cho de tao match)\n\n");
		return;
	}

	for (int32 g = 0; g < Groups.Num(); ++g)
	{
		const FMatchGroup& Group = Groups[g];
		std::printf("     Nhom %d: mau %s, %d o, %s, pivot (%d,%d)\n",
			g + 1, ColorNameVn(Group.Color).c_str(), Group.Length,
			ShapeNameVn(Group.Shape).c_str(), Group.Pivot.X, Group.Pivot.Y);

		std::printf("        cac o:");
		for (int32 c = 0; c < Group.Cells.Num(); ++c)
		{
			std::printf(" (%d,%d)", Group.Cells[c].X, Group.Cells[c].Y);
		}
		std::printf("\n");
	}
	std::printf("\n");
}

void FPlayground::ExplainCell(int32 X, int32 Y) const
{
	const FMatchBoardCore& Board = Sim.GetBoard();
	if (!Board.IsInBounds(X, Y))
	{
		std::printf("\n  O (%d,%d) nam ngoai ban.\n\n", X, Y);
		return;
	}

	const FBlockCell& Cell = Board.At(X, Y);
	std::printf("\n  O (%d,%d):\n", X, Y);

	if (Cell.IsEmpty())
	{
		std::printf("     dang trong (cho khoi roi xuong lap vao)\n\n");
		return;
	}
	if (Cell.IsObstacle())
	{
		const FObstacleProfile Profile = GetObstacleProfile(Cell.Obstacle);
		std::printf("     VAT CAN loai %s, con %d/%d mau\n", ToText(Cell.Obstacle), Cell.Hp, Profile.Hp);
		std::printf("     match thuong gay sat thuong duoc khong? %s\n", Profile.bDamagedByBasicMatch ? "CO" : "KHONG");
		std::printf("     khoi dac biet gay sat thuong duoc khong? %s\n", Profile.bDamagedBySpecial ? "CO" : "KHONG");
		std::printf("     co roi xuong theo trong luc khong? %s\n\n", Cell.IsNonFalling() ? "KHONG (chan cot)" : "CO");
		return;
	}

	std::printf("     KHOI THUONG mau %s\n", ColorNameVn(Cell.Color).c_str());
	if (Cell.Special != ESpecialType::None) { std::printf("     co khoi dac biet: %s\n", ToText(Cell.Special)); }
	if (Cell.bJammed) { std::printf("     dang bi khoa mau (jam) - khong match duoc, con %d luot\n", Cell.JamTurnsLeft); }
	if (Cell.bLocked) { std::printf("     dang bi khoa - khong doi cho duoc, con %d luot\n", Cell.LockTurnsLeft); }
	std::printf("     co doi cho duoc khong? %s\n", Cell.CanSwap() ? "CO" : "KHONG");
	std::printf("\n");
}

// ---------------------------------------------------------------------------
// In bảng số đang chạy -> để bạn thấy code va con so lien nhau
// ---------------------------------------------------------------------------

void FPlayground::PrintRules() const
{
	const FEffectScaleRules& S = Sim.GetScales();
	const FBoardRules& B = Stage.Board;

	std::printf("\n  === BAN BAN (FBoardRules) ===\n");
	std::printf("     Kich thuoc ban: %d x %d, so mau tren ban: %d\n", B.Width, B.Height, B.ColorCount);
	std::printf("     O vuong 2x2 co tinh la match khong? %s\n", B.bEnableSquareMatch ? "CO" : "KHONG");
	std::printf("     Sat thuong o vuong gay cho vat can: %d (ban kinh %d)\n", B.SquareObstacleDamage, B.SquareObstacleRadius);
	std::printf("     Match-5 tao khoi SwapAll? %s\n", B.bMatch5CreatesSwapAll ? "CO" : "KHONG");
	std::printf("     Do sau cascade toi da: %d\n", B.MaxCascadeDepth);

	std::printf("\n  === CONG THUC CHIEN DAU (FEffectScaleRules) ===\n");
	std::printf("     SAT THUONG = Atk x (1 + %0.2f x so_o_them + %0.2f x so_o_them^2) x cascade   (tran x%.1f)\n",
		S.DamagePerBlock, S.DamageQuadratic, S.DamageMaxMultiplier);
	std::printf("     HOI MAU   = HealPower x %.2f^(so_o_them)                                     (tran x%.1f)\n",
		S.HealGrowthPerBlock, S.HealMaxMultiplier);
	std::printf("     BUFF      = %d stack khi match 3 o, them %d stack moi o them; keo dai %d luot, them %d luot moi o them\n",
		S.BuffStacksAtBase, S.BuffStacksPerExtraBlock, S.BuffDurationAtBase, S.BuffDurationPerExtraBlock);
	std::printf("     CASCADE   = +%.0f%% sat thuong moi tang cascade\n", S.CascadeMultiplierPerLevel * 100.0f);

	std::printf("\n  === STAGGER ===\n");
	std::printf("     Moi diem sat thuong lam stagger tut %.2f diem (chua ke debuff)\n", S.StaggerPerDamage);
	std::printf("     Debuff len boss lam tut them %.0f%% thanh stagger\n", S.StaggerFromDebuff * 100.0f);
	std::printf("     Khi boss vo: sat thuong tang %.0f%%, keo dai %d luot, sau do thanh stagger to hon x%.2f\n",
		S.BreakDamageBonus * 100.0f, S.BreakDurationTurns, S.BreakStaggerGrowth);

	std::printf("\n  === DEFLECTOR va DEFENDER ===\n");
	std::printf("     Deflector can %d diem (match-4 = %d, o vuong = %d, match-5 = %d)\n",
		S.DeflectorMaxStacks, S.DeflectorChargePerLine4, S.DeflectorChargePerSquare, S.DeflectorChargePerLine5);
	std::printf("     Khi tieu: tut %.0f%% thanh stagger toi da\n", S.DeflectorStaggerPercent * 100.0f);
	std::printf("     Defender: ket thuc luot ma khong lam gi thi ca doi giam %.0f%% sat thuong nhan vao\n", S.DefenderIdleDamageCut * 100.0f);

	std::printf("\n  === ULTIMATE ===\n");
	std::printf("     Thanh day o %.0f diem. Moi luot +%.0f, moi o kich hoat +%.1f, moi khoi dac biet +%.1f\n",
		S.UltGaugeMax, S.UltGaugePerTurn, S.UltGaugePerTriggeredBlock, S.UltGaugePerSpecial);
	std::printf("     Noi %d ultimate trong cung mot luot = FULL BURST (+%.0f%% sat thuong)\n\n",
		S.FullBurstChainLength, S.FullBurstDamageBonus * 100.0f);
}

void FPlayground::PrintLog(int32 Count) const
{
	const TArray<FBattleEvent>& Log = Sim.GetLog();
	const int32 First = FMath::Max(0, Log.Num() - Count);

	std::printf("\n  %d su kien gan nhat:\n", Log.Num() - First);
	for (int32 i = First; i < Log.Num(); ++i)
	{
		const FBattleEvent& E = Log[i];
		std::printf("     [luot %2d] ", E.Turn);
		switch (E.Kind)
		{
		case FBattleEvent::EKind::Damage:
			if (E.bBoss) { std::printf("doi danh boss %d sat thuong%s\n", E.Amount, E.bCrit ? " (dang vo stagger)" : ""); }
			else { std::printf("boss danh o doi %d mat %d mau\n", E.SlotIndex, E.Amount); }
			break;
		case FBattleEvent::EKind::Heal:            std::printf("hoi %d mau cho o doi %d\n", E.Amount, E.SlotIndex); break;
		case FBattleEvent::EKind::Buff:            std::printf("buff %s x%d (%s)\n", ToText(E.Status), E.Amount, E.bBoss ? "len boss" : "len doi"); break;
		case FBattleEvent::EKind::Debuff:          std::printf("debuff %s x%d (%s)\n", ToText(E.Status), E.Amount, E.bBoss ? "len boss" : "len doi"); break;
		case FBattleEvent::EKind::Break:           std::printf(">>> BOSS VO STAGGER <<<\n"); break;
		case FBattleEvent::EKind::Retaliate:       std::printf("%s kich hoat\n", ToText(E.Role)); break;
		case FBattleEvent::EKind::ObstacleSpawned: std::printf("boss tha %s xuong ban\n", ToText(E.Obstacle)); break;
		case FBattleEvent::EKind::ObstacleCleared: std::printf("pha duoc %s\n", ToText(E.Obstacle)); break;
		case FBattleEvent::EKind::BoardDebuff:     std::printf("boss khoa mau %s\n", ToText(E.Color)); break;
		case FBattleEvent::EKind::Ultimate:        std::printf("ban ultimate tu o doi %d\n", E.SlotIndex); break;
		case FBattleEvent::EKind::ManualSkill:     std::printf("dung ky nang o doi %d\n", E.SlotIndex); break;
		case FBattleEvent::EKind::ChainBurst:      std::printf("chain burst!\n"); break;
		case FBattleEvent::EKind::FullBurst:       std::printf(">>> FULL BURST <<<\n"); break;
		case FBattleEvent::EKind::Guard:           std::printf("defender giam sat thuong cho ca doi\n"); break;
		case FBattleEvent::EKind::StaggerDrain:    std::printf("thanh stagger tut\n"); break;
		case FBattleEvent::EKind::Victory:         std::printf("*** THANG ***\n"); break;
		case FBattleEvent::EKind::Defeat:          std::printf("*** THUA ***\n"); break;
		case FBattleEvent::EKind::Shuffle:         std::printf("xao lai ban vi het nuoc di\n"); break;
		case FBattleEvent::EKind::TurnStart:       std::printf("--- bat dau luot ---\n"); break;
		case FBattleEvent::EKind::TurnEnd:         std::printf("--- ket thuc luot, boss hanh dong ---\n"); break;
		case FBattleEvent::EKind::MatchResolved:   std::printf("no %d o\n", E.Amount); break;
		case FBattleEvent::EKind::Cascade:         std::printf("cascade tang %d, no them %d o\n", E.CascadeLevel + 1, E.Amount); break;
		default:                                   std::printf("(su kien khac)\n"); break;
		}
	}
	std::printf("\n");
}

void FPlayground::PrintHelp() const
{
	std::printf(
		"\n  ================= LENH =================\n"
		"   board / b            In ban co\n"
		"   state / s            In mau boss, stagger, mau doi, thanh chieu\n"
		"   groups / g           Chi cho xem BO DO MATCH tim duoc nhung nhom nao\n"
		"   cell X Y             Giai thich mot o: no la gi, co doi cho duoc khong\n"
		"   swap X1 Y1 X2 Y2     Doi cho 2 o ke nhau va xem chuyen gi xay ra\n"
		"   hint / h             Tim mot nuoc di hop le (khong tu dong danh)\n"
		"   play / p             Danh luon nuoc di tot nhat tim duoc\n"
		"   end / e              Ket thuc luot som -> boss hanh dong\n"
		"   ult N                Ban ultimate cua o doi thu N (0..5)\n"
		"   skill N              Dung ky nang thu cong cua o doi thu N\n"
		"   auto N               De bot tu danh N luot\n"
		"   log [so_dong]        Xem lai nhat ky tran dau\n"
		"   rules                In toan bo con so dang chay (de doi chieu voi code)\n"
		"   new [seed]           Bat dau tran moi\n"
		"   help                 In bang nay\n"
		"   quit                 Thoat\n"
		"  ========================================\n\n");
}

// ---------------------------------------------------------------------------

void FPlayground::StartNewBattle(int32 InSeed)
{
	Seed = InSeed;
	ContentCore::BuildDemoStage(Stage);
	ContentCore::BuildFullRoster(Roster);
	ContentCore::BuildStarterFormation(Roster, Formation);
	Sim.Setup(Stage, Roster, Formation, static_cast<uint64>(Seed));

	std::printf("\n  Da bat dau tran moi voi seed %d (cung seed = cung dien bien y het, tien cho viec debug)\n", Seed);
	PrintState();
	PrintBoard();
}

void FPlayground::RunAuto(int32 Turns)
{
	for (int32 i = 0; i < Turns && !Sim.IsFinished(); ++i)
	{
		// Ban het ultimate dang day truoc, roi danh nuoc di tot nhat.
		for (int32 Slot = 0; Slot < Sim.GetTeam().Num(); ++Slot)
		{
			if (Sim.GetTeam()[Slot].IsUltimateReady(Sim.GetScales().UltGaugeMax))
			{
				std::printf("  [auto] ban ultimate o doi %d\n", Slot);
				Sim.FireUltimate(Slot);
			}
		}

		FIntPoint A;
		FIntPoint B;
		if (Sim.FindHint(A, B))
		{
			Sim.TrySwap(A, B);
		}
		else
		{
			Sim.EndTurn();
		}
	}
	PrintState();
	PrintBoard();
}

// ---------------------------------------------------------------------------
// Vòng lặp gõ lệnh
// ---------------------------------------------------------------------------

int main(int argc, char** argv)
{
#ifdef _WIN32
	// Để tiếng Việt hiện đúng trong cmd/PowerShell cũ.
	SetConsoleOutputCP(CP_UTF8);
#endif

	bool bDemoMode = false;
	for (int32 i = 1; i < argc; ++i)
	{
		if (std::string(argv[i]) == "--demo") { bDemoMode = true; }
	}

	std::printf("==========================================================\n");
	std::printf("  MatchRPG - SAN CHOI HOC TAP\n");
	std::printf("  Day chinh la luat choi that cua game, chi khac la khong co do hoa.\n");
	std::printf("  Go 'help' de xem cac lenh.\n");
	std::printf("==========================================================\n");

	FPlayground Play;
	Play.StartNewBattle(Play.Seed);

	if (bDemoMode)
	{
		std::printf("\n### CHE DO DEMO: cung xem mot nuoc di dien ra the nao ###\n");
		Play.PrintGroups();

		FIntPoint A;
		FIntPoint B;
		if (Play.Sim.FindHint(A, B))
		{
			std::printf("  Bot chon doi cho o (%d,%d) voi o (%d,%d)\n", A.X, A.Y, B.X, B.Y);
			const FResolveOutcome Outcome = DoSwap(Play.Sim, A, B);
			Play.PrintOutcome(Outcome);
			Play.PrintBoard();
			Play.PrintRules();
		}
		std::printf("\n### HET DEMO. Chay lai khong co --demo de tu go lenh. ###\n");
		return 0;
	}

	std::string Line;
	while (Play.bRunning)
	{
		std::printf("matchrpg> ");
		if (!std::getline(std::cin, Line)) { break; }
		if (Line.empty()) { continue; }

		std::istringstream Stream(Line);
		std::string Command;
		Stream >> Command;

		if (Command == "quit" || Command == "q" || Command == "exit") { break; }

		if (Command == "help" || Command == "?")
		{
			Play.PrintHelp();
		}
		else if (Command == "board" || Command == "b")
		{
			Play.PrintBoard();
		}
		else if (Command == "state" || Command == "s")
		{
			Play.PrintState();
		}
		else if (Command == "groups" || Command == "g")
		{
			Play.PrintGroups();
		}
		else if (Command == "rules")
		{
			Play.PrintRules();
		}
		else if (Command == "log")
		{
			int32 Count = 15;
			Stream >> Count;
			Play.PrintLog(Count);
		}
		else if (Command == "cell")
		{
			int32 X = 0;
			int32 Y = 0;
			Stream >> X >> Y;
			Play.ExplainCell(X, Y);
		}
		else if (Command == "swap")
		{
			int32 X1 = 0;
			int32 Y1 = 0;
			int32 X2 = 0;
			int32 Y2 = 0;
			Stream >> X1 >> Y1 >> X2 >> Y2;

			const FResolveOutcome Outcome = DoSwap(Play.Sim, FIntPoint(X1, Y1), FIntPoint(X2, Y2));
			Play.PrintOutcome(Outcome);
			Play.PrintBoard();
			Play.PrintState();
		}
		else if (Command == "hint" || Command == "h")
		{
			FIntPoint A;
			FIntPoint B;
			if (Play.Sim.FindHint(A, B))
			{
				std::printf("\n  Goi y: doi cho o (%d,%d) voi o (%d,%d). Go 'play' de danh luon.\n\n", A.X, A.Y, B.X, B.Y);
			}
			else
			{
				std::printf("\n  Het nuoc di hop le - ban se tu duoc xao lai o dau luot sau.\n\n");
			}
		}
		else if (Command == "play" || Command == "p")
		{
			FIntPoint A;
			FIntPoint B;
			if (Play.Sim.FindHint(A, B))
			{
				std::printf("\n  Danh nuoc: (%d,%d) <-> (%d,%d)\n", A.X, A.Y, B.X, B.Y);
				const FResolveOutcome Outcome = DoSwap(Play.Sim, A, B);
				Play.PrintOutcome(Outcome);
				Play.PrintBoard();
				Play.PrintState();
			}
			else
			{
				std::printf("\n  Khong con nuoc di nao hop le.\n\n");
			}
		}
		else if (Command == "end" || Command == "e")
		{
			std::printf("\n  Ket thuc luot -> boss hanh dong...\n");
			Play.Sim.EndTurn();
			Play.PrintState();
			Play.PrintBoard();
		}
		else if (Command == "ult")
		{
			int32 Slot = 0;
			Stream >> Slot;
			if (Play.Sim.FireUltimate(Slot)) { std::printf("\n  Da ban ultimate o doi %d (chuoi burst: %d)\n\n", Slot, Play.Sim.GetBurstChainCount()); }
			else { std::printf("\n  Khong ban duoc: thanh chua day, hoac o nay khong ton tai/da guc.\n\n"); }
		}
		else if (Command == "skill")
		{
			int32 Slot = 0;
			Stream >> Slot;
			if (Play.Sim.FireManualSkill(Slot)) { std::printf("\n  Da dung ky nang o doi %d\n\n", Slot); }
			else { std::printf("\n  Khong dung duoc: dang hoi chieu, hoac ky nang nay doi boss phai vo stagger.\n\n"); }
		}
		else if (Command == "auto")
		{
			int32 Turns = 1;
			Stream >> Turns;
			Play.RunAuto(Turns);
		}
		else if (Command == "new")
		{
			int32 NewSeed = Play.Seed + 1;
			Stream >> NewSeed;
			Play.StartNewBattle(NewSeed);
		}
		else
		{
			std::printf("  Khong hieu lenh '%s'. Go 'help'.\n\n", Command.c_str());
		}
	}

	std::printf("\n  Tam biet.\n");
	return 0;
}
