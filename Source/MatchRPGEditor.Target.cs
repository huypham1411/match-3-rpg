using UnrealBuildTool;
using System.Collections.Generic;

public class MatchRPGEditorTarget : TargetRules
{
	public MatchRPGEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.V4;
		IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_3;
		ExtraModuleNames.Add("MatchRPG");
	}
}
