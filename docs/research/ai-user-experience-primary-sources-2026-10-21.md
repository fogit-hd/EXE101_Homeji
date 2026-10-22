# AI giúp hoàn thành việc trên Homeji: nghiên cứu nguồn gốc

> Rà soát ngày 21/10/2026, múi giờ Việt Nam. Nguồn gồm 12 tài liệu chính thức được mở và đọc trong lần nghiên cứu này. Phạm vi: người thuê, chủ nhà, ở ghép, đồ ăn, chợ đồ cũ, hỗ trợ và vận hành.
>
> Đây là nghiên cứu sản phẩm và đề xuất thiết kế, không phải kết quả thử nghiệm người dùng Homeji, kiểm chứng production, hoặc xác nhận mã nguồn hiện tại. Những đề xuất ghi “áp dụng” là suy luận của người viết. Nghiên cứu ngày 02/10 trong `ai-location-intelligence-product-patterns.md` đã đề cập natural-language search, map/POI và action có kiểm soát; tài liệu này đi xa hơn ở sự liên tục của công việc, ngữ cảnh và kết quả cuối cùng.

## Kết luận

Không nên lấy “càng nhiều AI càng tốt” làm tiêu chí. Nên lấy **ít thao tác hơn để hoàn thành đúng việc, thấy rõ dữ liệu và giữ được quyền quyết định** làm tiêu chí. Thêm bot vào mỗi màn hình có thể làm trải nghiệm rối hơn nếu người dùng vẫn phải tự mang thông tin từ màn hình này sang màn hình khác.

Hướng phù hợp cho Homeji là một lớp trợ giúp dùng chung, xuất hiện ngay tại đối tượng đang xem: phòng, danh sách đã lưu, người ở ghép, hội thoại, món ăn, đơn hàng hoặc bản nháp tin đăng. Lớp này tiếp nhận mục tiêu, lấy dữ liệu được phép đọc, đề xuất kết quả có bằng chứng và chuẩn bị bước tiếp theo. Kết quả không kết thúc ở đoạn văn: phải thành shortlist, thông tin so sánh, bản nháp có thể chỉnh, trạng thái bộ lọc hoặc biểu mẫu điền sẵn.

Đây là định hướng rút ra từ nghiên cứu, chưa chứng minh sẽ tăng chuyển đổi tại Homeji. PAIR của Google khuyên bắt đầu từ nhu cầu, quan sát quy trình hiện có và định nghĩa thành công theo lợi ích dài hạn, đồng thời phân biệt tác vụ nên tự động hóa với tác vụ cần hỗ trợ quyết định. [S4]

## 1. Các bằng chứng chính và điều có thể học

### Zillow: nối tìm kiếm với quyết định và bước tiếp theo

Zillow mô tả AI mode cho người thuê kết hợp listing hiện hành, công cụ khả năng chi trả và bước xem nhà trong một luồng; người dùng có thể hỏi chính sách vật nuôi và so sánh đánh đổi. Bài đăng ngày 25/03/2026, cập nhật 09/10/2026, mô tả việc tiếp tục mở rộng tính năng. Đây là thông tin sản phẩm của nhà cung cấp, không phải thử nghiệm độc lập hoặc bằng chứng doanh thu. [S1]

**Áp dụng cho Homeji:** một phiên tìm phòng nên giữ nguyên mục tiêu từ lúc tìm đến lúc liên hệ: ngân sách, nơi cần đến, ngày chuyển vào, ràng buộc bắt buộc, shortlist, điểm chưa biết. Khi người dùng hỏi “phòng này có hợp với tôi không?”, hệ thống cần so với mục tiêu đang có, thay vì bắt nhập lại hoặc chỉ mở trang tìm kiếm. Nếu tiện ích/chính sách thiếu trong dữ liệu thì trả “chưa được chủ nhà cung cấp”, kèm cách hỏi chủ nhà.

