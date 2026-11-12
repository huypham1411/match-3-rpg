# MatchRPG

Game match-3 turn-based RPG cho Unreal Engine 5.3, viết bằng C++. Toàn bộ luật chơi
nằm trong một tầng logic thuần (không phụ thuộc engine), nên có thể kiểm thử bằng
trình biên dịch C++ thường, còn tầng Unreal chỉ lo hiển thị và nhận input.

Điểm quan trọng: project **không có file `.uasset` nào**. Mọi hình ảnh là hình khối
cơ bản của engine và được dựng bằng code lúc chạy, nên mở lên là chơi được ngay;
sau đó thay model 3D thật chỉ là sửa dữ liệu, không phải sửa code.

---

## Chạy thử

Yêu cầu: Unreal Engine 5.3 và Visual Studio 2022 (workload "Game development with C++").

1. Chuột phải `MatchRPG.uproject` → **Generate Visual Studio project files**.
2. Mở `MatchRPG.sln`, build cấu hình **Development Editor**.
3. Mở `MatchRPG.uproject` bằng Unreal Editor.
4. Trong editor: **File → New Level → Empty Level** (project không kèm `.umap` nào).
5. Bấm **Play**.

Game mode tự dựng sân khấu: camera cố định nhìn vào bàn 8×8, hai đèn chiếu, bàn khối
và một khối cầu lớn làm chỗ đứng tạm cho boss. Không cần đặt tay actor nào trong level.

### Phím điều khiển

| Thao tác | Phím |
| --- | --- |
| Chọn ô, rồi bấm ô kề để đổi chỗ | Chuột trái |
| Kết thúc lượt sớm (kích hoạt nội tại Defender) | `Space` |
| Bắn ultimate của ô đội hình 1–6 (chain thành Full Burst) | `1`–`6` |
| Dùng kỹ năng cơ bản của ô 1–6 | `Q` `W` `E` `T` `Y` `U` |
| Gợi ý nước đi (tự thực hiện luôn) | `H` |
| Quay gacha 10 lượt (debug) | `G` |
| Chơi lại màn hiện tại | `R` |

---

## Học và gỡ lỗi (bắt đầu ở đây nếu bạn mới làm game)

Luật chơi nằm ở tầng logic thuần, chạy được **không cần Unreal Engine**, nên bạn học và
gỡ lỗi được ngay trên máy này:

```bat
Tools\playground\build_and_run.bat
```

Sân chơi mở ra một bàn cờ in bằng ký tự và chờ bạn gõ lệnh (`help` để xem danh sách). Mỗi
lệnh đều in ra chuyện gì vừa xảy ra và vì sao — ví dụ `groups` cho biết bộ dò match tìm thấy
nhóm nào, hình dạng gì, sẽ sinh khối đặc biệt nào. Gõ `rules` để xem toàn bộ con số đang chạy,
đối chiếu trực tiếp với code.

Muốn **đặt breakpoint và chạy từng bước**: cài extension C/C++ trong VS Code rồi bấm `F5`
và chọn *Gỡ lỗi: sân chơi (gdb)*. Cấu hình đã có sẵn trong `.vscode/`.

Hướng dẫn đầy đủ — đọc code theo thứ tự nào, chạy tay một hàm ra sao, bài tập từ dễ tới khó,
và một ca gỡ lỗi thật làm ví dụ — nằm ở **[Docs/HOC-LAP-TRINH-GAME.md](Docs/HOC-LAP-TRINH-GAME.md)**.

---

## Kiểm thử phần lõi (không cần Unreal)

Luật match-3, công thức sát thương, thanh stagger và cả vòng turn được kiểm thử
bằng cách biên dịch chính những file mà module Unreal dùng:

```bash
Tools/host_tests/build_and_run.sh
# hoặc chỉ định compiler:
MRPG_CXX=/path/to/g++ Tools/host_tests/build_and_run.sh
```

Trên Windows chạy bằng Git Bash / MSYS2 (một bản MinGW-w64 g++ bất kỳ là đủ; w64devkit
là lựa chọn gọn nhẹ). Bộ test phủ: sinh bàn không có match sẵn, trọng lực + refill,
nhận diện match-3/4/5 và ô vuông 2×2, tạo khối đặc biệt, sức chịu của vật cản, leo
thang sát thương theo combo, heal theo cấp số nhân, pity gacha, một trận đấu đầy đủ,
nội tại Defender, nạp/kích hoạt Deflector, điều kiện của Counter, chain ultimate và
tính tái lập theo seed.

