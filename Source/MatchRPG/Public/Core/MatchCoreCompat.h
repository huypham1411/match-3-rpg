// Copyright MatchRPG. Portable core compatibility layer.
#pragma once

/**
 * MatchCoreCompat.h
 *
 * WHY THIS EXISTS
 * ---------------
 * The gameplay logic of MatchRPG (board state, match detection, cascades,
 * combat math, turn loop) is written so that it compiles in two worlds:
 *
 *   1. Inside Unreal Engine  -> uses the real UE types (TArray, FIntPoint, FMath...).
 *   2. As a plain C++17 unit -> compile with -DMATCHRPG_STANDALONE_CORE and the
 *      tiny shim below provides the same names, so the logic can be unit tested
 *      on a build machine that has no Unreal Engine installed.
 *
 * This header contains NO game logic. Everything else in Source/MatchRPG/.../Core
 * is shared, unmodified, between both worlds.
 *
 * The shim intentionally implements only the small API surface the core actually
 * uses (index based loops, Num/Add/Emplace/Reset/Reserve/RemoveAt/Find/Insert/
 * Last/SetNum/IsValidIndex). Anything richer should be written by hand rather
 * than added here, so the two worlds cannot drift apart.
 */

#ifdef MATCHRPG_STANDALONE_CORE

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <vector>

typedef std::int8_t int8;
typedef std::int16_t int16;
typedef std::int32_t int32;
typedef std::int64_t int64;
typedef std::uint8_t uint8;
typedef std::uint16_t uint16;
typedef std::uint32_t uint32;
typedef std::uint64_t uint64;

#define INDEX_NONE (-1)

#ifndef UMETA
#define UMETA(x)
#endif

/**
 * Lưới an toàn cho người học.
 *
 * Trong Unreal, TArray::operator[] KHÔNG kiểm tra phạm vi (nhanh nhưng đọc sai thì
 * hỏng dữ liệu âm thầm). Khi biên dịch ngoài engine, shim bên dưới bật kiểm tra và
 * báo lỗi rõ ràng, để một toạ độ âm hay vượt kích thước bàn hiện ra ngay tại chỗ thay
 * vì biến thành lỗi khó hiểu ở nơi khác.
 *
 * Tắt bằng: -DMATCHRPG_STANDALONE_NO_BOUNDS_CHECK
 */
#ifndef MATCHRPG_STANDALONE_NO_BOUNDS_CHECK
#define MATCHRPG_STANDALONE_BOUNDS_CHECK 1
#endif

#ifdef MATCHRPG_STANDALONE_BOUNDS_CHECK
inline void MatchRPGReportIndexOutOfRange(int32 Index, int32 Count, const char* File, int Line)
{
	std::printf("\n!!! LOI TRUY CAP MANG NGOAI PHAM VI (TArray)\n");
	std::printf("    Truy cap phan tu thu %d nhung mang chi co %d phan tu.\n", Index, Count);
	std::printf("    Day la loi LAP TRINH, khong phai loi du lieu: chi so dang am hoac qua lon.\n");
	std::printf("    Thuong gap khi toa do X/Y am, hoac khi vong lap chay qua mep ban.\n");
	if (File != nullptr) { std::printf("    Noi goi: %s:%d\n", File, Line); }
	std::printf("\n");
	std::fflush(stdout);
	std::abort();
}

#define MATCHRPG_CHECK_INDEX(Index, Count) \
	do { \
		if ((Index) < 0 || (Index) >= (Count)) { MatchRPGReportIndexOutOfRange((Index), (Count), __FILE__, __LINE__); } \
	} while (0)
#else
#define MATCHRPG_CHECK_INDEX(Index, Count) do { } while (0)
#endif

/** Character type used by core-level debug/name helpers (char outside UE, TCHAR inside). */
typedef char MRPGChar;
#define MRPG_TEXT(x) x

/** Minimal stand-in for UE::TArray, matching the subset used by the core. */
template <typename T>
class TArray
{
public:
	TArray() = default;
	TArray(std::initializer_list<T> Init) : Storage(Init) {}

	int32 Num() const { return static_cast<int32>(Storage.size()); }

	T& operator[](int32 Index)
	{
		MATCHRPG_CHECK_INDEX(Index, Num());
		return Storage[static_cast<size_t>(Index)];
	}
	const T& operator[](int32 Index) const
	{
		MATCHRPG_CHECK_INDEX(Index, Num());
		return Storage[static_cast<size_t>(Index)];
	}

