# Đồng bộ Material Symbols Rounded và tên menu

## Nguồn, component và phạm vi

SVG lấy trực tiếp từ repository chính thức Google: https://github.com/google/material-design-icons, revision `49d4db35df873165d6bd6ba09b063c7dafbac2f4`, thư mục `symbols/web/*/materialsymbolsrounded`. Không dùng bộ Material Icons cổ điển hoặc npm package icon bên thứ ba.

Đã chuyển 50 file component/page sang module `src/components/icons`. 105 symbol, mỗi symbol có hai asset outline/filled: 210 SVG chọn lọc. `manifest.json` trong `src/assets/material-symbols-rounded` ghi đầy đủ tên icon, alias sử dụng trong app, source path, viewBox và SHA-256. Đây là danh sách đầy đủ icon đã thay; tên export cũ chỉ là alias nội bộ để tránh đổi luồng nghiệp vụ.

Component `Symbol.jsx` giữ đường path và viewBox thực tế của từng asset; kế thừa currentColor, không chỉnh stroke-width. Icon trang trí aria-hidden, icon có nhãn được role img. Navigation giữ 24 px ở cả hai trạng thái; menu/button chủ yếu 20–24 px, metadata tối thiểu 18 px. Selected navigation, bộ chọn Pro, theme và công cụ chiến thuật dùng filled khi có biến thể; không đổi kích thước lúc chọn.

Đã gỡ Lucide khỏi package và các import/runtime CSS cũ. Không tải icon font, không có ligature để lộ thành chữ khi font lỗi. SVG nhúng trong bundle nên không cần gọi Google để tải icon khi mở app. License Apache-2.0 và NOTICE lưu trong asset nguồn và phân phối tại `/licenses/material-symbols-rounded/`.

## Mapping chính

| Vị trí/chức năng | Symbol Rounded |
|---|---|
| Trang chủ | home |
| Chiến Thuật | account_tree |
| Tìm Đối | person_search |
| Sinh Tố Lúa Mạch | sports_bar |
| Quỹ đội | account_balance_wallet |
| Chat | chat_bubble |
| Cá nhân | person |
| Thành viên / mời | groups / person_add |
| Lịch / thời hạn | calendar_month / schedule |
| Thông báo | notifications |
| Nội quy / cài đặt | rule / settings |
| Quay lại / menu | arrow_back / more_horiz |
| Dropdown | expand_more |
| Sửa / xóa | edit / delete |
| Có mặt / vắng | check_circle / cancel |
| Nạp nội dung | progress_activity |
| Bút / tẩy | edit / ink_eraser |
| Media / giải thưởng | movie / trophy |

## Đổi tên và tương thích

- Sa Bàn → **Chiến Thuật**.
- Sàn Cáp Kèo, Cáp kèo → **Tìm Đối**.
- Hiệp 3 → **Sinh Tố Lúa Mạch**.

Áp dụng navigation, Dashboard/Pro shortcuts, FAB, tiêu đề, Cá nhân, cài đặt đội, nút, aria-label, toast, empty state và copy liên quan. Giữ ID `lineup`, `board`, `finance`, route và khóa lưu hiện có; không đổi cấu hình/shortcut đã lưu. Không thêm tab thứ sáu.

Các thông báo hệ thống cũ có tiêu đề chuẩn và tên bill mặc định cũ được đổi cách hiển thị bằng helper; không sửa dữ liệu trong DB. Không tìm-thay nội dung chat, tên đội, hoặc tiêu đề bill do người dùng tự đặt. Emoji trong khay soạn chat là nội dung tin nhắn, không phải bộ icon giao diện.

Logo No Offside, Google đăng nhập, đội và ngân hàng được giữ riêng. Các emoji làm icon giao diện ở màn cũ được thay bằng symbol phù hợp; nơi từng dùng emoji làm logo tạm dùng asset No Offside chính thức.

Nhãn Sinh Tố Lúa Mạch trong bộ chọn Pro/ô shortcut tối đa hai dòng, chữ 12–13 px, chiều cao ô bằng nhau; menu danh sách giữ tên đầy đủ. Dropdown dùng path expand_more chính thức; chỗ đã có chevron riêng không thêm mũi tên thứ hai.

## Kiểm chứng

- `npm test`: 205/205 đạt, gồm kiểm chứng source/hash/path/viewBox/license của toàn bộ asset, currentColor/aria và kích thước hai trạng thái, ID action giữ nguyên, tương thích thông báo cũ, cùng các kiểm thử nghiệp vụ hiện hữu.
- Build Vite/PWA đạt. Trước hợp nhất các commit Dashboard/Auth mới, main chunk tăng khoảng 8 kB gzip cho các biến thể icon. Bản hợp nhất: main khoảng 585 kB / 151 kB gzip, PWA precache khoảng 1,64 MB. Vẫn có cảnh báo main chunk hơn 500 kB; không nới ngưỡng để che cảnh báo. Không thêm dependency hoặc font icon.
- 40 màn/trạng thái × Light/Dark × 320/360/390/430 px = 320 tổ hợp: không tràn ngang, mất path icon, nút chỉ có icon thiếu accessible name hoặc nhãn menu cũ trong fixture. Có login/signup, hồ sơ, quỹ, chat, chiến thuật, lịch, biểu mẫu, dropdown, loading/lỗi/trống.
- Pro: 32 tổ hợp bốn module × hai theme × bốn chiều rộng; nhãn tối đa hai dòng, các ô bằng chiều cao, nút tối thiểu 44×44 px, không tràn ngang.
- Sau hợp nhất các commit `09f87d9` và tổ tiên về Dashboard/Auth, kiểm tra lại 40 tổ hợp của các màn thay đổi; tests/build chạy lại đạt. Giữ nguyên phần sửa chức năng đã có trên main.
- Kiểm tra tương tác local: route Chiến Thuật cũ, Cá nhân → Pro, FAB và label đầy đủ; icon nav outline/filled cùng 24 px, badge chat ở đúng vùng icon. Preview dùng dữ liệu mẫu, không gửi request nghiệp vụ.
- Chưa kiểm chứng trực tiếp thiết bị Safari iOS/Android. Không thay backend/schema, không tạo giao dịch hoặc push thử ở production trong phạm vi icon/menu.

Ảnh và số đo nằm trong thư mục visualization của phiên: `material-finance-light.png`, `material-finance-dark.png`, `material-symbols-viewport-results.json`, `material-pro-viewport-results.json`, `material-merged-viewport-results.json`.

## Đồng thời có thay đổi khác

Các thay đổi chưa commit trong checkout `D:\No Offside` được giữ nguyên. Bản icon làm trong worktree riêng và hợp nhất với commit remote đã phát hành; không đưa các chỉnh sửa SQL/workspace chưa commit vào release này.
