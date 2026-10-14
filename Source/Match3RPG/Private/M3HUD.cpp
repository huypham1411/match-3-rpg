// =============================================================================
//  M3HUD.cpp
// =============================================================================
#include "M3HUD.h"

#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"

#include "M3Content.h"
#include "M3PlayerController.h"
#include "M3Skills.h"

namespace
{
	const FLinearColor PanelColor(0.03f, 0.04f, 0.07f, 0.78f);
	const FLinearColor PanelEdge(0.35f, 0.45f, 0.70f, 0.55f);
	const FLinearColor TextColor(0.92f, 0.94f, 0.98f);
	const FLinearColor DimColor(0.62f, 0.66f, 0.74f);
	const FLinearColor BossBar(0.85f, 0.18f, 0.28f);
	const FLinearColor StaggerBar(0.95f, 0.72f, 0.18f);
	const FLinearColor HpBar(0.30f, 0.85f, 0.45f);
	const FLinearColor UltBar(0.55f, 0.40f, 0.95f);
	const FLinearColor ButtonOn(0.16f, 0.34f, 0.62f);
	const FLinearColor ButtonOff(0.15f, 0.16f, 0.20f);
}

UM3CombatSubsystem* AM3HUD::GetCombat() const
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
// Vẽ
// -----------------------------------------------------------------------------
void AM3HUD::DrawHUD()
{
	Super::DrawHUD();

	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat || !Combat->IsBattleActive()) { return; }

	Buttons.Reset();

	const float ScreenW = Canvas ? Canvas->SizeX : 1920.f;
	const float ScreenH = Canvas ? Canvas->SizeY : 1080.f;

	DrawBossPanel(ScreenW);
	DrawTeamPanel(Cast<AM3PlayerController>(PlayerOwner));
	DrawStoryPanel(ScreenW);
	DrawLogPanel(ScreenW);
	DrawInfoPanel(ScreenW, ScreenH);

	if (Combat->IsFinished())
	{
		DrawGameOverBanner(ScreenW, ScreenH);
	}

	// Gợi ý thao tác.
	DrawLabel(GetHintText(), 24.f, ScreenH - 34.f, DimColor, 13);
}

FString AM3HUD::GetHintText() const
{
	return TEXT("Kéo/click 2 ô kề nhau để nối  |  1..6 = kỹ năng nhân vật  |  NumPad 1..6 = ultimate  |  Tab/Enter = kết thúc turn  |  R = chơi lại  |  N = map kế tiếp");
}

void AM3HUD::DrawPanel(float X, float Y, float W, float H, const FLinearColor& Color)
{
	DrawRect(Color, X, Y, W, H);
	DrawRect(PanelEdge, X, Y, W, 2.f);
	DrawRect(PanelEdge, X, Y + H - 2.f, W, 2.f);
	DrawRect(PanelEdge, X, Y, 2.f, H);
	DrawRect(PanelEdge, X + W - 2.f, Y, 2.f, H);
}

void AM3HUD::DrawBar(float X, float Y, float W, float H, float Percent, const FLinearColor& Fill, const FLinearColor& Back)
{
	DrawRect(Back, X, Y, W, H);
	DrawRect(Fill, X, Y, W * FMath::Clamp(Percent, 0.f, 1.f), H);
}

void AM3HUD::DrawLabel(const FString& Text, float X, float Y, const FLinearColor& Color, int32 FontSize, bool bBold)
{
	// AHUD::DrawText nhận UFont (font có sẵn của engine) chứ không nhận FSlateFontInfo.
	UFont* Font = nullptr;
	if (GEngine)
	{
		if (FontSize >= 22)      { Font = GEngine->GetLargeFont(); }
		else if (FontSize >= 14) { Font = GEngine->GetMediumFont(); }
		else                     { Font = GEngine->GetSmallFont(); }
	}
	DrawText(Text, Color, X, Y, Font, 1.f, false);
	(void)bBold;   // engine font không hỗ trợ tuỳ chọn đậm; giữ tham số cho dễ đọc code
}

