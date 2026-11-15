---
name: chibi-character-animation
description: "Quy chuẩn và nguyên lý diễn hoạt 3D Chibi Anime RPG (Animation Director Standard): Easing, Squash & Stretch, Anticipation, Hit-Stop, VFX Sync, và Vũ đạo Kỹ năng Đặc biệt."
---

# 🎭 CHIBI CHARACTER ANIMATION DIRECTOR SPECIFICATION
*Bộ quy chuẩn Nghệ thuật Diễn hoạt 3D Chibi Anime RPG (Chibi 1:2.5 Ratio & Dynamic Combat)*

---

## 1. NGUYÊN LÝ CỐT LÕI (CORE PRINCIPLES CHO CHIBI 1:2.5)

Nhân vật Chibi Anime có tỉ lệ đầu to (1:2.5), thân ngắn và chi tiết cách điệu. Diễn hoạt truyền thống sẽ trông đơ hoặc gãy nếu không áp dụng các nguyên lý đặc thù:

### 1.1. Squash & Stretch (Biến dạng Nén - Giãn Thể Tích)
* **Quy tắc bảo toàn thể tích**: Khi nhân vật nén trục dọc ($S_y < 1.0$), hai trục ngang bắt buộc phải nở ra ($S_x, S_z > 1.0$) theo công thức $S_x \cdot S_y \cdot S_z \approx 1.0$.
* **Khi tiếp đất / Lấy đà**: $S_y = 0.82$, $S_x = S_z = 1.10$.
* **Khi phóng vút lao tới (Lunge Jump)**: $S_y = 1.25$, $S_x = S_z = 0.89$.

### 1.2. Anticipation & Hit-Stop (Lấy Đà & Dừng Khung Đắc Lực)
* **Anticipation (Dự lệnh động tác - 0.12s ~ 0.20s)**: Trước khi vung kiếm hoặc xuất chiêu, nhân vật phải lùi nhẹ về sau ($Z_{\text{rel}} > 0$), hạ thấp trọng tâm ($Y_{\text{rel}} < 0$) và tích tụ năng lượng.
* **Hit-Stop (Micro-Pause 0.05s ~ 0.08s)**: Ngay khoảnh khắc vũ khí chạm quái hoặc vụ nổ kích hoạt, toàn bộ chuyển động dừng 2-3 frames để tạo cảm giác lực nặng (Weight & Impact Feel).

---

## 2. BẢNG TRẠNG THÁI DIỄN HOẠT 6 PHA (6-STATE ANIMATION SPEC)

| Trạng thái | Thời lượng | Biến dạng Mesh ($S_x, S_y, S_z$) | Dịch chuyển ($\Delta X, \Delta Y, \Delta Z$) | Decal Mặt | Hiệu ứng VFX |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`idle`** | Vô tận (Loop) | $(1.0, 1.0 \pm 0.03, 1.0)$ nhịp sin 2Hz | $\Delta Y = \pm 0.02\text{m}$ | `normal` | Hào quang vũ khí nhấp nháy nhẹ |
| **`anticipate`**| $0.15\text{s}$ | $(1.10, 0.85, 1.10)$ Squash | $\Delta Z = +0.15\text{m}, \Delta Y = -0.08\text{m}$ | `attack` | Vòng sáng hội tụ dưới chân |
| **`attack`** | $0.45\text{s}$ | $(0.88, 1.22, 0.88)$ Stretch | $\Delta Z = -0.85\text{m}$ (Lao tới Boss) | `attack` | Vệt kiếm lướt (Slash Trail Arc) |
| **`hit`** | $0.35\text{s}$ | $(1.08, 0.92, 1.08)$ Flinch | $\Delta Z = +0.35\text{m}, \Delta Y = +0.05\text{m}$ | `hit` (> <) | Trauma Flash chớp trắng 0.1s |
| **`die`** | $0.80\text{s}$ | $(1.15, 0.60, 1.15)$ Ngã gục | $\text{Rot}_x = +80^\circ, \Delta Y = -0.35\text{m}$ | `die` (X_X) | Hạt tan biến Hologram mờ dần |
| **`revive`** | $0.60\text{s}$ | $(0.85, 1.30, 0.85)$ Bật nảy | $\Delta Y = +0.80\text{m} \to 0$ (Spring Drop) | `normal` | Vòng xung kích phục sinh phát sáng |

---

## 3. QUY CHUẨN TỔ HỢP NGỌC ĐẶC BIỆT (SPECIAL GEM COMBINATIONS)

Khi 2 khối ngọc đặc biệt được hoán đổi trực tiếp với nhau, hệ thống Match-3 KHÔNG được từ chối hoàn tác (`revert`) mà bắt buộc phải kích hoạt cơ chế kích nổ tương tác:

1. **`LINE + LINE` (Song Tên Lửa)**:
   * Kích hoạt quét đồng thời cả Hàng ngang và Cột dọc (Cross Cleave) giao nhau tại tâm hoán đổi.
2. **`BOMB + LINE` (Bom + Tên Lửa - Candy Crush Mega Sweeper)**:
   * Nếu Tên lửa Ngang: Thổi bay liên tiếp **3 Hàng Ngang** ($Y-1, Y, Y+1$).
   * Nếu Tên lửa Dọc: Thổi bay liên tiếp **3 Cột Dọc** ($X-1, X, X+1$).
   * Tăng gấp 3 lần sát thương và bào mòn Stagger cực mạnh lên Boss.
3. **`BOMB + BOMB` (Song Bom Đại Pháo)**:
   * Kích nổ diện rộng **$5 \times 5$** ô xung quanh vị trí hoán đổi, quét sạch mọi chướng ngại vật trong vùng.
4. **`SWAP_ALL + LINE / BOMB` (Ngũ Sắc Dung Hợp)**:
   * Biến toàn bộ ngọc có màu phổ biến nhất thành loại ngọc tương ứng (Line hoặc Bomb) và đồng loạt phát nổ dây chuyền.
5. **`SWAP_ALL + SWAP_ALL` (Song Lỗ Đen)**:
   * Hủy diệt toàn bộ bàn cờ ($8 \times 8$), kích hoạt Super Combo x3 toàn đội.

---

## 4. TIÊU CHÍ DUYỆT & NGHIỆM THU (ACCEPTANCE GATES)
* **Gate 1**: 100% các cặp hoán đổi ngọc đặc biệt hợp lệ không kích hoạt `swap_reject`.
* **Gate 2**: Animation không bị giật, FPS $\ge 60$ trên Three.js WebGL.
* **Gate 3**: Bộ test độc lập đạt Pass 100% trước khi bàn giao cho Director.
