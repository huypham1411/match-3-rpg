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
		TriggerManyInOneMove,   // kích hoạt >= N block trong 1 nước đi
		RequireRoleCount,       // đem theo ít nhất N thành viên có role chỉ định
		RequireDistinctClasses  // đội hình gồm ít nhất N class (role) khác nhau
	};

	EKind       Kind = EKind::ClearAllObstacles;
	std::string Id   = "challenge";
	std::string Description = "";
	int32       Value = 0;          // ngưỡng (N turn / N block...)
	ERole       TargetRole = ERole::Mage; // Role yêu cầu nếu Kind == RequireRoleCount
	bool        bCompleted = false;

	static FChallenge Make(EKind InKind, const std::string& InId, const std::string& InDesc, int32 InValue)
	{
		FChallenge C; C.Kind = InKind; C.Id = InId; C.Description = InDesc; C.Value = InValue; return C;
	}
	static FChallenge MakeRequireRole(ERole InRole, const std::string& InId, const std::string& InDesc, int32 InMinCount = 1)
	{
		FChallenge C; C.Kind = EKind::RequireRoleCount; C.Id = InId; C.Description = InDesc; C.Value = InMinCount; C.TargetRole = InRole; return C;
	}
	static FChallenge MakeRequireDistinct(int32 InMinDistinct, const std::string& InId, const std::string& InDesc)
	{
		FChallenge C; C.Kind = EKind::RequireDistinctClasses; C.Id = InId; C.Description = InDesc; C.Value = InMinDistinct; return C;
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
	BossChargeAttack,       // boss nạp tuyệt kĩ (cần phá chiêu bằng combo / số block trong turn)
	LockCells,              // khoá vài ô trên bàn trong N turn (không swap / không rơi)
	ScrambleColors,         // đảo màu ngẫu nhiên vài block -> phá đường nối người chơi đang chuẩn bị
	DrainUltimate,          // hút bớt điểm ultimate của cả đội
	SummonMinion,           // triệu hồi thêm 1 quái thường vào trận
	Count
};

inline const char* BossActionName(EBossAction Action)
{
	switch (Action)
	{
	case EBossAction::AoEAttack:          return "Sát thương diện rộng";
	case EBossAction::SingleTargetAttack: return "Đòn đơn thể";
	case EBossAction::SpawnObstacles:     return "Tạo vật cản";
	case EBossAction::WeakenTeam:         return "Suy yếu đội";
	case EBossAction::SpawnTraps:         return "Gài bẫy đếm ngược";
	case EBossAction::SelfBuff:           return "Vận công tăng sát thương";
	case EBossAction::BossChargeAttack:   return "Nạp tuyệt kĩ";
	case EBossAction::LockCells:          return "Khoá ô";
	case EBossAction::ScrambleColors:     return "Đảo màu block";
	case EBossAction::DrainUltimate:      return "Hút ultimate";
	case EBossAction::SummonMinion:       return "Triệu hồi quái";
	default:                              return "?";
	}
}

enum class ESkillBreakKind : std::uint8_t
{
	None = 0,
	ComboCount,     // Yêu cầu chuỗi combo >= N lần trong 1 lượt nối
	BlockCount      // Yêu cầu nổ >= N block trong turn
};

// ---------------------------------------------------------------------------
// Định nghĩa tĩnh của một đơn vị địch (dùng cho Data Asset / story về sau)
// ---------------------------------------------------------------------------
struct FEnemyDef
{
	std::string Id   = "enemy.unknown";
	std::string Name = "Quái";
	EEnemyTier  Tier = EEnemyTier::Normal;
	EElement    Element = EElement::None;
	EDamageType DamageType = EDamageType::Physical;

	float Hp      = 900.f;
	float Atk     = 90.f;
	float Stagger = 0.f;          // 0 = không có thanh stagger (quái thường)
	float PhysResist = 0.f;
	float MagResist  = 0.f;
	int32 TotalPhases = 1;

	// Khoá tra sprite pixel ở lớp UI (Web / Unreal). Rỗng -> UI tự suy theo tier.
	std::string SpriteKey = "";

	// Chu kì hành động. Rỗng -> dùng chu kì mặc định theo cấp bậc.
	std::vector<EBossAction> Pattern;

