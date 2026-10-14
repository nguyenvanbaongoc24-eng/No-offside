# Tin nhắn và Cá nhân — bàn giao 14/10/2026

Hai attachment chỉ có đặc tả chữ, không có ảnh mockup. Đã tham chiếu code/app hiện tại và design system xanh cỏ. Không tìm thấy AGENTS.md trong repository. Không thêm dependency, API, migration hoặc thay schema/quyền.

## Tin nhắn

- Header logo/tên đội/số thành viên thật, gradient và token Light/Dark. Không có Back tại tab chính, nút tìm kiếm/Thêm/đính kèm hoặc banner ghim giả.
- Tin nhận trái, tin của mình phải; avatar fallback và tên theo nhóm cùng người/ngày/khoảng 5 phút. Bubble tối đa 80%, nội dung 16 px, URL và xuống dòng không tràn. Date separator theo ngày địa phương. Không thêm tick đã gửi/đã nhận/đã đọc.
- Giữ key và schema localStorage hiện có, kể cả đọc dữ liệu demo cũ. Component được remount theo tài khoản + đội để không đưa draft/hội thoại cũ sang phạm vi mới.
- Trước khi thêm tin vào UI, xác nhận ghi localStorage. Nếu lỗi thì giữ draft và hiện lỗi, không thêm tin thành công giả. Chặn gửi trắng và gửi trùng trong cùng lượt xử lý.
- Textarea tối đa 124 px rồi cuộn nội bộ. Stream có vùng cuộn riêng; không tự cuộn theo ký tự nhập. Đang đọc cũ thì giữ scrollTop và hiện nút tin mới; gần cuối thì bám cuối. ResizeObserver xử lý thay đổi chiều cao viewport/composer mà không kéo người đọc lịch sử xuống cuối.
- Composer cách capsule 12 px khi bàn phím đóng. VisualViewport/focus nhận diện bàn phím và báo App ẩn/inert navigation; composer ở đáy viewport nhìn thấy. Có fallback 100vh/dvh, dọn listener/observer và phục hồi overflow của body. Chat không dùng trạng thái cuộn Dashboard để bật/tắt nav.
- Vùng lịch sử dùng aria-live off, không đọc lại cả lịch sử sau mỗi tin mới. Sinh nhật chỉ dựa trên dữ liệu ngày sinh hiện có.

## Cá nhân/Hồ sơ

- Header gradient, avatar/tên/số áo/vị trí, đội hiện tại và vai trò theo đội. Sửa hồ sơ ở màn riêng.
- Thao tác nhanh theo quyền: Nội quy, Mời thành viên (dùng InviteShare/callback thật), Quản lý đội. Không thêm Chuyển đội giả.
- Nhóm Hồ sơ, Đội bóng, Tùy chọn, Tài khoản. Thành tích chỉ dùng số liệu đã có, không tạo số liệu thiếu. Có thông tin đội hiện tại, danh sách thành viên, luồng gia nhập/tạo đội cũ.
- Phân quyền, cấu hình, yêu cầu duyệt và các thao tác quản trị được đưa sau Quản lý đội. Callback, kiểm tra quyền và xác nhận nguy hiểm của màn cũ giữ nguyên. Member không thấy mục quản trị; cấu hình và duyệt yêu cầu giữ giới hạn Owner.
- Chuyển tài khoản vẫn mở AccountControls/xác thực hiện có, không đổi tên/avatar để giả lập tài khoản. Đăng xuất phiên hiện tại vẫn rõ ở cuối; đăng xuất tất cả nằm trong panel tài khoản cũ.
- Form hồ sơ không tự điền số áo 9, chiều cao 175, cân nặng 68 hay vị trí giả khi thiếu. Thông tin bổ sung không bắt buộc. Nhận lỗi callback async, giữ dữ liệu khi thất bại; lỗi số áo ở gần nhóm trường. Avatar lỗi có fallback, ảnh mới là draft tới khi cập nhật.
- Không báo “đã lưu server”: callback hiện tại chưa cung cấp xác nhận lưu bền vững. UI báo đã cập nhật trong ứng dụng, giữ form mở và tiếp nhận lỗi lưu thiết bị.
- VI/EN áp dụng ngay, lưu qua preferences cá nhân hiện có; hỗ trợ menu Cá nhân, các nhãn hồ sơ chính và Tin nhắn. Quản trị chuyên sâu và các màn khác còn tiếng Việt, có ghi rõ ở lựa chọn ngôn ngữ. Theme/font vẫn dùng cơ chế toàn app theo tài khoản, không sửa appearance của đội.

