# Review và cải thiện UI — 13/10/2026

## Phạm vi

Nhánh riêng `codex/ui-review-oct13-isolated`, checkout riêng để không ghi đè công việc xác thực ở thư mục dùng chung. Mốc xác thực đã giữ: `7b298e6`. Không có AGENTS.md trong repository hoặc các thư mục cha đã kiểm tra.

Chỉ chỉnh CSS/token, class/layout, icon và cấu hình chuyển động. Không sửa database/migration, API, hook xác thực, phân quyền, điểm danh, giao dịch, phép tính, lưu/xóa hoặc dữ liệu đội. Không merge main và không deploy production trong lượt này. Không thêm dependency.

## Lỗi đã tái hiện và sửa

| Vấn đề xác nhận | Nguyên nhân | Sửa UI |
| --- | --- | --- |
| Sheet thành viên: số lượng bị xuống từng chữ số | Tiêu đề dài, flex co badge và không giữ chiều rộng | Tiêu đề “Thành viên đội”, badge không co và nowrap, action giữ vùng chạm |
| Filter thành viên và hàng hover quá sáng ở Dark | Utility màu trắng/xám có opacity không được map sang theme | Surface/elevated/inset dùng token; row và hover giữ chữ đọc được |
| Chữ cam/hồng ở home và nút Xóa thành viên thiếu tương phản Light | Dùng amber-600, rose-500/600 trên nền rất nhạt | Map trạng thái qua warning/danger/success token |
| Số áo vàng/xanh ở Chiến thuật thành chữ trắng Dark | Quy tắc dark chung đổi text-slate-950 sang trắng | Token on-highlight riêng trên chấm cầu thủ sáng; không đổi vị trí, kéo, chọn hoặc lưu |
| Thẻ sơ đồ chưa chọn ở Dark bị nền sáng | bg-white/80 chưa có theme mapping | Map surface và hover sang nền tối |
| Tạo đội: chữ trắng trên xanh sáng; back/role label nhạt Light | Màu riêng #22C55E và header giả định nền tối | Màu primary/on-primary chung; chữ header theo theme |
| Mô tả dữ liệu trống Dark bị nhạt | Selector empty-state p ghi đè màu chữ phụ | Dùng secondary-text token |
| Login còn emoji, đốm blur và chữ helper 10–11px | Mark/logo và style riêng trong màn | Shield SVG cùng Lucide, bỏ đốm màu/glow/glass, helper theo caption token; không đổi form/luồng đăng ký |
| Chuyển động chưa đồng nhất | Spring riêng, nhấn co xuống 0.9, thiếu reduced-motion ở Motion | 220ms easing chung, scale nhấn nhẹ 0.98, MotionConfig reducedMotion=user và CSS media guard |

Thẻ trận ở bản khảo sát **không còn đè lên Thành viên**: member bottom=481px, card top=644px. Giữ flow/clipping/stacking và toàn bộ gesture hiện có, chỉ chỉnh bề mặt/viền. Header Tạo sơ đồ và menu Cá nhân đã gọn; giữ cấu trúc và chức năng hiện có.

## Quyết định thiết kế

- Gradient tĩnh ở header trang chủ: xanh cỏ rất nhạt → xanh lá nhạt → xanh ngọc nhạt cho Light; xanh đen → xanh trầm → xanh ngọc đen cho Dark. Nền nhận diện login dùng cùng palette, không dùng đốm blur. Không animate gradient.
- Nền app, surface, elevated và inset chia lớp vừa đủ; button/card/tab dùng màu phẳng. Loại bớt bóng và viền nặng, radius card 16px/sheet 20px.
- Font hệ thống hoặc Be Vietnam Pro đều qua --font-ui; caption/body/description dùng token và tôn trọng cỡ chữ đã chọn. Input giữ 16px ở mọi lựa chọn. Không ép picker native.
- Giữ một bộ Lucide, stroke gọn; logo OAuth Google là SVG thương hiệu hiện có. Không thêm shortcut hay chức năng.
- Safe area header dùng token page-safe-top, tránh cộng lại khi session banner đã chiếm safe area. Sheet giới hạn theo visual viewport; footer vẫn sticky. Không đổi quy tắc ẩn/hiện nav.

