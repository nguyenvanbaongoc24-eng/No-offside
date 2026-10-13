# Kiểm chứng bổ sung ngày 13/10/2026

- Preview giao diện đã kiểm tra: https://no-offside-3q6erl00e-ngoc-nguyens-projects-c2fd1451.vercel.app/ (commit `0ae170f`).
- Kéo Nguyễn Quang Hải từ vị trí 82%/48% sang 71.5044%/59.9087% không tạo dialog. Lưu và tải lại giữ đúng vị trí; chạm sau tải lại mở sheet đổi người.
- Ở viewport 320px, tiêu đề Chiến thuật cao 22.09px, nút Tạo sơ đồ rộng 102.10px, nằm trong viewport; không tràn ngang.
- Build Vite/PWA thành công; 52 kiểm thử qua trên thư mục làm việc hiện tại. Kết quả này bao gồm các thay đổi đăng nhập/hồ sơ do chat khác đang thực hiện, không có nghĩa tất cả đã nằm trong preview trên.
- Migration governance đã sửa để vi phạm khác không chặn xác nhận/chốt đến muộn, và cùng kỳ không tạo lại threshold khi timezone kết nối thay đổi. Hai ca hồi quy tương ứng trong bộ test hiện tại đều qua.
- Các file đăng nhập/hồ sơ và migration `202610130002_profiles_and_teams.sql` thuộc công việc đang diễn ra ở chat khác; lượt này giữ nguyên, không gom vào commit hoặc deploy của mình.
- Chưa chạy migration lên project Supabase thật, chưa kiểm chứng JWT/PostgREST end-to-end. Các chức năng nghiệp vụ mới vẫn cần backend được provision trước khi sử dụng.
- Chưa kiểm thử trên thiết bị iOS/Android thật. Không merge main và không deploy production.

Ảnh kiểm chứng: `C:/Users/LENOVO/.codex/visualizations/2026/10/12/01a13145-d075-7c53-9fba-640488767c3e/no-offside-mobile-tactics.jpg`.
