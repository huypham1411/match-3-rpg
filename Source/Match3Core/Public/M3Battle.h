// =============================================================================
//  M3Battle.h  -  Bộ điều phối trận đấu (turn-based): nối dây giữa bàn, đội, boss
//  ---------------------------------------------------------------------------
//  Vòng chơi:
//    - Người chơi có MovesPerTurn lượt match. Mỗi lượt match hợp lệ sẽ kích hoạt
//      hiệu ứng của nhân vật có màu tương ứng (attacker/supporter/healer).
//    - Trong turn, người chơi có thể bấm kỹ năng (1 lần/role, có hồi chiêu) và
//      ultimate (khi thanh đã đầy, chain được nhiều ultimate liên tiếp = full burst).
//    - Hết lượt match (hoặc bấm "kết thúc turn") -> kiểm tra Defender/Deflecter
//      -> boss hành động -> buff tick -> sang turn mới.
// =============================================================================
#pragma once

#include "M3Balance.h"
#include "M3Board.h"
#include "M3Matcher.h"
#include "M3Resolver.h"
#include "M3Skills.h"
#include "M3Team.h"
#include "M3Types.h"

namespace M3
{

// ---------------------------------------------------------------------------
// Điều kiện thắng phụ của map (challenge -> ảnh hưởng số sao)
// ---------------------------------------------------------------------------
struct FChallenge
{
	enum class EKind : std::uint8_t
	{
		ClearAllObstacles = 0,  // gỡ sạch vật cản
		WinWithinTurns,         // thắng trong N turn
		NoMemberDowned,         // không thành viên nào gục
		TriggerManyInOneMove    // kích hoạt >= N block trong 1 nước đi
	};

	EKind       Kind = EKind::ClearAllObstacles;
	std::string Id   = "challenge";
	std::string Description = "";
	int32       Value = 0;          // ngưỡng (N turn / N block...)
	bool        bCompleted = false;

	static FChallenge Make(EKind InKind, const std::string& InId, const std::string& InDesc, int32 InValue)
	{
		FChallenge C; C.Kind = InKind; C.Id = InId; C.Description = InDesc; C.Value = InValue; return C;
	}
};

// ---------------------------------------------------------------------------
// Boss
// ---------------------------------------------------------------------------
enum class EBossAction : std::uint8_t
{
	AoEAttack = 0,          // sát thương diện rộng toàn đội
	SingleTargetAttack,     // sát thương đơn thể nhắm vào 1 nhân vật
	SpawnObstacles,         // tạo vật cản lên bàn
	WeakenTeam,             // debuff giảm sát thương người chơi
	SpawnTraps,             // đặt bẫy đếm ngược lên bàn
	SelfBuff,               // boss vận công tích stack tăng sát thương
	BossChargeAttack        // boss nạp tuyệt kĩ (cần phá chiêu bằng combo / số block trong turn)
};

enum class ESkillBreakKind : std::uint8_t
{
	None = 0,
	ComboCount,     // Yêu cầu chuỗi combo >= N lần trong 1 lượt nối
	BlockCount      // Yêu cầu nổ >= N block trong turn
};

struct FBossState
{
	std::string Name = "Boss";
	float Hp    = 0.f;
	float HpMax = 0.f;
	float Atk   = 200.f;

	float Stagger    = 0.f;    // "thanh stagger": giảm khi boss nhận sát thương
	float StaggerMax = 1000.f;

	bool  bBroken = false;         // đang vỡ stagger -> boss ngất, nhận thêm sát thương
	int32 BreakTurnsLeft = 0;

	float StaggerRate = 1.f;       // hệ số nhân stagger nhận vào (debuff supporter làm tăng)
	int32 PatternIndex = 0;        // boss luân phiên các hành động theo thứ tự

	// Cơ chế nâng cao: Boss Multi-Phase, kháng thuộc tính & tích Buff
	int32 CurrentPhase = 1;
	int32 TotalPhases  = 1;
	float PhysResist   = 0.f;      // 0.3 = giảm 30% sát thương vật lý nhận vào
	float MagResist    = 0.f;      // 0.3 = giảm 30% sát thương phép
	float ElementResist[static_cast<size_t>(EElement::Count)] = { 0.f }; // kháng hệ cụ thể
	int32 SelfBuffStacks = 0;      // mỗi stack cộng 10% sát thương cho boss

