# AI hữu ích xuyên suốt Homeji

Ngày rà soát: **21/10/2026, giờ Việt Nam**. Phạm vi người dùng chọn: **toàn bộ trải nghiệm Homeji**. Frontend: `C:/EXE101_Homeji`; backend: `C:/Homeji`.

Đây là nghiên cứu sản phẩm và kỹ thuật từ mã nguồn đang có và nguồn chính thức. Hai checkout đang có nhiều thay đổi chưa commit; báo cáo không xác nhận chúng đã được phát hành. Không truy vấn dữ liệu người dùng, không gọi giao dịch, không đổi cấu hình và không đo production trong lần nghiên cứu này. Những nguyên nhân UX dưới đây là giả thuyết có căn cứ từ code, cần quan sát người dùng để xác nhận mức ảnh hưởng.

## Kết luận và phản biện

Homeji đã có nhiều công cụ mang tên AI. Việc cần ưu tiên là **giảm công sức để người dùng hoàn thành việc**, đặc biệt ở chỗ chuyển từ tìm → hiểu → chọn → hỏi → hẹn, và từ đăng tin → trả lời → xử lý công việc.

Tôi không đề xuất triển khai tất cả ý tưởng cùng lúc. “Hỗ trợ càng nhiều” nên có nghĩa là bao phủ nhiều tình huống bằng một nền tảng thống nhất, rồi mở rộng theo kết quả sử dụng. Thêm nhiều popup và chatbot độc lập có thể làm trải nghiệm phức tạp hơn.

Hướng sản phẩm: **Homeji hiểu việc đang làm, đưa ra thông tin có nguồn, chuẩn bị bước tiếp theo và cho người dùng kiểm soát.** Phép tính, trạng thái đơn, lọc giá, lịch hẹn và quyền truy cập thuộc dịch vụ nghiệp vụ. Model giúp hiểu câu nói, tổng hợp và diễn đạt khi điều đó giảm công sức thật.

## 1. Vì sao AI hiện tại có thể chưa tạo cảm giác hữu ích

### 1.1. Chatbot xuất hiện toàn cục nhưng thiếu ngữ cảnh màn hình

Chatbot được mount toàn ứng dụng, nhưng request chỉ có `message`, `conversationId`, `saveHistory`, `previousCriteria`. Chưa có ID phòng đang mở, shortlist, món đang xem hoặc công việc hiện tại. Vì vậy các câu như “phòng này tổng bao nhiêu?”, “so sánh hai cái này”, “soạn câu hỏi cho chủ phòng” chưa có một hợp đồng ngữ cảnh đủ rõ. Action hiện chủ yếu mở section hoặc điều hướng. [FE1], [BE1], [BE2].

**Đề xuất:** ngữ cảnh có cấu trúc, hiển thị được và bỏ được: “Đang hỗ trợ: phòng bạn đang xem”. Server đọc lại dữ liệu theo ID và quyền, không tin dữ liệu giá/quyền client gửi lên.

### 1.2. Người dùng phải chủ động tìm một công cụ tên “Gợi ý AI”

Natural search là panel riêng cạnh tìm kiếm thường; flow gồm mở, nhập/gửi, xem lại và xác nhận áp dụng. Chat và natural search yêu cầu đăng nhập trước khi gửi. Đây là rào cản thử tính năng có thể có, chưa phải bằng chứng tỷ lệ bỏ cuộc. [FE2].

**Đề xuất:** ô tìm kiếm nhận nhu cầu tự nhiên trực tiếp; hiện chip đã hiểu ngay cùng kết quả. Hỏi một câu nếu sự mơ hồ làm đổi kết quả. Xem thử truy vấn công khai cho khách có quota là một thử nghiệm đáng làm; lưu nhu cầu, nhắn tin và thao tác tài khoản vẫn cần đăng nhập. Đổi ranh giới khách cần endpoint và rate limit phù hợp, không chỉ bỏ kiểm tra ở UI.

### 1.3. Công cụ ra quyết định bị phân tán, nhập liệu lặp

Trang đã lưu yêu cầu lưu ít nhất hai tin, chọn 2–3 tin rồi hiển thị cả `RentalComparison` và `RentalDecisionPanel`. Mỗi phần lại có tính chi phí/kịch bản riêng. [FE3].

**Đề xuất:** một khay “Đang cân nhắc” từ card, map và detail; một màn so sánh; một kịch bản số người/chi phí/điểm đến dùng lại. Không buộc phải học cấu trúc trang đã lưu để so sánh nhanh.

### 1.4. Thiếu dữ liệu đang dễ biến thành một ngõ cụt

`AiSearchReview` dùng tình trạng bất định chung và kiểm tra bất kỳ tin nào thiếu đơn vị giá để quyết định có hiện nút áp dụng hay không. Backend luôn bổ sung `feeUnits` khi budget là tổng; lời trả lời hướng người dùng điền và xác nhận kịch bản từng tin. Một ứng viên thiếu thông tin có thể làm flow của cả tập kết quả khó tiếp tục. [FE4], [BE3].

**Đề xuất:** tách rõ từng phòng: “đã đáp ứng phần kiểm chứng được”, “còn thiếu phí”, “vượt điều kiện”. Cho xem kết quả và tiếp tục khám phá; chỉ gắn nhãn đáp ứng ngân sách tổng khi đủ dữ liệu. Không tự bỏ điều kiện cứng, không dùng zero thay unknown. Mỗi khoản thiếu dẫn tới một câu hỏi hoặc hành động cụ thể.

