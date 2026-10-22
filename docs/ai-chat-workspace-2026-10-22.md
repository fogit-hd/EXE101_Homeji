# Không gian trò chuyện Homeji AI

Ngày 22/10/2026. Thay giao diện popup hội thoại bằng không gian trợ lý gồm cửa sổ gọn và chế độ mở rộng. Chỉ thay frontend; API, phân quyền và chính sách lưu lịch sử hiện có được giữ.

## Trải nghiệm

- Desktop có cửa sổ 460px để hỏi nhanh và workspace tối đa 1.160px với thanh lối tắt. Mobile có sheet và chế độ toàn màn hình; kích thước theo visual viewport khi bàn phím thay đổi vùng hiển thị.
- Nội dung trả lời được trình bày theo từng đoạn với người nói, nguồn phòng và thẻ dữ liệu. Giữ nhận diện Apple Intelligence 7 sắc dynamic của Homeji ở viền cửa sổ, ô soạn và nút AI. Viền dùng chung bảng màu hiện có, chuyển động liên tục và tăng tốc khi xử lý; không phủ lên chữ. Bề mặt đục theo theme, tách khỏi hiệu ứng kính cũ để nút không bị ghi đè. Hỗ trợ reduced-motion và forced-colors.
- Nút mở rộng/thu gọn giữ nguyên hội thoại, câu hỏi đang chờ và bản nháp. Công cụ dẫn tới tìm phòng, phòng đã lưu, tin nhắn, chợ và lịch xem qua điều hướng hiện có.
- Thẻ gợi ý chỉ điền vào ô soạn để người dùng sửa. Gửi là thao tác riêng. Textarea tối đa 1.000 ký tự: Enter gửi, Shift+Enter xuống dòng; không gửi trong lúc IME đang ghép chữ.
- Có sao chép câu trả lời, hỏi tiếp, đến phản hồi mới nhất và trò chuyện mới. Trò chuyện mới có xác nhận, chỉ reset phiên hiện tại và ID hội thoại; không gọi DELETE lịch sử máy chủ.
- Hỏi tiếp ở câu trả lời thuộc phòng cũ yêu cầu mở lại đúng phòng đó. Không gắn câu hỏi cũ vào phòng mới đang chọn.
- Ngữ cảnh phòng, chi phí chưa xác nhận, hủy/thử lại, fallback backend cũ và chặn phản hồi trễ khi đổi tài khoản được giữ.

## Bàn phím và modal

Chế độ mở rộng/mobile có backdrop, khóa cuộn nền, inert nội dung nền và vòng focus. Dialog ẩn trong trang không được dùng để miễn trừ nền khỏi inert. Auth overlay là ngoại lệ có tên cụ thể. Đóng trả focus về nút mở; modal chi tiết phòng vẫn nhường phím cho trợ lý. Nếu cấu hình trả về enabled=false trong khi mở, mọi khóa nền được gỡ.

## Kiểm chứng và giới hạn

Build và ESLint các file thay đổi đạt. 70 kiểm thử frontend liên quan đạt, gồm 20 DOM chat bao phủ mở rộng, textarea/IME, công cụ, reset, clipboard, vòng focus, trạng thái cấu hình và ngữ cảnh phòng. Browser fixture dùng component thật với API giả: 5 kịch bản ở 320/390/1440px, sáng/tối; kiểm tra luồng gửi có xác nhận, tương phản nút gửi và các race đã có.

Ảnh ứng dụng thật tại `output/verification/ai-workspace/`: 4 kịch bản desktop/mobile sáng/tối trong fresh guest browser, không mock API hoặc tài khoản, đọc backend công khai qua proxy dev. Đã đo góc màu thay đổi để xác nhận viền chuyển động và kiểm tra auth gate không bị inert che. Vì landing khách chưa có nút AI trên navbar, smoke mở bằng event launcher thật của ứng dụng. Các ảnh này chứng minh giao diện local; không chứng minh đăng nhập hay câu trả lời model production. Luồng model, gửi tin cho chủ tin, đặt lịch và thanh toán thật không được thực hiện.

Thiết kế được phát hành cùng luồng cân nhắc nhiều phòng ngày 22/10/2026. Xem [bằng chứng phát hành và giới hạn kiểm chứng](./ai-rental-journey-2026-10-22.md#phát-hành). Production đã phục vụ bundle có UI mở rộng và viền động; workflow đăng nhập/model/gửi tin/thanh toán thật chưa được chạy trong lần phát hành này.
