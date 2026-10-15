# NO OFFSIDE — Master Requirements 2026

Phiên bản: 1.0 · Ngày: 15/10/2026  
Mục đích: đặc tả tổng hợp để Codex rà soát, sửa lỗi, hoàn thiện tính năng và thiết kế lại toàn hệ thống.

## 1. Sản phẩm, nguồn và cách thực thi

- Web app quản lý đội bóng phong trào, ưu tiên mobile iOS/Android.
- Repository: https://github.com/nguyenvanbaongoc24-eng/No-offside
- Production: https://no-offside.vercel.app/
- Hạ tầng hiện tại: Supabase + Vercel; tái sử dụng project đã liên kết.
- Ưu tiên chi phí bằng 0 trong hạn mức miễn phí, không tự thêm dịch vụ mất phí. Không bảo đảm miễn phí vô hạn khi vượt quota.
- Các ảnh mockup Dashboard, Chat và Splash đã trao đổi là tham chiếu thẩm mỹ; dữ liệu trong ảnh không phải dữ liệu để hardcode.
- Tài liệu tổng hợp yêu cầu, không phải chứng nhận tính năng đã được triển khai hay kiểm thử.

### Chỉ thị cho Codex

1. Đọc AGENTS.md, tài liệu, cấu hình, schema, RLS và code thực tế.
2. Lập ma trận từng ID yêu cầu: đã có / lỗi / thiếu / chưa kiểm chứng.
3. Tái hiện trước khi sửa; kiểm tra luồng browser → API → database → giao diện.
4. Chủ động giải quyết lựa chọn triển khai thông thường, không dừng ở kế hoạch.
5. Giữ code và thay đổi của người dùng; không reset, ghi đè hoặc force-push.
6. Không báo thành công giả, không dùng localStorage thay cho database nghiệp vụ.
7. Không xóa dữ liệu production, gửi lời mời thật hoặc thử chuyển tiền thật để test.
8. Không đưa secret/service-role key vào frontend, không bỏ RLS để chữa lỗi.
9. Thiếu quyền/cấu hình thì ghi blocker cụ thể, tiếp tục phần độc lập.
10. Mọi tính năng bên dưới cần được kiểm kê; chức năng phụ thuộc hạ tầng chưa có phải ghi rõ, không chỉ dựng nút.

## 2. Quyết định thống nhất và điểm cần xác nhận nghiệp vụ

| Chủ đề | Quy tắc áp dụng |
| --- | --- |
| Navigation | Viên thuốc nổi, thay cho yêu cầu thanh phẳng trước đó |
| Tên tab | Trang chủ / Chiến thuật / Quỹ đội / Tin nhắn / Cá nhân |
| Nền | Xanh sân cỏ tiết chế; giảm texture/gradient thừa so với mockup đầu |
| Đăng nhập | Splash trước, sau đó login trừ khi user đã bật tự động đăng nhập và phiên hợp lệ |
| Onboarding đội | Chỉ hỏi khi chưa có membership phù hợp; không hỏi lại mọi lần mở Dashboard |
| Owner | Chỉ được cấp Owner qua giao dịch tạo đội, không do tự khai hoặc đăng ký tài khoản |
| Xin muộn | Cách hiểu hiện dùng: gửi chậm nhất N phút trước giờ đá, mặc định N=60; admin cấu hình |
| Khóa | Admin đội khóa tư cách/quyền trong đội; không khóa Auth account toàn hệ thống |
| Dữ liệu chốt | Bảo toàn bản gốc; sửa sai bằng bản điều chỉnh có audit |
| Reset test | Yêu cầu cũ mang tính một lần, KHÔNG phải lệnh xóa user khi thực thi tài liệu này |

Các yêu cầu auth từng nêu gồm username và mật khẩu 6 chữ số, đăng nhập Google/Gmail, khôi phục qua Gmail. Cần kiểm tra cách triển khai thực tế và khả năng của nhà cung cấp; không hạ chính sách bảo mật để ép mật khẩu yếu, không lưu/gửi mật khẩu qua email. Nếu bắt buộc chính xác 6 chữ số, ghi đây là điểm cần quyết định riêng trước khi thay cơ chế auth; giữ luồng an toàn hiện tại trong khi hoàn thiện UI và tính năng độc lập.