	int32 Add(const T& Item) { Storage.push_back(Item); return Num() - 1; }
	int32 Add(T&& Item) { Storage.push_back(static_cast<T&&>(Item)); return Num() - 1; }

	template <typename... ArgsType>
	T& Emplace(ArgsType&&... Args)
	{
		Storage.emplace_back(static_cast<ArgsType&&>(Args)...);
		return Storage.back();
	}

	void Reserve(int32 Count) { Storage.reserve(static_cast<size_t>(Count > 0 ? Count : 0)); }
	void Reset() { Storage.clear(); }
	void Reset(int32 NewSize) { Storage.clear(); Storage.resize(static_cast<size_t>(NewSize > 0 ? NewSize : 0)); }
	void SetNum(int32 NewSize) { Storage.resize(static_cast<size_t>(NewSize > 0 ? NewSize : 0)); }

	void RemoveAt(int32 Index) { Storage.erase(Storage.begin() + Index); }
	void Insert(const T& Item, int32 Index) { Storage.insert(Storage.begin() + Index, Item); }

	void Append(const TArray<T>& Other)
	{
		Storage.insert(Storage.end(), Other.Storage.begin(), Other.Storage.end());
	}

	bool IsValidIndex(int32 Index) const { return Index >= 0 && Index < Num(); }
	int32 Find(const T& Item) const
	{
		for (int32 i = 0; i < Num(); ++i)
		{
			if (Storage[static_cast<size_t>(i)] == Item) { return i; }
		}
		return INDEX_NONE;
	}

	T& Last(int32 IndexFromEnd = 0) { return Storage[Storage.size() - 1 - static_cast<size_t>(IndexFromEnd)]; }
	const T& Last(int32 IndexFromEnd = 0) const { return Storage[Storage.size() - 1 - static_cast<size_t>(IndexFromEnd)]; }

	T* begin() { return Storage.data(); }
	T* end() { return Storage.data() + Storage.size(); }
	const T* begin() const { return Storage.data(); }
	const T* end() const { return Storage.data() + Storage.size(); }

private:
	std::vector<T> Storage;
};

struct FIntPoint
{
	int32 X = 0;
	int32 Y = 0;

	FIntPoint() = default;
	FIntPoint(int32 InX, int32 InY) : X(InX), Y(InY) {}

	bool operator==(const FIntPoint& Other) const { return X == Other.X && Y == Other.Y; }
	bool operator!=(const FIntPoint& Other) const { return !(*this == Other); }
	FIntPoint operator+(const FIntPoint& Other) const { return FIntPoint(X + Other.X, Y + Other.Y); }
	FIntPoint operator-(const FIntPoint& Other) const { return FIntPoint(X - Other.X, Y - Other.Y); }
};

namespace FMath
{
	template <typename T> static T Clamp(T Value, T Lo, T Hi) { return Value < Lo ? Lo : (Value > Hi ? Hi : Value); }
	template <typename T> static T Max(T A, T B) { return A > B ? A : B; }
	template <typename T> static T Min(T A, T B) { return A < B ? A : B; }
	template <typename T> static T Abs(T Value) { return Value < T(0) ? -Value : Value; }
	static float Pow(float Base, float Exp) { return std::pow(Base, Exp); }
	static float Sqrt(float Value) { return std::sqrt(Value); }
	static int32 FloorToInt(float Value) { return static_cast<int32>(std::floor(Value)); }
	static int32 CeilToInt(float Value) { return static_cast<int32>(std::ceil(Value)); }
	static int32 RoundToInt(float Value) { return static_cast<int32>(std::floor(Value + 0.5f)); }
	static float Lerp(float A, float B, float Alpha) { return A + (B - A) * Alpha; }
	static bool IsNearlyZero(float Value, float Tolerance = 1e-4f) { return Abs(Value) <= Tolerance; }
}

#else // ------------------------- inside Unreal Engine -------------------------

#include "CoreMinimal.h"

/** Character type used by core-level debug/name helpers (char outside UE, TCHAR inside). */
typedef TCHAR MRPGChar;
#define MRPG_TEXT(x) TEXT(x)

#endif // MATCHRPG_STANDALONE_CORE
