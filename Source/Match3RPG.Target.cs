// =============================================================================
//  Match3RPG.Target.cs  -  Target cho bản game (packaged / stand-alone)
//  Target = "cấu hình build". Mỗi Target quyết định build ra Editor hay Game.
// =============================================================================
using UnrealBuildTool;
using System.Collections.Generic;

public class Match3RPGTarget : TargetRules
{
	public Match3RPGTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;

		// Dùng bộ cấu hình build mới nhất của engine (khuyến nghị cho 5.4+).
		DefaultBuildSettings = BuildSettingsVersion.Latest;

		// Thứ tự include header mới nhất -> tránh cảnh báo phụ thuộc chéo.
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;

		// Chỉ cần khai báo module chính. Match3Core được kéo theo qua Build.cs.
		ExtraModuleNames.AddRange(new string[] { "Match3RPG" });
	}
}
