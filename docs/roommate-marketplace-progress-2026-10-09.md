# Ở ghép và chợ đồ — tiến độ 09/10/2026

Mục tiêu vẫn đang thực hiện, chưa hoàn tất: nhập lối sống, tab tìm bạn/tìm phòng, gửi lời mời, và hoàn thiện chợ đồ.

## Đã phát hành trong lượt này

Frontend `221ff38`, `59990e7`; backend `9db999a`.

- Form lối sống giữ khu vực người dùng chọn thay vì ghi đè bằng Thủ Đức. Có nhập khu vực mong muốn, ngân sách phải hữu hạn và lớn hơn 0. Liên kết từ lời mời mở đúng tab lối sống qua `profileTab=lifestyle`.
- Chấp nhận/từ chối/hủy lời mời bắt lỗi, khôi phục nút để thử lại và khóa thao tác khi request đang chạy.
- Backend kiểm tra enum ngủ/thú cưng/hút thuốc; Unknown vẫn hợp lệ, ngân sách bỏ trống vẫn được phép.
- Chợ đồ cho nhắn người bán trước khi mua; mở đúng conversation trả về từ API thay vì chỉ mở hộp thư chung. Nút mua/nhắn không xuất hiện trên thẻ của chính người dùng.

## Bằng chứng

- Build và diff-check đạt. 64 unit tests backend nhóm Profiles/Marketplace/Roommate đạt, không skipped. 11 tests frontend về lời mời, lọc chợ đồ và bố cục kho hàng đạt; các tests đọc source chỉ là kiểm tra contract, không thay thế kiểm thử runtime.
- ESLint: MarketplacePage và RoommateInvitationsPage 0 lỗi; ProfilePage còn 2 lỗi set-state-in-effect đã có ở baseline b158b69 (không tuyên bố lint toàn dự án đạt).
- Browser local dùng API giả loopback: nhận lỗi 503 khi chấp nhận, thử lại thành công và hiện Nhắn tin. Đổi khu vực/ngân sách, lưu, reload: giữ Gần UEL, Linh Trung / 2800000; tab Lối sống vẫn được chọn. Nhắn người bán mở đúng conversation 77777777-7777-4777-8777-777777777777 và đúng người bán. Không gửi tin nhắn thật.
- Render backend xác nhận commit 9db999a Live; /health/live và /health/ready đều HTTP 200.
- Frontend production phục vụ /assets/index-CkPoUl2i.js với liên kết lối sống và nút nhắn người bán mới.
- Browser production: danh mục Bàn ghế trả đúng Bàn học gỗ nhỏ gọn và Ghế học tựa lưng; cả hai có Nhắn người bán. Ảnh local: output/verification/marketplace-contact-production-20261009.png.

## Chưa đạt để kết luận mục tiêu hoàn tất

- Hai tab tìm bạn/tìm phòng chưa có trong khu ở ghép. Hiện người dùng tìm ứng viên qua tin đã lưu; lời mời backend bắt buộc cả hai cùng lưu một phòng. Đã hỏi người dùng chọn tìm theo lối sống trước khi có phòng hay tìm người cùng quan tâm phòng đã lưu; chưa có câu trả lời.
- Chưa kiểm chứng trọn luồng hai người gửi/nhận/chấp nhận lời mời mới theo thiết kế tab mới.
- Chợ đồ đã có tìm/lọc, đăng/quản lý tin, đơn, ví và xử lý tồn kho trong mã; chưa kiểm chứng đầy đủ luồng mua–người bán xác nhận–giao–hoàn tất/hoàn tiền với cơ sở dữ liệu. Không thực hiện giao dịch tài chính thật để QA, không chạy test database phá hủy trên dữ liệu thật.

Routes nâng cao và lịch sử AI dài hạn tiếp tục tắt. Không sửa các thay đổi Infrastructure integration/import-progress thuộc công việc khác ở backend.
