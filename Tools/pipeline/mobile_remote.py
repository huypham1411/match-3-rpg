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
import re
import html
import json
import time
import gzip
import socket
import ctypes
import mimetypes
import subprocess
import urllib.parse
from datetime import datetime
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

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

def get_phase_timelines(now=None):
    if now is None:
        now = datetime.now()

    p1_start = datetime.strptime("2026-11-11 20:48:26", "%Y-%m-%d %H:%M:%S")
    p1_end   = datetime.strptime("2026-11-12 11:24:12", "%Y-%m-%d %H:%M:%S")

    p2_start = datetime.strptime("2026-11-12 12:07:08", "%Y-%m-%d %H:%M:%S")
    p2_end   = datetime.strptime("2026-11-13 16:06:17", "%Y-%m-%d %H:%M:%S")

    p3_start = datetime.strptime("2026-11-13 16:06:17", "%Y-%m-%d %H:%M:%S")
    p3_end   = datetime.strptime("2026-11-14 10:34:56", "%Y-%m-%d %H:%M:%S")

    p4_start = datetime.strptime("2026-11-14 10:34:56", "%Y-%m-%d %H:%M:%S")

    def calc_dur(t_start, t_end):
        diff = t_end - t_start
        total_seconds = max(0, int(diff.total_seconds()))
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        dec_hours = total_seconds / 3600.0
        return f"{hours}h {minutes:02d}m ({dec_hours:.1f}h)", dec_hours

    dur_p1_str, dur_p1_val = calc_dur(p1_start, p1_end)
    dur_p2_str, dur_p2_val = calc_dur(p2_start, p2_end)
    dur_p3_str, dur_p3_val = calc_dur(p3_start, p3_end)
    dur_p4_str, dur_p4_val = calc_dur(p4_start, now)

    total_hours_val = dur_p1_val + dur_p2_val + dur_p3_val + dur_p4_val
    total_hours_str = f"{total_hours_val:.1f}h"

    phases = [
        {
            "id": 1,
            "name": "Phase 1: Game Feel & Block Animation",
            "desc": "Cơ chế khớp ngọc, Easing, Squash & Stretch, 744 C++ Assertions",
            "start": p1_start.strftime("%Y-%m-%d %H:%M:%S"),
            "end": p1_end.strftime("%Y-%m-%d %H:%M:%S"),
            "duration": dur_p1_str,
            "status": "✅ ĐÃ NGHIỆM THU",
            "is_active": False
        },
        {
            "id": 2,
            "name": "Phase 2: Narrative & Creative Direction",
            "desc": "Kịch bản 3 Chương, Level Layouts, Concept Sheets, Astra 3D",
            "start": p2_start.strftime("%Y-%m-%d %H:%M:%S"),
            "end": p2_end.strftime("%Y-%m-%d %H:%M:%S"),
            "duration": dur_p2_str,
            "status": "✅ ĐÃ NGHIỆM THU",
            "is_active": False
        },
        {
            "id": 3,
            "name": "Phase 3: 3-Stage Vertical Slice & Mobile UX",
            "desc": "3 Màn Boss, 4 Vật cản, Khóa xoay Camera, Thumb Zone Dock",
            "start": p3_start.strftime("%Y-%m-%d %H:%M:%S"),
            "end": p3_end.strftime("%Y-%m-%d %H:%M:%S"),
            "duration": dur_p3_str,
            "status": "✅ ĐÃ NGHIỆM THU",
            "is_active": False
        },
        {
            "id": 4,
            "name": "Phase 4: Metagame, Roster & Gacha System",
            "desc": "FGachaCore Deterministic, Roster 6 nhân vật, Hard Pity 90 nháy",
            "start": p4_start.strftime("%Y-%m-%d %H:%M:%S"),
            "end": "Đang chạy...",
            "duration": f"⏱️ {dur_p4_str}",
            "status": "🔄 ĐANG THỰC HIỆN",
            "is_active": True
        },
        {
            "id": 5,
            "name": "Phase 5: Release Polish & Production Master",
            "desc": "Đóng gói WebGL / Unreal Production Build, Tối ưu 60 FPS",
            "start": "Chờ kích hoạt",
            "end": "—",
            "duration": "—",
            "status": "⏳ CHỜ KÍCH HOẠT",
            "is_active": False
        }
    ]
    return phases, total_hours_str

