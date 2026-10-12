# BỐI CẢNH DỰ ÁN (PROJECT OVERVIEW)
- **Tên dự án:** No Offside
- **Mô tả:** Mobile Web App (PWA) quản lý đội bóng đá nội bộ (sân 7, sân 11) cho thị trường Việt Nam. Cho phép người dùng "Add to Home Screen" để sử dụng như app Native.
- **Quy trình hiện tại:** Xây dựng tĩnh (Static UI) màn hình Dashboard (Trang chủ) với Mock Data trước, sau đó mới làm luồng Sign In.

# STACK CÔNG NGHỆ & PWA
- **Core:** Vite + React (Functional Components, Hooks).
- **Styling:** Tailwind CSS.
- **Icons:** Lucide React (hoặc Heroicons).
- **PWA Ready:** Cấu trúc layout cần chuẩn bị sẵn để tương thích với `vite-plugin-pwa` (có file manifest, service worker sau này).

# GIAO DIỆN & UI/UX (GLASSES LIQUID THEME)
- **Concept:** Glassmorphism (Kính mờ) trên nền Liquid (Chất lỏng chuyển màu).
- **Background:** Nền tối (Dark mode) kết hợp các khối gradient mờ dạng liquid (ví dụ: Xanh Cyan nhạt, Tím nhạt hòa vào nền đen `#0f172a`).
- **Cards/Components:** Sử dụng hiệu ứng kính (Glassmorphism) với Tailwind: `bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl`.
- **Typography:** Không viền, text trắng (`text-white`), nhấn mạnh các con số bằng màu nổi (ví dụ: Xanh Neon hoặc Vàng Gold).

# YÊU CẦU NHIỆM VỤ HIỆN TẠI: CODE MÀN HÌNH DASHBOARD
Viết toàn bộ code cho màn hình `PlayerDashboard.jsx` (hoặc `App.jsx`) bao gồm các thành phần sau, sử dụng Mock Data tích hợp sẵn:

1. **Mobile Layout Container:** 
   - Khung `max-w-md mx-auto min-h-screen relative overflow-hidden`.
   - Tạo các thẻ `div` làm hiệu ứng liquid gradient blur ở background.

2. **Header (Kính mờ):** 
   - Avatar user, Lời chào: "Chào Cầu thủ, Số 9", Tên đội bóng.

3. **Card 1 - Điểm danh trận tới (Upcoming Match):**
   - Nội dung: Tên đối thủ, Thời gian (Ví dụ: 18:30, Thứ 6, 24/10), Sân thi đấu.
   - Action: 3 nút bấm (Button) nổi bật: [⚽ Có mặt] - [🤔 50/50] - [❌ Báo vắng]. 
   - Cần có state đơn giản để khi click đổi màu nút (Active state).

4. **Card 2 - Tài chính (Quỹ Đội):**
   - Trạng thái nợ quỹ. Nếu nợ: Hiển thị số tiền đỏ (`-150.000đ`) và nút [Quét QR đóng quỹ]. Nếu không nợ: Tick xanh "Đã đóng đủ".

5. **Card 3 - Thống kê cá nhân mùa này:**
   - Dạng Grid 3 cột: Số trận (5) | Bàn thắng (12) | Kiến tạo (4).

**Ràng buộc Code:** 
- Trả về mã nguồn React nguyên vẹn có thể chạy ngay lập tức.
- Phải có UI bóng bẩy, đúng chuẩn "Glasses Liquid" bằng các class Tailwind.