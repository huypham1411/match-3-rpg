# MatchRPG — Thiết kế hệ thống

Tài liệu này ánh xạ từng yêu cầu thiết kế sang nơi nó được cài đặt, và ghi lại những
chỗ tôi phải diễn giải cho rõ nghĩa. Mọi con số tinh chỉnh nằm trong
`FEffectScaleRules` và `FBoardRules` (`Source/MatchRPG/Public/Core/MatchTypes.h`), sinh
ra từ `MatchRPG::ContentCore::BuildDefaultScales()` / `BuildDefaultBoardRules()`.

---

## 1. Bàn match-3

Trạng thái bàn là dữ liệu thuần: `FMatchBoardCore` giữ `TArray<FBlockCell>`, toạ độ
`(0,0)` ở góc trên trái, `+Y` hướng xuống nên trọng lực kéo về `Y` tăng dần.

Một `FBlockCell` gồm: màu (5 màu: Red, Blue, Green, Yellow, Purple), loại (rỗng / khối
thường / vật cản), loại vật cản, khối đặc biệt, HP vật cản, cờ bị khoá, cờ bị jam.

### Nhận diện match

`FMatchFinderCore::FindGroups()` chạy ba lượt đánh dấu rồi hợp nhất:

1. Quét mọi đoạn ngang dài ≥ 3 cùng màu và liền mạch.
2. Quét mọi đoạn dọc dài ≥ 3.
3. Quét mọi ô vuông 2×2 cùng màu (chỉ khi `bEnableSquareMatch`).

Sau đó các ô được đánh dấu được hợp nhất thành từng nhóm liên thông cùng màu. Nhờ vậy
hình chữ L, chữ T hay dấu cộng tự nhiên trở thành một nhóm duy nhất.

Phân loại nhóm (`ClassifyGroup`) theo thứ tự: một hàng hoặc một cột duy nhất thì
`Line3` / `Line4` / `Line5`; không thẳng và đúng 4 ô thì là ô vuông `Square4`; còn lại là
`LTShape`.

### Khối đặc biệt sinh ra từ match

| Hình match | Khối đặc biệt | Hành vi khi kích hoạt |
| --- | --- | --- |
| 3 ô thẳng | không | chỉ tính là trigger |
| 4 ô thẳng | `LineRow` / `LineCol` | xoá toàn bộ hàng hoặc cột chứa nó |
| 4 ô vuông 2×2 | `SquareBreaker` | phá vật cản trong bán kính 1 quanh nó, đồng thời xoá 8 ô kề |
| 5 ô hình L/T | `AreaBomb` | xoá vùng 3×3 |
| 5 ô thẳng | `SwapAll` | kích hoạt mọi khối cùng màu với khối nó vừa đổi chỗ |

Hai điểm cần nói rõ vì đề bài không nói tuyệt đối:

- **"match-4 vuông"** được hiểu là **ô vuông 2×2 cùng màu** (bốn ô xếp thành hình vuông),
  và đây là khối chuyên phá vật cản: nó gây `SquareObstacleDamage` (mặc định 2) lên mọi
  vật cản trong bán kính `SquareObstacleRadius` (mặc định 1). Với HP mặc định, Ice (2 HP)
  vỡ ngay, Rock (3 HP) chỉ nứt.
- **"match-5: kích hoạt toàn bộ các block được đổi chỗ với nó"** được cài theo nghĩa
  color-bomb cổ điển: khối SwapAll nhớ màu của khối nó vừa bị đổi chỗ cùng
  (`FBlockCell::SwapAllColor`), và khi được đổi chỗ thì mọi khối cùng màu đó trên bàn cùng
  phát nổ. Cờ `bMatch5AlsoClearsOwnLine` cho phép bật thêm cách hiểu dự phòng (xoá luôn
  hàng và cột của chính nó) nếu sau này muốn đổi.

Nhánh xử lý này nằm ở `FMatchResolver::ProcessStep()`; khối đặc biệt nằm trong tập
trigger sẽ tự mở rộng vùng nổ, và các khối đặc biệt mở rộng vào nhau tạo thành dây chuyền.

### Trọng lực và refill

`ApplyGravity()` nén từng cột từ dưới lên; Rock và Crate không rơi nên chặn cột phía trên
chúng. `Refill()` lấp các lỗ từ trên xuống: vật cản mà boss xếp hàng đợi (`EnqueueSpawn`)
rơi vào trước, sau đó mới tới khối màu ngẫu nhiên. Sau mỗi bước, `FMatchResolver` lặp lại
việc dò match cho tới khi bàn đứng yên, tối đa `MaxCascadeDepth` bước.

