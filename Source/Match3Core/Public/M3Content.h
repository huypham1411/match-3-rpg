// =============================================================================
//  M3Content.h  -  Nội dung mẫu: nhân vật, trang bị, challenge, map
//  ---------------------------------------------------------------------------
//  Đây là "database tạm" bằng C++ để game chạy được ngay khi mở project.
//  Về sau bạn thay bằng Data Asset / JSON của UE mà không cần sửa gameplay:
//  chỉ cần dựng FCharacterDef / FBattleSetup tương ứng.
// =============================================================================
#pragma once

#include "M3Battle.h"
#include "M3Team.h"

namespace M3
{

struct MATCH3CORE_API FContentLibrary
{
	// 4 nhân vật khởi đầu: attacker / supporter / healer / defender (defender không block).
	static std::vector<FCharacterDef> StarterCharacters();
	// 2 nhân vật mở rộng: counter (chỉ ra tay khi boss BREAK), deflecter (tích match-4).
	static std::vector<FCharacterDef> ExtraCharacters();
	static std::vector<FCharacterDef> AllCharacters();

	// --- Kẻ địch ---
	// Quái thường (tier Normal): xuất hiện theo nhóm, máu thấp, tác động bàn nhẹ.
	static std::vector<FEnemyDef> MinionEnemies();
	// Quái tinh anh (tier Elite): máu trung bình, có chiêu khoá ô / gài bẫy.
	static std::vector<FEnemyDef> EliteEnemies();
	// Trùm giữa màn (tier MidBoss): nhiều phase, tác động bàn mạnh.
	static std::vector<FEnemyDef> MidBossEnemies();
	// Trùm cuối (tier Boss): đủ bộ chiêu, có nạp tuyệt kĩ.
	static std::vector<FEnemyDef> BossEnemies();
	// Tra một địch mẫu theo Id.
	static FEnemyDef FindEnemy(const std::string& Id);
	// Toàn bộ địch mẫu.
	static std::vector<FEnemyDef> AllEnemies();

	// --- Story ---
	// Danh sách chương (mỗi chương là một nhóm màn) - bạn điền tiếp khi viết story.
	static std::vector<FStageStory> StoryChapters();

	// Trang bị khởi đầu (3 món mỗi nhân vật) - nền tảng cho hệ gacha về sau.
	static std::vector<FEquipment> StarterEquipment();
	// Challenge mẫu -> quyết định số sao khi qua ải.
	static std::vector<FChallenge> StarterChallenges();

	// Trận mặc định cho demo/test.
	//   TeamSize 4 = đội cơ bản; 5/6 = thêm Counter và Deflecter.
	static FBattleSetup DefaultBattleSetup(int32 TeamSize = 4, uint32 Seed = 20261008u);

	// Vài map mẫu tăng dần độ khó (mỗi màn có thể gồm nhiều địch).
	static std::vector<FBattleSetup> CampaignStages(uint32 Seed = 20261008u);
};

} // namespace M3
