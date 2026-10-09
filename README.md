# Match-3 Turn-based RPG (Unreal Engine 5.6, C++)

Game match-3 theo lượt (kiểu Candy Crush) kết hợp RPG đánh boss theo turn, đội hình
gacha. Toàn bộ **luật chơi nằm ở lớp C++ thuần**, lớp Unreal chỉ lo hình ảnh, input và UI —
nhờ vậy bạn thay model/asset thoải mái mà không phải động vào gameplay.

## 1. Trạng thái hiện tại

| Hạng mục | Kết quả |
|---|---|
| Build Unreal Engine 5.6 (Editor, Win64, Development) | Thành công (`Result: Succeeded`) |
| Bộ test luật chơi chạy độc lập (không cần UE) | 24/24 PASS |
| Bản chơi trên web (WebAssembly, dùng chung lõi luật chơi) | Thành công — 22/22 test WASM PASS |
| Chơi được trong level trống | Có (GameMode tự dựng sàn, đèn, bàn nối, boss, đội hình) |
| Asset 3D | Dùng hình cơ bản của engine, thay thế được qua Data Asset |
| Đã kiểm chứng bằng mắt (hình ảnh trong Editor) | Chưa — cần bạn mở Editor và bấm Play |

## 2. Yêu cầu môi trường

- Unreal Engine 5.6 (đã cài sẵn tại `C:\Program Files\Epic Games\UE_5.6`)
- Visual Studio 2022 kèm C++ toolset (MSVC) — đang dùng bản Build Tools 2022
- Không cần plugin hay asset ngoài nào

## 3. Cách chạy

### 3.1. Mở Editor và chơi

1. Mở file `Match3RPG.uproject` bằng Unreal Editor 5.6 (lần đầu Editor sẽ hỏi build lại C++ → chọn **Yes**).
2. Tạo một level trống (`File > New Level > Empty Level`) hoặc mở level bất kỳ, rồi bấm **Play**.
   GameMode mặc định (`AM3GameMode`) sẽ tự sinh: sàn, đèn, bàn nối 8x8, boss và 4 nhân vật.

Không cần đặt gì trong level: mọi thứ đều được sinh từ code.

### 3.2. Build bằng dòng lệnh

```bash
"C:\Program Files\Epic Games\UE_5.6\Engine\Build\BatchFiles\Build.bat" ^
  Match3RPGEditor Win64 Development -Project="D:\self\match-3-rpg\Match3RPG.uproject" -WaitMutex
```

### 3.3. Chạy bộ test luật chơi (không cần mở UE)

```bash
Tests\Core\build_and_run.bat
```

Script này biên dịch module lõi bằng `cl.exe` và chạy 24 test (dò match, special,
rơi block, vật cản, sát thương, hồi máu, buff, stagger/BREAK, counter, deflecter,
defender, ultimate chain, challenge, mô phỏng 300 nước đi liên tục...).

### 3.4. Bản chơi trên web (WebAssembly)

Unreal Engine 5.6 **không có nền tảng web**: trong bản cài này `Engine/Platforms` chỉ có
`Android, IOS, VisionOS, Windows`, UnrealBuildTool cũng không có platform HTML5/Web —
Epic đã bỏ target trình duyệt từ UE 4.24. Vì vậy bản web được làm theo cách khác, đúng
tinh thần của kiến trúc: **biên dịch chính lõi luật chơi (`Source/Match3Core`) sang
WebAssembly bằng Emscripten**, rồi bọc một giao diện web mỏng. Luật chơi vẫn chỉ có một
bản duy nhất, web và Unreal dùng chung.

```bash
# 1) Cài Emscripten SDK (một lần)
git clone https://github.com/emscripten-core/emsdk.git %USERPROFILE%\emsdk
cd %USERPROFILE%\emsdk && emsdk.bat install latest && emsdk.bat activate latest

# 2) Biên dịch lõi sang WASM -> Web\dist\m3core.mjs + m3core.wasm
Web\build_web.bat

# 3) (tuỳ chọn) kiểm tra tự động bản WASM bằng Node
node Web\smoke_test.mjs

# 4) Mở server tĩnh rồi vào http://127.0.0.1:8765/
py -3 -m http.server 8765 --bind 127.0.0.1 --directory Web
```

