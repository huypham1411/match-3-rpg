import os
import json
import asyncio
import threading
import requests
import gradio as gr

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

# OpenRouter API Key and Telegram Token from Environment / Secrets
DEFAULT_OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")

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
Quy tắc: Quyết đoán, ngắn gọn, tự chủ điều phối, không hỏi duyệt vụn vặt."""
    },
    "Game Developer": {
        "model": "cohere/north-mini-code:free",
        "system": """Bạn là Senior Game Developer của dự án RE:FRAY.
Lõi C++ nằm ở Source/MatchRPG/Public/Core/ và Private/Core/, không phụ thuộc engine.
Bạn phụ trách: AnimationStepQueue trong BoardGridActor, FLIP animation, kiểm thử host_tests với 738 assertions."""
    },
    "Lore Writer & Worldbuilder": {
        "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
        "system": """Bạn là Narrative Designer & Lore Writer của RE:FRAY.
Thế giới: Hậu tận thế sau Great Sunset. Nhân vật chính là Creator thức tỉnh từ kén điều áp vùng biên.
Xung đột: Central Dominion (áp bức, độc quyền) vs Cư dân tự do vùng biên.
4 Starter: Astra (Kiếm nhiệt Đỏ - Atk), Boran (Khiên từ trường Vàng - Def), Elysia (Tín hiệu Lam - Support), Lin (Nanite Lục - Heal).
Kịch bản: Ch.1 Khu Aster (Boss: Sentinel 07), Ch.2 Unmapped Rim (Boss: Warden Aegis), Ch.3 Archive Beta (Boss: Null Sovereign)."""
    },
    "Concept Illustrator & 3D": {
        "model": "nvidia/nemotron-3.5-lightning:free",
        "system": """Bạn là Art Director & Concept Artist cho RE:FRAY.
Phong cách: PBR Anime hành động phong cách PGR/ZZZ, tỷ lệ cơ thể 7.5 - 8 đầu.
Block: Hard-Light Crystal Prism viền kim loại vát cạnh.
Nhiệm vụ: Lên ý tưởng visual sheet cho 4 hero, quái thường và 3 Boss."""
    },
    "QA Tester": {
        "model": "cohere/north-mini-code:free",
        "system": """Bạn là QA Engineer & Game Tester của RE:FRAY.