	static FEnemyDef Make(std::string InId, std::string InName, EEnemyTier InTier,
	                      float InHp, float InAtk, std::string InSprite = "")
	{
		FEnemyDef D;
		D.Id = std::move(InId);
		D.Name = std::move(InName);
		D.Tier = InTier;
		D.Hp = InHp;
		D.Atk = InAtk;
		D.SpriteKey = std::move(InSprite);
		return D;
	}
};

// ---------------------------------------------------------------------------
// Một đơn vị địch trong trận (trạng thái động)
// ---------------------------------------------------------------------------
struct FEnemyState
{
	FEnemyDef Def;

	std::string Name = "Boss";
	float Hp    = 0.f;
	float HpMax = 0.f;
	float Atk   = 200.f;

	float Stagger    = 0.f;    // "thanh stagger": giảm khi địch nhận sát thương
	float StaggerMax = 1000.f;

	bool  bBroken = false;         // đang vỡ stagger -> ngất, nhận thêm sát thương
	int32 BreakTurnsLeft = 0;
	bool  bAlive  = true;          // false = đã bị hạ (UI vẽ mờ / ẩn đi)
	int32 SlotIndex = 0;           // thứ tự trong hàng địch (UI bố cục theo số này)

	float StaggerRate = 1.f;       // hệ số nhân stagger nhận vào (debuff supporter làm tăng)
	int32 PatternIndex = 0;        // địch luân phiên các hành động theo thứ tự

	// Cơ chế nâng cao: Địch Multi-Phase, kháng thuộc tính & tích Buff
	int32 CurrentPhase = 1;
	int32 TotalPhases  = 1;
	float PhysResist   = 0.f;      // 0.3 = giảm 30% sát thương vật lý nhận vào
	float MagResist    = 0.f;      // 0.3 = giảm 30% sát thương phép
	float ElementResist[static_cast<size_t>(EElement::Count)] = { 0.f }; // kháng hệ cụ thể
	int32 SelfBuffStacks = 0;      // mỗi stack cộng 10% sát thương cho địch

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

	EEnemyTier Tier() const { return Def.Tier; }
	bool IsBossLike() const { return Def.Tier == EEnemyTier::MidBoss || Def.Tier == EEnemyTier::Boss; }

	// Hành động sẽ dùng ở lượt này (theo chu kì riêng của từng địch).
	EBossAction NextAction() const
	{
		const std::vector<EBossAction>& P = Def.Pattern;
		if (P.empty()) { return EBossAction::AoEAttack; }
		const int32 Size = static_cast<int32>(P.size());
		const int32 Index = ((PatternIndex % Size) + Size) % Size;
		return P[static_cast<size_t>(Index)];
	}
};

// Tên cũ giữ lại để code cũ (HUD/actor của UE và test) biên dịch được.
using FBossState = FEnemyState;

// ---------------------------------------------------------------------------
// Dữ liệu story của một màn (bạn điền dần; UI chỉ đọc ra để hiển thị)
// ---------------------------------------------------------------------------
struct FStageStory
{
	std::string ChapterId    = "";       // vd "ch.01"
	std::string ChapterTitle = "";       // vd "Chương 1 - Tro Tàn Thức Giấc"
	std::string StageTitle   = "";       // vd "1-3: Cổng Thành Rực Cháy"
	std::string Brief        = "";       // tóm tắt ngắn cho màn chọn
	std::vector<std::string> IntroLines;   // thoại trước trận
	std::vector<std::string> VictoryLines; // thoại sau khi thắng
	std::vector<std::string> DefeatLines;  // thoại khi thua

	bool IsEmpty() const
	{
		return ChapterId.empty() && StageTitle.empty() && IntroLines.empty();
	}
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

	// --- Danh sách kẻ địch của màn (thường / elite / mid-boss / boss) ---
	// Rỗng -> dựng 1 boss từ các trường Boss* bên dưới (giữ tương thích code cũ).
	std::vector<FEnemyDef> Enemies;

	// Trường cũ: vẫn dùng để dựng địch mặc định khi Enemies rỗng.
	std::string BossName = "Boss";
	float BossHp      = 6000.f;
	float BossAtk     = 180.f;
	float BossStagger = 1200.f;

	int32 MovesPerTurn = 4;

	std::vector<FChallenge> Challenges;
	FBalance Balance;

	FStageStory Story;   // story của màn (có thể bỏ trống)

	// Dựng danh sách địch hiệu dụng: Enemies nếu có, ngược lại 1 boss từ Boss*.
	std::vector<FEnemyDef> BuildEnemyList() const;

