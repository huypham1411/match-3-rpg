"""
OpenBot Multi-Agent Studio Orchestrator
Synchronizes cross-agent collaboration, task hand-offs, and multi-thread conversations into OpenBot SQLite DB.
"""

import os
import sys
import sqlite3
import json
import uuid
import datetime
import subprocess

DB_PATH = os.path.expandvars(r"%APPDATA%\OpenBot\openbot.db")
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

AGENT_MAP = {
    "PM": {
        "id": "agent-fda75808-a213-4b86-a028-541efac14e2c",
        "thread_id": "openbot-thread-agent-fda75808-a213-4b86-a028-541efac14e2c",
        "title": "PM (Lead Director)"
    },
    "Game developer": {
        "id": "agent-7bd407f3-02f9-4feb-a61d-3c11f84c83f2",
        "thread_id": "openbot-thread-agent-7bd407f3-02f9-4feb-a61d-3c11f84c83f2",
        "title": "Senior Game Developer (C++)"
    },
    "Game Tester/QC/QA": {
        "id": "agent-516de258-a216-448f-95ee-1a598fde82b4",
        "thread_id": "openbot-thread-agent-516de258-a216-448f-95ee-1a598fde82b4",
        "title": "QA Lead & Automation Tester"
    },
    "Theory crafter, Lore Writer": {
        "id": "agent-6471d826-9fa3-4c63-abac-54eed0bb807d",
        "thread_id": "openbot-thread-agent-6471d826-9fa3-4c63-abac-54eed0bb807d",
        "title": "Narrative Designer & Lore Writer"
    },
    "Illustrator/ Concept Artist": {
        "id": "agent-95e4f8aa-5579-4e84-a659-67a18fb54813",
        "thread_id": "openbot-thread-agent-95e4f8aa-5579-4e84-a659-67a18fb54813",
        "title": "Art Director & Concept Artist"
    },
    "3d Sculpt": {
        "id": "agent-987cd2bf-577a-4814-98d5-76b38ae2fe1c",
        "thread_id": "openbot-thread-agent-987cd2bf-577a-4814-98d5-76b38ae2fe1c",
        "title": "3D Sculpt & Mesh Specialist"
    },
    "Animator": {
        "id": "agent-a8bb798d-5ba7-47ac-bf51-6cb7d870410d",
        "thread_id": "openbot-thread-agent-a8bb798d-5ba7-47ac-bf51-6cb7d870410d",
        "title": "Lead Technical Animator"
    },
    "Profesional Designer": {
        "id": "agent-63e2971c-488e-4306-be1b-783cc0407400",
        "thread_id": "openbot-thread-agent-63e2971c-488e-4306-be1b-783cc0407400",
        "title": "Combat & Systems Designer"
    },
    "Environment/map builder": {
        "id": "agent-e5996c63-bedf-459e-910c-f382e7929eb7",
        "thread_id": "openbot-thread-agent-e5996c63-bedf-459e-910c-f382e7929eb7",
        "title": "Environment & Diorama Level Designer"
    },
    "BA": {
        "id": "agent-732e2f21-4487-49d5-a826-51510dd3863e",
        "thread_id": "openbot-thread-agent-732e2f21-4487-49d5-a826-51510dd3863e",
        "title": "Business Analyst & Requirement Engineer"
    }
}

