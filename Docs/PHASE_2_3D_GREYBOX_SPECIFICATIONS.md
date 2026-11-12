# PHASE 2: QUY CHUẨN KỸ THUẬT 3D GREYBOX & SKELETON PIPELINE (3D SPECIFICATIONS)

Tài liệu này xác lập quy chuẩn kỹ thuật mô hình 3D (Mesh Topology), hệ thống xương tối ưu (Rigging & Skeleton Hierarchy), giới hạn đa giác (Polycount Budgets), đóng gói vật liệu PBR (Texture Channel Packing), và chuỗi chuyển động hoạt họa (Animation Clips) cho **MatchRPG / RE:FRAY**.

---

## 1. TỶ LỆ HÌNH THỂ & THƯỚC ĐO THẾ GIỚI (WORLD SCALE & PROPORTIONS)

- **Hệ quy chiếu không gian**: Đồng bộ theo Unreal Engine 5 (`1 Unreal Unit = 1 Centimeter`). Trục tọa độ: `Z hướng lên (Up)`, `X hướng tới (Forward)`, `Y sang phải (Right)`.
- **Tỷ lệ hình thể Anime PGR**:
  - Tỷ lệ chuẩn: **7.5 đến 8.0 đầu**.
  - Chiều cao Hero Nữ (Astra / Elysia / Lin): `165 cm – 172 cm`.
  - Chiều cao Hero Nam Hạng nặng (Boran): `198 cm – 210 cm`.
  - Chiều cao Boss Cơ giới (Sentinel Unit 07): `320 cm`.
  - Tọa độ gốc (Origin / Pivot): Đặt tại chính giữa hai bàn chân trên mặt đất (`Z = 0.0, X = 0.0, Y = 0.0`).

---

## 2. NGÂN SÁCH ĐA GIÁC & TỔ CHỨC LƯỚI (POLYCOUNT BUDGETS & TOPOLOGY)

```
+------------------------------------+-------------------------+-------------------------+--------------------+
| Đối tượng (Asset Category)         | LOD0 (Base Mesh Target) | LOD1 (Mobile Reduction) | Giới hạn Bones     |
+------------------------------------+-------------------------+-------------------------+--------------------+
| Hero Nhân vật (Astra, Elysia...)   | $\le$ 15,000 Tris       | $\le$ 7,500 Tris        | 12 – 16 Bones      |
| Boss Đồ sộ (Sentinel Unit 07)      | $\le$ 25,000 Tris       | $\le$ 12,000 Tris       | 16 – 24 Bones      |
| Quái thường / Minion Drone         | $\le$ 5,000 Tris        | $\le$ 2,500 Tris        | 4 – 8 Bones        |
| Vật cản (Obstacle: Rock/Crate...)  | $\le$ 2,000 Tris        | $\le$ 800 Tris          | Static (0 Bones)   |
| Khối ngọc Match-3 (Gem Mesh)       | $\le$ 300 Tris          | $\le$ 120 Tris          | Static (0 Bones)   |
+------------------------------------+-------------------------+-------------------------+--------------------+
```

### Yêu cầu cấu trúc lưới (Topology Requirements):
1. Toàn bộ lưới được triangulate chuẩn trước khi export (tránh tình trạng Engine tự động đảo chiều tam giác làm vỡ pháp tuyến).
2. Vùng khớp uốn cong (Khuỷu tay, đầu gối, hông) phải có tối thiểu **3 vòng cạnh lặp (3 Edge Loops)** để khi co duỗi không bị xẹp thể tích (Candy-wrapper effect).
3. Không tồn tại Non-manifold edges, T-vertices, hoặc mặt tam giác diện tích bằng 0.

---

## 3. HỆ THỐNG XƯƠNG TỐI ƯU HÓA CHO DIORAMA (7 - 12 BONES RIG)

Trên sàn đấu diorama góc nhìn 2.5D, góc camera đặt xa và nhìn chéo từ trên xuống (`Pitch = -28°`). Do đó, hệ xương được tinh gọn tối đa nhằm triệt tiêu hoàn toàn gánh nặng tính toán CPU/GPU Skinning trên thiết bị di động và WebGL:

```
[root] (0, 0, 0)
  |
  +-- [pelvis]
        |
        +-- [spine_01]
        |     |
        |     +-- [chest]
        |           |
        |           +-- [neck]
        |           |     +-- [head]
        |           |
        |           +-- [clavicle_l] -> [upperarm_l] -> [forearm_l] -> [hand_l]
        |           |
        |           +-- [clavicle_r] -> [upperarm_r] -> [forearm_r] -> [hand_r]
        |
        +-- [thigh_l] -> [calf_l] -> [foot_l]
        |
        +-- [thigh_r] -> [calf_r] -> [foot_r]
```

