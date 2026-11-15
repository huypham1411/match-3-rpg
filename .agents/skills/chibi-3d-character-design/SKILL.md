---
name: chibi-3d-character-design
description: "Tiêu chuẩn và hướng dẫn thiết kế mô hình 3D Chibi Anime cho game RPG: Tỷ lệ 1:2.5, hướng nhìn chiến thuật (Facing Vector) hướng về Boss, khối tóc layer lập thể, biểu cảm mắt anime và vũ khí phát quang Neon."
---

# Quy Chuẩn Thiết Kế Mô Hình 3D Chibi Anime (RE:FRAY Standard)

Tài liệu hướng dẫn và tiêu chuẩn kỹ thuật thiết kế mô hình 3D phong cách Chibi Anime cho dự án RE:FRAY Match-3 RPG.

## 1. Tỷ lệ nhân vật (Body Proportions - 1:2.5 Head-to-Body Ratio)
- **Chiều cao tổng thể:** 2.2 - 2.5 đơn vị tỷ lệ đầu (Head units).
- **Phần Đầu:** Chiếm 40-45% chiều cao nhân vật. Dạng hình cầu tròn hơi dẹt ngang (`scale(1.0, 0.94, 0.98)`), mang nét cute anime đặc trưng.
- **Thân và Trang phục:** Thắt lưng thon gọn, áo choàng/giáp công nghệ cyberpunk có đường cắt vát hình học sắc nét.
- **Tóc (Layered Anime Hair):** Khối tóc lập thể chia lớp (mái trước, lọn hai bên, búi/đuôi ngựa phía sau) có highlight và đổ bóng gradient.
- **Gương mặt biểu cảm (Expressive Face Decal):**
  - Mắt to tròn long lanh, viền mi cong, có ít nhất 2 đốm sáng phản quang (Sparkle highlights).
  - 4 trạng thái biểu cảm thời gian thực: `normal` (tươi vui/tập trung), `attack` (sắc bén, quyết tâm), `hit` (mắt nheo > <, miệng chữ O), `die` (mắt chữ X x, miệng gợn sóng).

## 2. Quy tắc Định hướng Tác chiến (Combat Facing Vector Invariant)
> [!IMPORTANT]
> **Tuyệt đối không để nhân vật quay lưng lại với kẻ địch!**
- **Vị trí Boss:** Ở góc nhìn sân đấu 3D, Boss ngự trị tại phía sau sàn đấu ($Z_{boss} \approx -1.9$ đến $-2.5$).
- **Vị trí Heroes:** Đội hình 4 nhân vật đứng phía trước ($Z_{hero} \approx +1.2$ đến $+1.6$).
- **Góc quay nhân vật (Facing Orientation):**
  - Nhân vật phải quay mặt hướng về phía Boss: $\vec{D}_{facing} = \text{normalize}(\vec{P}_{boss} - \vec{P}_{hero})$.
  - Để người chơi nhìn thấy vẻ đẹp biểu cảm Chibi từ Camera (đặt tại $+Z$), đội hình nhân vật được xoay theo góc **3/4 Tactical Stance** (quay mặt chéo về phía đối thủ ở góc $150^\circ - 165^\circ$, kết hợp đầu xoay nhẹ theo tầm nhìn camera), đảm bảo vừa nhìn thẳng vào Boss vừa khoe trọn góc mặt anime đáng yêu và vũ khí sắc sảo.

## 3. Vũ khí & Hiệu ứng Phát quang (Emissive Weapons & VFX)
- **Astra (Duelist):** Cặp song kiếm Katana năng lượng đỏ rực (`0xff3b30`) với hiệu ứng lôi điện chạy dọc lưỡi kiếm.
- **Elysia (Supporter):** 3 quả cầu tinh thể hư vô Dodecahedron tím (`0xc084fc`) tự quay quanh quỹ đạo cơ thể với vận tốc $\omega = 1.2\text{ rad/s}$.
- **Lin (Healer):** Quyền trượng Nanite lục bảo (`0x10b981`) với đỉnh trượng đính ngọc phát sáng và vòng hào quang hồi phục.
- **Boran (Defender):** Khiên năng lượng bát giác công nghệ cao (`0x2563eb`) với hoa văn mạch điện viễn tưởng phản chiếu ánh sáng kim loại.