	// Tổng HP của cả hàng địch (dùng cho UI vẽ thanh máu tổng).
	float TotalEnemyHp() const;

	// Mẫu đội hình mặc định: 4 nhân vật role cơ bản (attacker/supporter/healer/defender)
	static FBattleSetup DefaultStarter();
};

// ---------------------------------------------------------------------------
// Ảnh chụp một đơn vị địch (UI đọc để vẽ)
// ---------------------------------------------------------------------------
struct FEnemySnapshot
{
	int32       Slot = 0;
	std::string Id;
	std::string Name;
	EEnemyTier  Tier = EEnemyTier::Normal;
	std::string TierKey;      // "normal" / "elite" / "midboss" / "boss"
	std::string SpriteKey;    // khoá tra hình pixel ở UI

	float Hp = 0.f, HpMax = 0.f;
	float Stagger = 0.f, StaggerMax = 0.f;
	bool  bBroken = false;
	bool  bAlive = true;
	int32 BreakTurnsLeft = 0;
	int32 CurrentPhase = 1;
	int32 TotalPhases = 1;
	int32 SelfBuffStacks = 0;

	EBossAction IntentAction = EBossAction::AoEAttack;
	int32 IntentTargetMemberIndex = -1;
	bool  bCharging = false;
	int32 SkillBreakCurrent = 0;
	int32 SkillBreakRequired = 0;

	float HpPercent() const { return HpMax > 0.f ? Hp / HpMax : 0.f; }
	float StaggerPercent() const { return StaggerMax > 0.f ? Stagger / StaggerMax : 0.f; }
	bool  HasStagger() const { return StaggerMax > 0.f; }
};

// ---------------------------------------------------------------------------
// Ảnh chụp trạng thái để UI đọc (không cho phép sửa từ UI)
// ---------------------------------------------------------------------------
struct FBattleSnapshot
{
	int32 Turn = 1;
	int32 MovesLeft = 0;
	int32 MovesPerTurn = 0;

	// Toàn bộ hàng địch (vẽ được nhiều con / nhiều boss cùng lúc).
	std::vector<FEnemySnapshot> Enemies;
	int32 TargetEnemyIndex = 0;   // mục tiêu đang được ngắm

