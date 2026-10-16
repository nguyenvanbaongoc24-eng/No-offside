# No Offside Pro — bàn giao giai đoạn 2

Ngày kiểm chứng: 16/10/2026. Bản tích hợp dùng React, token Light/Dark, Pressable và Framer Motion hiện có. Không tạo bộ nhận diện hoặc hệ thống điều hướng riêng.

## Mở tính năng

- Cá nhân → No Offside Pro; các mục Cáp kèo, Ngôi sao, Hiệp 3 và Media dùng chung một màn có thanh chọn module.
- Owner/Admin có thêm các lối vào từ nút + Thao tác nhanh. Dashboard có BXH nội bộ và lối xuất poster trận hiện tại.
- Sa bàn → chọn đội hình → lưu thành mẫu; thanh bút có chế độ di chuyển, bút đỏ/xanh, tẩy và hoàn tác. Lưu bằng thao tác lưu đội hình hiện có.
- Cài đặt đội → Luật phạt tự động dẫn đến phần tài chính Pro. Thành viên cũng xem được các khoản của chính mình từ Cá nhân.

## Quy tắc đã triển khai

### Cáp kèo

Lọc khu vực, trình độ, 7/30 ngày. Ban quản trị đăng/đóng kèo, gửi, nhận hoặc từ chối thách đấu. Khi nhận, server khóa bản ghi và tạo đúng một trận cho mỗi đội trong cùng transaction; retry không nhân đôi trận. Thành viên thường chỉ xem. Bảng tin công khai trong cộng đồng đội chỉ gồm thông tin đội/kèo, không đưa danh sách thành viên hoặc thông tin liên hệ cá nhân lên board.

### Ngôi sao phủi

Thẻ có số áo, avatar/chân dung, bàn thắng, kiến tạo và số trận. Thống kê đã chốt được ưu tiên hơn báo cáo cá nhân; không tạo rating hoặc thành tích giả. Có tải PNG thật qua html2canvas. Tách nền chân dung chạy tại thiết bị bằng MediaPipe, tùy chọn, tải runtime khoảng 14 MB lần đầu; không gửi ảnh lên server và không thay avatar hồ sơ. Có thể chọn PNG trong suốt có sẵn.

Chỉ người đã được ghi nhận có mặt/giờ đến của trận mới bầu MOTM. Mỗi người một phiếu, được đổi trước khi chốt; cửa sổ 72 giờ từ giờ đá. Chốt khi đủ phiếu hoặc hết cửa sổ, hòa phiếu chưa trao cúp. Cúp lưu thành bản ghi và hiển thị bảy ngày; đọc lại trận cũ không làm mới thời hạn. Cúp xuất hiện cạnh tên ở Cá nhân, thành viên và chat.

### Tài chính

Ba luật mặc định **tắt**: thẻ vàng 50.000 đ/thẻ, đi muộn đã xác nhận 30.000 đ, báo vắng trong hai giờ sát trận 100.000 đ. Ban quản trị bật từng luật. Phạt vàng áp dụng khi chốt thống kê, đi muộn/vắng áp dụng khi chốt trận hoặc thống kê; nguồn khoản phạt duy nhất ngăn tính hai lần. Không suy đoán đi muộn từ báo cáo cá nhân chưa xác nhận.

Phạt tạo nợ Quỹ đội, không tạo thu nhập giả. Duyệt thanh toán qua luồng hiện có. Đã sửa tình huống phát sinh phạt mới trong lúc một yêu cầu thanh toán cũ đang chờ: chỉ xóa nợ thuộc snapshot yêu cầu, giữ khoản phát sinh sau. Yêu cầu cũ không có snapshot được kiểm tra tổng tiền để tránh xóa nhầm nợ; có thay đổi cần đối soát lại.

Bill Hiệp 3 là sổ riêng; chọn người và tổng bill nguyên đồng, phân phần dư từng đồng để tổng luôn bằng bill. Không trộn bill vào thu Quỹ đội. Admin ghi nhận đã thu hoặc miễn khoản cần có lý do, giữ dấu vết kiểm toán. Thành viên chỉ đọc được khoản của mình. Thông báo trong app và push dùng cơ chế tùy chọn/outbox sẵn có; người chưa đăng ký nhận push không bị tự bật. Toast người nhận khi app đang mở được phát hiện qua lần tải dữ liệu tiếp theo (tối đa khoảng 15 giây), không phải WebSocket mới.

### Media Studio

