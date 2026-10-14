# No Offside — UI xanh cỏ và navigation capsule

## Tham chiếu và phạm vi

Attachment chỉ chứa đặc tả chữ, không có ảnh mockup. Đã dùng bảng màu và hướng dẫn bố cục làm chuẩn; chưa thể đối chiếu tỷ lệ/pixel với ảnh. Không tìm thấy AGENTS.md trong repository. Nền triển khai là main `f2e9ec6`, giữ các sửa đăng nhập, dữ liệu và quản lý thành viên mới nhất.

Chỉ thay đổi trình bày, DOM thứ tự section, binding điều hướng hiện có và khả năng focus của thanh ẩn. Không thay API, schema, migration, dữ liệu, quyền, thao tác điểm danh/phạt/quỹ hay cơ chế lưu. Không thêm dependency. Các màn legacy không được App sử dụng không bị thiết kế lại.

## Design system

- Mở rộng `src/styles/refinement.css`: palette Light/Dark, spacing 4/8/12/16/20/24/32, radius 12/16/20, shadow nhẹ, motion 200 ms. Thay palette token cũ và bỏ CSS navigation cũ xung đột trong index.css.
- Light: nền #F5F7F6, bề mặt trắng; Dark: nền #0B1210, bề mặt #141E1A, lớp phụ #1B2722, lớp nổi #202E27. Các surface, modal và menu dùng chung token.
- Accent chữ Light được điều chỉnh từ #17843B thành #137C34 để đạt tương phản trên accent-soft. Primary fill Light giữ #17843B/chữ trắng; Dark #63CD79/chữ #0B1210. Text-muted Light cũng được làm trầm hơn giá trị gợi ý.
- Gradient tập trung ở header Dashboard/nhận diện auth/lời mời/empty home. Vùng có chữ sáng được giữ trên nền xanh trầm; đoạn chuyển sáng nằm ở khoảng nền hoặc sau bề mặt control đục. Nội dung dài dùng nền ổn định. Không animate gradient, không glow/glass.
- Giữ lựa chọn font hệ thống/Be Vietnam Pro và cỡ chữ cá nhân. Input 16 px tối thiểu; metadata 13–14 px, tiêu đề 22–27 px; sentence case cho tiêu đề danh sách chiến thuật.
- Logo ứng dụng dùng asset PWA hiện có, giữ tỷ lệ và bo góc. Header đội dùng logo đội khi có; không thay toàn bộ bằng logo ứng dụng.

## Layout và component

- Chuẩn hoá AppShell/header/card/control/modal qua class và token hiện có, không tạo component trùng chức năng.
- `FloatingBottomNavigation` là component dùng chung duy nhất mới: capsule 68 px, năm cột đều, nhãn 11 px, icon Lucide 23 px/1.75, mint highlight, focus-visible rõ. Nhãn dài được xuống dòng ở 320 px. Avatar Cá nhân giữ nguồn thật và không đổi kích thước theo trạng thái.
- Giữ hook scroll/bounce/keyboard/drag hiện có. Thanh ẩn có inert, aria-hidden và tabIndex -1, không nhận pointer. Padding đáy/composer tính theo chiều cao capsule, khoảng nổi và safe area.
- Dashboard: nhận diện/chọn trận → trận và điểm danh → thao tác nhanh → quỹ → quản lý/mời thành viên → thông tin phụ. Điều kiện quyền và callback giữ nguyên.
- Hàng thành viên tự wrap, không đẩy action ra khỏi card. Số tiền lớn trong giao dịch được xuống dòng thay vì tràn hoặc bị cắt.
- Modal thêm thành viên chuyển phần form sang cuộn nội bộ và hàng hành động sticky. Sửa label Dark còn dùng slate tối. Nút đóng form tăng từ 36 lên 44 px.
- Bong bóng chat và theme-color của trình duyệt dùng palette hiện tại; QR vẫn nền trắng.

## Kiểm tra

- `npm test`: 71/71 pass. Kiểm tra navigation mới xác nhận năm accessible name, định tuyến callback, active tab và thanh ẩn không nhận focus. Các test nghiệp vụ/đăng nhập/lưu dữ liệu có sẵn vẫn pass.
- `npm run build`: pass, PWA precache 11 entry; không đưa trang fixture vào public/dist. `git diff --check`: pass. Repository không có script lint/typecheck.
- 24 case × Light/Dark × 320/360/390/430/1280 = 240 phép đo layout: không tràn ngang; các control đo nằm trong viewport; button ≥44×44; nhãn navigation không bị cắt. Có case tên dài và số tiền lớn.
- Probe tương phản văn bản trực tiếp trên nền màu phẳng không còn cặp dưới ngưỡng 4.5:1 (chữ lớn 3:1). Probe không đo gradient, alpha compositing hoặc nội dung nằm trong SVG; không coi đây là audit WCAG đầy đủ.
- Viewport 390×420: nút submit form trận bottom 405 px; thêm thành viên 394.25 px, trong viewport 420 px. Đây là mô phỏng viewport thấp, không phải bàn phím thiết bị thật.
- Đã thao tác màn Login chạy thật: đổi theme, VI/EN, tải lại; lựa chọn giữ nguyên, input 16 px và browser theme-color khớp palette.
- Các màn sau đăng nhập được render từ component thật với dữ liệu minh hoạ và callback không ghi dữ liệu, không phải authenticated E2E. Chưa kiểm thử Safari iOS/Chrome Android trên thiết bị thật, native autofill/date picker hay quét QR bằng camera.

## Vấn đề chức năng ghi riêng

Không xác nhận lỗi chức năng mới trong lần chỉnh UI này. Chưa kiểm chứng trực tiếp luồng API/Supabase production; không suy diễn kết quả UI fixture thành kiểm thử backend.

## Artifact

Thư mục ảnh: `C:/Users/LENOVO/.codex/visualizations/2026/10/12/01a13145-d075-7c53-9fba-640488767c3e/`.

Ảnh `grass-{home,tactics,fund,chat,profile,members,settings,form,onboarding,memberform}-{light,dark}.png` là render component thật với dữ liệu minh hoạ. `grass-measurements.json` lưu số đo và giới hạn. `grass-ui-review.html` là artifact kiểm chứng cục bộ; có thể chọn `?screen=home&theme=dark` và các tên case trong script.

Tái tạo: chạy build, rồi `node scripts/render-ui-review.mjs`. File mặc định nằm trong `.ui-review` (gitignored), không xuất lên production.
