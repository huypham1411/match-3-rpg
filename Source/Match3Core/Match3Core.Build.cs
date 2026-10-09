// =============================================================================
//  Match3Core.Build.cs  -  Module lõi luật chơi (không phụ thuộc Unreal Engine)
//  ---------------------------------------------------------------------------
//  Module này cố tình KHÔNG dùng API của Engine (không UObject, không FString).
//  Nhờ vậy toàn bộ luật match-3 / combat có thể biên dịch và test độc lập bằng
//  cl.exe (xem Tests/Core/build_and_run.bat) mà vẫn build được trong UE5.
// =============================================================================
using UnrealBuildTool;

public class Match3Core : ModuleRules
{
	public Match3Core(ReadOnlyTargetRules Target) : base(Target)
	{
		// Không dùng shared PCH: mỗi file tự include những gì nó cần -> biên dịch
		// được cả bên ngoài UE.
		PCHUsage = PCHUsageMode.NoSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		// Chỉ cần Core cho hạ tầng module; code trong này không dùng API nào của nó.
		PrivateDependencyModuleNames.AddRange(new string[] { "Core" });

		// Cờ này cho phép thêm test automation của UE trong module (xem
		// Private/M3CoreAutomationTests.cpp). Khi biên dịch bằng cl.exe thuần,
		// cờ không được định nghĩa nên phần đó tự động bị bỏ qua.
		PublicDefinitions.Add("M3_WITH_UE=1");

		// Cờ riêng của module này: dùng để chọn __declspec(dllexport) cho các lớp
		// lõi (xem khối định nghĩa MATCH3CORE_API trong Public/M3Types.h).
		PrivateDefinitions.Add("M3CORE_BUILDING_DLL=1");
	}
}
