// =============================================================================
//  M3TestFramework.h  -  Khung test siêu nhỏ (chỉ dùng cho bản test độc lập)
//  ---------------------------------------------------------------------------
//  Vì sao tự viết? Vì bộ test này còn phải chạy được bằng cl.exe thuần (không
//  cần Unreal Engine). Cách dùng:
//      M3TEST(TenTest) { M3REQUIRE(1 + 1 == 2); }
//  Tên test được đăng ký tự động, main() chỉ việc gọi M3Test::RunAll().
// =============================================================================
#pragma once

#include <functional>
#include <iostream>
#include <string>
#include <vector>

namespace M3Test
{

struct FTestCase
{
	std::string Name;
	std::function<void()> Fn;
};

inline std::vector<FTestCase>& Registry()
{
	static std::vector<FTestCase> List;
	return List;
}

struct FRegistrar
{
	FRegistrar(const char* Name, std::function<void()> Fn)
	{
		Registry().push_back(FTestCase{ std::string(Name), Fn });
	}
};

struct FAssertFailure
{
	std::string Message;
};

inline void Fail(const char* File, int Line, const std::string& Msg)
{
	throw FAssertFailure{ std::string(File) + ":" + std::to_string(Line) + " -> " + Msg };
}

inline int RunAll()
{
	int Passed = 0;
	int Failed = 0;

	std::cout << "========== KIEM THU LOI GAME (M3 Core) ==========\n";
	for (const FTestCase& Test : Registry())
	{
		try
		{
			Test.Fn();
			++Passed;
			std::cout << "[PASS] " << Test.Name << "\n";
		}
		catch (const FAssertFailure& Failure)
		{
			++Failed;
			std::cout << "[FAIL] " << Test.Name << "\n        " << Failure.Message << "\n";
		}
		catch (const std::exception& Ex)
		{
			++Failed;
			std::cout << "[FAIL] " << Test.Name << "\n        ngoai le: " << Ex.what() << "\n";
		}
	}

	std::cout << "------------------------------------------------\n";
	std::cout << "Ket qua: " << Passed << " PASS / " << Failed << " FAIL (tong " << (Passed + Failed) << ")\n";
	return Failed == 0 ? 0 : 1;
}

} // namespace M3Test

#define M3TEST(NAME)                                                       \
	static void NAME();                                                    \
	static ::M3Test::FRegistrar M3Reg_##NAME(#NAME, NAME);                  \
	static void NAME()

#define M3REQUIRE(COND)                                                    \
	do {                                                                   \
		if (!(COND)) {                                                     \
			::M3Test::Fail(__FILE__, __LINE__, std::string("Sai dieu kien: ") + #COND); \
		}                                                                  \
	} while (0)

#define M3REQUIRE_EQ(A, B)                                                 \
	do {                                                                   \
		if (!((A) == (B))) {                                               \
			::M3Test::Fail(__FILE__, __LINE__, std::string("Khac nhau: ") + #A + " != " + #B); \
		}                                                                  \
	} while (0)

#define M3REQUIRE_GT(A, B)                                                 \
	do {                                                                   \
		if (!((A) > (B))) {                                                \
			::M3Test::Fail(__FILE__, __LINE__, std::string("Phai lon hon: ") + #A + " > " + #B); \
		}                                                                  \
	} while (0)
