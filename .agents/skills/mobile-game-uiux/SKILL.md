---
name: mobile-game-uiux
description: "Bộ tiêu chuẩn thiết kế UI/UX Game Mobile chuyên nghiệp (Mobile-First Touch Ergonomics, Thumb Zone, Visual Hierarchy, Anti-Visual Slop). Áp dụng cho các thể loại Turn-based RPG & Match-3."
---

# BỘ TIÊU CHUẨN THIẾT KẾ UI/UX GAME MOBILE (MOBILE-FIRST GAME UX)

Tài liệu hướng dẫn và ràng buộc thiết kế dành cho **Lead UI/UX Designer**, **Frontend Engineer**, và **Graphic Artists** khi phát triển giao diện game trên thiết bị di động (iPhone & Android).

---

## 1. NGUYÊN TẮC CỐT LÕI (CORE TENETS)

### A. Triệt tiêu "Visual Slop" & Rườm rà Không Cần Thiết
* **Clarity over Clutter (Rõ ràng trên hết):** Trong game giải đố match-3, người chơi phải nhận diện bàn cờ, màu ngọc và trạng thái quái trong **dưới 0.2 giây**.
* **Cấm tiệt xoay camera / ngọc quay chóng mặt:** Bàn cờ match-3 phải **cố định, phẳng hoặc góc phối cảnh isometric nhẹ ổn định**. Tuyệt đối không cho phép camera xoay lắc khi người chơi vuốt ngón tay đổi ô. Không dùng các chi tiết 3D xoay vòng tròn làm phân tâm người chơi.
* **Biểu tượng tối giản, độ tương phản cao:** Các khối ngọc đặc biệt (Line Row/Col, Bomb, Prismatic Core) phải có ký hiệu đồ hoạ phẳng 2D hoặc khắc chìm sắc nét (Laser stripe, Crosshair, Diamond Star), có thể phát sáng (emissive pulse) nhẹ nhàng nhưng không được xoay đảo làm rối mắt.

---

## 2. THIẾT KẾ CÔNG THÁI HỌC VÙNG NGÓN TÁI (THUMB ZONE ERGONOMICS)

```
┌─────────────────────────────────┐
│     TOP 20%: VÙNG QUAN SÁT      │  -> Boss HP, Stagger Bar, Turn Counter
│      (KHÔNG ĐẶT NÚT BẤM)        │     (Chỉ hiển thị thông số tĩnh)
├─────────────────────────────────┤
│                                 │
│     MIDDLE 55%: BÀN CỜ 3D       │  -> Vùng tương tác vuốt chạm chính
│      (CỐ ĐỊNH, KHÔNG XOAY)      │     Ô ngọc tối thiểu 44px x 44px
│                                 │
├─────────────────────────────────┤
│   BOTTOM 25%: THUMB DOCK (TỰ DO)│  -> 4 Thẻ Hero, Nút Ultimate, Kỹ năng
│    (TẦM VỚI TỰ NHIÊN CỦA TAY)   │     Nút bấm to rõ, phản hồi rung/sáng
└─────────────────────────────────┘
```

### Quy tắc phân bổ:
1. **Vùng Đáy (Bottom 25%):** Nơi ngón cái chạm tới dễ nhất. Đặt 4 thẻ nhân vật, vòng năng lượng nộ (Ultimate ring) và các nút kỹ năng khẩn cấp.
2. **Vùng Giữa (Middle 55%):** Bàn cờ 8x8 chiếm trọn chiều ngang màn hình. Mỗi viên ngọc có diện tích tiếp xúc tối thiểu `44px x 44px` (chuẩn Apple HIG và Google Material Design) để tránh chạm nhầm.
3. **Vùng Đỉnh (Top 20%):** Chỉ dùng để hiển thị thanh máu Boss, Toughness/Stagger, và huy hiệu Chương màn chơi. Không đặt bất kỳ nút bấm tương tác quan trọng nào ở góc trên vì người dùng một tay không thể với tới.

---

## 3. TỶ LỆ MÀN HÌNH DỌC (PORTRAIT RATIO) TRONG THREE.JS

* Màn hình điện thoại có tỷ lệ dọc rất hẹp: từ `9:16` (1080x1920) đến `9:19.5` (iPhone 14/15/16: 1179x2556) hoặc `9:21` (Sony Xperia).
* **Quy chuẩn Camera Three.js:**
  ```javascript
  const aspect = window.innerWidth / window.innerHeight;
  // Khi màn hình dọc (aspect < 1.0):
  if (aspect < 1.0) {
      camera.fov = 58; // Mở rộng góc nhìn đứng để không bị cụt mép bàn cờ
      camera.position.set(0, 18, 16);
      controls.enableRotate = false; // KHÓA XOAY CAMERA TRÊN MOBILE
  }
  ```
* **CSS Touch Action:**
  Bắt buộc đặt `touch-action: none;` trên `#canvasContainer` và thẻ `<canvas>` để trình duyệt không kích hoạt tính năng vuốt cuộn trang (bounce scroll) hay phóng to (pinch-to-zoom) ngoài ý muốn.

---

## 4. PHẢN HỒI XÚC GIÁC & VI TƯƠNG TÁC (MICRO-INTERACTIONS)

1. **Chọn ngọc (Select):** Phóng to nhẹ `1.08x` + Viền phát sáng Neon trắng (100ms spring). Tuyệt đối không scale quá to làm biến dạng các ô xung quanh.
2. **Hoán đổi thành công (Valid Swap):** Di chuyển thẳng theo trục X/Y với easing `cubic-bezier(0.25, 1, 0.5, 1)` trong 160ms.
3. **Hoán đổi thất bại (Invalid Swap):** Trượt 50% quãng đường rồi tự đàn hồi giật lùi về vị trí cũ trong 120ms kèm rung nhẹ (Shake 3px).
4. **Nổ ngọc (Match Shatter):** Thu nhỏ về tâm kèm hạt bụi nổ (Particle burst 200ms) rồi biến mất ngay lập tức, không để lại vết tàn tích rác trên màn hình.
5. **Rơi tiếp đất (Landing):** Co giãn nhẹ Squash & Stretch (trục Y nén 15% trong 60ms) tạo cảm giác trọng lực chắc chắn ("Juice").

---

## 5. BẢNG MÀU TƯƠNG PHẢN CAO CHO MÀN HÌNH OLED / AMOLED

* Nền game: Đen sâu `#0a0c14` hoặc `#0f172a` giúp tiết kiệm pin OLED và làm nổi bật màu sắc ngọc.
* 6 Màu ngọc chuẩn (Dễ phân biệt cả cho người mù màu):
  - **Đỏ Hỏa (Crimson):** `#ef4444` (Attacker)
  - **Lam Cobalt (Deep Blue):** `#2563eb` (Defender/Support)
  - **Lục Emerald (Bio Green):** `#10b981` (Healer)
  - **Vàng Lôi (Volt Yellow):** `#f59e0b` (Attacker/Breaker)
  - **Tím Hư Không (Amethyst):** `#8b5cf6` (Supporter)
  - **Băng Tuyết (Cyan Frost):** `#38bdf8` (Defender)
