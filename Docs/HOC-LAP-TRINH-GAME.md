# Học lập trình game với MatchRPG

Tài liệu này viết cho người **chưa từng làm game**. Nó chỉ cho bạn: chạy dự án bằng ba
cách khác nhau, hiểu một game match-3 vận hành ra sao, đọc code theo thứ tự nào, và gỡ
lỗi bằng cách nào. Cuối bài có bộ bài tập từ dễ đến khó, mỗi bài đều kiểm chứng được.

---

## 1. Ba cách chạy dự án

Bạn không cần Unreal Engine để học phần khó nhất. Luật chơi nằm ở một tầng code thuần,
chạy được trên máy tính thường.

### Cách 1 — Sân chơi tương tác (khuyên dùng để học)

```bat
Tools\playground\build_and_run.bat
```

Chương trình in ra bàn cờ bằng ký tự rồi chờ bạn gõ lệnh:

```text
matchrpg> play
matchrpg> swap 3 4 4 4
matchrpg> groups
matchrpg> cell 4 4
matchrpg> rules
matchrpg> quit
```

Gõ `help` để xem hết. Đây là nơi bạn nên nghịch trước tiên: mọi lệnh đều in ra **chuyện gì
đã xảy ra và vì sao**, ví dụ sau lệnh `groups` nó cho biết bộ dò match tìm thấy những nhóm
nào, hình dạng gì, và sẽ sinh ra khối đặc biệt nào.

Chạy `Tools\playground\build_and_run.bat --demo` để xem một nước đi mẫu rồi thoát.

### Cách 2 — Bộ test tự động

```bat
Tools\host_tests\build_and_run.bat
```

738 khẳng định về luật chơi, chạy trong vài giây. Mỗi lần bạn sửa luật, chạy lệnh này để
biết mình có làm vỡ thứ gì không. Khi một khẳng định sai, nó in ra tên test và dòng code.

### Cách 3 — Trong Unreal Engine (phần đồ hoạ)

Cần cài Unreal Engine 5.3 và Visual Studio 2022:

1. Chuột phải `MatchRPG.uproject` → **Generate Visual Studio project files**.
2. Mở `MatchRPG.sln`, build cấu hình **Development Editor**.
3. Mở `MatchRPG.uproject` bằng Unreal Editor.
4. **File → New Level → Empty Level**, rồi bấm **Play**.

Phím: chuột trái chọn ô và đổi chỗ, `Space` kết thúc lượt, `1`–`6` bắn ultimate,
`Q W E R T Y` dùng kỹ năng, `H` gợi ý, `G` quay gacha, `R` chơi lại.

---

## 2. Một game match-3 vận hành thế nào

Trước khi đọc code, nắm bốn ý này là đủ.

**Bàn cờ là một mảng hai chiều.** Bàn 8×8 = 64 ô. Trong code, "ô" là `FBlockCell` và cả
bàn là `TArray<FBlockCell>`. Ô ở cột `X`, hàng `Y` nằm ở vị trí `Y * 8 + X` trong mảng. Đây
là mẹo rất phổ biến: mảng một chiều nhưng tính chỉ số như hai chiều.

**Một nước đi là một lần đổi chỗ hai ô kề nhau.** Game không cho bạn "xoá" ô. Bạn chỉ đổi
chỗ, rồi luật tự quyết định việc đó có hợp lệ hay không: nó kiểm tra xem sau khi đổi, có
hàng hoặc cột nào đủ 3 ô cùng màu hay không. Nếu không thì nước đi bị huỷ và bạn không mất
lượt (xem `FMatchBoardCore::TrySwapAndValidate`).

**Sau khi nổ thì mọi thứ rơi xuống và lấp lại.** Ba việc theo thứ tự: xoá các ô đã nổ
(`clear`), cho các ô phía trên rơi xuống (`ApplyGravity`), rồi sinh ô mới ở trên cùng
(`Refill`). Ô mới rơi xuống có thể vô tình tạo match mới — đó là **cascade** (dây chuyền),
và là nguồn gây cảm giác sướng khi chơi.

