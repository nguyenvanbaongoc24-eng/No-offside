# BỐI CẢNH DỰ ÁN (PROJECT OVERVIEW)
- **Tên dự án:** [ĐIỀN TÊN APP CỦA BẠN - ví dụ: Phủi Manager]
- **Mô tả:** Web App (PWA) quản lý đội bóng đá nội bộ (sân 7, sân 11) dành cho thị trường Việt Nam.
- **Nền tảng mục tiêu:** Mobile-first, Responsive Web.

# STACK CÔNG NGHỆ (TECH STACK)
- **Frontend:** React, Tailwind CSS.
- **Backend/Database:** Supabase (PostgreSQL).
- **Icons:** Lucide React (hoặc Heroicons).
- **Routing:** React Router (hoặc Next.js tùy config).

# GIAO DIỆN & UI/UX (DESIGN SYSTEM)
- **Theme:** Dark Mode mặc định.
- **Layout:** Bento Grid cho Dashboard.
- **Colors:**
  - Background: #121212 (Dark nhám)
  - Card/Surface: #1E1E1E (Bo góc `rounded-2xl`)
  - Primary Accent: #00FF66 (Xanh cỏ Neon)
  - Danger (Nợ quỹ/Báo vắng): #FF4C4C
- **Typography:** Font chữ cơ bản, sạch sẽ, tối giản. Các con số thống kê (bàn thắng, tiền quỹ) cần to và in đậm.

# CẤU TRÚC DATABASE CHÍNH (THAM KHẢO CHO COMPONENT)
1. `users`: id, full_name, avatar_url, phone_number.
2. `matches`: id, opponent_name, match_time, pitch_name, match_type (7v7/11v11).
3. `attendances`: match_id, user_id, status ('going', 'maybe', 'not_going').
4. `team_members`: user_id, role, fund_debt (số dư nợ quỹ).

# YÊU CẦU NHIỆM VỤ HIỆN TẠI (CURRENT TASK)
**Mục tiêu:** Xây dựng UI tĩnh (Static UI) cho màn hình "Trang chủ Cầu thủ (Player Dashboard)".
**Yêu cầu Component chi tiết:**
1. Tạo một layout chuẩn Mobile (`max-w-md mx-auto min-h-screen`).
2. Header: Hiển thị Avatar user, Lời chào "Chào [Tên], đội [Tên đội]".
3. Card 1 - "Trận đấu tiếp theo": Hiển thị thời gian, đối thủ, sân. Có 3 nút bấm to: [Đá chính/Có mặt] - [50/50] - [Báo vắng].
4. Card 2 - "Tài chính": Hiển thị số tiền nợ quỹ (màu đỏ) và nút [Thanh toán QR].
5. Card 3 - "Thống kê": Dạng 3 cột nhỏ: Số trận | Bàn thắng | Kiến tạo.
**Ràng buộc Code:** Component viết bằng functional React, sử dụng Tailwind CSS đầy đủ để style. Cung cấp mock data trực tiếp trong file để render giao diện ngay lập tức.