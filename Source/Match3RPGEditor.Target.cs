// =============================================================================
//  Match3RPGEditor.Target.cs  -  Target cho Unreal Editor (dùng khi mở project)
// =============================================================================
using UnrealBuildTool;
using System.Collections.Generic;

public class Match3RPGEditorTarget : TargetRules
{
	public Match3RPGEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;

		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;

		ExtraModuleNames.AddRange(new string[] { "Match3RPG" });
	}
}
