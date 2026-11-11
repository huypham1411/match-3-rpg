using UnrealBuildTool;

public class MatchRPG : ModuleRules
{
	public MatchRPG(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		// Deliberately minimal: the game boots with zero .uasset content,
		// the HUD is Canvas-based (AHUD::DrawHUD) so UMG/Slate are not required.
		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"InputCore"
		});

		// Lets the host-side test harness (Tools/host_tests) reuse the same
		// pure-logic translation units with -DMATCHRPG_STANDALONE_CORE.
		PublicDefinitions.Add("MATCHRPG_WITH_UE=1");
	}
}