## 3. Tài khoản, xác thực và khởi động

### AUTH-01 — Đăng ký/đăng nhập

- Đăng ký gồm họ tên, email, username, mật khẩu và xác nhận; hỗ trợ Google nếu cấu hình đã có.
- Gmail trong yêu cầu là tài khoản Google/email, không phải một danh tính user riêng để tạo trùng.
- Username liên kết cùng user ID; không dùng metadata frontend để cấp quyền.
- Đăng ký thành công chuyển về tab đăng nhập hoặc trạng thái chờ xác minh rõ ràng.
- Chưa xác minh email: alert đỏ trong form: “Email của bạn chưa được xác minh. Hãy kiểm tra hộp thư, mở liên kết xác minh rồi đăng nhập lại.”
- Có hướng dẫn kiểm tra thư rác; gửi lại xác minh nếu được hỗ trợ, có cooldown và rate limit.
- Phân loại đúng lỗi email, mật khẩu, mạng và giới hạn request.
- Khôi phục mật khẩu bằng link/token dùng một lần đến email đã đăng ký, không gửi mật khẩu cũ/mới dạng rõ.
- Không bắt buộc SMS OTP; không thêm nhà cung cấp SMS trả phí.
- Email xác minh/recovery phải có cấu hình gửi thực tế; không giả định email miễn phí đáp ứng production nếu chưa kiểm tra hạn mức.

### AUTH-02 — Nhớ tài khoản, tự đăng nhập, chuyển phiên

- Nhớ định danh tài khoản nếu người dùng chọn, không lưu mật khẩu.
- Tùy chọn “Tự động đăng nhập” quyết định có bỏ qua màn login khi phiên còn hợp lệ.
- Tắt tự đăng nhập phải thực sự yêu cầu hành động xác thực ở lần khởi động tiếp theo theo cơ chế provider; không chỉ che Dashboard bằng một form.
- Chuyển tài khoản khác với chuyển đội; có thêm tài khoản và đăng xuất.
- Tách cache, draft, subscriptions và dữ liệu theo user/team; không nháy dữ liệu tài khoản trước.
- Phiên hết hạn được xác thực lại; không xây kho token không an toàn.

### SPLASH-01 — Màn chờ

- Logo chính thức trong khung vuông bo góc: khoảng 88–104 px, radius 22–26 px.
- Bên dưới “NO OFFSIDE” và “Hẹn nhau ra sân.”; loading nhỏ.
- Light trắng ngà/gradient xanh nhẹ; Dark xanh đen/gradient trầm.
- Không navigation, form hoặc thời gian chờ giả.
- Khôi phục theme/phiên và xác định route tối thiểu; không chờ request phụ.
- Không nháy login rồi Dashboard; không hiện splash mỗi lần đổi tab.
- Lỗi khởi tạo có thử lại; không spinner vô hạn.
- Tránh hai splash kéo dài khi chạy PWA.
- Wordmark trong mockup splash là tạm, không mặc định thay logo chính thức.

## 4. Đội bóng, onboarding và lời mời

### TEAM-01 — Tạo hoặc gia nhập

- Sau đăng nhập, nếu chưa thuộc đội: hai lựa chọn “Tạo đội mới” / “Gia nhập đội”.
- Có membership hợp lệ: vào đội đã chọn hoặc chọn đội, không hỏi lại.
- Tạo đội phải lưu đội + Owner membership nhất quán, dùng transaction/RPC nếu cần.
- Chỉ báo thành công sau khi server xác nhận; chống tạo trùng khi retry.
- Refresh/đăng nhập lại/thiết bị khác phải thấy đội.

### INVITE-01 — Club code, QR và link

