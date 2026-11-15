# [SPEC] DIỄN HOẠT FRAME-BY-FRAME & NÂNG CẤP CHI TIẾT 3D CHIBI ANIME MODEL
### Feature Specification: Chibi Procedural Animation Engine & High-Fidelity 3D Assets
*Tài liệu đặc tả hệ thống Game Design theo quy chuẩn Docs/MULTI_AGENT_WORKFLOW_SOP.md*  
*Mã đặc tả:* **SPEC-ANIM-ASSET-003** | *Phiên bản:* **1.0.0** | *Tác giả:* **Game Designer (`@game_designer`)**  
*Căn cứ kỹ thuật:* [chibi-3d-character-design](file:///d:/self/match-3-rpg/.agents/skills/chibi-3d-character-design/SKILL.md), [chibi-character-animation](file:///d:/self/match-3-rpg/.agents/skills/chibi-character-animation/SKILL.md)  
*Đối tượng thụ hưởng:* **QC Lead (`@qc_lead`)**, **Developers (`@web_dev`, `@character_animator`)**  
*Trạng thái:* **BAN HÀNH CHÍNH THỨC — CHUYỂN GIAO QC & DEV THỰC THI**

---

## 1. BỐI CẢNH & PHẢN BIỆN TỪ GIÁM ĐỐC SẢN XUẤT (DIRECTOR FEEDBACK)

Chỉ thị Command #6 từ Director:
> *"Thêm animation cho nhân vật đi, và tôi vẫn thấy 3d asset k đổi j, làm chibi 3d khó v sao? Nếu có skill 3d game asset thì áp dụng vào"*

### Phân Tích Nguyên Nhân Gốc Rễ (Root Cause Analysis):
1. **Lỗi Trình Duyệt Mobile Lưu Cache Cũ (Stale Asset Cache):**
   - File `Web/index.html` gọi `<script defer src="/dist/game.bundle.js"></script>` không có tham số phiên bản (`?v=...`).
   - Mobile Safari/Chrome lưu cache cục bộ khiến người chơi mở web trên điện thoại vẫn tải bundle cũ của các chu kỳ trước mà không nhận được model Chibi mới!
   - `mobile_remote.py` đặt `Cache-Control: public, max-age=300` cho thư mục `dist/`, tiếp tay cho việc cache trên proxy Cloudflare và trình duyệt.
2. **Animation Snap Bằng `setTimeout` Thiếu Diễn Hoạt Mượt Mà (Frame-by-Frame):**
   - Trong `Diorama3D.js`, các hàm `playHeroAttack` và `playHeroSuperAttack` chỉ đặt vị trí tức thời rồi dùng `setTimeout(..., 320ms)` để đặt lại vị trí cũ.
   - Vòng lặp `update(delta)` hoàn toàn bỏ qua việc tính toán chuyển động khi `state !== 'idle'`. Nhân vật bị đơ cứng ở tiền tuyến trong 320ms rồi biến mất giật lùi về vị trí cũ!
3. **Mặt Decal Bị Lồng Xuyên Thấu (Clipping Z-Fighting):**
   - `faceMesh` được add vào `bodyGroup` tại $Z = 0.49$, trong khi bán kính đầu là $0.50$. Tấm mặt phẳng bị chìm một phần vào khối cầu đầu và không tự động quay theo góc ngước/nghiêng của đầu `headMesh`.
4. **Chi Tiết Tạo Hình Chibi Thiếu Bộ Phận Nhận Diện (Limbs & Chunky Boots):**
   - Nhân vật thiếu tay cầm vũ khí và ủng chân Chibi đế dày đặc trưng, khiến tỷ lệ cơ thể trông như khối hình học thô chưa hoàn thiện.

---

## 2. QUY CHUẨN KỸ THUẬT NÂNG CẤP (TECHNICAL SPECIFICATION)

### 2.1. Cấu Trúc Khớp & Khối 3D Chibi Đầy Đủ (Anatomy Hierarchy)
Mỗi Hero Chibi trong `Diorama3D.js` bắt buộc phải có đầy đủ các bộ phận:
1. `headMesh`: Khối cầu đầu tỷ lệ 1:2.5, scale `(1.0, 0.94, 0.98)` bầu bĩnh đáng yêu.
2. `faceMesh`: Decal biểu cảm 4 pha, **bắt buộc là con trực tiếp của `headMesh`** (`headMesh.add(faceMesh)`), đặt tại $(0, 0, 0.505)$ với `renderOrder = 10` để triệt tiêu 100% hiện tượng Z-fighting.
3. `limbs`:
   - 2 Cánh tay Chibi hình trụ bầu (`CylinderGeometry(0.08, 0.07, 0.32)`), tay phải gắn weapon socket.
   - 2 Ủng chân Chibi Chunky Boots (`BoxGeometry(0.18, 0.16, 0.28)`) có đế cao su màu đen/xám tương phản, đặt ở $Y = -0.32$.
4. `hair`: Khối tóc đa lớp (Mái trước, lọn 2 bên, búi/đuôi ngựa sau) có độ bóng specular chuẩn anime.

### 2.2. Động Cơ Diễn Hoạt Từng Khung Hình (Frame-by-Frame Procedural Animation)
Toàn bộ diễn hoạt phải được cập nhật mượt mà trong `update(delta, elapsed)` với hàm nội suy thời gian thực:

1. **Pha 1: Anticipation (Gồng Lấy Đà - 0.15s):**
   - $S_y = 0.85$, $S_x = S_z = 1.10$ (Squash nén thể tích).
   - $\Delta Z = +0.18\text{m}$, $\Delta Y = -0.08\text{m}$.
   - Vũ khí nghiêng ngược ra sau $\text{Rot}_x = +0.6\text{ rad}$.
2. **Pha 2: Lunge Leap (Phóng Lao Tới Địch - 0.25s):**
   - Quỹ đạo parabol: $Z(t) = \text{baseZ} + \Delta Z \cdot t$, $Y(t) = \text{baseY} + \sin(\pi \cdot t) \cdot 0.35\text{m}$.
   - $S_y = 1.25$, $S_x = S_z = 0.89$ (Stretch giãn dài thể tích).
   - Vũ khí vung chém quét vòng cung: $\text{Rot}_x = -1.8\text{ rad}$, $\text{Rot}_z = +0.8\text{ rad}$.
3. **Pha 3: Hit-Stop & Impact (Ngưng Đọng Va Chạm - 0.06s):**
   - Dừng toàn bộ chuyển động trong 0.06s, kích hoạt chớp sáng (Impact Flash) và rung chấn màn hình.
4. **Pha 4: Spring Recoil Return (Lùi Về Đàn Hồi - 0.20s):**
   - Hồi quy về vị trí ban đầu bằng thuật toán Spring-Damper:
     $$\vec{P}(t) = \text{Lerp}(\vec{P}_{\text{impact}}, \vec{P}_{\text{base}}, \text{EaseOutQuad}(t))$$
   - Dao động đàn hồi nén giãn $S_y = 1.0 \pm 0.08 \cdot \cos(15 t) \cdot e^{-5t}$ dập tắt dần về $1.0$.

### 2.3. Triệt Tiêu Cache Triệt Để Cho Trình Duyệt Mobile (Zero-Stale Invariant)
1. Trong `Web/index.html`:
   - Thêm query version timestamp cho toàn bộ assets:
     `<script defer src="/dist/game.bundle.js?v=20261115_chibi_anim_v4"></script>`
     `<link rel="stylesheet" href="/css/game.css?v=20261115_chibi_anim_v4">`
2. Trong `Tools/pipeline/mobile_remote.py`:
   - Đặt `Cache-Control: no-cache, no-store, must-revalidate` cho mọi file trong `dist/` và `src/`.

---

## 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA - AC-01 -> AC-12)

- **AC-01**: Cụm `headMesh` chứa trực tiếp `faceMesh` tại $Z \ge 0.50$ để triệt tiêu Z-fighting.
- **AC-02**: Nhân vật sở hữu 2 cánh tay (`leftArm`, `rightArm`) và 2 ủng chân (`leftBoot`, `rightBoot`).
- **AC-03**: Diễn hoạt `playHeroAttack` trải qua đủ 4 pha (`anticipate` $\to$ `lunge` $\to$ `hit_stop` $\to$ `recoil` $\to$ `idle`).
- **AC-04**: Trong pha `anticipate`, hệ số Squash $S_y \le 0.90$ và $S_x \ge 1.05$.
- **AC-05**: Trong pha `lunge`, hệ số Stretch $S_y \ge 1.15$ và $S_x \le 0.95$, cự ly lao $\Delta Z \le -2.5\text{m}$.
- **AC-06**: Khi chạm đích, thời gian dừng `hitStopTimer` $\ge 0.05\text{s}$.
- **AC-07**: Trong pha `recoil`, vị trí nhân vật trở về `basePos` với độ lệch $\le 0.02\text{m}$.
- **AC-08**: Diễn hoạt `playHeroSuperAttack` thực hiện cú nhảy vọt $Y \ge 1.5\text{m}$ và xoay lộn 360 độ.
- **AC-09**: Diễn hoạt `playHeroHit` lùi về sau $\Delta Z \ge +0.3\text{m}$ kèm chớp biểu cảm mắt `hit`.
- **AC-10**: File `Web/index.html` có chứa tham số cache-busting `?v=` cho `game.bundle.js`.
- **AC-11**: `mobile_remote.py` cấu hình header `no-cache` cho các file bundle di động.
- **AC-12**: Bộ test kiểm thử độc lập đạt 100% PASS, zero errors, hiệu năng $\ge 60$ FPS.
