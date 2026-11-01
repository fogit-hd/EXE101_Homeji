# Banner bảo trì và dọn nội dung giao diện

- Bỏ các câu hướng dẫn thừa về ngày tham gia, nạp tiền, lối sống và thanh toán một lần. Giữ ngày tham gia thực của tài khoản, giá, thời hạn gói và bước xác nhận mua.
- Bỏ dòng ưu đãi/đổi giá kèm ngày giờ dài ở banner và trang gói. Thời điểm hết ưu đãi vẫn được kiểm tra theo dữ liệu máy chủ, không đổi giá hay gia hạn khuyến mãi.
- Công bố bảo trì từ admin vừa lưu một banner chung, vừa giữ thông báo riêng cho các tài khoản như trước. API đọc banner công khai chỉ trả nội dung bảo trì, không trả danh sách người nhận.
- Banner giữa màn hình, nền ngoài trung tính, màu chỉ nằm trong phần tiêu đề. Bảo trì được ưu tiên trước khuyến mãi, dùng chung một dialog để không chồng popup.
- Escape, nút đóng, Đã hiểu và tự đóng sau 15 giây đều ghi nhận theo ID. Không đánh dấu đã đọc thông báo trong tài khoản và không phát sinh thanh toán.
- Giờ bảo trì hiển thị theo Việt Nam, không có giây. Banner dừng khi tới giờ kết thúc; nếu chưa có giờ kết thúc thì hết hiệu lực sau 24 giờ tính từ giờ bắt đầu, hoặc lúc công bố nếu chưa có lịch. Thông báo mới thay thế lịch cũ, không khôi phục lịch cũ sau khi thông báo mới hết hiệu lực.
- Tài khoản đang online nhận cập nhật qua sự kiện thông báo hiện có. Khách chưa đăng nhập cập nhật trong tối đa 30 giây hoặc khi quay lại tab. Lỗi tải banner không khóa trang.

## Kiểm chứng

- Frontend: 468 tests qua, production build và ESLint các file chỉnh sửa qua.
- `maintenance-banner.e2e.mjs`: 320/390/1366 px, thứ tự ưu tiên, giờ Việt Nam, Escape, lưu xác nhận, nhận thông báo mới, mốc 15 giây, hết hiệu lực, trang admin, lỗi API; không có request ghi dữ liệu/thanh toán.
- `premium-pricing.e2e.mjs`: banner khuyến mãi và thay đổi giá vẫn đúng màu, số tiền, preview/confirm, tự đóng và xác nhận theo từng revision.
- Backend: 5 kiểm tra PostgreSQL cô lập cho bảo trì và giá gói qua. Đã chạy migration, lưu/mở lại DB, kiểm tra quyền admin, từ chối lịch đã kết thúc, RLS và không khôi phục thông báo cũ.
- Ảnh kiểm tra: `output/verification/maintenance-banner/banner-390.png` và các kích thước cùng thư mục.
- Không phát bảo trì thử tới người dùng production. Deployment chỉ được xác nhận sau khi đối chiếu API version và bundle live.

## Các yêu cầu trước đó đã đối chiếu trong lịch sử phát hành

Game và thử kính WebGL: `f687d02`; định dạng tiền/ghi âm: cùng bản phát hành và tài liệu chat-input-release. Chat cập nhật và thứ tự tin: `0ccb743`, `58b2bb4`; chặn người dùng: `5f1f1ac`; xác nhận mua: `3e68c31`; quản trị tài khoản/gói/Excel: `04a8d3e`. Dữ liệu phòng, danh sách và cụm bản đồ: `f3be943`, `f70bba0`; thông tin liên hệ VIP: `a7d54b8`; Agent tách nghiệp vụ: `c15569c`; gọn vị trí, bỏ thanh thừa và thay biểu tượng AI bằng ảnh mèo local: `0626103`. Đây là đối chiếu code và lịch sử phát hành, không thay thế kiểm tra lại mọi nghiệp vụ thực tế trên tài khoản trả phí.