void AM3HUD::DrawButton(AM3PlayerController* PC, const FName& Action, int32 MemberIndex, float X, float Y, float W, float H,
	const FString& Label, bool bEnabled, const FLinearColor& Color)
{
	const FLinearColor Fill = bEnabled ? Color : ButtonOff;
	DrawRect(Fill, X, Y, W, H);
	DrawRect(PanelEdge, X, Y, W, 2.f);

	FM3HudButton Button;
	Button.Action = Action;
	Button.MemberIndex = MemberIndex;
	Button.Min = FVector2D(X, Y);
	Button.Max = FVector2D(X + W, Y + H);
	Button.bEnabled = bEnabled;
	Buttons.Add(Button);

	DrawLabel(Label, X + 8.f, Y + H * 0.5f - 9.f, TextColor, 13, true);
	(void)PC;
}

// -----------------------------------------------------------------------------
// Panel hàng địch: vẽ TỪNG địch (quái thường / tinh anh / trùm giữa màn / trùm)
// kèm HP, thanh stagger, hành động sắp dùng và nút chọn mục tiêu.
// -----------------------------------------------------------------------------
void AM3HUD::DrawBossPanel(float ScreenW)
{
	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat || !Combat->IsBattleActive()) { return; }

	const M3::FBattle& Battle = Combat->GetBattle();
	const int32 Count = FMath::Max(1, Combat->GetEnemyCount());

	const float CardW = 214.f;
	const float Gap = 10.f;
	const float TotalW = Count * CardW + (Count - 1) * Gap;
	const float X0 = FMath::Max(16.f, ScreenW * 0.5f - TotalW * 0.5f);
	const float Y = 16.f;

	// Thanh tiêu đề: số địch còn sống + turn + lượt nối
	DrawPanel(X0, Y, TotalW, 26.f, PanelColor);
	DrawLabel(FString::Printf(TEXT("HÀNG ĐỊCH %d/%d   |   Turn %d   |   Lượt nối còn %d/%d"),
		Combat->GetEnemyAliveCount(), Count, Battle.Turn(), Battle.MovesLeft(), Battle.Balance().MovesPerTurn),
		X0 + 12.f, Y + 5.f, TextColor, 13, true);

	const int32 Target = Combat->GetTargetEnemy();

	for (int32 Index = 0; Index < Count; ++Index)
	{
		const float X = X0 + Index * (CardW + Gap);
		const float CY = Y + 34.f;

		const bool bAlive = Combat->IsEnemyAlive(Index);
		const bool bTargeted = (Index == Target);
		const bool bBroken = Combat->IsEnemyBroken(Index);

		// Màu thẻ theo cấp bậc địch
		const int32 Tier = Combat->GetEnemyTier(Index);
		FLinearColor CardColor(0.05f, 0.06f, 0.09f, bAlive ? 0.85f : 0.45f);
		if (Tier == 1) { CardColor = FLinearColor(0.06f, 0.12f, 0.22f, bAlive ? 0.85f : 0.45f); }
		else if (Tier == 2) { CardColor = FLinearColor(0.20f, 0.12f, 0.04f, bAlive ? 0.85f : 0.45f); }
		else if (Tier >= 3) { CardColor = FLinearColor(0.24f, 0.05f, 0.09f, bAlive ? 0.85f : 0.45f); }

		DrawPanel(X, CY, CardW, 132.f, CardColor);
		if (bTargeted) { DrawRect(FLinearColor(1.f, 0.72f, 0.18f, 0.95f), X, CY, CardW, 3.f); }

		const FString Name = FString::Printf(TEXT("%s  [%s]%s"),
			*Combat->GetEnemyName(Index),
			*Combat->GetEnemyTierName(Index),
			bAlive ? TEXT("") : TEXT("  (đã gục)"));
		DrawLabel(Name, X + 8.f, CY + 8.f, bAlive ? TextColor : DimColor, 12, true);

		// HP
		DrawBar(X + 8.f, CY + 28.f, CardW - 16.f, 12.f, Combat->GetEnemyHpPercent(Index), BossBar,
			FLinearColor(0.12f, 0.05f, 0.07f, 0.9f));

		// Thanh stagger (quái thường không có -> bỏ trống)
		const float StaggerPct = Combat->GetEnemyStaggerPercent(Index);
		if (StaggerPct > 0.f || bBroken)
		{
			if (bBroken)
			{
				DrawLabel(TEXT("STAGGER ĐÃ VỠ (đang ngất)"), X + 8.f, CY + 44.f, FLinearColor(1.f, 0.9f, 0.3f), 12, true);
				DrawBar(X + 8.f, CY + 60.f, CardW - 16.f, 8.f, 1.f, StaggerBar, FLinearColor(0.10f, 0.09f, 0.05f, 0.9f));
			}
			else
			{
				DrawLabel(TEXT("Thanh stagger"), X + 8.f, CY + 44.f, DimColor, 12);
				DrawBar(X + 8.f, CY + 60.f, CardW - 16.f, 8.f, StaggerPct, StaggerBar, FLinearColor(0.10f, 0.09f, 0.05f, 0.9f));
			}
		}
		else
		{
			DrawLabel(TEXT("Không có thanh stagger"), X + 8.f, CY + 44.f, DimColor, 11);
		}

		// Hành động sắp dùng (UI cảnh báo trước, giống thẻ địch bản web)
		if (bAlive)
		{
			DrawLabel(FString::Printf(TEXT("Kế tiếp: %s"), *Combat->GetEnemyIntentName(Index)),
				X + 8.f, CY + 76.f, FLinearColor(1.f, 0.85f, 0.55f), 11);
		}

		// Nút chọn mục tiêu (bấm vào thẻ để dồn sát thương vào địch này)
		const bool bCanTarget = bAlive && !bTargeted;
		DrawButton(nullptr, TEXT("target"), Index, X + 8.f, CY + 96.f, CardW - 16.f, 24.f,
			bTargeted ? TEXT("ĐANG NGẮM") : TEXT("Chọn làm mục tiêu"), bCanTarget,
			FLinearColor(0.20f, 0.30f, 0.48f));
	}
}

