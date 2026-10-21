# Tìm đối — UI Light/Dark, 21/10/2026

## Phạm vi

Thiết kế lại phần trình bày và bộ lọc, giữ API, schema, xác thực, quyền đại diện,
dữ liệu từng đội và quy trình đề nghị/xác nhận hai bên. Không có migration,
dependency hoặc dữ liệu production mới trong lượt này. Không có AGENTS.md
trong repository hoặc thư mục cha D:/ khi khảo sát.

File đính kèm lần này chỉ có đặc tả chữ, không có ảnh Light/Dark riêng;
bố cục được đối chiếu với các tiêu chí trong đặc tả và ảnh chạy thực tế.

## Thay đổi

- Header cân giữa; menu `…` mở sheet Tiện ích đội chứa toàn bộ mục cũ và
  đường sang Chiến thuật. Back vẫn dùng `navigation.back('profile')` hiện có.
- Đội đại diện và nút Đăng tìm đối cùng hàng; tên dài co giãn, không lặp tên.
  Quyền đăng tiếp tục lấy từ server, không suy đoán từ UI.
- Ba tab chữ/gạch chân, ARIA tablist/tab/tabpanel, roving focus,
  ArrowLeft/Right/Home/End. Đổi tab giữ bộ lọc, không tạo truy vấn riêng.
- Bộ lọc ngoài trang chỉ có khu vực và ba control. Sheet giữ nháp riêng;
  đóng/Escape không áp dụng; Đặt lại sửa nháp; Áp dụng mới cập nhật danh sách.
  Giờ kết thúc phải sau giờ bắt đầu. Ngày/giờ native xử lý cả input/change
  để giữ đúng giá trị trên browser có sự kiện native khác nhau.
- Có chỉ báo đang lọc, xóa nhanh và số kết quả thật. Ngày trên chip là DD/MM,
  accessible name/tooltip vẫn có ngày đầy đủ. Trường ngày trong sheet giữ năm.
- Thẻ ưu tiên trạng thái/loại sân, tên đội, ngày/khung giờ, sân/khu vực và
  nút Xem kèo. Chi phí vẫn ghi rõ dự kiến; ngày qua đêm không mất ngày kết thúc.
  Thời điểm đăng chỉ hiện khi API có dữ liệu. Không hiển thị actor riêng tư.
- Tiện ích đã lưu thu vào disclosure, giữ các nút dùng/lưu theo entitlement.
- Palette semantic giới hạn trong module/sheet; gradient tĩnh nhẹ đầu trang,
  card radius 16px, controls 10–12px; font và Material SVG giữ hệ thống hiện có.
- Tái sử dụng FloatingBottomNavigation và nguồn unread chung. Route Pro chọn
  Cá nhân theo component hiện có, bỏ FAB trên Pro. Giữ scroll-hide/hysteresis,
  keyboard handling và một nguồn padding/safe-area chung của App.
- Tái sử dụng ProModal, focus trap/restore, Escape, click backdrop, scroll lock,
  scroll nội dung và reduced motion. Chỉ thêm prop className tùy chọn cho sheet.
- Lỗi API ban đầu hiện lỗi/Thử lại, không đồng thời khẳng định danh sách rỗng.

## Kiểm chứng

- `npm test`: **290/290 đạt**, gồm test draft/cancel/reset/apply/validation,
  giữ lọc khi đổi tab, native input event và lỗi API không giả thành dữ liệu rỗng.
- `npm run build`: đạt. Không có script lint/typecheck trong package.json.
  Cảnh báo chunk lớn có sẵn vẫn còn.
- Browser với React/API Sync thật và PostgreSQL PGlite dùng một lần; auth/push
  transport giả lập. Không đăng tin kỹ thuật lên production.
- Light/Dark: 320/360/390/430px và desktop1280; không cuộn ngang, tab không
  tràn, mọi button nhìn thấy đạt ít nhất44px. Sheet320–430 không tràn, input16px.
- Danh sách0/1/5 kèo, tên đội/sân dài, Xem kèo, keyboard tab, menu quyền lợi,
  sheet hủy/áp dụng/reset, giờ không hợp lệ, ngày lọc và xóa lọc đã thử trên UI.
- Đã kiểm tra lỗi503 và độ trễ1,5giây bằng fixture; nút Thử lại lấy lại được kèo.
  Hook regression vẫn kiểm tra response cũ khi đổi đội/tài khoản và cleanup.
- Cuộn cuối danh sách5 kèo: nút thẻ cuối nằm trên nav; không thêm margin đáy.
  Sheet có nút Áp dụng trong viewport, đóng xong gỡ overflow hidden/trả focus.
- Tương phản token: Light text15,43:1; secondary5,23:1; primary4,75:1.
  Dark text16,02:1; secondary7,40:1; primary9,08:1.
- Screenshot preview dữ liệu dùng một lần:
  `.ui-review/mm-redesign-light.jpg`, `.ui-review/mm-redesign-dark.jpg`.
  Số đo `.ui-review/mm-redesign-responsive.json`.

## Giới hạn

Chưa kiểm chứng Safari iOS/Android và bàn phím/safe area trên thiết bị thật.
Native picker, reduced motion và inset dùng nền tảng/component hiện có;
browser desktop không thay thế kiểm thử thiết bị. Không thay đổi vận chuyển
Supabase Realtime/push hoặc chạy load test backend trong lượt UI này.
