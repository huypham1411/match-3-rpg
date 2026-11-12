import os
import json
import asyncio
import threading
import time
import requests
try:
    import gradio as gr
except ImportError:
    gr = None

# ZeroGPU Support for Hugging Face Spaces
try:
    import spaces
except ImportError:
    class _MockSpaces:
        def GPU(self, *args, **kwargs):
            if len(args) == 1 and callable(args[0]):
                return args[0]
            def decorator(fn):
                return fn
            return decorator
    spaces = _MockSpaces()

@spaces.GPU
def _zerogpu_startup():
    """Satisfy ZeroGPU startup check on Hugging Face Spaces."""
    return True

# OpenRouter API Key and Telegram Token from Environment / Secrets / .env
DEFAULT_OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")

# Tự động nạp từ file .env cục bộ nếu có
for env_path in [".env", os.path.join(os.path.dirname(__file__), "..", ".env")]:
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("OPENROUTER_API_KEY=") and not DEFAULT_OPENROUTER_KEY:
                        DEFAULT_OPENROUTER_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
                    elif line.startswith("TELEGRAM_BOT_TOKEN=") and not TELEGRAM_BOT_TOKEN:
                        TELEGRAM_BOT_TOKEN = line.split("=", 1)[1].strip().strip('"').strip("'")
        except Exception:
            pass

# AI Agent Definitions
AGENTS = {
    "PM (Lead Director)": {
        "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
        "system": """Bạn là Lead Project Manager & Game Director của dự án RE:FRAY - MATCH-3 RPG (User: Anh Huy).
Dự án có lộ trình 5 Phase:
- Phase 1: Game Feel & Block Animation (Hàng đợi animation Step-by-Step, squash & stretch khi rơi, easing mượt mà).
- Phase 2: Narrative & Creative Worldbuilding (Kịch bản Ch.1,2,3: Khu Aster, Tiền đồn Unmapped Rim, Tàn tích Archive; Concept 4 Starter Heroes).
- Phase 3: 3-Stage Vertical Slice & Cân bằng 6 Role (Attacker, Healer, Supporter, Defender, Counter, Deflector).
- Phase 4: Metagame & Roster Progression.
- Phase 5: Release Build Web WASM & Unreal Engine 5.
Phong cách làm việc: Quyết đoán, chủ động điều phối cuộc họp bàn tròn, lắng nghe phản biện từ Designer/Lore và giải đáp kỹ thuật từ Antigravity, hướng tới kết quả chạy được."""
    },
    "Antigravity (Lead Architect & Codebase Engine)": {
        "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
        "system": """Bạn là Antigravity - Lead Architect & Core Execution Engine của MatchRPG (đại diện kỹ thuật trực tiếp trên máy của Anh Huy).
Bạn nắm toàn bộ hiện trạng codebase thật:
1. C++ Core (Source/MatchRPG/Public/Core & Private/Core):
   - Độc lập hoàn toàn khỏi Unreal Engine, không tham chiếu UObject/AActor.
   - Không dùng TArray<bool>, mọi ngẫu nhiên đi qua FMatchRng (tái lập hạt giống seed).
   - Đã vượt qua 744/744 checks trong Tools/host_tests/main.cpp.
2. Web WASM (Web/m3ui.js, dist/m3core.wasm, Web/style.css):
   - Bố cục chia đôi màn hình chuẩn: Trái (Match-3), Phải (Combat quái & party pixel art).
   - Animation block dùng popIn và dropIn (opacity 1.0 cố định, tránh lỗi biến mất block).
   - Test tự động: 51/51 PASS trong Web/smoke_test.mjs.
3. 3D Blender 5.2 (Content/Blender/Astra_PGR_Model.blend):
   - Đã có model nhân vật Astra phong cách PGR anime tỷ lệ 7 đầu.
   - Vật liệu NPR Cel-Shading 2-tone, viền nét mực Inverted Hull Outline (Backface Culling).
   - Armature 21 xương, đã có 2 Action: Action_Idle (60f) và Action_Attack (36f).
Quy tắc xử lý trong cuộc họp:
- Trả lời thẳng thắn mọi câu hỏi kỹ thuật từ PM, Lore, Game Dev và Concept.
- Chủ động tự giải quyết và chốt phương án kỹ thuật nếu có đủ thông tin từ codebase nhằm giúp dự án tiến liên tục không bị dừng lại.
- Nếu gặp quyết định chiến lược/kinh doanh/thẩm mỹ mà chỉ Anh Huy (User) mới có quyền quyết định (ví dụ chọn giữa 2D pixel vs 3D, monetization, hướng đi kịch bản cốt lõi), hãy tạm thời chọn 1 giả định an toàn nhất để tiếp tục thảo luận, đồng thời đánh dấu rõ [CẦN ANH HUY XÁC NHẬN] vào biên bản tổng kết."""
    },
    "Game Developer": {
        "model": "cohere/north-mini-code:free",
        "system": """Bạn là Senior Game Developer & Combat Designer của RE:FRAY.
Bạn phụ trách: Thiết kế thông số chiến đấu, cơ chế phá giáp (Break/Stagger), bảng tỷ lệ combo, kỹ năng 6 Role nhân vật.
Khi thảo luận, hãy luôn đặt câu hỏi về tính khả thi trong C++ Core cho Antigravity."""
    },
    "Lore Writer & Worldbuilder": {
        "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
        "system": """Bạn là Narrative Designer & Lore Writer của RE:FRAY.
Thế giới: Hậu tận thế sau Great Sunset.
Xung đột: Central Dominion vs Vùng biên tự do Aster.
Nhân vật: 4 Starter (Astra - Lôi kiếm sĩ, Boran - Vệ binh, Elysia - Hỗ trợ thời không, Lin - Trị liệu Nanite).
Nhiệm vụ: Cung cấp kịch bản thoại, bối cảnh màn chơi, lý do trận chiến và kết nối câu chuyện với cơ chế game."""
    },
    "Concept Illustrator & 3D": {
        "model": "nvidia/nemotron-3.5-lightning:free",
        "system": """Bạn là Art Director & 3D Artist cho RE:FRAY.
Phong cách chuẩn: Anime Cyberpunk kiểu Punishing: Gray Raven (PGR) / Zenless Zone Zero (ZZZ), tỷ lệ cơ thể 7.5 đầu, màu tương phản cao, cel-shading sắc nét.
Nhiệm vụ: Đề xuất phong cách visual cho nhân vật, quái vật, boss, vũ khí plasma và hiệu ứng kỹ năng."""
    },
    "QA Tester": {
        "model": "cohere/north-mini-code:free",
        "system": """Bạn là QA Engineer của RE:FRAY. Chuyên kiểm tra tính logic, điều kiện biên, kiểm thử đơn vị và bảo đảm tiêu chuẩn nghiệm thu Gate Checklist."""
    }
}