	// Bản tổng hợp của "trùm chính" - giữ lại để HUD/UI cũ vẫn đọc được.
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
// SỰ KIỆN TRẬN ĐẤU (dòng nhịp để UI phát lại như FF/GBF)
// ---------------------------------------------------------------------------
// Vì sao cần? Ảnh chụp trạng thái chỉ cho biết "kết quả cuối", nên UI chỉ vẽ
// lại một lần -> trông tĩnh. Dòng sự kiện ghi lại TỪNG nhịp xảy ra trong một
// hành động (ai đánh ai, bao nhiêu sát thương, vỡ stagger, ai gục, triệu hồi...)
// để giao diện phát lại lần lượt thành animation.
// Lõi KHÔNG vẽ gì cả: nó chỉ mô tả nhịp, việc diễn hoạ là của lớp UI.
// ---------------------------------------------------------------------------
enum class EBattleEventKind : std::uint8_t
{
	MatchClear = 0,   // đã nối/xoá block (Value = số tầng combo, Amount = số block)
	PartyAttack,      // nhân vật ra đòn (MemberIndex = ai)
	EnemyDamaged,     // địch nhận sát thương (EnemyIndex, Amount)
	PartyDamaged,     // nhân vật nhận sát thương (MemberIndex, Amount)
	Heal,             // hồi máu (MemberIndex, Amount)
	Buff,             // buff/debuff vừa được đặt (Text mô tả)
	EnemyAction,      // địch dùng chiêu (EnemyIndex, Value = EBossAction)
	EnemyBreak,       // thanh stagger vỡ -> địch ngất (EnemyIndex)
	EnemyDefeated,    // địch bị hạ (EnemyIndex)
	EnemySummoned,    // triệu hồi thêm địch (EnemyIndex = con mới)
	Obstacle,         // vật cản / bẫy xuất hiện (Amount = số ô)
	LockCells,        // ô bị phong ấn (Amount = số ô)
	Scramble,         // đảo màu block (Amount = số block)
	Drain,            // hút điểm ultimate (Amount = tổng điểm bị hút)
	Skill,            // nhân vật dùng kỹ năng (MemberIndex)
	Ultimate,         // nhân vật dùng ultimate (MemberIndex, Value = bậc chain)
	Victory,          // thắng trận
	Defeat,           // thua trận
	Count
};

inline const char* BattleEventName(EBattleEventKind Kind)
{
	switch (Kind)
	{
	case EBattleEventKind::MatchClear:    return "NoiBlock";
	case EBattleEventKind::PartyAttack:   return "TanCong";
	case EBattleEventKind::EnemyDamaged:  return "DichAnDon";
	case EBattleEventKind::PartyDamaged:  return "DoiAnDon";
	case EBattleEventKind::Heal:          return "HoiMau";
	case EBattleEventKind::Buff:          return "HieuUng";
	case EBattleEventKind::EnemyAction:   return "DichRaChieu";
	case EBattleEventKind::EnemyBreak:    return "VoStagger";
	case EBattleEventKind::EnemyDefeated: return "HaGuc";
	case EBattleEventKind::EnemySummoned: return "TrieuHoi";
	case EBattleEventKind::Obstacle:      return "VatCan";
	case EBattleEventKind::LockCells:     return "PhongAn";
	case EBattleEventKind::Scramble:      return "DaoMau";
	case EBattleEventKind::Drain:         return "HutUltimate";
	case EBattleEventKind::Skill:         return "KyNang";
	case EBattleEventKind::Ultimate:      return "Ultimate";
	case EBattleEventKind::Victory:       return "Thang";
	case EBattleEventKind::Defeat:        return "Thua";
	default:                              return "?";
	}
}

struct FBattleEvent
{
	EBattleEventKind Kind = EBattleEventKind::MatchClear;
	int32 MemberIndex = -1;   // nhân vật liên quan (nếu có)
	int32 EnemyIndex  = -1;   // địch liên quan (nếu có)
	float Amount = 0.f;       // sát thương / máu hồi / số ô ...
	int32 Value  = 0;         // giá trị phụ: số tầng combo, mã hành động địch, bậc chain...
	bool  bBig   = false;     // đòn lớn -> UI làm nổi bật (rung màn, chữ to)
	std::string Text;         // mô tả ngắn để UI hiện chữ nổi
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
	// Kích hoạt trực tiếp 1 ô đặc biệt tại chỗ (ví dụ double-click bom)
	FActionResult ActivateSpecialCell(const FCell& Cell);
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

	// --- Hàng địch ---
	std::vector<FEnemyState>&       Enemies() { return EnemyList; }
	const std::vector<FEnemyState>& Enemies() const { return EnemyList; }
	int32 EnemyCount() const { return static_cast<int32>(EnemyList.size()); }
	int32 AliveEnemyCount() const;
	bool  IsValidEnemyIndex(int32 Index) const { return Index >= 0 && Index < EnemyCount(); }
	FEnemyState*       TryGetEnemy(int32 Index) { return IsValidEnemyIndex(Index) ? &EnemyList[Index] : nullptr; }
	const FEnemyState* TryGetEnemy(int32 Index) const { return IsValidEnemyIndex(Index) ? &EnemyList[Index] : nullptr; }

	// Mục tiêu đang được ngắm (nước đi / kỹ năng đánh vào đây).
	int32 TargetEnemyIndex() const { return TargetIndex; }
	bool  SetTargetEnemy(int32 Index);      // false nếu index sai / địch đã gục
	// Địch "trùm chính" = boss nếu có, ngược lại địch đầu còn sống.
	int32 PrimaryEnemyIndex() const;

	// Tên cũ giữ tương thích: trả về địch đang được ngắm.
	FEnemyState&       Boss() { return EnemyList[static_cast<size_t>(ClampIndex(TargetIndex))]; }
	const FEnemyState& Boss() const { return EnemyList[static_cast<size_t>(ClampIndex(TargetIndex))]; }

	FPartyEffects&       Effects() { return EffectsState; }
	const FPartyEffects& Effects() const { return EffectsState; }
	const std::vector<FChallenge>& Challenges() const { return ChallengeList; }
	const std::vector<std::string>& LogLines() const { return LogText; }
	const FResolveOutcome& LastResolve() const { return LastOutcome; }
	const FBalance& Balance() const { return Cfg; }
	FBalance& Balance() { return Cfg; }
	const FStageStory& Story() const { return StageStory; }

