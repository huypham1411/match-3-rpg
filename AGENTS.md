# AGENTS.md — quy ước làm việc trong MatchRPG

## Bố cục

- `Source/MatchRPG/Public/Core/` + `Source/MatchRPG/Private/Core/` — **lõi luật chơi**, không
  tham chiếu `UObject`/`AActor`/`CoreMinimal.h` trực tiếp; chỉ đi qua `Core/MatchCoreCompat.h`.
- `Source/MatchRPG/Public|Private/{Blocks,Board,Content,Game,Battle}` — tầng Unreal: hiển thị,
  input, DataAsset.
- `Tools/host_tests/` — bộ test biên dịch lại chính các file lõi ở chế độ standalone.
- `Tools/playground/` — chương trình gõ lệnh để học và gỡ lỗi luật chơi, không cần Unreal.
- `Docs/` — hướng dẫn học, thiết kế, và cách thay asset.
- `.vscode/` — task build + cấu hình gỡ lỗi từng bước cho phần lõi.

## Quy tắc bắt buộc

1. **Luật chơi chỉ nằm trong `Core/`.** Không viết luật match-3 hay công thức sát thương
   trong actor, GameMode hay HUD.
2. **Lõi phải biên dịch được ở cả hai môi trường.** Sau mọi thay đổi trong `Core/`, chạy:
   ```bash
   Tools/host_tests/build_and_run.sh
   ```
   Chỉ dùng các API shim đang có (`Num`, `Add`, `Emplace`, `Reset`, `SetNum`, `RemoveAt`,
   `Insert`, `Find`, `Last`, `IsValidIndex`, `Reserve`, `operator[]`) và vòng lặp theo chỉ số.
   Không dùng `FString`, `UE_LOG`, `check()` trong `Core/`.
3. **Không dùng `TArray<bool>`.** Ngoài engine nó là `std::vector<bool>` dạng bitfield, khác
   hành vi so với UE. Dùng `TArray<uint8>` với 0/1.
4. **Không hard-code asset của project.** Chỉ được trỏ tới `/Engine/BasicShapes/...`. Model
   thật đi qua `TSoftObjectPtr` trong DataAsset.
5. **Không thêm `.uasset` bắt buộc để chạy.** Project phải bấm Play được trong một level
   trống sau khi clone. Mọi DataAsset chỉ là lớp override tuỳ chọn.
6. **Mọi hàm trong `Core/` phải suy diễn được từ `(stage, roster, formation, seed)`.** Không
   dùng `FMath::RandRange` hay thời gian thực; mọi ngẫu nhiên đi qua `FMatchRng` để trận đấu
   tái lập được (test `Determinism` canh điều này).
7. **Tinh chỉnh cân bằng sửa ở `ContentCore::BuildDefaultScales()` / `BuildDefaultBoardRules()`**,
   không rải hằng số vào nơi dùng.
8. **Tên class UCLASS**: GameMode là `AMatchRPGMode` (khớp `Config/DefaultEngine.ini`). Đổi tên
   thì phải sửa cả ini.

## Kiểm thử

- Luật chơi: `Tools/host_tests/build_and_run.sh` (không cần Unreal). Thêm khẳng định mới vào
  `Tools/host_tests/main.cpp` mỗi khi sửa luật.
- Trong editor: `Automation RunTests MatchRPG` (xem `Source/MatchRPG/Private/Tests/MatchCoreTests.cpp`).
- Không có test nào cho tầng Unreal; thay đổi ở actor/HUD phải tự kiểm bằng cách bấm Play.

## Ghi chú về Unity Build của Unreal

`Private/Core/*.cpp` được Unreal gộp thành một translation unit. Vì vậy mọi hàm trợ giúp
trong `namespace { ... }` phải có tên duy nhất trên toàn bộ thư mục `Core/` — đặt tên cụ thể
(`FStepTriggerBoard`, `MakeEvent`, `ColorLetter`…) thay vì tên chung chung như `Helper`.

## Chỉ thị & Lộ trình 5 Phase

Dự án đang được chỉ đạo trực tiếp bởi **Executive Producer & Game Director** theo lộ trình 5 Phase. Toàn bộ bot và kỹ sư bắt buộc phải đọc và tuân thủ các tài liệu chỉ đạo sau:
1. `Docs/EXECUTIVE_DIRECTIVE_AND_DECISIONS.md` — Phán quyết tối cao giải quyết 12 điểm đang mở, phân quyền tự chủ cho PM và giao việc trực tiếp cho 10 bot.
2. `Docs/ROADMAP_PHASES_AND_ACCEPTANCE.md` — Tiêu chuẩn nghiệm thu chi tiết từng Phase (Gate Checklist).
3. `Docs/NARRATIVE_CHAPTERS_1_2_3.md` — Kịch bản phân cảnh 3 Chương và chỉ dẫn cho bộ tứ sáng tạo (Lore, Environment, Concept, 3D Sculpt).

## Việc cần thực hiện ngay

- **Mũi nhọn 1 (Phase 1)**: Cải thiện animation block match-3 trong `BoardGridActor` và `BlockVisualActor` (hàng đợi từng bước `AnimationStepQueue`, easing, squash & stretch khi rơi tiếp đất).
- **Mũi nhọn 2 (Phase 2)**: Hoàn thiện kịch bản thoại, concept art sheets và greybox 3D cho 3 Chương theo kịch bản chuẩn.
