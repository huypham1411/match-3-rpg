# TOOLS & GLOBAL SETUP BUNDLE (MULTI-MACHINE SYNC)
*Gói cài đặt tự động toàn bộ công cụ Cầu Nối Orthex và bộ kỹ năng Pstack Multi-Agent cho máy mới*

---

## 1. TỔNG QUAN

Thư mục này chứa kịch bản cài đặt tự động 1-click để bạn có thể mang toàn bộ môi trường làm việc thông minh này sang bất kỳ máy tính nào khác sau khi clone repository:

1. **Công cụ toàn cầu `orthex-bridge`:**
   - Được cài đặt vào `%USERPROFILE%\.local\bin` (tự động nhận PATH).
   - Cho phép bạn đứng ở bất kỳ ổ đĩa / thư mục nào cũng có thể gõ `orthex-bridge --watch` để đối thoại phản biện với Orthex.
2. **Bộ 3 Kỹ Năng Chuẩn Lauren Tan (Global Skills):**
   - Được nạp vào `%USERPROFILE%\.gemini\config\skills/`.
   - `pstack`: Bộ khung phân chia kiến trúc & nguyên tắc *Design It Twice*.
   - `pstack-michelin-rigor`: Quy tắc nghiệm thu nghiêm ngặt, bắt buộc có bằng chứng thực thi (*Receipts*).
   - `multi-agent-arena`: Quy trình phản biện đối thoại chéo, chống a dua (*Anti-Sycophancy*).

---

## 2. HƯỚNG DẪN CÀI ĐẶT TRÊN MÁY MỚI (1-CLICK)

### Trên Windows:
Sau khi clone repository về máy mới, bạn chỉ cần:
* Mở File Explorer, vào thư mục **`Tools\setup\`** và **nhấp đúp chuột vào file `install_global.bat`**.
* Hoặc mở PowerShell tại thư mục dự án và gõ:
  ```powershell
  .\Tools\setup\install_global.bat
  ```

### Trên macOS / Linux / Git Bash:
Chạy kịch bản shell:
```bash
bash Tools/setup/install_global.sh
```

---

## 3. KIỂM TRA SAU KHI CÀI ĐẶT

Mở một cửa sổ Terminal mới tại bất kỳ đâu và gõ:
```bash
orthex-bridge -h
```
Nếu màn hình hiện bảng hướng dẫn sử dụng của Orthex Bridge là hệ thống đã hoạt động hoàn hảo trên máy mới!
