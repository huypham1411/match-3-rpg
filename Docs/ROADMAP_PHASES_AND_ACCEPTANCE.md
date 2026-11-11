# RE:FRAY — LỘ TRÌNH 5 PHASE & TIÊU CHÍ NGHIỆM THU CHI TIẾT

Tài liệu này được lập căn cứ theo hiện trạng mã nguồn `D:\project\match-rpg`, tài liệu bàn giao `REFRAY_ban_giao_tien_do_09-11-2026.txt` và yêu cầu tái cấu trúc của anh Huy ngày 10/11/2026.

---

## 1. TỔNG QUAN 5 PHASE & TIÊU CHÍ NGHIỆM THU (GATE CHECKLIST)

```
[Phase 1: Game Feel & Animation]
       │
       ▼
[Phase 2: Narrative & Creative Worldbuilding (Chương 1, 2, 3)]
       │
       ▼
[Phase 3: 3-Stage Vertical Slice & Combat Balance]
       │
       ▼
[Phase 4: Metagame, Team Roster & Gacha System]
       │
       ▼
[Phase 5: Release Build & Multiplatform Optimization]
```

---

### PHASE 1: GAME FEEL & BLOCK ANIMATION (CỐT LÕI TRẬN ĐẤU & CẢM GIÁC MATCH-3)
* **Mục tiêu**: Loại bỏ triệt để hiện tượng teleport / giật cục khi đổi chỗ block; biến chuỗi cascade thành trải nghiệm thị giác mãn nhãn ("Juice").
* **Phân công**:
  * *Gameplay UI & Animation Dev*: Thiết lập hệ thống easing, squash & stretch, độ trễ rơi giữa các cột.
  * *Game Developer*: Tách `Sim.TrySwap()` thành hàng đợi bước (`AnimationStepQueue`), đồng bộ `FResolveOutcome.Steps` với Actor.
  * *Animator*: Thiết kế VFX nổ nguyên tố (Đỏ, Lam, Lục, Vàng, Tím) và hiệu ứng khối đặc biệt (Line/Bomb/Square/SwapAll).
* **Tiêu chuẩn nghiệm thu (Gate Checklist 1)**:
  1. [ ] **Step-by-Step Playback**: Người chơi nhìn thấy rõ ràng từng pha: Trượt đổi chỗ (140ms) -> Nhấp nháy match (100ms) -> Nổ vỡ ô (120ms) -> Rơi trọng lực có nảy (180ms) -> Refill từ trên (160ms) -> Cascade kế tiếp.
  2. [ ] **Invalid Swap Feedback**: Khi đổi 2 ô không tạo match, hai ô trượt sang nhau rồi tự động đàn hồi trượt ngược về (Slide Back & Shake nhẹ) trong 120ms, không trừ số lượt.
  3. [ ] **Squash & Stretch**: Khối chạm đáy nén nhẹ trục Z (-15%) và bè ngang (+8%) trong 40ms trước khi về kích thước chuẩn.
  4. [ ] **Special Block Feedback**:
     * *LineRow / LineCol*: Tia laser quét ngang/dọc dọn sạch hàng.
     * *AreaBomb*: Vòng xung kích 3x3 gây rung camera (4px trong 80ms).
     * *SquareBreaker*: Vòng sóng âm nứt vỡ các vật cản xung quanh.
     * *SwapAll*: Luồng sét phóng tới tất cả các khối cùng màu trên toàn bàn cờ.
  5. [ ] **Regression Test**: 738/738 host tests trong `Tools/host_tests/` tiếp tục PASS 100%.

---

### PHASE 2: NARRATIVE & CREATIVE PRODUCTION (KỊCH BẢN CHƯƠNG 1, 2, 3 & ASSET PIPELINE)
* **Mục tiêu**: Hoàn thiện kịch bản văn học chi tiết cho 3 chương đầu tiên của cốt truyện RE:FRAY; thiết lập phong cách đồ họa, concept art 4 Starter Heroes + Quái + 3 Boss; dựng Greybox 3D cho màn chơi và nhân vật.
* **Phân công**:
  * *Narrative Designer & Lore Writer*: Biên soạn toàn bộ lời thoại, phân cảnh, mô tả cutscene in-game cho Chương 1, 2, 3.
  * *Environment Builder*: Layout bản đồ 3 bối cảnh (Khu định cư Aster, Trạm kiểm soát Unmapped Rim, Tàn tích Data Haven Beta).
  * *Concept Illustrator*: Bảng vẽ 4 Starter Heroes (Astra, Elysia, Lin, Boran), 1 Quái thường và 3 Boss; Thiết kế nhận diện 5 loại Block và 4 loại Obstacles (Ice, Rock, Crate, Chain).
  * *3D Sculpt & Animator*: Dựng Greybox 3D theo tỷ lệ anime PGR (7.5 - 8 đầu), gắn xương chuẩn 7-12 bones cho Astra và Boss Ch.1.