### Airbnb: AI nằm trong điều khiển quen thuộc

Bản cập nhật 30/09/2026 công bố tìm kiếm bằng lời nói/văn bản, tìm bộ lọc theo từ khóa, so sánh các căn trong wishlist và tóm tắt đặc điểm. AI planning bắt đầu ở Mỹ; công cụ chủ nhà như insight dashboard được mô tả triển khai sau trong mùa thu. Không được suy ra các tính năng này đã có ở Việt Nam hoặc mọi tài khoản. [S2]

**Áp dụng cho Homeji:** đặt trợ giúp ở đúng thao tác như “Tìm theo nhu cầu”, “So sánh 3 phòng đã lưu”, “Hỏi phí còn thiếu”, “Hoàn thiện tin”. Cho phép bắt đầu bằng câu tự nhiên nhưng vẫn hiện bộ lọc, thẻ phòng và biểu mẫu bình thường để người dùng chỉnh. Chỉ mở thông tin chi tiết khi cần, tránh buộc mọi người vào một cửa sổ chat nhiều bước.

### Google Maps: hội thoại vẫn cần kết quả không gian và hành động

Bài 12/03/2026 mô tả Ask Maps trả lời câu hỏi theo nhu cầu thực tế, trình bày lựa chọn trên bản đồ, và nối đến lưu/chia sẻ/đặt chỗ/chỉ đường. Phạm vi triển khai đầu tiên được nêu là Mỹ và Ấn Độ trên di động. Đây là pattern UX, không phải API mà Homeji tự động có quyền sử dụng, và không chứng minh availability tại Việt Nam. [S3]

**Áp dụng cho Homeji:** kết quả “ăn gì quanh phòng này với 40.000đ?” phải dùng vị trí phòng đang chọn và món/quán còn khả dụng. Tìm được địa điểm cần hiện pin/thẻ và nút thực hiện. “Gần trường” cần ghi rõ khoảng cách hay thời gian dự kiến; không tự biến khoảng cách thẳng thành ETA.

### PAIR: quyền sửa và lối thoát là thành phần chính của AI

PAIR khuyến nghị người dùng xem/sửa hoặc đặt lại sở thích; thay đổi từ feedback cần thể hiện tác dụng và thời điểm. Người dùng cũng cần đường làm thủ công và quyền tắt trợ giúp. Chương về lỗi yêu cầu xác định nguồn lỗi và cung cấp đường tiếp tục công việc. Đây là hướng dẫn thiết kế dựa trên nghiên cứu của Google, không bảo đảm mọi đề xuất sẽ hiệu quả trong Homeji. [S5, S6]

**Áp dụng cho Homeji:** sau câu “muốn rẻ hơn” có thể ưu tiên kết quả giá thấp hơn trong cùng trần đã xác nhận, giải thích thay đổi và cho hoàn tác; nếu cần đổi trần thì hỏi mức người dùng muốn. Khi không có kết quả, nêu đúng ràng buộc gây thiếu phòng và cho chọn nới một điều kiện. Khi dịch vụ model lỗi, giữ nội dung đã nhập và cho chạy lọc thông thường. Không để một lỗi AI xóa tiến trình đặt món/đăng tin/tìm phòng.

## 2. Ưu tiên theo việc người dùng thực sự cần hoàn thành

Các mục sau là đề xuất cần đối chiếu audit FE/BE và khả năng dữ liệu hiện có. Không mặc định chúng đều là tính năng mới; phần đã có nên được nối và làm dễ dùng trước khi viết lại.

### P0 — Hoàn thành ba công việc cốt lõi

