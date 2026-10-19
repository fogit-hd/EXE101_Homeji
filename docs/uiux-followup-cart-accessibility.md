# UI/UX follow-up — 19/10/2026

Tiếp tục rà các luồng chính theo yêu cầu người dùng, giữ menu Danh mục nhiều cột đã chọn.

Đã kiểm tra 36 tổ hợp: 9 URL (tìm phòng, đã lưu, đồ ăn, chợ đồ, hồ sơ, thanh toán, tin tìm phòng, hoạt động, thông báo), light/dark và desktop/mobile 320px. API fixture cô lập; các trạng thái phòng/đơn/giao dịch trong smoke test phần lớn rỗng. Không có cuộn ngang hay pageerror ở các tổ hợp này; không coi đây là kiểm toán mọi vai trò hoặc kiểm thử backend production.

Lỗi giỏ mobile được tái hiện trước sửa: focus còn trên nút phía sau dialog và ba ID nhãn bị trùng. Sửa bằng native dialog, focus/Tab/Escape, khôi phục focus, khóa cuộn nền và ID riêng cho mỗi bản utility rail. Món/tổng tiền đặt trước các tiện ích vị trí. Hộp xác nhận cũng dùng native dialog để nằm trên giỏ, Escape đóng riêng lớp xác nhận, giữ ghi chú và trả focus đúng nút. Giá, số lượng, điều kiện đặt món và API không đổi.

Bằng chứng: build qua; ESLint hai component Food qua. MarketplacePage có một lỗi lint refs ở walletDetailsScope.current đã có trên origin/main trước sửa. Sau khi ghép lên bản auth/Premium mới nhất (8657323), full unit suite 290/290 qua. Ba lỗi test cũ đã được bản cập nhật upstream xử lý. Test nhóm món theo bếp vẫn qua.

`tests/food-cart-accessibility.e2e.mjs` thất bại trước sửa và qua sau sửa; bao gồm giỏ trống/có món, giữ focus khi Tab, nhãn duy nhất, nested confirmation/Escape/focus/ghi chú, khóa cuộn và light/dark 320/390px. `tests/grouped-menu-readability.e2e.mjs` vẫn qua sau sửa giỏ. Đã xem ảnh giỏ dark 320px và hộp xác nhận mobile.

Ảnh/JSON: output/verification/uiux-followup và output/verification/cart-accessibility trong worktree phát hành. Đây là kiểm thử UI bằng Chrome với dữ liệu giả lập; chưa xác minh giao dịch thật hay Safari/Firefox.