### Vật cản

Bảng `GetObstacleProfile()` quy định từng loại:

| Loại | HP | Match thường làm được gì | Đặc biệt làm được gì | Ghi chú |
| --- | --- | --- | --- | --- |
| Ice | 2 | có sát thương | có | "mồi" cho mục tiêu challenge |
| Rock | 3 | không | có | chặn cột, không rơi |
| Crate | 2 | không | có | chặn cột, không rơi, không match được |
| Chain | 1 | có | có | khoá ô, không đổi chỗ được |

Khối thường vừa bị kích hoạt sẽ "va" vào vật cản kề nó (4 hướng) và gây 1 sát thương nếu
loại vật cản đó cho phép — đây là cách Ice tan dần bằng match-3 thuần.

### Debuff lên bàn

Boss có thể jam một màu (`JamCellsOfColor`) khiến các khối màu đó không match được trong
N lượt, hoặc khoá ngẫu nhiên N ô. Cả hai đếm ngược bằng `TickTemporaryFlags()` gọi ở mỗi
lần kết thúc lượt.

---

## 2. Vòng turn

`FBattleSimCore` là một máy trạng thái chạy headless, gồm 4 pha: `PlayerTurn`,
`BossTurn`, `Victory`, `Defeat`.

Một lượt của người chơi:

1. `BeginPlayerTurn()`: nạp lại `MovesPerTurn` lượt đổi chỗ, xử lý hết trận đang tồn
   đọng trên bàn, và tự xáo bàn nếu không còn nước đi hợp lệ.
2. Người chơi đổi chỗ từng nước. Mỗi nước hợp lệ tốn 1 lượt và chạy toàn bộ dây chuyền.
3. Hết lượt (hoặc người chơi bấm kết thúc sớm) thì tới `EndPlayerTurn()`.

Thứ tự trong `EndPlayerTurn()` quan trọng và được cố ý sắp như sau:

1. **Upkeep trước**: trạng thái đếm ngược một nhịp, hồi máu/độc theo thời gian, thanh nạp
   ultimate cộng thêm, hồi chiêu kỹ năng thủ công.
2. **Nội tại Defender**: nếu lượt này người chơi không làm gì, cả đội nhận `DamageCut`
   60% cho pha boss sắp tới. Đặt *sau* upkeep để nó không bị trừ mất trước khi boss hành động.
3. **Deflector**: nếu đã tích đủ 4 điểm (chỉ nhận từ match-4 và 5), tiêu hết và trừ
   `DeflectorStaggerPercent` (25%) thanh stagger tối đa, kèm khiên giảm sát thương.
4. **Pha boss**: boss thực thi hành động kế tiếp trong kịch bản.
5. Sang lượt mới, trừ khi hết `TurnLimit` (thua) hoặc đã phân thắng bại.

Kết thúc lượt của boss thì bàn được nén lại và refill, nên vật cản boss vừa thả sẽ hiện ra
ngay ở nửa trên của bàn.

---

## 3. Sáu vai trò

Kết nối giữa người chơi và nhân vật là **màu khối gắn với nhân vật**
(`FCharacterDefinitionRow::BoundColor`). Match màu nào thì mọi nhân vật gắn màu đó hành
động; hai nhân vật cùng màu sẽ cùng kích hoạt (đây là một trục chiến thuật, không phải lỗi).

| Vai trò | Hành động khi match | Công thức |
| --- | --- | --- |
| Attacker | sát thương boss | `Atk × f(combo) × cascade × (1 + bonus thuộc tính) × hệ số buff` |
| Supporter | buff cả đội + debuff boss | số stack và số lượt đều tăng theo combo; debuff lên boss làm thanh stagger tụt thêm |
| Healer | hồi máu | `HealPower × g(combo)` với `g` là **cấp số nhân** `1.18^(số ô vượt mức)` |
| Defender | sinh stack Guard cho đội | `DefenderGuardStacksPerMatch × (số ô − 2)`, mỗi stack giảm 3% sát thương nhận vào |
| Counter | sát thương | chỉ mạnh khi boss đã vỡ stagger (×2.2); khi chưa vỡ chỉ còn ×0.3 |
| Deflector | không ăn theo match màu | chỉ tích điểm từ match-4 / ô vuông / match-5, rồi tiêu ở cuối lượt |

Bảng hệ số nằm ở `FEffectScaleRules`, hằng số hành vi ở `ContentCore::BuildSkillLibrary`.
Ví dụ attacker với 3 ô là ×1.0; 6 ô là ×2.35; 9 ô là ×4.45, trần ×12.

