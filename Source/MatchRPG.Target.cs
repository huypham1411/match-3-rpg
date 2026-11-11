using UnrealBuildTool;
using System.Collections.Generic;

public class MatchRPGTarget : TargetRules
{
	public MatchRPGTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.V4;
		IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_3;
		ExtraModuleNames.Add("MatchRPG");
	}
}