// -----------------------------------------------------------------------------
// Panel story: chương + tên màn + thoại mở màn
// -----------------------------------------------------------------------------
void AM3HUD::DrawStoryPanel(float ScreenW)
{
	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat || !Combat->IsBattleActive()) { return; }

	const FString Chapter = Combat->GetStoryChapterTitle();
	const FString StageTitle = Combat->GetStoryStageTitle();
	if (Chapter.IsEmpty() && StageTitle.IsEmpty()) { return; }

	const int32 LineCount = Combat->GetStoryIntroCount();
	const float W = 560.f;
	const float H = 64.f + FMath::Min(3, LineCount) * 18.f;
	const float X = 20.f;
	const float Y = 700.f;
	(void)ScreenW;

	DrawPanel(X, Y, W, H, PanelColor);
	DrawLabel(Chapter, X + 14.f, Y + 8.f, FLinearColor(0.72f, 0.62f, 1.f), 12, true);
	DrawLabel(StageTitle, X + 14.f, Y + 26.f, TextColor, 14, true);

	for (int32 i = 0; i < FMath::Min(3, LineCount); ++i)
	{
		DrawLabel(Combat->GetStoryIntroLine(i), X + 14.f, Y + 48.f + i * 18.f, DimColor, 12);
	}
}

// -----------------------------------------------------------------------------
// Panel đội hình: từng nhân vật + nút kỹ năng/ultimate
// -----------------------------------------------------------------------------
void AM3HUD::DrawTeamPanel(AM3PlayerController* PC)
{
	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat) { return; }

	const M3::FBattle& Battle = Combat->GetBattle();
	const M3::FParty& Party = Battle.Party();

	const float X = 20.f;
	float Y = 150.f;
	const float W = 400.f;
	const float RowH = 76.f;

	DrawPanel(X, Y - 26.f, W, RowH * Party.MemberCount() + 34.f, PanelColor);
	DrawLabel(TEXT("ĐỘI HÌNH"), X + 14.f, Y - 20.f, TextColor, 14, true);

	for (int32 Index = 0; Index < Party.MemberCount(); ++Index)
	{
		const M3::FCharacterState* Member = Party.TryGet(Index);
		if (!Member) { continue; }

		const M3::FSkillDefinition Basic = M3::FSkillCatalog::BasicForRole(Member->Def.Role);
		const M3::FSkillDefinition Ult = M3::FSkillCatalog::UltimateForRole(Member->Def.Role);

		const FLinearColor RoleColor = M3Conv::RoleToLinearEM3(M3Conv::FromCore(Member->Def.Role));
		DrawRect(Member->bAlive ? RoleColor : FLinearColor(0.3f, 0.3f, 0.3f), X + 6.f, Y + 4.f, 4.f, RowH - 14.f);

		const FString NameLine = FString::Printf(TEXT("%d. %s  [%s]%s"),
			Index + 1,
			*M3Conv::Utf8(Member->Def.Name),
			*M3Conv::Utf8(std::string(M3::RoleName(Member->Def.Role))),
			Member->bAlive ? TEXT("") : TEXT("  (đã gục)"));

		DrawLabel(NameLine, X + 16.f, Y, TextColor, 13, true);

		// Màu block của nhân vật
		if (Member->Def.MatchColor != M3::EColor::None)
		{
			DrawLabel(FString::Printf(TEXT("Nối màu %s"), *M3Conv::Utf8(std::string(M3::ColorName(Member->Def.MatchColor)))),
				X + 16.f, Y + 18.f, M3Conv::ColorToLinear(Member->Def.MatchColor), 12);
		}
		else
		{
			DrawLabel(TEXT("Không có block - kích hoạt bằng điều kiện riêng"), X + 16.f, Y + 18.f, DimColor, 12);
		}

		// HP
		DrawBar(X + 16.f, Y + 34.f, 220.f, 10.f, Member->HpPercent(), HpBar, FLinearColor(0.08f, 0.10f, 0.12f, 0.9f));

		// Thanh ultimate
		const float UltPercent = static_cast<float>(Member->UltimateCharge) / static_cast<float>(FMath::Max(1, Battle.Balance().UltimateMaxCharge));
		DrawBar(X + 16.f, Y + 47.f, 220.f, 7.f, UltPercent, UltBar, FLinearColor(0.08f, 0.08f, 0.12f, 0.9f));

		// Nút kỹ năng (phím tắt 1..6)
		const bool bSkillReady = Member->bAlive && Member->BasicCooldown <= 0;
		const FString SkillLabel = (Member->BasicCooldown > 0)
			? FString::Printf(TEXT("[%d] %s (%d)"), Index + 1, *M3Conv::Utf8(Basic.Name), Member->BasicCooldown)
			: FString::Printf(TEXT("[%d] %s"), Index + 1, *M3Conv::Utf8(Basic.Name));
		DrawButton(PC, TEXT("skill"), Index, X + 250.f, Y + 2.f, 140.f, 26.f, SkillLabel, bSkillReady, ButtonOn);

		// Nút ultimate (phím NumPad 1..6)
		const bool bUltReady = Member->bAlive && Member->UltimateCharge >= Battle.Balance().UltimateMaxCharge;
		const FString UltLabel = FString::Printf(TEXT("[Num%d] %s"), Index + 1, *M3Conv::Utf8(Ult.Name));
		DrawButton(PC, TEXT("ultimate"), Index, X + 250.f, Y + 32.f, 140.f, 26.f, UltLabel, bUltReady,
			FLinearColor(0.36f, 0.20f, 0.62f));

		Y += RowH;
	}

	// Nút điều khiển chung
	DrawButton(PC, TEXT("endturn"), -1, X + 16.f, Y + 2.f, 118.f, 28.f, TEXT("Kết thúc turn (Tab)"), true, ButtonOn);
	DrawButton(PC, TEXT("restart"), -1, X + 142.f, Y + 2.f, 100.f, 28.f, TEXT("Chơi lại (R)"), true, ButtonOff);
	DrawButton(PC, TEXT("nextstage"), -1, X + 250.f, Y + 2.f, 140.f, 28.f, TEXT("Map kế tiếp (N)"), true, ButtonOff);
}