	// --- Dòng nhịp của HÀNH ĐỘNG VỪA RỒI (UI đọc để phát lại thành animation) ---
	// EventList được xoá và ghi lại mỗi khi người chơi làm 1 hành động.
	const std::vector<FBattleEvent>& Events() const { return EventList; }
	// Tăng thêm 1 sau mỗi hành động -> UI biết có nhịp mới cần diễn hoạ.
	int32 EventSeq() const { return EventSeqCounter; }

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
	std::vector<FEnemyState> EnemyList;   // toàn bộ hàng địch của màn
	int32 TargetIndex = 0;                // mục tiêu đang được ngắm
	FStageStory StageStory;               // story của màn đang chơi
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
	bool  bBasicSkillUsedThisTurn[static_cast<int32>(ERole::Count)] = { false };

	// --- Thống kê ---
	float DamageDealtTotal = 0.f;
	float DamageTakenTotal = 0.f;
	int32 MaxBlocksInSingleMove = 0;
	int32 MaxStarsReached = 0;

	// ---------- Nội bộ ----------
	int32 ClampIndex(int32 Index) const;                 // kẹp index hợp lệ cho EnemyList
	std::string EnemyLineupText() const;                 // "Quái A, Quái B, Boss C" cho log/story
	void  RebuildPartyStats();

	// --- Ghi dòng nhịp ---
	std::vector<FBattleEvent> EventList;   // nhịp của hành động vừa rồi
	int32 EventSeqCounter = 0;             // số hành động đã thực hiện (UI so sánh để phát lại)
	void  BeginAction();                   // xoá dòng nhịp + tăng EventSeqCounter
	void  PushEvent(EBattleEventKind Kind, int32 Member, int32 Enemy,
	                float Amount, const std::string& Text, bool bBig = false, int32 Value = 0);
	// Sát thương lên đội nhưng CÓ ghi nhịp cho từng nhân vật (UI thấy ai bị đánh).
	float DamagePartyAllLogged(float Amount, const std::string& Source);
	float DamagePartyMemberLogged(int32 MemberIndex, float Amount, const std::string& Source);
	// Hồi máu cả đội nhưng CÓ ghi nhịp cho từng nhân vật (UI thấy ai được hồi).
	float HealPartyAllLogged(float Amount, const std::string& Source);
	// Biến kết quả nối thành hiệu ứng cho từng nhân vật.
	void  ApplyMatchEffects(const FResolveOutcome& Outcome);
	float ComputeMatchDamage(int32 AttackerIndex, const FResolveOutcome& Outcome) const;
	float ComputeMageDamage(int32 MageIndex, const FResolveOutcome& Outcome) const;
	void  ApplyMageMatchDebuff(int32 MageIndex, const FResolveOutcome& Outcome);
	float ComputeHealAmount(int32 HealerIndex, const FResolveOutcome& Outcome) const;
	void  ApplySupportEffect(int32 SupporterIndex, const FResolveOutcome& Outcome);

	// Gây sát thương lên MỘT địch (đã tính buff/break/kháng vật lý hoặc phép) + trừ stagger.
	float DealDamageToEnemy(int32 EnemyIndex, float RawDamage, const std::string& SourceName,
	                        EDamageType DamageType = EDamageType::Physical);
	// Gây sát thương lên mục tiêu đang ngắm (đường đi quen thuộc của skill/ultimate).
	float DealDamageToBoss(float RawDamage, const std::string& SourceName, EDamageType DamageType = EDamageType::Physical)
	{
		return DealDamageToEnemy(TargetIndex, RawDamage, SourceName, DamageType);
	}

	// Đảm bảo mục tiêu luôn là 1 địch còn sống (tự chuyển khi mục tiêu gục).
	void  RetargetIfNeeded();

	void  ReduceStagger(int32 EnemyIndex, float Amount, const std::string& SourceName);
	void  CheckStaggerBreak(int32 EnemyIndex);

	// End-turn: Deflecter/Defender, mỗi địch hành động, buff tick, nạp ultimate.
	void  AdvanceTurn(bool bExplicitEarlyEnd);
	void  EnemyTurn();                                   // tất cả địch còn sống lần lượt hành động
	void  EnemyAct(int32 EnemyIndex);                    // 1 địch thực hiện hành động của nó
	void  PlanEnemyIntent(int32 EnemyIndex);             // cập nhật IntentAction cho UI vẽ trước
	void  TickTurnStart();
	void  UpdateChallenges();
	void  CheckBattleEnd();

	int32 FindMemberIndexByRole(ERole Role) const;
	FCharacterState* FindMemberByColor(EColor Color);
};

} // namespace M3