def call_openrouter(agent_name, user_message, chat_history, api_key):
    key = api_key.strip() if api_key and api_key.strip() else DEFAULT_OPENROUTER_KEY
    agent_info = AGENTS.get(agent_name, AGENTS["PM (Lead Director)"])
    
    messages = [{"role": "system", "content": agent_info["system"]}]
    for msg in chat_history:
        if isinstance(msg, dict):
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        elif isinstance(msg, (list, tuple)) and len(msg) == 2:
            if msg[0]: messages.append({"role": "user", "content": str(msg[0])})
            if msg[1]: messages.append({"role": "assistant", "content": str(msg[1])})
    messages.append({"role": "user", "content": user_message})

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://huggingface.co/spaces/refray-studio",
        "X-Title": "RE:FRAY AI Studio"
    }
    payload = {
        "model": agent_info["model"],
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1500
    }

    try:
        res = requests.post(url, headers=headers, json=payload, timeout=45)
        if res.status_code == 200:
            data = res.json()
            return data["choices"][0]["message"]["content"]
        else:
            return f"❌ Lỗi OpenRouter ({res.status_code}): {res.text}"
    except Exception as e:
        return f"❌ Exception kết nối: {str(e)}"

# --- VÒNG LẶP HỌP BÀN TRÒN TỰ ĐỘNG (AUTONOMOUS SWARM ROUNDTABLE) ---
def run_autonomous_roundtable(topic, rounds=2, api_key=""):
    """
    Quy trình họp bàn tròn tự động giữa PM, Game Dev, Lore, Art và Antigravity:
    - PM mở đầu, phân công.
    - Designer, Lore, Art trình bày ý tưởng & đặt câu hỏi kỹ thuật.
    - Antigravity trả lời toàn bộ câu hỏi kỹ thuật dựa trên codebase thật, giải quyết mọi vấn đề tự giải quyết được.
    - Cuối cùng tổng hợp thành 2 phần:
      1) Những điểm ĐÃ THỐNG NHẤT VÀ TỰ GIẢI QUYẾT 100%.
      2) Những điểm CẦN ANH HUY PHÊ DUYỆT (nếu có).
    """
    history_transcript = []
    output_md = f"# 🏛️ BIÊN BẢN HỌP BÀN TRÒN STUDIO: {topic.upper()}\n\n"
    output_md += f"*Thời gian họp:* 2026-11-12 | *Thành phần:* PM Lead, Antigravity (Codebase Engine), Game Dev, Lore Writer, Concept Art\n\n---\n\n"

    yield output_md + "⏳ *Đang triệu tập các bot vào phòng họp...*"

    # 1. PM mở đầu cuộc họp
    prompt_pm = f"""Chủ đề cuộc họp: '{topic}'.
Hãy đóng vai trò PM Lead:
1. Nêu rõ mục tiêu cần đạt được cho tính năng này.
2. Đặt câu hỏi cụ thể cho Lore Writer và Game Developer.
3. Đặt câu hỏi kỹ thuật cho Antigravity (Lead Architect) về tính khả thi trong codebase hiện tại."""
    pm_msg = call_openrouter("PM (Lead Director)", prompt_pm, [], api_key)
    output_md += f"### 👑 PM (Lead Director):\n{pm_msg}\n\n---\n\n"
    history_transcript.append({"role": "user", "content": f"PM: {pm_msg}"})
    yield output_md

    # 2. Lore Writer lên ý tưởng
    prompt_lore = f"Chủ đề '{topic}'. Dựa trên phát biểu của PM:\n{pm_msg}\nHãy đưa ra ý tưởng cốt truyện, bối cảnh, hội thoại cho đề tài này."
    lore_msg = call_openrouter("Lore Writer & Worldbuilder", prompt_lore, history_transcript, api_key)
    output_md += f"### 📜 Lore Writer & Worldbuilder:\n{lore_msg}\n\n---\n\n"
    history_transcript.append({"role": "assistant", "content": f"Lore Writer: {lore_msg}"})
    yield output_md

    # 3. Game Developer đề xuất cơ chế
    prompt_dev = f"Dựa trên ý kiến của PM và Lore Writer, hãy đề xuất cơ chế gameplay, chỉ số cân bằng, và đặt câu hỏi kỹ thuật cụ thể cho Antigravity."
    dev_msg = call_openrouter("Game Developer", prompt_dev, history_transcript, api_key)
    output_md += f"### ⚔️ Game Developer:\n{dev_msg}\n\n---\n\n"
    history_transcript.append({"role": "assistant", "content": f"Game Developer: {dev_msg}"})
    yield output_md

    # 4. Concept & 3D Artist
    prompt_art = f"Đề xuất phong cách visual 3D (phong cách PGR anime cel-shading), mô tả model, vũ khí và hiệu ứng VFX phù hợp với đề xuất của Game Dev."
    art_msg = call_openrouter("Concept Illustrator & 3D", prompt_art, history_transcript, api_key)
    output_md += f"### 🎨 Concept Illustrator & 3D:\n{art_msg}\n\n---\n\n"
    history_transcript.append({"role": "assistant", "content": f"Concept Art: {art_msg}"})
    yield output_md

    # 5. Antigravity (Lead Architect & Codebase Engine) TRẢ LỜI VÀ GIẢI QUYẾT KỸ THUẬT
    prompt_anti = f"""Bạn là Antigravity. Các bot vừa thảo luận:
- PM: {pm_msg}
- Lore: {lore_msg}
- Game Dev: {dev_msg}
- Art: {art_msg}

Hãy thực hiện nhiệm vụ Kỹ sư trưởng:
1. TRẢ LỜI TẤT CẢ CÂU HỎI KỸ THUẬT của PM và Game Dev: Đối chiếu trực tiếp với C++ Core, Web WASM và Blender 5.2.
2. TỰ ĐỘNG CHỐT GIẢI PHÁP KỸ THUẬT: Những gì codebase giải quyết được, chốt phương án làm luôn để không gián đoạn tiến độ.
3. PHÂN TÁCH RÕ RÀNG:
   - Phần A: Những điểm Kỹ thuật ĐÃ GIẢI QUYẾT & THỐNG NHẤT 100%.
   - Phần B: Kế hoạch triển khai (File nào, module nào).
   - Phần C: Những điểm nghiệp vụ/định hướng duy nhất [CẦN ANH HUY XÁC NHẬN] (nếu có, không hỏi vụn vặt)."""
    anti_msg = call_openrouter("Antigravity (Lead Architect & Codebase Engine)", prompt_anti, history_transcript, api_key)
    output_md += f"### 🚀 Antigravity (Lead Architect & Codebase Execution):\n{anti_msg}\n\n---\n\n"
    history_transcript.append({"role": "assistant", "content": f"Antigravity: {anti_msg}"})
    yield output_md

    # 6. PM kết luận cuộc họp
    prompt_pm_close = f"Dựa trên câu trả lời giải quyết kỹ thuật của Antigravity, hãy tổng kết cuộc họp thành bản Action Plan ngắn gọn gửi Anh Huy."
    close_msg = call_openrouter("PM (Lead Director)", prompt_pm_close, history_transcript, api_key)
    output_md += f"### 📋 TỔNG KẾT BIÊN BẢN (PM Lead):\n{close_msg}\n\n"
    yield output_md

    # Lưu biên bản ra file nếu có thư mục Docs/Specs
    try:
        os.makedirs("Docs/Specs", exist_ok=True)
        with open("Docs/Specs/ROUNDTABLE_LATEST.md", "w", encoding="utf-8") as f:
            f.write(output_md)
    except Exception:
        pass

