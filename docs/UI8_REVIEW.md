# UI/UX 8 — geometry, profile birthday and Back navigation

Ngày hoàn tất: 16/10/2026. Nền tảng trước sửa: 33dddb2.

## Lỗi đã xác nhận và cách sửa

| Nhóm | Nguyên nhân | Thay đổi |
| --- | --- | --- |
| Cá nhân | Card 32px nhưng nội dung không có padding; row chạm sát mép | Token card 24px, padding 12–16px, row chữ dài được xuống dòng, quick action grid đều nhau |
| Tab/control | Nhiều lớp CSS dùng radius không theo chiều cao | Segmented padding 4px, radius cha 16px/con 12px, phần chọn nằm trong khung; giữ navigation viên thuốc |
| Badge chiến thuật | Đang chọn giống nút lớn | Nhãn trạng thái nhỏ, radius 6px |
| Nội quy/Vi phạm | App hardcode Back về Dashboard | Lưu nguồn nội bộ; UI Back và browser Back cùng history. Sheet sửa có entry riêng, đóng trước màn cha |
| Quỹ | Nhận onBack nhưng không render; tab/filter mất khi unmount | Hiện Back khi có nguồn hợp lệ, root không có Back giả; nhớ tab, bộ lọc và scroll theo tài khoản/đội; QR quay đúng tab trước đó |
| Toast | Thông báo ở đầu màn hình chặn Back ngay sau đổi theme | Đặt dưới vùng header; phần thông báo không chặn chạm, nút đóng vẫn hoạt động |
| Ngày sinh | Dữ liệu demo có birthday nhưng profiles server chưa có | Một cột date riêng tư, RPC lưu đúng auth.uid, native date picker 16px, DD/MM/YYYY bổ trợ, không UTC/không đặt giới hạn tuổi |

## Phạm vi và thiết kế

- Quỹ: số dư là trọng tâm, thu/chi phụ, menu Xuất báo cáo/Tài khoản nhận quỹ, tab Giao dịch/Chờ duyệt/Cần đóng. Không thay phép tính, duyệt hoặc giao dịch.
- Light/Dark dùng cùng geometry và token màu hiện có. Gradient nhận diện Cá nhân được giữ; không thêm gradient trang trí vào button.
- Motion: pressed 120ms nhẹ, tab 180ms, detail 240ms. Page fade và tiêu đề chuyển theo hướng; không transform container cha của sheet/input. Không chạy lại animation toàn trang khi countdown/dữ liệu cập nhật. Tôn trọng reduced-motion.
- Giữ cơ chế navigation cuộn có ngưỡng 24px và bỏ qua bounce ngoài giới hạn; clearance ổn định, không nhảy layout khi menu ẩn/hiện.
- URL /fund, /governance, /profile được nhận diện. Nội quy mở trực tiếp dùng fallback Cá nhân; chỉ gọi history.back khi có nguồn nội bộ do app tạo. Không tự lùi ra website khác.

## Migration và quyền riêng tư

202610160002_profile_birthday.sql đã áp dụng trên project Supabase đang liên kết.
- profiles.birthday lưu DATE, nullable; ngày không hợp lệ hoặc tương lai bị từ chối bởi RPC.
- Client cũ bỏ qua key birthday sẽ giữ giá trị hiện tại, không xóa ngoài ý muốn.
- Không mở quyền đọc profile khác, không thêm direct write cho authenticated.
- Roster chỉ có boolean birthdayToday tính theo timezone đội; không trả ngày/tháng/năm sinh của user khác. Dashboard, welcome, chat và màn thành viên dùng cùng nguồn này. Các dữ liệu manual/demo cũ không bị sửa.
- Kiểm thử thật trong transaction rollback trên tài khoản test đã chỉ định: lưu ngày nhuận, tải lại qua ensure_profile, từ chối tương lai, xác minh caller và RLS. Không để lại thay đổi ngày sinh test.
- Catalog xác nhận: kiểu date, anonymous_write=false, authenticated_write=true, birthday_banner_ready=true.

## Kết quả kiểm tra

- npm test: 184/184 đạt. Có test ngày nhuận/ngày không tồn tại/tương lai/để trống, riêng tư hồ sơ, tải lại phiên, nguồn Back, fallback, root tab, nested sheet và cleanup listener.
- npm run build: thành công, PWA precache thành công. Còn cảnh báo Vite chunk chính trên 500 kB; không có dependency mới.
- Repository chưa cấu hình script lint/typecheck riêng; code hiện dùng JavaScript/JSX.
- 32 lượt viewport: Cá nhân, Giao diện, Quỹ và date input × 320/360/390/430 × Light/Dark, gồm cỡ chữ Lớn. Không tràn ngang, active containment đạt, các control đo được ít nhất 44px. Input ngày sinh 16px, nằm trong container.
- Browser: Dashboard → Quỹ → tài khoản nhận quỹ → Quỹ → Dashboard; Cá nhân → Quỹ/Chờ duyệt → QR → Back giữ Chờ duyệt; mở lại Quỹ giữ tab; Cá nhân → Nội quy → sheet → browser Back đóng sheet → Back về Cá nhân.
- Browser: date picker nhập 29/02/2000, lưu hồ sơ demo, tải lại vẫn đúng; toast thành công; đổi Light/Dark rồi Back ngay không bị toast chặn.
- Preview console không có lỗi/cảnh báo trong các luồng kiểm tra.

## Giới hạn

Chỉ kiểm tra bằng browser viewport, chưa có Safari iOS/Chrome Android/PWA vật lý để kiểm chứng bàn phím native và safe area thực tế. Không thay đổi hồ sơ/tiền của người dùng thật để kiểm thử; phép thử live DB đều rollback. Chưa kiểm thử hai thiết bị vật lý đăng nhập đồng thời; persistence và riêng tư đã kiểm tra ở API/RPC cùng các phiên DB riêng.

## Preview

Trong thư mục visualization của task: ui8-profile-light.png, ui8-profile-dark.png, ui8-fund-light.png, ui8-fund-dark.png, ui8-birthday-dark.png, ui8-viewport-results.json. Dữ liệu preview là demo cục bộ.
