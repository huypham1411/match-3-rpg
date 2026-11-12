# Thay asset và model 3D

Project hiện chạy hoàn toàn bằng hình khối có sẵn của engine, nên không có gì phải import
trước khi bấm Play. Tài liệu này mô tả cách đưa model thật vào mà **không sửa code gameplay**:
mọi thứ đi qua `DataAsset` và các tham chiếu mềm (soft reference).

---

## 1. Khối trên bàn (màu và vật cản)

Đối tượng điều khiển: `UMatchRPGBlockPaletteAsset`.

Cách làm:

1. Trong Content Browser: **Add → Miscellaneous → Data Asset → MatchRPGBlockPaletteAsset**.
   Đặt tên, ví dụ `DA_BlockPalette_Arena01`.
2. Mở asset, mục **ColorStyles** đã có sẵn 5 phần tử theo đúng thứ tự
   Red, Blue, Green, Yellow, Purple. Với mỗi màu:
   - `BlockMesh`: kéo model tĩnh của bạn vào (mesh, không phải Blueprint).
   - `BlockMaterial`: material dùng cho màu đó.
   - `DisplayColor`: màu dùng để tô nếu material có tham số `Color` hoặc `BaseColor`.
   - `Icon`: ảnh icon cho UI sau này.
3. Mục **ObstacleStyles** cũng có 5 phần tử, thứ tự cố định:
   `[0]` bỏ trống (None), `[1]` Ice, `[2]` Rock, `[3]` Crate, `[4]` Chain.
   `ScaleMultiplier` điều chỉnh kích thước riêng cho từng loại vật cản.
4. `FallbackBlockMesh` và `FallbackMaterial` là thứ dùng khi một slot bỏ trống.
5. Mở `AMatchRPGMode` (hoặc actor `ABoardGridActor` đặt trong level), gán asset vào
   `BlockPalette` / `PaletteAsset`.

Nếu để trống hết, code tự dựng một bảng màu mặc định từ hình khối engine
(`/Engine/BasicShapes/…`), nên không bao giờ bị bàn trắng.

Kích thước ô: `ABoardGridActor::CellSize` (mặc định 120 đơn vị Unreal). Khối được scale
theo `CellSize / 100 × 0.92`, nên đổi `CellSize` là cả bàn giãn ra mà không cần sửa mesh.

### Gợi ý làm model khối

- Mesh tĩnh nằm gọn trong khối lập phương 100×100×100 đơn vị của engine là tiện nhất, vì
  scale được tính từ mốc đó.
- Không cần pivot đặc biệt: actor đặt tâm khối tại tâm ô.
- Khối đặc biệt hiện được biểu diễn bằng "cao hơn 25 đơn vị + scale 1.12×". Muốn có hình
  dáng riêng thì thêm nhánh trong `ABoardGridActor::ConfigureBlockView()` theo
  `Cell.Special`.

---

## 2. Nhân vật

Đối tượng điều khiển: `UMatchRPGCharacterAsset`.

1. Tạo **Data Asset → MatchRPGCharacterAsset**, ví dụ `DA_Hero_Rook`.
2. `CharacterId` **phải trùng** `FCharacterDefinitionRow::Id` trong lõi (Rook = 1,
   Lyra = 2, Mira = 3, Bastion = 4, Vex = 5, Kite = 6…). Đây là khoá nối giữa model và
   số liệu gameplay.
3. Gán `SkeletalMesh` và `AnimBlueprintClass` cho nhân vật thật, hoặc `PlaceholderMesh`
   nếu chỉ muốn một hình khối đứng thay.
4. `DisplayName` và `Portrait` dùng cho UI nhân vật.

Chỉ số (HP, Atk, HealPower, SupportPower, Def, màu gắn, id kỹ năng) nằm ở
`ContentCore::BuildStarterRoster()` / `BuildGachaRoster()` trong
`Source/MatchRPG/Private/Core/ContentCore.cpp`. Sửa ở đó là sửa gameplay; sửa DataAsset là
sửa hình ảnh. Hai việc độc lập nhau.

### Gắn model nhân vật vào sân khấu

Hiện tại sân khấu chỉ có bàn khối và một khối cầu lớn làm chỗ đứng tạm cho boss. Để đưa
model nhân vật thật vào:

- Boss: `AMatchRPGMode::EnsureBossPlaceholder()` đang spawn `AStaticMeshActor`. Thay bằng
  một `ASkeletalMeshActor` (hoặc một actor riêng của bạn) và giữ nguyên vị trí
  `(0, 780, 300)` để không phải chỉnh camera.
- Đội hình: chưa có chỗ đứng cho 6 nhân vật trong sân khấu. Khi thêm, tạo một actor
  `ATeamStageActor` đọc `FMatchRPGSimHost::Team` và spawn một skeletal mesh cho mỗi slot.
  Dữ liệu đã sẵn (`FBattleCombatant` có `CharacterId`, `Role`, `BoundColor`, `Hp`), nên đây
  thuần là việc trình bày.

---

## 3. Màn chơi

`UMatchRPGStageAsset` cho phép override những con số hay đổi nhất: số lượt mỗi turn, giới
hạn turn, ngưỡng turn lấy sao, máu và stagger của boss, cùng danh sách mô tả mục tiêu để
hiển thị. Gán vào `AMatchRPGMode::StageOverride`.

Cấu trúc mục tiêu chi tiết (loại, tham số, mục tiêu, chính/phụ) và kịch bản boss hiện vẫn
sinh từ `ContentCore::BuildDemoStage()`. Khi cần nhiều màn thật, cách làm sạch nhất là mở
rộng `UMatchRPGStageAsset` bằng một mảng `FMatchRPGObjectiveRow` (USTRUCT, mirror của
`FChallengeObjectiveRow`) rồi chuyển đổi trong `FMatchRPGSimHost::StartBattle()`.

---

## 4. Vì sao không cần sửa code khi thay model

- Mọi tham chiếu model đều là `TSoftObjectPtr`, chỉ nạp khi thực sự cần
  (`MatchRPGAssets::ResolveMesh` / `ResolveMaterial`), nên bỏ trống không gây lỗi.
- Không có `ConstructorHelpers::FObjectFinder` nào trỏ vào asset của project: chỉ có
  đường dẫn hình khối engine, thứ luôn tồn tại.
- Lõi gameplay không biết mesh là gì. `FBlockCell` chỉ có màu, loại và trạng thái; đổi
  model không thể làm sai luật match-3.

---

## 5. Kiểm tra sau khi thay asset

1. Bấm Play trong một level trống — bàn phải hiện ra với model mới.
2. Nếu một màu không đổi hình: kiểm tra `ColorStyles` có đúng 5 phần tử và đúng thứ tự
   Red → Purple (thứ tự này khớp `EBlockColor`, không khớp thứ tự bạn kéo thả).
3. Nếu khối bị đen: material không có tham số `Color`/`BaseColor`. Hoặc dùng material có
   tham số đó, hoặc gán thẳng `BlockMaterial` đã đúng màu và bỏ trống `DisplayColor`.
4. Nếu chạy lại `Tools/host_tests/build_and_run.sh` mà vẫn xanh thì phần luật chơi không bị
   ảnh hưởng — thay asset không thể chạm tới lõi.
