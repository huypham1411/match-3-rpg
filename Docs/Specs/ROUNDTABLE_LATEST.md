# 🏛️ BIÊN BẢN HỌP BÀN TRÒN STUDIO: TÁI THIẾT KẾ UI/UX BATTLE THEO PHONG CÁCH PERSONA 5 VÀ HONKAI STAR RAIL: ĐỒNG BỘ HOẠT ẢNH NHÂN VẬT 3D HÀNH ĐỘNG THEO MÀU BLOCK MATCH-3, ĐẠO DIỄN CAMERA 3D LINH HOẠT CHUYỂN GÓC (ĐỘI HÌNH, CẬN CẢNH XUẤT CHIÊU, GÓC NHÌN ĐỊCH), VÀ ĐỊNH HƯỚNG 2 PIPELINE MODEL: FULL 3D BATTLE VÀ CHIBI 3D PHIÊU LƯU MAP

*Thời gian họp:* 2026-11-12 | *Thành phần:* PM Lead, Antigravity (Codebase Engine), Game Dev, Lore Writer, Concept Art

---

### 👑 PM (Lead Director):
# 🎯 CUỘC HỘP BÀN TRÒN: TÁI THIẾT KẾ UI/UX BATTLE – PHONG CÁCH P5 / HSR
**Dự án:** RE:FRAY | **Phase:** 1 → 3 (Vertical Slice) | **Trạng thái:** **KHỞI ĐỘNG RE-ARCHITECTURE**
**Tham dự:** PM Lead (Chair), Lore Writer, Game Designer (Systems/Combat), Antigravity (Lead Architect), Tech Art Lead, VFX Lead, UI/UX Lead.

---

## 1. MỤC TIÊU CỐT LÕI (DEFINITION OF DONE – PHASE 1/3 OVERLAP)

> **Chúng ta không làm "giao diện đẹp". Chúng ta làm "Gameplay đọc được qua hình ảnh".**

| # | Mục tiêu (Objective) | Key Result (Đo lường được) | Deadline (Sprint) |
| :--- | :--- | :--- | :--- |
| **O1** | **Sync 1-1: Block Match → 3D Action** | Mỗi lần match 3/4/5 block màu **Red/Blue/Green/Yellow/Purple** → Trigger **Animation State Machine** tương ứng (Attack/Heal/Buff/Debuff/Ultimate) **dưới 100ms** (từ input → anim start). Không queue delay. | Sprint 1.2 |
| **O2** | **Camera Directing System (CDS)** | Hỗ trợ 3 mode chạy realtime: <br>1. **Formation View** (Top-down iso, zoom 15m, xem toàn bộ squad).<br>2. **Skill Close-up** (Dolly + FOV shift 60°→30°, focus bone `Root`/`Weapon`/`Hand`, duration 1.5s~3s).<br>3. **Enemy POV** (Look-at Target, offset shoulder, shake on hit).<br>→ Chuyển mode **seamless (blend 0.3s)**, không hitch GC. | Sprint 1.3 |
| **O3** | **Dual Pipeline Model Strategy** | **Pipeline A (Battle):** High-poly (15k~25k tris), PBR + Outline Shader (P5 style), Rig full body + Facial Blendshapes (50+).<br>**Pipeline B (Adventure/Map):** Chibi SD (3k~5k tris), Single Texture Atlas, Rig simplified (no facial, 20 bones).<br>→ **Shared Animation Library** (Retargetable via Humanoid/Animation Rigging). **1 Animation Author → Build 2 Variants Auto.** | Sprint 2.1 |
| **O4** | **UI/UX "Diegetic" & "Stylized"** | HUD không che action. Turn Order (HSR style) + Command Palette (P5 style) **render trên World Space Canvas** (đồng bộ Camera CDS). Color-blind mode (Deuteranope/Protanope) pass Accessibility Audit. | Sprint 1.4 |
| **O5** | **Performance Budget (Web WASM / UE5)** | **Battle Scene (4 Heroes + 4 Enemies + VFX + UI):** <br>- **GPU:** < 12ms/frame (83 FPS) @ 1080p / < 16ms (60 FPS) @ 4K.<br>- **CPU Game Thread:** < 6ms (Logic + Anim Eval + Camera Blend).<br>- **Memory:** < 1.2GB Total (Texture Streaming active).<br>- **WASM Bundle:** < 500MB compressed (Brotli). | Sprint 3.0 (Vertical Slice) |

