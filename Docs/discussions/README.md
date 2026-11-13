# HỆ THỐNG PHẢN BIỆN ĐA AGENT: ORTHEX <-> ANTIGRAVITY (MICHELIN RIGOR)
*Tài liệu hướng dẫn vận hành vòng lặp đối thoại tự động giữa 2 hệ sinh thái AI*

---

## 1. TỔNG QUAN

Hệ thống được xây dựng dựa trên sự kết hợp giữa:
1. **Pstack Michelin Rigor của Lauren Tan (@poteto):** Kỷ luật kỹ thuật cao cấp, coi Human User là Bếp Trưởng (Executive Chef), các Agent là Bếp Phó chuyên môn; nguyên tắc "Verification-First" (Phải có bằng chứng thực thi, không chấp nhận báo cáo suông).
2. **Multi-Agent Arena & Anti-Sycophancy:** Chống bệnh "Lịch sự a dua", buộc các bot phải mổ xẻ rủi ro (Red-Teaming) trước khi chốt giải pháp.
3. **Clipboard Smart Bridge (`Tools/pipeline/orthex_bridge.py`):** Cầu nối siêu tốc giữa ứng dụng desktop Orthex và Antigravity mà không cần API key.

---

## 2. CÁCH SỬ DỤNG VÒNG LẶP LIÊN TỤC (CLIPBOARD SMART LOOP)

### Bước 1: Khởi động Cầu nối
Mở một cửa sổ Terminal (PowerShell) và gõ:
```bash
py -3 Tools/pipeline/orthex_bridge.py --watch
```
Cửa sổ sẽ chuyển sang chế độ lắng nghe tự động.

### Bước 2: Vòng lặp Đối thoại 2 Giây
1. **Ở cửa sổ Orthex:** Bạn hỏi Orthex một câu (ví dụ: *"Đề xuất thiết kế mô hình 3D và cơ chế chiêu thức cho Boss Sentinel Unit 07"*).
2. Khi Orthex trả lời xong, bạn chỉ cần bôi đen và nhấn: **`Ctrl + C`**.
3. **Cầu nối Antigravity:** Sẽ ngay lập tức:
   * Bắt lấy nội dung từ Clipboard.
   * Chấm điểm và mổ xẻ rủi ro kỹ thuật (Lõi C++, ngân sách xương $\le 64$, giới hạn Web 60FPS, học Blender miễn phí).
   * **Tự động nạp câu phản biện vào lại Clipboard** của bạn kèm âm thanh **`Ting!`**.
4. **Quay lại Orthex:** Bạn chỉ việc nhấn **`Ctrl + V`** và **`Enter`**.
5. Orthex sẽ đọc các phản biện kỹ thuật đó để hoàn thiện bản thiết kế, và bạn lại bấm `Ctrl + C` để tiếp tục hiệp tiếp theo!

---

## 3. CÁC TẬP TIN DỮ LIỆU
* `Docs/discussions/orthex_inbox.md`: Lưu trữ đề xuất mới nhất nhận từ Orthex.
* `Docs/discussions/orthex_outbox.md`: Lưu trữ luận điểm phản biện mới nhất của Antigravity.
* `Docs/discussions/DEBATE_LOG.md`: Toàn bộ nhật ký đối thoại xuyên suốt các hiệp.
* `.orthex/active-plan.md`: Tự động đồng bộ kế hoạch đã thống nhất để app Orthex đọc trực tiếp.