Trong editor cũng có bộ automation test tương ứng:
`UnrealEditor-Cmd.exe "<đường dẫn>/MatchRPG.uproject" -ExecCmds="Automation RunTests MatchRPG" -unattended -nullrhi`

---

## Cấu trúc project

```text
MatchRPG.uproject
Config/                      DefaultEngine/Game/Input.ini (không cần asset)
Source/MatchRPG/
  Public/Core/               LÕI THUẦN: không có kiểu Unreal nào ngoài shim
    MatchCoreCompat.h        cầu nối để lõi biên dịch được cả trong lẫn ngoài UE
    MatchTypes.h             enum + struct + bảng tra (vật cản, trạng thái, luật bàn)
    MatchBoardCore.h/.cpp    lưới, trọng lực, refill, khoá/jam, gợi ý nước đi
    MatchFinderCore.h/.cpp   dò match, tạo khối đặc biệt, lan truyền trigger, cascade
    CombatMathCore.h/.cpp    mọi công thức sát thương/heal/stagger (bảng tinh chỉnh)
    SkillCore.h              định nghĩa kỹ năng và ultimate (dạng dữ liệu)
    ContentCore.h/.cpp       roster mặc định, thư viện kỹ năng, pool gacha, màn demo
    BattleSimCore.h/.cpp     máy trạng thái trận đấu + AI boss (chạy headless)
  Public/Blocks/             ABlockVisualActor - một khối 3D
  Public/Board/              ABoardGridActor - bàn chơi, chọn ô, đổi chỗ
  Public/Content/            DataAsset thay thế được: bảng màu, nhân vật, màn
  Public/Game/               GameMode, HUD (Canvas), PlayerController
  Private/Battle/            FMatchRPGSimHost - bọc phiên chơi quanh lõi
.vscode/                     F5 để gỡ lỗi từng bước, task build sẵn (không cần Unreal)
Tools/host_tests/            bộ test tự động cho phần lõi (738 khẳng định)
Tools/playground/            sân chơi gõ lệnh, in bàn cờ bằng ký tự
Docs/HOC-LAP-TRINH-GAME.md   hướng dẫn học + bài tập + cách gỡ lỗi
Docs/DESIGN.md               thiết kế hệ thống, ánh xạ yêu cầu sang code
Docs/ASSET_SWAP_GUIDE.md     cách thay model 3D
```

Lõi nằm trong `Private/Core/` và `Public/Core/`, không tham chiếu `UObject` nào. Nhờ vậy
`Tools/host_tests` biên dịch lại đúng những file đó với `-DMATCHRPG_STANDALONE_CORE`,
và `MatchCoreCompat.h` cấp các tên `TArray`/`FIntPoint`/`FMath` tương đương khi ở ngoài engine.

---

## Đã có gì

- Bàn match-3 8×8 vận hành đầy đủ: đổi chỗ, dò match, nổ dây chuyền, trọng lực, refill,
  tự xáo bàn khi hết nước đi.
- Khối đặc biệt: match-4 → khối xoá hàng/cột, ô vuông 2×2 → SquareBreaker (phá vật cản),
  chữ L/T → bom vùng, match-5 → SwapAll kích hoạt mọi khối cùng màu với khối nó đổi chỗ.
- Vật cản do boss thả xuống: Ice, Rock, Crate, Chain, mỗi loại có luật sát thương riêng.
- 6 vai trò: Attacker, Supporter, Healer, Defender, Counter, Deflector — đúng mô tả thiết kế.
- Thanh stagger có phá (break), Counter chỉ phát huy khi boss đã vỡ stagger.
- Thanh nạp ultimate, chain ultimate và Full Burst; mỗi nhân vật có 1 kỹ năng thủ công
  và 1 ultimate; hiệu ứng kỹ năng định nghĩa bằng dữ liệu.
- Đội hình 6 slot, mỗi nhân vật 3 slot trang bị (có bonus theo thuộc tính), 1 slot pet đã
  chừa chỗ nhưng chưa mở.
- Gacha có pity cứng và soft pity; quay 10 lượt bằng phím `G`.
- Màn chơi có mục tiêu challenge → quyết định số sao (1–3).
- HUD Canvas vẽ toàn bộ thông tin trận đấu bằng code, không cần asset UI.

## Chưa có

- Lưu game, màn hình ngoài trận, chuyển màn, thư viện nhân vật.
- Pet, nâng cấp trang bị, chỉ số theo cấp.
- Model/animation thật: hiện dùng hình khối engine (xem `Docs/ASSET_SWAP_GUIDE.md`).
- Một số hiệu ứng hình ảnh của khối đặc biệt mới chỉ là "khối to hơn", chưa có VFX.
- Âm thanh.
