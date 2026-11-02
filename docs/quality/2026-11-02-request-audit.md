# Nghiệm thu yêu cầu Homeji — 02/11/2026

## Kết luận phát hành

**Chưa nghiệm thu toàn bộ yêu cầu.** Bản sửa search, banner và tối ưu tải đầu được kiểm tra riêng. Các luồng có dữ liệu giả lập hoặc dịch vụ ngoài chưa được coi là đã xác nhận production đầu cuối.

## Kiểm tra thực hiện trong đợt này

- Frontend: `npm test` — 476 qua, 0 lỗi, 0 bỏ qua. Ban đầu 440/445; các test lỗi do tách transcript, tách popup và bổ sung loại phòng đã được cập nhật đúng ranh giới module, không bỏ assertion nghiệp vụ.
- Backend Application: 672 qua, 0 lỗi, 0 bỏ qua.
- PostgreSQL cô lập qua `scripts/quality/Test-LocalBackend.ps1`: migrate schema thật vào database `homeji_quality` trên loopback cổng 55449, không dùng production. 27 ca qua, 0 lỗi; 2 ca dùng nhà cung cấp AI thật bỏ qua vì thiếu cấu hình provider kiểm thử.
- Build TypeScript/Vite và ESLint các tệp sản phẩm thay đổi: qua.
- Bundle: trước sửa entry 271.488 byte, vượt giới hạn 250.000. Sau tải riêng AppShell: 202.429 byte, gzip 63.334 byte, qua `check:bundle`. Tổng JS tải đầu 705.799 byte và CSS 193.561 byte vẫn cần theo dõi, không suy ra tốc độ mạng thật từ kích thước entry.
- Dark mode: 73 view desktop/mobile và 33 tình huống thành phần; không phát hiện lỗi tương phản theo bộ đo hoặc runtime trong các fixture này. Không đồng nghĩa đã kiểm tra mọi nội dung do người dùng tự nhập hoặc mọi thiết bị.

## Các yêu cầu có bằng chứng trong đợt này

### Search và khám phá

- Đồng bộ animation gõ/xóa tên đường giữa header, bản đồ và tìm danh sách trang chủ; tên đường Lê Văn Việt, Đỗ Xuân Hợp, Võ Văn Ngân, Nguyễn Duy Trinh, Man Thiện, Lã Xuân Oai.
- Animation không ghi vào query thật; dừng khi focus/nhập, tạm dừng khi tab ẩn và giữ tĩnh khi giảm chuyển động.
- Trang chủ tìm theo tiêu đề, đường/khu vực và tiện ích; tiếng Việt không dấu, kết hợp loại phòng và giá. Local thử `le van viet` ra 17 phòng từ dữ liệu API tại thời điểm kiểm tra.
- Danh sách catalog dùng đủ trang; không mất tin ngoài viewport; tin thiếu tọa độ vẫn giữ trong danh sách. Kiểm thử cụm 17 tin mở đúng từng tin.
- Phân loại Phòng trọ/Căn hộ: có test cho phòng thuê riêng trong căn hộ, không gộp nhầm thành cả căn hộ.
- Số liên hệ, thẻ phòng, cột liên hệ cố định, sáng/tối và đèn pin/logo đã có bằng chứng production ở hai đợt ngay trước: FE 6e89dfe và 2c4c67f; BE a6e2a20.

### Tin nhắn và Agent

- `chat-incoming.e2e.mjs`: nhận tin tự động, không trùng tin sau reconnect/poll, giữ bản nháp, không nhập nhằng tài khoản hoặc trả lời muộn của thread khác.
- `chat-block.e2e.mjs`: xác nhận chặn, chặn/bỏ chặn, không mất lịch sử/bản nháp, lỗi API không khóa sai, chỉ một lần tải lịch sử.
- `chatbot-context-recovery.test.mjs`: đổi phòng/ngữ cảnh, trả lời muộn, bộ lọc áp dụng ngay trong chat và giữ nội dung hội thoại.
- `chatbot-media.e2e.mjs`: ảnh/lỗi thử lại, ghi âm, chép lời vào bản nháp, hủy và kiểm tra định dạng; 390px sáng và 1280px tối. Audio/AI của bài test được giả lập; chưa là thử microphone vật lý và AI production.
- `agent-business.e2e.mjs`: sáu form rental, roomTransfer, roommate, wanted, food, secondHand đúng field, giá/cọc và đích sau đăng; pass phòng phải xác nhận đồng ý chủ nhà.
- `agent-mode-switch.e2e.mjs`: Basic/khách khóa, Premium bật, hết hạn hạ quyền, busy khóa, lỗi/thử lại, reduced motion và 320–1100px.
- `agent-location.e2e.mjs`: xin phép GPS, gửi vị trí vào yêu cầu, tiếp tục sau chia sẻ, quên vị trí và liên kết phòng nội bộ.
- Các test database kiểm tra quyền, hết hạn, hủy, không đăng trước xác nhận, lặp xác nhận chỉ đăng một lần và các model bài đăng riêng. Chưa xác nhận toàn bộ luồng với AI thật.

