// =============================================================================
//  M3Types.h  -  Kiểu dữ liệu cơ bản của lõi game (không phụ thuộc Unreal Engine)
//  ---------------------------------------------------------------------------
//  File này KHÔNG dùng API nào của UE (không UObject, không FString, không TArray)
//  nên toàn bộ luật chơi có thể biên dịch + test độc lập bằng cl.exe.
//  Unicode trong comment là tiếng Việt; nếu cl.exe kêu warning C4819 thì thêm
//  tuỳ chọn /utf-8 (đã có sẵn trong Tests/Core/build_and_run.bat).
// =============================================================================
#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <string>
#include <vector>

// -----------------------------------------------------------------------------
// MATCH3CORE_API: macro xuất khẩu ký hiệu ra DLL khi build trong UE.
//
// Vì sao phải tự định nghĩa? UnrealBuildTool định nghĩa MATCH3CORE_API=DLLEXPORT,
// nhưng macro DLLEXPORT chỉ tồn tại sau khi include header nền tảng của engine.
// Module lõi cố tình KHÔNG include header nào của engine, nên ở đây tự lo:
//   - M3CORE_BUILDING_DLL: chỉ được đặt khi biên dịch chính module Match3Core
//     (xem PrivateDefinitions trong Match3Core.Build.cs) -> dllexport.
//   - Module khác dùng lõi -> dllimport.
//   - Build bằng cl.exe thuần (bộ test lõi) -> macro trống, không ảnh hưởng gì.
// -----------------------------------------------------------------------------
#if defined(M3_WITH_UE)
	#undef MATCH3CORE_API
	#if defined(_MSC_VER)
		#if defined(M3CORE_BUILDING_DLL)
			#define MATCH3CORE_API __declspec(dllexport)
		#else
			#define MATCH3CORE_API __declspec(dllimport)
		#endif
	#else
		#define MATCH3CORE_API __attribute__((visibility("default")))
	#endif
#else
	#define MATCH3CORE_API
#endif

