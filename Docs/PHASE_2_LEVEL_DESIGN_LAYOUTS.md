# PHASE 2: TÀI LIỆU LEVEL DESIGN VÀ BỐ CỤC 3 MÀN CHƠI (CHAPTERS 1, 2, 3)

Tài liệu này xác lập chi tiết thiết kế mặt bằng (Level Design Brief), bố cục màn hình (Diorama Stage Framing), hệ thống góc máy (Camera Angle), và lộ trình phân bổ vật cản (Obstacle Roadmap) cho 3 Chương đầu tiên của **MatchRPG / RE:FRAY**.

---

## 1. TỔNG QUAN HỆ THỐNG DIORAMA VÀ KHUNG HÌNH (CAMERA FRAMING)

MatchRPG sử dụng góc nhìn **2.5D Diorama Stage** kết hợp giao diện match-3 nửa dưới:

```
+-------------------------------------------------------------+
|                      TOP BAR / WAVE INFO                     |
|  [Wave 1/1]  [Boss HP: ||||||||||||||||||||||]  [Turns: 15]  |
+-------------------------------------------------------------+
|                                                             |
|                   3D BATTLEFIELD DIORAMA                    |
|                      (Tỷ lệ 45% màn hình)                   |
|                                                             |
|       [Hero Party: 4 Striker Slots]      [Boss / Minions]   |
|            (Astra, Elysia, Lin, Boran)    (Sentinel Unit 07)|
|                                                             |
|           <<< Camera Pitch: -28°, FOV: 45° >>>              |
+-------------------------------------------------------------+
|                      DIALOGUE / HUD TRAY                    |
|  [Astra]: "Lõi phòng thủ đã lộ diện, chuẩn bị phá vỡ!"       |
+-------------------------------------------------------------+
|                                                             |
|                     MATCH-3 GRID TRAY                       |
|                      (Tỷ lệ 55% màn hình)                   |
|                                                             |
|                     7 CỘT  x  8 HÀNG                        |
|        [Red]  [Blue]  [Green]  [Yellow]  [Purple]           |
|        [Obstacles: Crate / Chain / Rock / Ice]              |
|                                                             |
+-------------------------------------------------------------+
```

### Thông số Camera kỹ thuật:
- **Camera Type**: Cinematic Perspective Camera (hỗ trợ màn hình tỷ lệ 16:9 ngang và 9:16 dọc trên mobile).
- **Pitch Angle**: `-28.0°` (chếch từ trên nhìn xuống sàn đấu diorama).
- **Yaw / Roll**: `Yaw = 0.0°`, `Roll = 0.0°`.
- **Field of View (FOV)**: `45.0°` (giúp giữ hình thể nhân vật theo tỷ lệ chuẩn anime PGR 7.5 - 8 đầu không bị méo phối cảnh).
- **Camera Shake Impulse**: 
  - Khi Match-3 thường: Không rung.
  - Khi Match-4 / Line Breaker: Biên độ `2.0 px`, thời gian `60 ms`.
  - Khi Match-5 / Special Combo / Boss Ultimate: Biên độ `5.0 px`, thời gian `120 ms` với damping tuyến tính.

---

## 2. CHI TIẾT 3 MÀN CHƠI (CHAPTERS 1, 2, 3)

### CHAPTER 1: KHU ĐỊNH CƯ ASTER (ASTER SETTLEMENT - SECTOR 7 PERIMETER)

#### 1. Bối cảnh & Tâm lý màn chơi:
- **Địa điểm**: Vành đai phế tích ngoại vi Khu Định Cư Aster. Mặt đất nứt nẻ lót kim loại hoen rỉ, những cột đèn cảnh báo nhấp nháy đỏ giữa cơn bão bụi điện tử màu cam hổ phách.
- **Không khí**: Hỗn loạn, báo động xâm nhập khẩn cấp. Tiếng còi hú xa xa và tiếng động cơ phản lực gầm rú của máy bay không người lái.
- **Ánh sáng & Màu chủ đạo**: 
  - Key light: Hoàng hôn bụi bặm (`#FF8C42`).
  - Fill light: Đèn neon xanh lạnh của trạm tiếp nhiên liệu rò rỉ (`#1E88E5`).
  - Fog: Sương mù điện tích thấp tầng (Exp Density: 0.02).

