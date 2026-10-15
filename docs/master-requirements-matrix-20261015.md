# Master requirements audit — 15/10/2026

Baseline: `5ffa5d4`. Làm trong worktree riêng; không tìm thấy AGENTS.md ở checkout/thư mục cha đã khảo sát. Báo cáo phân biệt code/test đã có với những luồng chưa được chứng minh trên thiết bị thật.

## Lỗi P0/P1 đã xác nhận và sửa

- API cũ có backend bộ nhớ khi thiếu secret, nhận bearer chưa xác minh, cho ghi invitation JSON từ khách và sync ghi đè toàn bộ dữ liệu đội. Đã bỏ các đường này; mọi ghi nghiệp vụ dùng JWT đã xác minh và RPC kiểm tra membership/role ở PostgreSQL.
- Tạo đội từng ghi nhiều file không transaction, frontend nuốt lỗi. Tạo đội/Owner/workspace giờ là một giao dịch, retry không cấp Owner hoặc tạo đội trùng.
- Sổ quỹ JSON read/merge/write có race và member có thể ghi ledger. Đã thêm row lock, revision, receipt bất biến, RPC yêu cầu/duyệt/từ chối riêng. Duyệt lại không tạo hai khoản thu, không xóa nợ người khác.
- Chat production chưa có bảng; insert lỗi bị bỏ qua, public broadcast và đường đọc thiếu membership. Đã tạo bảng/RLS, server ack, pagination ổn định và realtime theo team có RLS. Giữ nguyên bản gốc chat cũ; tin thiếu metadata không được gán giờ/người gửi giả và có cảnh báo lưu trữ.
- Avatar từng báo thành công trước khi profile lưu và xóa ảnh cũ. Giờ kiểm tra bytes/MIME/dung lượng, xác nhận profile trước thành công; không xóa object cũ.
- Cập nhật phiên bản từng buộc reload sau 4 giây và xóa toàn bộ cache. Giờ thông báo có lựa chọn, chặn khi form chưa lưu/request đang chạy/draft lưu lỗi; không xóa cache hàng loạt.
- Filter trận từng đổi trạng thái; countdown vẫn chạy trên trận hoàn tất; modal ghi 20 thay vì 16; tooltip dùng 14/2/2; Owner thiếu tự điểm danh. Đã sửa, tách hành động kết thúc có xác nhận, dùng snapshot danh sách đủ điều kiện cho trận mới và caption động cho dữ liệu cũ.
- Tìm `#19`/không dấu thất bại; avatar người mẫu trong danh sách thật; đóng xác nhận xóa trước server ack. Đã sửa.

## Ma trận từng ID

