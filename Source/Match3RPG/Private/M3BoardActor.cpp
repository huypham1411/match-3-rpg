// =============================================================================
//  M3BoardActor.cpp
// =============================================================================
#include "M3BoardActor.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"

AM3BoardActor::AM3BoardActor()
{
	PrimaryActorTick.bCanEverTick = true;

	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	SetRootComponent(Root);
}

void AM3BoardActor::BeginPlay()
{
	Super::BeginPlay();

	if (!VisualSet)
	{
		// Không gán Data Asset -> dùng bộ hình mặc định (asset cơ bản của engine).
		VisualSet = UM3VisualSet::CreateDefaultVisualSet(this);
	}

	if (UM3CombatSubsystem* Combat = GetCombat())
	{
		BoardWidth = Combat->GetBattle().Board().Width();
		BoardHeight = Combat->GetBattle().Board().Height();
	}

	BuildCellComponents();
	RefreshVisuals(true);
}

void AM3BoardActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	PulseTime += DeltaSeconds;

	// Chỉ vẽ lại khi trạng thái trận thay đổi (revision tăng) -> nhẹ CPU.
	if (UM3CombatSubsystem* Combat = GetCombat())
	{
		if (Combat->GetRevision() != LastRevision)
		{
			LastRevision = Combat->GetRevision();
			RefreshVisuals(false);
		}
	}
}

UM3CombatSubsystem* AM3BoardActor::GetCombat() const
{
	if (const UWorld* World = GetWorld())
	{
		if (UGameInstance* GameInstance = World->GetGameInstance())
		{
			return GameInstance->GetSubsystem<UM3CombatSubsystem>();
		}
	}
	return nullptr;
}

// -----------------------------------------------------------------------------
// Toạ độ: bàn được căn giữa quanh vị trí actor
// -----------------------------------------------------------------------------
FVector AM3BoardActor::GetBoardSize() const
{
	return FVector((BoardWidth - 1) * CellSize, (BoardHeight - 1) * CellSize, 0.f);
}

FVector AM3BoardActor::GetBoardCenter() const
{
	return GetActorLocation();
}

FVector AM3BoardActor::CellToWorld(int32 X, int32 Y) const
{
	const FVector Center = GetBoardCenter();
	return Center + FVector(
		(X - (BoardWidth - 1) * 0.5f) * CellSize,
		(Y - (BoardHeight - 1) * 0.5f) * CellSize,
		0.f);
}

bool AM3BoardActor::WorldToCell(const FVector& World, int32& OutX, int32& OutY) const
{
	const FVector Local = World - GetBoardCenter();

	const float FX = Local.X / CellSize + (BoardWidth - 1) * 0.5f;
	const float FY = Local.Y / CellSize + (BoardHeight - 1) * 0.5f;

	OutX = FMath::RoundToInt(FX);
	OutY = FMath::RoundToInt(FY);

	if (OutX < 0 || OutY < 0 || OutX >= BoardWidth || OutY >= BoardHeight) { return false; }

	// Chỉ nhận nếu điểm nằm trong khoảng nửa ô quanh tâm.
	const float DX = FMath::Abs(FX - OutX);
	const float DY = FMath::Abs(FY - OutY);
	return (DX <= 0.5f && DY <= 0.5f);
}

FVector AM3BoardActor::GetIdealCameraLocation() const
{
	const FVector Center = GetBoardCenter();
	const float Depth = (BoardHeight - 1) * CellSize;
	const float Width = (BoardWidth - 1) * CellSize;
	return Center + FVector(0.f, -(Depth * 0.95f + Width * 0.55f), (Depth * 0.95f + Width * 0.55f) * 0.95f);
}

FRotator AM3BoardActor::GetIdealCameraRotation() const
{
	return FRotator(-52.f, 90.f, 0.f);   // nhìn từ phía -Y xuống bàn
}

