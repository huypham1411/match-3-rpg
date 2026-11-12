# RE:FRAY — HỆ THỐNG GIAO DIỆN & CƠ CHẾ PHIÊU LƯU NGOÀI MAP (OVERWORLD EXPLORATION & CHIBI SYSTEM)

Tài liệu thiết kế chi tiết (Game Design & UI/UX Specification) do **Combat & Systems Designer**, **Lead UI/UX Designer** và **3D Sculpt / Animator** phối hợp xây dựng, định hình toàn bộ cơ chế phiêu lưu ngoài bản đồ (Overworld Mode), điều khiển nhân vật Chibi và chuyển cảnh giao chiến trong **RE:FRAY / MatchRPG**.

---

## 1. TỔNG QUAN VÒNG LẶP HAI CHẾ ĐỘ (THE DUAL-MODE CORE LOOP)

RE:FRAY vận hành theo chu trình kép giữa **Khám Phá Thế Giới (Overworld)** và **Giao Chiến Match-3 (Combat)**:

```
+---------------------------------------------------------------------------------+
|                                CHU TRÌNH DUAL-MODE                              |
+---------------------------------------------------------------------------------+
|                                                                                 |
|   [ CHẾ ĐỘ 1: THÁM HIỂM (OVERWORLD) ]                                           |
|   - Điều khiển nhân vật Chibi 3D chạy khắp bản đồ (WASD / Joystick / Click-to-Move).|
|   - Tương tác NPC, nhận nhiệm vụ, mở rương tiếp tế, giải đố môi trường.         |
|   - Quái vật / Boss đi tuần tra ngoài bản đồ với tầm nhìn (Sight Cone).          |
|                                     │                                           |
|                        Chạm trán quái (Encounter)                                |
|                        Hiệu ứng vỡ màn hình (Shatter FX)                         |
|                                     ▼                                           |
|   [ CHẾ ĐỘ 2: GIAO CHIẾN (COMBAT MODE) ]                                        |
|   - Nửa trên: Chiến trường 3D Diorama tỷ lệ chuẩn Anime PGR (7.8 đầu).          |
|   - Nửa dưới: Bàn cờ Match-3 giải phóng kỹ năng và tuyệt chiêu.                 |
|                                     │                                           |
|                         Chiến thắng / Rút lui                                   |
|                                     ▼                                           |
|   [ TRỞ LẠI OVERWORLD ] -> Nhận phần thưởng, mở khóa lối đi sang khu vực mới.   |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

---

## 2. BỐ CỤC GIAO DIỆN NGOÀI BẢN ĐỒ (OVERWORLD UI/UX WIREFRAME)

### Bố cục Màn Hình Ngang (Desktop 16:9):

```
+---------------------------------------------------------------------------------+
| [Mini-Map]                     [Khu Vực: Vành Đai Aster]       [Tiền: 1,250] [⚙️]|
|   (Bản đồ con & Tọa độ)                                        [Năng lượng: 80]|
|                                                                                 |
| [Nhiệm Vụ Đang Làm]                                                             |
| 📜 Khảo sát trạm phát sóng                                                      |
| └ Tìm 2 lõi năng lượng (1/2)                                                    |
|                                                                                 |
|                         [ 3D ISOMETRIC OVERWORLD STAGE ]                        |
|                                                                                 |
|                                (Cửa Hàng Tiếp Tế)                               |
|                                       🏠                                        |
|                     (Boran NPC) 🛡️                                              |
|                                                                                 |
|                        🚶 [Chibi Astra] --->  [Rương 📦]                         |
|                                                                                 |
|                                       👾 [Drone Quái Tuần Tra]                   |
|                                                                                 |
|                                                                                 |
| [Đội Hình Chibi]                                        [NÚT TƯƠNG TÁC]         |
| [Astra] [Boran] [Elysia] [Lin]                           [ (E) / Bấm Mở Rương ]  |
|                                                                                 |
| [🎒 Ba Lô]  [👥 Nhân Vật]  [🏆 Thành Tựu]               [ LƯỚT / DASH (Shift) ] |
+---------------------------------------------------------------------------------+
```

### Các Thành Phần UI Chi Tiết:
1. **Top-Left (Bản đồ con & Định vị)**:
   - Radar hình tròn hiển thị vị trí người chơi, chấm vàng (NPC/Nhiệm vụ), chấm xanh lá (Rương/Điểm hồi máu) và chấm đỏ (Quái vật tuần tra).
   - Tên khu vực kèm mức độ nguy hiểm môi trường (Hazard Level: Bão cát ion hóa, Băng tuyết cryo).
2. **Top-Right (Tài nguyên & Menu)**:
   - Aether Shards (Đá triệu hồi gacha), Alloy Scrap (Mảnh hợp kim nâng cấp), Năng lượng thám hiểm.
   - Nút Cài đặt / Tạm dừng.
3. **Left-Center (Bảng Nhiệm Vụ Tối Giản)**:
   - Tên chương, mục tiêu chính và mục tiêu phụ kèm thanh tiến độ. Bấm vào tự động quay camera hướng về mục tiêu.
4. **Bottom-Left (Thanh Đội Hình & Joystick Ảo)**:
   - Trên mobile: Nút xoay Joystick ảo tự động xuất hiện tại vị trí ngón tay chạm màn hình.
   - Biểu tượng 4 nhân vật Chibi cho phép bấm đổi người dẫn đầu (Leader Switch) ngay ngoài bản đồ.
5. **Bottom-Right (Cụm Phím Hành Động)**:
   - **Nút Tương Tác Đa Năng (`F` / `E` / Nút Chạm)**: Tự động đổi ngữ cảnh:
     - Khi gần NPC $\to$ Hiện biểu tượng thoại 💬 *"Nói chuyện"*.
     - Khi gần Rương $\to$ Hiện biểu tượng mở 📦 *"Thu thập"*.
     - Khi gần Bảng điều khiển $\to$ Hiện biểu tượng hack 💻 *"Truy cập mã"*.
   - **Nút Lướt (Dash / Sprint — Phím `Space` hoặc `Shift`)**: Nhân vật Chibi phóng nhanh về phía trước một đoạn ngắn để né tránh tầm nhìn quái hoặc vượt qua địa hình nguy hiểm.

---

## 3. QUY CHUẨN MỸ THUẬT NHÂN VẬT CHIBI (CHIBI PROPORTION & VISUAL SPEC)

Trái ngược với tỷ lệ 7.8 đầu trong trận đấu (Nghiêm túc, kịch tính), phiên bản Chibi ngoài Overworld mang phong cách **Stylized Action Chibi (tương tự Genshin Impact Event / Punishing Gray Raven Chibi / Guardian Tales)**:

```
+---------------------------+-----------------------------------+------------------------------------+
| Đặc tính                  | Chibi Overworld                   | Combat Mode 3D                     |
+---------------------------+-----------------------------------+------------------------------------+
| **Tỷ lệ cơ thể**          | **2.5 đến 3.0 đầu** (Cute & Sleek)| **7.5 đến 8.0 đầu** (Heroic Anime) |
| **Kích thước đầu & Mắt**  | Đầu to, mắt to biểu cảm rõ nét    | Đầu chuẩn giải phẫu người lớn      |
| **Vũ khí**                | Đeo sau lưng, rút ra khi gặp quái | Cầm sẵn song kiếm trên tay         |
| **Chuyển động (Motion)**  | Nhún nhảy (Bobble bounce), lanh lợi| Đứng tấn nghiêm túc, chém dứt khoát|
| **Polycount Budget**      | $\le$ 4,500 Triangles per model   | $\le$ 15,000 Triangles             |
| **Hệ thống Xương**        | 6 – 8 Bones (Rất nhẹ cho mobile)  | 12 – 16 Bones                      |
+---------------------------+-----------------------------------+------------------------------------+
```

### Thiết Kế 4 Chibi Starter Heroes:
1. **Chibi Astra**: Áo khoác đen vạt ngắn bay phấp phới, mái tóc đuôi ngựa to bồng bềnh nảy theo từng bước chạy, hai thanh kiếm plasma mini dắt chéo sau hông.
2. **Chibi Boran**: Thân hình vuông vức hộ pháp đáng yêu, vác tấm đại khiên to gấp rưỡi người sau lưng, bước chạy có tiếng chân kim loại nặng nề.
3. **Chibi Elysia**: Chân lơ lửng cách mặt đất 10cm, vòng xoay Chrono mini tự động quay tít quanh người, tà áo choàng trắng tuyết bồng bềnh.
4. **Chibi Lin**: Đeo kính ngắm lục phát sáng che nửa mặt, bước chạy khom lưng lướt nhanh không phát ra tiếng động.

---

## 4. CƠ CHẾ CHẠM TRÁN & CHUYỂN CẢNH (ENCOUNTER & TRANSITION MECHANICS)

Ngoài bản đồ, quái vật không đứng yên mà di chuyển tuần tra theo lộ trình định sẵn:

1. **Hình nón tầm nhìn (Vision Cone)**:
   - Mỗi quái vật có vùng quét radar góc $60^\circ$ phía trước mặt màu vàng nhạt.
   - Khi Chibi Player bước vào vùng quét: Quái hiện dấu chấm than đỏ `!` trên đầu, tiếng còi hú báo động vang lên và lao thẳng về phía người chơi.
2. **Cơ chế Đột Kích (Ambush / Advantage System)**:
   - **Người chơi đánh lén (Player Advantage)**: Nếu người chơi đi vòng ra sau lưng quái và nhấn phím Tấn công/Tương tác $\to$ Vào trận đấu được cộng ngay **+2 nước đi khởi đầu** hoặc làm Boss bị giảm 20% Stagger ngay từ đầu trận!
   - **Bị phục kích (Enemy Ambush)**: Nếu bị quái tông thẳng từ phía sau $\to$ Boss vào trận với 1 lượt tích nộ sẵn.
3. **Hiệu Ứng Chuyển Cảnh Mượt Mà (Screen Shatter Transition)**:
   - Khi va chạm xảy ra: Màn hình Overworld đóng băng trong 100ms $\to$ Nứt toác thành các mảnh kính vỡ 3D văng ra ngoài $\to$ Camera lao thẳng vào trận đấu 3D Diorama Match-3 không có màn hình đen chờ đợi (Seamless Transition).

---

## 5. LỘ TRÌNH TRIỂN KHAI VÀ BÀN GIAO MẪU

1. **Giai đoạn 1**: Thiết kế giao diện khung dây (UI Wireframe) và ban hành tài liệu đặc tả chuẩn (Tài liệu này).
2. **Giai đoạn 2**: Tích hợp chế độ demo **Chibi Overworld 3D Interactive** trực tiếp vào bản Web (`Web/`) bằng Three.js để người chơi có thể tự tay dùng phím điều khiển Chibi Astra chạy quanh thị trấn, mở rương và chạm quái để kích hoạt trận chiến!
3. **Giai đoạn 3**: Hoàn thiện toàn bộ các bản đồ Chương 1, 2, 3 và kết nối hệ thống nhiệm vụ trong Phase 4.