**Mỗi lượt người chơi có một số nước đi hữu hạn.** Hết nước thì boss hành động. Đó là lý do
thể loại này gọi là "turn-based".

Vòng lặp của một lượt, trong code:

```text
BeginPlayerTurn  -> nạp lại 4 nước đi
   bạn đổi chỗ     -> ResolveSwap -> nổ, dây chuyền, trừ 1 nước
   bạn đổi chỗ     -> ...
   hết 4 nước      -> EndPlayerTurn
EndPlayerTurn    -> trạng thái đếm ngược, ultimate nạp, nội tại kích hoạt
   RunBossPhase  -> boss thả vật cản / đánh AoE / khoá màu
   turn tiếp theo
```

---

## 3. Đọc code theo thứ tự nào

Đừng mở file to nhất trước. Đọc đúng thứ tự này, mỗi bước 10–15 phút:

| Bước | File | Đọc để hiểu |
| --- | --- | --- |
| 1 | `Public/Core/MatchTypes.h` | Từ vựng của game: màu, vật cản, khối đặc biệt, vai trò, và hai bảng số `FBoardRules` / `FEffectScaleRules` |
| 2 | `Private/Core/MatchBoardCore.cpp` | Bàn cờ: sinh bàn, trọng lực, lấp ô, tìm nước đi hợp lệ |
| 3 | `Private/Core/MatchFinderCore.cpp` | Trái tim của match-3: dò nhóm, phân loại hình dạng, tạo khối đặc biệt, nổ dây chuyền |
| 4 | `Private/Core/CombatMathCore.cpp` | Toàn bộ công thức sát thương / hồi máu / stagger. Chỉ ~40 dòng |
| 5 | `Private/Core/BattleSimCore.cpp` | Vòng turn, vai trò nhân vật, boss. File dài nhất nên chia nhỏ |
| 6 | `Private/Core/ContentCore.cpp` | Dữ liệu: 11 nhân vật, kỹ năng, pool gacha, màn demo |

Tầng Unreal (`Blocks/`, `Board/`, `Game/`) đọc sau cùng. Nó chỉ hiển thị và nhận chuột —
không chứa luật chơi nào.

### Ví dụ đọc kỹ một hàm: `ApplyGravity`

Giả sử một cột chỉ có 4 hàng, và hàng thứ 2 (tính từ trên) vừa bị xoá:

```text
trước:            sau khi xoá ô (Y=2):        sau ApplyGravity:
Y=0  [Do]          Y=0  [Do]                   Y=0  (trống)
Y=1  [Xanh]        Y=1  [Xanh]                 Y=1  [Do]
Y=2  [Vang]  -->   Y=2  (trống)        -->     Y=2  [Xanh]
Y=3  [Tim]         Y=3  [Tim]                  Y=3  [Tim]
```

Code đọc từ **dưới lên** và giữ một biến `WriteY` là "chỗ sẽ điền tiếp theo":

```cpp
int32 WriteY = Height - 1;                       // bắt đầu từ hàng cuối
for (int32 Y = Height - 1; Y >= 0; --Y)          // duyệt từ dưới lên
{
    FBlockCell& Cell = At(X, Y);
    if (Cell.IsEmpty()) { continue; }            // ô trống thì bỏ qua, WriteY giữ nguyên

    if (Cell.IsNonFalling()) {                   // Rock/Crate không rơi
        WriteY = Y - 1;                          // mọi thứ phía trên dừng ngay trên nó
        continue;
    }

    if (WriteY != Y) {                           // có khoảng trống bên dưới -> rơi xuống
        At(X, WriteY) = Cell;
        Cell.Clear();
        ++Moved;
    }
    --WriteY;
}
```