### 1.5. Hội thoại chưa nối tới thao tác hoàn chỉnh

So sánh, draft, lịch xem phòng, tin nhắn, cart và orders có các service/UI riêng. Chatbot chưa điều phối các hợp đồng đó trong một flow; nhận diện tìm phòng hiện dựa vào từ khóa và state tiêu chí, không phải bộ điều phối công việc tổng quát. `NeedsConfirmation`, `Clarifications`, `CompareRequested` đã được khai báo trong DTO nhưng chưa thấy đường xử lý điền các trường này trong audit. [BE2], [BE4].

**Đề xuất:** mở rộng bằng các tác vụ có giới hạn: đọc dữ liệu, so sánh, chuẩn bị câu hỏi, điền nháp lịch hoặc giỏ. Không cần một agent được tự do gọi mọi API.

### 1.6. Có thể đang quảng bá khả năng chưa bật hoặc chưa liền mạch

Commute frontend chỉ bật khi `VITE_AI_COMMUTE === 'true'`; `.env.example` đặt false. Các bề mặt chưa thống nhất: shortlist/compare frontend có đi bộ, ô tô và phương tiện công cộng; `RentalDecisionPanel` và backend decision adapter chỉ đi bộ/ô tô. Chưa có mode xe máy trong các flow này. Không xác minh flag production trong lần này. [FE5].

**Đề xuất:** nội dung gợi ý phải sinh từ capability đang hoạt động. Khi thiếu Routes, vẫn tìm theo điều kiện còn lại với nhãn chưa kiểm chứng thời gian; không hứa “20 phút xe máy”.

### 1.7. Lỗi làm người dùng mất công nhập

Flow chat hiện xóa bản nhập trước request; khi lỗi loại optimistic message và hiện thông báo. Request AI có timeout 40 giây và input bị khóa khi bận. Chưa thấy khôi phục bản nhập hoặc nút retry/cancel tương ứng trong flow đã đọc. [FE6].

**Đề xuất:** giữ câu hỏi, cho dừng/thử lại, trả phần dữ liệu đã lấy được trước. Fallback sang tìm kiếm/bộ lọc/câu trả lời theo mẫu thay cho spinner dài hoặc buộc viết lại.

### 1.8. Cá nhân hóa đã có, tài liệu và mặc định đang lệch nhau

Search interests, follow, ranking và daily digest đã có code; không cần đề xuất xây mới từ đầu. Tuy nhiên source hiện tại áp dụng mặc định `Enabled=true`, `AiEnabled=true` một lần, kể cả tài khoản có trước; email có lựa chọn riêng. Tài liệu cũ mô tả mặc định opt-in nên không còn phản ánh đủ source này. [FE7], [BE5].

**Đề xuất:** kiểm tra và thống nhất chủ đích sản phẩm, UI giải thích/điều khiển và tài liệu. Người dùng cần thấy vì sao có gợi ý, sửa tiêu chí, tạm dừng, xóa và báo đã tìm được phòng. Không đồng nhất “lưu nhu cầu trong Homeji” với “gửi nội dung sang provider”.

### 1.9. Kho tin nhìn thấy và kho tin AI truy vấn là hai nguồn khác nhau

AI search đọc Rental Posts đang public/active, bỏ synthetic; catalog tin nguồn ngoài có repository/API riêng. Nếu phần lớn lựa chọn người dùng thấy là catalog ngoài thì AI có thể trả ít hơn kỳ vọng. Chưa đọc live counts nên chưa kết luận đây là nguyên nhân thực tế. [BE6].

**Đề xuất:** đo số ứng viên hợp lệ theo từng nguồn và giải thích phạm vi tìm. Có thể thêm lựa chọn “xem thêm nguồn ngoài” riêng, với provenance/độ mới và đường liên hệ đúng nguồn; không trộn tin nguồn ngoài thành phòng Homeji đã xác minh hoặc nhận lịch được.

### 1.10. Có thao tác chờ model nhưng giá trị chủ yếu là template

Draft đăng tin hiện cho provider chọn thứ tự và biến thể câu trong catalog server; model không được tự biên tập văn phong. Giới hạn này kiểm soát hallucination tốt, nhưng phần chênh lệch người dùng nhận được có thể nhỏ so với thời gian chờ. Parser cũng gọi provider trước các thao tác chỉnh tiêu chí xác định. Chưa đo latency thực tế trong lần này. [BE7].

**Đề xuất:** template/explicit button/chip edit có thể phản hồi ngay bằng code. Dùng model cho thu thập thông tin từ ghi chú, nhận ra thiếu/mâu thuẫn hoặc viết lại dựa trên facts có kiểm chứng, với preview và kiểm tra fact; đo lợi ích trước khi mở rộng phạm vi sinh nội dung. Không nên thay catalog bảo thủ bằng một prompt tự do thiếu kiểm soát.

## 2. Nghiên cứu ngoài dự án: điều đáng học