| ID | Kết quả và bằng chứng | Phần chưa kiểm chứng / giới hạn |
|---|---|---|
| AUTH-01 | Giữ luồng email/username/Google; test email chưa xác minh, resend, 6 số giữ số 0 đầu và không lưu mật khẩu. Email/Google provider live bật. | Chưa gửi email thật hoặc chạy OAuth tài khoản thật; chưa chứng minh SMTP delivery/quota. User xác nhận giữ đúng 6 số; chưa thay cơ chế hay hạ Supabase policy. |
| AUTH-02 | Tests cô lập tài khoản, phiên hết hạn, tự đăng nhập mặc định tắt, logout và đổi scope. Workspace chỉ lộ sau server xác minh. | Chưa chạy hai tài khoản thật trên hai thiết bị. |
| SPLASH-01 | Giữ StartupGate/logo chính thức, timeout/retry, reduced motion; fixture Light/Dark và kích thước nhỏ. | Chưa đo splash của hệ điều hành PWA trên máy thật. |
| TEAM-01 | RPC tạo đội transaction, Owner từ DB, membership/server snapshot, chuyển đội thật, từ chối ghi khi mất kết nối. Tests retry/ngoại đội. | Không tạo đội test trên production. |
| INVITE-01 | Code server tạo, hết hạn/thu hồi kiểm tra mỗi lần, join gắn UID, chặn join thẳng team ID, role check và khóa team khi đổi mã. Test expiry/revocation/rate limit. | Đội hiện không có cấu hình duyệt người gia nhập; không thêm nút duyệt giả. Không gửi lời mời thật để QA. |
| MEMBER-01 | Hồ sơ thủ công riêng Auth, server ack, tìm không dấu/#19, phân quyền/chuyển Owner transaction, soft remove. Có liên kết hồ sơ thủ công tới tài khoản đã gia nhập đội, audit giữ gốc. | Không tự hợp nhất/chỉnh lại sổ quỹ hay thành tích lịch sử khi liên kết; giữ các định danh và bản gốc để đối chiếu. |
| MATCH-01 | Filter thuần, picker gọn, kết thúc riêng có xác nhận, form timezone đội, swipe có xác nhận/undo/lưu trữ. | Gesture trên cảm ứng Safari/Android chưa kiểm chứng thực tế. |
| ATTEND-01 | Owner/member có tự điểm danh; cutoff/trận hoàn tất khóa ở DB; giữ phiếu người khác và snapshot eligible cho trận mới. Test quyền/deadline và roster completed. | Dữ liệu cũ chưa có snapshot không được bịa roster lịch sử; UI dùng danh sách hiện có và không khẳng định đây là snapshot gốc. |
| LATE-01 | Giữ engine governance server: cutoff, approval, arrival, idempotency, audit; bộ test Postgres hiện có vẫn qua. | Không tạo arrival/vi phạm thật trên production. |
| TACTIC-01 | Giữ tap/drag/cancel hiện có; publish sơ đồ await server ack, lưu theo đội; active thật phân biệt với draft/đang xem. | Chưa kiểm chứng touch/pen trên thiết bị thật. |
| STATS-01 | Report theo user/trận, cập nhật thay cộng lặp, server kiểm tra trận đã xong và giới hạn 0–100, không xóa lịch sử. | Không tự bổ sung quy tắc kiểm duyệt/mùa chưa có trong sản phẩm. |
| FUND-01 | Server derive kỳ/số tiền, duyệt/từ chối có audit, chống retry, phân biệt pending/rejected; filter kỳ và số dư toàn sổ; Excel OOXML thật mở bằng openpyxl. | Test đồng thời dùng PGlite một connection, không phải load test đa connection. Đối soát thủ công không phải xác nhận ngân hàng. |
| QR-01 | Bank picker hiện có, uploaded asset private theo đội, server ký URL, validate metadata/object tồn tại, không xóa ảnh cũ, không đảo màu QR. | Không khẳng định QR upload khớp tài khoản khi chưa giải mã/đối chiếu. |
| RULE-01 | Giữ rules version/effective/ack trong engine server; tests nghiệp vụ qua. | Chưa nghiệm thu UI với tài khoản thật. |
| VIOLATION-01 | Engine append-only, team scope, không khóa Auth toàn hệ thống, giữ lịch sử restricted member; test server roles. | Chưa tạo vi phạm production để QA. |
| CHAT-01 | Bảng/RLS/realtime, newest paging/cursor, retry idempotent, giữ vị trí prepend, draft theo scope, timeout/error/loading; archive bảo toàn. | Pin/search/attachments chưa triển khai và không hiển thị control giả. Chưa chứng minh reconnect đa thiết bị thật. |
| NOTIFY-01 | Unread riêng user ở DB, không đánh dấu hộ người khác; click tới route/match, lỗi lưu read có phản hồi. | Chỉ in-app; không tuyên bố gửi push/SMS/email/Zalo. |
| PROFILE-01 | Avatar immutable upload + profile ack; initials khi thiếu ảnh. Private profile RLS, contact manual không lộ cho member qua settings dự phòng. | Chưa upload ảnh cá nhân thật trên production để test. |
| UI-01 | Giữ token/typography hiện có, SVG Lucide; control mobile tối thiểu 16px sau khi phát hiện select 15px. | Safari autofill/native picker cần kiểm chứng máy thật. |
| UI-02 | Header đội gradient cỏ tiết chế, picker trận thu gọn, điểm danh cá nhân/tổng đội; bỏ số/ảnh mẫu khỏi các phần thật đã xác nhận. | Fixture QA dùng dữ liệu minh họa, không phải dữ liệu production. |
| UI-03 | Giữ menu Cá nhân phân nhóm, segmented VI/EN/theme, sở thích riêng tài khoản tự lưu; thao tác chỉ theo quyền server. | VI/EN dùng phạm vi bản dịch hiện có; không tuyên bố toàn bộ nội dung nghiệp vụ đã được dịch mới. |
| UI-04 | Back/popstate, capsule 5 cột; đo mobile, không overflow ngang; target tab >=44px. | Chưa có keyboard phần mềm thực để nghiệm thu safe-area. |
| MOTION-01 | Giữ motion/reduced-motion, route/back; countdown cô lập, không animate gradient. | Chưa có trace hiệu năng trên máy cấu hình thấp. |
| PERF-01 | Build tách React/Motion/Supabase, không thêm dependency; countdown dừng khi hết hạn; dọn listener/subscribe. | Main bundle khoảng 114KB gzip; chưa có phép đo runtime/Web Vitals mới trên thiết bị thật. |
| A11Y-01 | Bổ sung tên dialog/icon, aria-pressed thực, status/error chữ, focus/Escape theo hook hiện có, mobile input16px. | Chưa audit đầy đủ bằng VoiceOver/TalkBack. |
| UPDATE-01 | Prompt update an toàn, chặn dirty/write, không cache API private, không reload ép; tests barrier/counter/draft failure qua. | Thiết bị offline/ngủ không thể nhận bản mới tức thì; PWA cũ cần refresh sau khi lưu việc đang làm. |

