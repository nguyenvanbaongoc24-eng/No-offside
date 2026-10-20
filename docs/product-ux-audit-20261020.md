# No Offside — kiểm tra sản phẩm và UX, 20/10/2026

Phạm vi: đối chiếu yêu cầu sản phẩm với code hiện tại, kiểm thử hồi quy API/PostgreSQL, chạy UI trên database dùng một lần và xác minh production. Không reset database, không đổi chính sách mật khẩu 6 số, không thêm dependency/dịch vụ.

## Lỗi đã xác minh và sửa

| Mức | Bằng chứng / nguyên nhân | Sửa |
|---|---|---|
| P1 | UI archive đã lên Git nhưng SQL production chưa có `archivedBy`; thay đổi nằm trong migration cũ đã chạy | Migration nâng cấp `202610200001_product_audit.sql`, không chạy lại CREATE bảng hoặc sửa dữ liệu cũ. Kết thúc/lưu trữ độc lập chốt điểm danh/thu chi; xử lý được việc còn thiếu của trận đã hoàn thành. |
| P1 | Tạo đợt thu lưu DB xong gọi `notify` chưa import: UI báo lỗi dù đã tạo | Import đúng, regression kiểm tra chỉ báo thành công sau backend; lỗi giữ form sửa được. |
| P1 | Thu kỳ 9 có hạn nộp/tạo tháng 10 bị tính thêm vào tháng 10; chi phí trận lẫn quỹ tháng | Một hàm xác định kỳ chuẩn dùng cho tổng quan và lịch sử; period ưu tiên, tách kind fund khỏi match/third. |
| P1 | Nhiều khoản cùng kỳ ghi đè trạng thái người đóng; đếm khoản như đếm người | Cộng từng nghĩa vụ theo người, giữ chi tiết từng khoản; pending không cộng tiền thực nhận. |
| P1 | Nút nhắc thành viên chỉ toast thành công, không ghi server | RPC `remind_member`, kiểm tra quyền/đội/người nhận/khoản còn thiếu, dedup theo ngày; lưu notice + audit event; không đổi tiền. |
| P2 | Tổng quan Dashboard dùng debtors cũ, không thấy khoản tạo bởi lịch thu server | Reuse module quỹ hiện có và phép tính cùng màn quỹ; thêm cho Dashboard chưa có trận. |
| P2 | Member chỉ có dữ liệu cá nhân nhưng UI nói số dư cả đội 0đ và gán đồng đội chưa có nghĩa vụ | Hiển thị phạm vi cá nhân, chỉ liệt kê bản thân; ẩn số dư/lịch nhắc quản trị. Không mở rộng RLS. |
| P2 | min/step 1000 chặn khoản còn thiếu 1đ; tổng nợ tháng được gửi cho một charge | Số nguyên VND từ 1 đến đúng dư charge, action rõ từng khoản, hồ sơ mở lấy dữ liệu mới. |
| P2 | Form điều kiện unmount giữ entry Back; nhiều hook mở subscription giống nhau | Cleanup entry theo vòng đời, bảo vệ StrictMode/nested sheet; dùng chung 1 signal channel/timer mỗi client/đội. |
| P2 | Push tới trận lịch sử chỉ mở Dashboard nơi trận không còn hiện | Mở đúng chi tiết matchId; giữ luồng focus người xin muộn ở trận chưa lưu trữ. |
| P2 | Ngày mặc định hạn thu 15 đã quá hạn vào ngày 20; tên/số tiền bị ép cột ở 320px chữ lớn | Ngày mặc định không trước hôm nay; xếp lại hàng nợ trên mobile; tab/shortcut cho phép xuống dòng; input 16px, action tối thiểu 44px. |

**Phát hiện thêm qua hai tài khoản thật:** route Quỹ đội của Member vẫn dùng màn cũ, nên phần tổng quan tháng mới chưa tới được người dùng thường. Đã đưa route về FundManagement dùng chung, quyền lấy từ server; giữ khoản quỹ cũ riêng khi thực sự có dữ liệu legacy. Không mở quyền xem số dư đội. Đồng thời đổi nút “Kết thúc trận” hiển thị nhầm cho Member/trận tương lai thành “Xem chi tiết trận đấu”.

Các nút/nhãn hệ thống sửa liên quan dùng “Chiến thuật”, “Tìm đối”, “Sinh tố lúa mạch”. Giữ theme xanh cỏ hiện tại, không thiết kế lại toàn bộ app.

## Kiểm chứng đã thực hiện