// -----------------------------------------------------------------------------
// Panel thông tin: nhiệm vụ (challenge), số sao, vật cản
// -----------------------------------------------------------------------------
void AM3HUD::DrawInfoPanel(float ScreenW, float ScreenH)
{
	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat) { return; }

	const M3::FBattle& Battle = Combat->GetBattle();
	const std::vector<M3::FChallenge>& Challenges = Battle.Challenges();

	const float W = 380.f;
	const float X = ScreenW - W - 20.f;
	const float Y = 150.f;
	const float H = 120.f + Challenges.size() * 24.f;

	DrawPanel(X, Y, W, H, PanelColor);
	DrawLabel(FString::Printf(TEXT("NHIỆM VỤ MAP (map %d)"), Combat->GetStageIndex() + 1), X + 14.f, Y + 12.f, TextColor, 14, true);

	float Row = Y + 40.f;
	for (const M3::FChallenge& Challenge : Challenges)
	{
		const FString Mark = Challenge.bCompleted ? TEXT("[x]") : TEXT("[ ]");
		DrawLabel(Mark + TEXT(" ") + M3Conv::Utf8(Challenge.Description), X + 14.f, Row,
			Challenge.bCompleted ? HpBar : DimColor, 13);
		Row += 24.f;
	}

	DrawLabel(FString::Printf(TEXT("Vật cản trên bàn: %d"), Battle.Board().ObstacleCount()), X + 14.f, Row + 6.f, DimColor, 13);
	DrawLabel(FString::Printf(TEXT("Sát thương đã gây: %.0f   |   Đã nhận: %.0f"),
		Battle.TotalDamageDealt(), Battle.TotalDamageTaken()), X + 14.f, Row + 26.f, DimColor, 13);
	DrawLabel(Combat->IsFinished()
		? FString::Printf(TEXT("Kết quả: %s"), Combat->IsVictory() ? TEXT("THẮNG") : TEXT("THUA"))
		: FString::Printf(TEXT("Sao hiện tại: %d"), Combat->GetStars()), X + 14.f, Row + 46.f, TextColor, 13, true);
	(void)ScreenH;
}

