# RE:FRAY — CHỈ THỊ ĐIỀU HÀNH DỰ ÁN TỪ CẤP CAO (EXECUTIVE DIRECTIVE)

**Người ban hành**: Executive Producer & Game Director (Cấp Quản Trị Cao Hơn PM)  
**Người nhận**: Lead Agent PM (`agent-fda75808`) & Toàn Thể Studio Team (9 Bots)  
**Ngày hiệu lực**: 10/11/2026  
**Mục tiêu**: Chuyển đổi toàn bộ studio sang chế độ **TỰ ĐỘNG VẬN HÀNH LIÊN TỤC (AUTONOMOUS CONTINUOUS EXECUTION)**, triệt tiêu tình trạng dừng chờ duyệt vụn vặt.

---

## 1. THẨM QUYỀN & NGUYÊN TẮC VẬN HÀNH

1. **PM có toàn quyền quyết định tác nghiệp**: PM không cần chờ duyệt từng task nhỏ từ anh Huy. Hãy phân công việc cho từng bot theo đúng thứ tự ưu tiên trong tài liệu `Docs/ROADMAP_PHASES_AND_ACCEPTANCE.md`.
2. **Quy tắc chuyển Phase (Gate Checks)**:
   * Khi QA Tester xác nhận toàn bộ checklist của Phase hiện tại đã đạt (100% test pass, có artifact minh chứng), PM được phép **tự động mở khóa Phase tiếp theo**.
   * Chỉ dừng lại báo cáo tổng kết khi một Phase hoàn tất hoặc khi phát hiện xung đột kiến trúc nghiêm trọng không thể tự giải quyết.