- Admin có quyền tạo/xem, sao chép và chia sẻ mã Club/link/QR.
- Dashboard có “Thêm thành viên”; Cá nhân có “Mời thành viên” hoạt động thật.
- Mời đúng đội đang chọn; không tạo link hoặc QR giả.
- Quét QR/link cho xem thông tin đội và điền họ tên, số áo, vị trí cần thiết.
- Với khách chưa đăng nhập: giữ dữ liệu đăng ký tạm, yêu cầu tạo/xác thực tài khoản trước khi ghi membership chính thức.
- Với user đã đăng nhập: liên kết đúng user ID, không tạo tài khoản trùng.
- Quy trình duyệt nếu đội có bật phải phản ánh trạng thái chờ, không báo đã gia nhập sớm.
- Mã có cơ chế thu hồi/đổi, kiểm tra hạn và chống đoán mã theo kiến trúc.
- Chia sẻ không được hỗ trợ thì có fallback sao chép và thông báo thực tế.

### MEMBER-01 — Quản lý nhân sự

- Họ tên, số áo, vị trí; thông tin phụ: avatar, liên hệ, ngày sinh, chiều cao/cân nặng theo mô hình.
- Admin thêm thủ công; hồ sơ chưa có tài khoản khác Auth user.
- Không tạo mật khẩu/Auth user giả; có cơ chế liên kết người được thêm khi họ đăng ký.
- Tìm theo tên/số áo/vị trí; nhận cả “19”, “#19”, khoảng trắng, hoa/thường, không dấu khi phù hợp.
- Bộ lọc Tất cả/Ban quản lý/Cầu thủ đúng số liệu.
- Sinh nhật có hiển thị/lời chúc theo cài đặt, không giả gửi SMS/push.
- Quyền Owner/Admin/Member và chức danh được tách rõ; chỉ đúng quyền mới duyệt/cấp/giáng quyền.
- Chuyển quyền Owner bảo đảm không có đội mất chủ hoặc cấp sai user.
- Xóa/loại thành viên không làm mất lịch sử trận/quỹ.

## 5. Lịch trận, điểm danh và chiến thuật

### MATCH-01 — Quản lý trận

- Tạo/sửa đối thủ, tên trận, sân, ngày giờ, hạn điểm danh và chính sách phạt.
- Giới hạn tạo trận nếu có được giải thích, không tự thay hạn mức.
- Hạn điểm danh trước giờ đá, xử lý múi giờ đội nhất quán.
- Danh sách nhiều trận có chọn trận; “Sắp đá/Đã xong” là filter thuần, không mutate trạng thái.
- Kết thúc/hủy/lưu trữ là hành động riêng, đúng quyền, có xác nhận.
- Trận đã kết thúc không còn countdown điểm danh đang chạy.
- Thẻ lớn kèo/trận mới có swipe trái mở nút xóa; không áp dụng lên tab menu hoặc dòng không đúng entity.
- Vuốt không tự xóa; phân biệt cuộn dọc, xác nhận và hoàn tác theo cơ chế thật.
- Nếu có dữ liệu liên quan, giữ lịch sử bằng hủy/lưu trữ phù hợp, không cascade âm thầm.
- Form ngày giờ thẳng lề, không vượt container trên Safari.

### ATTEND-01 — Điểm danh

- “Có mặt / Chưa chắc / Vắng”; nhóm “Chưa điểm danh”.
- “Điểm danh của tôi” rõ trên Dashboard cho mọi người có quyền tham gia, gồm Owner.
- Tổng nhóm bằng số thành viên đủ điều kiện trong trận; phân biệt với tổng thành viên hiện tại của đội.
- Snapshot lịch sử nếu có không bị đổi sai khi member rời đội.
- Số chữ, aria-label, tooltip và progress cùng nguồn.
- Khóa đúng hạn ở backend, không chỉ disabled trên frontend.
- Thông báo/nhắc phản ánh kênh thực tế.

### LATE-01 — Xin muộn và giờ đến

