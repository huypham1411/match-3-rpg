// Copyright MatchRPG. Deterministic RNG shared by board refill, shuffles, gacha and boss AI.
#pragma once

#include "Core/MatchCoreCompat.h"

namespace MatchRPG
{

/**
 * Small deterministic xorshift128 generator.
 *
 * Deliberately NOT FMath::RandRange: every random decision in the game is driven
 * by this one object so a match can be replayed exactly from its seed. That is
 * what makes the headless battle simulation (and its tests) reproducible.
 */
class FMatchRng
{
public:
	FMatchRng() { Seed(0x9E3779B9u); }
	explicit FMatchRng(uint64 InSeed) { Seed(InSeed); }

	void Seed(uint64 InSeed)
	{
		State = InSeed ? InSeed : 0x9E3779B9u;
		// Splitmix-style warm-up so nearby seeds diverge immediately.
		for (int32 i = 0; i < 4; ++i) { State = State * 6364136223846793005ull + 1442695040888963407ull; }
	}

	uint32 NextUInt()
	{
		uint64 X = State;
		X ^= X << 13;
		X ^= X >> 7;
		X ^= X << 17;
		State = X;
		return static_cast<uint32>(X >> 32);
	}

	/** Uniform in [0, Max) for Max > 0. */
	int32 Range(int32 Max)
	{
		if (Max <= 0) { return 0; }
		return static_cast<int32>(NextUInt() % static_cast<uint32>(Max));
	}

	/** Uniform in [Min, Max] inclusive. */
	int32 RangeInclusive(int32 Min, int32 Max)
	{
		if (Max <= Min) { return Min; }
		return Min + Range(Max - Min + 1);
	}

	/** Uniform in [0, 1). */
	float Fraction()
	{
		return static_cast<float>(NextUInt() & 0x00FFFFFFu) / static_cast<float>(0x01000000u);
	}

	bool Chance(float Probability) { return Fraction() < Probability; }

	/** Fisher-Yates over any TArray, using only index loops so both build worlds agree. */
	template <typename T>
	void Shuffle(TArray<T>& Array)
	{
		for (int32 i = Array.Num() - 1; i > 0; --i)
		{
			const int32 j = Range(i + 1);
			const T Temp = Array[i];
			Array[i] = Array[j];
			Array[j] = Temp;
		}
	}

	uint64 GetState() const { return State; }

private:
	uint64 State = 0x9E3779B9u;
};

} // namespace MatchRPG