Chọn trận, xuất poster PNG gồm logo đội, đối thủ, giờ/tỉ số và sân. Nền mặc định là sân cỏ vẽ bằng CSS; có thể chọn ảnh sân từ thiết bị cho poster. Ảnh ngoài không cho CORS có thể không xuất được vào PNG. Khoảnh khắc hỗ trợ URL ảnh HTTPS PNG/JPG/WebP, YouTube/Shorts, TikTok đầy đủ; link TikTok rút gọn chưa hỗ trợ. Không nhận HTML nhúng tùy ý. Tác giả hoặc Admin có thể ẩn bài, giữ bản ghi.

### Sa bàn Pro

Mẫu 2-3-1 và 3-2-1 dùng hệ thống đội hình hiện có, lưu bản sao thành mẫu mới. Canvas nét đứt và đầu mũi tên, tọa độ chuẩn hóa nên theo kích thước sân. Chế độ vẽ không kéo cầu thủ; chuyển về di chuyển để chỉnh vị trí. Giới hạn server: 30 mẫu, 80 nét/mẫu, 400 điểm/nét; chỉ nhận màu đỏ/xanh và tọa độ trong sân.

## Dữ liệu, quyền và triển khai

- Đã áp dụng Supabase migration `202610160003_no_offside_pro.sql` và `202610160004_pro_settlement_snapshot.sql` trên project hiện hữu `xofcoycdndyuuuxtwcwl`.
- 10 bảng mới bật RLS; không mở quyền bảng trực tiếp cho anon/authenticated. RPC xác thực thành viên, vai trò và phạm vi đội ở server. Helper nội bộ không được gọi trực tiếp bởi client.
- Dùng action Pro của `/api/sync`, không tăng số Vercel Functions. Khóa theo đội, receipt idempotency và transaction bảo vệ ghi đồng thời.
- Tải Pro, html2canvas và MediaPipe theo nhu cầu. WASM được chuẩn bị từ dependency khi build, không commit binary và không precache PWA runtime ML.
- Tải Pro độc lập với splash/auth; lỗi Pro có Thử lại và không chặn khởi động app. Đổi tài khoản/đội không hiển thị dữ liệu Pro của phạm vi trước.

## Kiểm chứng

- `npm test`: 196/196 đạt. Có kiểm thử SQL thực bằng PGlite cho quyền, atomic matchmaking, retry, chia bill, phạt, MOTM, media, giới hạn sa bàn và snapshot thanh toán; kiểm thử API và hook chuyển tài khoản/phản hồi đến trễ.
- `npm run build`: đạt. Vẫn còn cảnh báo main chunk lớn hơn 500 kB; không nới ngưỡng cảnh báo để che đi. PWA 17 mục precache, khoảng 1,57 MB; ML tải riêng.
- `npm audit --omit=dev`: không có lỗ hổng production được npm báo tại thời điểm kiểm tra; không ép nâng dependency ngoài phạm vi.
- SQL live trong transaction rollback: nhận kèo tạo một trận mỗi đội, retry không trùng, bill giữ đúng tổng, từ chối người ngoài, snapshot giữ nợ phát sinh mới. Đọc trạng thái với workspace đang tồn tại thành công. Kết quả cuối: guard thanh toán và khóa đồng thời sẵn sàng, 0 đội thử còn lại.
- Không đăng kèo thật, tạo nợ thật, bật luật cho đội thật hoặc gửi push kiểm thử đến người dùng thật trong đợt này.
- Trình duyệt: 32 tổ hợp bốn module × hai theme × 320/360/390/430 px không tràn ngang; control chính tối thiểu 44 px, input 16 px. Đã mở/đóng modal bằng nền ngoài, xuất PNG thẻ/poster, tách nền chân dung và vẽ/tẩy/hoàn tác trên canvas bằng pointer thật.
- Preview dùng dữ liệu mẫu được gắn nhãn; không phải các giao dịch đã đăng trên production. Ảnh bàn giao nằm trong thư mục visualization của phiên làm việc.
- Chưa kiểm chứng trực tiếp Safari iPhone/Android, bàn phím thiết bị thật hoặc nhận push cho các sự kiện Pro mới. Tách nền phụ thuộc WebAssembly, mạng lần đầu và chất lượng ảnh; có phương án dùng ảnh sẵn nếu thiết bị không đáp ứng. Video nhúng phụ thuộc nền tảng nguồn và chính sách phát của trình duyệt.

## Tham khảo kỹ thuật

- html2canvas: https://html2canvas.hertzen.com/configuration
- TikTok player: https://developers.tiktok.com/docs/en/embed-player
- MediaPipe Image Segmenter Web: https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter/web_js