- Admin cấu hình hạn gửi trước N phút, mặc định 60, có cần duyệt, dung sai và mức phạt.
- Trận 18:30, N=60: gửi đến 17:30 theo thời gian server; sau đó khóa và giải thích.
- Form giờ dự kiến, lý do; trạng thái chờ/duyệt/từ chối.
- Điểm danh, yêu cầu muộn và giờ đến thực tế là dữ liệu riêng.
- Bấm “Có mặt” không chứng minh đã đến sân.
- Ghi nhận giờ đến qua phương thức đáng tin cậy/người có quyền theo nghiệp vụ.
- Có mặt đúng giờ nhưng thực tế muộn bị xử lý; đã xin muộn áp dụng chính sách riêng.
- Bản chốt không cho user sửa để xóa vi phạm; điều chỉnh có lý do/người/thời gian.
- Chống ghi phạt trùng và kiểm tra API trực tiếp quá hạn.

### TACTIC-01 — Chiến thuật

- Tên màn/tab thống nhất “Chiến thuật”.
- Tạo/chọn sơ đồ, kéo vị trí, đổi người, cầu thủ dự bị và lưu.
- Tap không làm dịch vị trí; drag không mở nhầm picker.
- Pointer capture/cancel, giới hạn cả token/nhãn trong sân.
- Không trùng người ở nhiều vị trí nếu nghiệp vụ không cho phép.
- Phân biệt sơ đồ đang xem/đang chọn với đã lưu/đang sử dụng.
- Badge lựa chọn nhỏ, không giống nút thứ hai; “Tạo sơ đồ” gọn.
- Lưu theo đội và phạm vi trận nếu hệ thống có, refresh vẫn đúng.

### STATS-01 — Thành tích

- Số trận/bàn thắng/kiến tạo theo mùa và đúng phạm vi.
- Thành tích theo user + trận, cập nhật thay vì cộng lặp.
- Chỉ nhập ở trạng thái trận phù hợp; công bố tự khai hay được xác nhận.
- Không tự đặt chính sách kiểm duyệt mới làm sai dữ liệu hiện có.

## 6. Quỹ đội

### FUND-01 — Sổ và trạng thái đóng

- Thu/chi, thêm/sửa, thời gian giao dịch và người ghi.
- Tách transaction_at với created_at/updated_at; dữ liệu cũ chỉ có ngày không được gán giờ giả.
- Số dư hiện tại khác thu/chi theo kỳ; bộ lọc tháng/khoảng ngày rõ.
- Tổng sổ khớp thu/chi/số dư; không hardcode.
- Phân biệt chưa báo nộp, chờ xác nhận, đã xác nhận, bị từ chối.
- Người chờ duyệt không bị nhắc như chưa nộp.
- Duyệt/từ chối có thông tin đối soát và lý do theo chức năng; thao tác thủ công không phải xác nhận ngân hàng.
- Chống duyệt trùng, request retry và đồng thời.
- Sửa giao dịch có audit/bản điều chỉnh phù hợp, không xóa lịch sử âm thầm.
- Xuất Excel: đúng kỳ, tiếng Việt, ngày giờ, tiền và tổng.

### QR-01 — Tài khoản nhận quỹ

- Danh sách ngân hàng đầy đủ trong phạm vi tích hợp QR hỗ trợ; tìm tên/mã/không dấu.
- Mã ngân hàng chính xác, có loading/lỗi; không chỉ thêm nhãn UI.
- Hai cách: tạo QR từ tài khoản hoặc tải ảnh QR sẵn.
- Upload PNG/JPEG/WebP: kiểm tra nội dung/loại/dung lượng, xem trước/thay/xóa theo quyền.
- Không crop mất mã/khoảng trắng, không đảo màu QR trong Dark.
- Storage lưu theo đội, quyền đọc/ghi đúng, refresh/thiết bị khác truy cập được.
- Tên người nhận ngân hàng tách chức danh “Thủ quỹ”.
- Không khẳng định ảnh QR khớp tài khoản nếu chưa giải mã/đối chiếu.

## 7. Nội quy, vi phạm và xử lý

### RULE-01

- Member đọc Nội quy; người được cấp quyền sửa.
- Lưu phiên bản, thời điểm hiệu lực, người cập nhật.
- Xác nhận đã đọc nếu đội bật, gắn đúng phiên bản.
- Vi phạm gắn với nội quy có hiệu lực lúc xảy ra.

### VIOLATION-01