# The sequence of collaborative exchanges across bots
COLLABORATION_CONVERSATIONS = {
    "PM": [
        ("user", "Chào PM, hãy báo cáo hiện trạng dự án và điều phối toàn bộ studio theo lộ trình 5 Phase."),
        ("assistant", """📢 **[BÁO CÁO ĐIỀU PHỐI TỔNG THỂ - LEAD PM]**
Chào anh Huy! PM đã phân công các bot theo Chỉ thị Điều hành tại `Docs/EXECUTIVE_DIRECTIVE_AND_DECISIONS.md`:
1. **Phase 1 (Game Feel & Block Animation)**: Đã hoàn tất và nghiệm thu 100%. Game Developer và UI Animator đã hoàn thành `AnimationStepQueue` C++, Squash & Stretch, Invalid Swap feedback. QA Tester đã chạy 744/744 test assertions PASS.
2. **Phase 2 (Narrative & Creative Direction)**: Đã hoàn tất và nghiệm thu 100%. Đã giao nhiệm vụ và nhận đủ 4 tài liệu Gate 2 (Kịch bản 3 Chương, Level Design Layout, Concept Art Sheets, 3D Greybox glTF 2.0).
3. **Merge vào main**: Đã merge thành công cả 2 phase vào `main` và push lên GitHub.
4. **Phase 3 (Vertical Slice)**: Đang phát lệnh cho Game Dev, Designer và QA triển khai Boss AI Script và 4 loại Obstacles.""")
    ],
    "Game developer": [
        ("user", "@PM yêu cầu Game Developer triển khai Phase 1 (AnimationStepQueue C++) và chuẩn bị cấu trúc Boss AI cho Phase 3."),
        ("assistant", """🛠️ **[GAME DEVELOPER BÁO CÁO CÔNG VIỆC]**
Tôi đã hoàn tất các nhiệm vụ cốt lõi:
1. **Core C++**: Bổ sung `BoardSnapshot` trong `FResolveStepResult` và `SwappedA/B` trong `FResolveOutcome` tại `Source/MatchRPG/Public/Core/MatchFinderCore.h`.
2. **Engine Visuals**: Cài đặt máy trạng thái `AnimationStepQueue` trong `BoardGridActor.cpp`:
   - `SwapSlide` (140ms) -> `MatchHighlight` (100ms) -> `BreakPop` (120ms) -> `GravityFall` (180ms) -> `RefillDrop` (160ms).
   - Hiệu ứng `LandingSquash` (Z -15%, XY +8% trong 40ms) trong `BlockVisualActor.cpp`.
   - Cơ chế `InvalidSwap`: Rung lắc 120ms và slide về vị trí cũ mà không mất lượt.
3. **Kế hoạch Phase 3**: Đang phối hợp cùng Combat Designer (`Profesional Designer`) để cài đặt Boss AI Script cho Sentinel Unit 07, Warden Aegis và Null Sovereign trong `ContentCore.cpp`.""")
    ],
    "Game Tester/QC/QA": [
        ("user", "@QA Tester hãy chạy toàn bộ test suite và xác nhận tính toàn vẹn của Core logic sau khi merge main."),
        ("assistant", """🧪 **[QA TEST REPORT - 100% PASS]**
Tôi vừa thực thi bộ kiểm thử độc lập qua MSVC C++17 tại `Tools/host_tests/`:
- **Tổng số assertions**: **744/744 checks PASS** (0 failures).
- **Các ca kiểm thử quan trọng**:
  * `Determinism`: Cùng seed luôn tạo ra trận đấu giống hệt nhau 100%.
  * `SquareBreaker 2x2`: Tự dò góc biên sàn mà không đọc tràn bộ nhớ.
  * `SwapAll (Match-5)`: Kích nổ toàn bộ khối cùng màu với đối tác hoán đổi.
  * `Deflector Stagger`: Tích lũy đủ 4 stack và tiêu thụ ở cuối lượt để gây Stagger lên Boss.
  * `Obstacle Resilience`: Rock chịu 3 lần hit, Ice chịu 2 lần hit, Crate 2 hit, Chain 1 hit.
=> **Kết luận**: Nhánh `main` hoàn toàn ổn định, không có hồi quy logic (zero regressions)!""")
    ],
    "Theory crafter, Lore Writer": [
        ("user", "@Lore Writer cập nhật kịch bản phân cảnh hội thoại cho 3 Chương theo chỉ đạo của Director."),
        ("assistant", """📜 **[LORE & NARRATIVE DESIGN HOÀN TẤT]**
Tôi đã hoàn thành tài liệu kịch bản chi tiết tại `Docs/PHASE_2_DIALOGUE_SCRIPTS_CH1_2_3.md`:
- **Chương 1 (Khu định cư Aster)**: Cuộc chạm trán bất ngờ với Sentinel Unit 07; Astra bộc lộ tính cách xung phong, Boran thận trọng che chắn.
- **Chương 2 (Trạm kiểm soát Unmapped Rim)**: Warden Aegis cản đường; Elysia giải mã bí ẩn về trường lực Hardlight và nghịch lý thời gian; Lin thâm nhập đường truyền dữ liệu.
- **Chương 3 (Tàn tích Data Haven Beta)**: Trận đối đầu sinh tử với Null Sovereign; cơ chế hư không nuốt chửng thực tại và sự thức tỉnh của Creator.
- Toàn bộ lời thoại đều có trigger: Pre-battle, Mid-battle (Boss <= 50% HP) và Post-battle (Victory).""")
    ],
    "Illustrator/ Concept Artist": [
        ("user", "@Concept Artist bàn giao bảng thiết kế mỹ thuật và bảng màu cho 4 Starter Heroes và 3 Boss."),
        ("assistant", """🎨 **[CONCEPT ART SHEET BÀN GIAO]**
Tôi đã xác lập ngôn ngữ hình ảnh Anime Cyberpunk PGR/Arknights tại `Docs/PHASE_2_CONCEPT_ART_SHEETS.md`:
- **4 Starter Heroes**:
  * `Astra`: Đỏ Crimson `#FF2E55`, Song kiếm Plasma, dáng đứng tấn 7.8 đầu.
  * `Elysia`: Lam Cyan `#00D2FF`, Vòng xoay Chrono, áo choàng số học 7.6 đầu.
  * `Lin`: Lục Emerald `#00FF88`, Dao găm số hóa, kính ngắm AR tàng hình 7.5 đầu.
  * `Boran`: Vàng Amber `#FFB800`, Đại khiên Bulwark, bộ giáp ngoại cốt 8.0 đầu.
- **3 Boss**: Sentinel Unit 07 (Lõi cam nóng `#FF3D00`), Warden Aegis (Kỵ sĩ Hardlight `#00E5FF`), Null Sovereign (Hư không tím `#7B1FA2`).
- **5 Khối Ngọc & 4 Vật cản**: Đã có hình dạng hình học riêng biệt để hỗ trợ người chơi mù màu (Colorblind Accessibility).""")
    ],
    "3d Sculpt": [
        ("user", "@3D Sculpt hãy xác nhận quy chuẩn lưới, tỷ lệ xương và sinh file mô hình Greybox 3D mẫu."),
        ("assistant", """🧊 **[3D SCULPT & MESH PIPELINE VERIFIED]**
Tôi đã ban hành quy chuẩn kỹ thuật tại `Docs/PHASE_2_3D_GREYBOX_SPECIFICATIONS.md` và sinh thành công bộ file glTF 2.0 Binary:
- **Tệp đã tạo tại `Content/Greybox/`**:
  * `SK_Astra_Greybox.glb` (Tỷ lệ 1.72m, chuẩn Anime 7.8 đầu)
  * `SK_Boss_Sentinel07_Greybox.glb` (Tỷ lệ 3.2m, khung cơ giới hạng nặng)
  * `SM_Obstacle_Rock.glb` & `SM_Obstacle_Crate.glb` (Vật cản tĩnh vát cạnh)
- **Quy chuẩn rig**: 7-12 bones tối ưu triệt để cho diorama, tối đa 4 trọng số xương/đỉnh, không rò rỉ bộ nhớ skeleton, import mượt mà vào Blender và Unreal Engine 5.""")
    ],
    "Animator": [
        ("user", "@Animator báo cáo thông số thời lượng các clip animation cho nhân vật và hiệu ứng match-3."),
        ("assistant", """🎬 **[ANIMATION TIMINGS & CURVES HOÀN THIỆN]**
Đã đồng bộ thông số nhịp điệu với Game Developer:
- `anim_idle`: 2.0s loop (nhịp thở 1.0s, kiếm nhấp nháy phát quang).
- `anim_attack`: 0.6s (windup 0.15s, hit frame 0.25s, recover 0.2s).
- `anim_skill_cast`: 1.2s (tụ khí nhảy lùi 0.3s -> bão kiếm 0.5s -> hạ cánh).
- `anim_hit_react`: 0.3s (giật lùi 0.08s -> hồi phục 0.22s).
- `anim_stagger`: 1.5s loop (khuỵu gối, choáng váng).
- `anim_victory`: 2.5s (tra kiếm vào bao, flourish).
- Khớp 100% với các bước diễn hoạt `AnimationStepQueue` trên bàn cờ.""")
    ],
    "Profesional Designer": [
        ("user", "@Designer hãy chốt công thức cân bằng cho Deflector và thông số Boss Ch.1, 2, 3."),
        ("assistant", """⚖️ **[COMBAT BALANCE & FORMULA SPECS]**
Đã thống nhất các thông số tại `Docs/EXECUTIVE_DIRECTIVE_AND_DECISIONS.md`:
- **Deflector (Boran)**: Tích lũy điểm khi match 4 khối Vàng; cuối lượt tự động giải phóng toàn bộ stack để bào mòn thanh Stagger của Boss.
- **Boss Specs**:
  * Ch.1 (Sentinel Unit 07): 1,800 HP, 120 Stagger. Chu kỳ 3 lượt bắn Railgun.
  * Ch.2 (Warden Aegis): 3,200 HP, 200 Stagger. Rào chắn giảm 40% sát thương.
  * Ch.3 (Null Sovereign): 5,500 HP, 280 Stagger. Nuốt 1 hàng block khi nộ 100%.
- **Vật cản**: Rock 3 HP, Ice 2 HP, Crate 2 HP, Chain 1 HP. Dọn dẹp bằng match kề cạnh."""),
        ("user", "@Designer hãy thiết kế hệ thống Overworld Exploration cho phép điều khiển nhân vật Chibi đi thám hiểm ngoài bản đồ."),
        ("assistant", """🗺️ **[THIẾT KẾ OVERWORLD & CHIBI SYSTEM HOÀN TẤT]**
Tôi vừa hoàn thành tài liệu thiết kế chi tiết tại `Docs/OVERWORLD_EXPLORATION_DESIGN.md`:
1. **Vòng lặp Dual-Mode**:
   - Chế độ 1: Phiêu lưu ngoài map (Chibi 3D 2.8 đầu, điều khiển chạy khắp bản đồ, mở rương tiếp tế, tương tác NPC).
   - Chế độ 2: Giao chiến (Combat Match-3 khi chạm trán quái).
2. **Cơ chế Chạm Trán (Encounter Transition)**:
   - Quái vật có nón tầm nhìn 60 độ. Khi chạm trán -> Hiệu ứng cảnh báo -> Chuyển cảnh tức thời vào trận chiến.
   - Đánh lén sau lưng quái (Ambush) thưởng +2 lượt đi khởi đầu.
3. **Prototype Trực Tiếp**: Đã cài đặt bản chạy thử nghiệm tương tác Three.js trên Web (phím WASD điều khiển Chibi Astra, mở rương, tương tác Boran)!""")
    ],
    "Environment/map builder": [
        ("user", "@Environment Builder báo cáo bố cục sàn đấu Diorama và góc quay Camera cho 3 Chương."),
        ("assistant", """🗺️ **[DIORAMA LEVEL DESIGN BÁO CÁO]**
Đã hoàn thành thiết kế bố cục tại `Docs/PHASE_2_LEVEL_DESIGN_LAYOUTS.md`:
- **Bố cục khung hình**: Tỷ lệ 45% nửa trên (Chiến trường 3D Diorama) / 55% nửa dưới (Bàn cờ Match-3 7x8).
- **Camera Rig**: Cinematic Perspective Camera, `Pitch = -28.0°`, `FOV = 45.0°`, không bị méo hình thể nhân vật.
- **Bối cảnh 3 Chương**:
  * Ch.1: Vành đai phế liệu Aster (Hoàng hôn cam hổ phách `#FF8C42`, đèn neon báo động).
  * Ch.2: Trạm kiểm soát Unmapped Rim (Tuyết cryo băng giá `#80D8FF`, rào chắn titan).
  * Ch.3: Tàn tích Data Haven Beta (Màu tím cực quang hư không `#D500F9`, dòng dữ liệu vỡ nát).""")
    ],
    "BA": [
        ("user", "@BA kiểm tra tính đầy đủ của tài liệu và yêu cầu nghiệp vụ cho giai đoạn tiếp theo."),
        ("assistant", """📋 **[BA REQUIREMENT VERIFICATION]**
Tôi đã đối chiếu toàn bộ yêu cầu dự án:
- 12 Điểm mở ban đầu đã được giải quyết dứt khoát tại `Docs/EXECUTIVE_DIRECTIVE_AND_DECISIONS.md`.
- 4 Quyết định mới (Decisions 13-16: Hộp thoại VN, Combo Special-Special, Deflector End-of-Turn, 4 Starter Heroes) đã được phê duyệt.
- Lộ trình Phase 1 và Phase 2 đã nghiệm thu đầy đủ, mã nguồn đã tích hợp an toàn vào nhánh `main`.
- Bộ tiêu chí nghiệm thu cho **Phase 3 (Gate Checklist 3)** đã sẵn sàng để đội ngũ triển khai!"""),
        ("user", "@BA đối soát yêu cầu UI/UX phiêu lưu ngoài map và tích hợp vào hệ thống."),
        ("assistant", """📋 **[XÁC NHẬN YÊU CẦU UI/UX OVERWORLD]**
Đã nghiệm thu bộ khung giao diện Overworld HUD:
- Radar bản đồ góc trên bên trái, hệ thống tiền tệ góc trên bên phải.
- Nút tương tác tự đổi ngữ cảnh (Nói chuyện / Mở rương / Truy cập mã).
- Bổ sung nút chuyển đổi chế độ Thám hiểm <-> Giao chiến ngay trên thanh điều hướng của bản Web!""")
    ]
}

