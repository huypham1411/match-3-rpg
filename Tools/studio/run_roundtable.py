"""
=============================================================================
Tools/studio/run_roundtable.py
Chạy cuộc họp bàn tròn tự động giữa PM, Game Dev, Lore, Art và Antigravity
ngay từ Terminal / PowerShell và lưu biên bản vào Docs/Specs/.
=============================================================================
"""

import sys
import os

# Thêm đường dẫn CloudStudio vào sys.path để tái sử dụng logic
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "CloudStudio")))

from app import run_autonomous_roundtable, DEFAULT_OPENROUTER_KEY

def main():
    topic = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Thiết kế chiêu thức & visual cho Boss Sentinel 07 và cân bằng sát thương màn 1-1"
    print(f"\n=================================================================")
    print(f"🚀 KHỞI ĐỘNG CUỘC HỌP BÀN TRÒN TỰ ĐỘNG VỀ: '{topic}'")
    print(f"=================================================================\n")

    last_out = ""
    for update in run_autonomous_roundtable(topic, rounds=2, api_key=DEFAULT_OPENROUTER_KEY):
        new_text = update[len(last_out):] if update.startswith(last_out) else update
        sys.stdout.write(new_text)
        sys.stdout.flush()
        last_out = update

    print(f"\n\n=================================================================")
    print(f"✅ CUỘC HỌP ĐÃ HOÀN TẤT! Biên bản đã lưu tại Docs/Specs/ROUNDTABLE_LATEST.md")
    print(f"=================================================================\n")

if __name__ == "__main__":
    main()
