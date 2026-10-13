# Bàn giao giao diện No Offside — 13/10/2026

## Nguyên nhân và sửa đổi

| Hạng mục | Nguyên nhân | Thay đổi |
| --- | --- | --- |
| Font | Một số utility font-mono ghi đè lựa chọn cá nhân; control có kiểu riêng | Font chung qua --font-ui cho trang, control, sheet, menu; giữ cỡ input 16px; không can thiệp giao diện picker native |
| Cá nhân | Form hồ sơ, phân quyền và nhiều thao tác đều mở trên một màn | Menu nhóm và hàng SVG; chi tiết mở màn riêng; các thao tác phân quyền và xác nhận cũ được giữ; không hiển thị chuyển đội/mời thành viên khi chưa có callback hỗ trợ |
| QR | Chỉ tạo ảnh từ tài khoản, không có upload; lưu state trước khi biết ghi storage thành công | Hai nguồn ảnh, kiểm tra magic bytes/decoder/kích thước 128–4096px và dung lượng 1MB; xem trước nguyên ảnh, thay/xóa bản nháp; Save ghi storage trước khi thông báo thành công; giữ thông tin người nhận và cảnh báo chưa đối chiếu |
| Ngân hàng | Danh sách 9 mã hardcode | VietQR /v2/banks, lọc transferSupported=1 và BIN hợp lệ; cache 24 giờ, dùng danh mục đã lưu khi offline, tìm tên/viết tắt/mã/không dấu trong bộ nhớ |
| Control/Dark | Màu utility rời rạc, placeholder/autofill không có màu riêng; nhiều gradient và bóng | Token nền/surface/elevated/chữ/chữ phụ/viền/accent/trạng thái/focus; caret, selection, disabled, readonly và autofill theo token; native select appearance:none + một chevron SVG; loại bỏ gradient/bóng trang trí ở Dark |
| Thời gian quỹ | Form sửa không có giờ; date cũ chỉ là chuỗi ngày | Thêm và sửa dùng chung datetime-local; occurredAt ISO UTC, hiển thị theo timezone đội; thời điểm tạo/sửa riêng; ngày cũ giữ nguyên và ghi chưa biết giờ nếu không bổ sung; adjustments lưu before/after/actor/time, không thay mảng lịch sử cũ |
| Thẻ trận | Dashboard có margin âm; gesture và confirm ở cùng stacking context | Bỏ margin âm; thẻ và nội dung chiếm đủ chiều cao trong flow; chỉ lớp nội dung translate ngang trong vùng gesture; confirm portal ra body, focus/Escape quan sát cả portal; hủy confirm reset offset |

## Kiểm chứng thực tế

- Snapshot riêng của các thay đổi lượt này: **43 tests qua**, Vite/PWA build qua. Không gom các thay đổi đăng nhập/onboarding đang thực hiện trong chat khác vào commit.
- Test mới: BIN hỗ trợ và tìm không dấu, magic bytes/ảnh giả/giới hạn dung lượng, timezone và DST gap, ngày không hợp lệ, giữ ngày cũ và lịch sử điều chỉnh, menu theo quyền.
- Browser preview: form quỹ Light và Dark ở 320/360/390/430px đều scrollWidth=clientWidth; input/select 16px; nút Save bottom=828 trong viewport cao 844px; cùng font Be Vietnam Pro. Native select có appearance:none.
- Đổi font/theme áp dụng ngay; font/theme giữ sau refresh. Hệ thống theo môi trường browser đang dùng Dark đã được quan sát trước khi chọn theme thủ công.
- Tạo giao dịch mẫu 12/10 23:40, mở sửa hiển thị đúng giờ cũ, sửa sang 13/10 00:15, refresh vẫn đúng ngày/giờ. Không thử giao dịch tiền thật.
- Danh mục VietQR hiện trả 65 mục, 42 mục transferSupported=1. Tìm `quan doi` chọn đúng MBBank/BIN 970422.
- Upload QR fixture chứa chữ `NO OFFSIDE PREVIEW QA - NOT A PAYMENT`, Save rồi refresh vẫn đọc ảnh 256×256, object-fit:contain, nền trắng. Đây là kiểm thử lưu ảnh, không phải xác minh nội dung thanh toán.
- Thẻ trận có chiều cao container = nội dung (730px ở viewport kiểm tra), nằm dưới thẻ Thành viên; swipe offset -88px không tạo dialog/xóa, bấm Xóa mở confirm, Giữ trận reset 0px.
- Chỉ kiểm tra browser Chromium/viewport. **Chưa có Safari iOS/Chrome Android thật**, chưa xác nhận native keyboard/date picker/autofill thực tế trên hai hệ điều hành. CSS autofill và token đã triển khai nhưng không gọi đó là kiểm thử autofill thiết bị thật.
- Repository chưa có script lint/typecheck; dùng build và tests hiện có. Không đổi phép tính tổng thu/chi/số dư hoặc mô hình phân quyền.

## Storage và giới hạn

QR và quỹ dùng localStorage hiện có, theo tài khoản + đội; dữ liệu không tự đồng bộ sang thành viên hoặc thiết bị khác. Quyền thao tác vẫn qua callback kiểm tra owner/admin. Đây không phải kiểm chứng RLS hoặc kho ảnh server: cần bucket riêng tư, membership/RLS server, upload/signed-read và đồng bộ team settings trước khi có tính năng chia sẻ ảnh thật. Không dựng public bucket hay áp dụng SQL trên production.

Các bản điều chỉnh quỹ là lịch sử local, người có quyền quản trị dữ liệu thiết bị có thể sửa; không khẳng định audit bất biến ở database.

Nguồn danh mục: [VietQR banks API](https://www.vietqr.io/danh-sach-api/api-danh-sach-ma-ngan-hang/), [Quick Link BIN](https://www.vietqr.io/en/danh-sach-api/link-tao-ma-nhanh/).

Nhánh: codex/mobile-ui-refinement. Preview tự build từ Git; main và production giữ nguyên.

Preview kiểm tra: https://no-offside-5v3fatq76-ngoc-nguyens-projects-c2fd1451.vercel.app/. Hộp thoại archive tại commit 3888c4a đã xác nhận focus vào Đóng, nav inert, body scroll khóa và Escape đóng đúng. Bản cập nhật tiếp theo chỉ bổ sung padding safe-area trên màn Cá nhân.
