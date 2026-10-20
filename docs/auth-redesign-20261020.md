# Đăng nhập / Tạo tài khoản — 20/10/2026

Đã triển khai lại bố cục theo mockup, giữ component Login và các handler xác thực hiện có. Không sửa API, database, session/token, lời mời hoặc chính sách mật khẩu đúng 6 chữ số. Không thêm dependency.

## Thay đổi

- Header logo chính thức 38px bo góc, wordmark20px, bỏ khung/bóng; popover theme Sáng/Tối/Hệ thống và VI/EN giữ nguyên cơ chế áp dụng/lưu.
- Tiêu đề “Hẹn nhau ra sân.”, mô tả ngắn; tạo tài khoản có tiêu đề/form riêng. Bỏ segmented control và card lớn quanh form.
- Tài khoản đã nhớ hiện một hàng; quản lý/chuyển tài khoản trong sheet. “Quên tài khoản trên thiết bị này” chỉ sửa metadata localStorage như trước, không gọi xóa Auth user. Không lưu mật khẩu/token bổ sung.
- Sheet dùng một vùng cuộn, bỏ padding lồng. Focus vào nút đóng khi mở, Tab/Shift+Tab giữ trong sheet, Escape đóng và trả focus.
- Label “Mật khẩu” gọn ở sign-in, hướng dẫn dài chỉ giữ ở signup; Quên mật khẩu bên dưới bên phải. Google secondary với SVG thương hiệu; Demo thành liên kết phụ.
- Input16px/52px, nút chính52px, control theme44×44 và language64×44. Token màu chung, nền trắng ngà/mint hoặc xanh đen/xanh rừng; chữ nút theo on-primary để tương phản với xanh sáng ở Dark.
- Bổ sung autocomplete username/name/email/new-password đúng trường; hiện/ẩn mật khẩu dùng bàn phím. Chặn submit signin/signup lặp bằng ref đồng bộ, không thay payload/endpoint.

## Kiểm chứng

- `npm test`: **271/271 đạt**. Test mới chạy tương tác thật của React: chọn/quên metadata trên thiết bị không đăng nhập/xóa Auth user; theme/EN giữ toàn bộ trường signup; submit lặp chỉ1request; lỗi sai mật khẩu/email chưa xác minh không báo thành công; signup giữ payload/đi về signin; Google, khôi phục và Demo gọi handler cũ.
- `npm run build`: đạt. Không có script lint/typecheck trong package.json. Còn cảnh báo bundle lớn đã có từ trước.
- Browser với Login thật, auth/Google/email được giả lập trong `scripts/start-auth-review.mjs`: kiểm tra 0/1/3 tài khoản, quên→refresh vẫn không còn metadata, tên dài, sheet320×500 chỉ một vùng cuộn; Shift+Tab vòng về nút cuối, Escape trả focus.
- Đo signin/signup ở320/360/390/430/1280, Light/VI và Dark/EN: document không tràn ngang; input16px/52px; controls đủ44px. EN và Dark giữ sau refresh của fixture; test React xác nhận đổi tùy chọn không mất nội dung form.
- Enter gửi signin đúng, nút loading vẫn52px và disabled; lỗi sai mật khẩu hiển thị alert, giữ username/password. Không submit tài khoản thật để tạo lỗi hoặc làm khóa tài khoản.
- Preview: `.ui-review/auth-signin-light.png`, `auth-signin-dark.png`, `auth-signup-light.png`, `auth-signup-dark.png`. Đây là dummy metadata, không có thông tin xác thực thật. Kết quả đo `.ui-review/auth-layout-checks.json`.

## Giới hạn

Chưa kiểm chứng Safari iOS/Android, bàn phím hoặc password-manager autofill trên thiết bị thật. Đã khai báo style autofill/caret/selection/focus/disabled và mô phỏng màn thấp; không coi đó là kiểm thử hệ điều hành. OAuth Google thực và nhận thư xác minh/khôi phục chưa chạy end-to-end; chỉ kiểm chứng UI/handler/payload và hồi quy hiện có. Không tạo Auth user mới, không đổi mật khẩu thật.

Git/Vercel: triển khai project liên kết `no-offside`, domain `no-offside.vercel.app` theo quyền đã cấp; kết quả commit và deployment thực tế được xác minh khi bàn giao. Không có migration cần áp dụng.