Healer cố tình tăng theo cấp số nhân như đề bài yêu cầu, nên combo lớn là nguồn hồi máu
chính; trần `HealMaxMultiplier` (24×) giữ cho nó không phá vỡ cân bằng.

Supporter giữ đúng vai "ít sát thương nhưng đổi cục diện": mỗi match cấp `AtkUp` cho đội và
`AtkDown` cho boss, số stack và số lượt cùng tăng theo combo, và vì là debuff lên boss nên
nó cũng bào thanh stagger — đúng câu "debuff tăng stagger".

Xoá một vật cản không nằm trong tay nhân vật nào; nó là kết quả của match-4 vuông, khối đặc
biệt và va chạm kề.

---

## 4. Thanh stagger

`FBattleBossState::Stagger` khởi đầu đầy và **giảm** khi boss ăn sát thương:

```text
stagger_mất = sát_thương × StaggerPerDamage × (1 + tổng StaggerUp)
```

Với mặc định 0.65, mỗi điểm sát thương lấy đi 0.65 điểm stagger. Debuff supporter còn trừ
thêm một lần `StaggerMax × StaggerFromDebuff × số_stack`.

Khi thanh về 0 → **break**:

- `BreakCount` tăng, log ghi sự kiện `Break` để mục tiêu challenge đếm được.
- Mọi nhân vật Counter trong đội lập tức phang một đòn nặng (log `Retaliate`).
- Sát thương lên boss tăng `BreakDamageBonus` (30%).
- Thời gian break tính bằng **số lượt người chơi** (`BreakTurnsLeft` đếm ngược ở đầu
  `BeginPlayerTurn`), nên break rơi vào giữa lượt vẫn còn nguyên lượt kế tiếp để tận dụng.
- Hết break thì `StaggerMax` nhân `BreakStaggerGrowth` (1.25) — lần sau khó phá hơn, đúng
  kiểu GBF.

---

## 5. Ultimate và chain burst

Mỗi nhân vật có thanh riêng 0–100, nạp từ ba nguồn: cộng cố định 12 mỗi lần kết thúc lượt,
1.5 mỗi ô cùng màu được kích hoạt, 4.0 mỗi khối đặc biệt được kích hoạt.

Bấm `1`–`6` để bắn khi đã đầy. Bắn liên tiếp trong cùng một lượt sẽ cộng dồn chuỗi: mỗi
bậc cộng 15% sát thương, và khi chuỗi đạt `FullBurstChainLength` (3) thì kích hoạt
**Full Burst** — cộng thêm 50% sát thương nhân với `ChainWeight` của từng ultimate, kèm
60% hiệu lực stagger. Chuỗi reset đầu mỗi lượt, nên muốn Full Burst thì phải dồn thanh.

Kỹ năng thủ công tách khỏi tài nguyên lượt: chúng chỉ có hồi chiêu (2–4 lượt) nên không
tranh chấp với số lượt đổi chỗ, tránh việc kỹ năng biến thành "thêm nước đi miễn phí" phá
cân bằng. Muốn đổi luật này chỉ cần cho `FireManualSkill` trừ lượt.

Hiệu ứng kỹ năng nằm trong `FSkillEffectRow`: sát thương, hồi máu, gắn trạng thái lên đội
hoặc boss, xoá vật cản, gỡ debuff bàn (jam/khoá), nạp thêm thanh, thêm lượt, thêm điểm
deflector, rút thẳng thanh stagger. Thêm kỹ năng mới = thêm một hàng dữ liệu, không phải
thêm nhánh `if`.

---

## 6. Gacha, đội hình, trang bị

`FGachaCore` chạy trên RNG có seed nên kết quả tái lập được: tỉ lệ 5★ nền 0.6%, soft pity
tăng dần trong 15 lượt cuối, pity cứng ở lượt 90 đảm bảo ra 5★.

Đội hình tối đa 6 slot (`MaxTeamSlots`). Mỗi slot có 3 slot trang bị
(`EquipmentSlotsPerCharacter`) và 1 slot pet đã chừa nhưng chưa mở (`bPetSlotUnlocked`).
Trang bị hiện cho chỉ số cộng thẳng (Atk/Hp/Def) và **bonus theo thuộc tính**: nếu màu
trang bị trùng màu khối đang được kích hoạt thì hiệu ứng màu đó được nhân thêm. Đây là
chỗ để phát triển sâu hơn (set bonus, hiệu ứng riêng) mà không phải đổi kiến trúc.

