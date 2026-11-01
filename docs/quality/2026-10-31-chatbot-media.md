# Chatbot: ảnh, bản ghi và nói thành chữ

Ngày kiểm tra: 31/10/2026. Thay đổi local ở frontend `C:/EXE101_Homeji` và backend `C:/Homeji`; chưa deploy.

## Hành vi

- Chat AI có nút Ảnh, Ghi âm và Nói thành chữ. Ghi âm dùng lại recorder WAV 16 kHz mono hiện có của chat thường.
- Bản ghi được nghe lại, hủy hoặc đính kèm trước khi gửi. Nói thành chữ tạo bản nháp chỉnh sửa được; không tự gửi hội thoại.
- Cho phép 3 ảnh JPEG/PNG/WebP (4 MB/ảnh), 1 WAV tối đa 2 phút, tổng tệp tối đa 8 MB. Backend kiểm tra lại byte, định dạng WAV và giải mã/re-encode ảnh bằng bộ xử lý hiện có để loại metadata.
- `POST /api/chatbot/messages` thêm trường `attachments` tùy chọn; request văn bản cũ tương thích. `POST /api/chatbot/transcriptions` cần đăng nhập và dùng policy rate limit CostlyOperations.
- Tệp được chuyển tới Gemini dạng inlineData, không ghi vào DB/lịch sử. Lịch sử lưu văn bản và dấu hiệu đã gửi tệp. Preview tệp và dữ liệu để retry chỉ giữ trong phiên giao diện.
- Lượt có tệp dùng phân tích đa phương thức, không chạy tìm danh mục, tính tiền phòng hoặc tác vụ tài khoản dựa trên nội dung tệp. Yêu cầu tìm tin thật cần gửi bằng văn bản; bản chép lời đã duyệt có thể dùng luồng văn bản hiện có.
- Khi lỗi provider, giữ tệp để retry thay vì trả câu trả lời văn bản dự phòng như thể AI đã đọc tệp. Đóng chat hủy phiên ghi âm/yêu cầu chép lời đang chờ.

## Kiểm tra

- Backend: 126 tests nhóm Chatbot; 17 tests API context binding/Gemini client; 2 tests deadline provider. Các bài dùng provider giả lập kiểm tra schema, ảnh hỏng, ngân sách tệp, retry, transcript không lưu hội thoại và tương thích text-only.
- Frontend: build production và ESLint các module thay đổi; 36 tests phục hồi chat/recorder/WAV cùng 3 tests chatbot safety.
- `tests/chatbot-media.e2e.mjs`: Chromium headless, micro giả lập, API bị intercept local; mobile 390 px sáng và desktop 1280 px tối. Kiểm tra chọn ảnh, retry giữ byte, ghi WAV qua AudioWorklet thật, bản nháp từ transcript, giới hạn ảnh, hủy ghi và từ chối micro. Ảnh kiểm tra ở `output/verification/chatbot-media/`.
- Một request trực tiếp tới provider cấu hình local chứa ảnh 1 pixel và WAV im lặng tổng hợp trả HTTP 200, có văn bản phản hồi. Đây là smoke test provider nhận payload đa phương thức, không xác minh chất lượng nhận dạng lời nói thật hay production.
- Chưa kiểm tra thiết bị iOS/Android vật lý, tài khoản production hoặc dữ liệu media của người dùng. Build còn cảnh báo kích thước chunk lớn.

## Tài liệu giao thức

- [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Gemini audio understanding](https://ai.google.dev/gemini-api/docs/audio)