def render_swarm_log_html(max_cycles=8):
    if not os.path.exists(SWARM_LOG_FILE):
        return '<div style="color:#64748b; text-align:center; padding:20px;">Chưa có dữ liệu thảo luận.</div>'

    try:
        with open(SWARM_LOG_FILE, "r", encoding="utf-8") as f:
            content = f.read()

        raw_blocks = re.split(r'\n---\s*\n##\s*', content)
        recent_blocks = raw_blocks[-max_cycles:]

        cards_html = []
        for idx, b in enumerate(reversed(recent_blocks)):
            is_latest = (idx == 0)
            clean_b = b.strip()
            if not clean_b:
                continue

            header_m = re.search(r'\[?(BÁO CÁO[^\]\n]+|CHU KỲ[^\]\n]+|🕒[^—\n]+)\]?\s*—\s*([0-9\- :]+|`[0-9\- :]+`)', clean_b)
            raw_label = header_m.group(1).strip() if header_m else "BÁO CÁO ĐỊNH KỲ 1H"
            timestamp = header_m.group(2).strip('` ') if header_m else ""

            # Trích xuất số thứ tự chu kỳ nếu có
            num_m = re.search(r'#(\d+)', raw_label)
            cycle_num = num_m.group(1) if num_m else str(len(recent_blocks) - idx)

            if "BÁO CÁO" in raw_label.upper():
                display_label = f"BÁO CÁO ĐỊNH KỲ 1 GIỜ #{cycle_num}"
            else:
                display_label = f"CHU KỲ #{cycle_num}"

            commit_m = re.search(r'\*Commit:\*\s*`([^`]+)`', clean_b)
            commit = commit_m.group(1) if commit_m else ""

            topic_m = re.search(r'\*Chủ đề:\*\s*\*\*([^\*]+)\*\*', clean_b)
            topic = topic_m.group(1) if topic_m else ""

            bot_matches = list(re.finditer(r'-\s*`\[?([0-9:]+)\]?`\s*\*\*@([a-zA-Z0-9_]+)\s*\(([^)]+)\):\*\*\s*(?:\n\s*>\s*|\n\s*)*["“]?([\s\S]*?)(?=["”]?\s*\n-\s*`|\n###|\n##|$)', clean_b))

            # Nếu là format cũ ####
            if not bot_matches:
                bot_matches = list(re.finditer(r'####\s*\d+\.\s*([^\s]+)?\s*@([a-zA-Z0-9_]+)\s*\(([^)]+)\):\s*(?:\n\s*>\s*|\n\s*)*["“]?([\s\S]*?)(?=["”]?\s*\n####|\n---|\n##|$)', clean_b))

            dialogues_html = []
            for bm in bot_matches:
                groups = bm.groups()
                if len(groups) == 4 and groups[0] and ":" in groups[0]:
                    t_time = groups[0]
                    t_name = groups[1]
                    t_role = groups[2]
                    t_msg = groups[3].strip()
                elif len(groups) == 4:
                    t_time = "-"
                    t_name = groups[1]
                    t_role = groups[2]
                    t_msg = groups[3].strip()
                else:
                    continue

                t_msg = re.sub(r'^\s*>\s*', '', t_msg, flags=re.MULTILINE).strip('"“” \n')

                bot_class = 'coordinator'
                icon = '👑'
                name_lower = t_name.lower()
                if 'orthex' in name_lower:
                    bot_class = 'orthex'; icon = '🟣'
                elif 'qc' in name_lower or 'qa' in name_lower:
                    bot_class = 'qc'; icon = '🧪'
                elif 'web' in name_lower or 'dev' in name_lower or 'three' in name_lower:
                    bot_class = 'dev'; icon = '💻'
                elif 'architect' in name_lower or 'cpp' in name_lower:
                    bot_class = 'architect'; icon = '🏛️'
                elif 'producer' in name_lower:
                    bot_class = 'producer'; icon = '📋'
                elif 'uiux' in name_lower:
                    bot_class = 'uiux'; icon = '🎨'
                elif 'designer' in name_lower or 'lore' in name_lower or 'game' in name_lower:
                    bot_class = 'designer'; icon = '🎲'

                escaped_msg = html.escape(t_msg).replace('\n', '<br>')
                dialogues_html.append(f"""
                    <div class="bot-msg {bot_class}">
                        <div class="bot-meta">
                            <span class="bot-tag {bot_class}">{icon} @{html.escape(t_name)} <small style="color:#94a3b8; font-weight:400;">({html.escape(t_role)})</small></span>
                            <span class="bot-timestamp">⏱️ {html.escape(t_time)}</span>
                        </div>
                        <div class="bot-text">{escaped_msg}</div>
                    </div>
                """)

            if not dialogues_html:
                dialogues_html.append(f'<div class="bot-text" style="font-size:12px; color:#94a3b8;">{html.escape(clean_b[:1200])}</div>')

            card_class = "cycle-card latest" if is_latest else "cycle-card"
            latest_badge = "⚡ [MỚI NHẤT] " if is_latest else ""
            commit_tag = f'<span class="cycle-commit">{commit}</span>' if commit else ""
            topic_tag = f'<div style="font-size:11px; color:#fbbf24; font-weight:700; margin-bottom:10px;">🎯 {html.escape(topic)}</div>' if topic else ""

            cards_html.append(f"""
                <div class="{card_class}">
                    <div class="cycle-header">
                        <div class="cycle-title">
                            {latest_badge}{display_label} {('• ' + timestamp) if timestamp else ''}
                        </div>
                        {commit_tag}
                    </div>
                    {topic_tag}
                    <div class="cycle-dialogues">
                        {"".join(dialogues_html)}
                    </div>
                </div>
            """)

        return "\n".join(cards_html) if cards_html else '<div style="color:#64748b; text-align:center; padding:20px;">Chưa có dữ liệu thảo luận.</div>'
    except Exception as e:
        return f'<div style="color:#ef4444; padding:20px;">Lỗi xử lý log: {html.escape(str(e))}</div>'

