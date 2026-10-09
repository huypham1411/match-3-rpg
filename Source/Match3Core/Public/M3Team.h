// =============================================================================
//  M3Team.h  -  Nhân vật, trang bị, pet và đội hình (gacha-ready)
//  ---------------------------------------------------------------------------
//  Thiết kế:
//    - Mỗi nhân vật có 1 role (xem ERole) và 1 màu block (trừ Defender/Counter/
//      Deflecter - ba role này không có block, kích hoạt bằng điều kiện riêng).
//    - Đội hình tối đa 6 người, mỗi người 3 slot trang bị, 1 slot pet (mở sau).
//    - Trang bị chỉ cộng chỉ số + hiệu ứng hệ (element) -> dễ mở rộng về sau.
// =============================================================================
#pragma once

#include "M3Balance.h"
#include "M3Types.h"

namespace M3
{

// ---------------------------------------------------------------------------
// Trang bị
// ---------------------------------------------------------------------------
struct FEquipment
{
	std::string Id   = "equip.none";
	std::string Name = "Trống";
	EElement    Element = EElement::None;
	float       AtkBonus = 0.f;              // cộng thẳng vào Atk
	float       HpBonus  = 0.f;              // cộng thẳng vào HpMax
	float       ElementDamageBonus = 0.f;    // +% sát thương khi match đúng màu của nhân vật
	float       StaggerBonus = 0.f;          // +% stagger gây lên boss
	int32       UnlockTier = 1;              // dùng cho gacha/mở khoá về sau
};

// ---------------------------------------------------------------------------
// Định nghĩa tĩnh của nhân vật (giống dữ liệu trong Data Asset)
// ---------------------------------------------------------------------------
struct FCharacterDef
{
	std::string Id   = "char.unknown";
	std::string Name = "Nhân vật";
	ERole       Role  = ERole::Attacker;
	EDamageType DamageType = EDamageType::Physical; // Sát thương Vật lý hoặc Ma pháp
	EColor      MatchColor = EColor::Red;   // màu block kích hoạt; role không có block thì để None
	EElement    Element = EElement::None;

	float BaseAtk = 100.f;
	float BaseHp  = 1200.f;

	std::string BasicSkillName = "Kỹ năng 1";
	std::string BasicSkillDesc = "";
	std::string UltimateName   = "Ultimate";
	std::string UltimateDesc   = "";
};


// ---------------------------------------------------------------------------
// Trạng thái động của nhân vật trong trận
// ---------------------------------------------------------------------------
struct FCharacterState
{
	FCharacterDef Def;

	float Hp    = 0.f;
	float HpMax = 0.f;
	float Atk   = 0.f;

	int32 UltimateCharge = 0;
	int32 BasicCooldown  = 0;   // > 0 nghĩa là đang hồi chiêu
	bool  bAlive         = true;

	std::vector<FEquipment> Equipment;   // tối đa kMaxEquipmentPerMember
	bool        bPetUnlocked = false;
	std::string PetId = "";
	float       PetBonusAtk = 0.f;

	int32 DeflectStacks = 0;   // riêng cho Deflecter (0..DeflectStacksRequired)

	// Cột nâng cấp kỹ năng kiểu Wuthering Waves (WuWa skill tree nodes)
	int32 NodeComboLevel    = 0;  // Level 0..5 (+5% hiệu suất combo per level)
	int32 NodeStatLevel     = 0;  // Level 0..5 (+10% chỉ số Atk/Hp base per level)
	int32 NodeUltimateLevel = 0;  // Level 0..5 (+15% sát thương Ultimate per level)

	bool UnlockSkillNode(int32 NodeIndex)
	{
		if (NodeIndex == 0 && NodeComboLevel < 5) { NodeComboLevel++; return true; }
		if (NodeIndex == 1 && NodeStatLevel < 5)  { NodeStatLevel++; return true; }
		if (NodeIndex == 2 && NodeUltimateLevel < 5) { NodeUltimateLevel++; return true; }
		return false;
	}

	bool HasBlock() const
	{
		return Def.MatchColor != EColor::None && Def.Role != ERole::Defender
			&& Def.Role != ERole::Counter && Def.Role != ERole::Deflecter;
	}

