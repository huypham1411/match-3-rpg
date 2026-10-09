# AGENTS.md — quy ước làm việc trong repo Match-3 RPG

## Ngôn ngữ & phong cách

- Comment và tài liệu viết bằng **tiếng Việt**, giữ thuật ngữ kỹ thuật gốc khi cần
  (`match-3`, `stagger`, `cascade`, `ultimate`).
- Đặt tên biến/hàm/lớp bằng **tiếng Anh**; tiền tố `M3` cho mọi thứ thuộc game này.
- Mỗi file mở đầu bằng khối comment `// ===...` nói rõ file làm gì và nên đọc từ đâu.

## Ranh giới quan trọng: lõi vs Unreal

| Nơi | Được phép | Không được phép |
|---|---|---|
| `Source/Match3Core/**` | C++ chuẩn (`std::vector`, `std::string`), thuật toán, luật chơi | UObject/UCLASS, `FString`, `TArray`, bất kỳ API nào của UE |
| `Source/Match3RPG/**` | UObject/AActor/UCLASS, UE API, hình ảnh, input, HUD | Cài đặt luật chơi (phải gọi xuống lõi) |
| `Tests/Core/**` | Test lõi + script build bằng `cl.exe` | Phụ thuộc UE |

Lý do: giữ lõi test được độc lập và không lệ thuộc asset. Nếu cần một chức năng mới
thuộc về luật chơi, hãy thêm vào `Match3Core` rồi để lớp UE gọi xuống.

Quy tắc DLL: mọi lớp/struct trong lõi có hàm định nghĩa ngoài header phải được đánh
dấu `MATCH3CORE_API` (xem khối giải thích trong `Public/M3Types.h`).

## Lệnh thường dùng

```bash
# Test luật chơi (không cần mở UE) - chạy cái này trước sau mỗi thay đổi luật
Tests\Core\build_and_run.bat

# Build editor (Win64, Development)
"C:\Program Files\Epic Games\UE_5.6\Engine\Build\BatchFiles\Build.bat" ^
  Match3RPGEditor Win64 Development -Project="D:\self\match-3-rpg\Match3RPG.uproject" -WaitMutex

# Build bản WEB (WebAssembly) từ cùng lõi luật chơi - cần Emscripten SDK
Web\build_web.bat
node Web\smoke_test.mjs      # kiểm tra tự động bản WASM
```

## Quy tắc khi sửa

1. **Luật chơi mới → thêm test trước** trong `Tests/Core/M3BoardTests.cpp` (bàn/special)
   hoặc `M3BattleTests.cpp` (combat). Test dùng bàn thiết kế sẵn trong `M3TestHelpers.h`
   (`DesignHorizontalRun`, `DesignLShapeFive`, `FillCleanBoard`) để kết quả tất định.
2. **Con số cân bằng** chỉ được sửa trong `M3Balance.h`. Không rải hằng số vào .cpp.
3. **Nội dung** (nhân vật, trang bị, map, challenge) nằm ở `M3Content.cpp`; về sau thay
   bằng Data Asset thì giữ nguyên API `FContentLibrary` để không phải sửa gameplay.
4. **Asset** không commit file `.uasset` sinh tự động; bộ hình mặc định dựng bằng code
   (`UM3VisualSet::CreateDefaultVisualSet`) để project luôn chạy được sau khi clone.
5. Đổi hành vi hiển thị → chỉ sửa `Match3RPG` (`M3BoardActor`, `M3BossActor`,
   `M3PartyMemberActor`, `M3HUD`, `M3VisualSet`).

## Bản chơi web

UE 5.6 không có target trình duyệt, nên bản web được tạo bằng cách biên dịch
`Source/Match3Core` sang WebAssembly (xem `Web/build_web.bat`) rồi bọc giao diện trong
`Web/`. Vì vậy:

- `Web/m3_web_api.cpp` **chỉ được là lớp vỏ** chuyển tiếp `int/float/char*` — không thêm
  luật chơi vào đây; mọi thay đổi luật phải nằm ở `Match3Core`.
- Sửa luật xong phải chạy lại cả hai bộ kiểm tra: `Tests\Core\build_and_run.bat` (lõi,
  nhanh) và `node Web\smoke_test.mjs` (bản WASM, chạy sau `Web\build_web.bat`).
- `Web/dist/*` là file sinh tự động, có thể bỏ khỏi git và chỉ giữ lại script build.

## Cách UI đọc dữ liệu

`UM3CombatSubsystem` là nguồn dữ liệu duy nhất cho UI/actor: đọc trực tiếp
(`GetBattle()`, các `Get*()`) hoặc gọi hành động (`TrySwap`, `UseBasicSkill`,
`UseUltimate`, `EndTurn`). Sau mỗi hành động subsystem tăng `Revision`; actor/HUD
so sánh revision để biết khi nào cần vẽ lại — không cần tick nặng mỗi frame.

## Kiểm tra trước khi báo hoàn thành

- `Tests\Core\build_and_run.bat` phải **0 FAIL**.
- Nếu sửa file trong `Source/Match3RPG/**` hoặc `Source/Match3Core/Public/*.h`: chạy
  build editor ở trên phải `Result: Succeeded`.