Chạy thử với ví dụ trên: `WriteY` bắt đầu ở 3. Y=3 (Tim) điền vào 3, `WriteY` thành 2.
Y=2 trống, bỏ qua. Y=1 (Xanh) điền vào 2, `WriteY` thành 1. Y=0 (Do) điền vào 1. Kết quả đúng
như hình. Đây là kiểu suy nghĩ bạn nên tập: chạy tay một ví dụ nhỏ rồi mới tin code.

---

## 4. Gỡ lỗi từng bước

### Chuẩn bị một lần

Cài extension **C/C++** (`ms-vscode.cpptools`) trong VS Code. Xong.

### Cách chạy

Mở file cần xem, bấm vào lề trái để đặt **breakpoint** (chấm đỏ), rồi bấm **F5** và chọn:

- *Gỡ lỗi: bộ test lõi (gdb)* — chạy bộ test, dừng ở breakpoint của bạn.
- *Gỡ lỗi: sân chơi (gdb, gõ lệnh được)* — mở cửa sổ console riêng để bạn gõ lệnh game,
  và vẫn dừng được ở breakpoint.

Khi chương trình dừng, bạn xem được mọi biến ở cột trái, hoặc gõ vào khung **WATCH**.
Bấm **F10** để chạy qua một dòng, **F11** để chui vào trong hàm.

### Đặt breakpoint ở đâu cho từng câu hỏi

| Bạn muốn biết | Đặt breakpoint tại | Xem biến |
| --- | --- | --- |
| Nước đi này có hợp lệ không? | `FMatchBoardCore::TrySwapAndValidate` | `WouldMatchAt(A...)`, `WouldMatchAt(B...)` |
| Bộ dò match tìm ra nhóm nào? | `FMatchFinderCore::FindGroups` (cuối hàm) | `OutGroups` |
| Vì sao nhóm này thành khối đặc biệt kia? | `FMatchFinderCore::ClassifyGroup` | `Count`, `MinX/MaxX/MinY/MaxY`, `OutPivot` |
| Vì sao ra chừng này sát thương? | `CombatMath::ComputeDamageMultiplier` | `Extra`, `Linear`, `Quadratic`, `Raw` |
| Boss vỡ stagger ở đâu? | `FBattleSimCore::HandleStaggerBreak` | `Boss.Stagger`, `Boss.BreakTurnsLeft` |
| Vì sao nội tại Defender không kích hoạt? | `FBattleSimCore::EndPlayerTurn` | `bActedThisTurn` |
| Sân chơi bị treo / sai | `FMatchBoardCore::At` | `X`, `Y` — nếu âm hoặc quá lớn là có lỗi toạ độ |

### Lưới an toàn sẵn có

Khi chạy ngoài Unreal (sân chơi và bộ test), shim `TArray` **kiểm tra phạm vi truy cập** và
báo lỗi rõ ràng thay vì âm thầm đọc sai vùng nhớ:

```text
!!! LOI TRUY CAP MANG NGOAI PHAM VI (TArray)
    Truy cap phan tu thu -9 nhung mang chi co 64 phan tu.
    Day la loi LAP TRINH, khong phai loi du lieu: chi so dang am hoac qua lon.
    Thuong gap khi toa do X/Y am, hoac khi vong lap chay qua mep ban.
    Noi goi: Source/MatchRPG/Private/Core/MatchBoardCore.cpp:243
```

Trong Unreal, `TArray` không kiểm tra (để chạy nhanh), nên lỗi toạ độ kiểu này khó thấy hơn.
Đó là lý do nên phát triển luật chơi ở sân chơi trước rồi mới đưa lên Unreal.

---

## 5. Một ca gỡ lỗi thật (đọc như truyện)

Lỗi này xảy ra ngay trong dự án, khi đang dựng sân chơi. Kể lại đầy đủ vì nó dạy gần hết
các bước gỡ lỗi cơ bản.

**Triệu chứng.** Sân chơi in ra banner rồi thoát ngay, mã thoát 3, không có thông báo lỗi gì.

**Bước 1 — khoanh vùng.** Chèn `printf` đánh số vào từng công đoạn và `fflush(stdout)` để
chắc chắn thấy được dấu vết trước khi chương trình chết. Kết quả:

```text
1 start
2 demo stage built
3 roster=11
4 formation filled=4
5 sim constructed
=== exit=3 ===
```

Vậy nó chết trong `FBattleSimCore::Setup`.

**Bước 2 — lấy stack trace.** Mã thoát 3 là dấu hiệu `abort()`, tức có hàm nội bộ gọi
`abort`, thường do một khẳng định (assert) phát hiện điều vô lý. Chạy dưới gdb:

```bash
gdb -batch -ex "catch throw" -ex "break abort" -ex run -ex "bt 30" --args playground.exe
```

Stack trace trả lời gọn gàng:

```text
#1  std::vector<FBlockCell>::operator[]   (__n=18446744073709551607)   <- chỉ số âm
#2  TArray<FBlockCell>::operator[]        (Index=-9)
#3  FMatchBoardCore::At                   (X=-1, Y=-1)
#4  FMatchBoardCore::IsPartOfSquare       (X=0, Y=0)
#5  FMatchBoardCore::WouldMatchAt         (X=0, Y=0)
#6  FMatchBoardCore::HasImmediateMatch
#7  FMatchBoardCore::FillRandomBoard
```

Đọc từ dưới lên: lúc sinh bàn cờ, game đi kiểm tra các ô vuông 2×2. Ở ô `(0,0)` nó gọi
`At(-1,-1)` — tức là đọc ra **ngoài mảng**.

**Bước 3 — hiểu nguyên nhân.** Hàm `IsPartOfSquare` thử 4 ô vuông có thể chứa ô `(X,Y)`,
mỗi lần lùi gốc đi một ô:

```cpp
const int32 BaseX = X + OffsetX;   // X=0, OffsetX=-1  =>  BaseX = -1
const int32 BaseY = Y + OffsetY;   //                   BaseY = -1
if (!IsInBounds(BaseX + 1, BaseY + 1)) { continue; }   // (-1+1, -1+1) = (0,0) => HỢP LỆ!
```

Đây là chỗ sai tinh vi: kiểm tra mỗi góc dưới-phải. Với `BaseX = -1`, biểu thức
`BaseX + 1 = 0` nên phép kiểm tra báo "hợp lệ", và code đi tiếp đọc `At(-1, -1)`.

**Bước 4 — sửa.** Phải kiểm tra **cả hai góc**:

```cpp
if (!IsInBounds(BaseX, BaseY) || !IsInBounds(BaseX + 1, BaseY + 1)) { continue; }
```

**Bước 5 — viết test chống tái phát.** Thêm `Test_SquareDetectionAtEdges` vào bộ test, trong
đó có ca xấu nhất: bàn một màu duy nhất. Khi đó **mọi** ô đều nằm trong một ô vuông 2×2, nên
mọi ô sát mép đều đi qua nhánh `BaseX = -1`. Nếu lỗi quay lại, test đổ ngay.

**Bài học.** Bộ test cũ vẫn xanh dù có lỗi, vì đọc ra ngoài mảng là **hành vi không xác định**:
bản build này đọc trúng vùng nhớ còn hợp lệ nên không sao, bản build khác thì chết. Lỗi loại
này không "sai kết quả" — nó "tuỳ máy". Vì vậy đừng tin vào việc test xanh nếu bạn biết mình
vừa viết một chỉ số có thể âm. Và khi toạ độ có dấu trừ, luôn kiểm tra **mọi** toạ độ mình
sắp dùng, không chỉ một.

Sau khi sửa: `checks: 738, failures: 0`.

---

## 6. Bài tập

Mỗi bài ghi rõ sửa ở đâu và lấy gì làm bằng chứng là đã xong.

### Mức 1 — làm quen

**1.1 Đổi máu boss.** `ContentCore::BuildDemoStage`, dòng `OutStage.Boss.MaxHp = 12000;` → thử
`30000`. Chạy lại `Tools\playground\build_and_run.bat`, gõ `state`. Bằng chứng: chỉ số máu
trong bảng trạng thái đổi theo.