### Gói thành viên, admin, banner

- `premium-purchase-confirm.e2e.mjs`: ví/MoMo/PayOS đều qua xác nhận, Enter/Escape không tạo thanh toán, bấm đôi chỉ một yêu cầu, voucher khớp số tiền, mobile không tràn.
- `money-input.e2e.mjs`: nhóm dấu chấm theo từng lần nhập, raw digits đúng, dán/xóa và sửa cạnh dấu phân cách.
- `admin-reporting.e2e.mjs`: danh sách tài khoản/gói, phân biệt trạng thái gói/thanh toán, tạo/tải Excel, không gửi email khi chỉ mở trang hoặc tải lại, retry/bấm đôi không nhân yêu cầu. Dịch vụ email là fixture; chưa chứng minh email thật đến Gmail.
- `premium-pricing.e2e.mjs`: admin xem trước/hủy/xác nhận đổi giá kèm lý do; banner căn giữa 320–1366px, thông báo mới được ghi nhận; ưu đãi/thông báo tự đóng đúng 15 giây, không tự mua gói và không tự mở lại sau refresh.
- Đã sửa lỗi thật backdrop banner còn ám đỏ thành nền trung tính; khung ngoài trắng, phần banner giữ đỏ/vàng. Thay câu thanh toán cứng bằng tổng tiền + thời hạn ngắn gọn, giữ giá/ngày nổi bật.
- Kiểm thử database riêng cho mua đồng thời, rollback khi tạo biên nhận lỗi, gia hạn, thay giá đồng thời và thông báo bảo trì bền vững. Chống lặp ưu đãi mỗi đợt được bổ sung test database chuyên biệt.

## Chưa đủ điều kiện ký nghiệm thu toàn bộ

1. **Liquid Glass chưa đúng yêu cầu kỹ thuật.** `webglTabGlass.ts` vẫn dùng WebGL cho ánh sáng bề mặt và CSS/SVG cho khúc xạ nền DOM; chưa đáp ứng yêu cầu không giả khúc xạ/bẻ chữ bằng CSS/SVG. Không được báo là đã có khúc xạ vật lý như Apple.
2. **AI production:** hai ca gọi nhà cung cấp thật chưa chạy; cần xác nhận ảnh/giọng nói thật tạo đúng bản nháp và đăng sau duyệt trên tài khoản Premium, riêng từng nghiệp vụ.
3. **Dịch vụ ngoài:** chưa chứng minh email báo cáo thực nhận ở Gmail, OAuth Google hoàn tất với người dùng thật, hay thanh toán MoMo/PayOS thật. Fixture pass chỉ xác nhận giao diện và contract; không tự thực hiện giao dịch tiền thật trong QA.
4. **Hiệu năng thiết bị:** budget đã qua nhưng chưa có phép đo FPS/INP/LCP trên điện thoại thật và mạng chậm, nhất là kính/animation/bản đồ/chat.
5. **Dữ liệu nguồn:** số lượng phụ thuộc hạn tin; không được bật lại tin hết hạn, gán chủ sở hữu ngẫu nhiên hoặc tự nhận tọa độ chính xác hơn nguồn. 175 tin có số và 134 còn hiệu lực là kết quả đợt trước, cần đọc API tại thời điểm cần dùng.
6. **Toàn bộ copy/UI và tham chiếu NSO:** chưa kiểm tra mọi màn hình/asset theo tất cả câu yêu cầu lịch sử. Không suy từ 73 view dark rằng mọi chi tiết hình ảnh, game và văn phong đã được duyệt cuối.

## Tệp bằng chứng

Các log `qa-*.log` trong worktree release ghi lệnh và kết quả. Ảnh/JSON: `output/verification/dark-project/contrast.json`, `dark-components/results.json`, `premium-pricing/`, `chatbot-media/`, `agent-business/`, `agent-mode/`, `agent-location/`, `admin-reporting/`. Database: `C:/Homeji/output/rental-contact-release/output/quality/` có TRX và coverage của từng lần chạy; các instance đã được tắt sau test.

Không gộp các số đếm test thành một tỷ lệ phần trăm hoàn thành yêu cầu. Các mục chưa đủ bằng chứng ở trên vẫn là phạm vi chưa nghiệm thu.
