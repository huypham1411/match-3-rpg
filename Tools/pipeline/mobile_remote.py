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
import mimetypes
import subprocess
import urllib.parse
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

HTML_PAGE = """<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>RE:FRAY — Director Mobile Command</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0a0c14; color: #f1f5f9; padding: 14px; padding-bottom: 90px; }
        
        .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #1e293b; margin-bottom: 14px; }
        .header-title { font-size: 16px; font-weight: 800; color: #00f0ff; letter-spacing: 0.5px; }
        .status-badge { background: #064e3b; color: #34d399; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px; display: flex; align-items: center; gap: 5px; }
        .pulse-dot { width: 7px; height: 7px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; }

        .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .btn-action { background: #1e293b; border: 1px solid #334155; color: #f8fafc; padding: 12px; border-radius: 8px; font-size: 12px; font-weight: 700; text-align: center; cursor: pointer; transition: all 0.15s; }
        .btn-action:active { transform: scale(0.97); background: #334155; }
        .btn-primary { border-color: #00f0ff; color: #00f0ff; background: rgba(0, 240, 255, 0.08); }
        .btn-warning { border-color: #f59e0b; color: #f59e0b; background: rgba(245, 158, 11, 0.08); }

        .command-card { background: #111827; border: 1px solid #374151; border-radius: 10px; padding: 14px; margin-bottom: 18px; }
        .card-title { font-size: 13px; font-weight: 700; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        textarea { width: 100%; height: 80px; background: #1f2937; border: 1px solid #4b5563; border-radius: 6px; color: #fff; padding: 10px; font-size: 14px; margin-bottom: 10px; resize: none; }
        .btn-submit { width: 100%; background: #00f0ff; color: #000; border: none; padding: 12px; border-radius: 6px; font-weight: 800; font-size: 14px; cursor: pointer; }

        .log-section { margin-top: 14px; }
        .log-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .log-badge-top { font-size: 11px; background: rgba(0,240,255,0.15); color: #00f0ff; border: 1px solid rgba(0,240,255,0.3); padding: 2px 8px; border-radius: 12px; font-weight: 700; }
        
        /* STREAM TIMELINE UI */
        .chat-stream { display: flex; flex-direction: column; gap: 14px; }
        .cycle-card { background: #111827; border: 1px solid #1e293b; border-radius: 10px; padding: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
        .cycle-card.latest { border-color: #00f0ff; box-shadow: 0 0 20px rgba(0,240,255,0.25); background: #111a2e; }
        
        .cycle-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .cycle-title { font-size: 13px; font-weight: 800; color: #00f0ff; }
        .cycle-commit { font-size: 11px; background: #1e293b; color: #94a3b8; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        
        .bot-msg { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; background: #0f172a; border: 1px solid #1e293b; border-left: 3px solid #3b82f6; border-radius: 6px; padding: 10px 12px; }
        .bot-msg.orthex { border-left-color: #a855f7; }
        .bot-msg.coordinator { border-left-color: #00f0ff; }
        .bot-msg.qc { border-left-color: #10b981; }
        .bot-msg.dev { border-left-color: #3b82f6; }
        .bot-msg.architect { border-left-color: #f59e0b; }
        .bot-msg.producer { border-left-color: #ec4899; }
        .bot-msg.uiux { border-left-color: #06b6d4; }
        .bot-msg.designer { border-left-color: #8b5cf6; }

        .bot-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .bot-tag { font-size: 12px; font-weight: 800; }
        .bot-tag.orthex { color: #c084fc; }
        .bot-tag.coordinator { color: #00f0ff; }
        .bot-tag.qc { color: #34d399; }
        .bot-tag.dev { color: #60a5fa; }
        .bot-tag.architect { color: #fbbf24; }
        .bot-tag.producer { color: #f472b6; }
        .bot-tag.uiux { color: #22d3ee; }
        .bot-tag.designer { color: #a78bfa; }

        .bot-timestamp { font-size: 11px; color: #94a3b8; font-family: monospace; background: #1e293b; padding: 2px 6px; border-radius: 4px; }
        .bot-text { font-size: 13px; line-height: 1.5; color: #cbd5e1; white-space: pre-wrap; word-break: break-word; }

        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 99; justify-content: center; align-items: center; padding: 20px; }
        .modal-content { background: #111827; border: 1px solid #00f0ff; border-radius: 10px; padding: 16px; width: 100%; max-height: 80vh; overflow-y: auto; }
        .btn-close { background: #374151; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; float: right; font-weight: 700; margin-bottom: 10px; cursor: pointer; }
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
        <button class="btn-action btn-warning" onclick="runTests()">🧪 Chạy Test C++ & Phase 3</button>
        <button class="btn-action" onclick="fetchLog()">🔄 Cập Nhật Nhật Ký</button>
        <button class="btn-action" onclick="window.open('/game', '_blank')">🎲 Mở Bản Web Three.js</button>
    </div>

    <!-- KHUNG RA LỆNH TỪ XA -->
    <div class="command-card">
        <div class="card-title">📡 RA LỆNH CHO ĐỘI NGŨ BOT & ORTHEX</div>
        <textarea id="commandText" placeholder="Nhập chỉ thị của bạn (VD: Kiểm tra tính năng Gacha Phase 4, rà soát Stagger Break)..."></textarea>
        <button class="btn-submit" id="btnSend" onclick="sendCommand()">GỬI CHỈ THỊ (EXECUTE)</button>
    </div>

    <!-- NHẬT KÝ THẢO LUẬN TRỰC TIẾP (MỚI NHẤT TRÊN CÙNG) -->
    <div class="log-section">
        <div class="log-header-bar">
            <div class="card-title" style="margin-bottom:0;">📜 ĐỐI THOẠI BOT & HÓA ĐƠN THỰC THI</div>
            <span class="log-badge-top">⚡ MỚI NHẤT TRÊN CÙNG</span>
        </div>
        <div class="chat-stream" id="logStream">
            <div style="color:#64748b; text-align:center; padding:20px;">Đang tải dữ liệu từ máy tính...</div>
        </div>
    </div>

    <!-- MODAL HIỂN THỊ KẾT QUẢ -->
    <div class="modal" id="resultModal">
        <div class="modal-content">
            <button class="btn-close" onclick="closeModal()">ĐÓNG</button>
            <h3 style="color:#00f0ff; margin-bottom: 10px;" id="modalTitle">KẾT QUẢ THỰC THI</h3>
            <pre id="modalBody" style="font-size: 11px; white-space: pre-wrap; font-family: monospace;"></pre>
        </div>
    </div>

    <script>
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        function renderLogStream(rawLog) {
            const container = document.getElementById('logStream');
            if (!rawLog || !rawLog.trim()) {
                container.innerHTML = '<div style="color:#64748b; text-align:center; padding:20px;">Chưa có dữ liệu thảo luận.</div>';
                return;
            }

            // Tách theo chu kỳ
            const rawCycles = rawLog.split(/---\\s*\\n##\\s*\\[CHU KỲ/i);
            const parsedCycles = [];

            for (let i = 0; i < rawCycles.length; i++) {
                const chunk = rawCycles[i].trim();
                if (!chunk) continue;
                const fullChunk = (i > 0 ? '## [CHU KỲ ' : '') + chunk;
                parsedCycles.push(fullChunk);
            }

            // ĐẢO NGƯỢC: CHU KỲ MỚI NHẤT LÊN ĐẦU TIÊN
            parsedCycles.reverse();

            let html = '';
            const displayCycles = parsedCycles.slice(0, 8); // Giữ 8 chu kỳ gần nhất

            displayCycles.forEach((cycleText, idx) => {
                const isLatest = idx === 0;

                const headerMatch = cycleText.match(/##\\s*\\[CHU KỲ THỰC THI\\s*#?(\\d+)\\]\\s*—\\s*([^\\n]+)/i);
                const cycleNum = headerMatch ? headerMatch[1] : (displayCycles.length - idx);
                const cycleTime = headerMatch ? headerMatch[2] : '';

                const commitMatch = cycleText.match(/\\*Commit:\\*\\s*`([^`]+)`/i);
                const commitHash = commitMatch ? commitMatch[1] : '';

                const topicMatch = cycleText.match(/\\*Chủ đề:\\*\\s*\\*\\*([^\\*]+)\\*\\*/i);
                const topic = topicMatch ? topicMatch[1] : '';

                html += `
                    <div class="cycle-card ${isLatest ? 'latest' : ''}">
                        <div class="cycle-header">
                            <div class="cycle-title">
                                ${isLatest ? '⚡ [MỚI NHẤT] ' : ''}CHU KỲ #${cycleNum} ${cycleTime ? '• ' + cycleTime : ''}
                            </div>
                            ${commitHash ? `<span class="cycle-commit">${commitHash}</span>` : ''}
                        </div>
                        ${topic ? `<div style="font-size:11px; color:#fbbf24; font-weight:700; margin-bottom:10px;">🎯 ${escapeHtml(topic)}</div>` : ''}
                        <div class="cycle-dialogues">
                `;

                // Parse từng lượt nói của Bot kèm Timestamp
                const botRegex = /-\\s*`\\[?([0-9:]+)\\]?`\\s*\\*\\*@([a-zA-Z0-9_]+)\\s*\\(([^)]+)\\):\\*\\*\\s*(?:>\\s*"|>\\s*|")(.*?)(?="?\\n\\s*-|"?[ \\t]*\\n\\s*##|$)/gis;
                let match;
                let count = 0;

                while ((match = botRegex.exec(cycleText)) !== null) {
                    count++;
                    const timeStr = match[1];
                    const botName = match[2];
                    const botRole = match[3];
                    let msg = match[4].trim();
                    msg = msg.replace(/^>\\s*/gm, '').replace(/^"|"$/g, '').trim();

                    let botClass = 'coordinator';
                    let icon = '👑';
                    if (botName.includes('orthex')) { botClass = 'orthex'; icon = '🟣'; }
                    else if (botName.includes('qc')) { botClass = 'qc'; icon = '🧪'; }
                    else if (botName.includes('web') || botName.includes('dev')) { botClass = 'dev'; icon = '💻'; }
                    else if (botName.includes('architect')) { botClass = 'architect'; icon = '🏛️'; }
                    else if (botName.includes('producer')) { botClass = 'producer'; icon = '📋'; }
                    else if (botName.includes('uiux')) { botClass = 'uiux'; icon = '🎨'; }
                    else if (botName.includes('game') || botName.includes('designer')) { botClass = 'designer'; icon = '🎲'; }

                    html += `
                        <div class="bot-msg ${botClass}">
                            <div class="bot-meta">
                                <span class="bot-tag ${botClass}">${icon} @${botName} <small style="color:#94a3b8; font-weight:400;">(${botRole})</small></span>
                                <span class="bot-timestamp">⏱️ ${timeStr}</span>
                            </div>
                            <div class="bot-text">${escapeHtml(msg)}</div>
                        </div>
                    `;
                }

                if (count === 0) {
                    html += `<div class="bot-text" style="font-size:12px; color:#94a3b8;">${escapeHtml(cycleText)}</div>`;
                }

                html += `
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        }

        async function fetchLog() {
            try {
                const res = await fetch('/api/log');
                const data = await res.json();
                renderLogStream(data.log);
            } catch (e) {
                document.getElementById('logStream').innerHTML = '<div style="color:#ef4444; padding:20px;">Lỗi kết nối máy tính: ' + e + '</div>';
            }
        }

        async function sendCommand() {
            const txt = document.getElementById('commandText').value.trim();
            if (!txt) return;

            const btn = document.getElementById('btnSend');
            btn.textContent = '⏳ ĐANG PHẢN BIỆN...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: txt })
                });
                const data = await res.json();
                document.getElementById('commandText').value = '';
                showModal('PHẢN BIỆN TỪ ĐỘI NGŨ BOT', data.response);
                fetchLog();
            } catch (e) {
                alert('Lỗi: ' + e);
            } finally {
                btn.textContent = 'GỬI CHỈ THỊ (EXECUTE)';
                btn.disabled = false;
            }
        }

        async function triggerCycle() {
            try {
                const res = await fetch('/api/trigger-cycle', { method: 'POST' });
                const data = await res.json();
                showModal('CHU KỲ MỚI HOÀN TẤT', data.message);
                fetchLog();
            } catch (e) {
                alert('Lỗi: ' + e);
            }
        }

        async function runTests() {
            showModal('ĐANG CHẠY TEST...', 'Đang biên dịch và kiểm thử 744 assertions C++, 51 WASM và 16 Phase 3 checks...');
            try {
                const res = await fetch('/api/run-tests', { method: 'POST' });
                const data = await res.json();
                showModal('BẰNG CHỨNG THỰC THI (RECEIPTS)', data.output);
            } catch (e) {
                showModal('LỖI KIỂM THỬ', e.toString());
            }
        }

        function showModal(title, text) {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalBody').textContent = text;
            document.getElementById('resultModal').style.display = 'flex';
        }

        function closeModal() {
            document.getElementById('resultModal').style.display = 'none';
        }

        // Tự động làm mới log mỗi 5 giây
        setInterval(fetchLog, 5000);
        fetchLog();
    </script>
</body>
</html>
"""

class RemoteHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        req_path = parsed_url.path

        if req_path in ["/", "/index.html"]:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))
            return

        elif req_path == "/api/log":
            content = "Chưa có log."
            if os.path.exists(SWARM_LOG_FILE):
                with open(SWARM_LOG_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps({"log": content}).encode("utf-8"))
            return

        elif req_path in ["/game", "/game/", "/game/index.html"]:
            web_path = os.path.join(WORKSPACE_ROOT, "Web", "index.html")
            if os.path.exists(web_path):
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                with open(web_path, "rb") as f:
                    self.wfile.write(f.read())
                return
            else:
                self.send_response(404)
                self.end_headers()
                return

        # Phục vụ các file tĩnh trong Web/ (css, src, vendor, etc.)
        rel_path = req_path
        if rel_path.startswith("/game/"):
            rel_path = rel_path[len("/game/"):]
        else:
            rel_path = rel_path.lstrip("/")

        full_path = os.path.normpath(os.path.join(WORKSPACE_ROOT, "Web", rel_path))
        web_root = os.path.normpath(os.path.join(WORKSPACE_ROOT, "Web"))

        if full_path.startswith(web_root) and os.path.isfile(full_path):
            self.send_response(200)
            mime, _ = mimetypes.guess_type(full_path)
            if full_path.endswith(".js") or full_path.endswith(".mjs"):
                mime = "application/javascript; charset=utf-8"
            elif full_path.endswith(".css"):
                mime = "text/css; charset=utf-8"
            elif full_path.endswith(".wasm"):
                mime = "application/wasm"
            elif not mime:
                mime = "application/octet-stream"

            self.send_header("Content-Type", mime)
            self.send_header("Cache-Control", "no-cache")
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

            # 1. Gọi Orthex Bridge debate
            bridge_script = os.path.join(WORKSPACE_ROOT, "Tools", "pipeline", "orthex_bridge.py")
            cmd = ["py", "-3", bridge_script, "--debate", cmd_text]
            res = subprocess.run(cmd, cwd=WORKSPACE_ROOT, capture_output=True, text=True)

            # 2. Kích hoạt Swarm Engine ghi nhận chỉ thị và phân công hành động
            swarm_script = os.path.join(WORKSPACE_ROOT, "Tools", "pipeline", "real_swarm_engine.py")
            subprocess.run(["py", "-3", swarm_script, "--once"], cwd=WORKSPACE_ROOT, capture_output=True, text=True)

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"response": res.stdout}).encode("utf-8"))

        elif self.path == "/api/trigger-cycle":
            daemon_script = os.path.join(WORKSPACE_ROOT, "Tools", "pipeline", "real_swarm_engine.py")
            res = subprocess.run(["py", "-3", daemon_script, "--once"], cwd=WORKSPACE_ROOT, capture_output=True, text=True)

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"message": res.stdout}).encode("utf-8"))

        elif self.path == "/api/run-tests":
            test_bat = os.path.join(WORKSPACE_ROOT, "Tools", "host_tests", "build_and_run.bat")
            res_c = subprocess.run([test_bat], cwd=WORKSPACE_ROOT, capture_output=True, text=True)
            res_wasm = subprocess.run(["node", "Web/smoke_test.mjs"], cwd=WORKSPACE_ROOT, capture_output=True, text=True)
            res_p3 = subprocess.run(["node", "Web/test_phase3.mjs"], cwd=WORKSPACE_ROOT, capture_output=True, text=True)

            output = f"=== TEST PHASE 3 WEB (16 CHECKS) ===\n{res_p3.stdout}\n\n=== TEST C++ CORE (744 ASSERTIONS) ===\n{res_c.stdout}\n\n=== TEST WASM (51 CHECKS) ===\n{res_wasm.stdout}"

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
