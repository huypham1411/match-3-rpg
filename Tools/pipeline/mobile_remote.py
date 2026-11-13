#!/usr/bin/env python3
"""
Tools/pipeline/mobile_remote.py
===============================================================================
BẢNG ĐIỀU KHIỂN TỪ XA TRÊN ĐIỆN THOẠI CHO DIRECTOR (MOBILE REMOTE COMMAND CENTER)
Cho phép bạn dùng điện thoại (iPhone / Android) để:
  1. Ra lệnh trực tiếp cho đội ngũ Bot & Orthex từ xa.
  2. Xem luồng thảo luận thời gian thực (Live Swarm Feed).
  3. Kích hoạt chạy bài test C++ và kiểm tra hóa đơn (Receipts).
  4. Mở chơi thử ngay bản Web Three.js trên màn hình cảm ứng điện thoại!

Cách dùng:
  py -3 Tools/pipeline/mobile_remote.py
  (Mở điện thoại quét mã hoặc vào http://<IP>:5050)
===============================================================================
"""

import os
import sys
import json
import time
import socket
import ctypes
import subprocess
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler

# [WINDOWS KEEP-AWAKE]: Giữ kết nối mạng và CPU chạy xuyên đêm để nhận lệnh từ điện thoại
ES_CONTINUOUS = 0x80000000
ES_SYSTEM_REQUIRED = 0x00000001
try:
    ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
except Exception:
    pass

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DISCUSSIONS_DIR = os.path.join(WORKSPACE_ROOT, "Docs", "discussions")
SWARM_LOG_FILE = os.path.join(DISCUSSIONS_DIR, "AUTONOMOUS_SWARM_LOG.md")
ACTIVE_PLAN_FILE = os.path.join(WORKSPACE_ROOT, ".orthex", "active-plan.md")
PORT = 5050

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

LOCAL_IP = get_local_ip()