* **Tiêu chuẩn nghiệm thu (Gate Checklist 2)**:
  1. [ ] Kịch bản thoại Chương 1, 2, 3 hoàn chỉnh (kèm trigger hội thoại trước trận, giữa trận và sau chiến thắng).
  2. [ ] Bộ tài liệu Level Design Brief 3 màn chơi kèm sơ đồ mặt bằng và góc nhìn Camera.
  3. [ ] Bảng màu và Concept Art sheet chi tiết cho 4 Starter Heroes và 3 Boss.
  4. [ ] File 3D Greybox (`.glb` / `.fbx`) được QA kiểm tra không bị memory leak skeleton và import mượt mà.

---

### PHASE 3: 3-STAGE VERTICAL SLICE & COMBAT BALANCE (TÍCH HỢP 3 MÀN CHƠI HOÀN CHỈNH)
* **Mục tiêu**: Kết nối dữ liệu 3 Chương vào Engine thành 3 Màn Chơi hoàn chỉnh có thể chơi từ đầu đến cuối; hoàn thiện 6 Role và giải quyết triệt để các quyết định gameplay còn dang dở.
* **Phân công**:
  * *Game Developer*: Cài đặt Boss AI Script cho Màn 1, 2, 3 trong `ContentCore.cpp` / `UMatchRPGStageAsset`.
  * *Game Designer*: Cân bằng chỉ số HP, Stagger, Damage của Boss và hệ số scaling của 6 Role.
  * *QA Tester*: Playtest toàn diện 3 màn chơi trên cả bàn phím, chuột và màn hình cảm ứng.
* **Tiêu chuẩn nghiệm thu (Gate Checklist 3)**:
  1. [ ] Người chơi có thể chơi liên tục từ Màn 1 -> Màn 2 -> Màn 3, có màn hình chuyển cảnh thoại và tính điểm sao (Early clear star rating).
  2. [ ] Các loại vật cản (Rock 3 HP, Ice 2 HP, Crate 2 HP, Chain 1 HP) hoạt động chính xác theo quy chuẩn: match kề cạnh dọn vật cản, vật cản quái không sinh sát thương cơ bản.
  3. [ ] Cơ chế tử trận nhân vật hoạt động đúng: Khi hero gục, block của họ chuyển thành block quái kề cạnh; pool refill bảo đảm giữ sàn tối thiểu 3 màu.
  4. [ ] Counter kích hoạt mượt mà khi tích đủ combo; Deflector tiêu điểm tự động ở cuối lượt để bào Stagger boss.

---

### PHASE 4: METAGAME, TEAM ROSTER & GACHA SYSTEM
* **Mục tiêu**: Xây dựng hệ thống phát triển nhân vật ngoài trận đấu (Out-of-combat progression), quản lý đội hình và hệ thống gacha triệu hồi.
* **Tiêu chuẩn nghiệm thu (Gate Checklist 4)**:
  1. [ ] Menu Roster: Xem chi tiết chỉ số 4 starter heroes + các nhân vật mở khóa thêm, nâng cấp cấp độ, trang bị Slot Pet/Equip.
  2. [ ] Gacha System: Triệu hồi 1x và 10x, thanh đo Hard Pity đảm bảo ra nhân vật 5 sao theo đúng quy chuẩn Determinism RNG trong core.
  3. [ ] Quản lý đội hình (Formation): Chọn 4 nhân vật tham chiến chính + 2 slot hậu cần dự phòng.

---

### PHASE 5: RELEASE BUILD & CROSS-PLATFORM OPTIMIZATION
* **Mục tiêu**: Đóng gói sản phẩm thương mại hoặc demo hoàn chỉnh trên cả 2 nền tảng Web WASM và Windows Unreal Engine 5.
* **Tiêu chuẩn nghiệm thu (Gate Checklist 5)**:
  1. [ ] Bản Web WASM (`m3core.mjs`) khởi động dưới 3 giây, đạt 60fps mượt mà trên Chrome, Firefox, Safari (iOS) và Android.
  2. [ ] Bản Unreal Engine 5 PC chạy mượt mà ở độ phân giải 1080p/2K, không crash, không rò rỉ bộ nhớ.