1. **Từ nhu cầu đến shortlist có thể liên hệ.** Ví dụ: “Hai người, tổng chi phí tối đa 4,5 triệu/tháng, vào tháng sau, gần FPT, có chỗ để xe.” AI tách điều kiện bắt buộc và mong muốn, chỉ hỏi lại điểm thực sự làm thay đổi kết quả, rồi đưa 3–5 lựa chọn còn hiệu lực. Mỗi lựa chọn chỉ rõ khớp/chưa khớp/chưa biết. Bất kỳ nới điều kiện nào phải được hiển thị. Lưu shortlist và mục tiêu ngay trong luồng; chỉ yêu cầu đăng nhập khi hành động cần tài khoản, nếu chính sách hiện tại cho phép guest search.
2. **Từ phòng đã chọn đến quyết định có đủ dữ kiện.** Thanh trợ giúp nhận đúng `listingId`, phiên bản listing và mục tiêu người dùng. Hiện tổng chi phí thuê theo tháng và tiền cần khi vào ở bằng phép tính xác định: tiền phòng, cọc, phí cố định, phần biến động theo giả định chỉnh được. Mục chưa có là “chưa rõ”, không phải 0. So sánh 2–4 phòng theo cùng một tiêu chí; cuối cùng gợi ý câu hỏi còn thiếu và nút liên hệ. AI giải thích đánh đổi; code tính tiền và quyết định điều kiện đủ.
3. **Từ ý muốn liên hệ đến bản nháp đúng việc.** Ngay ở phòng/người ở ghép/đồ cũ, chuẩn bị tin nhắn với đối tượng đúng, thông tin liên quan và các câu hỏi chưa có câu trả lời. Người dùng đọc, chỉnh và bấm gửi. Với lịch xem phòng, trước tiên chuẩn bị lời đề nghị thời gian; chỉ ghi “đã xác nhận lịch” khi có dữ liệu xác nhận thực. Không tự gửi tin, tự hứa còn phòng hoặc tự cam kết đặt cọc.

Giá trị mới nằm ở việc giữ ngữ cảnh và nối các bước, không phải quảng bá lại các endpoint tìm kiếm hoặc chat đã tồn tại. Pattern sản phẩm hỗ trợ hướng này là Zillow nối tìm kiếm–quyết định–xem nhà [S1] và Airbnb đặt so sánh ngay trong wishlist [S2].

### P1 — Giảm việc lặp lại cho cả hai phía

- **Chủ nhà đăng tin một lần, sửa ít hơn:** từ ghi chú/ảnh và thông tin đã nhập, tạo bản nháp có cấu trúc; đánh dấu trường thiếu và mâu thuẫn giữa giá/diện tích/phí/tiện ích; hỏi đúng phần thiếu. Chỉ gợi ý tiện ích nhìn thấy là “cần xác nhận”, không tự kết luận có máy lạnh/ban công từ ảnh. Không tạo ảnh mô tả sai tình trạng thực. Người đăng duyệt từng thay đổi quan trọng trước xuất bản.
- **Chủ nhà trả lời nhanh bằng nguồn đúng:** gợi ý câu trả lời từ listing và FAQ do chủ nhà duyệt; nêu trường hợp cần chủ nhà trả lời trực tiếp. Hiện các câu khách hay hỏi nhưng tin chưa ghi để cải thiện dữ liệu. Tránh gửi lại toàn bộ inbox cho model khi chỉ cần một đoạn hội thoại cụ thể.
- **Ở ghép theo nhu cầu sống do người dùng khai báo:** dùng ngân sách, giờ giấc, hút thuốc, vật nuôi, vệ sinh, thời điểm vào ở và quy tắc khách đến; hiển thị điểm hợp và điểm cần trao đổi. Không tự suy luận tính cách, độ đáng tin hoặc đặc điểm nhạy cảm từ ảnh/tin nhắn. Nếu chấm điểm, công khai thành phần và cho người dùng đổi trọng số; chưa có bằng chứng để gọi là “độ tương hợp chính xác”.
- **Đồ ăn từ nhu cầu đến giỏ dự kiến:** “Hai người, dưới 80k, nhận gần đây, còn bán” → gợi ý món thực sự còn trong menu với tổng tiền/phí hiện hành, nhóm đúng người bán và phương thức nhận. Hỏi dị ứng hoặc chế độ ăn chỉ khi phù hợp và dựa trên thông tin quán đã cung cấp; không hứa an toàn thực phẩm. Người dùng duyệt giỏ và hoàn tất checkout hiện có. Nếu thiếu dữ liệu món, bộ lọc và giỏ gợi ý xác định vẫn có ích mà không cần LLM.
- **Chợ đồ cũ từ món cần mua đến giao dịch rõ ràng:** diễn giải từ đồng nghĩa, lọc hàng còn bán; so sánh giá/tình trạng/vị trí theo dữ liệu. Chuẩn bị câu hỏi kiểm tra món và đề nghị gặp. Gợi ý chất lượng tin cho người bán. Không gọi một giá đề xuất là giá thị trường nếu chưa có tập tham chiếu đủ tốt, và không tuyên bố “không lừa đảo”.

