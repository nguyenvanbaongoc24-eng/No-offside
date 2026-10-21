# Tìm đối và nền tảng Pro theo đội — 20/10/2026

## Đã triển khai

Tìm đối nằm trong Cá nhân → Tiện ích đội → Tìm đối. Có ba mục Khám phá,
Tin của đội, Lời đề nghị; lịch sử nằm trong Lời đề nghị. Đội đang đại diện
luôn được nêu trước thao tác gửi/xác nhận. Thành viên thường xem tin; quyền
đại diện dùng role owner/admin hiện có, không dùng quyền thủ quỹ.

- Tin: sân 5/7/11, khu vực thủ công, lịch có thể qua ngày, tình trạng sân,
  bản đồ HTTPS, trình độ tự đánh giá, áo, ghi chú và chi phí **dự kiến**.
- Lọc khu vực/ngày/khung giờ/loại sân; lọc thêm tình trạng sân, trình độ và
  tổng tiền dự kiến. Không yêu cầu GPS hoặc hiển thị khoảng cách giả.
- Tin lấy từ trận có sẵn chỉ giữ liên kết khi đăng, chốt mới cập nhật trận
  đã chọn. Trận độc lập chỉ được tạo khi cả hai đội xác nhận.
- Đề nghị duy nhất theo đội/tin; rút hoặc bị từ chối có thể gửi lại khi tin
  còn mở. Phiên bản và lịch sử cũ không bị xóa.
- Trao đổi riêng giữa các đại diện đang có quyền. Không thêm mọi thành viên
  vào hội thoại. Plain text được React escape, giới hạn 2.000 ký tự.
- Điều kiện có phiên bản bất biến và xác nhận riêng của mỗi đội. Thay đổi
  tạo phiên bản mới; chỉ đếm xác nhận của phiên bản hiện tại. Lịch đã chốt
  không đổi cho tới khi cả hai xác nhận phiên bản mới.
- Khóa transaction và unique constraints giới hạn một đối được chốt; idempotency
  receipts kiểm tra cả action/payload, tránh ghi trùng và tái dùng khóa sai.
- Hai trận riêng liên kết một giao hữu chung; điểm danh, chiến thuật, vi phạm,
  sổ quỹ và chat nội bộ không được chia sẻ. Shared fields không được chỉnh
  vòng qua module Trận đấu. Kết thúc/lưu lịch sử và điểm danh/thu chi giữ luồng cũ.
- Hủy có lý do, actor/team/thời điểm, cập nhật cả hai đội và giữ giao dịch.
  Trận đã kết thúc không bị hủy qua quy trình này.
- Báo cáo kết quả riêng theo góc nhìn mỗi đội, chỉ sau khi đội xác nhận kết
  thúc trận. Không ghi đè kết quả riêng. Tỷ số bất đồng được nêu rõ; chưa có
  điểm uy tín hoặc huy hiệu tự tạo.
- Hạn tin được kiểm tra trong RPC và projection, không phụ thuộc scheduler.
- Thông báo bền vững dùng hạ tầng hiện có, audience từng đại diện; push dùng
  preferences/lease/dedup/private-preview hiện có. Link mở đúng tin/đề nghị.
- Realtime dùng signal `no_team_updates`, fetch snapshot có phân quyền và
  polling 15 giây dự phòng; refresh khi focus/online/foreground, cleanup khi
  đổi đội/tài khoản/unmount. Thay snapshot thay vì append để tránh nhân đôi.
- Trang `/find-opponents` và nút ở đăng nhập/onboarding cho xem công khai tối
  thiểu. Không công khai số điện thoại, actor, trao đổi hay ghi chú đối thủ quen.

## Pro

Pro theo đội, không theo người thanh toán, không cấp thêm role. Có mẫu tin,
bộ lọc theo người dùng/đội, đối thủ quen và ghi chú riêng của ban quản lý.
Lưu và sử dụng tiện ích đều kiểm tra entitlement phía server. Mẫu không sao
chép ngày giờ/đề nghị/chat/xác nhận cũ; lời mời đối thủ quen chỉ mời xem tin,
không tạo đề nghị hoặc chấp nhận thay đội kia.

Hết hạn/suspended: dữ liệu đã lưu vẫn xem được, không tạo/sửa/sử dụng tiện
ích Pro; luồng tìm đối và trận đang chạy vẫn miễn phí, tiếp tục bình thường.
Không có thanh toán, giá bán, đặt cọc, giữ tiền, đặt sân hay dịch vụ trả phí.
Trang quyền lợi hiển thị **Chưa mở bán**. Không có nút thanh toán giả.

## Migration và cấu hình