Bốn nhân vật khởi đầu: Rook (Attacker, Red), Lyra (Supporter, Blue), Mira (Healer, Green),
Bastion (Defender, Yellow). Pool gacha thêm Vex (Counter, Purple) và Kite (Deflector, Blue)
cùng vài nhân vật 3★/5★ khác.

---

## 7. Màn chơi, challenge và xếp hạng

`FStageDefinitionRow` gói toàn bộ: luật bàn, hệ số, kịch bản boss, mục tiêu, số lượt mỗi
turn, giới hạn turn, ngưỡng turn để lấy sao.

Mục tiêu (`FChallengeObjectiveRow`) có 6 loại: xoá đủ vật cản một loại, hoàn thành trong N
lượt, không ai gục, kích hoạt đủ khối đặc biệt, phá stagger N lần, đạt mốc điểm. Mục tiêu
`bPrimary` bắt buộc cho sao thứ hai; mục tiêu phụ cần thêm cho sao thứ ba.

Xếp hạng: thắng = 1 sao, đạt hết mục tiêu chính = 2 sao, đạt thêm cả mục tiêu phụ = 3 sao.

Kịch bản boss mặc định của màn demo là một vòng 7 hành động: thả 4 Ice, AoE toàn đội, debuff
AtkDown lên đội, jam một màu ngẫu nhiên, đánh nặng một mục tiêu, thả 2 Rock, khoá 3 ô. Dưới
50% máu boss vào trạng thái enrage, đòn AoE mạnh hơn 1.6 lần.

---

## 8. Tinh chỉnh cân bằng

Hầu hết câu hỏi cân bằng trả lời được bằng cách sửa một dòng trong
`ContentCore::BuildDefaultScales()`:

| Muốn gì | Sửa ở đâu |
| --- | --- |
| Attacker mạnh hơn theo combo | `DamagePerBlock`, `DamageQuadratic`, `DamageMaxMultiplier` |
| Healer hồi ít/mạnh hơn | `HealGrowthPerBlock`, `HealMaxMultiplier` |
| Buff lâu hơn | `BuffDurationAtBase`, `BuffDurationPerExtraBlock` |
| Boss vỡ stagger nhanh hơn | `StaggerPerDamage`, `StaggerFromDebuff` |
| Break lâu hơn | `BreakDurationTurns` |
| Deflector xoá nhiều stagger hơn | `DeflectorStaggerPercent` |
| Đội chịu đòn tốt hơn khi đứng yên | `DefenderIdleDamageCut` |
| Full Burst dễ/mạnh hơn | `FullBurstChainLength`, `FullBurstDamageBonus` |
| Bàn dễ hơn (nhiều màu hơn) | `FBoardRules::ColorCount` |
| Ô vuông 2×2 mạnh hơn | `SquareObstacleDamage`, `SquareObstacleRadius` |

Sau mỗi lần đổi, chạy lại `Tools/host_tests/build_and_run.sh` — bộ test có các khẳng định
về trần và về quan hệ lớn/nhỏ giữa các bậc combo, nên đổi số sai hướng sẽ bị bắt ngay.

---

## 9. Vì sao tách lõi khỏi Unreal

Toàn bộ luật chơi nằm trong `Source/MatchRPG/Private/Core` và không tham chiếu `UObject`,
`AActor` hay bất kỳ thứ gì cần engine. `MatchCoreCompat.h` cấp một lớp mỏng để các file đó
biên dịch được ở cả hai môi trường:

- Trong Unreal: dùng `CoreMinimal.h` và các kiểu thật (`TArray`, `FIntPoint`, `FMath`).
- Ngoài Unreal: `-DMATCHRPG_STANDALONE_CORE` bật một shim tí hon dựa trên `std::vector`
  và `std::cmath`, chỉ cung cấp đúng những API mà lõi dùng.

Nhờ vậy tầng Unreal chỉ còn là hiển thị và input, còn luật game được kiểm thử tự động bằng
trình biên dịch thường — kể cả trên máy chưa cài Unreal.

Hai điều cần lưu khi mở rộng lõi:

- Chỉ dùng các API shim đang có (`Num`, `Add`, `Emplace`, `Reset`, `SetNum`, `RemoveAt`,
  `Insert`, `Find`, `Last`, `IsValidIndex`, `Reserve`, toán tử `[]`) và vòng lặp theo chỉ số.
  Đừng thêm API "cho tiện" vào shim nếu không thật cần — hai thế giới dễ lệch nhau.
- Tránh `TArray<bool>`: trong UE nó là mảng thật, ngoài đời là `std::vector<bool>` dạng
  bitfield nên `operator[]` trả về proxy. Dùng `TArray<uint8>` với 0/1 như `FBattleResult`
  đang làm.
