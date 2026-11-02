# TypeSafe AI Jev: bằng chứng từ nguồn chính thức

Kiểm tra ngày **29/10/2026**. Phạm vi: Jev/System One của TypeSafe AI (người dùng đã xác nhận đúng sản phẩm). Chỉ đọc tài liệu công khai; chưa gọi API, đo độ chính xác/độ trễ, truy cập tài khoản hay thay đổi ứng dụng.

## Khả năng và giới hạn đầu ra

Jev nhận `state` cùng các câu hỏi có kiểu. `Choice` chọn một phương án định sẵn; `Score` chấm theo các mức; `Noul` trả xác suất đúng/sai. Các câu hỏi được đánh giá độc lập, song song trên cùng dữ liệu. Thiết kế này phù hợp phân loại, định tuyến, chấm mức phù hợp; không sinh câu trả lời tự do. Đây là mô tả của nhà cung cấp, chưa phải kết quả đo trên Homeji. [Introduction](https://docs.typesafe.ai/introduction)

Cam kết “0% hallucination” trên trang chủ được chính TypeSafe giới hạn ở **đầu ra khớp schema/kiểu**; không có nghĩa mọi quyết định đều đúng. Các số so sánh tốc độ/chi phí trên trang chủ là kết quả workflow của họ, không phải cam kết cho mọi tác vụ. [Trang chủ TypeSafe](https://typesafe.ai/)

## Tích hợp ASP.NET Core

API HTTP là `POST https://api.typesafe.ai/v1/systemone`, xác thực `Authorization: Bearer <token>`, JSON có `model`, `state`, `questions`; phản hồi có `answers`, model thực tế và token usage. **Suy luận kỹ thuật:** ASP.NET Core có thể gọi qua typed `HttpClient` và DTO; không cần dựng thêm dịch vụ Node/Python chỉ để gọi API. [API System One](https://docs.typesafe.ai/api/system-one)

Danh mục SDK chính thức hiện liệt kê Python và JavaScript/TypeScript, đồng thời cho phép gọi HTTP từ mọi ngôn ngữ; không thấy SDK .NET trong danh mục đã kiểm tra. [Client SDKs](https://docs.typesafe.ai/sdk), [SDK JavaScript chính thức](https://github.com/typesafe-ai/typesafe-sdk-js), [SDK Python chính thức](https://github.com/typesafe-ai/typesafe-sdk-python)

Client HTTP tự triển khai phải xử lý timeout/cancellation, xác thực phản hồi và retry có giới hạn. Nhà cung cấp yêu cầu exponential backoff cho `429` (rate limit) và `529` (overload). Body JSON phải là UTF-8 không BOM; payload tối đa 32 MiB. [Request rules and errors](https://docs.typesafe.ai/api/errors)

## Model, giá và quyền truy cập

Tài liệu hiện ghi `jev-latest` và `jev-preview` cùng trỏ tới `jev-1.14.0`; model phát hành 14/10/2026. Giá niêm yết **0,042 USD/triệu input token**, output miễn phí. Context mặc định: 64k token/request và 32k/question. Rate limit theo tổ chức, xem trong console; alias có thể đổi model. Khi đánh giá production, nên ghim phiên bản và lưu model thực tế. [Models](https://docs.typesafe.ai/models)

Đăng ký đã mở, không cần duyệt waitlist; tạo tài khoản tại console. Việc tài khoản Homeji có key/credit chưa được kiểm tra. [Hướng dẫn tạo tài khoản](https://help.typesafe.ai/articles/4519713419-how-do-i-create-or-activate-my-account-after-an-invitation-or-waitlist-approval), [Console](https://console.typesafe.ai/)

Chi phí minh họa tự tính: 100.000 request × 2.000 input token/request × 0,042 USD/triệu = **8,40 USD** tiền token. Không phải dự toán thực tế Homeji; phải đo input gồm cả câu hỏi, số lần gọi và retry. Credits được quản lý qua billing; thiếu credit thường trả `402`. [Hướng dẫn 402 và credits](https://help.typesafe.ai/articles/5505198974-what-s-a-402-error-and-how-can-i-add-more-credits)

## Confidence, tiếng Việt và nội dung đối kháng

`Choice`/`Score` có phân phối `probabilities`; `confidence` là thống kê tính từ phân phối này. `Noul` không có trường confidence riêng. **Suy luận:** confidence cao không phải bằng chứng tỷ lệ đúng cao trên dữ liệu Homeji, cũng không nên mặc định hiểu `confidence = 0,9` là chính xác 90%. Tài liệu yêu cầu tự đánh giá ngưỡng theo miền ứng dụng. [Confidence](https://docs.typesafe.ai/confidence)

TypeSafe công bố 1.14 cải thiện đa ngôn ngữ nhưng không đưa số đo riêng tiếng Việt trong trang phát hành đã đọc. Chưa tìm thấy benchmark tiếng Việt chính thức qua docs và tìm kiếm tên ngôn ngữ; chưa đủ bằng chứng để khẳng định hiểu tốt tiếng lóng, không dấu hoặc câu pha Anh–Việt của Homeji. Ảnh, bounding box và long context được giới thiệu như tính năng thử nghiệm cần header opt-in; nhà cung cấp chưa bảo chứng chúng cho production. [Thông báo Jev 1.14](https://typesafe.ai/blog/jev-1-14)

Tài liệu lỗi đã biết **áp dụng riêng Jev 1.13**, không thể suy rộng thành kết quả đo 1.14: nội dung được viết để đánh lừa có thể đổi đáp án; thứ tự lựa chọn có thể gây lệch; số học/ngày giờ và context nhiều chi tiết thừa kém tin cậy. Cần kiểm thử lại các trường hợp đó ở phiên bản dùng thực tế. Đúng kiểu đầu ra không tạo ranh giới bảo mật chống prompt injection. [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13)

## Dữ liệu và quyền riêng tư

Help Center nói không huấn luyện Jev bằng request/response khách hàng, nhưng vẫn có thể xử lý dữ liệu để cung cấp dịch vụ, tính phí, chống gian lận và tạo telemetry; thời gian lưu/xóa tùy dữ liệu, thỏa thuận, pháp luật và ZDR. Không được suy diễn “không huấn luyện” thành “không lưu”. [Data usage and retention](https://help.typesafe.ai/articles/5974925716-how-is-submitted-data-used-or-retained)

Privacy Policy ghi dịch vụ được host ở Mỹ và giữ dữ liệu cá nhân trong thời gian hợp lý cần thiết; không công bố một thời hạn xóa mặc định cố định cho mọi request. [Privacy Policy](https://typesafe.ai/legal/privacy-policy)

ZDR được cung cấp cho enterprise và cần thiết lập/thỏa thuận cho tài khoản; SOC 2 Type II report cần yêu cầu qua Trust Center. Chưa kiểm tra hợp đồng, vùng xử lý hay ZDR cho Homeji. **Khuyến nghị kỹ thuật:** thử bằng dữ liệu tổng hợp/đã loại thông tin định danh trước, chỉ gửi trường tối thiểu cho quyết định. [Enterprise](https://typesafe.ai/enterprise), [DPA](https://typesafe.ai/legal/data-processing)

## Kết luận nguồn

Có cơ sở kỹ thuật để dùng Jev như một bộ phận ra quyết định có tập đầu ra đóng. Chưa có bằng chứng thực nghiệm để kết luận nó tốt hơn luồng AI hiện tại của Homeji hoặc thay được mô hình sinh văn bản. Đánh giá riêng tiếng Việt, khả năng từ chối khi thiếu dữ liệu, đầu vào đối kháng và độ chính xác theo từng nhóm mới quyết định được có nên bật cho người dùng thật.

## Đối chiếu với Homeji hiện tại

Các nhận xét sau là đánh giá kỹ thuật từ mã nguồn, không phải kết quả chạy Jev:

- [ChatbotService.cs](C:/Homeji/src/Homeji.Application/Services/Chatbot/ChatbotService.cs:106) nhận diện chủ đề đồ ăn và chỉnh điều kiện trước khi chọn luồng tìm món, so sánh phòng hoặc hội thoại. [FoodSearchIntent.cs](C:/Homeji/src/Homeji.Application/Services/Common/FoodSearchIntent.cs:9) thực hiện bằng từ khóa/regex. Đây là vị trí có thể thử bộ phân loại ý định Jev.
- [foodChatIntent.ts](C:/EXE101_Homeji/src/lib/foodChatIntent.ts:4) và [MapChatbot.tsx](C:/EXE101_Homeji/src/components/map/MapChatbot.tsx:426) cũng chọn ngữ cảnh ở FE. Vì vậy chỉ đổi bộ phân loại BE chưa đủ: FE có thể đã bỏ ngữ cảnh đồ ăn hoặc gắn phòng đang xem trước khi gửi. Cần thống nhất quyết định cuối và dữ liệu ngữ cảnh qua hợp đồng API, vẫn giữ các kiểm tra dữ liệu trả về.
- [GeminiInterestRanker.cs](C:/Homeji/src/Homeji.Infrastructure/External/GeminiInterestRanker.cs:7) hiện dùng Gemini xếp hạng các phòng đã thỏa bộ lọc. Có thể thử Jev Score trên từng ứng viên rồi sắp xếp bằng code; phải đo chất lượng và chi phí thực tế, không tự coi score là độ phù hợp khách quan.
- [AiSearchService.cs](C:/Homeji/src/Homeji.Application/Services/AI/AiSearchService.cs:64) giữ các điều kiện người dùng xác nhận làm căn cứ truy vấn. [RentalDecisionService.cs](C:/Homeji/src/Homeji.Application/Services/AI/RentalDecisionService.cs:14) kiểm tra quyền, tin còn hiệu lực và dữ liệu chi phí. Các ràng buộc này phải tiếp tục là code, không chuyển thành phán đoán của Jev.

## Thứ tự áp dụng đề xuất

1. **Thử trước ở phân loại câu hỏi:** tìm phòng, đồ ăn, tiện ích quanh phòng, hướng dẫn ví/đơn, yêu cầu ngoài phạm vi, hoặc cần hỏi lại. Dùng một bộ nhãn đóng, có lựa chọn chưa rõ. Câu hỏi tiếp theo phải có chủ đề gần nhất và ngữ cảnh người dùng đã chọn.
2. **Thử xếp hạng kết quả đã hợp lệ:** DB lọc giá, khu vực, tồn kho/trạng thái trước; Jev chấm các tiêu chí mềm từ dữ kiện có sẵn. Không tạo phòng/món mới hoặc bỏ bộ lọc cứng.
3. **Hỗ trợ quản trị và chăm sóc:** phân nhóm báo cáo/phản hồi và gợi ý hàng chờ cần xem. Nhân viên vẫn xét duyệt, không tự khóa tài khoản/xóa tin chỉ từ nhãn AI.
4. **Hỗ trợ UX gián tiếp:** chọn một gợi ý hoặc câu hỏi làm rõ từ nội dung đã chuẩn bị; giữ điều hướng nhất quán. Jev không tự thiết kế CSS hoặc làm giao diện đẹp hơn.

Không dùng Jev để quyết định số dư, cấp voucher, giá thanh toán, hoàn tiền, điều kiện bắt buộc của hồ sơ, phân quyền hay xác nhận trạng thái đơn. Các phần này đã có dữ liệu/quy tắc chính xác. Không giao Jev tự quyết định ai đủ điều kiện được thuê nhà. Gemini vẫn phục vụ các phần cần sinh nội dung/hội thoại.

## Kế hoạch thử nhỏ trước production

- Chạy một bộ phân loại độc lập ở BE bằng typed HttpClient; API key chỉ ở server. Có cờ tắt nhanh và giới hạn chi phí. Chưa cần thêm dịch vụ Node/Python hoặc thay framework frontend.
- Tạo tập câu tiếng Việt có nhãn đúng do người đánh giá: có dấu/không dấu, tiếng lóng, câu ngắn tiếp nối, đổi chủ đề và nội dung cố tình đánh lừa. Ví dụ cần thử: sau khi hỏi món, người dùng nói “tầm 30k thôi”; sau khi hỏi phòng, “gần chỗ đó hơn”. Không gửi tài khoản, OTP, giấy tờ, số dư hay hội thoại thật chưa được xử lý quyền riêng tư.
- Tách tập dùng để điều chỉnh prompt/ngưỡng và tập kiểm tra cuối. Ghim model `jev-1.14.0`, ghi model thực tế và phiên bản bộ nhãn.
- Ban đầu chạy song song để so sánh với luồng hiện tại, không thay kết quả người dùng. Đo đúng/sai theo từng ý định, nhầm đồ ăn với phòng, mất ngữ cảnh, tỷ lệ phải hỏi lại, timeout, p50/p95 và chi phí trên yêu cầu hoàn tất.
- Chỉ bật một luồng ít rủi ro khi có kết quả tốt hơn. Khi không chắc chắn hoặc API lỗi, dùng luồng hiện tại hoặc hỏi rõ; không tự chuyển sang thao tác ghi tiền/đơn.

Regex hiện tại có lợi thế không tốn phí dịch vụ và không thêm mạng. Thêm Jev trước mọi câu hỏi có thể làm chậm luồng vẫn phải gọi Gemini. Giá token thấp không tự chứng minh tiết kiệm tổng chi phí hay cải thiện trải nghiệm; quyết định áp dụng dựa trên thử nghiệm Homeji.

## Quyết định sau điều kiện “miễn phí mới dùng”

Người dùng chỉ cho phép sử dụng khi miễn phí. Kiểm tra bổ sung ngày 29/10/2026: tài liệu model vẫn niêm yết phí input; Help Center hướng dẫn mua credits khi hết số dư. Chưa tìm thấy công bố chính thức về gói API miễn phí lâu dài hoặc bộ trọng số Jev được phát hành miễn phí để tự chạy. Trang enterprise có câu hỏi về VPC/on-premises nhưng phần nội dung công khai đọc được không xác nhận đây là phương án miễn phí. Không suy diễn SDK công khai thành model mã nguồn mở.

Vì vậy **chưa triển khai hay bật tích hợp Jev**, không gọi API và không thêm cơ chế nạp tiền. Kế hoạch tích hợp phía trên chỉ là đề xuất có điều kiện, không phải tính năng đã hoàn thành. Điều kiện để xem xét tiếp là bằng chứng chính thức về quyền sử dụng miễn phí phù hợp với Homeji; credit dùng thử hữu hạn không đủ để kết luận vận hành lâu dài miễn phí.

Nguồn kiểm tra: [Models](https://docs.typesafe.ai/models), [Credits và lỗi 402](https://help.typesafe.ai/articles/5505198974-what-s-a-402-error-and-how-can-i-add-more-credits), [Enterprise](https://typesafe.ai/enterprise).
