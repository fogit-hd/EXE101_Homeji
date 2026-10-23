# Sửa UX writing Homeji — 23/10/2026

## Phạm vi

Xử lý 35 mục câu chữ, 14 mục đối chiếu nghiệp vụ và 8 mục UI trong đánh giá ngày 23/10; các nhóm có trùng nhau. Bản phát hành dựa trên main mới nhất, không đưa toàn bộ thay đổi đang dở ở checkout gốc lên production. Giữ giao diện Premium mới và các tính năng AI đã phát hành.

| Mục đánh giá | Kết quả trong bản phát hành |
|---|---|
| C01–03 | Lỗi đăng nhập và lịch xem phòng nêu việc cần làm, không lộ token hoặc cách gọi trạng thái nội bộ. |
| C04–06 | Ví Homeji thống nhất tên; thông tin ở ghép và danh sách hồ sơ dùng từ rõ nghĩa. |
| C07–10 | Nhượng phòng; cho nuôi thú cưng; điện/nước đã gồm trong giá thuê. Mã LAUNDRY từng được dùng làm chỗ phơi: ghi “Giặt/phơi đồ (cần hỏi lại)” để không tự diễn giải lại dữ liệu cũ; DRYING_AREA giữ “Chỗ phơi đồ”. Không đổi mã tiện ích hoặc dữ liệu. |
| C11–15 | Đơn được người bán xác nhận; khoảng cách chưa rõ không gọi “gần bạn”; dùng vị trí hiện tại. Main mới đã dùng “Xem vị trí nhận món” và “Đặt món · nhận tại bếp”, giữ các mô tả đúng luồng nhận món này. |
| C16–22 | Tách chưa tải số dư khỏi số dư 0; thông báo rút tiền, lịch sử trống và tải lại dễ hiểu; thời gian cập nhật không gọi là đối soát. |
| C23–29 | Main mới đã bỏ Pro, thẻ 96% và câu hủy tùy ý. Bỏ nhãn phổ biến/tiết kiệm suy từ mã gói, bỏ giá tham chiếu cố định; hiển thị tổng tiền và chính xác số ngày trong catalog. Việt hóa quyền lợi API cũ lẫn mới. |
| C30–35 | Phân biệt ưu tiên Premium với độ phù hợp; chi phí do người dùng nhập; thiếu thông tin; vị trí trong tệp ảnh; chọn địa chỉ từ gợi ý; đường về trang tìm phòng của admin. |
| Nội dung auth chưa kích hoạt | Sửa 5 câu đã ghi nhận; không bật lại luồng giới thiệu. |
| B01–04 | Bỏ khẳng định đối soát/hủy gói, nói rõ nội dung tìm phòng có thể gửi tới Gemini, dùng mốc tiền về ví từ API. Không lấy updatedAt làm thời điểm trả tiền khi thiếu dữ liệu. |
| B05–08 | Backend Việt hóa lỗi động và enum; quyền lợi rõ nghĩa; hồ sơ chủ nhà “đã được duyệt” không suy thành bảo đảm danh tính/quyền sở hữu. |
| B09–12 | Yêu cầu rút đã xử lý khác ngân hàng đã nhận; không tự giải thích mục đích số dư giữ lại; sửa “kịch bản/trần”; xử lý ngữ nghĩa tiện ích như trên. |
| B13–14 | Bảng gói đúng hạn mức hiện hành: theo dõi 10 khu vực cho cả hai gói; 3 tin/lần ở danh sách cân nhắc trong Đã lưu (MAX_RENTAL_CHOICES). Không viết theo năm cho gói 30 ngày. |
| U01–03 | Giữ bảng HTML có scope hàng/cột của main mới; chỉnh cột và xuống dòng; nút có nền đặc để giữ tương phản. Main mới đã giới hạn nút Phòng mới vào hành trình nhà ở, thêm đường truy cập trong danh mục. |
| U04–08 | Tên ví, trạng thái trống, CTA tạo tài khoản, nội dung trang chủ và thời hạn gói đã sửa. |

## Kiểm tra

- Frontend build thành công; 19 test về giá/thời hạn gói, trạng thái subscription, hạn thanh toán, nhóm giao dịch, ghi nhận nhu cầu đạt. ESLint các module logic thay đổi đạt.
- Backend: 50 test liên quan ví, đơn hàng, gói và chi phí đạt; API build Release không lỗi/cảnh báo.
- Browser local dùng tài khoản/dữ liệu giả, chặn thao tác ghi ngoài đăng nhập kiểm thử. Premium và ví tại 390px; bảng có th scope; không tràn ngang trong các trạng thái đã đo; Phòng mới không che ví. Đã mở bước xác nhận trả ví, không gửi thanh toán.
- Giá công khai production được dùng thêm để kiểm tra catalog 4 gói; đây không phải giao dịch hoặc tài khoản thật.
- CSS nút dùng #173c37 với chữ trắng và cặp đảo màu; cần xem số đo và ảnh kèm trong output/ux-writing-fix-2026-10-23 tại checkout gốc.

## Giới hạn

Không thay đổi hợp đồng API, số tiền, cơ chế giữ/hoàn tiền hay dữ liệu tin cũ. Không có giao dịch tiền thật, thử nghiệm người dùng hoặc chứng nhận toàn bộ WCAG. Figma không phải tài liệu thiết kế đầu vào; người dùng yêu cầu học từ thiết kế/asset có sẵn, đã nghiên cứu trong báo cáo trước.

Trạng thái deploy và bằng chứng live sẽ được bổ sung sau khi bundle/API cập nhật.