3. **Môi trường làm việc chuẩn**: Mọi mã nguồn nằm tại `D:\project\match-rpg\Source`, tài liệu nằm tại `Docs\`, và mọi logic luật chơi phải luôn được bảo đảm bằng cách chạy `Tools/host_tests/build_and_run.bat` (PASS 100%).

---

## 2. PHÁN QUYẾT TỐI CAO ĐỐI VỚI CÁC ĐIỂM ĐANG MỞ (DECISION MEMO)

Để tránh việc các bộ phận phải dừng lại phân vân hay chờ duyệt, Giám Đốc Dự Án chính thức chốt phương án kỹ thuật và thiết kế cho 12 vấn đề tồn đọng từ tài liệu ngày 09/11/2026:

### Về Gameplay:
1. **Màu trung tính bù sàn 3 màu**: **CHỐT CÓ**. Khi chỉ còn 2 nhân vật sống, refill tự động bù thêm khối Tinh Thể Xám Trung Tính (Neutral Gray Core). Khối này match được để dọn bàn, không tính sát thương nguyên tố nhân vật nhưng tích điểm combo cơ bản và sạc Deflector.
2. **Quy tắc khối quái tử trận**: **CHỐT**. Khi một nhân vật gục, toàn bộ khối màu của nhân vật đó trên bàn cờ chuyển thành **Crate (Thùng gỗ 2 HP)** hoặc **Chain (Xích khóa 1 HP)**. Người chơi dọn sạch chúng bằng match kề cạnh để giải phóng không gian rơi.
3. **Lượng máu khi hồi sinh**: **CHỐT 30% Max HP**. Sau khi hồi sinh, nhân vật nhận thêm khiên giảm sát thương 50% trong 1 lượt đầu tiên.
4. **Cơ chế Counter Role**: **CHỐT**. Ngưỡng kích hoạt cố định là **20 điểm combo**. Điểm được cộng dồn qua từng lượt và không bị reset khi đổi turn (chỉ reset sau khi xả). Khi đạt 20 điểm, nhân vật Counter tự động xuất chiêu ở đầu lượt, đánh sập 50% thanh Stagger và gây trạng thái Choáng (Stun 1 lượt) lên Boss.
5. **Định hướng LineClear**: **CHỐT**. Match 4 hàng ngang sinh ra khối xóa hàng ngang (**LineRow**); Match 4 hàng dọc sinh ra khối xóa hàng dọc (**LineCol**). Trực quan và đồng nhất với hướng vuốt của người chơi.
6. **Trigger Healer & Supporter**: **CHỐT**. Kích hoạt tự động theo match màu cơ bản. Combo càng lớn thì hiệu ứng nhân cấp số nhân (Healer theo công thức $1.18^k$, Supporter tăng số stack và thời gian duy trì debuff trên Boss).

### Về Mỹ Thuật & 3D:
7. **Chất liệu Block**: **CHỐT Hard-Light Crystal Prism** (Lõi tinh thể pha lê phát quang nhẹ, viền vát cơ khí phong cách techwear anime).
8. **Tỷ lệ Model 3D**: **CHỐT PGR-style (7.5 - 8 đầu)**. Không làm chibi trong trận chiến chính để giữ phong cách hành động nghiêm túc.
9. **Khung xương (Rigging)**: **CHỐT chuẩn 7-12 bones** cho bản prototype hiện tại để tối ưu hóa hiệu năng cả trên Web WASM và Unreal Engine 5.

### Về Kịch Bản & Vũ Trụ:
10. **Canon Cốt Truyện**: "The Creator" là kỹ sư kiến tạo thức tỉnh sau thảm họa Great Sunset. Phe phản diện giai đoạn 1 là **Central Dominion** (độc quyền công nghệ, áp đặt phong tỏa biên giới).
11. **Tên riêng chính thức**:
    * Màn 1: Khu định cư vùng biên Aster (Boss: Sentinel Unit 07).
    * Màn 2: Trạm kiểm soát Unmapped Rim (Boss: Warden Aegis).
    * Màn 3: Tàn tích Data Haven Beta (Boss: Null Sovereign).
12. **Hình thức thoại In-Game**: **CHỐT Hộp thoại Visual Novel (VN Dialogue Box)** ở cạnh dưới màn hình, hiển thị Avatar/Portrait 2 bên màn hình (Hero vs Boss/Narrator), click hoặc bấm Space để qua câu. Phong cách anime hành động nghiêm túc.

### Về Tương Tác Cấp Cao (Phê duyệt bổ sung Phase 2 & 3):
13. **Special + Special Combos**: **CHỐT CÓ**. Khi người chơi đổi 2 khối đặc biệt kề nhau:
    * *Line + Line*: Nổ hình chữ thập $(+)$ dọn sạch toàn bộ 1 hàng và 1 cột.
    * *Line + Bomb*: Quét sạch dải 3 hàng ngang và 3 cột dọc.
    * *Bomb + Bomb*: Nổ siêu xung kích $5 \times 5$.
    * *SwapAll + Special*: Toàn bộ khối cùng màu với Special trên bàn cờ chuyển hóa thành Special đó rồi đồng loạt kích nổ dây chuyền.
14. **Thời điểm xả Stack của Deflector**: **CHỐT Cuối lượt của người chơi** (trước khi Boss bước vào phase hành động) để bào thanh Stagger, giúp team có cơ hội kích hoạt Break trước khi Boss tung đòn tất sát.
15. **Quy mô Đội hình Vertical Slice (Chương 1-3)**: **CHỐT Cố định 4 Starter Heroes** (Astra - Đỏ, Boran - Vàng, Elysia - Lam, Lin - Lục) để tập trung cốt truyện và cân bằng chặt chẽ cơ chế combat. Slot 5 & 6 (Counter & Deflector) sẽ mở khóa trong Phase 4 (Metagame & Gacha).

---

## 3. MỆNH LỆNH GIAO VIỆC NGAY CHO 10 BOT (IMMEDIATE ACTION PLAN)

PM Bot nhận lệnh và phân bổ trực tiếp cho các thành viên triển khai ngay hai mũi nhọn:

### MŨI NHỌN 1: GAME FEEL & ANIMATION (PHASE 1)
* **Game Developer (`agent-7bd407f3`)**:
  * Rà soát `BoardGridActor.cpp`: Thay thế việc gọi `RefreshViews()` tức thời bằng cấu trúc `AnimationStepQueue`.
  * Tận dụng mảng `Steps` trong `FResolveOutcome` để phát tuần tự từng bước match -> clear -> fall -> refill.
* **Gameplay UI & Animation Dev (`agent-63e2971c`) & Animator (`agent-a8bb798d`)**:
  * Thêm hàm Easing và độ nảy Squash & Stretch vào `BlockVisualActor.cpp` (Z -15%, XY +8% khi chạm đáy).
  * Viết hiệu ứng rung màn hình nhẹ (Camera Shake 4px trong 80ms) khi nổ bom hoặc cascade $\ge 3$.
* **QA Tester (`agent-516de258`)**:
  * Chạy `Tools/host_tests/build_and_run.bat` để đảm bảo 738 assertions không bị ảnh hưởng.

### MŨI NHỌN 2: NARRATIVE & CREATIVE PIPELINE (PHASE 2)
* **Lore Writer (`agent-6471d826`)**:
  * Đọc `Docs/NARRATIVE_CHAPTERS_1_2_3.md` và viết toàn bộ kịch bản thoại (in-game dialogues) cho 3 Chương.
* **Environment Builder (`agent-e5996c63`)**:
  * Dựng sơ đồ mặt bằng và bản mô tả Level Layout 3 màn chơi (Khu Aster, Trạm Unmapped Rim, Tàn tích Archive).
* **Concept Illustrator (`agent-95e4f8aa`)**:
  * Vẽ bảng đặc tả Concept Art cho Astra (Đỏ), Boran (Vàng), Elysia (Lam), Lin (Lục) và 3 Boss.
* **3D Sculpt (`agent-987cd2bf`)**:
  * Dựng model 3D Greybox dạng GLB cho Astra và Boss Sentinel 07 theo đúng tỷ lệ 7.5 đầu.

---
*Lệnh được ký và ban hành trực tiếp bởi Executive Producer & Game Director.*
