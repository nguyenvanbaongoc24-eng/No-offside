# Bản chỉnh UI mobile — chưa phát hành production

Đã chỉnh theo văn bản yêu cầu. Thư mục đính kèm chỉ có `Pasted text.txt`, không
có hai ảnh tham chiếu, nên chưa đối chiếu trực quan được với ảnh gốc.

## Màn đã sửa

- Thanh tab: năm cột bằng nhau, Trang chủ / Đội hình / Quỹ đội / Tin nhắn /
  Cá nhân; icon Lucide 24 px, nét bo tròn thống nhất, nền trung tính và safe area.
- Quỹ đội: số dư chính, tổng thu/chi phụ, không lặp số dư dạng compact. Xuất CSV
  cho Excel và cấu hình tài khoản nhận quỹ nằm trong menu Thêm. Ba mục Giao dịch /
  Chờ duyệt / Chưa nộp; giữ nhãn Chưa nộp và giải thích khoản chờ duyệt chưa được
  xác nhận. Giao dịch có menu sửa và chữ Thu/Chi cùng dấu tiền.
- Thành viên mở Quỹ đội chỉ thấy khoản đóng của mình và luồng QR đã có. Không
  cấp quyền ghi giao dịch, cấu hình tài khoản nhận quỹ hay duyệt tiền.
- Trang chủ: header gọn, tối đa bốn thao tác thật theo quyền, ghi rõ trận đang
  chọn; thống kê phụ được mở bằng Xem thêm. Giờ/sân/điểm danh/quỹ vẫn hiện.
- Khi chưa có trận: trạng thái ngắn và nút Tạo trận cho người có quyền; form mở
  trong sheet thay vì chiếm trang chủ.
- Form tạo/sửa trận dùng chung: Thông tin trận / Điểm danh, label liên kết,
  hướng dẫn ngày giờ trống, input native min-width 0 và tối thiểu 16 px, footer
  lưu và chiều cao sheet theo visual viewport. Không đổi cách lưu/diễn giải giờ.
- Bỏ emoji và ký tự giả icon trang trí ở các màn đang dùng; giữ nội dung tin
  nhắn và dữ liệu người dùng. Không đổi manifest hoặc icon cài đặt PWA.

## Kiểm tra

- `npm test`: 11 kiểm thử (7 logic dữ liệu, 4 render HTML thực của component).
- `npm run build`: Vite + PWA production build.
- Repository không có lệnh lint hoặc typecheck riêng.
- Kiểm thử render HTML không chứng minh bố cục responsive, bàn phím hay cảm ứng.
  Chưa xác minh các viewport 320/360/390/430, Safari iOS, Chrome Android, xoay
  màn hình hoặc PWA standalone trên thiết bị thật. Công cụ trình duyệt đã chặn
  URL localhost trong phiên trước; không dùng đường vòng để vượt chính sách đó.

Thay đổi nằm trên nhánh riêng để xem preview. Không push thay đổi lên main,
không merge và không deploy production.
