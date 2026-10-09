// =============================================================================
//  M3Team.cpp  -  Cài đặt nhân vật / trang bị / hiệu ứng đội
// =============================================================================
#include "M3Team.h"

namespace M3
{

// -----------------------------------------------------------------------------
// FParty
// -----------------------------------------------------------------------------
bool FParty::AddCharacter(const FCharacterDef& Def)
{
	if (MemberCount() >= kMaxMembers) { return false; }

	FCharacterState State;
	State.Def   = Def;
	State.Hp    = Def.BaseHp;
	State.HpMax = Def.BaseHp;
	State.Atk   = Def.BaseAtk;
	Roster.push_back(State);
	return true;
}

bool FParty::Equip(int32 MemberIndex, const FEquipment& Equip)
{
	FCharacterState* M = TryGet(MemberIndex);
	if (!M) { return false; }
	if (static_cast<int32>(M->Equipment.size()) >= kMaxEquipmentPerMember) { return false; }

	M->Equipment.push_back(Equip);
	return true;
}

bool FParty::Unequip(int32 MemberIndex, int32 EquipIndex)
{
	FCharacterState* M = TryGet(MemberIndex);
	if (!M) { return false; }
	if (EquipIndex < 0 || EquipIndex >= static_cast<int32>(M->Equipment.size())) { return false; }

	M->Equipment.erase(M->Equipment.begin() + EquipIndex);
	return true;
}

bool FParty::UnlockPet(int32 MemberIndex, const std::string& PetId, float BonusAtk)
{
	FCharacterState* M = TryGet(MemberIndex);
	if (!M) { return false; }

	M->bPetUnlocked = true;
	M->PetId = PetId;
	M->PetBonusAtk = BonusAtk;
	return true;
}

void FParty::RecomputeStats(const FBalance& Balance)
{
	for (FCharacterState& M : Roster)
	{
		float AtkBonus = 0.f;
		float HpBonus  = 0.f;

		for (const FEquipment& E : M.Equipment)
		{
			float CurrentAtkBonus = E.AtkBonus;
			float CurrentHpBonus  = E.HpBonus;

			// Đồng thuộc tính giữa Trang bị và Nhân vật -> cộng thêm 50% hiệu quả!
			if (E.Element != EElement::None && E.Element == M.Def.Element)
			{
				CurrentAtkBonus *= 1.5f;
				CurrentHpBonus  *= 1.5f;
			}
			AtkBonus += CurrentAtkBonus;
			HpBonus  += CurrentHpBonus;
		}
		if (M.bPetUnlocked) { AtkBonus += M.PetBonusAtk; }

		const float HpRatio = (M.HpMax > 0.f) ? (M.Hp / M.HpMax) : 1.f;

		// Skill Tree NodeStatLevel: +10% Atk/Hp base mỗi cấp
		const float StatMult = 1.0f + M.NodeStatLevel * 0.10f;
		M.Atk   = (M.Def.BaseAtk * StatMult) + AtkBonus;
		M.HpMax = (M.Def.BaseHp * StatMult) + HpBonus;
		M.Hp    = M.HpMax * HpRatio;   // giữ nguyên % máu khi đổi trang bị
		if (M.Hp <= 0.f) { M.Hp = 1.f; M.bAlive = true; }

		if (M.UltimateCharge > Balance.UltimateMaxCharge) { M.UltimateCharge = Balance.UltimateMaxCharge; }
	}
}

FCharacterState* FParty::FindByColor(EColor Color)
{
	for (FCharacterState& M : Roster)
	{
		if (M.Def.MatchColor == Color && Color != EColor::None) { return &M; }
	}
	return nullptr;
}

std::vector<FCharacterState*> FParty::FindAllByRole(ERole Role)
{
	std::vector<FCharacterState*> Out;
	for (FCharacterState& M : Roster)
	{
		if (M.Def.Role == Role && M.bAlive) { Out.push_back(&M); }
	}
	return Out;
}

std::vector<int32> FParty::AliveIndices() const
{
	std::vector<int32> Out;
	for (int32 i = 0; i < MemberCount(); ++i)
	{
		if (Roster[static_cast<size_t>(i)].bAlive) { Out.push_back(i); }
	}
	return Out;
}

int32 FParty::AliveCount() const
{
	int32 Count = 0;
	for (const FCharacterState& M : Roster) { if (M.bAlive) { ++Count; } }
	return Count;
}

float FParty::TotalHp() const
{
	float Sum = 0.f;
	for (const FCharacterState& M : Roster) { Sum += std::max(0.f, M.Hp); }
	return Sum;
}

float FParty::TotalHpMax() const
{
	float Sum = 0.f;
	for (const FCharacterState& M : Roster) { Sum += M.HpMax; }
	return Sum;
}

float FParty::HealAll(float Amount)
{
	float Done = 0.f;
	for (int32 i = 0; i < MemberCount(); ++i) { Done += HealMember(i, Amount); }
	return Done;
}

float FParty::HealMember(int32 Index, float Amount)
{
	FCharacterState* M = TryGet(Index);
	if (!M || !M->bAlive) { return 0.f; }

	const float Before = M->Hp;
	M->Hp = std::min(M->HpMax, M->Hp + Amount);
	return M->Hp - Before;
}

bool FParty::ReviveMember(int32 Index, float HpPercent)
{
	FCharacterState* M = TryGet(Index);
	if (!M || M->bAlive) { return false; }

	M->bAlive = true;
	M->Hp = std::max(1.f, M->HpMax * std::min(1.0f, std::max(0.1f, HpPercent)));
	return true;
}

float FParty::DamageAll(float Amount)
{
	float Done = 0.f;
	for (int32 i = 0; i < MemberCount(); ++i) { Done += DamageMember(i, Amount); }
	return Done;
}

float FParty::DamageMember(int32 Index, float Amount)
{
	FCharacterState* M = TryGet(Index);
	if (!M || !M->bAlive || Amount <= 0.f) { return 0.f; }

	const float Before = M->Hp;
	M->Hp = std::max(0.f, M->Hp - Amount);
	if (M->Hp <= 0.f)
	{
		M->Hp = 0.f;
		M->bAlive = false;   // gục: role này ngừng kích hoạt
	}
	return Before - M->Hp;
}

// -----------------------------------------------------------------------------
// FPartyEffects
// -----------------------------------------------------------------------------
void FPartyEffects::AddStack(const FTeamBuff& Buff, int32 MaxStacks)
{
	for (FTeamBuff& Existing : Buffs)
	{
		if (Existing.Id == Buff.Id)
		{
			Existing.Stacks = std::min(MaxStacks, Existing.Stacks + Buff.Stacks);
			Existing.TurnsLeft = std::max(Existing.TurnsLeft, Buff.TurnsLeft);
			return;
		}
	}
	FTeamBuff NewBuff = Buff;
	NewBuff.Stacks = std::min(MaxStacks, NewBuff.Stacks);
	Buffs.push_back(NewBuff);
}

float FPartyEffects::AtkMultiplier() const
{
	float Mul = 1.f;
	for (const FTeamBuff& B : Buffs)
	{
		Mul *= (1.f + B.AtkPerStack * static_cast<float>(B.Stacks));
	}
	return Mul;
}

float FPartyEffects::StaggerMultiplier() const
{
	float Mul = 1.f;
	for (const FTeamBuff& B : Buffs)
	{
		Mul *= (1.f + B.StaggerPerStack * static_cast<float>(B.Stacks));
	}
	return Mul;
}

float FPartyEffects::DamageTakenMultiplier() const
{
	// Bắt đầu từ 1.0 (nhận 100% sát thương); buff giảm sát thương sẽ nhân xuống.
	float Mul = 1.f;
	for (const FTeamBuff& B : Buffs)
	{
		Mul *= (1.f - B.DamageTakenPerStack * static_cast<float>(B.Stacks));
	}
	return std::max(0.f, Mul);
}

int32 FPartyEffects::TotalStacks() const
{
	int32 Sum = 0;
	for (const FTeamBuff& B : Buffs) { Sum += B.Stacks; }
	return Sum;
}

bool FPartyEffects::BlocksObstacleSpawn() const
{
	for (const FTeamBuff& B : Buffs)
	{
		if (B.bBlocksObstacles && B.TurnsLeft > 0) { return true; }
	}
	return false;
}

void FPartyEffects::TickTurn()
{
	for (FTeamBuff& B : Buffs) { B.TurnsLeft -= 1; }
	Buffs.erase(
		std::remove_if(Buffs.begin(), Buffs.end(), [](const FTeamBuff& B) { return B.TurnsLeft <= 0; }),
		Buffs.end());
}

std::string FPartyEffects::DebugText() const
{
	if (Buffs.empty()) { return "Không có hiệu ứng"; }

	std::string Out;
	for (const FTeamBuff& B : Buffs)
	{
		if (!Out.empty()) { Out += ", "; }
		Out += B.Id + " x" + ToText(B.Stacks) + " (" + ToText(B.TurnsLeft) + " turn)";
	}
	return Out;
}

} // namespace M3
