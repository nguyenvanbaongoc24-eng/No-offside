# Danh sách điểm danh và duyệt đến muộn trên Dashboard

## Lỗi đã xác nhận

Tái hiện bằng chủ đội/quản trị FC 21 ở trận sân Bắc Việt ngày 17/10: số tổng 2/2 có mặt và đơn cá nhân đã có dữ liệu. Dashboard chỉ render `LateArrivalPanel` của chính người đăng nhập; không có danh sách đơn cả đội hoặc thao tác duyệt đơn người khác. Các đơn vẫn có trong màn Nội quy & vi phạm. Đây là thiếu giao diện quản lý ở thẻ trận, không phải mất dữ liệu điểm danh.

Avatar ở dòng tổng trước đây lấy thành viên đội nói chung, có thể hiện 3 avatar trong khi chỉ 2 người đủ điều kiện trận. Hồ sơ trong roster lấy tên tại lúc tạo trận nên có thể khác tên đã cập nhật.

Kiểm tra preview bằng dữ liệu thật còn xác nhận: thành viên tham gia sau lúc tạo trận được server nhận điểm danh nhưng bị loại khỏi roster UI do chỉ dùng `eligibleMembers` chụp khi tạo trận. Danh sách giờ ghép thêm người có bản ghi điểm danh được server nhận; không sửa danh sách gốc dùng cho deadline/phạt.

## Sửa

- Hiện tên người đã điểm danh ngay dưới dòng tổng; avatar chỉ lấy người đã điểm danh. Giữ nguyên danh sách đủ điều kiện và quy tắc chốt điểm danh.
- Roster giữ tư cách tham gia tại thời điểm tạo trận, ghép tên/avatar hiện tại bằng ID.
- Trên thẻ trận có danh sách Duyệt đến muộn, chỉ quản trị được server xác thực mới thấy. Đúng match ID, mỗi người chỉ hiện yêu cầu mới nhất; quyết định ghép đúng request ID. Hiện tên/số áo, điểm danh, ETA, lý do, trạng thái và phản hồi.
- Duyệt/từ chối qua API hiện có; form xác nhận, bắt buộc lý do từ chối, chặn gửi lặp, giữ lỗi để thử lại. Không tự duyệt thay người dùng và không đổi phân quyền; admin không tự duyệt đơn của mình, quyền owner vẫn theo server.
- Danh sách điểm danh có nhãn xin muộn/chờ duyệt/đã duyệt/từ chối cạnh mỗi người theo dữ liệu được phép xem.
- Làm mới quản trị lỗi tạm thời giữ snapshot cuối của cùng đội, hiển thị lỗi; không để danh sách biến mất thành rỗng giả. Không dùng snapshot đội cũ.

Không sửa schema, dữ liệu lịch sử, tiền phạt hoặc quy tắc điểm danh/xin muộn.

## Kiểm tra

- 234 test đạt. Có regression cho thành viên điểm danh sau lúc tạo trận, chọn đúng trận/đơn mới nhất, không áp quyết định đơn cũ, đúng tên/giờ/trạng thái, payload review, lỗi API, từ chối thiếu lý do và quyền admin/member.
- Build PWA đạt; còn cảnh báo bundle chính >500 kB như trước.
- Chưa kiểm chứng Safari iOS/Android vật lý trong lượt này.