	// Hành động dự định & Mục tiêu nhắm tới trong turn này (Cho UI vẽ viền đỏ)
	EBossAction IntentAction = EBossAction::AoEAttack;
	int32 IntentTargetMemberIndex = -1; // -1 = AoE / không mục tiêu đơn lẻ

	// Nạp chiêu & Yêu cầu Phá Chiêu (Skill Break QTE)
	bool bCharging = false;
	ESkillBreakKind SkillBreakKind = ESkillBreakKind::None;
	int32 SkillBreakRequired = 0;
	int32 SkillBreakCurrent  = 0;

	float SelfBuffAtkMultiplier() const { return 1.0f + SelfBuffStacks * 0.10f; }
	float HpPercent() const { return HpMax > 0.f ? Hp / HpMax : 0.f; }
	float StaggerPercent() const { return StaggerMax > 0.f ? Stagger / StaggerMax : 0.f; }
};

// ---------------------------------------------------------------------------
// Cấu hình trận (map / stage)
// ---------------------------------------------------------------------------
struct MATCH3CORE_API FBattleSetup
{
	int32  BoardWidth  = 8;
	int32  BoardHeight = 8;
	int32  NumColors   = 6;
	uint32 Seed        = 20261008u;
	int32  StartObstacles = 3;

	std::vector<FCharacterDef> Roster;          // 1..6 nhân vật
	std::vector<FEquipment>    StartingEquipment; // trang bị mặc định cho mọi nhân vật (test/mở đầu)

	std::string BossName = "Boss";
	float BossHp      = 6000.f;
	float BossAtk     = 180.f;
	float BossStagger = 1200.f;

	int32 MovesPerTurn = 4;

	std::vector<FChallenge> Challenges;
	FBalance Balance;

	// Mẫu đội hình mặc định: 4 nhân vật role cơ bản (attacker/supporter/healer/defender)
	static FBattleSetup DefaultStarter();
};

// ---------------------------------------------------------------------------
// Ảnh chụp trạng thái để UI đọc (không cho phép sửa từ UI)
// ---------------------------------------------------------------------------
struct FBattleSnapshot
{
	int32 Turn = 1;
	int32 MovesLeft = 0;
	int32 MovesPerTurn = 0;

	float BossHp = 0.f, BossHpMax = 0.f;
	float Stagger = 0.f, StaggerMax = 0.f;
	bool  bBroken = false;

	float TeamHp = 0.f, TeamHpMax = 0.f;
	int32 TeamAliveCount = 0;

	int32 Obstacles = 0;
	int32 Stars = 0;
	bool  bVictory = false;
	bool  bDefeat = false;
	int32 UltimateChainCount = 0;
};

// ---------------------------------------------------------------------------
// Trận đấu
// ---------------------------------------------------------------------------
class MATCH3CORE_API FBattle
{
public:
	void Setup(const FBattleSetup& InSetup);
	bool IsSetup() const { return bSetup; }

	// ---------- Hành động của người chơi ----------
	// 1 nước đi = 1 lần đổi chỗ hợp lệ (cascade trong cùng nước đi vẫn là 1 lượt).
	FActionResult PlayerSwap(const FCell& A, const FCell& B);
	// Kỹ năng chủ động của 1 nhân vật (hồi chiêu tính theo turn, hỗ trợ chỉ định ô gỡ block/bẫy).
	FActionResult UseBasicSkill(int32 MemberIndex, const FCell& TargetCell = MakeCell(-1, -1));
	// Ultimate: cần đầy thanh; dùng liên tiếp trong cùng turn để chain.
	FActionResult UseUltimate(int32 MemberIndex);
	// Hồi sinh nhân vật gục (dùng kỹ năng Healer / Vật phẩm).
	FActionResult UseReviveSkill(int32 MemberIndex, int32 TargetMemberIndex);
	// Kết thúc turn sớm: nếu chưa làm gì trong turn -> Defender kích hoạt.
	FActionResult EndTurn();