Trong bản web: click 2 ô kề nhau để đổi chỗ, phím `1`..`6` là kỹ năng, `NumPad 1`..`6`
là ultimate, `Tab` kết thúc turn, `H` xem gợi ý, `R` chơi lại, chọn map ở góc trên phải.

Lưu ý: bản web tái hiện phần **luật chơi** (bàn nối, 6 role, stagger/BREAK, ultimate
chain, vật cản, challenge); hình ảnh là CSS/DOM chứ không phải render 3D của Unreal.
Muốn "game Unreal chạy trong trình duyệt" đúng nghĩa render 3D thì phải dùng
**Pixel Streaming** (đóng gói bản Win64, bật plugin Pixel Streaming rồi nhúng web player),
vì UE không tự sinh target web được nữa.

## 4. Điều khiển

| Thao tác | Chức năng |
|---|---|
| Click ô 1 rồi click ô kề bên | Đổi chỗ 2 block = 1 lượt nối |
| Click lại ô đang chọn | Bỏ chọn |
| Phím `1`..`6` | Kỹ năng chủ động của nhân vật 1..6 |
| `NumPad 1`..`6` | Ultimate của nhân vật 1..6 |
| `Tab` / `Enter` / `Space` | Kết thúc turn sớm |
| `R` | Chơi lại map hiện tại |
| `N` | Sang map kế tiếp |
| Click nút trên HUD | Tương đương phím tắt tương ứng |

## 5. Kiến trúc

```text
match-3-rpg/
├─ Match3RPG.uproject
├─ Config/                       DefaultEngine / DefaultGame / DefaultInput
├─ Source/
│  ├─ Match3Core/                LÕI LUẬT CHƠI - C++ thuần, KHÔNG dùng API của UE
│  │  ├─ Public/M3Types.h        màu block, loại block, role, kết quả hành động
│  │  ├─ Public/M3Balance.h      toàn bộ con số cân bằng
│  │  ├─ Public/M3Board.h        bàn nối, swap, rơi/refill, vật cản
│  │  ├─ Public/M3Matcher.h      dò run >= 3, ô vuông 2x2, chọn special
│  │  ├─ Public/M3Resolver.h     xoá -> kích special -> rơi -> cascade
│  │  ├─ Public/M3Team.h         nhân vật, trang bị, pet, buff/debuff đội
│  │  ├─ Public/M3Skills.h       bảng kỹ năng + ultimate theo role
│  │  ├─ Public/M3Battle.h       vòng chơi turn-based (trái tim của game)
│  │  └─ Public/M3Content.h      nội dung mẫu: 6 nhân vật, trang bị, 3 map
│  └─ Match3RPG/                 LỚP UNREAL: hình ảnh, input, HUD
│     ├─ M3CombatSubsystem.*     cầu nối UE <-> lõi (BlueprintCallable)
│     ├─ M3BoardActor.*          vẽ bàn nối bằng mesh 3D, chọn ô
│     ├─ M3BossActor.*           hình boss (to/nhỏ theo máu, xoay khi BREAK)
│     ├─ M3PartyMemberActor.*    hình nhân vật (Skeletal Mesh thay được)
│     ├─ M3VisualSet.*           DATA ASSET chứa mesh/material/màu - chỗ thay asset
│     ├─ M3HUD.*                 giao diện vẽ bằng code (thay bằng UMG nếu muốn)
│     ├─ M3PlayerController.*    input: chọn ô, phím tắt
│     ├─ M3PlayerPawn.*          camera nhìn xuống bàn
│     └─ M3GameMode.*            tự dựng thế giới tối thiểu
├─ Tests/Core/                   test luật chơi + script build bằng cl.exe
├─ Web/                          bản chơi web dùng chung lõi luật chơi
│  ├─ m3_web_api.cpp             cầu nối C cho JavaScript (chỉ chuyển tiếp, không chứa luật)
│  ├─ index.html / style.css / m3ui.js    giao diện bản web
│  ├─ build_web.bat              biên dịch lõi sang WebAssembly bằng Emscripten
│  ├─ smoke_test.mjs             test bản WASM bằng Node
│  └─ dist/                      m3core.mjs + m3core.wasm (kết quả build)
└─ Build/                        log build (không cần commit)
```

### 5.1. Vì sao tách lõi ra khỏi UE?

