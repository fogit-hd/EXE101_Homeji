# Trợ lý theo phòng đang xem — lát triển khai đầu tiên

Nghiên cứu: 21/10/2026. Chuẩn bị bản phát hành: 22/10/2026, giờ Việt Nam. Theo nghiên cứu [AI hữu ích xuyên suốt Homeji](./research/ai-user-experience-strategy-2026-10-21.md), triển khai một luồng hoàn chỉnh trước khi mở rộng sang mọi nghiệp vụ.

## Hành vi mới

- Chi tiết phòng trên bản đồ và popup có phần chi phí: tiền thuê đúng đơn vị, cọc tách riêng, đơn giá điện/nước/internet theo tin và khoản chưa biết. Giá theo người hoặc chưa rõ đơn vị không dùng calculator tổng cả phòng.
- Có thể mở kịch bản chi phí hiện có, hoặc soạn câu hỏi cho người đăng. Draft chỉ lấy title và các field cần hỏi, không sao chép địa chỉ, số liên hệ hay mô tả.
- Draft có thể sửa, giới hạn 2.000 ký tự. Chọn mở tin nhắn tạo/mở hội thoại qua API hiện có, kiểm tra lại đúng post/người nhận/tài khoản; chưa gửi nội dung.
- Inbox đưa ra đề nghị dùng bản nháp. Không ghi đè nội dung đang soạn nếu chưa chọn thay; chỉ gửi khi người dùng bấm Gửi hoặc Enter. Shift+Enter xuống dòng.
- Bề mặt chi tiết trên bản đồ có nút mở trợ lý theo phòng đang xem. Chat hiện ngữ cảnh có thể bỏ, tác vụ chi phí/câu hỏi và dữ liệu backend đọc lại theo ID. Tìm phòng mới vẫn dùng flow tìm kiếm.
- Chat cho dừng, thử lại; giữ câu hỏi và không đè nội dung mới đang gõ. Đổi phòng/tài khoản hoặc unmount làm vô hiệu phản hồi cũ.

Không tự gửi tin/lịch xem, đặt cọc, đổi giá hoặc thanh toán. Đây chưa phải toàn bộ roadmap 30 cơ hội. Phần phí chưa có đơn vị/xác nhận vẫn là unknown, không được biến thành miễn phí hoặc tổng chính thức.

## Hợp đồng frontend/backend

Request `POST /api/chatbot/messages` bổ sung optional:

```json
{
  "rentalContext": {
    "postId": "UUID của tin đang chọn",
    "task": "cost"
  }
}
```

`task` có thể bỏ hoặc thuộc `cost`, `questions`, `details`. Title chỉ dùng trong UI; client chỉ gửi ID/task. Backend validate ID/task, nhận diện yêu cầu tìm mới và resolve tin qua `IRentalDecisionService.CompareAsync`, giữ public/active/phạm vi/quyền hiển thị. Câu trả lời theo phòng là template từ dữ liệu, không gọi Gemini hoặc search tổng quát.

Response thêm optional `rentalDecision`, cùng shape compare. Request cũ tiếp tục hoạt động. Nếu backend cũ chưa trả decision hoặc trả sai ID, frontend không trình bày văn bản chung như sự thật về phòng; hiện hướng dẫn mở công cụ trong detail. Tin không còn khả dụng có trạng thái an toàn. Không có migration/config/provider mới.

## State và ranh giới dữ liệu

- Selection dùng registration theo tài khoản; popup lồng nhau đóng sẽ khôi phục selection bên dưới. Bỏ ngữ cảnh và đổi tài khoản không cho request cũ ghi kết quả mới.
- Handoff draft chỉ ở RAM, tối đa 5 mục, TTL 10 phút; gắn user ID, conversation ID, post ID, recipient ID và version draft. Dùng/bỏ là consume một lần. Không đưa draft vào URL, localStorage, analytics hoặc model.
- Trước consume kiểm tra lại session đang dùng. Trước queue và điều hướng kiểm tra generation/mounted state/tài khoản/đối tượng; đóng detail hoặc rời trang trong khi API đang chờ không mở lại hội thoại cũ.
- Backend vẫn kiểm tra quyền hội thoại khi gửi. Các guard frontend chỉ bổ sung khả năng dùng an toàn, không thay auth server.

## Kiểm chứng

- Frontend build được kiểm tra trên nhánh phát hành sạch từ `origin/main` (498def3), giữ navbar AI và giao diện inbox hiện tại. Không đưa các thay đổi giao diện chưa liên quan từ checkout làm việc vào bản phát hành.
- Bộ kiểm thử hành vi frontend liên quan: 40/40; bao phủ helper/draft, identity/conversation/recipient, TTL/consume một lần, nội dung đang soạn, context/retry/cancel, backend cũ, đơn vị giá, thẻ mobile và Routes flag. Hai DOM regression chạy shell thật xác nhận snapshot riêng tư của viewer cũ không hiển thị hoặc được khôi phục bởi response trễ khi đổi tài khoản.
- Backend Application unit suite: 481/481. HTTP contract test mới: 3/3 (binding/mapping field mới, request cũ, GUID sai); fake service, không DB/provider thật.
- `tests/rental-assistant-flow.e2e.mjs` dùng component thật và API giả qua loopback: 390px và 1440px, sửa draft, chuyển đúng inbox, không gửi trước xác nhận, giữ xuống dòng, một request gửi sau thao tác cuối; request sau đóng detail hoặc đổi tài khoản bị bỏ qua; context chat chỉ gửi ID/task; không lỗi JS. Đã mở ảnh kiểm tra bố cục mobile và desktop.
- Ảnh và kết quả automated browser: `output/verification/rental-assistant-context/`. Dữ liệu/account đều giả để QA. Bằng chứng này không phải một tin nhắn thật, Gemini thật hoặc kiểm chứng production.

Để chạy browser suite, khởi động Vite loopback (mặc định port 5527), đặt `HOMEJI_PLAYWRIGHT_MODULE` tới Playwright nếu package chưa nằm trong node_modules của repo. Có thể đổi `HOMEJI_TEST_BASE_URL` và `HOMEJI_CHROME_PATH`; script chỉ nhận localhost/127.0.0.1.

## Rollout và phần tiếp theo

FE/BE nên phát hành cùng hợp đồng; có fallback FE khi BE cũ. Các phần chi tiết được điều khiển bởi `VITE_AI_DECISION_TOOLS`; không tự bật Routes hoặc lưu lịch sử chat. Chưa deploy trong lần làm này.

Tiếp theo nên hợp nhất shortlist/kịch bản giữa tìm kiếm và compare, rồi bổ sung fee units/fact sheet có nguồn xác nhận. Khi đó câu trả lời chi phí sẽ bớt phải hỏi lại; thay model không giải quyết được dữ liệu thiếu.
