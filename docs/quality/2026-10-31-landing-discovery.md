# Trang khách: cuộn nhanh và nhiều lựa chọn phòng hơn

Ngày 31/10/2026. Thay đổi frontend local; chưa deploy.

- Hành trình desktop giảm tổng chiều cao từ khoảng 13,8 xuống 7,8 viewport, giảm độ trễ scrub 0,9 xuống 0,45 giây. Giữ nguyên tuning vuốt mobile. Wheel tăng phản hồi trực tiếp/momentum, chuẩn hóa deltaMode và tích phân theo thời gian để tránh tốc độ lệ thuộc màn hình 60/144 Hz. Dialog, bản đồ và trường nhập giữ cuộn riêng.
- Danh sách đổi từ rail ngang 3 thẻ nhìn thấy sang grid tối đa 4 cột, 8 thẻ ban đầu, xem thêm từng 8 và lọc giá. API lấy tối đa 12 tin native và 24 tin nguồn; chỉ hiển thị dữ liệu nhận được, loại synthetic và URL nguồn không được hỗ trợ.
- Bỏ điều kiện chỉ Mogi/Quận 9 đang làm mất các nguồn khác. Kiểm tra API công khai trong phiên này trả 22 tin nguồn Phongtro123 ở Thủ Đức/Quận 9; bản xem local nhận tổng 25 bản ghi gồm 3 tin native. Không coi con số này là số phòng còn trống hoặc số căn độc lập đã xác minh.
- Thẻ có giá, đơn vị theo dữ liệu, tiêu đề, địa chỉ, diện tích, số người/mô tả/người đăng khi API cung cấp; tin nguồn có nhãn nguồn và số ảnh. Không suy diễn thêm tiện ích, khoảng cách hoặc availability. Gallery tin tham khảo hỗ trợ ảnh từ cloud.mogi.vn và pt123.cdn.static123.com; link tin gốc qua allowlist HTTPS hiện có.
- Hai nguồn tải độc lập qua Promise.allSettled, cùng AbortSignal; một nguồn lỗi vẫn giữ danh sách của nguồn còn lại, có thử lại và empty state rõ ràng.
- Viết lại nội dung hành trình quanh ngân sách, vị trí, người ở ghép và thông tin trước khi liên hệ; không cam kết xác minh hay bảo đảm giao dịch.

Kiểm chứng: build và ESLint các module thay đổi; `tests/landing-discovery.e2e.mjs` qua desktop 1440 sáng, mobile 390 tối và 320 sáng với lỗi một phần API. Xác nhận 8 thẻ/2 hàng desktop, xem thêm, lọc giá, không overflow, gallery đa nguồn và link gốc. Wheel 120 px đi khoảng 373 px sau 350 ms trong lần đo Chromium desktop; không coi là đo thiết bị vật lý. `output/verification/landing-discovery/results.json` chứa kết quả fixture; `live-public-data.png` chụp UI local đọc API công khai thật, không ghi dữ liệu hoặc thực hiện giao dịch.
