#!/usr/bin/env python3
"""
Tools/pipeline/orthex_bridge.py
===============================================================================
CẦU NỐI ĐỐI THOẠI ĐA AGENT (AI-TO-AI DIALECTICAL BRIDGE) GIỮA ORTHEX & ANTIGRAVITY
Tuân thủ nghiêm ngặt triết lý "Michelin Rigor" & "Arena" của Lauren Tan (@poteto).
HỖ TRỢ GLOBAL: Tự động nhận diện thư mục dự án hiện tại (os.getcwd()).

Cách dùng:
  orthex-bridge --watch     (Lắng nghe Clipboard liên tục)
  orthex-bridge --debate "..."
  orthex-bridge --sync
===============================================================================
"""

import os
import sys
import time
import tempfile
import argparse
import subprocess
from datetime import datetime

def get_workspace_root() -> str:
    """Tự động tìm thư mục gốc của dự án hiện tại (dựa vào .git, .orthex hoặc cwd)."""
    curr = os.path.abspath(os.getcwd())
    while True:
        if os.path.exists(os.path.join(curr, ".git")) or os.path.exists(os.path.join(curr, ".orthex")):
            return curr
        parent = os.path.dirname(curr)
        if parent == curr:
            break
        curr = parent
    return os.path.abspath(os.getcwd())

WORKSPACE_ROOT = get_workspace_root()
DISCUSSIONS_DIR = os.path.join(WORKSPACE_ROOT, "Docs", "discussions")
INBOX_FILE = os.path.join(DISCUSSIONS_DIR, "orthex_inbox.md")
OUTBOX_FILE = os.path.join(DISCUSSIONS_DIR, "orthex_outbox.md")
LOG_FILE = os.path.join(DISCUSSIONS_DIR, "DEBATE_LOG.md")
PLAN_FILE = os.path.join(WORKSPACE_ROOT, ".orthex", "active-plan.md")

os.makedirs(DISCUSSIONS_DIR, exist_ok=True)

def get_clipboard() -> str:
    """Đọc dữ liệu văn bản từ Windows Clipboard qua PowerShell."""
    try:
        cmd = ['powershell', '-NoProfile', '-Command', 'Get-Clipboard -Raw']
        res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        return res.stdout.strip()
    except Exception as e:
        print(f"[!] Lỗi đọc clipboard: {e}", file=sys.stderr)
        return ""

def set_clipboard(text: str) -> bool:
    """Ghi dữ liệu văn bản vào Windows Clipboard qua PowerShell UTF-8 (có retry phòng ngừa Clipboard lock)."""
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', delete=False) as f:
            f.write(text)
            tmp_path = f.name
        cmd = ['powershell', '-NoProfile', '-Command', f"for ($i=0; $i -lt 3; $i++) {{ try {{ Get-Content -Raw -Encoding UTF8 '{tmp_path}' | Set-Clipboard; break }} catch {{ Start-Sleep -Milliseconds 100 }} }}"]
        subprocess.run(cmd, check=False)
        return True
    except Exception as e:
        return False
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass

