# Chuyển giao diện sáng/tối

Switch ở góc phải dùng ThemeSync cung cấp trạng thái chung; trang có GlobalHeader dùng switch trong header, các trang còn lại dùng switch cố định. Lưu homeji_theme trước lần tải tiếp theo và áp dụng trước khi React mount; khi chưa có lựa chọn thì theo hệ điều hành. Đồng bộ storage giữa các tab và cập nhật màu bản đồ theo giao diện.

Giọt đen khi chuyển sang tối, giọt trắng khi chuyển sang sáng: rơi 520 ms rồi mở vùng tròn của tài liệu mới 820 ms từ điểm chạm bằng View Transition. Bán kính phủ đủ bốn góc. Trình duyệt không hỗ trợ dùng lớp sóng màu phủ toàn màn hình rồi đổi giao diện. Reduced-motion đổi ngay; chặn chuyển lặp khi animation đang chạy, có cleanup khi unmount. Không reload trang hoặc xoá bản nháp form.

Bỏ palette sáng cố định trong app-shell và GuestMapSection; ảnh/video giữ màu gốc. Semantic tokens điều khiển màu nội dung, bổ sung các surface còn mã màu sáng trực tiếp. Không khẳng định mọi trang và vai trò đã được kiểm thử thủ công.

Kiểm tra: build production qua; ESLint các module theme và hook qua. tests/theme-drop.e2e.mjs dùng API fixture local xác minh giọt đen/trắng, circular reveal chạy thật, surface hồ sơ chuyển tối, bản nháp/URL giữ nguyên, reload lưu lựa chọn, bàn phím, reduced motion, fallback và chiều ngang 1440/390/320 trên hồ sơ, hoạt động, thanh toán và chợ. Không có pageerror. tests/liquid-glass-cta.e2e.mjs xác minh thêm landing và đăng ký. Chrome trên máy tính; chưa xác minh Safari/Firefox hoặc điện thoại thật. Unit suite 227/230 qua trước rebase; ba lỗi hiện hữu đã được ghi trong docs/liquid-glass-choice-system.md.

Tham chiếu: https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using