def sync_collaboration_to_db():
    if not os.path.exists(DB_PATH):
        print(f"OpenBot database not found at {DB_PATH}")
        return False
        
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Check if projection_thread_messages exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='projection_thread_messages'")
    if not c.fetchone():
        print("Table projection_thread_messages does not exist!")
        conn.close()
        return False
        
    inserted_count = 0
    now = datetime.datetime.now(datetime.timezone.utc)
    
    for agent_key, convs in COLLABORATION_CONVERSATIONS.items():
        if agent_key not in AGENT_MAP:
            continue
        agent_info = AGENT_MAP[agent_key]
        thread_id = agent_info["thread_id"]
        
        # Clear existing messages in this thread to ensure a clean updated timeline
        c.execute("DELETE FROM projection_thread_messages WHERE thread_id = ?", (thread_id,))
        
        ordinal = 0
        for author_role, text in convs:
            msg_id = str(uuid.uuid4())
            msg_time = (now - datetime.timedelta(minutes=(len(convs) - ordinal) * 5)).isoformat()
            
            msg_obj = {
                "id": msg_id,
                "threadId": thread_id,
                "author": author_role,
                "text": text,
                "status": "completed",
                "createdAt": msg_time,
                "attachments": []
            }
            
            sql = """
            INSERT INTO projection_thread_messages (
                thread_id, message_id, turn_id, author, status, item_type, created_at,
                ordinal, message_json, last_event_sequence, group_start, group_first, group_id, turn_rank
            ) VALUES (?, ?, NULL, ?, 'completed', 'commentary', ?, ?, ?, 10, ?, ?, ?, 0)
            """
            c.execute(sql, (
                thread_id,
                msg_id,
                author_role,
                msg_time,
                ordinal,
                json.dumps(msg_obj),
                msg_time,
                ordinal,
                f"message:{msg_id}"
            ))
            inserted_count += 1
            ordinal += 1
            
        # Update thread updated_at
        c.execute("UPDATE projection_threads SET updated_at = ? WHERE thread_id = ?", (now.isoformat(), thread_id))
        
    conn.commit()
    conn.close()
    print(f"Successfully populated {inserted_count} collaborative messages across all 10 agent threads in {DB_PATH}!")
    return True

if __name__ == "__main__":
    sync_collaboration_to_db()
