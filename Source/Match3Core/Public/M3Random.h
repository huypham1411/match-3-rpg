// =============================================================================
//  M3Random.h  -  Sinh số ngẫu nhiên có seed (tái lập được để test)
//  ---------------------------------------------------------------------------
//  Vì sao không dùng rand()/std::random_device? Vì test cần KẾT QUẢ LẶP LẠI:
//  cùng seed -> cùng bàn, cùng chuỗi hành động của boss -> dễ tìm lỗi.
// =============================================================================
#pragma once

#include "M3Types.h"

namespace M3
{

class FRng
{
public:
	explicit FRng(uint32 InSeed = 20261008u) : State(InSeed ? InSeed : 1u) {}

	void Reseed(uint32 InSeed) { State = InSeed ? InSeed : 1u; }
	uint32 GetSeed() const { return State; }

	// xorshift32: nhanh, đủ tốt cho gameplay, không phụ thuộc thư viện ngoài.
	uint32 NextU32()
	{
		uint32 X = State;
		X ^= X << 13;
		X ^= X >> 17;
		X ^= X << 5;
		State = X;
		return X;
	}

	// [MinInclusive, MaxExclusive)
	int32 Range(int32 MinInclusive, int32 MaxExclusive)
	{
		if (MaxExclusive <= MinInclusive)
		{
			return MinInclusive;
		}
		const uint32 Span = static_cast<uint32>(MaxExclusive - MinInclusive);
		return MinInclusive + static_cast<int32>(NextU32() % Span);
	}

	float RangeFloat(float MinInclusive, float MaxExclusive)
	{
		const float Unit = static_cast<float>(NextU32() % 10000u) / 10000.f;
		return MinInclusive + Unit * (MaxExclusive - MinInclusive);
	}

	bool Chance(float Probability)
	{
		if (Probability <= 0.f) { return false; }
		if (Probability >= 1.f) { return true; }
		return RangeFloat(0.f, 1.f) < Probability;
	}

	// Chọn ngẫu nhiên một phần tử trong mảng (mảng rỗng -> trả về -1).
	int32 PickIndex(int32 Count)
	{
		return Count <= 0 ? -1 : Range(0, Count);
	}

private:
	uint32 State;
};

} // namespace M3