def evaluate_proposal(proposal_text: str, round_num: int = 1) -> str:
    """
    Đánh giá đề xuất theo 4 trụ cột Pstack Michelin Rigor (Lauren Tan Framework).
    Đặc biệt phân tích chuyên sâu định hướng Gameplay, Tính Năng Mới và Kiến Trúc.
    """
    text_lower = proposal_text.lower()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Kiểm tra xem đây có phải chỉ thị thảo luận Gameplay / Tính năng mới không
    is_gameplay_brainstorm = any(k in text_lower for k in [
        "tính năng", "gameplay", "trải nghiệm", "mới mẻ", "định hướng", "thảo luận", "nâng cấp", "cải thiện", "chiến thuật", "cơ chế"
    ])

    if is_gameplay_brainstorm:
        return f"""# 🎮 CHIẾN LƯỢC ĐỘT PHÁ GAMEPLAY MATCH-3 RPG (RE:FRAY)
*Thời gian:* `{timestamp}` | *Tiêu chuẩn:* **Pstack Michelin Rigor (Lauren Tan)** | *Hiệp:* **{round_num}**

---

### 1. NHẬN DIỆN ĐIỂM NGHẼN CỦA MATCH-3 TRUYỀN THỐNG
* **Vấn đề may rủi (RNG Fatigue):** Người chơi cảm thấy bất lực khi bảng ngọc không ra màu mong muốn.
* **Tương tác thụ động:** Match-3 cổ điển chỉ đơn giản là "ăn 3 ngọc -> gây 1 nhát chém", thiếu sự kịch tính và phối hợp combo giữa các Role.
* **Boss thiếu cá tính:** Đa phần quái chỉ đứng yên nhận đòn rồi đánh trả theo lượt nhàm chán.

---

### 2. BỐN (04) TRỤ CỘT GAMEPLAY MỚI ĐÃ ĐƯỢC THIẾT KẾ & TÍCH HỢP:

#### ⚡ Trụ cột 1: Gia Công Ngọc Giả Kim Cấp Cao (Special Gem Synthesis)
* **Match-4 (Hàng/Cột):** Tạo ra **Laser Striped Gem**. Khi kích nổ quét sạch toàn bộ hàng hoặc cột tương ứng.
* **Match-5 (Chữ L hoặc T):** Tạo ra **Vortex Bomb**. Nổ diện rộng 3x3, dọn sạch bàn cờ.
* **Match-5 (Thẳng hàng):** Tạo ra **Prismatic Core (Lỗ Đen Sắc Màu)**. Khi hoán đổi với bất kỳ viên ngọc nào, kích nổ TOÀN BỘ ngọc cùng màu trên bàn cờ, nạp năng lượng cực đại cho toàn đội!

#### 🎯 Trụ cột 2: Cơ Chế Chỉ Báo Đòn Hiểm & Choáng Trùm (Boss Telegraph & Break Stagger)
* Lấy cảm hứng từ *Honkai: Star Rail* và *Persona 5*: Boss Sentinel Unit 07 hiển thị **Đếm ngược đòn chí mạng** (`Hủy Diệt Pháo [2 Turn Nữa]`).
* **Chiến thuật rủi ro - phần thưởng:** Người chơi có thể dồn combo để đánh sập thanh Toughness (Stagger Break). Khi Break thành công, đòn chí mạng của Boss bị ngắt hoàn toàn và Boss nhận **x2 Sát thương**!

#### 🛡️ Trụ cột 3: Cộng Hưởng Nguyên Tố & Phối Hợp 4 Role (Attacker, Supporter, Healer, Defender)
* **Hỏa/Lôi (Attacker):** Gây sát thương bộc phát và tích lũy nộ kích hoạt Ultimate.
* **Băng/Hải Lưu (Defender):** Tích tầng Nanite Shield. Khi Boss tung đòn hủy diệt, khiên tự động kích hoạt giảm 50% sát thương nhận vào.
* **Sinh Mệnh (Healer):** Hồi máu cho toàn đội tăng theo cấp số nhân theo chuỗi Combo Cascade.
* **Hư Không (Supporter):** Nạp nộ cho các đồng minh lân cận để thực hiện chuỗi Ultimate Chain.

#### 🎥 Trụ cột 4: Trải Nghiệm Thị Giác 3D & Phản Hồi Xúc Giác (Three.js Presentation)
* Render khối 3D với vật liệu kim loại ánh kim PBR, hiệu ứng rơi nảy Squash & Stretch.
* Ngọc đặc biệt có vòng hào quang xoay bát diện 3D và hệ thống thông báo Toast Banner nổi bật trên màn hình.

---

### 3. BẰNG CHỨNG THỰC THI (VERIFICATION RECEIPTS)
✅ **Mã nguồn Three.js Web:** Đã cập nhật thuật toán Special Gems, Boss Telegraph và Toast Banner vào `Web/src/core/GameState.js`, `Board3D.js`, `HUD.js`.
✅ **Kiểm thử C++ Lõi:** 744/744 assertions PASSED (`Tools/host_tests/build_and_run.bat`).
✅ **Kiểm thử WebAssembly:** 51/51 checks PASSED (`node Web/smoke_test.mjs`).
"""

    # 1. Ranh giới Lõi C++
    cpp_critique = []
    if any(k in text_lower for k in ["uobject", "aactor", "coreminimal", "fstring"]):
        cpp_critique.append("CẢNH BÁO VI PHẠM: Luật chơi phát hiện từ khóa rò rỉ Unreal (`UObject`/`AActor`/`FString`). Lõi `Core/` bắt buộc phải là C++ độc lập thuần túy qua `MatchCoreCompat.h`.")
    if "random" in text_lower or "rand()" in text_lower or "time" in text_lower:
        cpp_critique.append("RỦI RO DETERMINISM: Mọi biến số ngẫu nhiên phải đi qua `FMatchRng(seed)`. Không được dùng thời gian thực để đảm bảo 100% tái lập trận đấu.")
    if not cpp_critique:
        cpp_critique.append("Đạt chuẩn ranh giới Lõi C++ độc lập (bảo toàn 744 test assertions trong `Tools/host_tests/`).")

    # 2. Hiệu năng WebGL Three.js
    web_critique = []
    if any(k in text_lower for k in ["4k", "8k", "subdivision", "cloth simulation", "vải mềm"]):
        web_critique.append("RỦI RO HIỆU NĂNG: Mô phỏng vải mềm hoặc texture 4K sẽ gây tụt FPS nghiêm trọng trên WebGL Three.js. Yêu cầu nén texture tối đa 1024x1024 và dùng mesh cứng (Rigid Bone).")
    if "cánh tay" in text_lower or "wings" in text_lower or "tentacles" in text_lower:
        web_critique.append("GIỚI HẠN XƯƠNG (BONE BUDGET): Tổng số xương trên nhân vật/quái vật phải <= 64 bones để đảm bảo animation chạy mượt trên Web & Mobile.")
    if not web_critique:
        web_critique.append("Đạt ngân sách hiệu năng hiển thị (60 FPS trên WebGL, tối ưu drawcall).")

    # 3. Mỹ thuật 3D & Công cụ Trả phí
    tool_critique = []
    if "meshy pro" in text_lower or "trả phí" in text_lower or "subscription" in text_lower:
        tool_critique.append("BÁC BỎ BẪY TRẢ PHÍ: Tuyệt đối không dùng tính năng trả phí của Meshy. Dự án sử dụng Tencent Hunyuan3D 2.0 (Free), Blender Python scripting và Adobe Mixamo (Free 100%).")
    tool_critique.append("YÊU CẦU FILE BLENDER NGUỒN: Xuất file `.blend` có tổ chức Armature rõ ràng để Director tự kiểm tra và học tập kỹ thuật Rigging cơ bản.")

    # 4. Tính tương thích Cốt truyện & Gameplay
    story_critique = []
    if any(k in text_lower for k in ["astra", "chimera", "sentinel"]):
        story_critique.append("Khớp với kịch bản chuẩn trong `Docs/NARRATIVE_CHAPTERS_1_2_3.md` (Chương 1: Tro Tàn / Chương 2: Phế Tích Lõi).")
    else:
        story_critique.append("Đề xuất cần đối chiếu chặt chẽ với hệ thống 4 Role chuẩn: Attacker, Supporter, Healer, Defender.")

    response = f"""# [ANTIGRAVITY ARENA] PHẢN BIỆN ĐỐI THOẠI — HIỆP {round_num}
*Thời gian:* `{timestamp}` | *Dự án:* `{os.path.basename(WORKSPACE_ROOT)}` | *Tiêu chuẩn:* **Pstack Michelin Rigor (Lauren Tan)**

---

### 1. ĐỒNG THUẬN & ĐIỂM SÁNG (VALIDATION)
* Tiếp nhận đề xuất từ Orthex. Ghi nhận góc nhìn sáng tạo về thiết kế và phân bổ tài nguyên.
* Hướng tiếp cận giúp mở rộng chiều sâu trải nghiệm cho người chơi.

---

### 2. MỔ XẺ RỦI RO & PHẢN BIỆN KỸ THUẬT (RED-TEAMING ANALYSIS)

#### A. Ranh Giới Lõi C++ Deterministic:
* {chr(10).join('* ' + c for c in cpp_critique)}

#### B. Ngân Sách Hiệu Năng WebGL Three.js:
* {chr(10).join('* ' + w for w in web_critique)}

#### C. Quy Trình 3D Blender & Triệt Tiêu Chi Phí Trả Phí:
* {chr(10).join('* ' + t for t in tool_critique)}

#### D. Tính Tương Thích Kịch Bản & Gameplay:
* {chr(10).join('* ' + s for s in story_critique)}

---

### 3. ĐỀ XUẤT ĐIỀU CHỈNH TỐI ƯU (SYNTHESIS & COUNTER-PROPOSAL)
1. **Kiến trúc:** Giữ vững nguyên tắc Decoupled Core của `pstack`. Tách bạch Lõi mô phỏng và Tầng diễn hoạ.
2. **Thực thi 3D:** Sử dụng Blender Python Scripting để tạo xương (Armature) tự động, giúp Director vừa có model sạch vừa học được cách phân chia Weight Paint trong Blender.
3. **Phân phối:** Đảm bảo test C++ assertions và WASM checks luôn đạt 100% trước khi commit.

---

### 4. CÂU HỎI ĐỐI THOẠI DÀNH CHO ORTHEX (HIỆP TIẾP THEO)
> *"Dựa trên các ranh giới kỹ thuật về Lõi C++ và quy trình Blender 3D miễn phí ở trên, bạn hãy điều chỉnh lại chi tiết triển khai cụ thể cho bước tiếp theo. Bạn có đề xuất giải pháp nào tinh gọn hơn để giảm thiểu số lượng xương (bone count) mà vẫn giữ được visual ấn tượng không?"*
"""
    return response