- `npm test`: **267/267** đạt, gồm auth/preferences/invite/RLS, attendance/late, finance/scheduler/settlement, chat/unread/push, assets/persistence và test mới. Đây là kiểm thử có boundary giả lập; không đồng nghĩa OAuth/email/push thật đều đã chạy.
- `npm run build`: đạt. Repository không có script lint/typecheck. Còn cảnh báo chunk chính khoảng 717kB, chưa tách bundle ở đợt này.
- Upgrade SQL được kiểm tra từ hàm production trước archive, không chỉ từ cài mới. Bao phủ archive không sinh tiền, retry/collision, sửa attendance/cost sau archive, nhắc có quyền/dedup, trả một phần/duyệt trùng và thu hồi quyền quỹ.
- Browser UI → `/api/sync` thực → PostgreSQL PGlite: hai vai trò Owner/Member, tạo 100.001đ + 200.000đ/người trong một tháng: tổng 900.003đ/3 người. Member báo 50.000đ: tiền thực nhận vẫn 0; Owner duyệt: số dư 50.000đ, còn thiếu toàn kỳ 850.003đ, member 250.001đ. Phiên kia tự cập nhật qua cơ chế refresh dự phòng, không reload. Auth/push transport của fixture giả lập, không chứng minh WebSocket production.
- Responsive Light/Dark, chữ lớn: 320/360/390/430/1280px; database thử 27 thành viên. Không tràn ngang document, tên/tiền/tab không bị clipping trong phép đo. 320×420 sheet cuộn được (`scrollHeight 699 > height 408`), đóng xong body `overflow-y:auto`, html visible.
- Preview dùng một lần: `.ui-review/product-audit-light.png`, `.ui-review/product-audit-dark.png`; kết quả đo `.ui-review/product-audit-layout.json`. Không đưa ảnh dữ liệu riêng production lên Git.
- Production SQL sau áp dụng: `finish_archives=true`, `targeted_reminder=true`, `anon_can_mutate=false`; đúng 1 cron thu quỹ active, có run thành công ngày 20/10. Không thay lịch scheduler.

## Kiểm tra bổ sung toàn bộ thanh tab

- Bản build Demo: đo Dashboard/Chiến thuật/Quỹ/Chat/Cá nhân ở 320/360/390/430/1280, Dark và Light (Light dùng chữ lớn), không tràn ngang document. Kết quả `.ui-review/product-audit-core-layout.json`. Demo chỉ chứng minh layout; dữ liệu/quyền được kiểm tra riêng qua hai phiên thật và SQL.
- Phát hiện **P2** tab active có FAB bị ép còn 25×52px ở 320px, label tràn lên icon bên cạnh dù document không tràn. Sửa ở màn ≤430px có FAB: chỉ hiện icon, vẫn giữ accessible name/active state; mỗi tab tối thiểu 44×52px. FAB ở <360px dùng 56px để đủ chỗ 5 tab. Đã đo lại CSS mới: mỗi tab 44px, FAB56px, không clipping. Không thu nhỏ vùng chạm để nhét nhãn.
- Chứng cứ preview dùng một lần: `.ui-review/product-audit-nav-320.png`, `.ui-review/product-audit-auth-320.png`.

## Giới hạn và việc cần kiểm chứng riêng

- Google OAuth thực, thư xác minh/reset trong hộp thư, đăng ký tài khoản mới chưa kiểm chứng end-to-end ở đợt này; không tự thay mật khẩu tài khoản thật.
- Chưa có Safari iOS/Android/keyboard vật lý để xác nhận; màn thấp chỉ mô phỏng viewport, không thay thế thử bàn phím hệ điều hành.
- Push iPhone được người dùng xác nhận ở đợt trước; đợt này không tự coi đó là lần kiểm thử mới.
- Không phát hiện đủ bằng chứng để đổi quy tắc tài chính/phạt; giữ chính sách hiện tại. Không tạo giao dịch giả hoặc nghĩa vụ thu quỹ trên dữ liệu thật để test.
- Hai phiên thật đã kiểm chứng trên hai origin riêng (domain chính/URL deployment), tài khoản Owner và Member đã được người dùng chỉ định. FC 37: tạo trận kỹ thuật `1b04ee93-5f4b-4860-abeb-2dceba0ab61d` không chi phí/không phạt, Member đăng ký Tham gia → Owner tự thấy 1/2; Member gửi ETA 19:15/lý do → Owner tự thấy 1 chờ; Owner duyệt → Member tự thấy Được duyệt, thực tế vẫn 2 chưa xác nhận. Không reload trong các bước đồng bộ. Không đo transport WebSocket riêng nên chưa kết luận tốc độ/tính ổn định WebSocket; fallback vẫn 15 giây, không tăng polling.
- Đã hủy trận kỹ thuật bằng UI, ghi rõ lý do và giữ nguyên lịch sử; thấy trong Lịch sử (Đã hủy). Không chốt/phạt hoặc tạo khoản tiền cho trận thử.
- Member trên release mới: CTA Dashboard mở đúng Quỹ tháng, hiển thị khoản của chính tài khoản; không thấy nút thu/chi/tạo lịch hoặc số dư toàn đội. FC 21 chỉ xem, không ghi dữ liệu.
- Rà soát UI thật: đăng nhập/đăng ký, Dashboard, chi tiết trận, Chat FC 37 (lịch sử cũ tải được), Chiến thuật, Hồ sơ, Thành tích, Thông báo và Cài đặt đội. Back từ Thành tích/Thông báo về Cá nhân đúng. Chat 320px: composer bottom 652, navigation top 660, không chồng; input 16px. Cài đặt thông báo tách tùy chọn tài khoản và quyền thiết bị. Không đổi toggle thật trong đợt này.
- Chỉnh thêm copy quyền ở Chiến thuật (Member đang xem thay vì bị hướng dẫn chỉnh sửa), và dòng sinh nhật chỉ nói rõ chưa gửi push sinh nhật tự động, tránh hiểu là mọi push chưa kết nối.
- Kiểm tra đăng ký 320px phát hiện wordmark bị ellipsis; header nay tách hai hàng ở dưới 360px, giữ logo/control và font input16px. Logo asset hiện có, không thay ảnh.
- Git/Vercel: bản sửa đã push main, production READY. Kiểm tra `/version.json` và UI thực tế sau update service worker; bản cuối được xác minh trong bàn giao. Không báo hoàn thành OAuth/email, upload asset mới, push vật lý hoặc onboarding account mới khi chưa chạy thực tế.