#### 2. Kẻ địch & Boss:
- **Minion Wave**: `Scavenger Drone A`, `Scavenger Drone B` (Bay lơ lửng, vũ khí súng điện xung).
- **Boss Ch.1**: **Sentinel Unit 07 (Haywire Defense Core)**
  - *Máu cơ bản*: 1,800 HP.
  - *Thanh Stagger*: 120 điểm.
  - *Hành vi*: Mỗi 3 lượt kích hoạt "Overload Railgun" bắn vào Hero có HP cao nhất. Khi Stagger, lõi ngực mở ra để lộ điểm yếu nhân đôi sát thương vật lý (Red).

#### 3. Bố cục Match-3 Grid & Vật cản (Obstacles):
- **Kích thước sàn**: 7 Cột x 8 Hàng (56 ô).
- **Loại vật cản**:
  - `Crate (Thùng Hàng Hợp Kim)`: **2 HP**. Phân bố 4 thùng ở hai góc dưới (Cột 0 hàng 6, Cột 0 hàng 7, Cột 6 hàng 6, Cột 6 hàng 7). Khi match kề cạnh, thùng vỡ vụn và giải phóng ô trống cho block mới rơi xuống.
  - `Chain (Xích Năng Lượng)`: **1 HP**. Khóa 2 block ở Cột 3 hàng 4 và Cột 4 hàng 4. Block bị khóa không thể hoán đổi (swap) nhưng match cùng màu với nó sẽ làm đứt xích.
- **Mục tiêu giảng dạy cơ chế (Tutorial Goal)**:
  - Dạy người chơi cách dọn góc bằng match kề cạnh (Adjacent Clearance).
  - Dạy cách giải phóng block bị xích (Chain Unlock).

---

### CHAPTER 2: TRẠM KIỂM SOÁT UNMAPPED RIM (UNMAPPED RIM CHECKPOINT 04)

#### 1. Bối cảnh & Tâm lý màn chơi:
- **Địa điểm**: Cổng kiểm soát cao tốc liên vùng đã bị bỏ hoang, tuyết ion hóa và băng cryo đóng dày đặc trên các rào chắn bê tông titan.
- **Không khí**: Lạnh lẽo, cô lập, nguy hiểm tiềm tàng. Tiếng gió rít qua khe kim loại và tiếng máy phát trường lực rù rì.
- **Ánh sáng & Màu chủ đạo**:
  - Key light: Ánh trăng xanh băng giá (`#80D8FF`).
  - Fill light: Đèn tín hiệu cảnh báo màu vàng cảnh sát (`#FFD54F`).
  - Particle: Tuyết tinh thể ánh quang rơi nhẹ và khói xả nito lỏng.

#### 2. Kẻ địch & Boss:
- **Minion Wave**: `Riot Enforcer Mech` (Mang khiên hợp kim phản xung, cản trở đường đạn).
- **Boss Ch.2**: **Warden Aegis (The Hardlight Bastion)**
  - *Máu cơ bản*: 3,200 HP.
  - *Thanh Stagger*: 200 điểm.
  - *Khiên Năng Lượng (Deflector Barrier)*: Giảm 40% sát thương nhận vào cho đến khi bị phá vỡ.
  - *Hành vi*: Sau mỗi 4 lượt dựng rào chắn băng giá (Cryo Barrier) lên sàn đấu, đóng băng ngẫu nhiên 3 block trên bảng.

#### 3. Bố cục Match-3 Grid & Vật cản:
- **Kích thước sàn**: 7 Cột x 8 Hàng.
- **Loại vật cản**:
  - `Rock (Khối Xỉ Thạch Titan)`: **3 HP**. Cần 3 lần match kề cạnh mới vỡ hoàn toàn. Xếp thành 2 khối cản đường ở Cột 2 hàng 3 và Cột 5 hàng 3.
  - `Ice (Khối Băng Cryo)`: **2 HP**. Bao bọc block bên trong. Block bị đóng băng không thể di chuyển và không tự rơi xuống cho đến khi bị làm tan vỡ.
- **Mục tiêu giảng dạy cơ chế**:
  - Dạy người chơi cách tạo combo nhiều bước và sử dụng Special Blocks (Bomb / Line Breaker) để khoan thủng vật cản 3 HP.
  - Ứng dụng vai trò Deflector (Boran) để bào mòn thanh Stagger của Boss khi kết thúc lượt.

