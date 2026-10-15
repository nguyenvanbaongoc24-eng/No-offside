# Badge chưa đọc và Web Push

## Quy tắc hiển thị

- Navigation: chỉ đếm tin **người khác** của đội đang chọn; 0 ẩn, 1–99 hiện số, trên 99 hiện `99+`. Accessible name đọc số thật.
- Bộ chuyển đội: số riêng cho từng đội có quyền tham gia hiện hành.
- Icon ứng dụng: **tổng tin nhắn chưa đọc của tất cả đội đang hoạt động**. Không cộng thông báo quỹ/nội quy vào số này. Notification `badge` là hình nhỏ của thông báo, không phải số trên icon ứng dụng.
- Backend là nguồn số liệu; không tăng/giảm bộ đếm bằng localStorage. Đối soát khi mở app, focus, online, realtime và mỗi 20 giây khi trang hiện.
- Chỉ gửi ranh giới đọc khi tin đã render trong vùng chat đang hiện và có focus. Chờ 220 ms để tránh đánh dấu khi lướt qua; tin lạc quan/cache chưa xác nhận không có ranh giới. Marker chỉ tiến, không lùi. Tin đến sau ranh giới vẫn chưa đọc.
- Thành viên mới bắt đầu tại lịch sử hiện có. Lịch sử nhập từ Storage được giữ nguyên và không tạo unread/push.

## Bật trên thiết bị

Vào **Cá nhân → Thông báo → Bật thông báo**. Chỉ thao tác này xin quyền của hệ điều hành. Mặc định chọn tin nhắn, tắt các nhóm mở rộng và ẩn nội dung màn hình khóa. Cài đặt áp dụng riêng installation hiện tại; không thay đổi thiết bị khác. Tắt hoặc logout sẽ unsubscribe ở trình duyệt và detach ở server. Nếu offline, thông báo đến muộn bị thay bằng nội dung chung khi ngữ cảnh tài khoản không khớp.

iPhone/iPad cần mở app đã thêm vào Home Screen trên iOS/iPadOS hỗ trợ Web Push (16.4 trở lên). Tab Safari thường hiển thị hướng dẫn cài ra màn hình chính. Android và desktop kiểm tra API thực tế; không cam kết mọi launcher hiển thị số giống nhau. Quyền bị từ chối phải chỉnh trong cài đặt trình duyệt/hệ điều hành. Badge trong navigation không phụ thuộc quyền push.

