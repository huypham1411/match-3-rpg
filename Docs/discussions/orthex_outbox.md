# 🎮 CHIẾN LƯỢC ĐỘT PHÁ GAMEPLAY MATCH-3 RPG (RE:FRAY)
*Thời gian:* `2026-11-14 01:08:34` | *Tiêu chuẩn:* **Pstack Michelin Rigor (Lauren Tan)** | *Hiệp:* **1**

---

### 1. NHẬN DIỆN ĐIỂM NGHẼN CỦA MATCH-3 TRUYỀN THỐNG
* **Vấn đề may rủi (RNG Fatigue):** Người chơi cảm thấy bất lực khi bảng ngọc không ra màu mong muốn.
* **Tương tác thụ động:** Match-3 cổ điển chỉ đơn giản là "ăn 3 ngọc -> gây 1 nhát chém", thiếu sự kịch tính và phối hợp combo giữa các Role.
* **Boss thiếu cá tính:** Đa phần quái chỉ đứng yên nhận đòn rồi đánh trả theo lượt nhàm chán.

---

### 2. BỐN (04) TRỤ CỘT GAMEPLAY MỚI ĐÃ ĐƯỢC THIẾT KẾ & TÍCH HỢP:

#### ⚡ Trụ cột 1: Gia Công Ngọc Giả Kim Cấp Cao (Special Gem Synthesis)
* **Match-4 (Hàng/Cột):** Tạo ra **Laser Striped Gem**. Khi kích nổ quét sạch toàn bộ hàng hoặc cột tương ứng.
* **Match-5 (Chữ L hoặc T):** Tạo ra **Vortex Bomb**. Nổ diện rộng 3x3, dọn sạch bàn cờ.
* **Match-5 (Thẳng hàng):** Tạo ra **Prismatic Core (Lỗ Đen Sắc Màu)**. Khi hoán đổi với bất kỳ viên ngọc nào, kích nổ TOÀN BỘ ngọc cùng màu trên bàn cờ, nạp năng lượng cực đại cho toàn đội!

#### 🎯 Trụ cột 2: Cơ Chế Chỉ Báo Đòn Hiểm & Choáng Trùm (Boss Telegraph & Break Stagger)
* Lấy cảm hứng từ *Honkai: Star Rail* và *Persona 5*: Boss Sentinel Unit 07 hiển thị **Đếm ngược đòn chí mạng** (`Hủy Diệt Pháo [2 Turn Nữa]`).
* **Chiến thuật rủi ro - phần thưởng:** Người chơi có thể dồn combo để đánh sập thanh Toughness (Stagger Break). Khi Break thành công, đòn chí mạng của Boss bị ngắt hoàn toàn và Boss nhận **x2 Sát thương**!

#### 🛡️ Trụ cột 3: Cộng Hưởng Nguyên Tố & Phối Hợp 4 Role (Attacker, Supporter, Healer, Defender)
* **Hỏa/Lôi (Attacker):** Gây sát thương bộc phát và tích lũy nộ kích hoạt Ultimate.
* **Băng/Hải Lưu (Defender):** Tích tầng Nanite Shield. Khi Boss tung đòn hủy diệt, khiên tự động kích hoạt giảm 50% sát thương nhận vào.
* **Sinh Mệnh (Healer):** Hồi máu cho toàn đội tăng theo cấp số nhân theo chuỗi Combo Cascade.
* **Hư Không (Supporter):** Nạp nộ cho các đồng minh lân cận để thực hiện chuỗi Ultimate Chain.

#### 🎥 Trụ cột 4: Trải Nghiệm Thị Giác 3D & Phản Hồi Xúc Giác (Three.js Presentation)
* Render khối 3D với vật liệu kim loại ánh kim PBR, hiệu ứng rơi nảy Squash & Stretch.
* Ngọc đặc biệt có vòng hào quang xoay bát diện 3D và hệ thống thông báo Toast Banner nổi bật trên màn hình.

---

### 3. BẰNG CHỨNG THỰC THI (VERIFICATION RECEIPTS)
✅ **Mã nguồn Three.js Web:** Đã cập nhật thuật toán Special Gems, Boss Telegraph và Toast Banner vào `Web/src/core/GameState.js`, `Board3D.js`, `HUD.js`.
✅ **Kiểm thử C++ Lõi:** 744/744 assertions PASSED (`Tools/host_tests/build_and_run.bat`).
✅ **Kiểm thử WebAssembly:** 51/51 checks PASSED (`node Web/smoke_test.mjs`).
