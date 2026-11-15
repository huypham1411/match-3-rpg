---
name: cinematic-camera-director
description: "Quy chuẩn điều khiển Cinematic Dynamic Camera cho Game 3D RPG: Natural idle sway, random character focus framing, action zoom-out khi có tương tác/hành động, và cơ chế chuyển cảnh mượt mà Spring-Damper Interpolation."
---

# Quy Chuẩn Đạo Diễn Camera Game 3D (Cinematic Dynamic Camera)

Tài liệu chuẩn hóa hành vi và thuật toán điều khiển camera động trong trận chiến 3D của RE:FRAY.

## 1. Hành vi Trạng thái Nghỉ (Idle State - Natural Cinematic Sway)
- **Dao động tự nhiên (Breathing/Organic Drift):**
  - Camera không đứng im đờ đẫn mà dao động nhẹ theo hàm sin kép nhiều tần số:
    $$x_{drift} = A_x \cdot \sin(\omega_1 t) + B_x \cdot \cos(\omega_2 t)$$
    $$y_{drift} = A_y \cdot \cos(\omega_3 t)$$
  - Biên độ dao động nhẹ nhàng ($A \approx 0.15 - 0.25$), chu kỳ $4 - 6\text{s}$, tạo cảm giác ống kính điện ảnh quay tay (Handheld organic camera).

## 2. Cơ chế Tiêu điểm Ngẫu nhiên (Idle Random Focus Drift)
- Trong lúc người chơi đang suy nghĩ ghép ngọc (Idle $4 - 8\text{s}$):
  - Camera tự động chuyển tiêu điểm nhẹ nhàng sang một trong các chủ thể ngẫu nhiên:
    - **Hero Focus:** Zoom nhẹ về phía Hero đang chuẩn bị đầy năng lượng hoặc có động tác khởi động.
    - **Boss Focus:** Hướng góc nhìn về phía Boss Mecha đang thở phì phò sạc năng lượng.
    - **Arena Center:** Trả về trung tâm khi hết chu kỳ focus.
  - Chuyển động sử dụng nội suy mượt mà Spherical Linear Interpolation (SLERP / SmoothDamp) với $\tau \approx 1.2\text{s}$.

## 3. Cơ chế Phóng xa Toàn cảnh khi Tác chiến (Combat Action Zoom-Out)
- Khi có bất kỳ hành động nào xảy ra (Match-3 cascade, Hero Lunge Attack, Boss Titan Strike, Skill Ultimate):
  - **Zoom Out Action:** Camera lùi về phía sau và nâng cao góc chụp ($Z_{target} = Z_{base} + 1.8 \sim 2.5$, $Y_{target} = Y_{base} + 0.8 \sim 1.2$) để bao quát trọn vẹn toàn bộ sân đấu và hiệu ứng va chạm VFX.
  - **Trauma Screen Shake:** Khi có đòn đánh trúng đích (Hit), áp dụng rung giật chấn động với biên độ suy giảm hàm mũ:
    $$shake(t) = S_0 \cdot e^{-\lambda t} \cdot \text{noise}(t)$$
  - **Settle Recovery:** Khi chuỗi animation kết thúc, camera lướt êm dịu trở lại vị trí chuẩn bị chiến đấu.
