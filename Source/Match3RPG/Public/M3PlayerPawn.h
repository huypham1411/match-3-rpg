// =============================================================================
//  M3PlayerPawn.h  -  "Camera" của người chơi (nhìn xuống bàn nối)
//  ---------------------------------------------------------------------------
//  Game này không cần nhân vật đi lại, nên pawn chỉ có một camera. Toạ độ camera
//  được canh theo bàn nối (AM3BoardActor::GetIdealCameraLocation) để khi bạn đổi
//  kích thước bàn thì góc nhìn vẫn hợp lý.
// =============================================================================
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"

#include "M3PlayerPawn.generated.h"

class UCameraComponent;

UCLASS()
class MATCH3RPG_API AM3PlayerPawn : public APawn
{
	GENERATED_BODY()

public:
	AM3PlayerPawn();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Match3")
	UCameraComponent* Camera = nullptr;

private:
	bool bCameraPlaced = false;
	void TryPlaceCamera();
};
