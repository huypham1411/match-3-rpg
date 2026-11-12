// Copyright MatchRPG. Content assets + engine primitive fallbacks.
#include "Content/MatchRPGAssets.h"

#include "Engine/StaticMesh.h"
#include "Materials/MaterialInterface.h"
#include "UObject/SoftObjectPtr.h"

namespace MatchRPGAssets
{

UStaticMesh* LoadEngineShape(const TCHAR* AssetName)
{
	if (AssetName == nullptr) { return nullptr; }
	return LoadObject<UStaticMesh>(nullptr, AssetName);
}

UStaticMesh* LoadEngineCube()
{
	// Engine primitives ship with the editor, so the game runs without any
	// project content at all.
	static const TCHAR* CubePath = TEXT("/Engine/BasicShapes/Cube.Cube");
	return LoadEngineShape(CubePath);
}

UStaticMesh* LoadEngineSphere()
{
	static const TCHAR* SpherePath = TEXT("/Engine/BasicShapes/Sphere.Sphere");
	return LoadEngineShape(SpherePath);
}

UStaticMesh* LoadEngineCylinder()
{
	static const TCHAR* CylinderPath = TEXT("/Engine/BasicShapes/Cylinder.Cylinder");
	return LoadEngineShape(CylinderPath);
}

UStaticMesh* LoadEngineCone()
{
	static const TCHAR* ConePath = TEXT("/Engine/BasicShapes/Cone.Cone");
	return LoadEngineShape(ConePath);
}

UMaterialInterface* LoadDefaultShapeMaterial()
{
	static const TCHAR* MaterialPath = TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial");
	UMaterialInterface* Material = LoadObject<UMaterialInterface>(nullptr, MaterialPath);
	if (Material != nullptr) { return Material; }

	return UMaterial::GetDefaultMaterial(MD_Surface);
}

UStaticMesh* ResolveMesh(const TSoftObjectPtr<UStaticMesh>& SoftMesh, UStaticMesh* Fallback)
{
	if (!SoftMesh.IsNull())
	{
		if (UStaticMesh* Loaded = SoftMesh.LoadSynchronous())
		{
			return Loaded;
		}
	}
	return Fallback;
}

UMaterialInterface* ResolveMaterial(const TSoftObjectPtr<UMaterialInterface>& SoftMaterial, UMaterialInterface* Fallback)
{
	if (!SoftMaterial.IsNull())
	{
		if (UMaterialInterface* Loaded = SoftMaterial.LoadSynchronous())
		{
			return Loaded;
		}
	}
	return Fallback;
}

void FillPaletteDefaults(UMatchRPGBlockPaletteAsset& Palette)
{
	if (Palette.FallbackBlockMesh.IsNull())
	{
		UStaticMesh* Cube = LoadEngineCube();
		if (Cube != nullptr) { Palette.FallbackBlockMesh = Cube; }
	}
	if (Palette.FallbackMaterial.IsNull())
	{
		UMaterialInterface* Material = LoadDefaultShapeMaterial();
		if (Material != nullptr) { Palette.FallbackMaterial = Material; }
	}

	// One entry per block colour, in EBlockColor order (Red .. Purple).
	static const FLinearColor DefaultColors[5] =
	{
		FLinearColor(0.86f, 0.20f, 0.21f, 1.0f), // Red
		FLinearColor(0.18f, 0.45f, 0.90f, 1.0f), // Blue
		FLinearColor(0.20f, 0.72f, 0.35f, 1.0f), // Green
		FLinearColor(0.95f, 0.78f, 0.15f, 1.0f), // Yellow
		FLinearColor(0.60f, 0.32f, 0.85f, 1.0f)  // Purple
	};

	while (Palette.ColorStyles.Num() < 5)
	{
		FMatchRPGColorStyle Style;
		Style.DisplayColor = DefaultColors[Palette.ColorStyles.Num()];
		Palette.ColorStyles.Add(Style);
	}
	for (int32 i = 0; i < 5; ++i)
	{
		if (Palette.ColorStyles[i].DisplayColor == FLinearColor::Black)
		{
			Palette.ColorStyles[i].DisplayColor = DefaultColors[i];
		}
	}

	// Obstacles: index 0 unused, then Ice, Rock, Crate, Chain.
	const int32 ObstacleCount = 5;
	while (Palette.ObstacleStyles.Num() < ObstacleCount)
	{
		FMatchRPGObstacleStyle Style;
		Palette.ObstacleStyles.Add(Style);
	}

	if (Palette.ObstacleStyles[1].Mesh.IsNull()) { Palette.ObstacleStyles[1].Mesh = LoadEngineSphere(); }
	if (Palette.ObstacleStyles[2].Mesh.IsNull()) { Palette.ObstacleStyles[2].Mesh = LoadEngineCone(); }
	if (Palette.ObstacleStyles[3].Mesh.IsNull()) { Palette.ObstacleStyles[3].Mesh = LoadEngineCylinder(); }
	if (Palette.ObstacleStyles[4].Mesh.IsNull()) { Palette.ObstacleStyles[4].Mesh = LoadEngineCylinder(); }

	Palette.ObstacleStyles[1].DisplayColor = FLinearColor(0.55f, 0.82f, 0.95f, 1.0f); // Ice
	Palette.ObstacleStyles[2].DisplayColor = FLinearColor(0.45f, 0.42f, 0.40f, 1.0f); // Rock
	Palette.ObstacleStyles[3].DisplayColor = FLinearColor(0.62f, 0.42f, 0.20f, 1.0f); // Crate
	Palette.ObstacleStyles[4].DisplayColor = FLinearColor(0.28f, 0.28f, 0.32f, 1.0f); // Chain

	Palette.ObstacleStyles[1].ScaleMultiplier = 0.85f;
	Palette.ObstacleStyles[2].ScaleMultiplier = 0.95f;
	Palette.ObstacleStyles[3].ScaleMultiplier = 1.0f;
	Palette.ObstacleStyles[4].ScaleMultiplier = 0.9f;
}

} // namespace MatchRPGAssets