## BUG-01 tới BUG-15

| ID | Kết quả |
|---|---|
| BUG-01 | Sửa filter mutate; kiểm tra tương tác đổi filter không đổi thẻ/trạng thái trận. |
| BUG-02 | Sửa banner unconditional; test completed không countdown; countdown hết hạn báo đã chốt và dừng timer. |
| BUG-03 | Back từ Chiến thuật trở lại Trang chủ đã kiểm tra trong browser demo tách biệt. |
| BUG-04 | Tái hiện modal vẫn ghi 20 dù roster16, đã sửa caption theo rosterCount/trận. |
| BUG-05 | Sửa và test #19/19/không dấu/space. |
| BUG-06 | Giữ code pointer capture/cancel hiện có; chưa xác nhận lỗi vẫn tái hiện trên touch thật. Không coi review cũ là bằng chứng mới. |
| BUG-07 | Tái hiện title14/2/2; sửa tooltip từ cùng roster và thêm test. |
| BUG-08 | Badge/read từ DB riêng user; không dùng chấm trang trí; test đọc không ảnh hưởng người khác. |
| BUG-09 | Bỏ tạo đội local khi server lỗi; test transaction/retry/ngoại đội. |
| BUG-10 | Mời Cá nhân dùng invite server, quyền từ canonical membership, không tự cấp Owner fallback. |
| BUG-11 | Đo các breakpoint không overflow; bàn phím thực vẫn cần nghiệm thu. |
| BUG-12 | Đo form/native date không overflow, sửa select dưới16px; Safari picker/autofill thực chưa kiểm chứng. |
| BUG-13 | Giữ clipping/stacking swipe, menu absolute trong đúng thẻ, bỏ dải44px trống; không thay luật gesture. |
| BUG-14 | Pending riêng, không nhắc như chưa báo nộp; payment/rejection tests qua. |
| BUG-15 | Bỏ forced reload/cache purge, durable chat/profile ack; dữ liệu cũ có raw archive. Không hứa tự phục hồi lịch sử đã mất trước bản này. |

## Bằng chứng production DB

Áp dụng 8 migration mới theo một transaction vào 2026-10-15 06:58:02 UTC, receipt `master-20261015`, SHA-256 `30c70a136fd52048547d56d68e7e8bfedf80ed906db2129be08d9025c8da88ad`.
Follow-up riêng migration009 lúc 07:00:49 UTC, receipt `master-20261015-privacy`, SHA-256 `c8511457e957d6444f10274619e775037747724fb54c3091cf3f5dc54f51f71f`.

Sau migration: 2 teams, 3 memberships, 0 governance events, 16 legacy Storage objects — giữ nguyên so với khảo sát. 0 public tables thiếu RLS. Anon không execute workspace commit; authenticated không UPDATE trực tiếp workspace; join thẳng team ID bị thu hồi. Không tạo/xóa user, đội test, khoản thu hoặc lời mời production.

Rollback/containment: xem `master-release-runbook.md`. Không drop bảng mới hoặc phục hồi API cũ dễ ghi đè dữ liệu.

## Kiểm chứng và preview

- `npm test`: 137/137 qua trên bản cuối, gồm timeout/loading Chat.
- Build Vite/PWA qua. Không thêm dependency. Có warning import.meta trong test CJS; không phải lỗi production build.
- 252 tổ hợp fixture: 12 màn chính ở 320/360/390/430/768/1280 Light/Dark; thêm 27 trạng thái ở320/430 Light/Dark. Không document overflow ngang. Đã phát hiện select15px và sửa về16px; 16 ca dropdown mobile đã retest trên bản cuối: không control chữ dưới16px, không tràn ngang.
- Vùng chạm5tab ở320px: khoảng51px rộng ×56px cao; không button nhỏ hơn44px ở Home đã đo.
- Workbook thật được đọc bằng openpyxl: tiếng Việt và ô tiền dạng số đúng; công thức dưới dạng text.
- Chưa có thiết bị Safari iOS/Android thật; không dùng kết quả Chromium viewport để thay chứng nhận thiết bị thật.

Preview minh họa 390px: master-home-light.jpg / master-home-dark.jpg trong thư mục artifact của chat. Tổng 268 lượt đo gồm 252 ca khảo sát và16 ca retest font. Tap cầu thủ mở picker và không tạo dịch chuyển vị trí trong browser; cảm ứng thật chưa kiểm chứng.