@spaces.GPU(duration=60)
def chat_response(user_message, history, agent_name, api_key):
    if not user_message.strip():
        return "", history
    history = history or []
    bot_reply = call_openrouter(agent_name, user_message, history, api_key)
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": bot_reply})
    return "", history

# --- Background Telegram Bot Daemon ---
def run_telegram_bot(token):
    if not token or len(token) < 20:
        return
    
    try:
        from telegram import Update
        from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes
        
        async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
            await update.message.reply_text(
                "🎮 *RE:FRAY AI Cloud Studio Bot Đang Hoạt Động!*\n\n"
                "• Gõ tin nhắn để chat trực tiếp với *PM Lead*\n"
                "• `/discuss <chủ đề>`: Triệu tập các bot & Antigravity họp bàn tròn tự động và nhận bản tổng kết\n"
                "• `/dev <nội dung>`: Chat với Game Developer\n"
                "• `/anti <nội dung>`: Chat trực tiếp với Antigravity\n"
                "• `/status`: Xem tiến độ 5 Phase",
                parse_mode="Markdown"
            )

        async def discuss_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
            topic = " ".join(context.args) if context.args else "Hoàn thiện Phase 3 Vertical Slice & Combat Balance"
            await update.message.reply_text(f"🏛️ *Đang triệu tập cuộc họp bàn tròn tự động về:* '{topic}'...\nCác bot và Antigravity đang thảo luận...")
            
            # Chạy loop
            last_text = ""
            for update_text in run_autonomous_roundtable(topic, rounds=2, api_key=DEFAULT_OPENROUTER_KEY):
                last_text = update_text
            
            # Gửi phần tóm tắt cuối cùng
            summary_part = last_text[-2500:] if len(last_text) > 2500 else last_text
            await update.message.reply_text(f"✅ *KẾT QUẢ CUỘC HỌP BÀN TRÒN:*\n\n{summary_part}")

        async def msg_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
            user_text = update.message.text
            agent_role = "PM (Lead Director)"
            if user_text.startswith("/dev"):
                agent_role = "Game Developer"
                user_text = user_text[4:].strip()
            elif user_text.startswith("/anti"):
                agent_role = "Antigravity (Lead Architect & Codebase Engine)"
                user_text = user_text[5:].strip()
            elif user_text.startswith("/lore"):
                agent_role = "Lore Writer & Worldbuilder"
                user_text = user_text[5:].strip()

            reply = call_openrouter(agent_role, user_text, [], DEFAULT_OPENROUTER_KEY)
            await update.message.reply_text(f"🤖 *[{agent_role}]*:\n\n{reply}", parse_mode="Markdown")

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        app = ApplicationBuilder().token(token).build()
        app.add_handler(CommandHandler("start", start_cmd))
        app.add_handler(CommandHandler("discuss", discuss_cmd))
        app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), msg_handler))
        app.run_polling(close_loop=False)
    except Exception as e:
        print(f"[Telegram Bot] Lỗi khởi động: {e}")