**1.2 Đổi số nước đi mỗi lượt.** `OutStage.MovesPerTurn = 4` → `2`. Trong sân chơi gõ
`state` sau mỗi lệnh `play` để thấy số nước còn lại giảm nhanh hơn.

**1.3 Đổi kịch bản boss.** Trong `BuildDemoStage` có 7 hành động xếp theo thứ tự. Đổi
`MakeBossAction(EBossActionType::SpawnObstacle, 4)` thành `8` để boss thả nhiều Ice hơn, rồi
gõ `end` vài lần trong sân chơi để xem bàn ngập vật cản.

### Mức 2 — hiểu công thức

**2.1 Heal mạnh hơn.** `BuildDefaultScales()`, đổi `Scales.HealGrowthPerBlock = 1.18f` →
`1.5f`. Chạy bộ test: test *"heal grows exponentially"* sẽ đỏ vì nó khoá kỳ vọng `1.9 < x < 2.0`.
Đây là bài học quan trọng: **test là bản ghi lại thoả thuận về cân bằng**, không phải vật cản.
Muốn đổi luật thì phải sửa cả test, và việc sửa test buộc bạn nghĩ xem mình thực sự muốn gì.

**2.2 Xem tận mắt công thức chạy.** Đặt breakpoint ở `CombatMath::ComputeDamageMultiplier`,
bấm F5, chọn *Gỡ lỗi: bộ test lõi*, rồi xem biến `Extra`, `Linear`, `Quadratic` khi nó dừng.
Bằng chứng: bạn giải thích được vì sao match 6 ô mạnh hơn 2,35 lần match 3 ô.

**2.3 Đổi độ sâu cascade.** `FBoardRules::MaxCascadeDepth` từ 12 → 1. Chơi vài nước trong sân
chơi; dây chuyền sẽ dừng sau một tầng. Bằng chứng: dòng "So dot no lien tiep" trong kết quả
không bao giờ vượt 1.

### Mức 3 — sửa luật

**3.1 Đổi ý nghĩa match-5.** `BuildDefaultBoardRules()`, `bMatch5CreatesSwapAll = false`.
Match 5 ô thẳng giờ tạo khối xoá hàng/cột thay vì khối SwapAll. Chạy test: `Test_Line5SwapAll`
sẽ đỏ ở đúng hai dòng kiểm tra `AwardedSpecial`. Sửa test cho khớp luật mới.

**3.2 Thêm mục tiêu challenge.** Trong `BuildDemoStage`, thêm:

```cpp
OutStage.Objectives.Add(MakeObjective(EObjectiveType::TriggerSpecials, 0, 8, false));
```

Chạy sân chơi, gõ `play` nhiều lần rồi `state`. Bằng chứng: số mục tiêu trong bảng trạng thái
thành 4, và HUD trong Unreal cũng hiện thêm dòng.

**3.3 Thêm vật cản mới.** `EObstacleType` trong `MatchTypes.h` đã có 4 loại. Thử đổi
`GetObstacleProfile` để Ice chịu được 4 lần match thay vì 2, rồi xem mục tiêu "Clear Ice"
khó hơn thế nào.

### Mức 4 — mở rộng

**4.1 Thêm một kỹ năng.** Trong `BuildSkillLibrary`, thêm hiệu ứng cho ultimate của Healer,
ví dụ `DirectStaggerDrain` 0.1. Xem `ESkillEffectKind` để biết các loại hiệu ứng đang có.
Bằng chứng: bắn ultimate đó trong sân chơi, thanh stagger tụt thêm.

**4.2 Viết test của riêng bạn.** Mở `Tools/host_tests/main.cpp`, thêm một hàm `Test_...` theo
mẫu các hàm có sẵn (dùng `BeginTest` và `CHECK`), rồi gọi nó trong `main()`. Thử thách: viết
một test khẳng định rằng một nước đi không hợp lệ **không** làm mất lượt.

