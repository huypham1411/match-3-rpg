#!/usr/bin/env python3
"""
Tools/pipeline/start_public_tunnel.py
===============================================================================
MỞ CỔNG KẾT NỐI TOÀN CẦU CHO ĐIỆN THOẠI QUA CLOUDFLARE TUNNEL (MIỄN PHÍ 100%)
Cho phép điện thoại dùng 4G / 5G ở bất kỳ đâu trên thế giới truy cập trực tiếp
vào Mobile Remote Command Center (port 5050) mà KHÔNG CẦN CHUNG WI-FI!

Kết quả:
  - Sinh đường dẫn HTTPS an toàn: https://<random>.trycloudflare.com
  - Tự động lưu vào Docs/discussions/PUBLIC_MOBILE_URL.txt
  - Tự động copy vào Clipboard của máy tính
===============================================================================
"""

import os
import sys
import re
import time
import ctypes
import subprocess

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CLOUDFLARED_BIN = os.path.join(WORKSPACE_ROOT, "Tools", "bin", "cloudflared.exe")
URL_FILE = os.path.join(WORKSPACE_ROOT, "Docs", "discussions", "PUBLIC_MOBILE_URL.txt")

# [WINDOWS KEEP-AWAKE]
ES_CONTINUOUS = 0x80000000
ES_SYSTEM_REQUIRED = 0x00000001
try:
    ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
except Exception:
    pass

def set_clipboard(text: str):
    try:
        cmd = ['powershell', '-NoProfile', '-Command', f"Set-Clipboard -Value '{text}'"]
        subprocess.run(cmd, check=True)
    except Exception:
        pass

def main():
    if not os.path.exists(CLOUDFLARED_BIN):
        print(f"[!] Không tìm thấy {CLOUDFLARED_BIN}!", file=sys.stderr)
        sys.exit(1)

    print("=" * 70)
    print("🌐 ĐANG KHỞI TẠO ĐƯỜNG TRUYỀN TOÀN CẦU CLOUDFLARE CHO ĐIỆN THOẠI...")
    print("=" * 70)

    p = subprocess.Popen(
        [CLOUDFLARED_BIN, "tunnel", "--url", "http://127.0.0.1:5050"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace"
    )

    tunnel_url = None
    start = time.time()

    while time.time() - start < 25:
        line = p.stderr.readline()
        if not line:
            continue
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match:
            tunnel_url = match.group(0)
            break

    if not tunnel_url:
        print("[!] Không thể lấy URL từ Cloudflare Tunnel sau 25s.")
        p.terminate()
        sys.exit(1)

    # Ghi URL ra file để các tool khác và User đọc
    os.makedirs(os.path.dirname(URL_FILE), exist_ok=True)
    with open(URL_FILE, "w", encoding="utf-8") as f:
        f.write(tunnel_url + "\n")

    set_clipboard(tunnel_url)

    print("\n" + "#" * 70)
    print("🎉 ĐƯỜNG TRUYỀN DI ĐỘNG ĐÃ SẴN SÀNG (DÙNG ĐƯỢC 4G / 5G / MỌI MẠNG)!")
    print("#" * 70)
    print(f"\n👉 LINK MỞ TRÊN ĐIỆN THOẠI CỦA BẠN:")
    print(f"   {tunnel_url}")
    print("\n[+] Đã tự động sao chép link này vào Clipboard của bạn!")
    print(f"[+] Đã lưu tại: {URL_FILE}")
    print("#" * 70 + "\n")
    print("[*] Đang duy trì kết nối cho điện thoại của bạn... (Bấm Ctrl+C để dừng)")

    try:
        p.wait()
    except KeyboardInterrupt:
        print("\n[*] Đang đóng đường truyền Cloudflare Tunnel...")
        p.terminate()

if __name__ == "__main__":
    main()