## Kiểm chứng

- **64 tests qua**, Vite/PWA build qua. Repository không có script lint/typecheck.
- Khảo sát trực tiếp bản app: login/đăng ký, home, member sheet, tactics, fund/form, chat, profile, settings và form gia nhập. Source của onboarding/tạo đội, dropdown và trạng thái trống/lỗi cũng được rà.
- Bản xác thực mới đã gỡ demo; để kiểm tra đủ view mà không sửa xác thực, dùng `scripts/render-ui-review.mjs` render component thật với dữ liệu minh họa. Bản này **không hydrate nghiệp vụ, không gọi API và không kiểm chứng tương tác nghiệp vụ**. Trang public tạm dùng để QA đã được gỡ khỏi app bàn giao.
- **180 phép đo layout**: 18 view/state × Light/Dark × 320/360/390/430/1280px. Không có tràn ngang, input vượt viewport, button dưới 44×44px hoặc font control lệch; input text/number/date/select/textarea tối thiểu 16px.
- Đo tương phản chữ render từ foreground/background thực tế; các lỗi tìm được đã sửa và đo lại. Gradient được kiểm tra thêm tại ba màu dừng: chữ phụ tối thiểu **5,04:1 Light**, **7,71:1 Dark**.
- Kiểm tra font hệ thống cỡ lớn ở 320px cho home/members/form/profile/onboarding: không tràn. Thử focus, caret, selection, disabled/readonly ở bản render.
- Viewport thấp 390×420px: sheet cao 396px, nút Save bottom≈404px, nằm trong viewport. Đây là mô phỏng vùng hiển thị thấp, **không phải kiểm thử bàn phím thiết bị thật**.
- Login và chuyển tab đăng ký được kiểm tra trực tiếp trên preview mới, không gửi đăng ký hay thay thông tin xác thực.
- **Chưa có Safari iOS/Chrome Android thật**. Chưa kiểm chứng picker native, autofill thực tế, hardware safe area hoặc bàn phím thật. Animation/gesture sau đăng nhập chưa được E2E trên tài khoản thật trong lượt này; callback và quy tắc thao tác giữ nguyên.

## Ghi nhận chức năng riêng

Không tái hiện thêm lỗi chức năng đủ bằng chứng trong lượt UI này. Luồng Auth/JWT, API đội/Storage, gia nhập và ghi nghiệp vụ trên server chưa được kiểm thử live; không mở rộng sửa các phần đó. Các tests hiện có là regression, không thay thế E2E tài khoản thật.

## Artifact

Ảnh trước dùng bản app được khảo sát; ảnh sau cho các view sau đăng nhập dùng bản render có banner “dữ liệu minh họa”, nên tên/số lượng minh họa khác không phải thay đổi dữ liệu đội.

- Before home: `ui-pass-before-home-light.jpg`, `ui-pass-before-home-dark.jpg`.
- After home: `ui-pass-after-home-light.jpg`, `ui-pass-after-home-dark.jpg`.
- Member Dark: `ui-pass-after-members-dark.jpg`.
- Login thật: `ui-pass-before-login.jpg`, `ui-pass-after-login-live.jpg`.
- Phép đo: `ui-pass-measurements.json`.
- Bản render standalone: `ui-pass-static.html`.

Các artifact lưu ở `C:/Users/LENOVO/.codex/visualizations/2026/10/12/01a13145-d075-7c53-9fba-640488767c3e/`.

Tái tạo bản render: chạy build, rồi `node scripts/render-ui-review.mjs <đường-dẫn-output.html>`. Mặc định output vào thư mục .ui-review được ignore; không thêm route review vào app production.