`supabase/migrations/202610200002_matchmaking.sql` mở rộng `no_pro_offers` và
`no_pro_challenges`, bảo toàn dữ liệu cũ; thêm terms, confirmations, messages,
links, reports, events, receipts, assets và team entitlements. RLS bật trên
tất cả bảng mới, không cho anon/authenticated đọc/ghi trực tiếp. RPC sử dụng
JWT của caller qua `/api/sync`; chỉ feed public tối thiểu dùng anon.

`202610200003_matchmaking_private_notes.sql` bổ sung giữ ghi chú nội bộ khi liên kết/amend; shared note lưu riêng. UI không tự sao chép ghi chú nội bộ từ trận nguồn.

`202610200004_matchmaking_team_lifecycle.sql` giữ lịch sử và cho đội còn hoạt động hủy đúng quy trình khi đối thủ giải tán; không nhận đề nghị mới cho đội đã giải tán.

Đã áp dụng cả ba transaction migration qua SQL Editor vào project
`xofcoycdndyuuuxtwcwl`. Hậu kiểm: schema có thật; số tin/đề nghị trước và sau
đều bằng 0; không đội thật nào được cấp Pro; `authenticated` không được gọi
RPC quản trị. Project chưa có bảng `supabase_migrations.schema_migrations`;
không tự tạo lịch sử migration giả hoặc chạy lại toàn bộ migration cũ.

Không thêm biến môi trường frontend, endpoint cấp Pro hay dependency mới.
Operator có thể cấp quyền thử nghiệm có hạn bằng CLI được bảo vệ:

```powershell
node scripts/grant-team-pro.mjs TEAM_ID 2026-11-20T00:00:00Z "test-approval-reference"
```

Lệnh cần môi trường server có `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`
hoặc `SUPABASE_SECRET_KEY`. Không đưa khóa vào frontend, command arguments,
ảnh hoặc Git. Script không tự chạy; không cấp quyền cho đội production trong lượt này.

## Kiểm chứng

- `npm test`: 288/288 qua. Repository không có script lint/typecheck.
- `npm run build`: qua; cảnh báo bundle lớn cũ còn tồn tại. Matchmaking được
  tách chunk, dùng chung endpoint Sync để không tăng số Vercel Functions.
- RPC thật trên PostgreSQL PGlite dùng một lần, ba đội và owner/admin/member:
  role/RLS/cross-team privacy; tin quá hạn; chồng lịch; source match reuse;
  retry/collision; một đề nghị đang hoạt động; rút/gửi lại; stale version;
  cả hai cùng xác nhận; đối còn lại bị đóng; giữ giao dịch khi hủy; báo cáo
  khác tỷ số; Pro không có quyền/hết hạn; admin grant không dành cho user.
- Browser → API Sync thật → PostgreSQL fixture: đội B gửi đề nghị/tin nhắn,
  đội A đọc được; A xác nhận chỉ chờ; B xác nhận mới có liên kết trận. Auth
  và vận chuyển push được giả lập trong fixture, không dùng dữ liệu đội thật.
- Browser thành viên thường không có nút đăng; đổi sang đội có role owner
  thì có nút đăng, entitlement và dữ liệu chuyển theo đội mới.
- Hook regression: phản hồi cũ không lộ sau đổi team/account; listener,
  polling và subscription được cleanup; 401/403 xóa nội dung riêng đã cache. Snapshot fetch bù sự kiện.
- Dark 320/360/390/430/1280; Light cỡ chữ lớn cùng kích thước: không tràn
  ngang, vùng chạm ít nhất 44px. Form ở 320–430px không tràn, input >=16px;
  sheet đóng hoàn toàn gỡ khóa body/html. Ảnh/số đo trong `.ui-review/mm-*`.
- Production sau migration: feed RPC ẩn danh trả thành công, không có messages;
  truy cập trực tiếp messages và cấp entitlement bằng anon đều bị từ chối.

## Giới hạn kiểm chứng và trước mở bán

- PGlite chạy một connection: kiểm thử cạnh tranh logic/khóa/uniqueness không
  thay thế load test nhiều PostgreSQL sessions thật. Cần chạy đồng thời các
  xác nhận từ nhiều workers để đo contention/deadlock trước khi tăng tải.
- Chưa kiểm chứng push tìm đối trên thiết bị thật, Supabase Realtime transport
  qua hai thiết bị production hoặc Safari iOS/Android thật trong lượt này.
  Browser fixture kiểm chứng polling/fetch bù và UI/API/SQL, không chứng minh
  vận chuyển realtime/push thật. Không đăng tin kỹ thuật vào feed production.
- Cần pagination khi lượng tin/chat lớn, giám sát tải và thông báo, chính sách
  vận hành/abuse, hỗ trợ/hủy, quyết định giá/quyền lợi, thanh toán/webhook có
  chữ ký và idempotency, thời hạn/grace và điều khoản phù hợp trước mở bán.
- Events và timestamps hiện đủ nền tảng tính funnel/first proposal/matched/
  cancelled/repeat teams; chưa thêm nền tảng analytics hay uy tín thương mại.