HTML_PAGE = r"""<!DOCTYPE html>
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

        /* BẢNG THỐNG KÊ THỜI GIAN PHASE */
        .stats-card { background: #111827; border: 1px solid #1e293b; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
        .stats-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .stats-title { font-size: 12px; font-weight: 800; color: #00f0ff; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; }
        .total-hours-badge { background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 12px; font-family: monospace; }
        
        .phase-timeline-list { display: flex; flex-direction: column; gap: 8px; }
        .phase-item { background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
        .phase-item.active { border-color: #00f0ff; background: rgba(0, 240, 255, 0.05); }
        .phase-item-top { display: flex; justify-content: space-between; align-items: center; }
        .phase-name { font-size: 12px; font-weight: 700; color: #f8fafc; }
        .phase-duration { font-size: 12px; font-weight: 800; font-family: monospace; color: #fbbf24; }
        .phase-item.active .phase-duration { color: #00f0ff; }
        .phase-item-mid { font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; }
        .phase-timestamps { font-family: monospace; font-size: 10px; color: #cbd5e1; }
        .phase-status-tag { font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 3px; }
        .phase-status-tag.done { background: rgba(16, 185, 129, 0.2); color: #34d399; }
        .phase-status-tag.active { background: rgba(0, 240, 255, 0.2); color: #00f0ff; }
        .phase-status-tag.pending { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-title">🎮 RE:FRAY DIRECTOR</div>
        <div class="status-badge"><div class="pulse-dot"></div> 24/7 ONLINE</div>
    </div>

    <!-- THANH THÔNG TIN BĂNG THÔNG & ĐẾM LÙI 1 GIỜ / LẦN -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; background:#111827; border:1px solid #1e293b; padding:8px 12px; border-radius:8px;">
        <span style="font-size:11px; color:#38bdf8; font-weight:700;">⏱️ CẬP NHẬT: 1 GIỜ / LẦN (TIẾT KIỆM BĂNG THÔNG)</span>
        <span style="font-size:11px; color:#cbd5e1; font-family:monospace; font-weight:700;" id="countdownBadge">⏳ Làm mới sau: 60p 00s</span>
    </div>

    <!-- BẢNG THỐNG KÊ THỜI GIAN VẬN HÀNH TỪNG PHASE -->
    <div class="stats-card">
        <div class="stats-header">
            <span class="stats-title">⏱️ TIẾN ĐỘ & TỔNG THỜI GIAN CHẠY TỪNG PHASE</span>
            <span class="total-hours-badge" id="totalHoursBadge">TỔNG: ĐANG TÍNH...</span>
        </div>
        <div class="phase-timeline-list" id="phaseTimelineList">
            <div style="color:#64748b; font-size:11px; text-align:center; padding:8px;">Đang tải dữ liệu tiến độ...</div>
        </div>
    </div>

    <!-- CÁC NÚT ĐIỀU KHIỂN NHANH -->
    <div class="action-grid">
        <button class="btn-action btn-primary" onclick="manualRefresh()">🔄 Làm Mới Ngay (On Demand)</button>
        <button class="btn-action btn-warning" onclick="runTests()">🧪 Chạy Test C++ & Web</button>
        <button class="btn-action" onclick="triggerCycle()">▶ Kích Hoạt Chu Kỳ Mới</button>
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
            <div class="card-title" style="margin-bottom:0;">📜 ĐỐI THOẠI BOT & HÓA ĐƠN THỰC THI (GOM 1H / LẦN)</div>
            <span class="log-badge-top">⚡ MỚI NHẤT TRÊN CÙNG</span>
        </div>
        <div class="chat-stream" id="logStream">
            <!-- SSR_LOG_STREAM -->
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

        async function fetchLog() {
            try {
                const res = await fetch('/api/log');
                const data = await res.json();
                if (data && data.html) {
                    document.getElementById('logStream').innerHTML = data.html;
                }
            } catch (e) {
                console.error('Lỗi tải log:', e);
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

        async function fetchPhaseStats() {
            try {
                const res = await fetch('/api/phase-stats');
                const data = await res.json();
                document.getElementById('totalHoursBadge').textContent = 'TỔNG: ' + data.total_hours;
                
                const container = document.getElementById('phaseTimelineList');
                let html = '';
                data.phases.forEach(p => {
                    let tagClass = 'done';
                    if (p.is_active) tagClass = 'active';
                    else if (p.status.includes('CHỜ')) tagClass = 'pending';

                    html += `
                        <div class="phase-item ${p.is_active ? 'active' : ''}">
                            <div class="phase-item-top">
                                <span class="phase-name">${escapeHtml(p.name)}</span>
                                <span class="phase-duration">${escapeHtml(p.duration)}</span>
                            </div>
                            <div class="phase-item-mid">
                                <span class="phase-timestamps">📅 ${escapeHtml(p.start)} ➔ ${escapeHtml(p.end)}</span>
                                <span class="phase-status-tag ${tagClass}">${escapeHtml(p.status)}</span>
                            </div>
                        </div>
                    `;
                });
                container.innerHTML = html;
            } catch (e) {
                console.error('Lỗi tải thống kê phase:', e);
            }
        }

        // CƠ CHẾ CẬP NHẬT 1 GIỜ / LẦN (TIẾT KIỆM BĂNG THÔNG & PIN)
        const REFRESH_INTERVAL_SEC = 3600; // 3600 giây = 1 giờ
        let remainingSeconds = REFRESH_INTERVAL_SEC;

        function updateCountdownUI() {
            const m = Math.floor(remainingSeconds / 60);
            const s = remainingSeconds % 60;
            const el = document.getElementById('countdownBadge');
            if (el) {
                el.textContent = `⏳ Làm mới sau: ${m}p ${s < 10 ? '0' : ''}${s}s`;
            }
        }

        function manualRefresh() {
            remainingSeconds = REFRESH_INTERVAL_SEC;
            updateCountdownUI();
            fetchLog();
            fetchPhaseStats();
        }

        // Tự động đếm lùi và chỉ gửi request sau mỗi 1 giờ
        setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds <= 0) {
                remainingSeconds = REFRESH_INTERVAL_SEC;
                fetchLog();
                fetchPhaseStats();
            }
            updateCountdownUI();
        }, 1000);
        updateCountdownUI();

        // Dữ liệu ban đầu đã được nạp sẵn tức thì qua Server-Side Rendering (SSR).
        // Trình duyệt không cần parse regex, hiển thị ngay lập tức khi mở trang!
    </script>
</body>
</html>
"""

