# Nghiệm thu bổ sung ngày 03/11/2026

## Đã xác nhận
- Hai ca Agent gọi AI thật: sofa 500.000đ và cho thuê 8.000.000đ/tháng, cọc 16.000.000đ, tối thiểu 12 tháng. Ca rental timeout lần đầu, chạy riêng lại đạt. Cơ sở dữ liệu kiểm thử cô lập; không xuất bản tin production.
- Admin production đã tạo báo cáo 30 ngày lúc 03:52 ngày 03/11, file Homeji-bao-cao-20261103-035209-6b1b2e88.xlsx. Gmail nhận thư [Homeji] Báo cáo quản trị 30 ngày vào INBOX, có attachment 18.270 bytes. Plugin Gmail đọc được đủ 5 sheet: Tổng quan, Tài khoản, Gói thành viên, Hoạt động, Khu vực. Không lưu dữ liệu cá nhân trong báo cáo QA này. Nút tải đã bấm nhưng browser automation timeout, chưa khẳng định tải qua UI thành công.
- WebGL pilot tại tab Chợ: scene chứa chữ thật từ label, shader khúc xạ qua capsule và tách chỉ số khúc xạ RGB. Không dùng CSS/SVG displacement tại cụm này. HTML giữ semantics/hit targets; canvas không bắt input. Giới hạn scene trong tab rail, không phải chụp DOM/nền trang bất kỳ. Kiểm tra 1280 sáng/tối, 390 sáng, 320 tối: có thay đổi pixel khi bật refraction, không lỗi GL, điều khiển bàn phím/chuột và fallback mất context đạt.
- FE 476/476 test đạt sau sửa loader test để xử lý re-export mới. Build và lint kiểm tra riêng các file thay đổi.
- Backend migration thêm LastHeartbeatAt nullable. Integration PostgreSQL thật cô lập đạt: heartbeat khi queue trống, reset ngân sách ngày mới không gọi AI lại, khóa cạnh tranh, retry, bỏ kết quả cũ, duyệt/khôi phục.

## Phạm vi AI kiểm duyệt
Worker đã tồn tại, quét nội dung và ảnh tin mới/sửa do người dùng đăng. Có giới hạn 30 lượt/ngày theo cấu hình, backoff, queue bền vững, bằng chứng và admin khôi phục. Không quét lại nội dung không đổi mỗi ngày; tin nguồn nhập từ website ngoài chưa thuộc phạm vi. Heartbeat mới giúp phân biệt queue trống với worker dừng; không được gọi heartbeat là một lần AI duyệt.

## Chưa ký nghiệm thu
- OAuth Google: chưa có bằng chứng đăng nhập tài khoản thật trọn luồng trong đợt này.
- Thanh toán: người dùng chỉ cho phép sandbox. Cấu hình hiện trỏ MoMo/PayOS production; không gửi giao dịch với cấu hình này. Chưa có thông tin sandbox hợp lệ nên chưa thể ký nghiệm thu cổng thật.
- Chưa đo hiệu năng kính trên điện thoại vật lý. Kết quả fixture không chứng minh mọi màn hình/thiết bị hay tất cả yêu cầu lịch sử đã hoàn tất.

Bằng chứng local: output/verification/webgl-refraction/results.json; backend output/verification/agent-real-*.json và real-email-delivery.json; TRX output/quality/local-5759d1ea0ff34196bca2ef96f82e9adc/tests.
