# BỐI CẢNH DỰ ÁN (PROJECT OVERVIEW)
- **Tên dự án:** No Offside
- **Theme:** Glasses Liquid (Kính mờ Glassmorphism trên nền Dark mode Liquid Gradient #0f172a).
- **Mục tiêu hiện tại:** Tích hợp logic Phân quyền (RBAC - Role-Based Access Control) vào màn hình Dashboard đã có. 
- **Quy trình:** Giả lập state ở Frontend trước khi đấu nối Supabase (chưa cần code backend/RLS).

# LOGIC PHÂN QUYỀN (ROLES)
Hệ thống có 2 vai trò chính (lưu trong state `currentUserRole`):
1. **`player` (Thành viên/Cầu thủ):** Chỉ xem thông tin, vote điểm danh cho chính mình, xem và đóng nợ quỹ cá nhân.
2. **`admin` (Đội trưởng/Ban quản trị):** Có toàn quyền xem và thao tác trên dữ liệu của đội.

# YÊU CẦU NHIỆM VỤ HIỆN TẠI (CURRENT TASK)
Cập nhật và viết lại component `PlayerDashboard.jsx` (hoặc tạo một Wrapper Component) đáp ứng các yêu cầu sau:

1. **Công tắc giả lập quyền (Role Switcher - Chỉ dùng cho Dev):**
   - Đặt một nút Toggle nhỏ gọn ở góc trên cùng màn hình (dùng hiệu ứng kính mờ).
   - Chức năng: Click để switch giá trị `currentUserRole` giữa `'player'` và `'admin'`.

2. **Render có điều kiện theo vai trò (Conditional Rendering):**
   Dựa vào `currentUserRole`, thay đổi UI của các Card trên Dashboard:

   * **Khu vực Header:**
     - Nếu là `admin`: Thêm một nút (Icon hình Bánh răng/Cờ lê) để vào "Cài đặt đội bóng".
     
   * **Card 1 - Trận đấu tiếp theo:**
     - Nếu là `admin`: Bổ sung thêm nút bấm phụ **[+ Tạo trận mới]** và **[Chỉnh sửa trận]** ở góc thẻ. Bổ sung dòng thống kê tổng quan: "Đã chốt: 14/20 người".
     - Nếu là `player`: Giữ nguyên 3 nút Vote điểm danh (Có mặt, 50/50, Báo vắng) cho cá nhân.

   * **Card 2 - Tài chính (Quỹ Đội):**
     - Nếu là `player`: Hiển thị số nợ cá nhân và nút quét QR đóng quỹ cá nhân.
     - Nếu là `admin`: Ẩn nợ cá nhân, thay bằng giao diện Quản lý tổng: Hiển thị **[Tổng quỹ hiện tại]**, số người đang nợ quỹ, và 2 nút hành động **[+ Tạo khoản thu mới]**, **[Duyệt tiền]**.

**Ràng buộc Code:** 
- Tiếp tục sử dụng Tailwind CSS với class kính mờ (`bg-white/10 backdrop-blur-md`).
- Sử dụng toán tử điều kiện `{currentUserRole === 'admin' ? (...) : (...)}` trong JSX để ẩn/hiện UI.
- Code phải gọn gàng, chia các phần riêng biệt cho Admin và Player dễ đọc để sau này tiện tách thành Component nhỏ.