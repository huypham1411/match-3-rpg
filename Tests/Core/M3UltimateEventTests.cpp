// =============================================================================
//  M3UltimateEventTests.cpp  -  Khoá hành vi "mỗi hành động phải mở dòng nhịp mới"
//  ---------------------------------------------------------------------------
//  Lỗi từng gặp: UseUltimate quên gọi BeginAction() nên EventSeq không tăng.
//  Giao diện (bản web) so sánh EventSeq để biết khi nào cần diễn hoạ, nên ultimate
//  không hề có animation dù lõi vẫn gây sát thương/hồi máu bình thường.
//  Hai test dưới đây khoá lại hành vi đúng cho cả ultimate và kỹ năng.
// =============================================================================
#include "M3TestFramework.h"
#include "M3TestHelpers.h"

using namespace M3;
using namespace M3TestHelpers;

// -----------------------------------------------------------------------------
M3TEST(Ultimate_MoDongNhipMoi_VaCoNhipUltimate)
{
	FBattle Battle;
	Battle.Setup(MakeTestSetup(4, 3131u));

	// Cho nhân vật đầu tiên đầy thanh để dùng được ultimate.
	Battle.Party().Members()[0].UltimateCharge = Battle.Balance().UltimateMaxCharge;

	const int32 SeqBefore = Battle.EventSeq();
	M3REQUIRE(Battle.UseUltimate(0).IsOk());

	M3REQUIRE_GT(Battle.EventSeq(), SeqBefore);   // phải mở dòng nhịp mới
	M3REQUIRE(!Battle.Events().empty());          // và phải có nhịp để UI diễn hoạ

	bool bHasUltimate = false;
	for (const FBattleEvent& E : Battle.Events())
	{
		if (E.Kind == EBattleEventKind::Ultimate) { bHasUltimate = true; }
	}
	M3REQUIRE(bHasUltimate);                       // đúng loại nhịp ultimate
}

// -----------------------------------------------------------------------------
M3TEST(KyNang_MoDongNhipMoi_VaCoNhipSkill)
{
	FBattle Battle;
	Battle.Setup(MakeTestSetup(4, 3132u));

	const int32 SeqBefore = Battle.EventSeq();
	M3REQUIRE(Battle.UseBasicSkill(1).IsOk());    // Supporter: gỡ chướng ngại

	M3REQUIRE_GT(Battle.EventSeq(), SeqBefore);

	bool bHasSkill = false;
	for (const FBattleEvent& E : Battle.Events())
	{
		if (E.Kind == EBattleEventKind::Skill) { bHasSkill = true; }
	}
	M3REQUIRE(bHasSkill);
}
