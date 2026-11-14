#!/usr/bin/env python3
"""
Tools/pipeline/wait_for_mobile_command.py
===============================================================================
BỘ KÍCH HOẠT ĐÁNH THỨC AI COORDINATOR (COMMAND DISPATCH TRIGGER)
Chờ lệnh mới từ Mobile Web (MOBILE_COMMAND_QUEUE.json).
Ngay khi có lệnh mới, script thoát ngay lập tức (exit 0) để hệ thống
Antigravity tự động kích hoạt phiên làm việc của AI Coordinator!
===============================================================================
"""

import os
import sys
import json
import time

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
QUEUE_FILE = os.path.join(WORKSPACE_ROOT, "Docs", "discussions", "MOBILE_COMMAND_QUEUE.json")

def get_pending_command():
    if not os.path.exists(QUEUE_FILE):
        return None
    try:
        with open(QUEUE_FILE, "r", encoding="utf-8") as f:
            queue = json.load(f)
        for item in queue:
            if item.get("status") in ["PENDING", "DISPATCHED_TO_SWARM"]:
                return item
    except Exception as e:
        pass
    return None

def main():
    timeout = int(sys.argv[1]) if len(sys.argv) > 1 else 600 # 10 phút mặc định
    start_time = time.time()

    # 1. Kiểm tra xem có lệnh nào đang chờ sẵn không
    cmd = get_pending_command()
    if cmd:
        print(f"[NEW_COMMAND_DETECTED] ID #{cmd.get('id')}: {cmd.get('command')}")
        sys.exit(0)

    # 2. Vòng lặp chờ lệnh mới từ điện thoại
    while time.time() - start_time < timeout:
        time.sleep(1)
        cmd = get_pending_command()
        if cmd:
            print(f"[NEW_COMMAND_DETECTED] ID #{cmd.get('id')}: {cmd.get('command')}")
            sys.exit(0)

    print("[WAIT_TIMEOUT] Chưa có lệnh mới trong thời gian chờ.")
    sys.exit(0)

if __name__ == "__main__":
    main()