- Luật chơi test được **không cần mở Editor** (chạy vài giây thay vì vài phút).
- Luật chơi không lệ thuộc asset → thay model, thay UI, thậm chí port sang engine khác đều dễ.
- Bug cân bằng (sát thương, hồi máu, stagger) tìm được bằng test thay vì ngồi chơi tay.

## 6. Luật chơi đã cài đặt ↔ vị trí trong code

| Thiết kế của bạn | Đã cài đặt | Nơi đọc code |
|---|---|---|
| Match-3 cơ bản như Candy Crush | swap 2 ô kề, xoá run >= 3, rơi lấp, cascade | `M3Board.cpp`, `M3Resolver.cpp` |
| Nối màu Attacker → sát thương boss | `ERole::Attacker`, sát thương theo số block × combo | `M3Battle.cpp::ComputeMatchDamage` |
| Nối màu Supporter → buff/debuff | stack tăng theo số block, tăng hệ số + số turn | `M3Battle.cpp::ApplySupportEffect` |
| Nối màu Healer → hồi máu | hồi theo **cấp số nhân**: `Atk × 0.2 × 1.55^(blocks-3)` (có chặn trần) | `M3Battle.cpp::ComputeHealAmount` |
| Match-4 vuông → tự phá vật cản/chướng ngại | nhóm 2x2 sinh `SquareBomb` + tự quét vật cản quanh cả khối 2x2 | `M3Matcher.cpp`, `M3Resolver.cpp` |
| Match-4 hàng/cột | sinh `LineClear` nổ cả hàng (hoặc cột) theo hướng run | `M3Matcher.cpp::FindMatches` |
| Match-5 → kích hoạt toàn bộ block đổi chỗ với nó | sinh `ColorBomb`; đổi chỗ với block nào thì kích hoạt **toàn bộ màu đó**; số block trigger càng nhiều → sát thương/buff/heal càng lớn | `M3Resolver.cpp::ResolveSwap_ColorBombKick` |
| Thanh stagger giảm khi boss nhận sát thương; debuff làm tăng lượng stagger | `StaggerPerDamage`, buff `StaggerPerStack` của Supporter | `M3Battle.cpp::ReduceStagger` |
| Counter chỉ kích hoạt khi stagger vỡ | tự động phản kích ngay khi BREAK; kỹ năng chủ động yêu cầu `bBroken` | `M3Battle.cpp::CheckStaggerBreak`, `UseBasicSkill` |
| Deflecter tích 4 lần match-4, cuối turn mới phát động | `DeflectStacks` 0..4, `EndTurn` phá thêm 25% stagger tối đa | `M3Battle.cpp::AdvanceTurn` |
| Defender: end turn mà không làm gì → giảm sát thương boss | buff giảm 50% sát thương khi turn không có hành động | `M3Battle.cpp::AdvanceTurn` |
| Mỗi turn có số lượt match nhất định | `Balance.MovesPerTurn` (mặc định 4) | `M3Balance.h` |
| Mỗi nhân vật có 1 kỹ năng cơ bản bấm tay | 6 role × 1 kỹ năng, có hồi chiêu, 1 lần/role/turn | `M3Battle.cpp::UseBasicSkill`, `M3Skills.cpp` |
| Ultimate nạp theo turn + theo block đúng màu | `UltimateChargePerTurn=12`, `+3/block`, đầy ở 100 | `M3Battle.h`, `M3Battle.cpp` |
| Ultimate chain nhau, có full burst | chain ×1.25 mỗi ultimate trong cùng turn; cả đội tung → FULL BURST | `M3Battle.cpp::UseUltimate` |
| Đội hình tối đa 6, mỗi người 3 trang bị, 1 pet | `FParty`: `kMaxMembers=6`, `kMaxEquipmentPerMember=3`, `UnlockPet` | `M3Team.h/.cpp` |
| Boss tạo vật cản lên bàn, AoE đội | 3 hành động luân phiên: AoE / tạo vật cản / debuff | `M3Battle.cpp::BossAction` |
| Challenge ảnh hưởng rating qua ải | 4 loại challenge → số sao 1..3 | `M3Battle.cpp::UpdateChallenges`, `EvaluateStars` |
| Gacha nhân vật | chưa có (đã tách `FCharacterDef` + `UnlockTier` để nối sau) | `M3Team.h` |