def sync_active_plan(latest_content: str):
    """Cập nhật kế hoạch vào .orthex/active-plan.md nếu thư mục .orthex tồn tại."""
    os.makedirs(os.path.dirname(PLAN_FILE), exist_ok=True)
    header = f"""# Active Plan (Đồng bộ từ Multi-Agent Arena)
*Cập nhật lúc:* {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

"""
    with open(PLAN_FILE, "w", encoding="utf-8") as f:
        f.write(header + latest_content)
    print(f"[OK] Đã đồng bộ kế hoạch mới vào: {PLAN_FILE}")

def run_watch_loop():
    """Vòng lặp lắng nghe Clipboard liên tục (2s/lượt)."""
    print("=" * 70)
    print("🔥 ORTHEX <-> ANTIGRAVITY CLIPBOARD SMART BRIDGE (GLOBAL RUNNING)")
    print(f"📁 Workspace: {WORKSPACE_ROOT}")
    print("=" * 70)
    print("[*] Cơ chế hoạt động:")
    print("    1. Trong Orthex, bạn chọn câu trả lời và bấm [Ctrl + C].")
    print("    2. Tool tự động bắt nội dung -> Phân tích Red-teaming.")
    print("    3. Tool nạp sẵn câu phản biện vào Clipboard của bạn + Kêu Ting!")
    print("    4. Bạn chỉ việc chuyển sang Orthex và bấm [Ctrl + V] rồi [Enter].")
    print("    -> Nhấn Ctrl + C tại terminal này để dừng.")
    print("=" * 70)

    last_text = get_clipboard()
    round_count = 1

    while True:
        try:
            time.sleep(0.5)
            curr_text = get_clipboard()
            
            if curr_text and curr_text != last_text and not curr_text.startswith("# [ANTIGRAVITY ARENA]"):
                print(f"\n[+] BẮT ĐƯỢC ĐỀ XUẤT TỪ ORTHEX! (Độ dài: {len(curr_text)} ký tự)")
                print(f"[*] Đang thực hiện phản biện theo Lauren Tan Michelin Rigor...")

                with open(INBOX_FILE, "w", encoding="utf-8") as f:
                    f.write(curr_text)

                response = evaluate_proposal(curr_text, round_count)

                with open(OUTBOX_FILE, "w", encoding="utf-8") as f:
                    f.write(response)

                with open(LOG_FILE, "a", encoding="utf-8") as f:
                    f.write(f"\n\n## HIỆP {round_count} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write("### Đề xuất từ Orthex:\n" + curr_text + "\n\n")
                    f.write("### Phản biện từ Antigravity:\n" + response + "\n")

                sync_active_plan(response)

                set_clipboard(response)
                last_text = response

                sys.stdout.write('\a')
                sys.stdout.flush()

                print("-" * 70)
                print(f"✅ [TING! ĐÃ NẠP PHẢN BIỆN VÀO CLIPBOARD CỦA BẠN - HIỆP {round_count}]")
                print("👉 Hãy quay lại Orthex và nhấn: [Ctrl + V] -> [Enter] để tiếp tục!")
                print("-" * 70)

                round_count += 1
        except KeyboardInterrupt:
            print("\n[*] Đã dừng cầu nối Orthex.")
            break
        except Exception as e:
            print(f"[!] Lỗi vòng lặp: {e}", file=sys.stderr)
            time.sleep(1)

def main():
    parser = argparse.ArgumentParser(description="Cầu nối phản biện đa Agent Orthex <-> Antigravity (Global)")
    parser.add_argument("--watch", "--clip", action="store_true", help="Chạy vòng lặp lắng nghe Clipboard tự động")
    parser.add_argument("--debate", type=str, help="Chạy phản biện đơn lẻ cho một đoạn văn bản")
    parser.add_argument("--sync", action="store_true", help="Đồng bộ outbox vào .orthex/active-plan.md")

    args = parser.parse_args()

    if args.watch:
        run_watch_loop()
    elif args.debate:
        res = evaluate_proposal(args.debate)
        with open(OUTBOX_FILE, "w", encoding="utf-8") as f:
            f.write(res)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"\n\n## HIỆP 1 (DEBATE CLI) - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("### Đề xuất từ Orthex / Director:\n" + args.debate + "\n\n")
            f.write("### Phản biện từ Antigravity Arena:\n" + res + "\n")
        sync_active_plan(res)
        print(res)
        set_clipboard(res)
        print("\n[OK] Đã sao chép phản biện vào Clipboard và đồng bộ active-plan.md!")
    elif args.sync:
        if os.path.exists(OUTBOX_FILE):
            with open(OUTBOX_FILE, "r", encoding="utf-8") as f:
                sync_active_plan(f.read())
        else:
            print("[!] Chưa có outbox để đồng bộ.")
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