Bạn chuyên kiểm tra logic luật chơi, điều kiện biên, 738 assertions trong Tools/host_tests/main.cpp và xác nhận Gate Checklist."""
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
                "Bạn có thể ra lệnh điều hành studio 24/7 từ điện thoại:\n"
                "• Gõ tin nhắn bình thường để chat với *PM Lead*\n"
                "• `/dev <nội dung>`: Chat với Game Developer\n"
                "• `/lore <nội dung>`: Chat với Lore Writer\n"
                "• `/status`: Xem tiến độ 5 Phase dự án",
                parse_mode="Markdown"
            )

        async def status_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
            status_text = (
                "📋 *TIẾN ĐỘ DỰ ÁN RE:FRAY*\n\n"
                "🟢 *Phase 1: Game Feel & Block Animation* (Đang triển khai)\n"
                "  - AnimationStepQueue C++: Đang dựng\n"
                "  - Host Tests: PASS 738/738 (100%)\n\n"
                "🟢 *Phase 2: Narrative & Creative Ch.1-3* (Đã có kịch bản khung)\n"
                "  - Ch.1: Khu Aster & Sentinel 07\n"
                "  - Ch.2: Unmapped Rim & Warden Aegis\n"
                "  - Ch.3: Archive Beta & Null Sovereign\n\n"
                "⚪ *Phase 3: Vertical Slice (Chờ Gate 1 & 2)*\n"
                "⚪ *Phase 4: Metagame & Roster*\n"
                "⚪ *Phase 5: Release Build*"
            )
            await update.message.reply_text(status_text, parse_mode="Markdown")

        async def msg_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
            user_text = update.message.text
            agent_role = "PM (Lead Director)"
            if user_text.startswith("/dev"):
                agent_role = "Game Developer"
                user_text = user_text[4:].strip()
            elif user_text.startswith("/lore"):
                agent_role = "Lore Writer & Worldbuilder"
                user_text = user_text[5:].strip()

            reply = call_openrouter(agent_role, user_text, [], DEFAULT_OPENROUTER_KEY)
            await update.message.reply_text(f"🤖 *[{agent_role}]*:\n\n{reply}", parse_mode="Markdown")

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        app = ApplicationBuilder().token(token).build()
        app.add_handler(CommandHandler("start", start_cmd))
        app.add_handler(CommandHandler("status", status_cmd))
        app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), msg_handler))
        app.run_polling(close_loop=False)
    except Exception as e:
        print(f"[Telegram Bot] Lỗi khởi động: {e}")

if TELEGRAM_BOT_TOKEN:
    t = threading.Thread(target=run_telegram_bot, args=(TELEGRAM_BOT_TOKEN,), daemon=True)
    t.start()

# --- Gradio UI Layout (Gradio 6.0+ Compliant) ---
with gr.Blocks(title="RE:FRAY AI Studio") as demo:
    gr.Markdown("# 🎮 RE:FRAY — Autonomous Cloud Game Dev Studio")
    gr.Markdown("Hệ thống AI Agent điều phối và phát triển dự án **RE:FRAY (Match-3 RPG)** chạy 24/7 trên Cloud.")

    with gr.Tab("💬 Studio Chat"):
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
                placeholder="Nhập yêu cầu hoặc câu hỏi cho bot (vd: Báo cáo tiến độ Phase 1, viết tiếp kịch bản Ch.2...)",
                label="Tin nhắn",
                scale=8
            )
            send_btn = gr.Button("Gửi 🚀", variant="primary", scale=1)

        clear_btn = gr.Button("Xóa lịch sử chat")

        send_btn.click(chat_response, inputs=[msg_input, chatbot, agent_dropdown, api_key_input], outputs=[msg_input, chatbot])
        msg_input.submit(chat_response, inputs=[msg_input, chatbot, agent_dropdown, api_key_input], outputs=[msg_input, chatbot])
        clear_btn.click(lambda: [], None, chatbot)

    with gr.Tab("📊 Lộ Trình 5 Phase & Nghiệm Thu"):
        gr.Markdown("""
        ### LỘ TRÌNH DỰ ÁN & TIÊU CHUẨN NGHIỆM THU
        * **Phase 1: Game Feel & Block Animation**
          * Hàng đợi `AnimationStepQueue` tuần tự trong C++
          * Easing & Squash & Stretch khi rơi tiếp đất
          * Host tests C++: **738/738 PASS 100%**
        * **Phase 2: Narrative & Creative Worldbuilding**
          * Chương 1: Khu phế liệu Aster & Boss Sentinel Unit 07
          * Chương 2: Trạm kiểm soát Unmapped Rim & Boss Warden Aegis
          * Chương 3: Tàn tích Data Haven Beta & Boss Null Sovereign
        * **Phase 3: 3-Stage Vertical Slice Integration** (Ghép 3 màn chơi hoàn chỉnh)
        * **Phase 4: Metagame & Roster Progression** (Gacha, trang bị, menu đội hình)
        * **Phase 5: Release Build Web WASM & Unreal Engine 5**
        """)

    with gr.Tab("📱 Kết Nối Điện Thoại (Telegram / Discord)"):
        gr.Markdown("""
        ### Hướng dẫn kết nối Telegram Bot điều khiển trên điện thoại 24/7:
        1. Mở Telegram, tìm bot `@BotFather` và gõ `/newbot` để tạo 1 bot miễn phí (nhận được 1 chuỗi Token dạng `123456:ABC...`).
        2. Vào **Settings** của Hugging Face Space này $\\rightarrow$ mục **Variables and secrets** $\\rightarrow$ thêm **Secret**:
           * **Name:** `TELEGRAM_BOT_TOKEN`
           * **Value:** Dán token từ BotFather vào.
        3. Space sẽ tự khởi động Telegram Bot ngầm. Giờ bạn chỉ cần mở Telegram trên điện thoại và chat trực tiếp với bot mọi lúc mọi nơi!
        """)

if __name__ == "__main__":
    demo.launch(ssr_mode=False)