### P2 — Làm sau khi dữ liệu và hành động đã vững

- **Theo dõi nhu cầu có sự cho phép:** người dùng chọn lưu nhu cầu và nhận báo khi có phòng đáp ứng điều kiện. Hiện tiêu chí, tần suất, nơi nhận và nút dừng. Nền tảng truy vấn định kỳ; không cần gọi model cho mỗi listing mới.
- **Trợ giúp hỗ trợ khách hàng theo trạng thái thật:** giải thích cách dùng, tóm tắt vấn đề và chuẩn bị ticket; đọc trạng thái đơn/ví chỉ trong quyền truy cập. Tình trạng hoàn tiền phải đến từ hệ thống. AI không tự quyết định tranh chấp hay đổi số dư.
- **Công cụ vận hành cho admin:** ưu tiên hàng đợi tin thiếu dữ liệu, nghi trùng lặp hoặc có mẫu rủi ro để người kiểm duyệt xem; kèm dấu hiệu gốc và quyền bỏ qua. Không dùng model làm phán quyết tự động khóa tài khoản hoặc kết tội người đăng. Dashboard chỉ tạo insight khi có lượng dữ liệu thực đủ để tránh diễn giải biến động ngẫu nhiên.
- **Lập lịch xem nhiều phòng và dịch vụ quanh nơi ở:** chỉ phát triển sau khi có lịch khả dụng, tọa độ tốt và nguồn dữ liệu tiện ích; tách “gợi ý tuyến đường” khỏi “lịch hẹn đã được chủ nhà nhận”.

## 3. Ràng buộc thiết kế và kiến trúc để trải nghiệm đáng tin

**Ngữ cảnh vừa đủ:** gói request nên chỉ gồm loại trang, ID đối tượng đang chọn, ID shortlist, điều kiện tìm kiếm hiện hành và ý định; BE lấy lại bản ghi có quyền đọc và trạng thái mới nhất. Không tin toàn bộ giá/quyền/seller ID do FE gửi. Đổi đối tượng phải đổi context; không kéo nhầm thông tin phòng cũ sang phòng mới.

**Tách việc hiểu ngôn ngữ khỏi sự thật và tác động:** structured output hỗ trợ chuyển câu người dùng thành schema; tài liệu Gemini nhấn mạnh JSON hợp lệ vẫn có thể sai ngữ nghĩa và cần validate giá trị trong ứng dụng. Function calling cho phép truy cập công cụ/API, nhưng chính ứng dụng phải validate lời gọi và dùng xác thực phù hợp. [S7, S8] Áp dụng: model chỉ đề xuất truy vấn/hành động được allowlist; BE áp auth, ownership, validation, trạng thái và chống lặp. Giá, tồn kho, phép tính tiền và quyền thay đổi dữ liệu vẫn do code.

**Thể hiện sự thật và phần chưa biết:** mỗi câu trả lời về phòng/món/đơn cần đối tượng nguồn và thời điểm cập nhật. “Chưa có thông tin phí điện” tốt hơn một con số bịa. Không dùng phần trăm tự tin do model tự nói như xác suất đã hiệu chuẩn. Bản nháp phải tách khỏi kết quả đã thực hiện; chỉ báo thành công sau response thành công của API.

