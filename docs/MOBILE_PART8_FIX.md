# Mobile — phần 8 (16/10/2026)

## Nguyên nhân và bản sửa

- Xin đến muộn trước đây dùng datetime-local và `new Date(eta)`, cho chọn nhầm ngày và diễn giải giờ theo thiết bị. Server gộp lỗi ETA (thiếu, trước trận, quá 12 giờ) và lý do ngắn vào cùng một thông báo tiếng Anh. Bản mới chỉ dùng native time input, ghép ngày trận theo giờ đội bằng helper thời gian đang có. Không hiển thị định danh múi giờ trên giao diện.
- Đã tái hiện native time input không giữ giá trị khi nhập lý do nếu chỉ lắng nghe React change. Đồng bộ cả input/change; khi gửi đọc giá trị control hiện tại, trim lý do, kiểm tra giờ **lớn hơn** giờ đá và không quá giới hạn 12 giờ của server. Giờ nhỏ hơn lúc đá được coi là cùng ngày và báo lỗi, không tự đổi sang hôm sau. Lỗi thời gian nằm ngay dưới ô giờ.
- Modal xin muộn chuyển qua portal vào body để tránh bị giữ trong transform/clipping của thẻ trận. Nội dung có overflow-y auto, giới hạn theo visual viewport, safe area, nền blur và tương tác Back/ngoài nền để đóng.
- Chat và dialog trước đây tự lưu/khôi phục body overflow độc lập, dễ lưu lại giá trị hidden của nhau. Dùng chung khóa có chủ sở hữu; chỉ chủ cuối rời mới khôi phục body/html, kể cả cleanup khác thứ tự hoặc gọi lặp. Focus trap nay bao gồm textarea.
- Tiền phạt điểm danh và đi muộn nhập/hiển thị theo định dạng Việt Nam, lưu draft dạng số nguyên. Gợi ý 20k/50k thay giá trị số, không nối chuỗi. Giữ input 16 px, nền và bo góc theo theme hiện tại.
- Thời gian trên thẻ trận, danh sách trận và lịch quản trị hiển thị `HH:mm - DD/MM/YYYY`. Giữ phép quy đổi giờ theo đội bên trong hệ thống.

## Kiểm chứng

- 201 kiểm thử tự động, gồm ngày/giờ khi thiết bị ở nước ngoài, giờ bằng/trước trận, quá 12 giờ, input wheel cập nhật trước change, lý do và ETA trong payload, khóa cuộn lồng nhau và khôi phục đúng thứ tự, định dạng tiền và gợi ý thay số.
- Payload tạo từ native time đã được đưa qua RPC SQL governance thật trong PostgreSQL PGlite cô lập và đọc lại ETA/lý do thành công. Không tạo yêu cầu thật hoặc gửi thông báo thử đến đội production.
- Trình duyệt: Light/Dark × 320/360/390/430 px đều không tràn ngang, sheet nằm trong viewport, input 16 px, đóng xong body/html đều được trả lại. Sheet 320×420 có chiều cuộn lớn hơn chiều hiển thị; cuộn thực đến nút Gửi được.
- Đã gửi mock thành công với ETA đã sửa, đóng bằng nút/nền ngoài/Back, và cuộn nền sau đóng đạt scrollY 300. Nhập `020000` → `20.000`; chọn 50k → `50.000`; nhập phạt muộn `030000` → `30.000`.
- Build Vite/PWA đạt; cảnh báo main chunk hơn 500 kB hiện hữu vẫn còn. Không thêm dependency, schema hoặc thay cơ chế duyệt/chế tài.
- Chưa kiểm chứng trực tiếp vòng xoay giờ, bàn phím và touch trên thiết bị Safari iOS/Android thật; kiểm tra trình duyệt dùng viewport mobile và native input/pointer.

Ảnh bàn giao: part8-validation-light.png, part8-small-dark.png, part8-fine-light.png; số đo part8-viewport-results.json trong thư mục visualization của phiên.