	// ---------- Truy vấn ----------
	FBoard&       Board() { return BoardState; }
	const FBoard& Board() const { return BoardState; }
	FParty&       Party() { return Team; }
	const FParty& Party() const { return Team; }
	FBossState&       Boss() { return BossState; }
	const FBossState& Boss() const { return BossState; }
	FPartyEffects&       Effects() { return EffectsState; }
	const FPartyEffects& Effects() const { return EffectsState; }
	const std::vector<FChallenge>& Challenges() const { return ChallengeList; }
	const std::vector<std::string>& LogLines() const { return LogText; }
	const FResolveOutcome& LastResolve() const { return LastOutcome; }
	const FBalance& Balance() const { return Cfg; }
	FBalance& Balance() { return Cfg; }

	int32 Turn() const { return TurnIndex; }
	int32 MovesLeft() const { return MovesRemaining; }
	bool  IsVictory() const { return bVictory; }
	bool  IsDefeat() const { return bDefeat; }
	bool  IsFinished() const { return bVictory || bDefeat; }

	FBattleSnapshot Snapshot() const;
	int32 EvaluateStars() const;

	// Thêm 1 dòng log (UI hiển thị + test đọc).
	void AddLog(const std::string& Line);
	const std::string& LastLog() const;

	// ---------- Dùng cho test / debug ----------
	float TotalDamageDealt() const { return DamageDealtTotal; }
	float TotalDamageTaken() const { return DamageTakenTotal; }
	int32 UltimatesUsedThisTurn() const { return UltimatesUsedInTurn; }
	int32 MovesUsedThisTurn() const { return MovesUsedInTurn; }

private:
	// --- Cấu trúc ---
	bool  bSetup = false;
	FBalance Cfg;
	FBoard  BoardState;
	FParty  Team;
	FBossState BossState;
	FPartyEffects EffectsState;
	std::vector<FChallenge> ChallengeList;
	std::vector<std::string> LogText;
	FRng Rng{ 1u };
	FResolveOutcome LastOutcome;

	// --- Kết quả trận ---
	bool bVictory = false;
	bool bDefeat  = false;

	// --- Trạng thái trong turn ---
	int32 TurnIndex = 1;
	int32 MovesRemaining = 4;
	int32 MovesUsedInTurn = 0;
	int32 UltimatesUsedInTurn = 0;
	bool  bBasicSkillUsedThisTurn[static_cast<int32>(ERole::Count)] = { false, false, false, false, false, false };

	// --- Thống kê ---
	float DamageDealtTotal = 0.f;
	float DamageTakenTotal = 0.f;
	int32 MaxBlocksInSingleMove = 0;
	int32 MaxStarsReached = 0;

	// ---------- Nội bộ ----------
	void  RebuildPartyStats();
	// Biến kết quả nối thành hiệu ứng cho từng nhân vật.
	void  ApplyMatchEffects(const FResolveOutcome& Outcome);
	float ComputeMatchDamage(int32 AttackerIndex, const FResolveOutcome& Outcome) const;
	float ComputeHealAmount(int32 HealerIndex, const FResolveOutcome& Outcome) const;
	void  ApplySupportEffect(int32 SupporterIndex, const FResolveOutcome& Outcome);

	// Gây sát thương lên boss (đã tính buff/break) + trừ stagger.
	float DealDamageToBoss(float RawDamage, const std::string& SourceName);
	void  ReduceStagger(float Amount, const std::string& SourceName);
	void  CheckStaggerBreak();

	// End-turn: Deflecter/Defender, boss hành động, buff tick, nạp ultimate.
	void  AdvanceTurn(bool bExplicitEarlyEnd);
	void  BossAction();
	void  TickTurnStart();
	void  UpdateChallenges();
	void  CheckBattleEnd();

	int32 FindMemberIndexByRole(ERole Role) const;
	FCharacterState* FindMemberByColor(EColor Color);
};

} // namespace M3
