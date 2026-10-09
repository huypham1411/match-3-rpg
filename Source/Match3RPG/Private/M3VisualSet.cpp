// =============================================================================
//  M3VisualSet.cpp
// =============================================================================
#include "M3VisualSet.h"

#include "Engine/StaticMesh.h"
#include "Materials/MaterialInterface.h"

namespace
{
	// Đường dẫn asset cơ bản của engine (luôn có trong mọi bản cài UE5).
	const TCHAR* CubePath   = TEXT("/Engine/BasicShapes/Cube.Cube");
	const TCHAR* SpherePath = TEXT("/Engine/BasicShapes/Sphere.Sphere");
	const TCHAR* ConePath   = TEXT("/Engine/BasicShapes/Cone.Cone");
	const TCHAR* PlanePath  = TEXT("/Engine/BasicShapes/Plane.Plane");
	const TCHAR* BaseMatPath = TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial");
}

FM3BlockVisual UM3VisualSet::ResolveVisual(M3::EBlockKind Kind, M3::EColor Color) const
{
	switch (Kind)
	{
	case M3::EBlockKind::Obstacle:   return ObstacleVisual;
	case M3::EBlockKind::LineClear:  return LineClearVisual;
	case M3::EBlockKind::SquareBomb: return SquareBombVisual;
	case M3::EBlockKind::ColorBomb:  return ColorBombVisual;
	default: break;
	}

	for (const FM3BlockVisualEntry& Entry : BlockVisuals)
	{
		if (M3Conv::ToCore(Entry.Color) == Color) { return Entry.Visual; }
	}

	// Không cấu hình -> dùng ô vuông màu xám.
	FM3BlockVisual Fallback;
	Fallback.Tint = M3Conv::ColorToLinear(Color);
	return Fallback;
}

UM3VisualSet* UM3VisualSet::CreateDefaultVisualSet(UObject* Outer)
{
	UM3VisualSet* Set = NewObject<UM3VisualSet>(Outer ? Outer : GetTransientPackage());

	UStaticMesh* Cube = LoadObject<UStaticMesh>(nullptr, CubePath);
	UStaticMesh* Sphere = LoadObject<UStaticMesh>(nullptr, SpherePath);
	UStaticMesh* Cone = LoadObject<UStaticMesh>(nullptr, ConePath);
	UStaticMesh* Plane = LoadObject<UStaticMesh>(nullptr, PlanePath);
	UMaterialInterface* BaseMat = LoadObject<UMaterialInterface>(nullptr, BaseMatPath);

	// --- 6 màu block thường ---
	const M3::EColor Colors[] = {
		M3::EColor::Red, M3::EColor::Blue, M3::EColor::Green,
		M3::EColor::Yellow, M3::EColor::Purple, M3::EColor::Cyan
	};
	for (const M3::EColor Color : Colors)
	{
		FM3BlockVisualEntry Entry;
		Entry.Color = M3Conv::FromCore(Color);
		Entry.Visual.Mesh = Cube;
		Entry.Visual.Material = BaseMat;
		Entry.Visual.Tint = M3Conv::ColorToLinear(Color);
		Entry.Visual.Scale = FVector(0.92f, 0.92f, 0.92f);
		Entry.Visual.ZOffset = 0.f;
		Set->BlockVisuals.Add(Entry);
	}

	// --- Vật cản: khối xám to, hơi thấp xuống ---
	Set->ObstacleVisual.Mesh = Cube;
	Set->ObstacleVisual.Material = BaseMat;
	Set->ObstacleVisual.Tint = FLinearColor(0.22f, 0.22f, 0.26f);
	Set->ObstacleVisual.Scale = FVector(1.0f, 1.0f, 0.55f);
	Set->ObstacleVisual.ZOffset = -18.f;

	// --- Block nổ hàng/cột: khối cao dẹt ---
	Set->LineClearVisual.Mesh = Cube;
	Set->LineClearVisual.Material = BaseMat;
	Set->LineClearVisual.Tint = FLinearColor(1.0f, 0.62f, 0.15f);
	Set->LineClearVisual.Scale = FVector(1.0f, 1.0f, 0.25f);
	Set->LineClearVisual.ZOffset = 8.f;

	// --- Block nổ vuông: khối cầu lớn ---
	Set->SquareBombVisual.Mesh = Sphere;
	Set->SquareBombVisual.Material = BaseMat;
	Set->SquareBombVisual.Tint = FLinearColor(1.0f, 0.35f, 0.65f);
	Set->SquareBombVisual.Scale = FVector(0.62f, 0.62f, 0.62f);

	// --- Block cầu vồng: cầu trắng (đổi chỗ để kích hoạt cả màu) ---
	Set->ColorBombVisual.Mesh = Sphere;
	Set->ColorBombVisual.Material = BaseMat;
	Set->ColorBombVisual.Tint = FLinearColor(1.0f, 1.0f, 1.0f);
	Set->ColorBombVisual.Scale = FVector(0.7f, 0.7f, 0.7f);
	Set->ColorBombVisual.ZOffset = 6.f;

	// --- Boss + sàn ---
	Set->BossVisual.Mesh = Cone;
	Set->BossVisual.Material = BaseMat;
	Set->BossVisual.Tint = FLinearColor(0.85f, 0.12f, 0.25f);
	Set->BossVisual.Scale = FVector(3.2f, 3.2f, 3.2f);

	Set->FloorVisual.Mesh = Plane;
	Set->FloorVisual.Material = BaseMat;
	Set->FloorVisual.Tint = FLinearColor(0.06f, 0.07f, 0.10f);
	Set->FloorVisual.Scale = FVector(28.f, 28.f, 1.f);

	// --- Nhân vật (khi chưa gán Skeletal Mesh) ---
	Set->PartyMesh = Cube;
	Set->PartyMaterial = BaseMat;

	return Set;
}
