// =============================================================================
//  M3Balance.h  -  Toàn bộ con số cân bằng của game, gom về MỘT chỗ
//  ---------------------------------------------------------------------------
//  Lý do: bạn muốn kỹ năng "đa dạng nhưng không phá game". Cách an toàn nhất là
//  đừng rải hằng số trong code, hãy để tất cả ở đây rồi chỉnh dần.
//  Trong UE5, bạn có thể sửa các số này lúc runtime qua M3::FBalance.
// =============================================================================
#pragma once

#include "M3Types.h"

namespace M3
{

struct FBalance
{
	// ------------------------- Bàn nối -------------------------
	int32 BoardWidth  = 8;
	int32 BoardHeight = 8;
	int32 NumColors   = 6;    // số màu xuất hiện trên bàn (<= kNumColors)
	int32 StartObstacles = 3; // số vật cản boss đặt ngay khi trận bắt đầu

	// Số lượt match người chơi được làm trước khi boss hành động.
	int32 MovesPerTurn = 4;

	// Sát thương cơ bản của 1 block trigger (nhân với Atk của attacker).
	float DamagePerBlock        = 0.14f;
	// Mỗi cascade (đổ xuống rồi nối tiếp) tăng thêm hệ số combo.
	float ComboBonusPerCascade  = 0.20f;
	float MaxComboMultiplier    = 3.0f;

	// Hồi máu của Healer: heal = HealerAtk * HealPerBlock * HealExpBase^(blocks-3)
	// => "cấp số nhân theo số block trigger" như thiết kế.
	float HealPerBlock = 0.20f;
	float HealExpBase  = 1.55f;
	float HealMaxMultiplier = 12.f;   // chặn trên để không phá game

	// Supporter: mỗi stack buff/debuff cộng thêm bao nhiêu.
	float BuffAtkPerStack     = 0.05f;   // +5% sát thương match
	float BuffStaggerPerStack = 0.07f;   // +7% stagger gây lên boss
	float BuffTurnsPerStack   = 0.5f;    // +0.5 turn cho mỗi stack (làm tròn)
	int32 BuffMaxStacks       = 20;

	// Sát thương lên boss giảm bao nhiêu khi stagger còn (chưa vỡ).
	float DamageToBossBase = 1.0f;

	// ------------------------- Stagger / BREAK -------------------------
	// Mỗi 1 sát thương gây lên boss làm giảm bao nhiêu stagger (nhân thêm hệ số buff).
	float StaggerPerDamage       = 0.35f;
	float BossStaggerRate        = 1.0f;  // debuff supporter làm tăng hệ số này
	int32 BreakDurationTurns     = 2;     // vỡ stagger kéo dài bao nhiêu turn boss bị ngất
	float BreakDamageMultiplier  = 1.5f;  // sát thương khi boss đang BREAK
	float CounterDamageMultiplier = 2.0f; // Counter đánh thêm khi boss vỡ stagger

	// Deflecter: cần bao nhiêu lần match-4 (ô vuông / hàng 4) để nổ cuối turn.
	int32 DeflectStacksRequired  = 4;
	// Khi nổ: gây thêm bao nhiêu % stagger tối đa của boss.
	float DeflectStaggerPercent  = 0.25f;

	// ------------------------- Lượt của boss -------------------------
	float BossAoeDamage             = 120.f;  // sát thương AoE lên cả đội
	int32 BossObstaclesPerAction    = 2;      // số vật cản boss đặt mỗi lần
	float BossWeakenTurns           = 2.f;    // debuff giảm sát thương người chơi
	float DefenderDamageReduction   = 0.5f;   // Defender: giảm 50% sát thương AoE
	int32 DefenderShieldTurns       = 1;

	// ------------------------- Ultimate -------------------------
	int32 UltimateMaxCharge        = 100;
	int32 UltimateChargePerTurn    = 12;   // nạp đều mỗi turn
	int32 UltimateChargePerBlock   = 3;    // + mỗi block đúng màu của nhân vật
	float UltimateChainStep        = 0.25f;// ultimate thứ 2 trong turn: +25% sát thương...
	float FullBurstBonus           = 1.5f; // dùng hết ultimate của cả đội trong 1 turn
	float UltimateAttackerPower    = 3.0f; // hệ số Atk cho ultimate của attacker
	float UltimateHealPercent      = 0.55f;// hồi % máu tối đa toàn đội
	float UltimateStaggerPercent   = 0.30f;// phá % stagger tối đa boss
	int32 UltimateObstaclePurge    = 3;    // gỡ bao nhiêu vật cản

	// ------------------------- Đánh giá sao -------------------------
	int32 MinStars = 1;
	int32 MaxStars = 3;
	int32 ClearAllObstaclesStarValue = 1;
	int32 WinWithinTurnsStarValue    = 1;
	int32 NoMemberDownedStarValue    = 1;

	// ------------------------- Kỹ năng chủ động (bấm tay) -------------------------
	int32 BasicSkillCooldownTurns = 3;   // số turn hồi chiêu mặc định

	static FBalance Default() { return FBalance(); }
};

} // namespace M3
