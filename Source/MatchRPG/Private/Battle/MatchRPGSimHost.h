// Copyright MatchRPG. Ownership + progression wrapper around the headless core.
//
// NOT a UObject and NOT reflected: keeping the game-agnostic core out of the
// Unreal reflection headers means the core can be compiled and tested on its own
// (see Tools/host_tests) without dragging UnrealBuildTool along.
#pragma once

#include "CoreMinimal.h"

#include "Core/BattleSimCore.h"
#include "Core/ContentCore.h"
#include "Core/MatchFinderCore.h"
#include "Core/MatchRng.h"
#include "Core/MatchTypes.h"

/** Everything a play session owns: roster, gacha state, current stage and the
 *  running battle simulation. */
struct FMatchRPGSimHost
{
	// -- persistent account-ish state (kept in memory; save games are future work)
	TArray<MatchRPG::FCharacterDefinitionRow> Roster;
	TArray<int32> OwnedCharacterIds;
	MatchRPG::FTeamFormation Formation;
	MatchRPG::FGachaCore Gacha;
	MatchRPG::FGachaPoolRow GachaPool;
	MatchRPG::FSkillLibrary Skills;

	int32 Gems = 3000;
	int32 StageNumber = 1;
	int32 Seed = 20261007;

	// -- running battle
	MatchRPG::FBattleSimCore Sim;
	bool bBattleActive = false;
	FString LastMessage;
	/** How many battle-log entries were already written to the Unreal Output Log. */
	int32 LoggedEventCount = 0;

	// -- board interaction
	int32 SelectedX = INDEX_NONE;
	int32 SelectedY = INDEX_NONE;

	void InitializeDefaults();
	void StartBattle(int32 InStageNumber, int32 InSeed);
	void RestartBattle();

	/** Returns true when the swap was accepted by the simulation. */
	bool TrySwapCells(int32 AX, int32 AY, int32 BX, int32 BY);
	bool SelectCell(int32 X, int32 Y);
	void ClearSelection() { SelectedX = INDEX_NONE; SelectedY = INDEX_NONE; }

	bool FireUltimate(int32 SlotIndex);
	bool FireManualSkill(int32 SlotIndex);
	void EndTurn();

	/** Writes every battle event that happened since the last call to the Unreal
	 *  Output Log (category LogMatchRPG). This is the "where do I even start"
	 *  debugging aid inside the editor: you see the same rules firing as in the
	 *  playground, but in real time while you click the board. */
	void FlushNewEventsToLog();

	/** Debug/prototype gacha: spends gems and adds the results to the roster. */
	FString PullTenGacha();

	/** Human readable one-line summary used by the HUD. */
	FString DescribeBoardCell(int32 X, int32 Y) const;

private:
	void OwnAllStartingHeroes();
	bool HasHero(int32 CharacterId) const;
	void SetMessage(const FString& Text);
};

/**
 * One-line description of a battle event.
 *
 * Lives here rather than in a UI file because both the on-screen HUD feed and the
 * Output Log need to say the same thing about the same event; two copies would
 * drift apart the first time the event list changes.
 */
FString DescribeBattleEvent(const MatchRPG::FBattleEvent& Event);
