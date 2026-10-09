// =============================================================================
//  Match3RPG.Build.cs  -  Module gameplay của UE5 (lớp trình bày + input + UI)
// =============================================================================
using UnrealBuildTool;

public class Match3RPG : ModuleRules
{
	public Match3RPG(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"InputCore",
			"UMG",        // để bạn tự thêm widget Blueprint sau này
			"Slate",
			"SlateCore",
			"Match3Core"  // luật chơi thuần C++
		});

		PrivateDependencyModuleNames.AddRange(new string[] { });
	}
}