namespace M3
{
using int32 = std::int32_t;
using uint32 = std::uint32_t;

// -----------------------------------------------------------------------------
// Màu block
// -----------------------------------------------------------------------------
// Mỗi màu là một "kênh nối". Nhân vật được gán 1 màu; khi bạn nối các block cùng
// màu đó, hiệu ứng của nhân vật tương ứng sẽ kích hoạt:
//   màu của Attacker -> sát thương boss
//   màu của Supporter -> buff/debuff
//   màu của Healer   -> hồi máu
//   Defender / Deflecter / Counter: KHÔNG có block (kích hoạt bằng điều kiện riêng)
enum class EColor : std::uint8_t
{
	None = 0,
	Red,
	Blue,
	Green,
	Yellow,
	Purple,
	Cyan,
	Count
};

inline constexpr int32 kNumColors = 6;

inline bool  IsValidColor(EColor C) { return C >= EColor::Red && C < EColor::Count; }
inline int32 ColorIndex(EColor C) { return IsValidColor(C) ? static_cast<int32>(C) - 1 : -1; }
inline EColor ColorFromIndex(int32 Index)
{
	return (Index >= 0 && Index < kNumColors) ? static_cast<EColor>(Index + 1) : EColor::None;
}

inline const char* ColorName(EColor C)
{
	switch (C)
	{
	case EColor::Red:    return "Đỏ";
	case EColor::Blue:   return "Xanh dương";
	case EColor::Green:  return "Xanh lá";
	case EColor::Yellow: return "Vàng";
	case EColor::Purple: return "Tím";
	case EColor::Cyan:   return "Cyan";
	default:             return "Không màu";
	}
}

// Ký tự dùng cho FromAscii()/ToAscii() - tiện cho test và debug bằng mắt.
inline char ColorChar(EColor C)
{
	switch (C)
	{
	case EColor::Red:    return 'R';
	case EColor::Blue:   return 'B';
	case EColor::Green:  return 'G';
	case EColor::Yellow: return 'Y';
	case EColor::Purple: return 'P';
	case EColor::Cyan:   return 'C';
	default:             return '.';
	}
}

inline EColor ColorFromChar(char Ch)
{
	switch (Ch)
	{
	case 'R': case 'r': return EColor::Red;
	case 'B': case 'b': return EColor::Blue;
	case 'G': case 'g': return EColor::Green;
	case 'Y': case 'y': return EColor::Yellow;
	case 'P': case 'p': return EColor::Purple;
	case 'C': case 'c': return EColor::Cyan;
	default:            return EColor::None;
	}
}

// -----------------------------------------------------------------------------
// Loại block
// -----------------------------------------------------------------------------
enum class EBlockKind : std::uint8_t
{
	Normal = 0,   // block thường (màu + nối được)
	Obstacle,     // vật cản do boss tạo: KHÔNG nối được, cần kỹ năng / match-4 vuông để gỡ
	LineClear,    // special từ match-4 hàng/cột: nổ cả hàng (Variant 0) hoặc cả cột (Variant 1)
	SquareBomb,   // special từ match-4 VUÔNG: tự động bay tìm vật cản/bẫy để phá hủy
	ColorBomb,    // special từ match-5 thẳng hàng: đổi chỗ với 1 block -> kích hoạt TOÀN BỘ block cùng màu
	CountTrap,    // bẫy đếm ngược do boss đặt: mỗi turn giảm 1 số, về 0 nổ gây sát thương/debuff
	AreaBomb,     // special từ combo 5 KHÔNG thẳng hàng (L/T-shape): nổ diện rộng 2x2/3x3
	Count
};

inline const char* BlockKindName(EBlockKind K)
{
	switch (K)
	{
	case EBlockKind::Normal:     return "Block thường";
	case EBlockKind::Obstacle:   return "Vật cản (Boss)";
	case EBlockKind::LineClear:  return "Tia sét hàng/cột (Phe ta)";
	case EBlockKind::SquareBomb: return "Tên lửa tìm mục tiêu (Phe ta)";
	case EBlockKind::ColorBomb:  return "Cầu vồng toàn năng (Phe ta)";
	case EBlockKind::CountTrap:  return "Bẫy đếm ngược (Boss)";
	case EBlockKind::AreaBomb:   return "Bom nổ khối 3x3 (Phe ta)";
	default:                     return "?";
	}
}


// -----------------------------------------------------------------------------
// Loại sát thương
// -----------------------------------------------------------------------------
enum class EDamageType : std::uint8_t
{
	Physical = 0, // Sát thương vật lý
	Magic,        // Sát thương ma pháp
	Count
};

inline const char* DamageTypeName(EDamageType T)
{
	switch (T)
	{
	case EDamageType::Physical: return "Vật lý";
	case EDamageType::Magic:    return "Ma pháp";
	default:                    return "Chuẩn";
	}
}

// -----------------------------------------------------------------------------
// Vai trò nhân vật
// -----------------------------------------------------------------------------
enum class ERole : std::uint8_t
{
	Attacker = 0,  // nối màu của Attacker -> sát thương boss (vật lý hoặc ma pháp)
	Supporter,     // -> buff cho đội / debuff boss (tăng stagger nhận vào)
	Healer,        // -> hồi máu (tăng theo cấp số nhân khi nhiều block)
	Defender,      // không có block: nếu bạn kết thúc turn mà không làm gì -> giảm sát thương boss gây ra
	Counter,       // không có block: chỉ kích hoạt khi thanh stagger của boss VỠ (BREAK)
	Deflecter,     // không có block: tích 4 lần "match-4" -> cuối turn làm vỡ stagger nhanh hơn
	Mage,          // Ma pháp sĩ: nối màu Mage -> sát thương Ma Pháp + đặt debuff Suy Yếu Ma Pháp lên boss
	Count
};

inline int32 RoleIndex(ERole R) { return static_cast<int32>(R); }

inline const char* RoleName(ERole R)
{
	switch (R)
	{
	case ERole::Attacker:  return "Attacker";
	case ERole::Supporter: return "Supporter";
	case ERole::Healer:    return "Healer";
	case ERole::Defender:  return "Defender";
	case ERole::Counter:   return "Counter";
	case ERole::Deflecter: return "Deflecter";
	case ERole::Mage:      return "Mage";
	default:               return "?";
	}
}


// -----------------------------------------------------------------------------
// Cấp bậc kẻ địch (dùng cho story, cân bằng và bố cục UI)
// -----------------------------------------------------------------------------
//   Normal   : quái thường, xuất hiện theo nhóm đông
//   Elite    : quái tinh anh, chỉ số cao hơn + có thêm chiêu tác động bàn
//   MidBoss  : trùm giữa màn, nhiều phase, khoá ô / đảo bàn
//   Boss     : trùm cuối màn, đủ bộ chiêu + nạp tuyệt kĩ
enum class EEnemyTier : std::uint8_t
{
	Normal = 0,
	Elite,
	MidBoss,
	Boss,
	Count
};

inline const char* EnemyTierName(EEnemyTier Tier)
{
	switch (Tier)
	{
	case EEnemyTier::Normal:  return "Quái thường";
	case EEnemyTier::Elite:   return "Quái tinh anh";
	case EEnemyTier::MidBoss: return "Trùm giữa màn";
	case EEnemyTier::Boss:    return "Trùm cuối màn";
	default:                  return "?";
	}
}

inline const char* EnemyTierKey(EEnemyTier Tier)
{
	switch (Tier)
	{
	case EEnemyTier::Normal:  return "normal";
	case EEnemyTier::Elite:   return "elite";
	case EEnemyTier::MidBoss: return "midboss";
	case EEnemyTier::Boss:    return "boss";
	default:                  return "normal";
	}
}

// Hệ số chỉ số theo cấp bậc: Normal = 1.0, càng cao càng trâu.
inline float EnemyTierStatMultiplier(EEnemyTier Tier)
{
	switch (Tier)
	{
	case EEnemyTier::Normal:  return 1.00f;
	case EEnemyTier::Elite:   return 1.55f;
	case EEnemyTier::MidBoss: return 2.40f;
	case EEnemyTier::Boss:    return 3.50f;
	default:                  return 1.00f;
	}
}

// Địch cấp cao có thanh stagger (dễ "phá chiêu"); quái thường thì không.
inline bool EnemyTierHasStagger(EEnemyTier Tier)
{
	return Tier == EEnemyTier::MidBoss || Tier == EEnemyTier::Boss;
}


// -----------------------------------------------------------------------------
// Hệ / thuộc tính (dùng cho trang bị: gây thêm sát thương theo hệ)
// -----------------------------------------------------------------------------
enum class EElement : std::uint8_t
{
	None = 0, Fire, Water, Thunder, Light, Dark, Count
};

inline const char* ElementName(EElement E)
{
	switch (E)
	{
	case EElement::Fire:    return "Hỏa";
	case EElement::Water:   return "Thủy";
	case EElement::Thunder: return "Lôi";
	case EElement::Light:   return "Quang";
	case EElement::Dark:    return "Ám";
	default:                return "Không hệ";
	}
}

// -----------------------------------------------------------------------------
// Toạ độ ô trên bàn
// -----------------------------------------------------------------------------
struct FCell
{
	int32 X = 0;
	int32 Y = 0;   // Y = 0 là hàng TRÊN cùng, tăng dần xuống dưới (giống mảng 2 chiều)
};

inline bool operator==(const FCell& A, const FCell& B) { return A.X == B.X && A.Y == B.Y; }
inline bool operator!=(const FCell& A, const FCell& B) { return !(A == B); }
inline FCell MakeCell(int32 X, int32 Y) { FCell C; C.X = X; C.Y = Y; return C; }
inline int32 ManhattanDistance(const FCell& A, const FCell& B)
{
	return std::abs(A.X - B.X) + std::abs(A.Y - B.Y);
}

// -----------------------------------------------------------------------------
// Một ô trên bàn
// -----------------------------------------------------------------------------
struct FBlock
{
	EColor      Color   = EColor::None;
	EBlockKind  Kind    = EBlockKind::Normal;
	int32       Charges = 1;    // Obstacle: số lần phải phá; special: số ô nó phá được
	int32       Variant = 0;    // LineClear: 0 = hàng ngang, 1 = cột dọc
	bool        bLocked = false;// block bị khoá: không swap được (địch có thể khoá)
	int32       LockTurns = 0;  // số turn còn bị khoá (0 = không khoá); giảm mỗi turn