// -----------------------------------------------------------------------------
// Ô và hình ảnh
// -----------------------------------------------------------------------------
void AM3BoardActor::BuildCellComponents()
{
	if (!CellComponents.IsEmpty()) { return; }   // đã dựng rồi

	CellComponents.Reserve(BoardWidth * BoardHeight);
	CellMaterials.Reserve(BoardWidth * BoardHeight);

	for (int32 Index = 0; Index < BoardWidth * BoardHeight; ++Index)
	{
		UStaticMeshComponent* Comp = NewObject<UStaticMeshComponent>(this);
		Comp->SetMobility(EComponentMobility::Movable);
		Comp->SetupAttachment(Root);
		Comp->RegisterComponent();
		Comp->SetCollisionEnabled(ECollisionEnabled::NoCollision);   // chọn ô bằng toán, không dùng trace
		Comp->SetCastShadow(false);

		CellComponents.Add(Comp);
		CellMaterials.Add(nullptr);
	}
}

void AM3BoardActor::ApplyVisualToCell(int32 Index, UStaticMeshComponent* Comp, const M3::FBlock& Block, bool bSelected)
{
	const FM3BlockVisual Visual = VisualSet
		? VisualSet->ResolveVisual(Block.Kind, Block.Color)
		: FM3BlockVisual();

	const int32 X = Index % BoardWidth;
	const int32 Y = Index / BoardWidth;

	FVector Location = CellToWorld(X, Y);

	// Ô trống (đang chờ block mới rơi xuống): ẩn đi.
	if (Block.IsEmpty())
	{
		Comp->SetVisibility(false);
		return;
	}

	Comp->SetVisibility(true);
	Comp->SetStaticMesh(Visual.Mesh);

	// Mỗi ô có 1 material động riêng để đổi màu theo block.
	UMaterialInstanceDynamic* DynMat = CellMaterials[Index];
	if (Visual.Material)
	{
		if (!DynMat || DynMat->GetMaterial() != Visual.Material)
		{
			DynMat = UMaterialInstanceDynamic::Create(Visual.Material, this);
			CellMaterials[Index] = DynMat;
		}
		if (DynMat)
		{
			FLinearColor Tint = Visual.Tint;
			if (bSelected) { Tint = Tint * 1.6f + FLinearColor(0.15f, 0.15f, 0.15f); }
			DynMat->SetVectorParameterValue(TEXT("Color"), Tint);
			Comp->SetMaterial(0, DynMat);
		}
	}

	FVector Scale = Visual.Scale;
	float Z = (Block.IsObstacle() ? 30.f : 50.f) + Visual.ZOffset;

	if (bSelected)
	{
		// Nhấc ô đang chọn lên và phóng to nhẹ cho dễ thấy.
		Z += 22.f;
		Scale *= 1.12f;
	}

	Comp->SetWorldLocation(Location + FVector(0.f, 0.f, Z));
	Comp->SetWorldScale3D(Scale);
}

void AM3BoardActor::RefreshVisuals(bool bForce)
{
	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat || !Combat->IsBattleActive()) { return; }

	const M3::FBoard& Board = Combat->GetBattle().Board();

	// Bàn có thể đổi kích thước nếu bạn đổi map -> dựng lại nếu cần.
	if (Board.Width() != BoardWidth || Board.Height() != BoardHeight)
	{
		BoardWidth = Board.Width();
		BoardHeight = Board.Height();
		for (UStaticMeshComponent* Comp : CellComponents) { if (Comp) { Comp->DestroyComponent(); } }
		CellComponents.Reset();
		CellMaterials.Reset();
		BuildCellComponents();
	}

	for (int32 Index = 0; Index < CellComponents.Num(); ++Index)
	{
		const int32 X = Index % BoardWidth;
		const int32 Y = Index / BoardWidth;
		const bool bSelected = bHasSelection && SelectedCell.X == X && SelectedCell.Y == Y;
		ApplyVisualToCell(Index, CellComponents[Index], Board.At(X, Y), bSelected);
	}
	(void)bForce;
}

void AM3BoardActor::SelectCell(int32 X, int32 Y)
{
	bHasSelection = true;
	SelectedCell = FM3Cell(X, Y);
	RefreshVisuals(true);
}

void AM3BoardActor::ClearSelection()
{
	bHasSelection = false;
	RefreshVisuals(true);
}
