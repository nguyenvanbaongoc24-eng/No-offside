# Tạo trận và chi tiết trận — 19/10/2026

## Thay đổi

- Form ba nhóm: thông tin trận; điểm danh; chi phí/tùy chọn thu gọn. Giao hữu/nội bộ, đối thủ và sân có thể chưa chốt. Ngày/giờ native riêng, kết thúc qua ngày, bản đồ HTTPS, dự toán chưa tạo giao dịch.
- URL `/matches/:id` giữ một trang chi tiết xuyên suốt vòng đời. Trạng thái giờ bắt đầu/kết thúc được tính lại khi tải trang; không tự suy đoán tỷ số hoặc có mặt.
- Tách đăng ký, đơn xin muộn, xác nhận thực tế, kết thúc trận, chốt vi phạm và ghi chi phí. Bốn nhóm thực tế loại trừ nhau, có nhóm chưa xác nhận. Giữ quy tắc không tự xác nhận/chốt vi phạm của mình.
- Chốt rõ ràng, xem trước; khóa sửa thường sau chốt. Điều chỉnh đặc biệt dùng Nội quy hiện có. Bổ sung/sửa tỷ số phải có lý do và lưu lịch sử.
- Chi phí liên kết một hóa đơn, đợt thu và sổ quỹ chung. Chọn người đóng riêng, phân bổ khớp VND; cá nhân ứng không tự ghi chi quỹ. Yêu cầu chuyển tiền chờ duyệt không tăng tiền đã thu. Sinh tố lúa mạch dùng người tham gia và hóa đơn riêng.
- Danh sách Sắp tới/Đã qua giữ trận hủy/lưu trữ và việc cần xử lý theo quyền. Nhân bản chỉ thông tin cấu hình, không sao chép kết quả/điểm danh/tiền.
- Fetch dữ liệu có kiểm tra phạm vi tài khoản/đội/trận. Realtime là tín hiệu lấy snapshot; bù bằng foreground, online và chu kỳ 15 giây.

## Migration

`supabase/migrations/202610190001_match_lifecycle.sql` đã chạy thành công trong SQL Editor project production `xofcoycdndyuuuxtwcwl` ngày 19/10/2026, trong một transaction. Không xóa hay suy diễn dữ liệu cũ. Thêm bảng sự kiện và xác nhận trận, RLS và RPC; chuyển điểm kích hoạt tiền phạt tự động từ kết thúc trận sang chốt rõ ràng. Các hàm cũ được giữ phía sau wrapper riêng, thu hồi quyền gọi trực tiếp.

Hai cấu hình hiện tại được giữ nguyên: mức vi phạm đến muộn của Nội quy và mức khoản quỹ tự động của đội. UI xem trước ghi tách hai cấu hình; không cộng hai số thành một khoản thu mới. Bản ghi cũ thiếu giờ kết thúc/tỷ số/thực tế/chi phí hiển thị chưa cập nhật, không tự gắn hóa đơn cũ.

## Kiểm chứng

- `npm test`: 252/252 đạt. Chín bài PostgreSQL/PGlite mới chạy toàn bộ migration nền và migration mới: quyền chéo đội, retry, thời gian, không suy diễn có mặt, kết thúc không tiền/phạt, chốt chống trùng/khóa sửa, kết quả có lý do, chi phí 1.200.000 − 200.000 = 1.000.000, chờ duyệt 800.000 không tính thu, duyệt xong còn 200.000, cá nhân ứng và hóa đơn giao lưu tách biệt.
- Build production đạt; có cảnh báo bundle chính lớn sẵn có, không thêm dependency.
- Preview cục bộ dùng React thật → `/api/sync` thật → PostgreSQL dùng một lần. Đã thao tác kết thúc 3:2 và tạo trận nội bộ 23:30 ngày 25/10 đến 01:30 ngày 26/10, chưa chốt sân. Tái hiện và sửa việc input ngày native bị mất khi nhập tiếp giờ.
- Chi tiết Light/Dark, cỡ chữ lớn ở viewport thực tế 320/360/390/430 px: không tràn ngang/thẻ, vùng nút tối thiểu 44 px. Form Dark cùng bốn chiều rộng: một vùng cuộn trong sheet; footer ở trong viewport, không tràn ngang.
- Kiểm tra production: RPC mới có sẵn; authenticated không được đọc trực tiếp bảng mới, anon không được gọi thao tác trận. Đã đăng nhập tài khoản test, chuyển đúng FC 37 và mở được trận cũ qua URL chi tiết; dữ liệu RSVP/đơn xin muộn cũ còn nguyên, thực tế vẫn chưa xác nhận.
- Auth và vận chuyển push của preview dùng một lần được giả lập; các kết quả này không chứng minh WebSocket hoặc push production.

## Preview

Ảnh chụp từ môi trường dùng một lần, không phải số liệu đội thật:

- [Form Light](previews/match-create-light.png)
- [Chi tiết Light](previews/match-detail-light.png)
- [Chi tiết Dark](previews/match-detail-dark.png)

## Giới hạn / bàn giao

- Chưa kiểm chứng bàn phím native và safe area trên thiết bị Safari iOS/Android thật. Mô phỏng viewport/chiều cao không thay thế kiểm thử thiết bị.
- Chi phí đã xác nhận không tạo lại hay âm thầm phân bổ lại. Điều chỉnh có lịch sử qua sổ quỹ hiện có; không có cơ chế tự di chuyển giao dịch cũ.
- Không gửi yêu cầu thu tiền giả hoặc duyệt giao dịch thật để kiểm thử production.
