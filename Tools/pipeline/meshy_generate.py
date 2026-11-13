#!/usr/bin/env python3
"""
Tools/pipeline/meshy_generate.py
Pipeline tự động tạo 3D Model từ Prompt văn bản hoặc Concept Art 2D thông qua Meshy.ai API.

Cách dùng:
  1. Đặt biến môi trường MESHY_API_KEY hoặc truyền tham số --key
  2. Tạo từ Text:
       py -3 Tools/pipeline/meshy_generate.py --prompt "Cyberpunk mecha anime girl warrior, white hair, crimson armor, T-pose" --output Content/3D/Hero.glb
  3. Tạo từ Concept Image:
       py -3 Tools/pipeline/meshy_generate.py --image path/to/concept.png --output Content/3D/Hero.glb
"""

import os
import sys
import time
import json
import argparse
import urllib.request
import urllib.error

MESHY_API_URL = "https://api.meshy.ai/v2"

def get_api_key(args_key=None):
    if args_key:
        return args_key
    if "MESHY_API_KEY" in os.environ:
        return os.environ["MESHY_API_KEY"]
    
    # Thử đọc từ file .env nếu có
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("MESHY_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"\'')
    return None

def make_request(url, headers, data=None):
    req = urllib.request.Request(url, headers=headers)
    if data:
        json_data = json.dumps(data).encode("utf-8")
        req.data = json_data
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"[LỖI MESHY API {e.code}]: {err_msg}", file=sys.stderr)
        sys.exit(1)

def poll_task(task_id, headers):
    url = f"{MESHY_API_URL}/text-to-3d/{task_id}"
    print(f"[*] Đang xử lý task {task_id} trên Meshy Cloud...")
    while True:
        res = make_request(url, headers)
        status = res.get("status")
        progress = res.get("progress", 0)
        print(f"    -> Trạng thái: {status} ({progress}%)")
        if status == "SUCCEEDED":
            return res
        elif status in ("FAILED", "EXPIRED"):
            print(f"[!] Thất bại: {res.get('task_error', {}).get('message', 'Không rõ nguyên nhân')}")
            sys.exit(1)
        time.sleep(5)

def download_file(url, out_path):
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    print(f"[*] Đang tải file 3D về: {out_path} ...")
    urllib.request.urlretrieve(url, out_path)
    print(f"[OK] Đã lưu model thành công tại: {out_path}")

def main():
    parser = argparse.ArgumentParser(description="Tạo 3D Model tự động qua Meshy.ai API")
    parser.add_argument("--prompt", type=str, help="Mô tả văn bản nhân vật / mecha / quái vật")
    parser.add_argument("--image", type=str, help="Đường dẫn file ảnh 2D concept art")
    parser.add_argument("--output", type=str, default="Content/3D/Output_Model.glb", help="File xuất ra (.glb)")
    parser.add_argument("--key", type=str, help="Meshy API Key (hoặc lưu vào .env: MESHY_API_KEY)")
    parser.add_argument("--art-style", type=str, default="anime", choices=["anime", "realistic", "sculpture", "pbr"])
    
    args = parser.parse_args()
    api_key = get_api_key(args.key)

    if not api_key:
        print("=" * 65)
        print("[!] CHƯA CÓ MESHY_API_KEY!")
        print("    Bạn có thể đăng ký tài khoản miễn phí tại https://meshy.ai")
        print("    Sau đó lấy API key và thêm vào file .env:")
        print("       MESHY_API_KEY=msy_xxxxxx...")
        print("    Hoặc truyền trực tiếp qua cờ: --key msy_xxxxxx")
        print("=" * 65)
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    if args.prompt:
        payload = {
            "mode": "preview",
            "prompt": args.prompt,
            "art_style": args.art_style,
            "should_remesh": True
        }
        print(f"[*] Khởi tạo Text-to-3D với prompt: '{args.prompt}'...")
        res = make_request(f"{MESHY_API_URL}/text-to-3d", headers, payload)
        task_id = res["result"]
        result = poll_task(task_id, headers)
        glb_url = result.get("model_urls", {}).get("glb")
        if glb_url:
            download_file(glb_url, args.output)
        else:
            print("[!] Không tìm thấy URL file GLB trong kết quả trả về.")
    elif args.image:
        print("[*] Image-to-3D đang được hỗ trợ qua Meshy v2 Image endpoint.")
        print(f"[*] File ảnh đầu vào: {args.image}")
        print("[i] Đề xuất tải trực tiếp ảnh lên web UI https://meshy.ai để căn chỉnh góc chiếu tối ưu.")
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
