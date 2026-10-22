# Danh sách cân nhắc và ngữ cảnh nhiều phòng

Ngày 22/10/2026. Tiếp nối giao diện chat 7 sắc và trợ lý theo một phòng. Đây là phần triển khai cho hành trình tìm → chọn → so sánh → chuẩn bị liên hệ trong mục tiêu AI toàn Homeji; chưa hoàn tất cả sáu nhóm nghiệp vụ.

## Hành vi

- Thêm/bỏ tối đa ba phòng từ thẻ tin, kết quả tìm kiếm bản đồ, preview, kết quả AI hoặc chi tiết. Lựa chọn dùng chung giữa các màn, độc lập với thao tác lưu tin. Một thanh lựa chọn dẫn tới workspace cân nhắc.
- Trang đã lưu dùng một bảng so sánh chi phí; đã bỏ hai màn so sánh chồng nhau. Danh sách và kịch bản số người, mức sử dụng, đơn vị phí được giữ trong RAM trong phiên tài khoản. Chuyển tài khoản/đăng xuất xóa cả hai. Tải lại trang cũng bắt đầu lại; không lưu địa chỉ, số liên hệ hay hồ sơ đầy đủ vào shortlist.
- Workspace đăng ký đúng các ID và tên hiển thị cho chat. Nút so sánh/câu hỏi và các câu như “hai lựa chọn này” đọc cùng tập phòng và cùng kịch bản. Thẻ trả lời có tên từng phòng, nguồn và khoản thiếu. Tổng đầy đủ chỉ hiện khi dữ liệu và đơn vị cho phép, luôn ghi là ước tính theo kịch bản.
- Mở chi tiết từng tin để sửa nháp câu hỏi và dùng luồng lịch xem hiện có. Chỉnh nháp không gửi tin hoặc yêu cầu lịch tự động.
- Đổi tập phòng hoặc sửa kịch bản vô hiệu hóa phản hồi đang chờ. Thử lại giữ đúng ID/kịch bản của câu hỏi cũ; hỏi tiếp ở phản hồi cũ yêu cầu mở lại danh sách khi tập hiện tại đã đổi. Câu tìm mới tách khỏi ngữ cảnh so sánh.
- Tin không còn công khai được thông báo là không có dữ liệu; không suy diễn giá hoặc coi so sánh thiếu là đủ. Người dùng tự bỏ/thay tin trong danh sách. Backend cũ hoặc trả sai tập ID làm frontend chuyển sang hướng dẫn mở công cụ.

## Hợp đồng và giới hạn dữ liệu

`POST /api/chatbot/messages` thêm optional `rentalSelection: { postIds, task?, scenario? }`. Chấp nhận hai hoặc ba GUID khác nhau, task `compare`, `cost`, `questions`, `details` hoặc bỏ trống. Không nhận đồng thời `rentalContext` và `rentalSelection`. API cũ và một phòng giữ tương thích; không có migration hay provider mới.

Client chỉ gửi ID, task và các trường kịch bản cho phép. Backend đọc lại qua `IRentalDecisionService`: auth, công khai, đang hoạt động, phạm vi Homeji và giới hạn hiển thị theo viewer. Trả lời bằng dữ liệu tính toán/template, không gửi tin đăng hoặc shortlist sang model. Chỉ lưu lịch sử khi người dùng chọn và server cho phép, theo chính sách hiện có.

Kịch bản đơn vị phí hiện áp dụng cho toàn bộ phòng được chọn theo xác nhận của người nhập. Dữ liệu đơn vị/phí được chủ tin xác nhận và lưu bền vững chưa có; đây là phần cần bổ sung để so sánh ít phải hỏi lại. Không dùng số 0 thiếu nguồn làm miễn phí, không suy ra phòng rẻ nhất khi tổng chưa đầy đủ.

## Kiểm chứng

- Frontend build và ESLint các file thay đổi đạt; 124 kiểm thử liên quan đạt. Bao phủ ngữ cảnh nhiều phòng, request chỉ chứa dữ liệu cho phép, tập ID trả về thiếu/sai/trùng, thay kịch bản, hủy/phản hồi trễ, thử lại, hỏi tiếp, draft, đơn vị giá và đổi tài khoản.
- Backend Application unit suite 497/497; HTTP binding/mapping 5/5 với service giả. Bổ sung trường optional không thay endpoint cũ.
- `tests/rental-journey-flow.e2e.mjs`: bốn kịch bản ở 390/1440px, sáng/tối, component thật/API giả. Chọn từ thẻ và workspace bản đồ → workspace chung → sửa kịch bản → chat cùng ID/kịch bản → chi tiết và nháp → quay lại giữ kịch bản → đổi tài khoản xóa dữ liệu. Không có tin nhắn, lịch hay giao dịch gửi đi. Đã sửa tràn ngang mobile và mở ảnh kiểm tra.
- Fixture và ảnh ở `output/verification/rental-journey/`. Đây là bằng chứng local với tài khoản/dữ liệu giả, không chứng minh model hay giao dịch production.

## Phần mục tiêu còn lại

- Ngữ cảnh đơn/ví/thanh toán chưa được nối vào chat.
- Chủ tin: thu thập phần thiếu, đơn vị phí và FAQ có nguồn xác nhận chưa hoàn tất.
- Ở ghép: giải thích điểm hợp/khác theo tự khai, câu hỏi và chia chi phí chưa hoàn tất.
- Đồ ăn/chợ: hỗ trợ ngân sách, hàng thật và giỏ cùng bếp chưa hoàn tất.
- Sửa lỗi ngay tại form và bảo toàn bản nhập cần kiểm tra/mở rộng theo từng nghiệp vụ.

Bản thay đổi này đang được kiểm chứng cục bộ; trạng thái phát hành cần được xác nhận bằng commit và asset trên hostname production.