**4.3 Đưa mô hình thật vào Unreal.** Làm theo `Docs/ASSET_SWAP_GUIDE.md`: tạo một Data Asset
`UMatchRPGBlockPaletteAsset`, gán một mesh bất kỳ cho màu Đỏ, rồi bấm Play xem khối Đỏ đổi hình.

---

## 7. Lỗi thường gặp

| Hiện tượng | Nguyên nhân hay gặp | Xử lý |
| --- | --- | --- |
| Chương trình thoát ngay, mã 3, không báo gì | Có `abort()` do truy cập mảng ngoài phạm vi | Chạy dưới gdb như mục 5, xem dòng `At(X, Y)` với toạ độ âm |
| Bấm Play mà bàn không hiện | Chưa build được module C++, hoặc GameMode chưa đúng | Kiểm tra `Config/DefaultEngine.ini` có `GlobalDefaultGameMode=/Script/MatchRPG.MatchRPGMode`; phải build thành công trong Visual Studio trước |
| Đổi số trong code mà game không đổi | Sửa `BuildDefaultScales` nhưng chỗ dùng lại tự đặt hằng số | Luật trong dự án: mọi con số tinh chỉnh nằm ở `BuildDefaultScales()` / `BuildDefaultBoardRules()` |
| Test đỏ sau khi sửa luật | Test đang khoá kỳ vọng cũ | Đọc kỹ thông báo test, quyết định xem luật mới đúng hay test mới đúng, rồi sửa một trong hai |
| Sân chơi báo "khong tim thay trinh bien dich" | Máy chưa có g++/clang++ trên PATH | Cài MinGW-w64, hoặc đặt biến `MRPG_CXX` trỏ tới `g++.exe` |
| Số trong sân chơi khác trong Unreal | Hai bên chạy hai bản build khác nhau | Build lại cả hai; cùng seed phải ra cùng diễn biến |

---

## 8. Từ điển nhanh

| Tiếng Anh trong code | Nghĩa |
| --- | --- |
| `board` / `grid` | bàn cờ, lưới ô |
| `cell` / `block` | một ô trên bàn |
| `match` | nhóm 3 ô trở lên cùng màu thẳng hàng |
| `cascade` | dây chuyền: ô mới rơi xuống lại tạo match tiếp |
| `gravity` / `refill` | trọng lực kéo ô xuống / sinh ô mới lấp chỗ trống |
| `obstacle` | vật cản do boss thả xuống |
| `special block` | khối đặc biệt sinh ra từ match-4 hoặc match-5 |
| `turn` / `move` | lượt của người chơi / một nước đổi chỗ |
| `stagger` / `break` | thanh choáng của boss / trạng thái boss bị vỡ thanh đó |
| `buff` / `debuff` | hiệu ứng có lợi / bất lợi |
| `ultimate` | chiêu cuối, nạp đầy rồi bấm mới bắn |
| `role` | vai trò nhân vật: attacker, supporter, healer… |
| `seed` | con số ngẫu nhiên gốc; cùng seed thì diễn biến y hệt |

---

## 9. Ba nguyên tắc nên giữ khi tự sửa code

1. **Luật chơi chỉ nằm trong `Core/`.** Nếu bạn thấy mình đang viết luật match-3 trong một
   actor hay trong HUD, dừng lại — chỗ đó sẽ khiến luật không kiểm thử được nữa.
2. **Sửa luật thì thêm test.** Bạn vừa thấy một lỗi sống sót qua 734 khẳng định. Test không
   bảo đảm hết, nhưng mỗi test bạn thêm là một lần bạn không phải nhớ lại chuyện cũ.
3. **Chạy tay một ví dụ nhỏ trước khi tin code.** Như phần `ApplyGravity` ở mục 3: lấy giấy
   vẽ 4 ô, chạy từng dòng, rồi mới kết luận. Cách này nhanh hơn ngồi đoán rất nhiều.