- Loại, mô tả, thời điểm, người ghi, người vi phạm, trận, khoản phạt, trạng thái và lịch sử.
- Cấu hình ngưỡng theo tháng/quý, múi giờ và định nghĩa ranh giới kỳ.
- Mặc định đạt N lần thì tạo yêu cầu xử lý; admin có thể bật tự động nếu backend hỗ trợ.
- Chỉ đếm bản ghi hợp lệ theo quy tắc; không đếm lặp do retry.
- Cảnh cáo áp dụng mọi vai trò; không cho tự duyệt/xóa vi phạm của mình.
- Admin cảnh cáo/khóa trong đội/loại khỏi đội theo quyền, có lý do và thời hạn khi phù hợp.
- Không cho admin đội khóa Auth account toàn hệ thống hoặc tùy ý khóa Owner.
- Thành viên xem lịch sử của mình; quản trị xem theo quyền; không công khai chi tiết toàn đội mặc định.
- Giữ lịch sử khi rời đội; bản sửa sai là điều chỉnh có audit.

## 8. Chat, thông báo, avatar và đồng bộ

### CHAT-01

- Lưu lịch sử theo đội và người gửi trong backend, tải lại/đăng nhập lại/thiết bị khác vẫn thấy đúng quyền.
- Realtime nếu có: reconnect, chống trùng/thiếu tin, thứ tự ổn định và pagination lịch sử.
- UI: header đội + số thành viên, tin đến trái có tên/avatar, tin của tôi phải.
- Nhóm tin liên tiếp; thời gian, ngày và sự kiện hệ thống có thứ bậc phụ.
- Chỉ hiển thị delivery/read receipts khi backend có bằng chứng.
- Tin dài/URL/tiếng Việt không tràn; empty/loading/error/retry rõ.
- Ghìm/chia sẻ trận, tìm kiếm, attachment chỉ hiện khi có chức năng thật; kiểm kê thiếu để triển khai hoặc ghi blocker.
- Composer tăng đến 4–5 dòng, chống gửi trắng/trùng, draft tách theo đội/user.
- Đọc tin cũ không bị auto-scroll kéo xuống; có nút tin mới/xuống cuối.
- Tải lịch sử giữ vị trí đọc.
- Bàn phím mở ẩn navigation, composer trên bàn phím; không khoảng trắng sót khi đóng.

### NOTIFY-01 và PROFILE-01

- Chuông/badge dựa unread thực; click dẫn đúng nội dung, đọc cập nhật nhất quán.
- Phân biệt in-app với email/SMS/Zalo/push. Không báo gửi qua kênh chưa kết nối.
- Avatar upload lưu storage + liên kết profile thật; thay ảnh hiển thị trên các thiết bị và cache cập nhật.
- Không có ảnh thì fallback chữ cái gọn; không dùng avatar người mẫu hardcode.

## 9. Hệ thống giao diện mới theo định hướng 2026

Định hướng thiết kế: thể thao tinh gọn, hierarchy rõ, navigation nổi nhẹ, dark được thiết kế riêng và motion có mục đích. Đây là lựa chọn cho No Offside, không yêu cầu sao chép một nền tảng.

Nguồn tham chiếu:
- Apple Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Material 3: https://m3.material.io/
- Motion: https://m3.material.io/styles/motion/overview/how-it-works

Chỉ dùng translucency ở lớp điều khiển/navigation khi vẫn đọc tốt. Nội dung, form, sổ quỹ và bubble chat có nền rõ. Không glassmorphism toàn app.

### UI-01 — Tokens

| Token | Light đề xuất | Dark đề xuất |
| --- | --- | --- |
| Background | #F5F7F6 | #0B1210 |
| Surface | #FFFFFF | #141E1A |
| Secondary surface | #F0F4F2 | #1B2722 |
| Elevated | #FFFFFF | #202E27 |
| Primary text | #14201A | #F2F6F3 |
| Secondary text | #59665F | #B3BFB7 |
| Muted text | #6C7971 | #94A399 |
| Border | #E1E8E3 | #2B3931 |
| Accent | #17843B | #63CD79 |
| Accent soft | #E8F5EC | #183C25 |
| Danger | #C53645 | #F08088 |
| Warning | #9A6700 | #EAC45B |