HTML_PAGE = f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>RE:FRAY — Director Mobile Command</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
        body {{ background: #0a0c14; color: #f1f5f9; padding: 14px; padding-bottom: 90px; }}
        
        .header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #1e293b; margin-bottom: 14px; }}
        .header-title {{ font-size: 16px; font-weight: 800; color: #00f0ff; letter-spacing: 0.5px; }}
        .status-badge {{ background: #064e3b; color: #34d399; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px; display: flex; align-items: center; gap: 5px; }}
        .pulse-dot {{ width: 7px; height: 7px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; }}

        .action-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }}
        .btn-action {{ background: #1e293b; border: 1px solid #334155; color: #f8fafc; padding: 12px; border-radius: 8px; font-size: 12px; font-weight: 700; text-align: center; cursor: pointer; transition: all 0.15s; }}
        .btn-action:active {{ transform: scale(0.97); background: #334155; }}
        .btn-primary {{ border-color: #00f0ff; color: #00f0ff; background: rgba(0, 240, 255, 0.08); }}
        .btn-warning {{ border-color: #f59e0b; color: #f59e0b; background: rgba(245, 158, 11, 0.08); }}

        .command-card {{ background: #111827; border: 1px solid #374151; border-radius: 10px; padding: 14px; margin-bottom: 18px; }}
        .card-title {{ font-size: 13px; font-weight: 700; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }}
        textarea {{ width: 100%; height: 80px; background: #1f2937; border: 1px solid #4b5563; border-radius: 6px; color: #fff; padding: 10px; font-size: 14px; margin-bottom: 10px; resize: none; }}
        .btn-submit {{ width: 100%; background: #00f0ff; color: #000; border: none; padding: 12px; border-radius: 6px; font-weight: 800; font-size: 14px; cursor: pointer; }}

        .log-section {{ margin-top: 14px; }}
        .log-container {{ background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; max-height: 480px; overflow-y: auto; font-size: 12px; line-height: 1.5; color: #cbd5e1; white-space: pre-wrap; font-family: monospace; }}

        .modal {{ display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 99; justify-content: center; align-items: center; padding: 20px; }}
        .modal-content {{ background: #111827; border: 1px solid #00f0ff; border-radius: 10px; padding: 16px; width: 100%; max-height: 80vh; overflow-y: auto; }}
        .btn-close {{ background: #374151; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; float: right; font-weight: 700; margin-bottom: 10px; }}
    </style>
</head>
<body>
    <div class="header">
        <div class="header-title">🎮 RE:FRAY DIRECTOR</div>
        <div class="status-badge"><div class="pulse-dot"></div> 24/7 ONLINE</div>
    </div>

    <!-- CÁC NÚT ĐIỀU KHIỂN NHANH -->
    <div class="action-grid">
        <button class="btn-action btn-primary" onclick="triggerCycle()">▶ Chạy Chu Kỳ Swarm</button>
        <button class="btn-action btn-warning" onclick="runTests()">🧪 Chạy Test C++ (744)</button>
        <button class="btn-action" onclick="refreshLog()">🔄 Cập Nhật Nhật Ký</button>
        <button class="btn-action" onclick="window.open('/game', '_blank')">🎲 Mở Bản Web Three.js</button>
    </div>

    <!-- KHUNG RA LỆNH TỪ XA -->
    <div class="command-card">
        <div class="card-title">📡 RA LỆNH CHO ĐỘI NGŨ BOT & ORTHEX</div>
        <textarea id="commandText" placeholder="Nhập chỉ thị của bạn (VD: Hãy thiết kế thêm quái bay cho ải 1-2, kiểm tra test C++)..."></textarea>
        <button class="btn-submit" id="btnSend" onclick="sendCommand()">GỬI CHỈ THỊ (EXECUTE)</button>
    </div>

    <!-- NHẬT KÝ THẢO LUẬN TRỰC TIẾP -->
    <div class="log-section">
        <div class="card-title">📜 NHẬT KÝ THẢO LUẬN LIVE (AUTONOMOUS SWARM)</div>
        <div class="log-container" id="logContent">Đang tải nhật ký từ máy tính...</div>
    </div>

    <!-- MODAL HIỂN THỊ KẾT QUẢ TEST -->
    <div class="modal" id="resultModal">
        <div class="modal-content">
            <button class="btn-close" onclick="closeModal()">ĐÓNG</button>
            <h3 style="color:#00f0ff; margin-bottom: 10px;" id="modalTitle">KẾT QUẢ THỰC THI</h3>
            <pre id="modalBody" style="font-size: 11px; white-space: pre-wrap; font-family: monospace;"></pre>
        </div>
    </div>

    <script>
        async function fetchLog() {{
            try {{
                const res = await fetch('/api/log');
                const data = await res.json();
                document.getElementById('logContent').textContent = data.log || 'Chưa có nhật ký.';
            }} catch (e) {{
                document.getElementById('logContent').textContent = 'Lỗi kết nối máy tính: ' + e;
            }}
        }}

        async function sendCommand() {{
            const txt = document.getElementById('commandText').value.trim();
            if (!txt) return;

            const btn = document.getElementById('btnSend');
            btn.textContent = '⏳ ĐANG PHẢN BIỆN...';
            btn.disabled = true;

            try {{
                const res = await fetch('/api/command', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ command: txt }})
                }});
                const data = await res.json();
                document.getElementById('commandText').value = '';
                showModal('PHẢN BIỆN TỪ ĐỘI NGŨ BOT', data.response);
                fetchLog();
            }} catch (e) {{
                alert('Lỗi: ' + e);
            }} finally {{
                btn.textContent = 'GỬI CHỈ THỊ (EXECUTE)';
                btn.disabled = false;
            }}
        }}

        async function triggerCycle() {{
            try {{
                const res = await fetch('/api/trigger-cycle', {{ method: 'POST' }});
                const data = await res.json();
                showModal('CHU KỲ MỚI HOÀN TẤT', data.message);
                fetchLog();
            }} catch (e) {{
                alert('Lỗi: ' + e);
            }}
        }}

        async function runTests() {{
            showModal('ĐANG CHẠY TEST...', 'Đang biên dịch và kiểm thử 744 assertions C++ trên máy tính...');
            try {{
                const res = await fetch('/api/run-tests', {{ method: 'POST' }});
                const data = await res.json();
                showModal('BẰNG CHỨNG THỰC THI (RECEIPTS)', data.output);
            }} catch (e) {{
                showModal('LỖI KIỂM THỬ', e.toString());
            }}
        }}

        function refreshLog() {{
            fetchLog();
        }}

        function showModal(title, text) {{
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalBody').textContent = text;
            document.getElementById('resultModal').style.display = 'flex';
        }}

        function closeModal() {{
            document.getElementById('resultModal').style.display = 'none';
        }}

        // Tự động làm mới log mỗi 5 giây
        setInterval(fetchLog, 5000);
        fetchLog();
    </script>
</body>
</html>
"""

class RemoteHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))
        elif self.path == "/api/log":
            content = "Chưa có log."
            if os.path.exists(SWARM_LOG_FILE):
                with open(SWARM_LOG_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"log": content}).encode("utf-8"))
        elif self.path.startswith("/game"):
            # Chuyển hướng hoặc mở Web Three.js
            web_path = os.path.join(WORKSPACE_ROOT, "Web", "index.html")
            if os.path.exists(web_path):
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                with open(web_path, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.send_response(404)
                self.end_headers()
        else:
            # Phục vụ các file tĩnh trong Web/ (css, src)
            clean_path = self.path.lstrip("/")
            full_path = os.path.join(WORKSPACE_ROOT, "Web", clean_path)
            if os.path.exists(full_path) and os.path.isfile(full_path):
                self.send_response(200)
                if full_path.endswith(".css"):
                    self.send_header("Content-Type", "text/css")
                elif full_path.endswith(".js"):
                    self.send_header("Content-Type", "application/javascript")
                self.end_headers()
                with open(full_path, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.send_response(404)
                self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length > 0 else ""

        if self.path == "/api/command":
            data = json.loads(body) if body else {}
            cmd_text = data.get("command", "")

            # Gọi Orthex Bridge debate
            bridge_script = os.path.join(WORKSPACE_ROOT, "Tools", "pipeline", "orthex_bridge.py")
            cmd = ["py", "-3", bridge_script, "--debate", cmd_text]
            res = subprocess.run(cmd, cwd=WORKSPACE_ROOT, capture_output=True, text=True)

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"response": res.stdout}).encode("utf-8"))

        elif self.path == "/api/trigger-cycle":
            daemon_script = os.path.join(WORKSPACE_ROOT, "Tools", "pipeline", "swarm_daemon.py")
            res = subprocess.run(["py", "-3", daemon_script, "--cycles", "1"], cwd=WORKSPACE_ROOT, capture_output=True, text=True)

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"message": res.stdout}).encode("utf-8"))

        elif self.path == "/api/run-tests":
            test_bat = os.path.join(WORKSPACE_ROOT, "Tools", "host_tests", "build_and_run.bat")
            res_c = subprocess.run([test_bat], cwd=WORKSPACE_ROOT, capture_output=True, text=True)
            res_wasm = subprocess.run(["node", "Web/smoke_test.mjs"], cwd=WORKSPACE_ROOT, capture_output=True, text=True)

            output = f"=== TEST C++ CORE (744 ASSERTIONS) ===\n{res_c.stdout}\n\n=== TEST WASM (51 CHECKS) ===\n{res_wasm.stdout}"

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"output": output}).encode("utf-8"))

def main():
    server = HTTPServer(("0.0.0.0", PORT), RemoteHandler)
    print("=" * 70)
    print("📱 RE:FRAY MOBILE REMOTE COMMAND CENTER (RUNNING)")
    print("=" * 70)
    print(f"👉 TRÊN MÁY TÍNH : http://localhost:{PORT}")
    print(f"👉 TRÊN ĐIỆN THOẠI: http://{LOCAL_IP}:{PORT}")
    print("=" * 70)
    print("[*] Hãy mở trình duyệt trên điện thoại (cùng mạng Wi-Fi) và nhập:")
    print(f"    http://{LOCAL_IP}:{PORT}")
    print("[*] Bạn có thể ra lệnh, xem log thảo luận và chạy test ngay trên điện thoại!")
    print("=" * 70)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Đã dừng Mobile Server.")

if __name__ == "__main__":
    main()
