# Kế hoạch bố trí & luồng UX (2026-11-24)

Rà theo ux-heuristics (Krug + Nielsen), design-everyday-things, information-architecture.
Điểm hiện tại: khoảng 6/10 (không có lỗi chặn thao tác; nhiều lỗi nhất quán và nút chính chưa rõ).

## Phát hiện (đo ở 1440px và 375px)

| # | Mức | Chỗ | Vấn đề | Sửa |
|---|---|---|---|---|
| 1 | 3 | Tìm phòng · card | Cao 698px, 2 nút ngang hàng nhau, tiện ích tràn 2–3 dòng; không rõ nút chính | Cả card mở chi tiết; "Cân nhắc" thành nút nhỏ trên ảnh; tiện ích 1 dòng (~400px) |
| 2 | 3 | Tìm phòng · Chia đôi (`?section=explore`) | Danh sách không cuộn trong cột, trang dài 10.448px, footer đè lên giữa danh sách | Cột danh sách cuộn riêng, cao bằng khung nhìn; footer ẩn ở chế độ bản đồ |
| 3 | 2 | Mọi trang | Mép trái tiêu đề lệch 5 kiểu (0/112/164/180/272px) | Một khung trang chung tối đa 1280px, lề theo logo |
| 4 | 2 | Chợ | 3 hàng điều khiển chồng nhau; cột phải lặp danh sách quán; nút Thêm tách khỏi ô số lượng | 2 hàng; bỏ "Quán trong danh sách"; món dạng lưới card nhỏ trên desktop |
| 5 | 2 | Gói Premium (desktop) | 3 gói Premium lặp y hệt 6 quyền lợi; bảng so sánh có sẵn nhưng tiêu đề bị ẩn | Card gói chỉ giá/thời hạn/nút; hiện tiêu đề bảng so sánh |
| 6 | 2 | Trang chủ | Lưới phòng 2 cột card lớn; cột phải ngắn để trống; khối Ở ghép lệch | Lưới 3 cột (6 phòng); cột phải dính khi cuộn; cân 2 khối cuối |
| 7 | 2 | Tin tìm phòng | Card 1 cột rộng 1112px, bên phải trống; 2 ô lọc chồng full-width; tab "Đăng nhu cầu" trùng nút | Lưới 2 cột; ô lọc chung 1 hàng |
| 8 | 2 | Toàn app | Mở/thu gọn mỗi chỗ một kiểu | Component `Disclosure` dùng chung, 3 cấp (section / Xem thêm / sheet) |
| 9 | 2 | Luồng thuê | Không biết bước tiếp theo | Khối "Việc tiếp theo" ở trang chủ + khay hành trình có bước |

Chưa kiểm được: bản đồ không tải trong khung xem thử nên chưa đánh giá được phần bản đồ ở chế độ Chia đôi.

## Mẫu mở/thu gọn 3 cấp
1. **Section thu gọn được**: dòng tiêu đề = tên + tóm tắt trạng thái + mũi tên xoay; nội dung mở ngay bên dưới; nhớ trạng thái theo trang (sessionStorage); `aria-expanded`; giảm chuyển động thì bỏ hiệu ứng.
2. **Danh sách dài**: nút "Xem thêm" cuối danh sách, cùng kiểu mọi nơi, tải thêm 15.
3. **Tác vụ phụ** (lọc, chọn, xác nhận): bottom sheet trên mobile, popover/modal trên desktop (đã thống nhất ở đợt trước).

## Chữ mới cần duyệt
- Trang chủ, khối mới: "Việc tiếp theo".
  - "Lịch xem phòng {giờ}, {ngày}" · nút "Xem lịch"
  - "{n} tin nhắn chưa đọc" · nút "Mở hộp thư" (đã có)
  - "Đang cân nhắc {n} phòng" · nút "So sánh các lựa chọn" (đã có)
  - "{n} lời mời ở ghép chờ phản hồi" · nút "Xem lời mời" (đã có)
- Khay hành trình: dòng bước "Cân nhắc · So sánh · Hẹn xem · Liên hệ" (bước hiện tại tô đậm).
- Card phòng: nhãn nút nhỏ trên ảnh "Cân nhắc" / "Đang cân nhắc" (đã có).
- Gói Premium: tiêu đề bảng "So sánh quyền lợi" chuyển từ ẩn sang hiện (chữ đã có).