	float HpPercent() const { return HpMax > 0.f ? Hp / HpMax : 0.f; }
	bool IsUltimateReady() const { return UltimateCharge >= FBalance().UltimateMaxCharge; }
	bool CanUseBasic(int32 BalanceCooldown) const { return bAlive && BasicCooldown <= 0; }
};

// ---------------------------------------------------------------------------
// Đội hình
// ---------------------------------------------------------------------------
class MATCH3CORE_API FParty
{
public:
	static constexpr int32 kMaxMembers = 6;
	static constexpr int32 kMaxEquipmentPerMember = 3;

	bool AddCharacter(const FCharacterDef& Def);              // false nếu đội đã đủ 6
	bool Equip(int32 MemberIndex, const FEquipment& Equip);    // false nếu đủ 3 slot / index sai
	bool Unequip(int32 MemberIndex, int32 EquipIndex);
	bool UnlockPet(int32 MemberIndex, const std::string& PetId, float BonusAtk);

	// Tính lại Atk/HpMax từ base + trang bị + pet (gọi sau khi Setup / đổi trang bị).
	void RecomputeStats(const FBalance& Balance);

	std::vector<FCharacterState>&       Members() { return Roster; }
	const std::vector<FCharacterState>& Members() const { return Roster; }
	int32 MemberCount() const { return static_cast<int32>(Roster.size()); }
	bool  IsValidIndex(int32 Index) const { return Index >= 0 && Index < MemberCount(); }

	FCharacterState*       TryGet(int32 Index) { return IsValidIndex(Index) ? &Roster[Index] : nullptr; }
	const FCharacterState* TryGet(int32 Index) const { return IsValidIndex(Index) ? &Roster[Index] : nullptr; }

	// Tìm nhân vật theo màu block (mỗi màu chỉ nên có 1 nhân vật).
	FCharacterState* FindByColor(EColor Color);
	// Tìm nhân vật còn sống đầu tiên theo role (Counter/Deflecter/Defender dùng nhiều người).
	std::vector<FCharacterState*> FindAllByRole(ERole Role);

	std::vector<int32> AliveIndices() const;
	int32 AliveCount() const;
	bool  AllDead() const { return AliveCount() == 0; }
	float TotalHp() const;
	float TotalHpMax() const;

	// Hồi máu / hồi sinh / gây sát thương. Trả về lượng máu thực sự hồi hoặc sát thương thực tế.
	float HealAll(float Amount);
	float HealMember(int32 Index, float Amount);
	bool  ReviveMember(int32 Index, float HpPercent = 0.5f);
	float DamageAll(float Amount);       // Amount đã nhân hệ số giảm sát thương từ trước
	float DamageMember(int32 Index, float Amount);

private:
	std::vector<FCharacterState> Roster;
};

// ---------------------------------------------------------------------------
// Hiệu ứng đội (buff/debuff) - Supporter sinh ra, tick mỗi turn
// ---------------------------------------------------------------------------
struct FTeamBuff
{
	std::string Id     = "buff";
	std::string Source = "";       // tên nhân vật / kỹ năng sinh ra buff
	int32 Stacks = 1;

	float AtkPerStack     = 0.f;   // mỗi stack cộng bao nhiêu % sát thương
	float StaggerPerStack = 0.f;   // mỗi stack cộng bao nhiêu % stagger
	float DamageTakenPerStack = 0.f; // mỗi stack GIẢM bao nhiêu % sát thương nhận (âm = giảm)
	int32 TurnsLeft = 1;           // còn hiệu lực bao nhiêu turn
	bool  bDebuffOnBoss = false;   // true = đây là debuff đặt lên boss
	bool  bBlocksObstacles = false;// true = chặn boss đặt vật cản lên bàn trong lúc hiệu lực
	int32 CoveredMemberIndex = -1; // -1 = bảo vệ toàn team, >= 0 = chỉ định bảo vệ 1 nhân vật
};

struct MATCH3CORE_API FPartyEffects
{
	std::vector<FTeamBuff> Buffs;

	void Clear() { Buffs.clear(); }

	// Thêm buff: nếu đã có cùng Id thì cộng stack (giới hạn MaxStacks) và làm mới turn.
	void AddStack(const FTeamBuff& Buff, int32 MaxStacks);

	float AtkMultiplier() const;
	float StaggerMultiplier() const;
	float DamageTakenMultiplier() const;   // giá trị < 1 = được giảm sát thương
	int32 TotalStacks() const;

	// Có hiệu ứng nào đang chặn boss tạo vật cản không (Hộ thuẫn của Healer).
	bool BlocksObstacleSpawn() const;

	void TickTurn();   // giảm TurnsLeft, xoá buff hết hạn

	std::string DebugText() const;
};

} // namespace M3