Màu là điểm bắt đầu, phải đo tương phản theo nền thật. Text thường tối thiểu 4.5:1; không mặc định mọi nút xanh dùng chữ trắng.

- Header Light xanh cỏ trầm chuyển về trắng ngà; Dark xanh rừng chuyển xanh đen.
- Gradient ngắn, không texture sân cỏ nặng, glow/neon hoặc đốm màu trang trí.
- Ít card lồng, viền mảnh, bóng nhẹ; Dark ưu tiên phân cấp surface.
- Spacing 4/8/12/16/20/24/32 px; mobile gutter 16 px.
- Radius card 14–18 px; button 10–14 px; nav bo hoàn toàn.
- Một font hỗ trợ tiếng Việt, đồng bộ button/input/select/modal/toast.
- Tiêu đề 24–28 px; section 17–18; body/input 16; metadata 13–14; nav 11–12.
- Dùng chữ số thẳng hàng cho tiền/thống kê khi font hỗ trợ.
- SVG một bộ, không emoji/Unicode giả icon; icon nav 22–24 px, control 18–20.
- Logo chính thức; không vẽ status bar, Dynamic Island hay home indicator giả trong sản phẩm.

### UI-02 — Dashboard

1. Logo/tên đội/chuyển đội/chuông, header gọn, bỏ lời chào dài dư.
2. Trận tiếp theo: đối thủ, ngày giờ, sân và chi tiết.
3. Điểm danh của tôi và tổng đội.
4. Việc cần xử lý theo vai trò.
5. Tối đa bốn shortcut hữu ích.
6. Quỹ/thống kê phụ, không cạnh tranh lịch trận.

- Không lặp danh sách dài và thẻ chi tiết cùng một trận.
- Chưa có trận: empty state + Tạo trận theo quyền, không form dài chiếm trang.
- Không hardcode số badge hoặc dữ liệu từ mockup.

### UI-03 — Cá nhân và tùy chọn

- Header avatar/họ tên/số áo/vị trí + Sửa hồ sơ.
- Menu nhóm Hồ sơ / Đội bóng / Tùy chọn / Tài khoản.
- Quản trị đội tách màn riêng: quyền, chờ duyệt, vi phạm, cấu hình.
- Thao tác nhanh Chuyển đội/Mời/Nội quy/Quản lý tùy quyền.
- Theme Sáng/Tối/Hệ thống, font, VI/EN đổi ngay, tự lưu sở thích.
- Lựa chọn giao diện của người dùng không thay cả đội; không flash theme sai khi tải.
- VI/EN và mặt trời/mặt trăng segmented gọn, SVG, label rõ, không cờ emoji.
- Font tùy chọn hiện có như hệ thống/Be Vietnam Pro phải áp dụng toàn app.

### UI-04 — Navigation và layout

- Capsule nổi duy nhất cách mép 12–16 px, năm cột cân nhau.
- Trang chủ / Chiến thuật / Quỹ đội / Tin nhắn / Cá nhân.
- Active highlight mint nhẹ/green trầm, không năm pill lớn.
- Safe area và padding đáy do một nơi quản lý, không cộng lặp.
- Cuộn xuống ẩn, ngược lên hiện; đầu trang hiện; không rung do bounce.
- Hidden không nhận pointer/focus.
- Desktop thích ứng: tận dụng không gian có chủ đích, không kéo giãn sân/bubble, không chỉ phóng to mobile.
- Header/card/form chung lề; min-width:0 và box-sizing đúng; không absolute cho layout thường.
- Sửa khoảng trắng dư ở cuối: vh/dvh/min-height, spacer, padding, safe area, keyboard, exit animation, nested scroll.
- Không overflow:hidden toàn trang hoặc margin âm để che lỗi.
- Date/time native không tràn; dropdown một chevron, label/focus đúng.
- Input text/placeholder/caret/selection/autofill/readonly/disabled đều đọc rõ ở hai theme.

## 10. Motion, hiệu năng và khả năng truy cập

### MOTION-01