**Zillow:** bài AI mode cập nhật 09/10/2026 mô tả một flow nối listing thật, khả năng chi trả, so sánh và bước xem nhà. Bài học là nối các công cụ ra quyết định vào cùng hành trình. Đây là mô tả từ nhà cung cấp, không chứng minh Homeji sẽ tăng chuyển đổi hoặc có cùng độ phủ. [Zillow AI mode](https://www.zillow.com/news/zillow-ai-mode-will-change-how-renters-decide-not-just-how-they-search/).

**Microsoft Research:** hướng dẫn tương tác người–AI nhấn mạnh khả năng rõ ràng, thông tin đúng ngữ cảnh, dễ sửa và kiểm soát. Áp dụng cho Homeji là nút có tên việc cụ thể, sửa chip ngay tại chỗ và ngừng hỗ trợ dễ dàng. [Human-AI Interaction](https://www.microsoft.com/en-us/research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/).

**Google PAIR:** bắt đầu từ nhu cầu và tiêu chí thành công, cân bằng tự động hóa với hỗ trợ con người. Áp dụng: đo thời gian tìm được lựa chọn và hoàn tất tác vụ; dùng preview/edit cho nội dung có hệ quả. [User Needs](https://pair.withgoogle.com/chapter/user-needs/), [Feedback + Control](https://pair.withgoogle.com/guidebook-v2/chapter/feedback-controls/).

Các đề xuất bên dưới là suy luận cho Homeji từ source và audit, không phải tính năng của tất cả sản phẩm tham chiếu. Chi tiết nguồn API, sản phẩm và giới hạn nằm trong [ghi chú nguồn chính thức](./ai-user-experience-primary-sources-2026-10-21.md).

## 3. Ba mươi cơ hội trên toàn trải nghiệm

Mức ưu tiên mang tính định tính theo mức giảm công sức, khả năng tái sử dụng và phụ thuộc dữ liệu; chưa có số liệu để chấm RICE hoặc ước lượng ROI. **P0** là nền và giá trị trực tiếp; **P1** nối nghiệp vụ tiếp theo; **P2** chỉ làm khi nền hoạt động tốt. “Có nền” nói về source local, không có nghĩa đã chạy đúng trên production.

### Dùng chung

1. **P0 — Trợ lý biết ngữ cảnh.** Ở detail hiểu phòng đang xem; ở cart hiểu giỏ đang mở; ở lịch hiểu lịch được chọn. Tận dụng global chat, thêm context DTO có schema/version và bộ resolver theo quyền. Chỉ gửi trường cần thiết sang model, không tự đọc toàn bộ inbox.
2. **P0 — Phục hồi sau lỗi.** Giữ câu hỏi/bản nháp, dừng, thử lại, mở công cụ thường và chỉ rõ phần chưa tải được. Dùng request cancellation hiện có; thêm UI recovery và phân biệt lỗi provider/tool. Đây chủ yếu là UX và điều phối, không cần model mới.
3. **P0 — Gợi ý theo công việc.** Thay nhãn chung bằng “Tính tiền tháng”, “Hỏi chủ phòng”, “So sánh”, “Kiểm tra giỏ”. Hiện tối đa vài gợi ý liên quan khi người dùng mở phần hỗ trợ; không bật popup liên tục hay che CTA. Tận dụng action whitelist, bổ sung capability catalog phản ánh flag/quyền thật.
4. **P0 — Nhớ nhu cầu và kịch bản có kiểm soát.** Một state cho budget, số người, shortlist và điểm đến; phân biệt state chỉ trong phiên với dữ liệu lưu lâu dài. Có sửa, bỏ ngữ cảnh, reset và tạm dừng. Tận dụng PreviousCriteria/SearchInterest, bổ sung handoff giữa các bề mặt và chính sách dữ liệu rõ.

### Tìm và chọn phòng

5. **P0 — Tìm trực tiếp bằng nhu cầu.** “Hai người, có bếp, dưới 4 triệu tiền thuê”; cập nhật kết quả/chip cùng màn. Giữ bộ lọc thường; chỉ hỏi khi thiếu thứ làm đổi đáp án. Có nền parser/retrieval/reason evidence; cần hợp nhất entry point và thử nghiệm public preview có giới hạn.
6. **P0 — Một shortlist và một màn so sánh.** Thêm phòng từ bất kỳ card/detail, so sánh phần khác nhau, thể hiện lợi/hại theo ưu tiên đã chọn. Có compare APIs/components; cần bỏ trùng UI và chia sẻ state/kịch bản.
7. **P0 — Ngân sách thật nhưng không khóa khám phá.** Hiện tiền đã biết, phí còn thiếu, cọc/khoản ban đầu riêng; cho thử kịch bản lượng dùng do người dùng chọn. Tái sử dụng calculator; bổ sung đơn vị phí và provenance bền vững. Ước tính chưa đủ không được xếp là đáp ứng trần tổng.
8. **P0 — Từ thiếu thông tin thành câu hỏi cho chủ tin.** Sinh nháp ngắn: còn trống không, điện/nước tính thế nào, cọc bao nhiêu, có điều kiện nào chưa rõ. Một lần review để mở đúng người nhận; gửi qua UI nhắn tin hiện có. Chủ tin có thể trả lời dạng trường có cấu trúc; ghi nguồn và ngày xác nhận, không tự đổi thành “Homeji xác minh”.
9. **P1 — Chuẩn bị lịch xem phòng.** Đề xuất vài khung giờ từ thông tin người dùng cung cấp và lịch được phép đọc; điền nháp đúng phòng, chỉ rõ đang gửi yêu cầu hay đã được chủ chấp nhận. Có viewing appointments; thêm handoff/context và kiểm tra xung đột server. Ghép chuyến xem nhiều phòng chỉ sau khi có tuyến thật.
10. **P1 — Giải thích không có kết quả.** Server thử kiểm tra từng ràng buộc trên cùng tập tin được phép đọc, nói điều kiện nào làm tập kết quả giảm; đề nghị một thay đổi có số liệu thật. Người dùng chọn mới nới. Không đoán “do giá thấp” và không âm thầm bỏ hard constraint.
11. **P1 — So sánh đường đi đúng phương tiện.** Chọn cơ sở trường, giờ đi, mode hỗ trợ; chỉ tính tuyến shortlist. Các bề mặt đã có nền Routes nhưng cần thống nhất khả năng frontend/backend, kiểm chứng coverage, chi phí, vị trí gần đúng và failure theo tuyến. Xe máy là khả năng mới cần adapter/kiểm chứng, không đổi tên ô tô thành xe máy.
12. **P1 — Gợi ý và theo dõi có phản hồi.** Dùng SearchInterest đã có, thêm lý do “vì bạn chọn…”, “không phù hợp vì…”, tắt khi đã thuê được, không báo trùng. Phản hồi làm đổi tiêu chí hoặc ranking với tác dụng rõ ràng; không hứa model học ngay nếu chưa có cơ chế.
13. **P1 — Sống quanh phòng đã chọn.** Quán ăn, cửa hàng, nhà thuốc, tuyến tới trường theo ghim phòng. Có Nearby/Places; thêm handoff nhu cầu. Dữ liệu Google phải giữ nguồn/attribution; địa điểm Google không đồng nghĩa có thể đặt món qua Homeji. Không khẳng định khu yên tĩnh/an toàn nếu thiếu bằng chứng.

### Chủ trọ, người đăng tin và pass phòng

14. **P0 — Kiểm tra độ đầy đủ khi đăng tin.** Nêu thiếu đơn vị phí, ngày vào ở, số chỗ, quy định, ảnh cần bổ sung; hỏi ngắn để điền đúng trường. Có form validation và draft title/description; cần mở rộng fact collection/preview. Chưa dùng ảnh để tự khẳng định diện tích, tiện ích hay quyền pass.
15. **P1 — FAQ từ dữ liệu chủ tin xác nhận.** Các câu hỏi về cọc, phí, giờ giấc được trả từ fact sheet có version; chưa biết thì tạo yêu cầu hỏi chủ. Dữ liệu chuẩn này vừa giảm hỏi lặp vừa giúp search/cost. Đây là bổ sung data workflow, giá trị bền hơn chỉ viết mô tả hấp dẫn.
16. **P1 — Soạn phản hồi và tóm tắt việc cần trả lời.** Chủ tin chọn hội thoại cụ thể, xem nháp theo dữ liệu phòng và chỉnh trước khi gửi. Không tự đọc toàn bộ inbox hoặc chấm chất lượng con người. Nền là chat/appointments; AI summary inbox là khả năng mới cần quyền/consent/provider phù hợp.
17. **P1 — Danh sách việc theo trạng thái.** Tin lâu chưa xác nhận trống, câu hỏi chưa trả, lịch chờ phản hồi, đơn cần xử lý; mỗi việc có nút mở đúng đối tượng. Tận dụng dữ liệu trạng thái/notifications/alerts; phần lớn có thể dùng rules thay LLM.
18. **P2 — Gợi ý cải thiện tin dựa trên dữ liệu đủ tốt.** Nêu field/ảnh thiếu hoặc FAQ lặp; so sánh giá chỉ khi có mẫu tương đồng, thời điểm và độ phủ đủ rõ. Không kết luận giá thị trường hay cam kết cho thuê nhanh từ ít tin/lượt xem.

### Ở ghép

19. **P1 — Đối chiếu nhu cầu sinh hoạt tự khai.** Contract discovery đã có trường/khu vực/budget, giờ ngủ, hút thuốc, thú cưng và điểm tương đồng; cần giải thích điểm hợp/khác và cho sửa nhu cầu, không làm lại toàn bộ matching. Mở rộng dọn dẹp/khách tới nếu người dùng tự chọn chia sẻ. Không chấm “hợp tính cách 97%”, không suy từ ảnh, tên hoặc tin nhắn riêng. Giữ consent discoverability, Roommate Invitation/Match và double opt-in hiện có. [FE8].
20. **P1 — Chuẩn bị thỏa thuận và chia chi phí.** Checklist câu hỏi, tỷ lệ tiền thuê/phí, lịch dọn và xử lý cọc; phép tính theo rule với dữ liệu được cả hai xác nhận. Đây là công cụ hỗ trợ trao đổi, không tự ký hay tự tạo nghĩa vụ. Cần module checklist/kịch bản dùng chung, không cần agent tự đàm phán.
21. **P2 — Nháp giới thiệu dễ bắt đầu.** Dùng thông tin người dùng chọn để soạn lời giới thiệu hoặc lời mời; preview rồi gửi bằng flow hiện có. Không tự gửi hàng loạt hoặc lộ contact trước khi được phép.

### Đồ ăn, chợ đồ và người bán

22. **P1 — Tìm món/đồ theo ngân sách và nhu cầu.** Ví dụ “hai người ăn tối, tối đa 70k” → truy vấn inventory Homeji, so giá/khẩu phần khi người bán có ghi. Dùng ngôn ngữ tự nhiên cho query chứ không bịa giá/khẩu phần. Nếu thiếu thành phần thì hướng hỏi người bán, không bảo đảm an toàn dị ứng.
23. **P1 — Chuẩn bị giỏ nháp theo người bán.** Đề xuất item/quantity đúng tồn kho, gom theo seller ID, giải thích vì sao chọn. Giỏ hiện chỉ hỗ trợ món cùng một bếp; đổi bếp cần xử lý thay giỏ hiện có. Giữ contract đó và review giá/phí mới nhất trước đặt; đặt nhiều bếp là phạm vi mới. Chatbot hiện cấm thêm món/tạo đơn, nên đây là mở rộng whitelist/contract có chủ đích, không lách prompt cũ. [BE8].
24. **P2 — So sánh đồ cũ và checklist kiểm tra.** Tóm tắt tình trạng từ tin, khoản chưa rõ, phụ kiện và câu hỏi khi nhận. Có marketplace listing; cần structured condition fields và nháp câu hỏi. Không chứng nhận đồ thật/hoạt động chỉ dựa trên ảnh.
25. **P1 — Trợ lý xử lý đơn bán.** Nêu đơn đang chờ, thời điểm và bước hợp lệ kế tiếp, soạn thông báo theo mẫu. Tận dụng seller alerts/order states đã có; không làm lại một hệ thống nhắc riêng và không tự nhận/hủy/giao đơn từ câu trả lời model.

### Hỗ trợ, thanh toán và sau khi dùng

26. **P0 — Giải thích trạng thái đơn/tiền từ backend.** “Đơn này đang ở đâu?”, “tiền của tôi đã về chưa?” → đọc đối tượng thuộc tài khoản, nói trạng thái và bước phù hợp. Dùng API trạng thái, số học/template; model chỉ diễn đạt khi cần. Không coi URL trả về, lời người dùng hoặc timer frontend là bằng chứng đã thanh toán.
27. **P1 — Hướng dẫn ngay tại form đang gặp khó.** Ví dụ field upload, địa chỉ, xác minh: dùng mã lỗi và capability catalog để giải thích, focus đúng field hoặc mở màn cần sửa; không chỉ trả hướng dẫn chung. Nền error handling/navigation có sẵn; thêm error taxonomy và context tối thiểu, không gửi token/log thô.
28. **P1 — Chuẩn bị yêu cầu hỗ trợ và ưu tiên việc admin.** Người dùng review bản tóm tắt sự cố, các bước đã thử và ID cần thiết trước gửi; admin mở đúng hàng cần xử lý và thấy số liệu thật. Có admin summary/reports; workflow escalation cần xác minh/chốt đầu nhận. Không mặc định có đội hỗ trợ trực 24/7.
29. **P2 — Checklist chuyển vào ở theo lựa chọn.** Ghi điện/nước lúc bàn giao, kiểm đồ, lưu khoản đã thống nhất; user tự chọn lưu/nhắc theo khả năng sản phẩm. Đây là mở rộng module sau giao dịch, chưa thấy đủ nền để ưu tiên trước tìm phòng. Không tạo lịch nhắc thật trong nghiên cứu này.
30. **P2 — Nhập liệu bằng ảnh, giọng nói hoặc tài liệu.** Trích ghi chú/đơn giá từ ảnh do người dùng chọn, đọc lại và xác nhận trước điền form. Cần pipeline upload/OCR/speech, giới hạn dữ liệu và kiểm chứng tiếng Việt; không mặc định đưa hợp đồng/chứng từ riêng tư vào provider. Hỗ trợ tài liệu là trích xuất/đánh dấu câu hỏi, không kết luận pháp lý.

## 4. Một trải nghiệm thống nhất nên hoạt động thế nào

### Người tìm phòng

1. Nhập nhu cầu ở ô tìm kiếm hiện tại. Hệ thống hiện chip; nếu “FPT” mơ hồ thì hỏi đúng cơ sở.
2. Hiện tin phù hợp dữ liệu đã có và nhóm cần làm rõ. Người dùng xem được kết quả dù phí chưa đủ; nhãn không khẳng định đã đáp ứng trần tổng.
3. Chọn hai tin vào khay. Một màn so sánh dùng cùng số người và kịch bản; lý do nào cũng link về field/nguồn.
4. Nhấn “Hỏi những khoản còn thiếu”. Hệ thống soạn nháp theo từng tin; người dùng xem người nhận và bấm gửi.
5. Khi có dữ liệu phí mới được xác nhận, invalidate snapshot/kịch bản liên quan và tính lại. Không dùng phí của phòng A cho B.
6. Chuẩn bị yêu cầu xem phòng; hiển thị rõ trạng thái chờ/chấp nhận. Có thể lưu nhu cầu để tiếp tục sau nếu người dùng chọn.

### Chủ tin

1. Form hướng dẫn bổ sung fact sheet ngay khi thiếu dữ liệu quan trọng; draft văn phong là bước sau.
2. Những thông tin chủ tin xác nhận trở thành nguồn cho search/cost/FAQ theo version, với trạng thái và ngày xác nhận.
3. Dashboard gom lịch/câu hỏi/đơn cần xử lý; trợ lý mở đúng việc, chuẩn bị phản hồi và để chủ tin duyệt.

### Ở ghép và thương mại

Giữ đúng ranh giới nghiệp vụ: lời mời ở ghép không đồng nghĩa Match; món Google Nearby không phải inventory Homeji; cart draft không phải Marketplace Order; chấp nhận lịch không tự phát sinh thanh toán. Người dùng có thể đi tiếp từ gợi ý bằng một hành động rõ ràng.

## 5. Kiến trúc tối thiểu, tận dụng dự án hiện tại

Không cần đổi provider, thêm microservice AI, vector database hoặc framework multi-agent trước khi giải quyết các chỗ đứt đoạn đã thấy.

**Frontend:** một context/state dùng chung ở tầng app; các bề mặt đăng ký loại trang và ID đối tượng hiện tại. Dùng lại SearchContext, shortlist/compare, calculator, chat và existing forms; thay các state trùng dần theo từng lát. Ngữ cảnh có thể xem/bỏ; logout/đổi tài khoản xóa state riêng tư và hủy request cũ.

**Application:** điều phối intent → resolve context → gọi service chuyên môn → trả fact/evidence + action hợp lệ. Intent đã rõ bằng button có thể gọi service trực tiếp; không gọi LLM chỉ để quyết định nút “Tính chi phí” nghĩa là gì. Có thể bắt đầu rule-based orchestration với parser hiện tại; chỉ thêm function calling khi đa bước làm nó có lợi rõ. Gemini hỗ trợ structured outputs và function calling nhưng server vẫn phải kiểm tra nội dung/quyền. [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [Function calling](https://ai.google.dev/gemini-api/docs/function-calling).

**Infrastructure:** giữ Gemini/Maps/Routes adapters; kiểm tra quota, data-use tier và capability bằng cấu hình thật trước rollout. Không gửi nguyên DTO nội bộ hoặc dữ liệu chat riêng mặc định. Google có điều kiện riêng về dữ liệu paid/unpaid và đối tượng sử dụng; đối chiếu tài khoản/dòng sản phẩm thật trước mở rộng sang tài liệu/inbox. [Gemini terms](https://ai.google.dev/gemini-api/terms).

**Hợp đồng mới nên nhỏ và tường minh:**

- `AssistantContext`: version, surface, selectedEntityIds, activeCriteria, scenarioReference, locale. Client không đặt role, trạng thái trả tiền hay quyền xem.
- `AssistantResult`: nội dung hoặc template, facts/evidence, phần thiếu, tối đa một clarification quan trọng, actions và trạng thái từng tool.
- `ActionDraft`: actionKind, entityIds, dữ liệu nháp, version của nguồn và mô tả hệ quả. Server lưu/kiểm tra snapshot nếu action có side effect.

Action đọc như so sánh có thể chạy ngay khi người dùng yêu cầu. Action ghi như gửi tin, gửi lịch, đặt hàng cần preview/hành động xác nhận cụ thể; đọc lại version/giá/tồn kho/quyền ngay trước thực hiện. Retry sử dụng cơ chế idempotency của nghiệp vụ khi cần. Model không nhận API key, tự sinh SQL, chọn URL tùy ý hoặc bypass domain service. Nội dung tin/review/ảnh là dữ liệu không tin cậy; chỉ prompt dặn “không bịa” chưa đủ.

**Dữ liệu cần bổ sung trước các lời hứa mạnh:** đơn vị giá/điện/nước/internet; unknown khác zero; nguồn và ngày chủ tin xác nhận; tình trạng còn trống thực sự; fact sheet/khẩu phần/thành phần/tình trạng hàng khi có. Migration additive, nullable khi chưa biết; không backfill xác nhận giả cho dữ liệu cũ.

**Tương thích:** giữ action/navigation cũ, thêm DTO field optional có version/capability; FE cũ vẫn dùng được. Đưa context/action mới sau feature flag; rollout FE/BE cùng hợp đồng. Mỗi task có auth/rate limit theo nghiệp vụ, fallback và giới hạn fan-out/provider; không thêm token streaming nếu chưa cải thiện thời gian tới kết quả.

## 6. Thứ tự triển khai nên chọn

### Đợt 1 — Chứng minh giá trị trong công việc hiện có

Nối ngữ cảnh detail và shortlist, hợp nhất so sánh/kịch bản, cho kết quả từng phần có nhãn, soạn câu hỏi khoản thiếu, giữ bản nhập khi lỗi. Đồng thời chuẩn hóa đơn vị phí trong form chủ tin và giải thích trạng thái đơn bằng dữ liệu thật. Đây là nền dùng lại cho tất cả vai trò; chưa mở quyền chatbot tự giao dịch.

**Lát đầu tiên tôi chọn:** đang xem một phòng → “Tính tiền tháng” → thấy tiền đã biết/khoản thiếu → “Soạn câu hỏi cho chủ tin” → người dùng review và chuyển vào flow tin nhắn hiện có. Sau đó cùng kịch bản đi vào compare. Lát này có đầu vào/đầu ra rõ, tái dùng phần lớn source và xử lý trực tiếp nhu cầu ra quyết định.

### Đợt 2 — Nối tìm kiếm tới hành động và trở lại

Tìm nhu cầu ngay ô chính, follow có phản hồi, lịch xem dạng nháp, FAQ chủ tin, việc cần xử lý, ở ghép dựa trên nhu cầu tự khai, tìm món và giỏ nháp. Bật từng flow sau kiểm tra quyền, dữ liệu và capability thực tế; commute cần QA Routes riêng.

### Đợt 3 — Mở rộng khi có bằng chứng sử dụng

Tối ưu lộ trình nhiều lịch, phân tích tin đủ dữ liệu, OCR/voice, hỗ trợ tài liệu và checklist chuyển vào ở. Chỉ cân nhắc semantic/vector retrieval nếu tập truy vấn thực tế cho thấy keyword/structured filters bỏ sót và benchmark cải thiện mà giữ đúng constraints. Không có căn cứ trong lần này để ước lượng thời gian/chi phí chính xác của ba đợt.

## 7. Làm sao biết AI đã giúp được người dùng

Đo theo tác vụ, so với baseline UI hiện tại; không dùng số lượt chat hay số token làm mục tiêu thành công.

- **Tìm/chọn phòng:** thời gian tới shortlist hữu ích, tỷ lệ tìm không ra, số lần sửa tiêu chí, mở chi tiết/lưu/hỏi chủ tin, tỷ lệ có lịch xem. “Có lịch” khác “đã thuê thành công”; kết quả thuê cần cơ chế xác nhận riêng.
- **Chủ tin:** thời gian hoàn tất form, tỷ lệ đủ đơn vị phí, câu hỏi lặp, thời gian phản hồi và tỷ lệ lịch được xử lý. Không suy doanh thu từ view.
- **Ở ghép:** lời mời được chấp nhận và cuộc trao đổi tiếp theo; không suy chất lượng sống chung từ click.
- **Thương mại/hỗ trợ:** tỷ lệ chuyển từ draft sang xác nhận thật, đơn trùng, lỗi trạng thái, thời gian hoàn tất công việc và số lần phải hỏi lại. Giảm task time không được đổi bằng tăng nhầm đơn/gửi nhầm.
- **Chất lượng hệ thống:** thời gian tới dữ liệu dùng được, p95 theo task; phần lỗi Gemini/Maps/DB tách biệt; grounded-field errors, action sai context, stale response và chi phí mỗi tác vụ hoàn tất. Cold start đo riêng.

Thiết kế sự kiện tối thiểu: `assistant_task_started`, `assistant_result_shown`, `assistant_clarification_answered`, `assistant_suggestion_accepted`, `assistant_suggestion_corrected`, `assistant_task_completed`, `assistant_task_failed`. Chỉ dùng loại task/surface/status/code và thời gian đã bucket khi phù hợp; không đưa raw prompt, search text, tin nhắn, private address, contact hoặc payment detail vào GA4. Phân biệt consent analytics, lưu preference và gửi provider. Dữ liệu debug/trace phải giảm thiểu, phân quyền và có retention riêng.

Pilot đề xuất: quan sát khoảng 8–12 người đại diện các vai trò làm tác vụ thực tế trên staging, gồm người mới và người dùng thường; quy mô này tìm lỗi định tính, không đủ chứng minh uplift thống kê. Sau khi flow ổn, so sánh baseline/variant trên mẫu và thời gian phù hợp. Chưa có baseline nên không đặt lời hứa “tăng 30%”.

Kiểm chứng trước rollout: hội thoại nhiều lượt đổi nhu cầu; “cái này” ở đúng/sai context; unknown/zero/giá theo người; đổi tài khoản; tin/giá/tồn kho thay đổi; Maps/provider lỗi; request trả chậm; quyền owner/non-owner/admin; prompt injection trong tin; retry không tạo side effect trùng; bàn phím/mobile và người dùng từ chối AI. Các bài kiểm tra này là kế hoạch triển khai, chưa chạy trong nghiên cứu.

## 8. Bằng chứng mã nguồn và giới hạn

Các line dưới đây là tại source audit 21/10/2026; line có thể dịch khi checkout đổi.

- **[FE1]** [App.tsx](C:/EXE101_Homeji/src/App.tsx:91), [ChatbotContext.tsx](C:/EXE101_Homeji/src/contexts/ChatbotContext.tsx:18), [sendChatbotMessage](C:/EXE101_Homeji/src/api/index.ts:357), [chatbot surface](C:/EXE101_Homeji/src/contexts/chatbot-surface.ts:11), [MapChatbot actions](C:/EXE101_Homeji/src/components/map/MapChatbot.tsx:552).
- **[FE2]** [NaturalRentalSearch](C:/EXE101_Homeji/src/components/ai/NaturalRentalSearch.tsx:52), [trigger/panel](C:/EXE101_Homeji/src/components/ai/NaturalRentalSearch.tsx:66), [ContextualSearch](C:/EXE101_Homeji/src/components/shell/ContextualSearch.tsx:216).
- **[FE3]** [SavedPostsPage](C:/EXE101_Homeji/src/pages/SavedPostsPage.tsx:126), [RentalComparison calculator](C:/EXE101_Homeji/src/components/ai/RentalComparison.tsx:122), [RentalDecisionPanel fields](C:/EXE101_Homeji/src/components/ai/RentalDecisionPanel.tsx:69).
- **[FE4]** [AiSearchReview](C:/EXE101_Homeji/src/components/ai/AiSearchReview.tsx:24), [apply gate](C:/EXE101_Homeji/src/components/ai/AiSearchReview.tsx:40), [cost confirmation](C:/EXE101_Homeji/src/components/ai/AiSearchReview.tsx:71).
- **[FE5]** [aiFeatureFlags](C:/EXE101_Homeji/src/lib/aiFeatureFlags.ts:9), [.env.example](C:/EXE101_Homeji/.env.example:45), [decision panel modes](C:/EXE101_Homeji/src/components/ai/RentalDecisionPanel.tsx:87), [shortlist modes](C:/EXE101_Homeji/src/components/ai/ShortlistCommutePlanner.tsx:10), [compare modes](C:/EXE101_Homeji/src/components/ai/RentalComparison.tsx:18).
- **[FE6]** [MapChatbot send](C:/EXE101_Homeji/src/components/map/MapChatbot.tsx:495), [error](C:/EXE101_Homeji/src/components/map/MapChatbot.tsx:533), [client timeout](C:/EXE101_Homeji/src/api/client.ts:25).
- **[FE7]** [SearchInterestCenter](C:/EXE101_Homeji/src/components/ai/SearchInterestCenter.tsx:24), [ranking](C:/EXE101_Homeji/src/components/ai/SearchInterestCenter.tsx:79), [controls](C:/EXE101_Homeji/src/components/ai/SearchInterestCenter.tsx:142).
- **[FE8]** [Roommate discovery contract](C:/EXE101_Homeji/src/api/roommateDiscovery.ts:13), [RoommatePeople](C:/EXE101_Homeji/src/components/roommates/RoommatePeople.tsx:114), [FoodMarketplaceView](C:/EXE101_Homeji/src/components/marketplace/food/FoodMarketplaceView.tsx:105), [SellerOrderAlerts](C:/EXE101_Homeji/src/components/marketplace/SellerOrderAlerts.tsx:63).
- **[BE1]** [SendChatbotMessageDto](C:/Homeji/src/Homeji.Application/DTOs/Chatbot/SendChatbotMessageDto.cs:5).
- **[BE2]** [ChatbotService](C:/Homeji/src/Homeji.Application/Services/Chatbot/ChatbotService.cs:115), [NavigationCatalog](C:/Homeji/src/Homeji.Application/Services/Chatbot/ChatbotNavigationCatalog.cs:10).
- **[BE3]** [AiSearchService normalization](C:/Homeji/src/Homeji.Application/Services/AI/AiSearchService.cs:266), [grounded reply](C:/Homeji/src/Homeji.Application/Services/Chatbot/ChatbotService.cs:204), [decision commute modes](C:/Homeji/src/Homeji.Application/Services/AI/RentalDecisionService.cs:39).
- **[BE4]** [AiHighlightResponseDto](C:/Homeji/src/Homeji.Application/DTOs/AI/AiHighlightResponseDto.cs:11), [RentalSearchIntent](C:/Homeji/src/Homeji.Application/Services/AI/RentalSearchIntent.cs:176), [RentalAssistantController](C:/Homeji/src/Homeji.Api/Controllers/RentalAssistantController.cs:14), [ViewingAppointmentsController](C:/Homeji/src/Homeji.Api/Controllers/ViewingAppointmentsController.cs:1), [MarketplaceOrdersController](C:/Homeji/src/Homeji.Api/Controllers/MarketplaceOrdersController.cs:9), [RoommateInvitationsController](C:/Homeji/src/Homeji.Api/Controllers/RoommateInvitationsController.cs:9).
- **[BE5]** [SearchInterestService defaults](C:/Homeji/src/Homeji.Infrastructure/External/SearchInterestService.cs:60), [controls/pruning](C:/Homeji/src/Homeji.Infrastructure/External/SearchInterestService.cs:74), [RentalPost monetary fields](C:/Homeji/src/Homeji.Domain/Entities/RentalPost.cs:55).
- **[BE6]** [AI retrieval](C:/Homeji/src/Homeji.Application/Services/AI/AiSearchService.cs:118), [catalog nguồn ngoài](C:/Homeji/src/Homeji.Api/Controllers/RentalSourceListingsController.cs:10).
- **[BE7]** [GroundedRentalDraftCatalog](C:/Homeji/src/Homeji.Application/Services/AI/GroundedRentalDraftCatalog.cs:28), [model-first parse](C:/Homeji/src/Homeji.Application/Services/AI/AiSearchService.cs:72).
- **[BE8]** [same-seller cart validation](C:/Homeji/src/Homeji.Application/Services/MarketplaceOrders/MarketplaceOrderService.cs:185), [đổi bếp trong giỏ](C:/EXE101_Homeji/src/pages/MarketplacePage.tsx:961).

Tài liệu nghiên cứu cũ ngày 03/10 ở backend nói chatbot trả lời trước retrieval; source hiện tại đã retrieval-first nên không dùng kết luận đó làm hiện trạng. Tương tự, số tin/benchmark/production trong tài liệu cũ không được tái sử dụng làm số liệu hiện tại. Báo cáo này hoàn thành phần audit và thiết kế đề xuất; chưa triển khai ba mươi hạng mục, chưa chạy E2E/provider thật và chưa chứng minh lợi ích với người dùng thật.
