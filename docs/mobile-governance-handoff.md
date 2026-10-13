# Bàn giao Mobile & Governance — 13/10/2026

## Phạm vi và trạng thái

Nhánh `codex/mobile-ui-refinement`. Không merge main, không deploy production và không chạy SQL trên project thật `xofcoycdndyuuuxtwcwl`.

Đã triển khai UI: nav ẩn/hiện theo hướng cuộn với dead zone/ngưỡng/bounce guard; freeze khi có dialog, bàn phím hoặc kéo cầu thủ; animation 220ms/reduced motion/safe area; theme/font cá nhân đổi và lưu ngay, rollback khi lưu lỗi, bootstrap trước paint; chuyển tài khoản bằng xác thực tuần tự; logout scope local, thao tác global riêng; cache theo tài khoản và đội, chặn hiển thị khi chưa xác thực; vuốt thẻ trận lớn chỉ mở Xóa, xác nhận lưu trữ và hoàn tác/khôi phục; giữ điểm danh/báo cáo/quỹ; form datetime 16px/min-width 0; màn Chiến thuật và nút tạo sơ đồ đồng nhất, giữ dữ liệu sơ đồ trải nghiệm cũ.

Nghiệp vụ mới có UI và RPC SQL: xin đến muộn; admin xác nhận giờ đến; duyệt yêu cầu; chốt vi phạm/phạt; nội quy phiên bản và xác nhận đã đọc; kỳ tháng/quý theo timezone; cảnh báo/threshold cần duyệt; cảnh cáo/khóa/loại trong một đội; điều chỉnh có lý do/actor/timestamp giữ bản gốc. UI **không bật các thao tác này** nếu RPC/đội/tư cách thành viên chưa được provision trên server. Không dùng vai trò local để thay thế kiểm tra quyền SQL.

## Migration và cách bật ở môi trường thử nghiệm

1. Tạo/chọn Supabase project thử nghiệm độc lập. Auth user phải là tài khoản của project đó; không copy token hoặc mật khẩu.
2. Chạy `supabase/migrations/202610130001_governance.sql` qua SQL Editor/CLI có quyền DDL. Migration trong transaction, chỉ thêm bảng/hàm có prefix `no_gov_`, không sửa/xóa bảng cũ. Chạy một lần; nếu đã áp dụng hãy dùng lịch sử migration thay vì chạy lại toàn bộ.
3. Provision đội và thành viên bằng SQL quản trị đã kiểm tra: `no_gov_teams.id` khớp team ID của ứng dụng; `no_gov_members.user_id` là UUID **đã xác minh từ Supabase Auth**, không phải ID số/local hoặc người dùng tự khai. Owner/admin do người quản trị xác nhận. Dùng ví dụ `supabase/provision-team.example.sql` sau khi thay placeholder và kiểm tra danh sách; không tự import/assign owner từ dữ liệu trên máy.
4. Tạo bản nội quy đầu tiên có thời điểm hiệu lực hợp lệ; provision trận cũ với ID khớp và thời gian timestamptz chuyển đổi chính xác từ timezone đã xác nhận. Trận mới/sửa từ UI được gửi qua RPC khi snapshot đã kết nối. Trận có giờ đến/vi phạm đã chốt bị cấm đổi âm thầm.
5. Cấu hình biến VITE_SUPABASE_URL + publishable/anon key của **Preview** trỏ project thử nghiệm. Không đặt secret/service-role key trong VITE hay bundle browser. Không sửa cấu hình production ở lượt này.
6. Đăng nhập bằng ít nhất hai tài khoản thật để kiểm tra browser → Auth JWT → RPC → ledger → snapshot; kiểm thử trực tiếp PostgREST cùng các ca trong tests. Chỉ cân nhắc production sau backup, rà mapping và kiểm chứng staging.

