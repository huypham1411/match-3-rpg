# SPEC-WEB3D-004: 3D Web Experience & Asset Fidelity Standard

**Tác giả:** @game_designer & @web3d_designer  
**Phiên bản:** v1.0.0  
**Ngày phê duyệt:** 2026-11-15  
**Quy chuẩn tham chiếu:** `.agents/skills/3d-web-experience/SKILL.md`, `.agents/skills/chibi-3d-character-design/SKILL.md`, `Docs/ROADMAP_PHASES_AND_ACCEPTANCE.md`

---

## 1. Mục Tiêu & Bối Cảnh
Nâng cấp chất lượng đồ họa mô hình 3D (3D Web Experience Standard) cho toàn bộ 4 Nhân vật Chibi Anime, Quái Boss Sentinel Unit 07 và Đấu trường Chiến thuật Cyberpunk trong Three.js WebGL:
1. Nâng cấp phụ kiện, giáp vai, thắt lưng năng lượng, bàn tay găng tay (gauntlets) và chi tiết vũ khí cho 4 Hero.
2. Nâng cấp giáp lưng Mecha Carapace, ống phản lực đẩy Ion Thrusters phát quang và lỗ thoát nhiệt Hazard Vents cho Boss Sentinel Unit 07.
3. Bổ sung vòng hào quang năng lượng đồng tâm (Concentric Arena Pulse Rings) và dải điện trường liên kết giữa 4 Trụ Monoliths.
4. Tối ưu hóa ánh sáng PBR theo chuẩn ACESFilmic Tone Mapping và Hemisphere Sky/Ground ambient fill.
5. Duy trì mượt mà 60 FPS trên trình duyệt di động (chi phí tính toán < 2.0ms/frame).

---

## 2. Tiêu Chuẩn Nghiệm Thu Chi Tiết (AC-01 -> AC-10)

### [NHÓM 1: HẠ TẦNG AGENT & SKILL (AC-01 -> AC-02)]
- **AC-01**: Skill `3d-web-experience` tồn tại đầy đủ tại `.agents/skills/3d-web-experience/SKILL.md` với đầy đủ hướng dẫn Three.js, WebGL optimization và Mobile DPR controls.
- **AC-02**: Agent `@web3d_designer` (3D Web Experience Architect) được đặc tả tại `.agents/agents/web3d-designer/agent.md` và sẵn sàng tham gia phản biện kỹ thuật trong quy trình Swarm Engine.

### [NHÓM 2: CHI TIẾT TẠO HÌNH HERO (AC-03 -> AC-05)]
- **AC-03 (Chibi Gauntlets & Limbs)**: Cả 4 Hero đều sở hữu bàn tay găng tay Chibi Chibi Gauntlets (`SphereGeometry` hoặc `BoxGeometry` bán kính 0.07m - 0.10m) ở đầu 2 cánh tay mang màu sắc nguyên tố tương ứng.
- **AC-04 (Tactical Belts & Pauldrons)**: Cả 4 Hero đều có thắt lưng năng lượng Tactical Cyber Belt quanh eo kèm khóa thắt lưng phát quang. Astra và Boran có giáp vai Pauldrons đặc thù.
- **AC-05 (Enhanced Weapon Detail)**:
  - Astra: Song kiếm có thêm chuôi kiếm (tsuba/pommel) và ánh sáng phát quang Neon intensity >= 1.2.
  - Elysia: Quả cầu hư vô Void Orbs có vòng quỹ đạo runic Torus xoay nghịch chiều.
  - Lin: Quyền trượng Nanite có vòng đai hào quang ngọc bích bao quanh hoa sen sen chữa lành.
  - Boran: Đại khiên Aegis có lõi năng lượng phát quang bảo vệ ở trung tâm.

### [NHÓM 3: NÂNG CẤP MECHA BOSS TITAN (AC-06 -> AC-07)]
- **AC-06 (Mecha Carapace & Thrusters)**: Boss Sentinel Unit 07 sở hữu cụm giáp lưng Carapace Plating và 2 ống phụt phản lực đẩy Ion Thrusters (`CylinderGeometry` hoặc `ConeGeometry`) với ánh sáng phát quang Emissive.
- **AC-07 (Chest Hazard Vents)**: Thân Boss có dải khe tản nhiệt phát quang Hazard Vents giúp làm nổi bật khối thân kim loại công nghệ cao.

### [NHÓM 4: CHIẾN TRƯỜNG & HIỆU NĂNG 60 FPS (AC-08 -> AC-10)]
- **AC-08 (Arena Concentric Pulse Rings)**: Sàn đấu có thêm các đường viền năng lượng đồng tâm hoặc mạng lưới liên kết giữa các trụ Monoliths.
- **AC-09 (PBR Lighting Balance)**: Hệ thống ánh sáng sử dụng ACESFilmic Tone Mapping với Exposure chuẩn mực, có Directional Key Light đổ bóng và Rim Light tương phản cao.
- **AC-10 (Mobile 60 FPS Benchmark)**: 500 frames update của `Diorama3D` thực thi với thời gian trung bình < 2.0ms/frame, không sinh ra lỗi NaN hay biến dị tọa độ.

---

## 3. Ma Trận Hóa Đơn Kiểm Thử (Receipts Invariants)
Mọi thay đổi trên Three.js visual code phải giữ 100% tính tương thích ngược với:
- `test_chibi_anime_models_and_scenery.mjs` (139 assertions)
- `test_cinematic_camera_and_facing.mjs` (27 assertions)
- `test_chibi_animation_and_asset_fidelity.mjs` (12 assertions)
- `test_arena_scale_and_combos.mjs` (14 assertions)
- `test_hero_skills_and_defense.mjs` (38 assertions)
- `test_strict_swap.mjs` (8 assertions)
- `test_specials.mjs` (9 assertions)
- `smoke_test.mjs` (51 assertions)
- C++ Host Tests (745 assertions)
Tổng cộng: >= 1,050 assertions, 0 failures.