**Sở thích dưới quyền kiểm soát người dùng:** tách “chỉ dùng lần này” khỏi “lưu làm mặc định”; người dùng xem/sửa/xóa ngân sách, trường/khu vực và các lựa chọn. Không tự coi một lần mở tin là sở thích lâu dài. Giới hạn thời gian giữ session và reset sau khi nhu cầu thay đổi. Đây là áp dụng nguyên tắc feedback và quyền điều khiển của PAIR. [S5]

**Tốc độ và khôi phục:** hiện kết quả DB/thẻ ngay khi có, giải thích ngắn sau; model timeout không chặn search thường. Giữ lại bản nháp khi lỗi, không retry vô hạn. Gemini giới hạn theo dự án, gồm RPM/TPM/RPD; nhiều API key cùng dự án không tạo nhiều quota độc lập. Giới hạn thực phải xem trong AI Studio của dự án, không suy ra từ một con số phổ thông. [S9]

**Chi phí gắn với tác vụ:** đo token, số tool call, retry và độ trễ cho mỗi việc hoàn thành. Giá model khác nhau; tool grounding có phí riêng theo model/tool và không mặc định được gộp vào token. [S10] Trước mắt truy vấn listing/menu/FAQ nội bộ, lấy ít bản ghi rồi tóm tắt. Chỉ dùng nguồn web ngoài khi câu hỏi cần nó. Với ETA, Routes API yêu cầu billing, tính matrix theo số origin × destination và tính phí khác nhau theo tính năng. [S12] Vì vậy lọc ứng viên trước, chỉ tính tuyến cho shortlist, hiển thị phương tiện và thời điểm; không chạy matrix cho cả kho phòng mỗi lần gõ.

**Điều kiện provider cần kiểm tra trước mở rộng dữ liệu riêng:** Gemini API terms có hiệu lực 23/03/2026 phân biệt unpaid/paid. Unpaid có thể dùng prompt/output để cải thiện sản phẩm và có human review; paid qua project có billing đang hoạt động không dùng nội dung để cải thiện sản phẩm nhưng vẫn có lưu ngắn hạn phục vụ chống lạm dụng. Điều khoản cũng hạn chế API client hướng tới/có khả năng được người dưới 18 tuổi truy cập. [S11] Chưa xác minh billing hoặc có người dùng vị thành niên tại Homeji; đây là điểm cần kiểm tra, không phải kết luận dự án vi phạm. Không đưa CCCD, ngân hàng, nội dung thanh toán hoặc toàn bộ inbox vào model chỉ để cá nhân hóa search.

## 4. Cách kiểm chứng trước khi mở rộng

Đây là kế hoạch đánh giá đề xuất, không phải kết quả đã đo:

1. Chọn vài công việc có thể quan sát đầy đủ: tìm shortlist phù hợp, so sánh đủ chi phí, soạn câu hỏi cho chủ nhà, hoàn thiện một tin đăng, tìm món trong ngân sách, tìm món đồ cũ.
2. Đo phiên bản hiện tại trước bằng cùng kịch bản và dữ liệu. Sau đó cho người dùng làm trên bản cải tiến; ghi thời gian hoàn thành, số lần phải nhập lại, tỷ lệ bỏ cuộc và khả năng giải thích tại sao chọn kết quả.
3. Kiểm tra kết quả bằng điều kiện thật, không dùng số tin nhắn AI làm chỉ số thành công. Search: ràng buộc bắt buộc có bị vi phạm không. So sánh: phí thiếu có được đánh dấu không. Bản nháp: sai đối tượng/sai giá không. Đồ ăn: tổng tiền và món còn bán có đúng tại checkout không.
4. Có bộ tình huống: không đủ kết quả; trường trùng tên; ngân sách “4 triệu tất cả”; phí trống; tin hết hạn; model 429/timeout; người dùng đổi phòng giữa lúc request chạy; listing chứa nội dung cố sai khiến model; quyền truy cập bị thay đổi; submit lặp.
5. Chỉ mở rộng automation sau khi chứng minh giúp hoàn thành việc. Theo dõi kết quả API, latency p50/p95, chi phí/việc hoàn thành, tỷ lệ chuyển sang thao tác thường, báo sai và hành động nhầm. Không ghi prompt chứa dữ liệu cá nhân vào GA4.