SQL dùng auth.uid() + membership trong DB, khóa hàng đội để serialize write, cutoff dựa clock server, grants chỉ cho RPC authenticated và không cho client SELECT/INSERT/UPDATE/DELETE trực tiếp bảng. Original rules/events có trigger cấm UPDATE/DELETE. SQL owner/đặc quyền quản trị vẫn có thể đổi schema/trigger, vì vậy đây **không phải** khẳng định database tuyệt đối không sửa được.

Điểm danh, late request và arrival là các loại event riêng. Mặc định: xin trước 60 phút (cho phép đúng hạn), cần duyệt, grace 5 phút, fine 50.000đ, request được duyệt dùng ETA làm baseline. Chọn exempt là chính sách rõ ràng; duyệt không mặc nhiên miễn phạt. Arrival correction được sử dụng khi chốt; correction sau chốt cần thêm điều chỉnh vi phạm/phạt, không tự sửa bản gốc. Khoản phạt là nghĩa vụ trong ledger vi phạm, **không tự tạo giao dịch thu tiền** vào quỹ.

Policy mặc định review, đạt N lần tạo task đúng kỳ và chống xử lý lại cùng task. Automatic sanctions bị server từ chối (không có background worker). Không cho tự duyệt/tự chốt/tự điều chỉnh/tự xử lý; admin không khóa/remove owner hay peer admin. Vi phạm của owner vẫn được đếm nhưng task xử lý owner không được tự giải quyết bởi admin đội. Không có chức năng khóa tài khoản toàn hệ thống.

## Kiểm thử

`npm test`: kiểm thử hook tài khoản/phiên hết hạn/cache/cleanup/logout local; personal preferences lưu ngay/rollback/isolation; pure scroll policy; timezone/DST/cutoff; render UI theo quyền; ledger legacy archive/undo. SQL được thực thi bằng PostgreSQL WASM (PGlite) với roles anon/authenticated và auth.uid fixture, bao gồm direct RPC trước/đúng/sau cutoff, privacy, grants, immutable originals, adjustment, retry, N threshold và month/quarter boundaries, lock scope/expiry.

Fixture thay clock_timestamp **chỉ trong database PGlite tạm của test**, không nằm trong migration hoặc project Supabase. Đây là kiểm chứng logic PostgreSQL; chưa thay thế kiểm thử JWT/PostgREST trên Supabase thật.

`npm run build`: Vite/PWA. Kiểm tra browser viewport 320/360/390/430px sẽ ghi trong kết quả preview. Không có thiết bị Safari iOS/Chrome Android thật để xác nhận native date picker, bàn phím và elastic bounce; không gọi viewport test là thử nghiệm thiết bị thật.

## Hạ tầng còn thiếu / giới hạn

- Project người dùng cung cấp là production và dashboard chưa đăng nhập. Migration **chưa được áp dụng**, chưa provision authenticated memberships/teams/matches, chưa chạy E2E Supabase JWT. Nghiệp vụ mới chưa hoạt động trên project thật.
- Cơ chế team/quỹ/chat/chiến thuật cũ vẫn lưu trên thiết bị; cache đã tách tài khoản nhưng chưa có đồng bộ toàn bộ đội/quỹ. RPC mới không giả vờ là migration toàn bộ data cũ.
- Không có workflow membership onboarding/secure invite trên server trong phạm vi này; provision thủ công có kiểm tra ở staging. Không có worker automatic sanctions, SMS/push, global account lock.
- SDK Supabase quản lý phiên theo cơ chế hiện có; danh sách chuyển tài khoản chỉ lưu avatar/tên/định danh đã che. Chỉ một phiên tại một thời điểm, tài khoản khác phải xác thực lại.
- Logout global chỉ thu hồi các phiên theo Supabase; access JWT đã phát hành có thể còn hợp lệ đến expiry. Không hứa thu hồi tức thì mọi token đã phát hành.

Tham khảo: [Supabase RPC/security definer](https://supabase.com/docs/guides/database/functions), [Sign-out scopes](https://supabase.com/docs/reference/javascript/auth-signout), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