## 7. Thay model / asset 3D

### 7.1. Cách nhanh (không cần sửa code)

1. Trong Editor: `Content Browser > Chuột phải > Miscellaneous > Data Asset > M3VisualSet`
   → đặt tên, ví dụ `DA_VisualSet_Fantasy`.
2. Trong đó gán cho từng màu block: `Mesh`, `Material`, `Tint`, `Scale`, `ZOffset`
   (material nào có tham số vector tên `Color` thì màu sẽ được truyền vào).
   Gán tương tự cho `ObstacleVisual`, `LineClearVisual`, `SquareBombVisual`, `ColorBombVisual`,
   `BossVisual`, `FloorVisual`, `PartyMesh`.
3. Chọn actor `M3BoardActor` (hoặc `M3BossActor`, `M3GameMode`) trong level và gán Data Asset
   vào property `VisualSet`. Không có asset nào được gán thì game tự dùng hình cơ bản của engine.

### 7.2. Đổi model nhân vật

- Chưa có model: `M3VisualSet.PartyMesh` (mesh tĩnh) là chỗ đứng tạm.
- Có model: gán `SkeletalMeshToUse` + `AnimationBlueprintClass` cho từng
  `AM3PartyMemberActor` (hoặc mở rộng `M3GameMode::LayoutPartyActors` để sinh actor từ
  Blueprint con của bạn). Toàn bộ logic vẫn đọc từ `UM3CombatSubsystem`, không phụ thuộc mesh.

### 7.3. Đổi bàn cho đẹp hơn

`AM3BoardActor` đang dùng 1 `UStaticMeshComponent` cho mỗi ô (8x8 = 64). Muốn đẹp hơn:
thay bằng `UInstancedStaticMeshComponent` (1 draw call/màu) hoặc Niagara khi block nổ —
chỉ cần sửa `M3BoardActor.cpp`, phần luật chơi không đổi.

## 8. Chỉnh cân bằng

Mọi con số nằm ở `Source/Match3Core/Public/M3Balance.h`:

```text
DamagePerBlock        0.14   sát thương mỗi block của Attacker
ComboBonusPerCascade  0.20   mỗi tầng cascade +20% sát thương (trần x3)
HealPerBlock          0.20   hồi máu cơ bản
HealExpBase           1.55   hệ số cấp số nhân của Healer
StaggerPerDamage      0.35   bao nhiêu stagger bị trừ cho mỗi sát thương
BreakDurationTurns    2      số turn boss ngất khi vỡ stagger
DeflectStacksRequired 4      số stack match-4 của Deflecter
UltimateAttackerPower 3.0    hệ số Atk cho ultimate Attacker
MovesPerTurn          4      số lượt nối mỗi turn
```

Sửa xong chạy lại `Tests\Core\build_and_run.bat` để xem các con số thay đổi thế nào
(bộ test có in ra sát thương/hồi máu thực tế ở vài test).

## 9. Thêm nội dung

- Thêm nhân vật: sửa `FContentLibrary::StarterCharacters()` / `ExtraCharacters()` trong `M3Content.cpp`
  (hoặc về sau thay bằng Data Asset). Nhớ 4 role cơ bản phải có màu block; Defender/Counter/Deflecter
  để `MatchColor = EColor::None`.
- Thêm map: sửa `FContentLibrary::CampaignStages()` (máu boss, số vật cản, số lượt, đội hình).
- Thêm loại challenge mới: mở rộng `FChallenge::EKind` + `FBattle::UpdateChallenges()`.
- Thêm loại block mới: mở rộng `EBlockKind` rồi xử lý trong `M3Resolver.cpp::ExpandWithSpecials`.

## 10. Việc còn lại (gợi ý bước tiếp theo)

- Giao diện UMG thay cho HUD vẽ bằng code (dữ liệu đã sẵn qua `UM3CombatSubsystem`).
- Animation: khi `MarkChanged`/hành động thì phát animation (hiện chỉ nhún/nhấp nháy).
- Gacha, pet, trang bị có hiệu ứng đặc biệt, save/load.
- Chuyển nội dung từ `M3Content.cpp` sang Data Asset để designer chỉnh không cần build C++.
- Âm thanh, hiệu ứng nổ block, camera shake khi BREAK.