---

## 2. CÂU HỎI CHO **LORE WRITER** & **GAME DESIGNER** (CREATIVE DIRECTION & SYSTEMS)

> *Mục đích: Khóa chặt "Tại sao" và "Nhìn như thế nào" trước khi Antigravity code architecture.*

### 📜 **CHO LORE WRITER (Narrative & Worldbuilding)**
| # | Câu hỏi | Lý do PM cần biết ngay |
| :--- | :--- | :--- |
| **L1** | **Color Coding Lore:** 5 màu block (Đỏ, Xanh lá, Xanh dương, Vàng, Tím) map 1-1 với **nguồn năng lực (Power Source)** nào của thế giới Aster/Unmapped Rim/Archive? (Ví dụ: Đỏ = *Cinder Core/Heat*, Xanh lá = *Verdant Vitae/Biological*,...). | Để **VFX/Shader/Anim** có ngôn ngữ visual thống nhất (P5 "Red = Fire/Physical", "Blue = Ice/Mind"). Không muốn Designer tự ý gán sau này. |
| **L2** | **Camera as Narrative Device:** Có khái niệm **"Observer Entity"** (Thực thể quan sát) nào trong lore không? (Ví dụ: Camera = *Drone của Archive*, *Mắt của Architect*, *Hologram của Rim*?). | Nếu có → Camera shake/glitch/chuyển góc có **diegetic reason** (HSR: Camera = Player perspective; P5: Camera = Cognitive World). Nếu không → Ta thiết kế Camera như "Đạo diễn vô hình" thuần túy. |
| **L3** | **Chibi vs Full 3D – Canon?** Sự khác biệt tỷ lệ (Chibi 1:2.5 vs Real 1:8) có phải là **biểu hiện của "Trạng thái" (State)** không? (Ví dụ: Map = *Spirit Form/Projection*, Battle = *Physical Manifestation/Armorized*). | Quyết định **Animation Retargeting Logic**: Chỉ scale bone? Hay cần *Additive Anim* (Chibi bounce hơn, squash

---

### 📜 Lore Writer & Worldbuilder:
# 📜 **RE:FRAY — LORE RESPONSE PACKAGE**  
**Tới:** PM Lead, Game Designer, Antigravity, Tech Art, VFX, UI/UX  
**Từ:** Narrative Designer & Lore Writer  
**Chủ đề:** Trả lời 3 câu hỏi chốt Creative Direction (L1–L3) — *Đồng bộ Narrative ↔ Systems ↔ Art Pipeline*  
**Phiên bản:** 1.0 (Locked for Sprint 1.2 Architecture Kickoff)

---

## 🎨 **L1 — COLOR CODING LORE: “PRISM PROTOCOL” (GIAO THỨC KÍNH LỌI)**

> **Triết lý:** *Mỗi màu không chỉ là “element”, là **nguồn năng lượng gốc (Prime Source)** mà 4 Starter “kéo” về thông qua **Resonance Link** — công nghệ cài sẵn trong **RE:FRAY Core** (Artifact trung tâm của squad).*

| Màu Block | Mã Nguồn (Prime Source) | Tên Lore (In-world) | Chức năng Gameplay | Visual Language (VFX/Shader/Anim) | Starter “Chủ” (Affinity) |
|-----------|-------------------------|---------------------|-------------------|----------------------------------|--------------------------|
| **🔴 RED** | **CINDER CORE** <br>*(Hạt nhân Than Chảy)* | **“Igni-Sanguis”** <br>*(Máu Lửa)* | **Physical Burst / HP Sacrifice → High DMG** | PBR Metalness cao, Outline đỏ tía cam (P5 “Red = Violence”). Anim: *Impact frames* giật cục, *smear* kiếm láy nhiệt. | **Astra** (Lôi Kiếm — *Red/Yellow hybrid*) |
| **🟢 GREEN** | **VERDANT VITAE** <br>*(Sinh Mạch Xanh)* | **“Chloros-Blood”** <br>*(Máu Lá)* | **Heal / Regen / Cleanse** | Subsurface Scattering xanh lá mượt, particle “leaf-vein” bay theo normal. Anim: *Follow-through* mềm, pose “hít thở” trước khi cast. | **Elysia** (Hỗ trợ — *Green/Blue hybrid*) |
| **🔵 BLUE** | **CRYO-MNEMOS** <br>*(Băng Ký Ức)* | **“Glacis-Logic”** <br>*(Logic Băng)* | **Shield / Debuff (Slow/Freeze) / Mind Control** | Outline xanh băng *glitch* (HSR “Ice = Quantum”). Shader *Fresnel* pulse theo beat. Anim: *Mechanical precision*, tay tạo hình ký hiệu (sigil). | **Lin** (Nanite — *Blue/Purple hybrid*) |
| **🟡 YELLOW** | **AETHER VOLT** <br>*(Điện Tử Hư Không)* | **“Aurum-Flux”** <br>*(Dòng Vàng)* | **Speed / AP Gain / Chain Lightning / Ultimate Charge** | *Bloom* mạnh, outline vàng chm *jitter* 1px (P5 “Blessing”). Anim: *Anticipation* gần 0, chuyển pose *snap*. | **Astra** (Primary) + **Boran** (Counter) |
| **🟣 PURPLE** | **VOID ANCHOR** <br>*(Mỏ neo Hư Không)* | **“Umbra-Synthetica”** <br>*(Tổng hợp Bóng Tối)* | **Debuff Heavy / Corruption / Summon / Reality Warp** | *Dissolve shader* + *Chromatic Aberration*Outline tím đen *pulse* theo HP enemy. Anim: *Floaty*, *inverse kinematics* tay xuyên qua không gian. | **Lin** (Primary) + **Elysia** (Time-stop synergy) |

> **🔑 Key Rule cho VFX/Shader/Anim:**  
> - **Match-3** = *Resonance Surge* (kéo 1 nguồn).  
> - **Match-4** = *Dual Resonance* (kết hợp 2 màu → *Hybrid VFX*: Red+Yellow = **Plasma**, Blue+Purple = **Chrono-Frost**).  
> - **Match-5** = **PRISM OVERDRIVE** — *Full Spectrum* → Trigger **Ultimate** (mỗi Starter có 1 Ultimate signature color nhưng VFX chứa *all 5 spectrum bands*).  
> → **Tech Art:** Mỗi màu = 1 **Material Parameter Collection** (MPC) global → đổi palette color-blind chỉ swap MPC, không đục shader.

---

## 🎥 **L2 — CAMERA AS NARRATIVE DEVICE: “ARCHIVIST’S EYE” (MẮT CỦA NGƯỜI LƯU TRỮ)**

> **Concept:** Camera **KHÔNG** phải “người chơi vô hình”. Nó là **“Oculus-7”** — *Drone quan sát tự chủ* do **Archive (Kho Lưu Trữ Trung Uyển)** triển khai theo dõi squad RE:FRAY.  
> - **Lore justification:** Archive cần *dữ liệu chiến thuật thực chiến* để huấn luyện **“Simulacra”** (AI chiến đấu) cho Dominion. Squad được “cho mượn” Oculus-7 như 1 **tactical asset** — nó cung cấp *thông tin chiến trường* (Turn Order, Weakness Scan) đổi lấy *data feed* liên tục.  
> - **Diegetic UI:** Turn Order (HSR) = **“Threat Prediction Timeline”** của Oculus-7. Command Palette (P5) = **“Resonance Menu”** do Oculus-7 project ra *World Space Canvas* (hologram ghim vào không gian chiến trường).  

| Camera Mode | Diegetic Name | Lore Behavior | Visual Signature (Shader/Post-Process) | Transition Cue |
|-------------

---

### ⚔️ Game Developer:
## 🎯 **PROPOSAL: “RESONANCE CHAIN – COMBO BREAK MECHANIC”**
*(Đồng bộ hoàn toàn với O1-O5, L1 & L2 Lore, và Performance Budget)*

---

### 1️⃣ **CORE IDEA**
- **Resonance Chain** là **combo‑trigger hệ thống** xây dựng dựa trên **Match‑3/4/5** đã có (O1) và **Color‑Source Mapping** (L1).
- Khi một **match** được tạo, **Color Energy** tương ứng được giải phóng → nạp vào **Resonance Gauge** của từng tướng (riêng biệt).
- **Các màu trùng khớp** (ví dụ: Đỏ + Vàng) **kích hoạt hiệu ứng “Song Trùng”** → tăng tốc độ tích lũy gauge và tạo ra **Debuff tạm thời** trên kẻ thù (ví dụ: Giảm giáp, Tăng sát thương nhận vào).
- Khi **Gauge đầy**, tướng có thể kích hoạt **“Break‑Stagger”** (Break = phá vỡ giáp, Stagger = làm choáng) → **kích hoạt animation đặc trưng** (O1) và **chuyển sang Camera Mode** phù hợp (O2).
- **Match‑5** tạo ra **“Prism Overdrive”** → **kích hoạt Ultimate** (O3) đồng thời **làm đầy gauge cho toàn bộ đội** và **làm mới thời gian hồi chiêu** cho tất cả các kỹ năng đã sử dụng trong trận đấu.

> **Tại sao điều này phù hợp với Design?**
> - **Gameplay đọc được qua hình ảnh** – các vệt màu, các hình dạng particle, và gauge trực quan hóa *nguồn năng lượng* (L1).
> - **Camera điều hướng** – khi một tướng thực hiện Break/Stagger, **Camera Mode 2 (Skill Close‑up)** tự động blend (O2) tập trung vào *Root/Weapon* của tướng đó, tạo ra *narrative “Archivist’s Eye”* về một sự kiện quan trọng.
> - **Dual Pipeline** – các hoạt ảnh đầy đủ 3D (Pipeline A) có *outline shader* thay đổi màu sắc theo nguồn (P5 style). Các variant chibi SD (Pipeline B) chỉ hiển thị **icon gauge màu** trên đầu (không cần facial blendshape).
> - **Performance** – cơ chế này sử dụng **giá trị boolean nhỏ** (match‑type, màu‑energy) và **số lượng particle hạn chế** (≤ 12/frame cho mỗi tướng) → nằm trong ngân sách <12ms GPU/frame (O5).

---

### 2️⃣ **BALANCE PARAMS (Phase‑Lock for Sprint  sogar 1.2–1.4)**

| **Role** | **Tướng (Starter)** | **Gauge Capacity** | **Energy / Match** | **Break Damage** | **Stagger Duration** | **Ultimate Cool‑down (Match‑5)** | **AP Cost (Break)** | **Combo‑Synergy (Color)** |
|----------|----------------------|--------------------|--------------------|------------------|----------------------|----------------------------------|----------------------|---------------------------|
| **🔴 Physical** | **Astra** | 100 | +25 (Red) / +15 (Yellow) | 1.2× ATK | 0.8s (stun) | 45s | 15 AP | Red+Yellow → **Plasma Burst** (+20% DMG, 0.5s AoE) |
| **🟢 Support** | **Elysia** | 80 | +20 (Green) / +10 (Blue) | 0.8× ATK (Heal) | 1.2s (silence) | 50s | 10 AP | Green+Blue → **Regen‑Shield** (+30% HP, 2s) |
| **🔵 Tech** | **Lin** | 90 | +22 (Blue) / +18 (Purple) | 1.0× ATK (CC) | 1.0s (root) | 48s | 12 AP | Blue+Purple → **Chrono‑Freeze** (slow 0.6s) |
| **🟡 Hybrid** | **Boran** | 70 | +18 (Yellow

---

### 🎨 Concept Illustrator & 3D:
# 🎨 RE:FRAY ART DIRECTION PACKAGE: VISUAL STYLE SPEC (Sprint 1→3)
**Art Director & 3D Lead** — Stylistic bible aligned with PM O1–O5, Lore L1–L3, and Dual-Animation Pipeline. All specs written for UE5 → WebGL/WASM pipeline with <12ms/frame budget.

---
## 🧭 VISUAL PHILOSOPHY: "ANIME CYBERPUNK SHARP-EDGE & READABILITY"
- **Inspo:** `Punishing: Gray Raven` (weighty cel-shading, mechanical-fantasy mix) + `Zenless Zone Zero` (dynamic camera, bold color blocks, SD/3D hybrid readability).
- **Core Rule:** *Every visual

---

### 🚀 Antigravity (Lead Architect & Codebase Execution):
# ⚙️ **ANTIGRAVITY — TECHNICAL RESOLUTION & ARCHITECTURE LOCK**
**Dự án:** RE:FRAY | **Phase:** 1.2 Kickoff (Sync 1-1 & CDS)  
**Trạng thái:** **CHỐT KIẾN TRÚC — BẮT ĐẦU CODE NGAY**  
**Codebase Ref:** C++ Core (744/744 checks), WASM (51/51 PASS), Blender 5.2 (Astra PGR Model + 2 Actions)

---

## 🟢 **PHẦN A: NHỮNG ĐIỂM KỸ THUẬT ĐÃ GIẢI QUYẾT & THỐNG NHẤT 100%**
*Được suy ra trực tiếp từ Codebase hiện tại + Quyết định Lore/Game Dev/Art vừa chốt. **KHÔNG CẦN HỎI THÊM, BẮT ĐẦU TRIỂN KHAI NGAY.***

| # | Chủ đề | Quyết định Kỹ thuật (Locked) | Cơ sở Codebase / Input |
| :--- | :--- | :--- | :--- |
| **A1** | **Color → Gameplay Mapping** | **5 `EPrismSource` Enum** map 1-1 với L1 Lore. Mỗi source = 1 **Material Parameter Collection (MPC)** Global + 1 **Gameplay Tag** (`Prism.Red`, `Prism.Green`...). | C++ Core: `FMatchRng` deterministic → Color index 0-4. Lore L1 Table. |
| **A2** | **Match Logic → Ability Trigger** | **Match-3/4/5** không queue. **Immediate Command Pattern**: `MatchDetected` → `FGameplayEventData` → `AbilitySystemComponent.TryActivateAbility` **< 2ms** (Game Thread). **No Animation Queue**. | O1 Requirement (<100ms). C++ Core: `FMatchGrid::ResolveMatches()` trả về `TArray<FMatchResult>` tức thì. |
| **A3** | **Resonance Chain / Gauge System** | **Per-Character `FResonanceGauge` Component** (C++ Struct, non-UObject). Tích lũy `float Energy[5]`. **Break/Stagger** = `GameplayEffect` (Instant) + `GameplayCue` (Anim/VFX/Camera). **Match-5 = Prism Overdrive** → `GrantTag(Prism.Overdrive)` + `ResetAllCooldowns()`. | Game Dev Proposal + O1. C++ Core: `FMatchRng` đảm bảo deterministic replay cho Gauge. |
| **A4** | **Camera Directing System (CDS) Architecture** | **`ACameraDirector` (Actor Singleton)** quản lý **3 Camera Mode** là 3 **`UCameraMode` UObject** (State Pattern). Blend = `FViewTargetTransitionParams` (0.3s). **Diegetic Reason**: Lore L2 "Oculus-7 Drone" → Camera Shake/Glitch = **PostProcess Material** driven by `Oculus7.State` (Normal/Scan/Combat/Overdrive). | O2 Spec. Lore L2. UE5 Camera Stack. |
| **A5** | **Dual Pipeline Animation Retargeting** | **IK Rig + Retargeter** setup **MỘT LẦN** trong Editor (Asset `IKRig_Astra_Battle`, `IKRig_Astra_Chibi`). **Runtime**: Chỉ swap `SkeletalMesh` + `AnimClass` (Linked Anim Layer). **Không scale bone runtime**. Chibi "Bounce" = **Additive Anim Layer** (`Add_Chibi_Bounce`) bật/tắt bằng `GameplayTag`. | O3 Spec. Blender 5.2: Astra Rig 21 bones (Humanoid compatible). Art Spec: "Shared Library". |
| **A6** | **UI/UX World Space Canvas & Color Blind** | **`AWorldSpaceHUD` Actor** attaches to `ACameraDirector`. **Turn Order** = `UUserWidget` rendered to **Render Target** → Material on Plane in World. **Color Blind** = Swap **Global MPC** (`MPC_PrismColors_Deuteranope`) via `UGameUserSettings` → **0 Shader Recompile**. | O4 Spec. Art Spec: "MPC Global per color". Lore L1: 5 distinct sources. |
| **A7** | **VFX / Shader Pipeline (P5 Outline)** | **Outline = Custom Depth + Post Process Material** (Stencil Mask). **Color** = `MPC_PrismColors[SourceIndex].OutlineColor`. **Dissolve/Glitch** = Material Functions driven by `GameplayCue` parameters. **Particle Budget**: Niagara **GPU Sim**, Max 128 particles/skill, Pool Prewarm. | O5 Budget (<12ms GPU). Art Spec: "Cel-shade + Outline". Lore L1: Hybrid VFX (Plasma, Chrono-Frost). |
| **A8** | **WASM / Web Build Pipeline** | **Emscripten Toolchain** (UE5.4+). **C++ Core** compile sang WASM **đã ổn định** (51/51 tests). **Logic Battle** chạy thuần WASM (No UE Overhead). **3D Render** = UE Pixel Streaming **HOẶC** Three.js/WGSL custom renderer (Decision C1). Current `m3core.wasm` chỉ chứa Logic + Match3. | Current Web Status: `m3core.wasm` + `m3ui.js`. 51/51 PASS. |

---

## 📋 **PHẦN B: KẾ HOẠCH TRIỂN KHAI (FILES & MODULES)**
*Chia

---

### 📋 TỔNG KẾT BIÊN BẢN (PM Lead):
# 📋 **RE:FRAY — ROUND TABLE SUMMARY & ACTION PLAN**
**Gửi:** Anh Huy (Stakeholder)  
**Từ:** PM Lead  
**Trạng thái:** **CHỐT LỆNH — BẮT ĐẦU SPRINT 1.2 NGAY**  
**Thời gian:** Hiện tại → Sprint 3.0 (Vertical Slice)

---

## ✅ **KẾT LUẬN HỘP: 4 TRỤ CỐT LÕI ĐÃ ALIGN 100%**

| Trụ | Quyết định chốt | Tác động tức thì |
| :--- | :--- | :--- |
| **1. Lore → Systems (L1)** | **5 Nguồn Năng Lượng (Prism Protocol)** map 1-1 Màu Block → Gameplay Tag → MPC Shader. Match-5 = **Prism Overdrive** (Ultimate + Reset CD). | VFX/Shader/UI có ngôn ngữ chung. Color-blind = swap MPC global. |
| **2. Camera = Narrative (L2)** | **Oculus-7 Drone (Archive)**. 3 Mode: Formation / Skill Close-up / Enemy POV. Glitch/Shake = Diegetic Post-Process. | CDS architecture locked. UI World-space gắn trên Camera. |
| **3. Dual Pipeline (L3/O3)** | **Chibi = Spirit Form / Battle = Manifestation**. **IK Rig Retargeting 1 lần** → Runtime chỉ swap Mesh + AnimClass. Chibi Bounce = Additive Layer. | 1 Animation Author → 2 Variants Auto. Không scale bone runtime. |
| **4. Combat Loop (O1/O5)** | **Resonance Chain**: Match → Instant Event → Gauge → Break/Stagger → Camera Blend → Ultimate. **<100ms input→anim**. Deterministic WASM ready. | Core Loop playable Sprint 1.2. Performance budget guaranteed. |

---

## 🚀 **ACTION PLAN — SPRINT 1.2 → 1.4 (TUẦN 1-6)**

| Sprint | Owner | Deliverable (Definition of Done) | Dependency |
| :--- | :--- | :--- | :--- |
| **1.2**<br>(Tuần 1-2) | **Antigravity (Lead)** | **Core Loop Playable (WASM + UE):**<br>• `PrismMatchGrid` + `ResonanceGauge` + `AbilityTrigger` chạy deterministic.<br>• Match 3/4/5 → Trigger Anim State Machine **< 100ms**.<br>• 5 MPC Color + Color-blind Mode pass. | C++ Core sẵn (744/744). Lore L1 Table. |
| | **Tech Art** | **Astra Dual Pipeline Ready:**<br>• Battle Mesh (15k tris) + Chibi Mesh (3k tris) + **IK Rig/Retargeter** setup xong.<br>• Shared Anim Library: `Idle, Move, Match3_Hit, Match5_Ult, Hit_React, Death`. | Art Spec + Blender 5.2 Model. |
| | **VFX Lead** | **Prism VFX Kit v0.1:**<br>• 5 Base Color Niagara Emitters (GPU Sim, <128 ptn).<br>• 3 Hybrid Match-4 (Plasma, Chrono-Frost, Vitae-Spark).<br>• Outline Post-Process Material (Custom Depth). | L1 Color Coding. MPC Pipeline. |
| **1.3**<br>(Tuần 3-4) | **Antigravity** | **Camera Directing System (CDS) v1.0:**<br>• `ACameraDirector` + 3 `UCameraMode` (Formation/Close-up/EnemyPOV).<br>• Blend 0.3s seamless. Oculus-7 Post-Process (Scan/Combat/Overdrive).<br>• World Space Canvas Hook cho UI. | O2 Spec. Lore L2. |
| | **UI/UX Lead** | **Diegetic HUD v1.0:**<br>• Turn Order (Timeline) render World Space trên Camera CDS.<br>• Command Palette (Radial) World Space.<br>• Resonance Gauge hiển thị realtime trên Character. | CDS Hook. MPC Color. |
| | **Game Designer** | **Balance Config Data Table:**<br>• Gauge Capacity / Energy per Match / Break Power / Stagger Duration / AP Cost cho 4 Starter.<br>• Combo Synergy Matrix (Red+Yellow=Plasma...). | Game Dev Proposal. |
| **1.4**<br>(Tuần 5-6) | **All Leads** | **VERTICAL SLICE 1.0 (Internal Demo):**<br>• **1 Map (Aster Ruins)** + **1 Wave (4 Enemies)**.<br>• 4 Starter playable (Astra, Elysia, Lin, Boran).<br>• Full Loop: Match → Chain → Break → Ultimate → Camera → Win/Lose.<br>• **Perf Check:** <12ms GPU / <6ms CPU / <1.2GB RAM @ 1080p. | Tất cả Sprint 1.2-1.3 Done. |
| | **Antigravity** | **WASM Build Pipeline Stabilize:**<br>• Logic Battle (Core) chạy WASM standalone test 1000 turns deterministic.<br>• Decision C1: **UE Pixel Streaming** vs **Custom Three.js Renderer** (Chốt tuần 3). | O5 Budget. Web Release Target. |

---

## ⚠️ **RISK & MITIGATION (PM TRACKING)**

| Risk | Mức độ | Mitigation | Owner |
| :--- | :--- | :--- | :--- |
| **IK Retargeting Chibi jitter** | 🔴 Cao | Sprint 1.2: Tech Art test `Add_Chibi_Bounce` Additive Layer trên 3 anim quan trọng. Fail → Fallback: Separate Chibi Anim Set (cost +20% anim time). | Tech Art Lead |


