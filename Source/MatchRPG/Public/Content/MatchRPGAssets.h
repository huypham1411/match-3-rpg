// Copyright MatchRPG. Swappable content assets (blocks, heroes, stages).
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"

#include "MatchRPGAssets.generated.h"

class UStaticMesh;
class UMaterialInterface;
class UTexture2D;
class USkeletalMesh;
class UAnimBlueprint;

/**
 * How one block colour looks. Every field is a soft reference so the project
 * boots with zero imported art: when a field is left empty the code falls back to
 * an engine primitive (see MatchRPGAssets::LoadEngineShape).
 *
 * Swapping the 3D art of a colour is therefore a data edit, never a code edit.
 */
USTRUCT(BlueprintType)
struct FMatchRPGColorStyle
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Style")
	FLinearColor DisplayColor = FLinearColor(0.85f, 0.15f, 0.15f, 1.0f);

	/** Replaces the default cube used for this colour. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Style")
	TSoftObjectPtr<UStaticMesh> BlockMesh;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Style")
	TSoftObjectPtr<UMaterialInterface> BlockMaterial;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Style")
	TSoftObjectPtr<UTexture2D> Icon;
};

/** How one obstacle type looks and is scaled. */
USTRUCT(BlueprintType)
struct FMatchRPGObstacleStyle
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Style")
	TSoftObjectPtr<UStaticMesh> Mesh;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Style")
	TSoftObjectPtr<UMaterialInterface> Material;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Style")
	FLinearColor DisplayColor = FLinearColor(0.4f, 0.6f, 0.9f, 1.0f);

	/** Uniform scale applied on top of the block scale. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Style")
	float ScaleMultiplier = 1.0f;
};

/** The block palette for a board: 5 colours + one entry per obstacle type. */
UCLASS(BlueprintType)
class MATCHRPG_API UMatchRPGBlockPaletteAsset : public UDataAsset
{
	GENERATED_BODY()

public:
	/** Index 0..4 == Red, Blue, Green, Yellow, Purple. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blocks")
	TArray<FMatchRPGColorStyle> ColorStyles;

	/** Stored in EObstacleType order, index 0 is unused (None). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blocks")
	TArray<FMatchRPGObstacleStyle> ObstacleStyles;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blocks")
	TSoftObjectPtr<UStaticMesh> FallbackBlockMesh;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blocks")
	TSoftObjectPtr<UMaterialInterface> FallbackMaterial;

	/** Fills any missing entry with the built-in defaults. */
	void EnsureDefaults();
};

/** One hero: gameplay numbers plus the 3D model the player will actually see. */
UCLASS(BlueprintType)
class MATCHRPG_API UMatchRPGCharacterAsset : public UDataAsset
{
	GENERATED_BODY()

public:
	/** Must match FCharacterDefinitionRow::Id in the core roster. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Identity")
	int32 CharacterId = INDEX_NONE;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Identity")
	FText DisplayName;

	/** Swap this for the real character model. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Presentation")
	TSoftObjectPtr<USkeletalMesh> SkeletalMesh;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Presentation")
	TSoftObjectPtr<UAnimBlueprint> AnimBlueprintClass;

	/** Used before any skeletal mesh exists: a primitive that stands in for the hero. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Presentation")
	TSoftObjectPtr<UStaticMesh> PlaceholderMesh;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Presentation")
	TSoftObjectPtr<UTexture2D> Portrait;
};

/** Optional override of what ContentCore::BuildDemoStage produces. */
UCLASS(BlueprintType)
class MATCHRPG_API UMatchRPGStageAsset : public UDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stage")
	int32 StageId = 1;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stage")
	int32 MovesPerTurn = 4;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stage")
	int32 TurnLimit = 15;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stage")
	int32 StarTurnThreshold = 10;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stage")
	int32 BossMaxHp = 12000;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stage")
	float BossStaggerMax = 900.0f;

	/** Human readable objective list for the designer; the core rows stay in code. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stage")
	TArray<FText> ObjectiveDescriptions;
};

/**
 * Engine-primitive fallbacks.
 *
 * The whole point: a fresh clone of MatchRPG has no Content/ folder, so every
 * visual is an engine basic shape until the team swaps in real art.
 */
namespace MatchRPGAssets
{
	/** Applies content defaults to a palette that has empty slots. */
	void FillPaletteDefaults(UMatchRPGBlockPaletteAsset& Palette);

	UStaticMesh* LoadEngineShape(const TCHAR* AssetName);
	UStaticMesh* LoadEngineCube();
	UStaticMesh* LoadEngineSphere();
	UStaticMesh* LoadEngineCylinder();
	UStaticMesh* LoadEngineCone();
	UMaterialInterface* LoadDefaultShapeMaterial();

	/** Lazy-loads a soft mesh, falling back to an engine primitive. */
	UStaticMesh* ResolveMesh(const TSoftObjectPtr<UStaticMesh>& SoftMesh, UStaticMesh* Fallback);
	UMaterialInterface* ResolveMaterial(const TSoftObjectPtr<UMaterialInterface>& SoftMaterial, UMaterialInterface* Fallback);
}