## Kiểm tra

- `npm test`: 80/80 pass. Test mới bao gồm gửi trắng/trùng, quota failure giữ draft, phạm vi đội/tài khoản, đọc tin cũ khi có tin mới, grouping/date, keyboard callback/cleanup, quyền menu, avatar lỗi, form thiếu dữ liệu, lưu thất bại và chờ callback thành công.
- `npm run build` và `git diff --check`: pass. Repository không có lint/typecheck script. Cảnh báo import.meta trong test bundle CJS có sẵn không phải lỗi runtime mới.
- 13 case × Light/Dark × 320/360/390/430/1280 = 130 phép đo layout: không tràn ngang, control được đo ≥44×44, nhãn nav không bị cắt. Có Owner/Admin/Member, tên dài, 30 tin chứa URL dài/nhiều dòng, empty và English.
- Tại 390×844: composer bottom 752, capsule top 764, khoảng cách 12 px. Textarea tối thiểu 16 px. Probe chữ trên nền phẳng không phát hiện cặp dưới ngưỡng; gradient và alpha không thuộc probe này.
- Layout các màn sau đăng nhập dùng render component thật với dữ liệu minh họa/callback không ghi server. Test tương tác/state dùng React renderer và viewport giả lập, không phải authenticated production E2E.
- Chưa thử Safari iOS/Chrome Android trên thiết bị thật, bàn phím thực tế/xoay màn hình/safe area thiết bị, tải ảnh avatar hoặc lưu hồ sơ qua backend production.

## Chức năng/backend còn thiếu hoặc chưa kiểm chứng

1. Chat hiện chỉ lưu trên thiết bị, kể cả tài khoản thật; không có API/realtime chat giữa đồng đội. UI ghi rõ, không báo gửi mạng thành công khi offline.
2. Chưa có ghim, tìm kiếm chat, chia sẻ trận/tệp, trạng thái delivery/read, tải lịch sử phân trang hoặc retry mạng. Không tạo nút/thẻ giả cho các chức năng này. Đọc localStorage là đồng bộ tức thời nên không giả lập loading server/skeleton.
3. Không có bộ chọn/chuyển đội thực sự; chỉ giữ các luồng gia nhập/tạo đội đang tồn tại. Chuyển tài khoản là luồng khác.
4. updateProfile hiện cập nhật state và để cơ chế sync hiện có xử lý, không trả receipt server. Chưa thể khẳng định avatar/hồ sơ đã lưu trên server sau callback. Không thay backend để mở rộng phạm vi UI.
5. Không lưu draft qua refresh/rời tab; draft trong phiên giữ khi gửi lỗi và được xóa khi đổi đội/tài khoản. Không trình bày như có đồng bộ draft.

## Artifact

Trong `C:/Users/LENOVO/.codex/visualizations/2026/10/12/01a13145-d075-7c53-9fba-640488767c3e/`:

- `personal-chat-{chat,profile,editprofile,appearance,management}-{light,dark}.png`: component thật với dữ liệu minh họa.
- `personal-chat-measurements.json`: số đo layout/tương phản và giới hạn.
- `personal-chat-ui-review.html`: bộ render kiểm chứng cục bộ, không nằm trong public/dist.

Tái tạo bằng build rồi `node scripts/render-ui-review.mjs`; file mặc định ở `.ui-review` được gitignore.