---

### CHAPTER 3: TÀN TÍCH DATA HAVEN BETA (SUBTERRANEAN DATA HAVEN)

#### 1. Bối cảnh & Tâm lý màn chơi:
- **Địa điểm**: Trung tâm máy chủ ngầm sâu 300 mét dưới lòng đất. Những dòng dữ liệu hư hỏng (Void Data Streams) màu tím ma mị rỉ ra từ các tủ rack siêu máy tính vỡ nát. Không gian xung quanh bị bóp méo bởi hiện tượng Null Singularity.
- **Không khí**: Căng thẳng tột độ, siêu thực, áp lực tận thế. Không gian rung chuyển và tiếng thì thầm vô thanh của thực thể Null Sovereign.
- **Ánh sáng & Màu chủ đạo**:
  - Key light: Ánh sáng tím hư không cực quang (`#D500F9`).
  - Ambient: Đen thẳm pha tím huyền ảo (`#1A002C`).
  - Particle: Các mảnh vỡ số (Digital Artifacts) trôi ngược từ dưới lên trên.

#### 2. Kẻ địch & Boss:
- **Minion Wave**: `Glitch Creepers` (Thực thể mã độc biến dị liên tục).
- **Boss Ch.3**: **Null Sovereign (The Reality Shatterer)**
  - *Máu cơ bản*: 5,500 HP.
  - *Thanh Stagger*: 280 điểm.
  - *Hành vi*:
    - Triệu hồi "Hư Không Thôn Tính" (Null Consumption): Khi boss tích nộ 100%, nuốt chửng 1 hàng block dưới đáy sàn đấu.
    - Tạo ô biến dị Null Spire: Biến 2 ô block thành bẫy sát thương nếu người chơi match vào mà không dùng Block Ánh Sáng (Yellow - Boran).

#### 3. Bố cục Match-3 Grid & Vật cản:
- **Kích thước sàn**: 7 Cột x 8 Hàng.
- **Loại vật cản**:
  - Hỗn hợp cao cấp: `Rock` (3 HP) ở Cột 3 Hàng 0, `Chain` (1 HP) ở 4 góc chiến thuật, kèm cơ chế biến đổi block hư không.
  - Quy tắc bảo vệ sàn: Dù biến đổi thế nào, pool màu rơi từ trên trần luôn duy trì tối thiểu 3 màu tương thích với các Hero còn sống, đảm bảo luôn có nước đi hợp lệ.
- **Mục tiêu giảng dạy cơ chế**:
  - Thử thách toàn diện khả năng điều phối 4 vai trò: Dồn nổ sát thương (Astra), tua hồi chiêu (Elysia), xuyên giáp giải hiệu ứng (Lin), và che chắn sinh tồn (Boran).

---

## 3. BẢNG TỔNG KẾT TÀI NGUYÊN & HIỆU NĂNG MÀN CHƠI (ASSET BUDGET)

| Tiêu chí | Ngân sách giới hạn (Budget) | Giải thích kỹ thuật |
| :--- | :--- | :--- |
| **Scene Polycount (Diorama)** | $\le$ 100,000 Triangles | Đảm bảo 60 FPS trên thiết bị di động tầm trung và WebGL/WASM |
| **Draw Calls** | $\le$ 35 Calls per frame | Áp dụng Static Mesh Instancing cho gạch lát nền và linh kiện lặp lại |
| **Texture Atlas Resolution** | $2048 \times 2048$ (PBR ORM) | 1 tấm chung cho Props môi trường, 1 tấm cho Props hiệu ứng |
| **Dynamic Lights** | 1 Directional Light duy nhất | Bóng đổ thời gian thực chỉ dành cho 4 Heroes và Boss chính |
| **Particle System Emitters** | $\le$ 3 Emitters đồng thời | Khói sương, tia điện, mảnh vỡ văng khi nổ block |
| **Audio Channels** | 1 BGM loop + 6 SFX concurrent | BGM không nén khi preload, SFX match-3 ưu tiên độ trễ <20ms |

Tài liệu Level Design này là căn cứ chính xác để bộ phận Environment Builder và Game Developer thiết lập `UMatchRPGStageAsset` trong Phase 3.