	bool IsEmpty() const { return Kind == EBlockKind::Normal && Color == EColor::None; }
	bool IsObstacle() const { return Kind == EBlockKind::Obstacle; }
	bool IsSpecial() const
	{
		return Kind == EBlockKind::LineClear || Kind == EBlockKind::SquareBomb
			|| Kind == EBlockKind::ColorBomb || Kind == EBlockKind::AreaBomb;
	}

	// Chỉ block "nối được" mới tham gia match / rơi tự do (obstacle đứng yên tại chỗ).
	bool IsMatchable() const { return !IsEmpty() && !IsObstacle() && Color != EColor::None; }

	static FBlock MakeNormal(EColor InColor) { FBlock B; B.Color = InColor; B.Kind = EBlockKind::Normal; return B; }
	static FBlock MakeObstacle(int32 InCharges = 1)
	{
		FBlock B; B.Color = EColor::None; B.Kind = EBlockKind::Obstacle; B.Charges = InCharges; return B;
	}
	static FBlock MakeSpecial(EColor InColor, EBlockKind InKind, int32 InVariant = 0)
	{
		FBlock B; B.Color = InColor; B.Kind = InKind; B.Variant = InVariant; return B;
	}
	static FBlock MakeCountTrap(int32 InCountdown = 3)
	{
		FBlock B; B.Color = EColor::None; B.Kind = EBlockKind::CountTrap; B.Charges = InCountdown; return B;
	}
	bool IsCountTrap() const { return Kind == EBlockKind::CountTrap; }
	static FBlock MakeEmpty() { return FBlock(); }
};

// -----------------------------------------------------------------------------
// Kết quả một hành động (swap / skill / end turn)
// -----------------------------------------------------------------------------
enum class EActionResult : std::uint8_t
{
	Ok = 0,
	NotAdjacent,    // 2 ô không kề nhau
	OutOfBounds,
	Blocked,        // có vật cản / block khoá
	NoMatch,        // swap xong không tạo được đường nối nào
	NoActions,      // hết lượt hành động trong turn
	NotReady,       // kỹ năng đang hồi chiêu / chưa đầy ultimate / sai điều kiện
	Finished,       // trận đã kết thúc
	Invalid         // tham số không hợp lệ / chưa thiết lập trận
};

struct FActionResult
{
	EActionResult Code = EActionResult::Ok;
	std::string   Message;

	bool IsOk() const { return Code == EActionResult::Ok; }

	static FActionResult Ok(const std::string& Msg = std::string())
	{
		FActionResult R; R.Code = EActionResult::Ok; R.Message = Msg; return R;
	}
	static FActionResult Fail(EActionResult InCode, const std::string& Msg)
	{
		FActionResult R; R.Code = InCode; R.Message = Msg; return R;
	}
};

// -----------------------------------------------------------------------------
// Tiện ích chuỗi nhỏ (không dùng sstream để nhẹ và dễ port)
// -----------------------------------------------------------------------------
inline std::string ToText(int32 Value) { return std::to_string(Value); }
inline std::string ToText(float Value)
{
	return std::to_string(std::lround(Value * 10.f) / 10.f);
}
inline std::string ToText(EColor C) { return std::string(ColorName(C)); }
inline std::string ToText(ERole R) { return std::string(RoleName(R)); }

inline std::string Join(const std::string& A, const std::string& B) { return A + B; }

} // namespace M3