### Quy chuẩn gắn trọng số (Skinning & Weighting Rules):
- **Tối đa 4 ảnh hưởng xương trên 1 đỉnh (Max 4 bone influences per vertex)**. Mọi trọng số nhỏ hơn `0.01` phải được tỉa sạch (Prune Small Weights).
- **Tỷ lệ xương (Bone Scale)**: Bắt buộc đồng nhất `(1.0, 1.0, 1.0)`. Tuyệt đối không scale phi đồng nhất trên xương cha để tránh lỗi vỡ hình khi playback animation.
- **Tên xương**: Toàn bộ viết chữ thường, nối bằng dấu gạch dưới (`root`, `pelvis`, `spine_01`, `chest`, `hand_l`, `hand_r`, `foot_l`, `foot_r`).

---

## 4. BỘ CLIP HOẠT HỌA & THỜI LƯỢNG CHUẨN (ANIMATION CLIPS)

Toàn bộ animation được thiết kế và xuất ở tốc độ **30 FPS / 60 FPS**:

```
+-------------------+-------------+-------------------+-------------------------------------------------------+
| Clip Name         | Thời lượng  | Tính chất Loop    | Mô tả động tác & Nhịp điệu                             |
+-------------------+-------------+-------------------+-------------------------------------------------------+
| `anim_idle`       | 2.0 giây    | Có (Looping)      | Nhịp thở nhẹ nhàng, cơ thể nhấp nhô nhịp 1.0s, kiếm rực sáng|
| `anim_attack`     | 0.6 giây    | Không (One-shot)  | Lấy đà 0.15s -> Chém vung kiếm tại 0.25s -> Thu thế 0.2s |
| `anim_skill_cast` | 1.2 giây    | Không (One-shot)  | Tụ khí nhảy lùi 0.3s -> Lao tới tung bão kiếm 0.5s -> Hạ cánh|
| `anim_hit_react`  | 0.3 giây    | Không (One-shot)  | Giật lùi ra sau cực nhanh trong 0.08s -> Phục hồi lại thế |
| `anim_stagger`    | 1.5 giây    | Có (Looping)      | Khuỵu gối, lắc lư mất thăng bằng khi thanh Stagger đầy |
| `anim_victory`    | 2.5 giây    | Không (One-shot)  | Tra kiếm vào bao, xoay người nhìn camera mỉm cười pose thế|
+-------------------+-------------+-------------------+-------------------------------------------------------+
```

---

## 5. ĐÓNG GÓI VẬT LIỆU PBR (TEXTURE CHANNEL PACKING)

Để giảm thiểu Texture Sampler và bộ nhớ VRAM, toàn bộ vật liệu tuân thủ quy chuẩn đóng gói kênh **ORM Map** chuẩn ngành:

1. **BaseColor Map (`T_*_BC.png`)**:
   - `Kênh R, G, B`: Màu khuếch tán sRGB (Albedo / Diffuse).
   - `Kênh Alpha (A)`: Độ trong suốt (Opacity) nếu có vải mỏng/kính bảo hộ.
2. **Normal Map (`T_*_N.png`)**:
   - Định dạng chuẩn **DirectX (Y- / Green Inverted)** cho Unreal Engine.
   - Không gian tiếp tuyến (Tangent Space Normal).
3. **ORM Packed Map (`T_*_ORM.png`)** — Linear Color Space:
   - `Kênh R (Red)`: **Ambient Occlusion (AO)** — Vùng tối khe rãnh hốc giáp.
   - `Kênh G (Green)`: **Roughness** — Độ nhám bề mặt (0.0 bóng loáng, 1.0 nhám mờ).
   - `Kênh B (Blue)`: **Metallic** — Tính chất kim loại (0.0 phi kim phi cơ, 1.0 giáp hợp kim).
4. **Emissive Map (`T_*_E.png`)**:
   - `Kênh R, G, B`: Ánh sáng neon tự phát quang (Dải led đỏ của Astra, lam của Elysia, lục của Lin, vàng của Boran).

---

## 6. QUY TRÌNH KIỂM THỬ XUẤT NHẬP (IMPORT VERIFICATION PIPELINE)

1. **Định dạng bàn giao**: Khuyến nghị song song file nhị phân **glTF 2.0 Binary (`.glb`)** cho Web/WASM và **Autodesk FBX 2020** cho Unreal Engine 5.
2. **Kiểm tra rò rỉ bộ nhớ Skeleton (QA Checklist)**:
   - File `.glb` phải chứa đúng cấu trúc 1 node hierarchy duy nhất.
   - Không có track animation bị cô lập (Orphan Animation Tracks).
   - Khung bao thể tích (Bounding Box) phải được tính toán chính xác, không bị kích thước âm hoặc vô cực.
3. **Pipeline kiểm tra tự động**:
   - Dự án tích hợp script Python `Tools/assets/generate_greybox_glb.py` tạo mô hình mẫu chuẩn glTF 2.0 không lỗi cú pháp, dùng làm chuẩn kiểm tra (Gold Standard) cho bộ phận 3D.
