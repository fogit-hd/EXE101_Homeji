# Cấu hình để kiểm chứng provider Homeji

Ngày kiểm tra: 05/10/2026. Đây là hướng dẫn chạy kiểm chứng, không phải bằng chứng production đã rollout.

## Gemini

Backend đọc khóa từ `Ai:Gemini:ApiKey`; biến môi trường tương ứng là `Ai__Gemini__ApiKey`. Không đưa khóa vào frontend, Git, ảnh hoặc tin nhắn. Cấu hình hiện tại chưa có giá trị này. Biến `GOOGLE_API_KEY` khác đang có trong môi trường trả HTTP 400 khi kiểm tra quyền đọc model; không tự sao chép nó vào cấu hình dự án hoặc dùng làm khóa Maps cho browser.

Sau khi có cấu hình hợp lệ, kiểm tra endpoint/model được tài khoản cho phép, rồi chạy câu tìm phòng tổng hợp không có dữ liệu người dùng. Xác nhận parser thực trả được schema, grounding vẫn chỉ lấy tin Active đúng phạm vi, fallback khi provider lỗi và latency từng stage. Không gửi liên hệ/chứng từ/profile người thuê vào parser.

Endpoint mặc định hiện dùng `gemini-2.5-flash`. [Google deprecations](https://ai.google.dev/gemini-api/docs/deprecations) hiện ghi model này chưa có shutdown date nhưng giới hạn với người đã dùng trước đó; cần kiểm tra quyền tài khoản thực, không đổi model âm thầm. [Hướng dẫn API key](https://ai.google.dev/gemini-api/docs/api-key) mô tả cách cấu hình biến môi trường của SDK; client REST Homeji vẫn dùng section cấu hình nêu trên.

## Maps / Places / Routes

Frontend cần `VITE_GOOGLE_MAPS_API_KEY` trong môi trường Vite được chọn hoặc file local không commit. Key dành cho browser cần được chủ tài khoản cấu hình cho origin kiểm chứng và các API đang dùng. Không dùng khóa Gemini phía server làm key browser. `VITE_GOOGLE_MAP_ID` là tùy chọn theo cấu hình dự án.

Khi cấu hình sẵn sàng, kiểm tra điểm đến do người dùng chọn, phương tiện/giờ đi, route lỗi từng phần/quota, 20 lần đổi ghim nhanh, attribution và mobile. Không bật device GPS để thay điểm đến. Ghi latency/SKU/request count của tài khoản thực; tests giả lập không chứng minh quota/billing thực.

## Lịch sử và môi trường kiểm tra

Lưu lịch sử vẫn mặc định tắt; chỉ bật sau quyết định retention và implementation cleanup. Nhớ tiêu chí trong phiên vẫn dùng được. Không chạy suite tạo/xóa dữ liệu QA lên database thật để vượt guard. Source checker đã kiểm tra metadata của 100 quảng cáo với robots.txt/allowlist; giữ unknown nếu nguồn không cung cấp dữ liệu cần thiết, không coi quảng cáo là phòng đã xác minh.

Khi chạy backend local để kiểm tra dữ liệu thật, tắt `BackgroundJobs:Enabled` và `Database:ApplyMigrationsOnStartup` trong riêng tiến trình kiểm chứng để không tự chạy các worker hết hạn giao dịch hoặc migration chưa được đối chiếu. Không dùng tài khoản/endpoint fixture làm bằng chứng quyền production.
