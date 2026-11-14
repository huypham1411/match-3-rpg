---
name: game-design-systems
description: "Bộ quy chuẩn Thiết Kế Hệ Thống Game (Systems Game Design Framework) cho Match-3 RPG, giải quyết bài toán Cân Bằng Gameplay, Flow State, Dynamic Feedback, và Triệt tiêu Thao tác Thừa."
---

# BỘ QUY CHUẨN THIẾT KẾ HỆ THỐNG GAME MATCH-3 RPG (SYSTEMS GAME DESIGN)

Tài liệu chỉ dẫn dành cho **Game Director**, **Combat Designer** và **Systems Architect** trong việc định hình luật chơi, cân bằng số liệu và giữ người chơi trong trạng thái hưng phấn ("Flow State").

---

## 1. NGUYÊN LÝ "FLOW STATE" & GIẢI TOÁN RNG FATIGUE

Trong các tựa game Match-3 RPG truyền thống, người chơi thường rơi vào trạng thái nản lòng khi:
- Bảng cờ không ra màu ngọc họ cần (RNG Lockout).
- Không có sự tương tác qua lại: Boss chỉ đánh theo lượt vô hồn.

### Giải pháp Hệ Thống của RE:FRAY:
1. **Quyền Chủ Động (Agency via Special Gems):**
   - Không phụ thuộc vào may rủi: Người chơi có thể tự tạo nước đi lớn bằng cách ghép 4 ô (Tia Laser) hoặc 5 ô (Bom/Lỗ Đen).
   - Khi kết hợp 2 Ngọc Đặc Biệt với nhau (Special Fusion), tạo ra hiệu ứng diện rộng lật ngược thế trận.
2. **Hệ Thống Chỉ Báo Hiểm Họa (Boss Telegraph System):**
   - Boss luôn báo trước đòn chí mạng từ 2-3 lượt (`Telegraph Countdown`).
   - Cung cấp cho người chơi mục tiêu cụ thể: **Hoặc tập trung dồn sát thương để Break Stagger làm choáng Boss, hoặc ghép ngọc Lam/Băng để Defender bật khiên chắn giảm 50% sát thương**.
3. **Quy Tắc "Less is More" (Tối giản để Tập trung):**
   - Loại bỏ các chuyển động 3D không phục vụ mục đích chiến thuật (bàn xoay, ngọc quay tít làm người chơi khó phán đoán nước đi kế tiếp).
   - Mọi animation phải phục vụ một mục đích: **Báo hiệu trạng thái, thông báo sát thương, hoặc xác nhận hành động**.

---

## 2. PHÂN TẦNG VAI TRÒ 4 ROLE (SQUAD RESONANCE)

| Role | Màu Nguyên Tố | Trọng Tâm Thiết Kế | Cơ Chế Đột Phá |
| :--- | :--- | :--- | :--- |
| **Attacker** (Astra) | Đỏ (Hỏa) & Vàng (Lôi) | Sát thương bộc phát (Burst DPS) | Gây x2 sát thương khi Boss bị Stagger Break. |
| **Defender** (Boran) | Băng & Lam Cobalt | Hấp thụ & Giảm tải sát thương | Tích tầng Nanite Shield khi match 4+ ngọc Lam. Tự kích hoạt khi Boss tung đòn nguy hiểm. |
| **Healer** (Lin) | Lục (Sinh Mệnh) | Sinh tồn & Thanh tẩy | Hồi máu theo cấp số nhân theo combo cascade. Phá giải trạng thái đóng băng/khóa ô của Boss. |
| **Supporter** (Elysia) | Tím (Hư Không) & Lam | Nạp nộ & Đột biến lượt | Tăng tốc độ hồi nộ cho các Hero đồng minh để kích hoạt chuỗi Ultimate Chain. |

---

## 3. QUY TRÌNH KIỂM CHỨNG TOÁN HỌC & DETERMINISM (PSTACK RIGOR)

1. Mọi công thức tính sát thương, hồi máu, tích khiên phải độc lập với tầng đồ họa.
2. Không dùng `Math.random()` hay `FMath::RandRange` thời gian thực trong Lõi. Mọi kết quả phải tái lập 100% qua `FMatchRng(seed)`.
3. Khi đề xuất tính năng mới, bắt buộc phải trả lời 3 câu hỏi:
   - *Tính năng này có giúp người chơi ra quyết định chiến thuật sâu sắc hơn không?*
   - *Tính năng này có làm rối mắt hoặc gây cản trở thao tác trên màn hình điện thoại không?*
   - *Hệ thống có thể kiểm thử tự động (Unit Test / Automated Assertions) được không?*