- Motion tokens: press 100–150 ms; control 160–200; menu/toast 180–220; route 200–260; sheet 240–300.
- Đây là ngân sách tham chiếu, spring nếu dùng phải ít nảy và phản hồi ngắt/đổi hướng tự nhiên.
- Tab fade/di chuyển ngắn, màn con chuyển theo hướng; Back ngược, không trắng giữa route.
- Không chờ animation mới cho thao tác; không replay cả trang khi data đổi.
- Sheet quản lý focus/scroll restore; reduced-motion có fallback.
- Ưu tiên transform/opacity, không animate gradient hoặc chiều cao gây nhảy.
- Chat có scroll riêng, không dùng listener Dashboard.

### PERF-01 và A11Y-01

- Đo render/scroll trước khi tối ưu; không memo hóa hoặc thêm thư viện nặng hàng loạt.
- Dọn listener/timer/subscription; countdown không render toàn app mỗi giây.
- Tối ưu ảnh, lazy load phù hợp; pagination/virtualization danh sách dài khi có căn cứ.
- Không lạm dụng blur/backdrop-filter/will-change.
- Vùng chạm ít nhất 44×44 px, ưu tiên 48.
- Label/input liên kết, icon-only có tên, focus rõ, modal Escape/focus return.
- Không vô hiệu hóa zoom; hỗ trợ chữ lớn, reduced motion.
- Status live không đọc lại toàn lịch sử chat.
- Kiểm tra màu lỗi không phải dấu hiệu duy nhất.

## 11. PWA, phiên bản và nhiều thiết bị

### UPDATE-01

- Manifest, icon 192/512/maskable, Apple touch icon, start_url/scope/display phù hợp.
- Cài đặt theo khả năng nền tảng, không nút cài giả.
- Kiểm tra service worker, cache strategy và nhận biết version sau Vercel redeploy.
- Tài nguyên có fingerprint; HTML/version endpoint không bị giữ cũ sai.
- Khi mở lại/focus và có mạng, kiểm tra bản mới hợp lý; xử lý service worker waiting theo thiết kế.
- Thông báo cập nhật, reload ở thời điểm an toàn; không mất draft hoặc giao dịch đang gửi.
- Không cam kết thiết bị offline/đang ngủ sẽ cập nhật ngay lập tức.
- Không cache API auth/quỹ/private tùy tiện; không xây đồng bộ tài chính offline trong phạm vi này.
- Mạng lỗi có trạng thái thực, không thành công giả.
- Không mất dữ liệu chat/avatar khi đổi bản hoặc xóa cache assets.

## 12. Bảng kiểm lỗi cần tái hiện

Những phát hiện trước đây chỉ là dữ liệu review demo tại thời điểm đó, không kết luận hiện còn:

| ID | Ca tái hiện |
| --- | --- |
| BUG-01 | Bấm filter Đã xong có mutate trận và persist không |
| BUG-02 | Trận kết thúc còn countdown tương lai |
| BUG-03 | Back trình duyệt thoát app thay vì về màn trước |
| BUG-04 | 16 thành viên nhưng modal ghi 20 |
| BUG-05 | Tìm #19 không ra nhưng 19 có |
| BUG-06 | Tap cầu thủ dịch vị trí/không mở đổi người/cắt nhãn |
| BUG-07 | Aria điểm danh 14/2/2/2 khác UI 0/0/0/16 |
| BUG-08 | Chuông có chấm nhưng không có thông báo mới |
| BUG-09 | Tạo đội báo xong nhưng database không có |
| BUG-10 | Mời thành viên trong Cá nhân không hoạt động |
| BUG-11 | Khoảng trắng quá dài cuối màn, đặc biệt sau bàn phím |
| BUG-12 | Input chữ trùng nền; ngày giờ lệch/tràn |
| BUG-13 | Thẻ swipe đè lên Thành viên |
| BUG-14 | Người chờ duyệt quỹ vẫn bị nhắc như chưa nộp |
| BUG-15 | Thiết bị dùng bản cũ, mất lịch sử chat/avatar |

## 13. Kiểm thử, ưu tiên và nghiệm thu

### Thứ tự

