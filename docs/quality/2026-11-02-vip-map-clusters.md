# VIP trong cụm bản đồ

- Gộp ghim danh mục nhập về và ghim Homeji vào cùng MarkerClusterer. Trước đây hai clusterer độc lập có thể che nhau và không tính được số VIP trong khu vực chung.
- Cụm có tin `isOwnerPremium === true` thêm viền vàng mảnh và nhãn `★ N VIP`. Vẫn giữ màu loại ghim và tổng số vị trí, không gán VIP cho toàn bộ cụm.
- Tin nhập về và ghim người bán chưa có quyền lợi Premium xác nhận từ API không được tự tính là VIP.
- Nhấn cụm mở danh sách cuộn gồm ảnh nếu có, giá, tên và địa chỉ. VIP có nhãn riêng. Nút Xem VIP/Xem tất cả lọc tại chỗ, không thay đổi tổng tin hay âm thầm bỏ các tin thường. Có nút phóng to tùy chọn.
- Mỗi tin mở bằng hành động chi tiết sẵn có. Không đổi tọa độ, không tạo tin và không chỉnh trạng thái gói. Bản đồ vẫn có sao trên ghim VIP riêng khi tách cụm.
- Dữ liệu quyền lợi cập nhật sẽ buộc renderer làm mới, kể cả khi Google SuperCluster đang dùng lại tọa độ đã cache. Không phát sinh vòng lặp vẽ liên tục.
- Dùng textContent cho nội dung tin; ảnh chỉ nhận HTTPS hoặc URL cùng origin. Giữ bàn phím, aria-pressed của bộ lọc và vùng cuộn giới hạn chiều cao.

## Kiểm chứng

- Build production và ESLint các file thay đổi qua.
- Tests DOM: tổng 17, đúng 2 VIP, lọc/chuyển lại đủ tin, chọn đúng tin, không thực thi HTML trong tiêu đề, từ chối URL ảnh javascript; vô hiệu hóa cache metadata khi quyền lợi đổi.
- Source hook: chuyển đủ 17 ghim sang clusterer chung, không tự gán VIP, mở đúng chi tiết và dọn ghim khi unmount.
- Playwright chạy RentalMap thật với ranh giới Google Maps giả lập: một clusterer nhận 3 tin Homeji + 14 tin nhập; đúng 17/2 VIP; lọc, chọn tin, phóng to, 320/390/1100 px; thay quyền lợi Premium bằng false loại nhãn và bộ lọc VIP. Không coi kiểm tra giả lập là kiểm tra toàn bộ dịch vụ bản đồ Google production.
- Ảnh: `output/verification/vip-cluster/cluster-1100.png`, `vip-390.png` và các kích thước cùng thư mục.
