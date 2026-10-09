// =============================================================================
//  M3PartyMemberActor.cpp
// =============================================================================
#include "M3PartyMemberActor.h"

#include "Components/SkeletalMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/GameInstance.h"
#include "Engine/SkeletalMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "M3UETypes.h"

AM3PartyMemberActor::AM3PartyMemberActor()
{
	PrimaryActorTick.bCanEverTick = true;

	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	SetRootComponent(Root);

	FallbackMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("FallbackMesh"));
	FallbackMesh->SetupAttachment(Root);
	FallbackMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);

	SkeletalMesh = CreateDefaultSubobject<USkeletalMeshComponent>(TEXT("SkeletalMesh"));
	SkeletalMesh->SetupAttachment(Root);
	SkeletalMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);

	NameText = CreateDefaultSubobject<UTextRenderComponent>(TEXT("NameText"));
	NameText->SetupAttachment(Root);
	NameText->SetRelativeLocation(FVector(0.f, 0.f, 190.f));
	NameText->SetHorizontalAlignment(EHorizTextAligment::EHTA_Center);
	NameText->SetWorldSize(28.f);
	NameText->SetTextRenderColor(FColor::White);
}

void AM3PartyMemberActor::BeginPlay()
{
	Super::BeginPlay();

	if (!VisualSet) { VisualSet = UM3VisualSet::CreateDefaultVisualSet(this); }

	// Nếu bạn gán một Skeletal Mesh -> dùng nó, ngược lại dùng mesh tĩnh.
	if (SkeletalMeshToUse)
	{
		SkeletalMesh->SetSkeletalMesh(SkeletalMeshToUse);
		if (AnimationBlueprintClass)
		{
			SkeletalMesh->SetAnimationMode(EAnimationMode::AnimationBlueprint);
			SkeletalMesh->SetAnimInstanceClass(AnimationBlueprintClass);
		}
		FallbackMesh->SetVisibility(false);
	}
	else if (VisualSet && VisualSet->PartyMesh)
	{
		FallbackMesh->SetStaticMesh(VisualSet->PartyMesh);
		if (VisualSet->PartyMaterial)
		{
			DynMat = UMaterialInstanceDynamic::Create(VisualSet->PartyMaterial, this);
			FallbackMesh->SetMaterial(0, DynMat);
		}
		SkeletalMesh->SetVisibility(false);
	}
}

UM3CombatSubsystem* AM3PartyMemberActor::GetCombat() const
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

void AM3PartyMemberActor::SetupForMember(int32 InMemberIndex, UM3VisualSet* InVisualSet)
{
	MemberIndex = InMemberIndex;
	if (InVisualSet) { VisualSet = InVisualSet; }

	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat || !Combat->IsBattleActive()) { return; }

	const M3::FParty& Party = Combat->GetBattle().Party();
	const M3::FCharacterState* Member = Party.TryGet(MemberIndex);
	if (!Member) { return; }

	// Màu theo role + theo màu block của nhân vật -> nhìn là biết ai làm gì.
	const FLinearColor RoleColor = M3Conv::RoleToLinearEM3(M3Conv::FromCore(Member->Def.Role));
	FLinearColor Tint = RoleColor;
	if (Member->Def.MatchColor != M3::EColor::None)
	{
		Tint = FLinearColor::LerpUsingHSV(RoleColor, M3Conv::ColorToLinear(Member->Def.MatchColor), 0.45f);
	}

	if (DynMat) { DynMat->SetVectorParameterValue(TEXT("Color"), Tint); }
	if (NameText)
	{
		NameText->SetText(FText::FromString(M3Conv::Utf8(Member->Def.Name) + TEXT("\n")
			+ M3UE::RoleDisplayName(Member->Def.Role)));
		NameText->SetTextRenderColor(Tint.ToFColor(true));
	}
}

void AM3PartyMemberActor::PulseAction()
{
	PulseTimer = 0.35f;
}

void AM3PartyMemberActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (PulseTimer > 0.f)
	{
		PulseTimer = FMath::Max(0.f, PulseTimer - DeltaSeconds);
	}

	// Nhún nhẹ liên tục + nảy mạnh khi vừa tác động.
	const float Bob = FMath::Sin(GetWorld()->GetTimeSeconds() * 2.2f + MemberIndex) * 6.f;
	const float Pulse = (PulseTimer > 0.f) ? (PulseTimer / 0.35f) * 55.f : 0.f;

	FallbackMesh->SetRelativeLocation(FVector(0.f, 0.f, 100.f + Bob + Pulse));
	SkeletalMesh->SetRelativeLocation(FVector(0.f, 0.f, Bob + Pulse));

	// Nhân vật gục -> nằm nghiêng và mờ đi.
	UM3CombatSubsystem* Combat = GetCombat();
	if (Combat && Combat->IsBattleActive())
	{
		const M3::FCharacterState* Member = Combat->GetBattle().Party().TryGet(MemberIndex);
		if (Member && !Member->bAlive)
		{
			FallbackMesh->SetRelativeRotation(FRotator(0.f, 0.f, 75.f));
			SkeletalMesh->SetRelativeRotation(FRotator(0.f, 0.f, 75.f));
		}
	}
}