def render_dashboard_ssr(phases, total_hours, log_html):
    phase_items_html = ""
    for p in phases:
        tag_class = "done" if "ĐÃ" in p["status"] else ("active" if p["is_active"] else "pending")
        active_class = "active" if p["is_active"] else ""
        phase_items_html += f"""
            <div class="phase-item {active_class}">
                <div class="phase-item-top">
                    <span class="phase-name">{p['name']}</span>
                    <span class="phase-duration">{p['duration']}</span>
                </div>
                <div class="phase-item-mid">
                    <span class="phase-timestamps">📅 {p['start']} ➔ {p['end']}</span>
                    <span class="phase-status-tag {tag_class}">{p['status']}</span>
                </div>
            </div>
        """

    html = HTML_PAGE
    html = html.replace('id="totalHoursBadge">TỔNG: ĐANG TÍNH...', f'id="totalHoursBadge">TỔNG: {total_hours}')
    html = html.replace('<div style="color:#64748b; font-size:11px; text-align:center; padding:8px;">Đang tải dữ liệu tiến độ...</div>', phase_items_html)
    html = html.replace('<!-- SSR_LOG_STREAM -->', log_html)
    return html

_FILE_CACHE = {}

class RemoteHandler(BaseHTTPRequestHandler):
    def send_compressed_response(self, content_bytes, content_type, cache_control="no-cache"):
        accept_encoding = self.headers.get("Accept-Encoding", "")
        if "gzip" in accept_encoding and len(content_bytes) > 200:
            compressed = gzip.compress(content_bytes, compresslevel=6)
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(compressed)))
            self.send_header("Cache-Control", cache_control)
            self.end_headers()
            self.wfile.write(compressed)
        else:
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content_bytes)))
            self.send_header("Cache-Control", cache_control)
            self.end_headers()
            self.wfile.write(content_bytes)

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        req_path = parsed_url.path

        if req_path in ["/", "/index.html"]:
            phases, total_hours = get_phase_timelines()
            log_html = render_swarm_log_html(max_cycles=8)
            rendered_html = render_dashboard_ssr(phases, total_hours, log_html)
            self.send_compressed_response(rendered_html.encode("utf-8"), "text/html; charset=utf-8", "no-cache")
            return

        elif req_path == "/api/phase-stats":
            phases, total_hours = get_phase_timelines()
            body = json.dumps({"phases": phases, "total_hours": total_hours}).encode("utf-8")
            self.send_compressed_response(body, "application/json; charset=utf-8", "no-cache")
            return

        elif req_path == "/api/log":
            # Gửi HTML đối thoại bot gom 1 giờ / lần
            log_html = render_swarm_log_html(max_cycles=8)
            body = json.dumps({"html": log_html}).encode("utf-8")
            self.send_compressed_response(body, "application/json; charset=utf-8", "no-cache")
            return

        elif req_path in ["/game", "/game/", "/game/index.html"]:
            web_path = os.path.join(WORKSPACE_ROOT, "Web", "index.html")
            if os.path.exists(web_path):
                with open(web_path, "rb") as f:
                    web_bytes = f.read()
                self.send_compressed_response(web_bytes, "text/html; charset=utf-8", "no-cache")
                return
            else:
                self.send_response(404)
                self.end_headers()
                return

        # Phục vụ các file tĩnh trong Web/ (css, dist, src, vendor, etc.)
        rel_path = req_path
        if rel_path.startswith("/game/"):
            rel_path = rel_path[len("/game/"):]
        else:
            rel_path = rel_path.lstrip("/")

        full_path = os.path.normpath(os.path.join(WORKSPACE_ROOT, "Web", rel_path))
        web_root = os.path.normpath(os.path.join(WORKSPACE_ROOT, "Web"))

        if full_path.startswith(web_root) and os.path.isfile(full_path):
            mtime = os.path.getmtime(full_path)
            cache_entry = _FILE_CACHE.get(full_path)

            mime, _ = mimetypes.guess_type(full_path)
            if full_path.endswith((".js", ".mjs")):
                mime = "application/javascript; charset=utf-8"
            elif full_path.endswith(".css"):
                mime = "text/css; charset=utf-8"
            elif full_path.endswith(".wasm"):
                mime = "application/wasm"
            elif not mime:
                mime = "application/octet-stream"

            norm_rel = rel_path.replace("\\", "/")
            if "vendor/" in norm_rel:
                cache_ctrl = "public, max-age=604800, immutable"
            elif "dist/" in norm_rel:
                cache_ctrl = "public, max-age=300"
            elif full_path.endswith((".js", ".mjs", ".css")):
                cache_ctrl = "public, max-age=120"
            else:
                cache_ctrl = "public, max-age=3600"

            if cache_entry and cache_entry["mtime"] == mtime:
                file_bytes = cache_entry["bytes"]
                gzip_bytes = cache_entry["gzip"]
            else:
                with open(full_path, "rb") as f:
                    file_bytes = f.read()
                gzip_bytes = gzip.compress(file_bytes, compresslevel=6) if len(file_bytes) > 200 else None
                _FILE_CACHE[full_path] = {
                    "mtime": mtime,
                    "bytes": file_bytes,
                    "gzip": gzip_bytes
                }

            accept_encoding = self.headers.get("Accept-Encoding", "")
            if gzip_bytes and "gzip" in accept_encoding:
                self.send_response(200)
                self.send_header("Content-Type", mime)
                self.send_header("Content-Encoding", "gzip")
                self.send_header("Content-Length", str(len(gzip_bytes)))
                self.send_header("Cache-Control", cache_ctrl)
                self.end_headers()
                self.wfile.write(gzip_bytes)
            else:
                self.send_response(200)
                self.send_header("Content-Type", mime)
                self.send_header("Content-Length", str(len(file_bytes)))
                self.send_header("Cache-Control", cache_ctrl)
                self.end_headers()
                self.wfile.write(file_bytes)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length > 0 else ""

        if self.path == "/api/command":
            data = json.loads(body) if body else {}
            cmd_text = data.get("command", "")

            # 1. Lưu vào hàng đợi chỉ thị Command Queue chính thức
            queue_file = os.path.join(WORKSPACE_ROOT, "Docs", "discussions", "MOBILE_COMMAND_QUEUE.json")
            queue = []
            if os.path.exists(queue_file):
                try:
                    with open(queue_file, "r", encoding="utf-8") as f:
                        queue = json.load(f)
                except Exception:
                    queue = []

            cmd_entry = {
                "id": len(queue) + 1,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "command": cmd_text,
                "status": "DISPATCHED_TO_SWARM"
            }
            queue.append(cmd_entry)
            with open(queue_file, "w", encoding="utf-8") as f:
                json.dump(queue, f, ensure_ascii=False, indent=2)

            # 2. Phản hồi xác nhận tiếp nhận vào hàng đợi chỉ thị
            reply = f"✅ ĐÃ TIẾP NHẬN CHỈ THỊ (ID #{cmd_entry['id']}):\n\"{cmd_text}\"\n\nChỉ thị đã được đưa vào hàng đợi chính thức (MOBILE_COMMAND_QUEUE.json). Coordinator và các tổ chuyên trách (Designer, Dev, QC) sẽ tiếp nhận và thực thi."
            self.send_compressed_response(json.dumps({"response": reply, "details": "Đã lưu vào MOBILE_COMMAND_QUEUE.json"}).encode("utf-8"), "application/json; charset=utf-8")

        elif self.path == "/api/trigger-cycle":
            daemon_script = os.path.join(WORKSPACE_ROOT, "Tools", "pipeline", "real_swarm_engine.py")
            res = subprocess.run(["py", "-3", daemon_script, "--once"], cwd=WORKSPACE_ROOT, capture_output=True, text=True)

            self.send_compressed_response(json.dumps({"message": res.stdout}).encode("utf-8"), "application/json; charset=utf-8")

        elif self.path == "/api/run-tests":
            test_bat = os.path.join(WORKSPACE_ROOT, "Tools", "host_tests", "build_and_run.bat")
            res_c = subprocess.run([test_bat], cwd=WORKSPACE_ROOT, capture_output=True, text=True)
            res_strict = subprocess.run(["node", "Web/test_strict_swap.mjs"], cwd=WORKSPACE_ROOT, capture_output=True, text=True)
            res_specials = subprocess.run(["node", "Web/test_specials.mjs"], cwd=WORKSPACE_ROOT, capture_output=True, text=True)
            res_wasm = subprocess.run(["node", "Web/smoke_test.mjs"], cwd=WORKSPACE_ROOT, capture_output=True, text=True)
            res_p3 = subprocess.run(["node", "Web/test_phase3.mjs"], cwd=WORKSPACE_ROOT, capture_output=True, text=True)

            output = f"=== TEST STRICT SWAP & REVERT (8 CHECKS) ===\n{res_strict.stdout}\n\n=== TEST SPECIAL GEMS (9 CHECKS) ===\n{res_specials.stdout}\n\n=== TEST PHASE 3 WEB (16 CHECKS) ===\n{res_p3.stdout}\n\n=== TEST C++ CORE (744 ASSERTIONS) ===\n{res_c.stdout}\n\n=== TEST WASM (51 CHECKS) ===\n{res_wasm.stdout}"

            self.send_compressed_response(json.dumps({"output": output}).encode("utf-8"), "application/json; charset=utf-8")

def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), RemoteHandler)
    print("=" * 70)
    print("📱 RE:FRAY MOBILE REMOTE COMMAND CENTER (HIGH-PERFORMANCE RUNNING)")
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
