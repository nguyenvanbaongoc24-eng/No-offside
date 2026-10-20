# Rà soát quy trình sau trận — 20/10/2026

## Kết luận

Đã kiểm tra bằng phiên đăng nhập thông thường và RPC chỉ đọc. Trận được báo
còn việc có kết quả và đã thu đủ chi phí, nhưng còn chính người quản trị đang
xem chưa được người quản trị khác xác nhận thực tế. Vì vậy không được tự xóa
cảnh báo, tự đánh dấu có mặt/vắng hoặc tự chốt phạt để làm sạch danh sách.
Không thay đổi dữ liệu trận thật, schema hay chính sách phạt trong bản sửa này.

## Quy trình và thay đổi

- Đăng ký tham gia và đơn xin muộn không phải xác nhận thực tế tại sân.
- Kết thúc trận đưa vào Lịch sử; không tự chốt điểm danh, tạo phạt hoặc thu chi.
- Xác nhận thực tế bởi người có quyền; không tự xác nhận cho chính mình.
- Xem trước vi phạm rồi chốt khi đã kết thúc trận, đủ xác nhận thực tế và đã
  xử lý đơn xin muộn. UI hiển thị người còn thiếu, đơn còn chờ và lý do cần
  quản trị viên khác. Server tiếp tục kiểm tra lại tại lúc ghi.
- Chi phí độc lập: chưa xác nhận / đã xác nhận bằng 0 / còn phải thu / đã thu
  đủ. Xác nhận bằng 0 không còn yêu cầu chọn người ứng hoặc chia khoản thu.
- Bản chốt, kết quả, khoản thu và lịch sử được giữ lại; không reset dữ liệu.
- Trang chủ và Lịch sử dùng chung `matchPendingTasks`, dựa trên quyền thực
  tế. Không suy diễn thiếu projection là chưa hoàn tất. Trận hủy/lưu trữ
  không có việc chốt điểm danh mới; nghĩa vụ tiền còn thật vẫn hiển thị.
- Giờ đến đã ghi nhận dùng điều chỉnh có lý do trong Nội quy; không đưa
  người dùng vào một form sửa mà server chắc chắn từ chối.

## Kiểm chứng

- `npm test`: 275/275 kiểm thử qua, gồm RPC thật chạy PostgreSQL PGlite với
  vai trò owner/admin/member và dữ liệu dùng một lần.
- Kiểm thử hồi quy: thu đủ vẫn phải chốt thực tế; không tự xác nhận; pending
  late chặn chốt; preview không ghi phạt; chốt lại không tạo tiền trùng;
  completed cũ không có archivedAt vẫn thuộc lịch sử; quyền thủ quỹ riêng.
- `npm run build`: qua. Cảnh báo bundle lớn hiện có vẫn còn.
- UI thật → `/api/sync` → PostgreSQL dùng một lần: kết thúc 8–1, xác nhận
  chi phí 0, xác nhận người khác, kiểm tra nút chốt bị khóa và lý do cụ thể.
- Light/Dark tại 320/360/390/430 px: không tràn ngang; đóng modal gỡ khóa
  cuộn. Ảnh và số đo lưu ở `.ui-review/match-workflow-*` (không commit).
- Chưa kiểm chứng Safari iPhone hoặc Android trên thiết bị thật trong lượt này.