Tham khảo chính thức: [WebKit Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [WebKit Badging](https://webkit.org/blog/14112/badging-for-home-screen-web-apps/), [MDN Badging API](https://developer.mozilla.org/en-US/docs/Web/API/Badging_API).

## Schema và bảo vệ dữ liệu

Chạy **chỉ migration 011 và 012**, sau các migration hiện có; không chạy lại schema nền trên production.

- `no_team_messages.sequence`: ranh giới thứ tự. RPC gửi khóa theo đội trước khi cấp sequence, tránh tin commit muộn lọt sau marker.
- `no_chat_reads`: baseline và marker theo user/đội. RLS chỉ SELECT marker của mình; ghi qua RPC kiểm tra membership và UUID tin thuộc đúng đội.
- `no_push_devices`: subscription riêng, hash installation secret, owner/generation, nhóm và lựa chọn ẩn preview. Không có SELECT/ghi trực tiếp cho anon hoặc authenticated.
- `no_chat_presence`: lease 35 giây, heartbeat 15 giây khi đang xem cuối chat và có focus. Rời/blur sẽ bỏ lease, hạn chế push khi đang đọc.
- `no_push_outbox`: tạo trong cùng transaction với tin nhắn/thông báo nghiệp vụ. Unique installation/generation/event chống tạo trùng khi retry thao tác.
- `no_push_channels`: throttle theo installation/đội/nhóm.

RPC đăng ký cần JWT hợp lệ cùng secret ngẫu nhiên 256 bit của installation. Secret này chỉ có thể detach installation tương ứng, kể cả sau JWT hết hạn; không đọc được subscription, không cấp quyền đội, không tắt thiết bị khác. Chuyển owner tăng generation để vô hiệu hóa job cũ. Endpoint chỉ cho phép các push service HTTPS đã hỗ trợ; server kiểm tra lại hostname và bytes của khóa trước mỗi lần gửi.

Không lưu JWT trong service worker. IndexedDB chỉ lưu account ID và số badge có timestamp để chống payload cũ ghi đè. SW kiểm tra tài khoản trước khi hiện nội dung và trước khi mở link; app kiểm tra lại membership qua luồng khởi tạo hiện có. Click không tự đánh dấu đọc.

## Gửi và vận hành

API gửi chat và lưu nghiệp vụ **await** dispatcher sau DB commit. Request đếm unread đã xác thực cũng xử lý một batch đang chờ, giúp tiếp tục retry khi có người mở app. Worker lấy tối đa 8 job cho request thường, 20 cho cron; timeout provider 5 giây, lease 60 giây. Không dùng promise nền bỏ mặc trong serverless.

Trong 30 giây mỗi installation/đội/nhóm chỉ gửi một thông báo; các tin chờ được gộp về tin mới nhất. Kiểm tra lại membership, lock, preview, nhóm bật, read marker và foreground lúc claim. Provider chấp nhận chỉ ghi `accepted`, **không phải xác nhận thiết bị đã nhận hoặc người dùng đã đọc**. HTTP 404/410 tắt subscription đó. Lỗi khác backoff, tối đa 4 lần, job quá 24 giờ được bỏ. Job đã kết thúc được dọn sau 7 ngày, presence cũ sau 1 ngày.

Web Push là best effort: lỗi mạng đúng lúc provider đã nhận nhưng server chưa ghi ack có thể dẫn đến retry; `Topic` và notification `tag` ổn định hạn chế thông báo lặp. Không cam kết exactly-once tới thiết bị.

**Giới hạn lịch miễn phí:** cron dự phòng `/api/notifications?worker=1` chạy hằng ngày. Các lần retry hoặc burst bị throttle có thể phải đợi request chat/lưu dữ liệu/unread tiếp theo, hoặc cron; không bảo đảm được retry ngay trong vài giây khi toàn bộ app đóng. Đây là lựa chọn không phát sinh dịch vụ trả phí; nếu cần SLA theo phút phải cấu hình thêm scheduler bền vững phù hợp. Không tự nâng gói. [Vercel Cron giới hạn theo gói](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Nhóm đang hỗ trợ:

| Nhóm | Nguồn thật | Đích |
|---|---|---|
| Tin nhắn | Tin đã lưu, loại người gửi/legacy/đã đọc | Đội → Tin nhắn |
| Lịch thi đấu | Thông báo workspace khi tạo/đổi lịch | Trang chủ đội |
| Quỹ | Thông báo nghiệp vụ quỹ, kiểm tra audience | Quỹ đội |
| Nội quy/quản trị | Nội quy mới, yêu cầu báo muộn cho quản trị, kết quả cho người yêu cầu; workspace notices phù hợp | Nội quy & vi phạm |

**Chưa có scheduler nhắc điểm danh tự động.** Không hiển thị công tắc giả hoặc tạo nhắc thử cho người dùng thật.

## Cấu hình Vercel

Production Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=https://no-offside.vercel.app`, `CRON_SECRET`. Không dùng tiền tố `VITE_`. Config endpoint chỉ trả public VAPID key; private key và cron secret không ra bundle/Git. Giữ cặp VAPID ổn định; nếu đổi key cần đăng ký lại subscription.

SW push được `importScripts` vào Workbox hiện có. Giữ `registerType: prompt`, `skipWaiting: false` và quy trình lưu draft/cập nhật phiên bản. `/push-worker.js` có no-cache. Thiết bị đã cài cần nhận bản cập nhật ứng dụng trước khi có push handler.

Theo dõi DB bằng truy vấn quản trị chỉ lấy số lượng theo state/attempts/status; không đưa endpoint, khóa, secret hoặc nội dung tin vào log. Khi sự cố gửi, có thể tắt nhận trên từng thiết bị; không xóa lịch sử chat/read marker. Rollback code về bản trước vẫn tương thích schema cộng thêm, nhưng cần bỏ cron nếu tạm dừng tính năng.

## Kiểm chứng

`npm test`, `npm run build`, `npm audit --omit=dev`. Test SQL chạy PGlite cô lập với user/đội giả; không ghi tin hoặc subscription thử vào production. Có kiểm tra interleaving ranh giới đọc/tin đến, retry idempotent, quyền chéo đội, subscription private, hai installation, detach, locked, provider 410/backoff, preview, throttle/coalesce, nhóm thực tế, safe link và SW đổi tài khoản. Đây là mô phỏng trình tự, không phải load test PostgreSQL nhiều connection hay xác nhận giao nhận push thật.

UI có kiểm tra riêng bằng fixture không kết nối dữ liệu thật. Kết quả kiểm thử iPhone sau khi chủ app chỉ định đội/tài khoản được ghi bên dưới. Không suy ra Android hoạt động từ iPhone hoặc test desktop; không gửi thử tới người dùng ngoài phạm vi được chỉ định.

### Kết quả triển khai ngày 15/10/2026

- 159/159 kiểm tra tự động đạt; production build/PWA đạt; audit dependency runtime: 0 lỗ hổng được báo.
- Migration receipt `push-20261015`, SHA256 `36066ce1fd35969853401b254638e42c6d9d49956ed026a6068d7b6f6909b367`. Transaction xác nhận giữ nguyên 3 đội, 6 membership, 8 tin nhắn tại thời điểm chạy; tạo 6 marker baseline. Không thêm tài khoản, tin nhắn hay subscription thử vào production.
- Kiểm tra production: RLS bật, authenticated không SELECT được subscription, không EXECUTE được worker; RPC unread bằng quyền authenticated chỉ nhìn marker của chính mình. Lúc áp dụng chưa có installation đăng ký/job gửi.
- Preview fixture Light/Dark 320/360/390/430 px: không tràn ngang, badge tuyệt đối cao 17 px, 100 tin đọc thành `99+`, accessible name giữ 100; vùng chạm navigation tối thiểu 54 × 56 px.
- Tại thời điểm triển khai ban đầu chưa kiểm chứng giao nhận trên thiết bị thật; kết quả bổ sung được ghi dưới đây.

### Bổ sung kiểm thử thực tế trên iPhone — 15/10/2026

Chủ app đã chỉ định đội kiểm thử và hai tài khoản A/B. Đối chiếu backend xác định đúng đội có hai tài khoản đó, tránh đội khác trùng tên; không có người nhận push ngoài phạm vi. Không ghi mật khẩu, thông tin subscription hoặc định danh tài khoản vào báo cáo Git.

- Người dùng xác nhận bật được thông báo trên iPhone.
- Gửi đúng một tin rõ nhãn `[Kiểm thử No Offside 01]` từ A tới đội kiểm thử. Tin được lưu thành công; có đúng một job tới installation của B, `accepted`, một lần thử, provider trả HTTP `201`.
- Người dùng xác nhận thông báo đã hiển thị **ngoài app trên iPhone**. Đây là xác nhận giao nhận thực tế, tách biệt với trạng thái `accepted` của provider.
- Người dùng xác nhận chạm thông báo trên iPhone mở đúng màn Tin nhắn của đội kiểm thử. Đích đến đã được xác minh thực tế, không chỉ bằng unit test của URL.
- Backend sau đó ghi nhận B đã đọc qua tin kiểm thử và còn 0 tin chưa đọc trong đội. A không tăng số chưa đọc vì tin do mình gửi; navigation của A giữ badge ẩn.
- Kiểm tra lại repository ở commit `342029a`: 159/159 kiểm tra tự động đạt.

Chưa có xác nhận riêng về tin nhắn trả lời chiều ngược lại và đồng bộ giữa nhiều thiết bị cùng một tài khoản. Chưa kiểm thử Android thật hoặc xác định phiên bản iOS. Không coi các bước này là đã đạt từ một lần nhận push thành công.