// -----------------------------------------------------------------------------
// Panel log: 10 dòng gần nhất (đọc trực tiếp từ lõi game)
// -----------------------------------------------------------------------------
void AM3HUD::DrawLogPanel(float ScreenW)
{
	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat) { return; }

	const std::vector<std::string>& Lines = Combat->GetBattle().LogLines();
	const int32 Count = FMath::Min<int32>(10, static_cast<int32>(Lines.size()));
	if (Count <= 0) { return; }

	const float W = 760.f;
	const float H = 20.f + Count * 20.f;
	const float X = ScreenW - W - 20.f;
	const float Y = 460.f;

	DrawPanel(X, Y, W, H, PanelColor);
	DrawLabel(TEXT("NHẬT KÝ TRẬN"), X + 14.f, Y + 8.f, TextColor, 13, true);

	const int32 Start = static_cast<int32>(Lines.size()) - Count;
	for (int32 i = 0; i < Count; ++i)
	{
		DrawLabel(M3Conv::Utf8(Lines[static_cast<size_t>(Start + i)]), X + 14.f, Y + 28.f + i * 20.f, DimColor, 12);
	}
}

void AM3HUD::DrawGameOverBanner(float ScreenW, float ScreenH)
{
	UM3CombatSubsystem* Combat = GetCombat();
	if (!Combat) { return; }

	const bool bWin = Combat->IsVictory();
	const FString Text = bWin
		? FString::Printf(TEXT("CHIẾN THẮNG  -  %d ★"), Combat->GetStars())
		: TEXT("THẤT BẠI  -  bấm R để chơi lại");

	const FLinearColor Color = bWin ? FLinearColor(0.15f, 0.5f, 0.25f, 0.85f) : FLinearColor(0.5f, 0.12f, 0.15f, 0.85f);
	DrawRect(Color, ScreenW * 0.5f - 300.f, ScreenH * 0.5f - 50.f, 600.f, 100.f);
	DrawLabel(Text, ScreenW * 0.5f - 210.f, ScreenH * 0.5f - 12.f, TextColor, 26, true);
}

// -----------------------------------------------------------------------------
// Click
// -----------------------------------------------------------------------------
bool AM3HUD::HandleClickAt(const FVector2D& ScreenPosition, AM3PlayerController* PC)
{
	if (!PC) { return false; }

	for (const FM3HudButton& Button : Buttons)
	{
		if (!Button.Contains(ScreenPosition)) { continue; }

		if (Button.Action == TEXT("skill"))         { PC->HandleSkill(Button.MemberIndex, false); }
		else if (Button.Action == TEXT("ultimate")) { PC->HandleSkill(Button.MemberIndex, true); }
		else if (Button.Action == TEXT("endturn"))  { PC->HandleEndTurn(); }
		else if (Button.Action == TEXT("restart"))  { PC->HandleRestart(); }
		else if (Button.Action == TEXT("nextstage")){ PC->HandleNextStage(); }
		else if (Button.Action == TEXT("target"))
		{
			// Click thẻ địch -> dồn sát thương vào con đó.
			if (UM3CombatSubsystem* Combat = GetCombat())
			{
				Combat->SetTargetEnemy(Button.MemberIndex);
			}
		}

		return true;   // đã xử lý click, không chọn ô trên bàn nữa
	}
	return false;
}