1. P0: lưu dữ liệu, cách ly đội/quyền, mutation sai, auth và gửi trùng tài chính.
2. P1: onboarding/mời, điểm danh/xin muộn, chat/avatar persistence, Back và lỗi chặn thao tác.
3. P2: design system toàn app, khoảng trắng, theme, alignment, navigation.
4. P3: motion/performance/PWA update và tinh chỉnh.

### Ma trận kiểm thử

- Role: Owner/Admin/Member, người chưa có đội, nhiều đội.
- User: ít nhất hai tài khoản test, hai đội để kiểm tra cách ly.
- Data: rỗng/ít/nhiều, tên dài, ảnh lỗi, request lỗi/chậm/retry.
- Viewport: 320/360/390/430/768 px và desktop.
- Platform: Safari iOS, Chrome Android, browser và standalone khi có; ghi rõ môi trường thật hay emulation.
- UI: hai theme, font/language, zoom, focus/reduced motion.
- Interaction: Back/Forward, đổi tab/đội/user, keyboard, rotate, swipe, tap/drag.
- Persistence: refresh, logout/login, thiết bị khác; không coi state cùng tab là bằng chứng database.
- Time: trước/đúng/sau cutoff xin muộn; tháng/quý và timezone.
- Concurrency: create/approve/retry không duplicate.
- Version: bản cũ → redeploy → cập nhật an toàn, chat/avatar giữ nguyên.

### Điều kiện hoàn thành

- Tất cả ID có trạng thái và bằng chứng, không đánh dấu xong tính năng chỉ có UI.
- Lint/typecheck/test/build phù hợp repository đạt; có regression test cho lỗi quan trọng.
- Dữ liệu/role đúng backend, không hạ security để build qua.
- Không tràn/chồng/che nội dung, không trắng cuối dư, contrast và motion đúng.
- Luồng đọc lỗi có retry, luồng ghi không báo thành công giả.
- Screenshot/preview các màn chính Light/Dark; video motion nếu có công cụ.
- Blocker/cấu hình thiếu ghi rõ, không bịa kiểm thử thiết bị.

## 14. Git, migration và Vercel

- Đã có yêu cầu commit/push/deploy sau khi kiểm thử đạt; không cần hỏi lại lựa chọn triển khai thường lệ.
- Kiểm tra diff, không commit secret, cache, dữ liệu test hoặc file tạm.
- Push đúng branch; branch bảo vệ thì PR/checks theo chính sách, không bypass.
- Dùng project Vercel/domain đã liên kết; tránh deploy trùng nếu Git integration đã chạy.
- Migration tương thích ngược, có kế hoạch và rollback; không tự xóa/thu hẹp dữ liệu không thể khôi phục.
- Theo dõi deployment đến trạng thái cuối và smoke test domain thực tế.
- Không tuyên bố live nếu chỉ build local; nếu bị chặn, nêu trạng thái chính xác.

## 15. Báo cáo bắt buộc của Codex

1. Ma trận requirement/bug ID với trạng thái.
2. Nguyên nhân lỗi và thay đổi quan trọng.
3. Schema/RLS/storage/migration có sửa, cùng cách kiểm chứng.
4. Lệnh kiểm thử, kết quả và giới hạn.
5. Preview/ảnh/video phù hợp.
6. Commit SHA, branch, PR nếu có, deployment và URL đã xác minh.
7. Những điểm chưa hoàn thiện và bước còn cần người dùng thực hiện.

## 16. Prompt khởi chạy

> Đọc NO_OFFSIDE_MASTER_REQUIREMENTS_2026.md và triển khai No Offside theo tài liệu. Đầu tiên kiểm kê từng ID với code và dữ liệu hiện tại, sau đó sửa P0/P1, hoàn thiện design system mới toàn app và kiểm thử end-to-end. Chủ động thực hiện đến kết quả cụ thể, không dừng ở kế hoạch. Không xóa production hoặc bỏ qua kiểm tra quyền. Khi checks đạt, commit/push và cập nhật Vercel theo quy trình đã liên kết; bàn giao bằng chứng và phần còn thiếu.
