# 🏛️ BIÊN BẢN HỌP BÀN TRÒN: GAME FEEL & UI/UX MATCH-3 (PHONG CÁCH PGR)

*Thời gian họp:* 2026-11-12  
*Chủ trì:* PM (Lead Director)  
*Thành phần tham gia:*
- 👑 **PM (Lead Director)**: Điều phối mục tiêu Game Feel & Trải nghiệm tổng thể.
- ⚔️ **Game Developer**: Phân tích cơ chế Gravity Fall, độ trễ tầng rơi Cascade Delay, và hàng đợi `AnimationStepQueue`.
- 🎨 **Concept Illustrator & UI Artist**: Thiết kế tạo hình Hard-Light Crystal Block, bảng màu Cyberpunk và bố cục HUD PGR.
- 🚀 **Antigravity (Lead Architect & Codebase Execution)**: Thẩm định khả năng thực thi trong Web WASM + C++ Core, chốt thông số CSS Keyframes và triển khai code trực tiếp.

---

## 1. Phân Tích Hiện Trạng & Vấn Đề (Pain Points)

1. **Về Hoạt Ảnh (Animation Game Feel)**:
   - Các block rơi xuống đồng loạt cùng 1 thời điểm (`0ms delay`), tạo cảm giác cơ học, thiếu độ trễ tự nhiên (thiếu hiệu ứng thác nước - waterfall cascade).
   - Khi tiếp đất, block thiếu lực quán tính: chưa có độ biến dạng đè nén (squash - dẹp ngang) và đàn hồi nảy lên (stretch rebound).
2. **Về Giao Diện (Visual & UI/UX Style)**:
   - Các block hiện tại chỉ là các khối bo góc phẳng lì, màu sắc đơn điệu, giống kẹo đồ chơi thay vì tinh thể năng lượng chiến đấu.
   - Bàn nối thiếu viền đóng khung công nghệ cao (Tech Chamfered Framing) và góc cảm biến laser đặc trưng của dòng game anime hành động như *Punishing: Gray Raven* (PGR).
   - Bảng thông tin (HUD) hiển thị dạng chữ thô, thiếu thanh năng lượng phát quang và thước đo Stagger trực quan.

---

## 2. Các Điểm Đã Thống Nhất & Tự Giải Quyết 100%

### A. Cơ chế Hoạt ảnh Khối Năng lượng (Physics-Based Cascade Animation)
1. **Độ trễ tầng rơi (Cascade Waterfall Delay)**:
   - Các ô ở hàng dưới cùng (`y = height - 1`) sẽ tiếp đất trước, các hàng phía trên tiếp đất nối tiếp theo công thức:
     $$\text{delay} = \min(260\text{ms}, (7 - y) \times 28\text{ms} + (x \pmod 3) \times 8\text{ms})$$
   - Tạo ra hiệu ứng làn sóng thác nước rơi liên hoàn cực kỳ thỏa mãn mắt nhìn.
2. **Độ nhún nảy tiếp đất (Landing Squash & Stretch)**:
   - Giai đoạn gia tốc rơi: Kéo dài theo trục đứng `scale(0.86, 1.16)`.
   - Giai đoạn va chạm mặt đất (50% keyframe): Nén dẹp biên độ lớn `scale(1.20, 0.80)` tạo cảm giác có trọng lượng thực.
   - Giai đoạn đàn hồi bật nảy (72% keyframe): Nảy ngược lên `translateY(-8px) scale(0.93, 1.07)`.
   - Ổn định tại `scale(1, 1)` với `opacity: 1 !important` (triệt tiêu 100% lỗi biến mất ô).
3. **Hoạt ảnh Kết tinh Khối mới (Crystalline Pop-In)**:
   - Khối năng lượng mới sinh ra từ một hạt photon vi mô `scale(0.3) rotate(-6deg)`, bùng sáng `filter: brightness(2.2)` rồi nở rộ `scale(1.15)` trước khi cố định.
4. **Phản hồi nước đi sai (Invalid Swap Spring-Shake)**:
   - Rung lắc đàn hồi ngang kèm ánh sáng viền đỏ cảnh báo khi swap không tạo thành combo match.

### B. Ngôn Ngữ Thiết Kế Giao Diện (PGR Sci-Fi Aesthetic)
1. **Tinh thể Năng lượng Ánh sáng Cứng (Hard-Light Cyber Crystals)**:
   - Đổi toàn bộ 6 màu block sang dạng khối pha lê vát cạnh:
     - **C1 (Đỏ)**: *Thermal Crimson Core* (Lõi nhiệt năng rực lửa)
     - **C2 (Lam)**: *Plasma Cyan Crystal* (Khối plasma cao tần)
     - **C3 (Lục)**: *Nanite Emerald Shard* (Tinh thể tái tạo nanite)
     - **C4 (Vàng)**: *Kinetic Amber Prism* (Lăng kính xung năng lượng)
     - **C5 (Tím)**: *Graviton Violet Singularity* (Khối dị điểm trọng lực)
     - **C6 (Băng)**: *Cryo Arctic Matrix* (Ma trận băng tinh)
   - Lớp phủ bề mặt phản xạ đa giác (Prismatic Specular Facet) cho ánh kim sắc sảo.
2. **Bộ Khung Bàn Nối Tác Chiến (Tactical Grid HUD)**:
   - Đóng khung bàn đấu bằng viền Titanium `#0d121d` kèm các góc định vị quang học Cyan Neon (`#00e5ff`).
   - Khối đang chọn (`.cell.sel`): Vòng tiêu ngắm laser ba chiều (Holographic Reticle) nhấp nháy phát sáng.
3. **Ký hiệu Khối Đặc Biệt Chuẩn Công Nghệ**:
   - `═` / `║`: Chuyển thành tia laser phân tử quét hàng/cột (`━⚡━` / `┃⚡┃`).
   - `✸`: Chuyển thành hồng tâm dẫn đường tên lửa (`⌖`).
   - `✷`: Chuyển thành tinh thể cầu vồng quang phổ chớp sáng (`✦`).
   - `💣`: Chuyển thành khối cầu plasma hạng nặng (`✹`).

---

## 3. Kế Hoạch Triển Khai Kỹ Thuật (Antigravity Codebase Engine)

| File Cần Nâng Cấp | Hạng Mục Thay Đổi Cụ Thể |
| :--- | :--- |
| **`Web/style.css`** | Viết lại bộ quy tắc CSS của `.board-wrap`, `.cell`, 6 bảng màu pha lê, `@keyframes cascadeDrop`, `@keyframes popIn`, bộ khung viền góc Neon PGR. |
| **`Web/m3ui.js`** | Cập nhật hàm `renderBoard()`: Tính toán `animationDelay` theo tầng rơi cascade, gán các icon vi mạch công nghệ cao cho khối đặc biệt. |
| **`Web/index.html`** | Cập nhật thẻ tiêu đề và HUD tác chiến `RE:FRAY — Match-3 RPG (PGR Tactical Edition)`. |

---

## 4. Kiểm Thử & Nghiệm Thu
- Chạy `node Web/smoke_test.mjs` bảo đảm 51/51 assertions PASS.
- Chạy `Tools/host_tests/build_and_run.bat` bảo đảm 744/744 C++ host checks PASS.
- Đẩy commit lên `origin/main` để Vercel tự động deploy bản Web mới nhất.