Ưu tiên release đầu tiên: **giữ mục tiêu xuyên suốt → trợ giúp hiểu đúng đối tượng đang xem → shortlist/so sánh có dữ liệu → bản nháp hành động có thể chỉnh**. Sau đó dùng các API và luồng đã có để mở rộng sang ở ghép, món ăn, đồ cũ và chủ nhà.

## 5. Danh mục nguồn đã kiểm tra

Ngày truy cập tất cả nguồn: **21/10/2026**. “Không thấy ngày riêng” nghĩa là trang đọc được không thể hiện ngày phát hành/cập nhật riêng trong nội dung, không suy đoán từ ngày crawl.

1. **S1 — Zillow, AI mode cho người thuê.** Đăng 25/03/2026; cập nhật 09/10/2026. [Zillow AI mode will change how renters decide, not just how they search](https://www.zillow.com/news/zillow-ai-mode-will-change-how-renters-decide-not-just-how-they-search/).
2. **S2 — Airbnb, Autumn update.** Đăng 30/09/2026. [Airbnb 2026 autumn update](https://news.airbnb.com/en-uk/airbnb-2026-autumn-update).
3. **S3 — Google Maps, Ask Maps.** Đăng 12/03/2026. [How we’re reimagining Maps with Gemini](https://blog.google/products-and-platforms/products/maps/ask-maps-immersive-navigation/).
4. **S4 — Google PAIR, chọn vấn đề và thành công.** Không thấy ngày riêng trên trang. [User Needs + Defining Success](https://pair.withgoogle.com/guidebook-v2/chapter/user-needs/).
5. **S5 — Google PAIR, quyền phản hồi và điều khiển.** Không thấy ngày riêng trên trang. [Feedback + Control](https://pair.withgoogle.com/guidebook-v2/chapter/feedback-controls/).
6. **S6 — Google PAIR, lỗi và cách tiếp tục.** Không thấy ngày riêng trên trang. [Errors + Graceful Failure](https://pair.withgoogle.com/guidebook-v2/chapter/errors-failing/).
7. **S7 — Gemini API, structured output.** Cập nhật 20/10/2026 UTC. [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).
8. **S8 — Gemini API, gọi công cụ.** Cập nhật 23/09/2026 UTC. [Function calling with the Gemini API](https://ai.google.dev/gemini-api/docs/function-calling).
9. **S9 — Gemini API, quota.** Cập nhật 15/10/2026 UTC. [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
10. **S10 — Gemini Developer API, giá.** Cập nhật 19/10/2026 UTC. [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing). Không chốt model/chi phí production từ nghiên cứu này; cần workload và usage thật.
11. **S11 — Gemini API, điều khoản và dữ liệu.** Hiệu lực 23/03/2026. [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms).
12. **S12 — Google Maps, Routes và billing.** Cập nhật 20/10/2026 UTC. [Routes API Usage and Billing](https://developers.google.com/maps/documentation/routes/usage-and-billing).

Các nguồn Zillow/Airbnb/Maps là thông báo và mô tả chính thức của hãng; chỉ dùng xác nhận pattern và khả năng được công bố. Không dùng chúng để khẳng định Homeji sẽ có cùng tỷ lệ sử dụng, lợi nhuận, chất lượng dữ liệu hoặc tốc độ xử lý.
