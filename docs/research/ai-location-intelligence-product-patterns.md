# Nghiên cứu AI và location intelligence cho Homeji

> Ngày rà soát: 02/10/2026  
> Phạm vi: tìm phòng theo vị trí, quán ăn/tiện ích quanh nơi thuê, trợ lý hội thoại có thể điều khiển giao diện và giao dịch có xác nhận.  
> Nguồn: chỉ dùng tài liệu chính thức/first-party của Google, Airbnb, Zillow và Grab. Các đề xuất cho Homeji là suy luận sản phẩm từ những nguồn này, chưa phải kết quả A/B test trên người dùng Homeji.

## 1. Kết luận điều hành

AI của Homeji không nên tiếp tục là một ô chat chỉ trả lời bằng văn bản. Mẫu chung ở các sản phẩm tốt là: **hiểu ý định bằng ngôn ngữ tự nhiên → truy xuất dữ liệu thật theo vị trí → hiển thị kết quả trên đúng bề mặt map/list → cho người dùng thực hiện bước tiếp theo có kiểm soát**.

Ưu tiên phù hợp nhất cho Homeji:

1. Biến thanh tìm kiếm phòng thành **search ngôn ngữ tự nhiên có cấu trúc**: ví dụ “phòng dưới 4 triệu, đi FPT 20 phút, gần quán cơm và cửa hàng tiện lợi”. Zillow đã cho người mua và người thuê tìm bằng câu tự nhiên theo commute, affordability, trường học và điểm quan tâm; truy vấn được chuyển thành kết quả listing phù hợp thay vì chỉ thành câu trả lời chat ([Zillow — AI-powered natural-language home search](https://www.zillow.com/news/zillows-ai-powered-home-search-gets-smarter-with-new-natural-language-features/)).
2. Khi người dùng chọn một vị trí hoặc một phòng, hiển thị **“Sống quanh đây”** ngay trong kết quả: quán ăn, cà phê, cửa hàng tiện lợi, chợ, nhà thuốc, trạm xe buýt và trường học; mỗi mục có khoảng cách/ETA thật và lý do gợi ý. Google Places Nearby Search hỗ trợ lọc theo loại địa điểm, giới hạn bán kính, xếp theo khoảng cách hoặc độ phổ biến; Place Details cung cấp rating, giờ mở cửa, review và price level ([Google — Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search), [Google — Place resource](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places)).
3. Cho AI **điều khiển web bằng action có cấu trúc**: cập nhật filter, di chuyển map, đánh dấu phòng/quán, mở trang chi tiết, so sánh hoặc chuẩn bị giỏ hàng. Zillow mô tả AI mới của họ dùng một bộ điều phối gọi các năng lực chuyên biệt như property search, finance và valuation, thay vì để một model đơn lẻ tự trả lời mọi câu hỏi ([Zillow — how AI mode works](https://www.zillow.com/news/how-zillows-new-ai-mode-works-throughout-the-real-estate-journey/)).
4. Với đồ ăn hoặc bất kỳ hành động liên quan đến tiền, AI chỉ được **đề xuất và chuẩn bị**, không được tự hoàn tất giao dịch. Grab Shopping Agent tìm và xếp hạng sản phẩm, nhưng người dùng vẫn review gợi ý, tự thêm món vào giỏ và tự đặt hàng; Airbnb cũng tách rõ bước checkout hiển thị tổng tiền khỏi hành động `Confirm and pay` ([Grab — Shopping Agent](https://www.grab.com/inside-grab/stories/grabx-ai-shopping-agent-grocery-list/), [Airbnb — pricing and checkout](https://www.airbnb.com/help/article/125), [Airbnb — how to book](https://www.airbnb.com/help/article/85)).

### Điểm xuất phát thực tế của Homeji

Homeji không phải xây lại search vị trí từ đầu. Frontend hiện đã có Places `AutocompleteSuggestion`, resolve Place ID, Text Search và geocode fallback (`src/lib/placeAutocomplete.ts:64-246`); chọn địa điểm tạo vùng tìm phòng bán kính mặc định khoảng `1,8 km` (`src/lib/placeAutocomplete.ts:25-26`, `src/pages/HomePage.tsx:240-264`); card Place đã đọc rating, giờ mở cửa, ảnh, review và Google Maps URI (`src/lib/mapPlace.ts:94-151`).

Khoảng trống tạo ra giá trị mới nằm ở lớp kết hợp: pin layer hiện chỉ có `vacant`, `roommate`, `marketplace` (`src/lib/mapPinLayers.ts:2-24`), chưa có restaurant/cafe/convenience/transit; chưa có so sánh travel-time; và ô search chưa trộn gợi ý phòng với tiện ích gần anchor. Vì vậy P0 nên mở rộng pipeline hiện tại thành `anchor → rental bbox → nearby POI`, không thay thư viện map hoặc dựng một chatbot độc lập mới.

## 2. Các pattern first-party đáng áp dụng

### 2.1. Search phải biến ngôn ngữ tự nhiên thành trạng thái sản phẩm

Zillow cho phép truy vấn như “Homes 30 min drive from Millennium Park”, “Apartments near Denver Union Station” hoặc giới hạn ngân sách bằng câu tự nhiên, đồng thời cho lưu search và nhận thông báo khi có listing mới phù hợp ([Zillow — natural-language search](https://www.zillow.com/news/zillows-ai-powered-home-search-gets-smarter-with-new-natural-language-features/)). Đây là pattern phù hợp hơn chatbot hỏi–đáp vì người dùng nhìn thấy ngay filter đã hiểu, có thể sửa từng điều kiện và kiểm tra kết quả.

**Áp dụng cho Homeji:** parse câu tìm kiếm thành schema minh bạch:

- `anchorPlace`: trường, nơi làm việc hoặc khu vực;
- `monthlyBudget`, `roomType`, `moveInDate`;
- `maxTravelMinutes` và `travelMode`;
- `nearbyNeeds`: loại địa điểm, bán kính/ETA tối đa, open-now, mức giá;
- `sort`: phù hợp nhất, gần nhất, giá thấp hoặc commute ngắn.

Sau khi parse, UI phải hiện các chip như `≤ 4 triệu`, `≤ 20 phút đến FPT`, `gần quán ăn` để người dùng sửa/xóa; AI không được âm thầm áp điều kiện mà người dùng không nhìn thấy.

Google khuyến nghị dùng Place Autocomplete cho input địa chỉ theo thời gian thực vì nó xử lý chuỗi chưa hoàn chỉnh/mơ hồ và trả `place_id`; có thể bias theo viewport và truyền place ID sang Geocoding hoặc Routes để giảm mơ hồ và latency ([Google — geocoding best practices](https://developers.google.com/maps/documentation/geocoding/best-practices), [Google — Autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)).

### 2.2. Map và danh sách phải là hai góc nhìn của cùng một truy vấn

Airbnb cho phép người dùng lọc theo giá, tiện nghi, booking options và accessibility rồi tiếp tục tinh chỉnh trên map; hãng cũng nói kết quả trên map có thể khác danh sách để giúp người dùng hiểu phân bố địa lý ([Airbnb — how search results work](https://www.airbnb.com/help/article/39)). Đội ngũ kỹ thuật Airbnb còn ghi nhận rằng áp nguyên thứ hạng list sang map không hiệu quả vì pin không có trật tự dọc và quá nhiều pin làm phân tán chú ý; họ thử giới hạn/tiering pin và điều chỉnh tâm map theo xác suất booking ([Airbnb Engineering — improving search ranking for maps](https://airbnb.tech/ai-ml/improving-search-ranking-for-maps/)).

**Áp dụng cho Homeji:**

- Kéo/zoom map tạo `search this area`, không tự chạy liên tục khi người dùng chỉ đang quan sát.
- Chọn một phòng làm tâm tạm thời cho lớp `Sống quanh đây`; đổi phòng thì truy vấn POI đổi theo tọa độ phòng, không theo vị trí GPS hiện tại của người dùng.
- Hover/chọn card đồng bộ marker; chọn marker cuộn đến card.
- Ranking map có thêm spatial diversity và chống chồng pin; không đơn giản lấy top-N từ list.
- AI trả về `SearchPatch`/`MapAction`, không trả tọa độ hoặc filter chỉ trong prose.
- Nếu không có đủ kết quả chính xác, nới điều kiện phải được nói rõ. Airbnb công khai rằng đôi khi họ hiển thị lựa chọn không khớp hoàn toàn khi không đủ listing chất lượng; Homeji nên gắn nhãn `Gần đúng` và cho biết điều kiện nào bị nới ([Airbnb — how search results work](https://www.airbnb.com/help/article/39)).

### 2.3. “Gần” cần dựa trên ETA, không chỉ bán kính

Nearby Search có thể tìm `restaurant`, `cafe`, `convenience_store`, `pharmacy`, `supermarket`, v.v. trong một vòng tròn và xếp theo `DISTANCE` hoặc `POPULARITY`; trường trả về được điều khiển bằng FieldMask ([Google — Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search)). Routes `computeRouteMatrix` tính duration/distance cho nhiều cặp origin–destination và hỗ trợ transit, walking, driving cùng các giới hạn số phần tử ([Google — Compute Route Matrix](https://developers.google.com/maps/documentation/routes/compute_route_matrix), [Google — Routes API](https://developers.google.com/maps/documentation/routes)).

**Áp dụng cho Homeji:** lấy Nearby Search để tạo tập ứng viên rẻ, sau đó chỉ tính ETA cho top ứng viên. Card phòng nên tóm tắt `3 quán ăn ≤ 7 phút đi bộ · cửa hàng tiện lợi 4 phút · FPT 18 phút xe máy`. Không dùng khoảng cách đường chim bay làm “thời gian đi”.

Hai chế độ xếp hạng nên tách rõ:

- `Gần nhất`: distance/ETA;
- `Đáng thử`: relevance tổng hợp từ ETA, giờ mở cửa, rating, số lượt đánh giá, price level và mức phù hợp với nhu cầu đã khai báo.

Google Places cung cấp rating, tối đa năm review, business status, giờ mở cửa hiện tại/thường lệ, price level và liên kết Google Maps; các field nâng cao thuộc tier tính phí khác nhau nên không nên gọi tất cả cho mọi marker ([Google — Place data fields](https://developers.google.com/maps/documentation/places/web-service/data-fields), [Google — Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details)).

### 2.4. Cá nhân hóa phải có ngữ cảnh, khả năng giải thích và đường thoát

Airbnb dùng tương tác trên nền tảng, booking trước đây và saved listings để xếp hạng; khi đã có booking, hãng có thể ưu tiên experience/service gần nơi ở và phù hợp thời gian của reservation ([Airbnb — how search results work](https://www.airbnb.com/help/article/39)). Grab dùng click/order history, thời điểm trong ngày, ngân sách và willingness-to-wait; đồng thời cố ý đưa thêm lựa chọn hơi khác sở thích để hỗ trợ khám phá và đề xuất món thay thế khi không có kết quả ([Grab — personalising food recommendations](https://www.grab.com/inside-grab/stories/personalising-food-recommendations-on-grabfood/)).

**Áp dụng cho Homeji:**

- P0 dùng preference do người dùng khai báo trong phiên: loại món, ngân sách, bán kính, giờ mở cửa, đi bộ/xe máy.
- P1 mới dùng hành vi đã consent: phòng đã lưu, khu vực hay xem, quán đã mở/đặt; luôn có `Không cá nhân hóa` và xóa lịch sử.
- Mỗi đề xuất cần reason chip cụ thể: `6 phút đi bộ`, `mở đến 23:00`, `đúng ngân sách`, `gần phòng bạn đang xem`; không dùng câu mơ hồ “AI đề xuất cho bạn”.
- Dành một tỷ lệ nhỏ cho khám phá, nhưng không đánh đổi hard constraint như ngân sách tối đa, dị ứng hoặc khoảng thời gian di chuyển.

### 2.5. Hội thoại chỉ hữu dụng khi grounded và gọi được action

Google cung cấp Grounding with Google Maps để Gemini trả lời dựa trên dữ liệu Maps theo vị trí người dùng, kèm metadata nguồn; tài liệu khuyến nghị truyền latitude/longitude khi biết vị trí và chỉ bật tool cho truy vấn có ngữ cảnh địa lý để kiểm soát cost/performance ([Google — Grounding with Google Maps](https://ai.google.dev/gemini-api/docs/maps-grounding)). Grab AI Assistant chuyển từ keyword search sang hội thoại, giải thích vì sao địa điểm phù hợp và cho người dùng tiếp tục bằng vài click đến reservation/deal; đây là cầu nối giữa lời nói và workflow chứ không phải một chatbot tách biệt ([Grab — AI Assistant](https://www.grab.com/inside-grab/stories/grabx-ai-assistant/)).

**Áp dụng cho Homeji:** định nghĩa tool/action phía server, validate lại toàn bộ input và quyền trước khi chạy:

- `search_rentals(criteria)`;
- `show_nearby_places(anchor, categories, constraints)`;
- `compare_rentals(ids)`;
- `compute_commute(originIds, destination, mode)`;
- `open_listing(id)` / `focus_map(bounds)`;
- `search_marketplace_food(location, query)`;
- `prepare_cart(items)` — chỉ tạo bản nháp;
- `request_checkout_confirmation(cartVersion)` — không tự thanh toán.

LLM chỉ chọn tool và giải thích kết quả. Giá, tồn kho, quyền truy cập, ID thực thể, tổng tiền và giao dịch phải lấy từ dịch vụ nghiệp vụ, không lấy từ nội dung model sinh ra.

### 2.6. AI chuẩn bị giao dịch; con người xác nhận

Grab Shopping Agent nhận text/voice/ảnh, tìm và xếp hạng sản phẩm từ một merchant; người dùng review đề xuất, tự thêm món vào cart rồi mới đặt đơn ([Grab — Shopping Agent](https://www.grab.com/inside-grab/stories/grabx-ai-shopping-agent-grocery-list/)). Trang GrabFood chính thức cũng mô tả người dùng nhập địa chỉ giao, thêm món như bình thường, review rồi nhấn Order để xác nhận; phí giao hàng được hiển thị trước khi chọn món/checkout tùy luồng ([GrabFood — ways to order and confirmation](https://www.grab.com/id/en/food/)). Airbnb luôn hiển thị total price và breakdown ở checkout; bước mang tính cam kết được đặt tên rõ `Confirm and pay` hoặc `Request to book` ([Airbnb — pricing](https://www.airbnb.com/help/article/125), [Airbnb — booking flow](https://www.airbnb.com/help/article/85)).

**Guardrail bắt buộc cho Homeji:**

1. AI có thể tìm món, đề xuất thay thế và tạo **cart draft**.
2. Trước bước cuối phải hiện merchant, từng món/biến thể/số lượng, địa chỉ nhận, thời gian dự kiến, giá món, phí, khuyến mãi, tổng tiền, nguồn thanh toán và chính sách hủy.
3. Nút xác nhận phải diễn đạt hệ quả, ví dụ `Đặt đơn · 87.000đ`; không dùng nút mơ hồ `Tiếp tục`.
4. Thay đổi giá/tồn kho/địa chỉ sau khi mở confirm phải làm hết hạn confirmation và yêu cầu xác nhận lại.
5. Dùng `idempotencyKey` và `cartVersion`; retry không được tạo đơn trùng. AI không giữ hoặc tự điền OTP, CVV hay tự đổi phương thức thanh toán.

## 3. Thiết kế đề xuất cho trải nghiệm “tìm phòng + sống quanh đây”

Một truy vấn mẫu:

> “Tìm phòng dưới 4 triệu gần ĐH FPT, đi xe máy dưới 20 phút, quanh đó có quán cơm sinh viên và cửa hàng tiện lợi mở khuya.”

Luồng đề xuất:

1. Autocomplete phân giải `ĐH FPT` thành place ID và tọa độ; AI parse phần còn lại thành criteria/chip có thể sửa.
2. Rental search trả phòng phù hợp; route matrix tính ETA từ top phòng đến trường.
3. Khi người dùng chọn phòng, Nearby Search lấy quán ăn/cửa hàng quanh **tọa độ phòng**; top POI được tính ETA đi bộ/xe máy.
4. UI đồng thời cập nhật map, list phòng và panel `Sống quanh đây`; chatbot giải thích bằng dữ liệu đã truy xuất: “Phòng A rẻ hơn 300k nhưng xa trường hơn 6 phút; phòng B có 8 quán ăn trong 10 phút đi bộ.”
5. Nếu người dùng nói “đặt 2 phần cơm gần phòng B”, Homeji mở Chợ đồ/food search theo anchor B, tạo cart draft từ inventory thật rồi dừng ở màn review + explicit confirmation.

## 4. Backlog ưu tiên có thể triển khai

### P0 — 1 đến 2 sprint: giá trị thấy ngay, ít rủi ro

- Place Autocomplete cho ô vị trí; lưu `placeId + lat/lng + display label`, không chỉ chuỗi text.
- `nearby-places` backend adapter cho restaurant/cafe/convenience/pharmacy/supermarket; query khi chọn phòng và có cache đúng policy.
- Panel `Sống quanh đây` + marker layer + chip `5/10/15 phút`.
- Natural-language parser trả schema filter và UI chip; nếu parse thiếu chắc chắn, yêu cầu người dùng chọn giữa các option thay vì tự đoán.
- Structured actions để chatbot cập nhật search/map và mở đúng trang; mọi action đều có audit log và schema validation.
- Event đo lường: search submitted, filter corrected, POI viewed, listing saved/contacted, cart draft created, confirmation shown/accepted/cancelled.

### P1 — commute và so sánh

- Route Matrix cho top 10–20 phòng, theo xe máy/walking/transit khi dữ liệu khu vực hỗ trợ.
- Compare view: giá thuê + commute + mật độ tiện ích + giờ mở cửa + chi phí ước tính.
- Saved natural-language search và notification cho tin mới; Zillow đã kết hợp saved search với thông báo listing mới phù hợp ([Zillow — natural-language search](https://www.zillow.com/news/zillows-ai-powered-home-search-gets-smarter-with-new-natural-language-features/)).
- Recommendation reason codes và nút `Không phù hợp` để thu feedback rõ nguyên nhân.

### P2 — cá nhân hóa và hành động nhiều bước

- Hồ sơ preference opt-in, recency decay, diversity/exploration quota và khả năng reset.
- Food assistant tìm từ inventory Homeji + địa điểm quanh phòng, hỗ trợ thay thế nhưng chỉ tạo cart draft.
- So sánh đa mục tiêu bằng câu tự nhiên: tiền thuê, commute, món ăn, tiện ích; LLM điều phối các service chuyên biệt thay vì truy cập DB trực tiếp.
- Chỉ đánh giá Grounding with Google Maps sau khi kiểm tra hỗ trợ tiếng Việt, vùng hoạt động và unit economics; tài liệu hiện nêu tool có giới hạn ngôn ngữ/region và tính phí theo lần grounding/search ([Google — Maps grounding requirements and limitations](https://ai.google.dev/gemini-api/docs/maps-grounding)).

## 5. Caveat kỹ thuật, chi phí và pháp lý sản phẩm

- **Attribution/caching:** Google Places yêu cầu attribution/Google logo phù hợp; phần lớn Places content không được prefetch/cache/store ngoài ngoại lệ, trong khi `place_id` được phép lưu lâu dài. Nếu hiển thị dữ liệu Places trên map thì phải dùng Google Map và attribution theo policy ([Google — Places policies and attributions](https://developers.google.com/maps/documentation/places/web-service/policies)). Trước triển khai cần đối chiếu lại loại map hiện tại của Homeji và điều khoản thương mại.
- **FieldMask/cost:** Nearby Search bắt buộc FieldMask; Google nêu rõ chỉ xin field cần thiết giúp giảm xử lý và billing. Rating, review, price range, routing summary và AI review summary có SKU cao hơn ([Google — Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search), [Google — Place data fields](https://developers.google.com/maps/documentation/places/web-service/data-fields)). P0 chỉ nên lấy ID, display name, location, type, business status; fetch chi tiết khi người dùng mở card.
- **Không dùng AI summary của Google làm P0 tại Việt Nam:** tài liệu hiện chỉ hỗ trợ Place Summary tiếng Anh tại Ấn Độ và Hoa Kỳ; Review Summary chỉ có tiếng Anh tại Ấn Độ/Anh/Mỹ và tiếng Nhật tại Nhật, không có Việt Nam/tiếng Việt ([Google — AI-powered place summaries](https://developers.google.com/maps/documentation/places/web-service/place-summaries), [Google — Places release notes](https://developers.google.com/maps/documentation/places/web-service/release-notes)). Grounding with Google Maps hiện cũng chỉ hỗ trợ prompt/response tiếng Anh; vì vậy UX tiếng Việt nên dùng Places/Routes có cấu trúc rồi để model hiện tại diễn giải có kiểm soát, đồng thời có fallback template không phụ thuộc model ([Google — Maps grounding limitations](https://ai.google.dev/gemini-api/docs/maps-grounding)).
- **Độ mới:** giờ mở cửa, giá, tồn kho và ETA thay đổi; UI phải hiện thời điểm cập nhật và không để LLM ghi đè dữ liệu service. Google lưu ý transit schedules thay đổi thường xuyên và dự đoán xa có thể không nhất quán ([Google — transit routes](https://developers.google.com/maps/documentation/routes/transit-route)).
- **Quyền riêng tư:** location cá nhân hóa nên lấy anchor do người dùng chọn; chỉ dùng GPS khi có consent rõ và có chế độ dùng vị trí gần đúng. Không suy đoán thuộc tính nhạy cảm từ khu vực, lịch sử tìm phòng hoặc món ăn.
- **Fairness/ranking:** không để rating/popularity làm biến duy nhất vì sẽ khóa chặt quán mới và khu ít dữ liệu. Airbnb chủ động tạo diversity theo host, đặc điểm và price range; Grab cũng đưa lựa chọn mới lệch nhẹ khỏi thói quen để hỗ trợ discovery ([Airbnb — search ranking](https://www.airbnb.com/help/article/39), [Grab — recommendation discovery](https://www.grab.com/inside-grab/stories/personalising-food-recommendations-on-grabfood/)).
- **Nguồn dữ liệu:** POI Google và người bán/món trong Chợ đồ Homeji là hai nguồn khác nhau. Phải gắn nhãn nguồn và không hiển thị một quán Google như thể có thể đặt món qua Homeji khi chưa có merchant/inventory thực.
- **An toàn giao dịch:** chatbot không được gọi endpoint tạo đơn/thanh toán nếu thiếu confirmation token sinh từ snapshot giá mới nhất. Confirmation phải là bước UI server-verifiable, không chỉ là câu “bạn có chắc không?” trong hội thoại.

## 6. Chỉ số để chứng minh AI thực sự hữu dụng

- Tỷ lệ search ngôn ngữ tự nhiên tạo criteria hợp lệ; tỷ lệ người dùng sửa chip sau parse.
- `time-to-first-relevant-listing`, save/contact rate và lịch xem phòng trên mỗi search.
- Tỷ lệ mở `Sống quanh đây`, POI-to-listing return rate và số listing được so sánh.
- Sai số ETA/availability được report; tỷ lệ result `Gần đúng`.
- Cart draft → confirmation shown → confirmed; cancellation tại confirm; duplicate-order rate phải bằng 0.
- Tỷ lệ người dùng tắt/xóa personalization và khiếu nại đề xuất không liên quan.
- Chi phí Places/Routes/Gemini trên một search dẫn đến save/contact, không chỉ chi phí trên một message.

North-star đề xuất: **tỷ lệ phiên tìm kiếm dẫn đến lưu/liên hệ một phòng phù hợp có đủ thông tin commute và tiện ích**, thay vì số câu chat hoặc số token AI.

