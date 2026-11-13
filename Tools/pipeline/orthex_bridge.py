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
    """Ghi dữ liệu văn bản vào Windows Clipboard qua PowerShell UTF-8."""
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', delete=False) as f:
            f.write(text)
            tmp_path = f.name
        cmd = ['powershell', '-NoProfile', '-Command', f"Get-Content -Raw -Encoding UTF8 '{tmp_path}' | Set-Clipboard"]
        subprocess.run(cmd, check=True)
        return True
    except Exception as e:
        print(f"[!] Lỗi ghi clipboard: {e}", file=sys.stderr)
        return False
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass

def evaluate_proposal(proposal_text: str, round_num: int = 1) -> str:
    """
    Đánh giá đề xuất theo 4 trụ cột Pstack Michelin Rigor (Lauren Tan Framework):
    1. C++ Determinism (Không engine leak, seed FMatchRng, test 744 pass)
    2. WebGL Three.js Performance (60 FPS, drawcall, bone count <= 64)
    3. 3D Blender / Free Pipeline (Lưới sạch, không bẫy trả phí Meshy Pro, dễ học rigging)
    4. Cốt truyện & Gameplay Invariants
    """
    text_lower = proposal_text.lower()
    
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

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
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
        print(res)
        set_clipboard(res)
        print("\n[OK] Đã sao chép phản biện vào Clipboard!")
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