if TELEGRAM_BOT_TOKEN:
    t = threading.Thread(target=run_telegram_bot, args=(TELEGRAM_BOT_TOKEN,), daemon=True)
    t.start()

# --- Gradio UI Layout (Gradio 6.0+ Compliant) ---
if gr:
    with gr.Blocks(title="RE:FRAY AI Studio") as demo:
        gr.Markdown("# 🎮 RE:FRAY — Autonomous Cloud Game Dev Studio")
        gr.Markdown("Hệ thống AI Agent điều phối và phát triển dự án **RE:FRAY (Match-3 RPG)** chạy 24/7 trên Cloud kết hợp **Antigravity Codebase Engine**.")

        # TAB 1: PHÒNG HỌP BÀN TRÒN TỰ ĐỘNG
        with gr.Tab("🏛️ Phòng Họp Bàn Tròn Tự Động (Autonomous Swarm Room)"):
            gr.Markdown("""
            ### Cuộc họp bàn tròn tự động giữa các bot & Antigravity
            Nhập chủ đề bạn muốn các bot giải quyết. Các bot (PM, Game Dev, Lore, Art) và **Antigravity** sẽ tự thảo luận, tự giải đáp kỹ thuật, tự giải quyết vấn đề và xuất biên bản tổng kết gồm:
            1. **Những điểm đã tự giải quyết & thống nhất 100%**.
            2. **Kế hoạch triển khai kỹ thuật**.
            3. **Chỉ những câu hỏi nghiệp vụ cần bạn (Anh Huy) xác nhận**.
            """)
            with gr.Row():
                roundtable_topic = gr.Textbox(
                    value="Thiết kế chiêu thức & visual cho Boss Sentinel 07 và cân bằng sát thương màn 1-1",
                    label="Chủ đề cuộc họp",
                    scale=8
                )
                roundtable_btn = gr.Button("🚀 Khởi động cuộc họp tự động", variant="primary", scale=2)

            roundtable_output = gr.Markdown("Bấm nút bên trên để các bot bắt đầu cuộc họp...")
            roundtable_btn.click(run_autonomous_roundtable, inputs=[roundtable_topic], outputs=[roundtable_output])

        # TAB 2: STUDIO CHAT ĐƠN LẺ
        with gr.Tab("💬 Studio Chat (Từng Bot)"):
            with gr.Row():
                agent_dropdown = gr.Dropdown(
                    choices=list(AGENTS.keys()),
                    value="PM (Lead Director)",
                    label="Chọn AI Agent để làm việc"
                )
                api_key_input = gr.Textbox(
                    value=DEFAULT_OPENROUTER_KEY,
                    type="password",
                    label="OpenRouter API Key (Đã cấu hình sẵn)",
                    placeholder="sk-or-v1-..."
                )

            chatbot = gr.Chatbot(label="Hội thoại Studio", elem_id="chatbox")
            with gr.Row():
                msg_input = gr.Textbox(
                    placeholder="Nhập yêu cầu hoặc câu hỏi cho bot...",
                    label="Tin nhắn",
                    scale=8
                )
                send_btn = gr.Button("Gửi 🚀", variant="primary", scale=1)

            clear_btn = gr.Button("Xóa lịch sử chat")

            send_btn.click(chat_response, inputs=[msg_input, chatbot, agent_dropdown, api_key_input], outputs=[msg_input, chatbot])
            msg_input.submit(chat_response, inputs=[msg_input, chatbot, agent_dropdown, api_key_input], outputs=[msg_input, chatbot])
            clear_btn.click(lambda: [], None, chatbot)

        # TAB 3: TIẾN ĐỘ & NGHIỆM THU
        with gr.Tab("📊 Lộ Trình 5 Phase & Nghiệm Thu"):
            gr.Markdown("""
            ### LỘ TRÌNH DỰ ÁN & TIÊU CHUẨN NGHIỆM THU
            * **Phase 1: Game Feel & Block Animation** [HOÀN THÀNH - GATE 1 PASS]
              * AnimationStepQueue C++ & Easing, Squash & Stretch
              * Host tests C++: **744/744 PASS 100%**
            * **Phase 2: Narrative & Creative Worldbuilding** [ĐANG TRIỂN KHAI]
              * Model 3D Astra phong cách PGR hoàn chỉnh trong `Content/Blender/Astra_PGR_Model.blend`
              * 2 Action: Idle loop (60f) & Attack Slash (36f)
              * Kịch bản 3 Chương & Boss Sentinel 07
            * **Phase 3: 3-Stage Vertical Slice Integration** (Ghép 3 màn chơi hoàn chỉnh)
            * **Phase 4: Metagame & Roster Progression** (Gacha, trang bị, menu đội hình)
            * **Phase 5: Release Build Web WASM & Unreal Engine 5**
            """)

        # TAB 4: TELEGRAM
        with gr.Tab("📱 Kết Nối Điện Thoại (Telegram 24/7)"):
            gr.Markdown("""
            ### Hướng dẫn kết nối Telegram Bot điều khiển trên điện thoại 24/7:
            1. Gõ `/discuss <chủ đề>` trong Telegram để kích hoạt cuộc họp bàn tròn tự động từ xa.
            2. Bot sẽ tự thảo luận và gửi bản tóm tắt quyết định về tin nhắn cho bạn!
            """)

if __name__ == "__main__" and gr:
    demo.launch(ssr_mode=False)
