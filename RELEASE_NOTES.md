# No Offside — sửa giao diện và dữ liệu trên thiết bị

Danh sách trận hỗ trợ vuốt trái ít nhất 80 CSS px để xóa cho Owner/Admin,
giữ cuộn dọc và hỗ trợ nút xóa bằng bàn phím. Có thể hoàn tác trong 10 giây,
kể cả khi đã xóa trận cuối; điểm danh và báo cáo được khôi phục cùng trận.
Xóa trận không thay đổi giao dịch quỹ. Mục điều hướng “Sa bàn” đổi thành “Sơ đồ”.

Font mặc định dùng font hệ thống (`-apple-system`, `system-ui`). iPhone dùng
font iOS; Windows và Android dùng font tương ứng. Có thể chọn Be Vietnam Pro.
Đã tăng cỡ chữ nhỏ, vùng chạm, tương phản, trạng thái nhấn/chọn, nhãn điều hướng;
hộp thoại nằm trên thanh điều hướng và hỗ trợ Escape, Tab, khôi phục focus.

Quỹ dùng một nguồn dữ liệu; duyệt khoản nộp chỉ ghi thu một lần, đối chiếu đúng
cầu thủ/tháng. Thành viên gửi yêu cầu xác nhận thay vì tự đánh dấu đã đóng.
QR được tạo từ ngân hàng/tài khoản/nội dung hiện tại. Hồ sơ, đội hình, tin nhắn,
lịch đấu và cài đặt được lưu trên thiết bị. Thống kê lưu lại một trận thay thế
báo cáo trước; điểm danh và danh sách được tính từ cùng roster. Đội mới bắt đầu
với sổ quỹ và lịch đấu trống. Kiểm tra số áo trùng, số tiền, giờ đá và hạn chốt.
Quyền Owner/Admin/Member được thống nhất trong các thao tác trên giao diện.

Đăng nhập email dùng Supabase Auth thực tế. OTP sai không tạo phiên. Trải nghiệm
dữ liệu mẫu là lựa chọn riêng; chuyển vai trò chỉ được bật trong trải nghiệm.
SMS hiện chưa bật ở Supabase nên tùy chọn điện thoại bị vô hiệu hóa.

## Giới hạn cần xử lý trước khi vận hành nhiều thành viên

Dữ liệu đội **chưa đồng bộ lên Supabase**. Quỹ, chat, vai trò, điểm danh và link
mời đang hoạt động trên thiết bị; link mời không có dữ liệu trên thiết bị khác.
Phân quyền UI/localStorage không phải là bảo mật server. Email Auth không tự
biến dữ liệu cục bộ thành dữ liệu dùng chung. App hiển thị rõ trạng thái này.

`supabase/schema.sql` bỏ các policy đọc công khai và cập nhật điểm danh vô điều
kiện. Thay đổi SQL này **chưa được chạy trên database đang triển khai** vì phiên
làm việc chỉ có quyền Vercel/Git, không có quyền quản trị SQL Supabase. Cần quyền
quản trị project để kiểm tra dữ liệu hiện có, áp dụng migration, xây membership
RLS/server mutations và nối client vào các bảng trước khi dùng dữ liệu thật.
Không đưa secret/service-role key vào biến VITE_ hoặc bundle trình duyệt.

Thông báo nhắc đóng quỹ/điểm danh hiện ghi trong app; SMS, Zalo, push không được
kết nối. Không hiển thị thành công giả cho việc gửi thông báo ra ngoài.

## Kiểm tra

`npm test`: kiểm tra duyệt quỹ một lần, báo cáo thay thế, roster/điểm danh,
thăng quyền/chuyển Owner, URL QR, xóa trận cuối và hoàn tác không ghi đè dữ liệu
khác. `npm run build`: Vite + PWA production.

Chưa xác minh thao tác cảm ứng trên Safari iOS/Chrome Android hoặc PWA trên
thiết bị thật. Kiểm thử trình duyệt local trong phiên thêm tính năng vuốt bị
chặn bởi chính sách URL của công cụ; không coi các unit test là kiểm thử mobile.
