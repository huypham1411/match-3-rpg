// Copyright MatchRPG. Mouse/keyboard glue between the player and the board.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"

#include "MatchRPGPlayerController.generated.h"

class ABoardGridActor;

/**
 * AMatchRPGPlayerController
 *
 * Binds the controls directly in code so no InputAction / InputMappingContext
 * .uasset is required to play the project straight after a fresh clone:
 *
 *   Left mouse     select a cell, click an adjacent cell to swap
 *   Space          end the turn early (triggers the defender passive)
 *   1..6           fire that slot's ultimate (chains into a Full Burst)
 *   Q W E R T Y    use that slot's hand-activated skill
 *   H              show a hint (performs the suggested swap)
 *   G              debug 10-pull gacha
 *   R              restart the stage
 */
UCLASS()
class MATCHRPG_API AMatchRPGPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	AMatchRPGPlayerController();

	virtual void BeginPlay() override;
	virtual void SetupInputComponent() override;

private:
	ABoardGridActor* GetBoard();
	void HandleBoardClick(float ScreenX, float ScreenY);

	void OnBoardClick();
	void OnEndTurn();
	void OnHint();
	void OnGachaPull();
	void OnRestartStage();
	void OnUltimateSlot(int32 SlotIndex);
	void OnSkillSlot(int32 SlotIndex);

	UFUNCTION()
	void OnUltimate1();
	UFUNCTION()
	void OnUltimate2();
	UFUNCTION()
	void OnUltimate3();
	UFUNCTION()
	void OnUltimate4();
	UFUNCTION()
	void OnUltimate5();
	UFUNCTION()
	void OnUltimate6();

	UFUNCTION()
	void OnSkill1();
	UFUNCTION()
	void OnSkill2();
	UFUNCTION()
	void OnSkill3();
	UFUNCTION()
	void OnSkill4();
	UFUNCTION()
	void OnSkill5();
	UFUNCTION()
	void OnSkill6();

	UPROPERTY(Transient)
	TObjectPtr<ABoardGridActor> CachedBoard;
};
