# Nghiên cứu mô hình kiếm tiền trực tiếp từ end user cho Homeji

> Ngày rà soát: 22/07/2026  
> Phạm vi: sinh viên/người thuê, người cần pass phòng, người tìm ở ghép, chủ phòng cá nhân và người bán cá nhân trên Chợ đồ.  
> Nguồn: chỉ dùng tài liệu chính thức/first-party và code hiện tại của Homeji. Các mức giá đề xuất là giả thuyết sản phẩm cần A/B test, không phải kết luận về willingness-to-pay. Phần pháp lý là checklist sản phẩm, không thay thế tư vấn pháp lý tại Việt Nam.

## 1. Kết luận điều hành

Homeji **không nên dùng một gói Premium chung cho mọi end user**. Premium hiện tại giá `99.000đ/30 ngày`, nhưng ba lợi ích thực tế đều dành cho người có tin: badge, ưu tiên bằng boost và tăng khả năng xuất hiện trong đề xuất AI (`C:\Homeji\src\Homeji.Api\appsettings.json:56-80`, `C:\Homeji\src\Homeji.Application\Services\Subscriptions\SubscriptionService.cs:21-25`). Trong khi đó, backend cộng thẳng `100` điểm cho chủ tin Premium và sắp Premium trước trong kết quả (`C:\Homeji\src\Homeji.Application\Services\RentalPosts\RentalPostService.cs:259`, `:365-372`). Điều này tạo ba vấn đề: người thuê không có giá trị lặp lại để trả phí, ranking trả tiền có thể làm giảm độ phù hợp, và nhãn “Premium” dễ bị hiểu nhầm thành “đã xác minh”.

Đề xuất kiến trúc doanh thu theo từng nhu cầu:

1. **Homeji Plus cho người tìm phòng/ở ghép — 29.000đ/30 ngày**: cảnh báo tức thời, bộ so sánh nâng cao, commute matrix, lưu nhiều bộ lọc và insight tương thích. Tất cả chức năng an toàn và luồng liên hệ cơ bản vẫn miễn phí.
2. **Tin nổi bật trả một lần — 19.000đ/7 ngày hoặc 49.000đ/30 ngày**: dành cho chủ phòng cá nhân/người pass phòng; phải gắn nhãn `Tài trợ`, có báo cáo hiệu quả và không được vượt qua tin không phù hợp.
3. **Homeji Pro cho người đăng — giữ mốc 99.000đ/30 ngày**, nhưng phải bổ sung giá trị lặp lại thật: lượt làm mới có quota, analytics, gợi ý cải thiện tin, lịch xem và phản hồi lead. Badge xác minh tách hẳn khỏi badge trả phí.
4. **Chợ đồ — giữ commission theo giao dịch và gói người bán hiện có**, nhưng đo unit economics ở đơn giá thấp trước khi mở rộng. Code hiện cấu hình `10%` miễn phí, `8% + 49.000đ/tháng`, `6% + 149.000đ/tháng` (`C:\Homeji\src\Homeji.Api\appsettings.json:85-112`).
5. **Hỗ trợ pass phòng — thử phí thành công 99.000đ/case** sau khi có consent chủ nhà, state machine bàn giao, audit và đối soát. Không bán “xác minh” như một đặc quyền. Vì success fee kèm tìm đối tác/đàm phán có thể làm Homeji bị phân loại là môi giới BĐS, SKU này chỉ được mở sau legal sign-off theo Luật Kinh doanh bất động sản.
6. **Phí bảo vệ giao dịch/giữ cọc chỉ là P2**. Chỉ được thu khi Homeji hoặc đối tác được phép thực sự giữ tiền, xử lý tranh chấp và hoàn tiền; không đặt tên “bảo vệ” cho một checkout thông thường.

Ưu tiên 90 ngày: triển khai đo lường → thử pay-per-boost → tách merchandising Plus/Pro → thử dịch vụ pass phòng. Chưa nên thu phí người thuê theo phần trăm tiền thuê.

## 2. Homeji đang có gì để kiếm tiền

| Năng lực hiện tại | Bằng chứng trong code | Nhận định |
|---|---|---|
| Premium 30/180/365 ngày | `99.000đ`, `450.000đ`, `780.000đ` trong `C:\Homeji\src\Homeji.Api\appsettings.json:56-80` | Có checkout và entitlement sẵn; chưa có value proposition riêng cho renter. |
| Boost/ranking Premium | `premiumScore = 100`; Premium được sort trước trong `RentalPostService.cs:237-260,365-372` | Có thể tái sử dụng hạ tầng, nhưng phải thêm disclosure và relevance floor. |
| MoMo/PayOS | FE gọi `/api/subscriptions/premium/{code}/momo/create` và `/payos/create` tại `src/api/index.ts:325-340` | Phù hợp web checkout hiện tại; phí thực tế phải lấy từ hợp đồng merchant. |
| Ví Chợ đồ | Nạp tối thiểu `100.000đ`, tối đa `5.000.000đ`, phải giữ lại `20.000đ` tại `C:\Homeji\src\Homeji.Domain\Entities\WalletAccount.cs:7-9,80-82` | Giảm chi phí nhiều giao dịch nhỏ, nhưng cần giải thích rõ số dư/rút/hoàn tiền. |
| Commission + seller plan | 10%/8%/6% và 0đ/49.000đ/149.000đ mỗi 30 ngày | Đúng mô hình hybrid; cần kiểm tra điểm hòa vốn theo AOV. |
| Workflow tìm phòng, ở ghép, Chợ đồ | Search/map, save, invitations, chat, appointments, marketplace order/wallet đã có ở FE/API | Có nhiều “moment of value” để đặt upsell đúng ngữ cảnh, không cần paywall ngay lúc onboarding. |

### Khoảng trống cần sửa trước khi tăng thu

- Chưa tách `Paid` khỏi `Verified`: UI phải dùng badge khác màu/tên; trả tiền không được làm người dùng trông đáng tin hơn.
- Ranking hiện ưu tiên Premium trước relevance. Quảng cáo trả phí chỉ nên cạnh tranh **trong tập tin đủ điều kiện và phù hợp**, có nhãn tài trợ; kết quả organic tốt nhất không bị biến mất.
- Gói năm đang hiển thị giá quy đổi theo tháng nhưng checkout thu toàn bộ; Google Play coi việc chỉ nhấn mạnh giá/tháng thay vì số tiền thực thu là ví dụ không phù hợp. Mọi paywall phải làm nổi bật `780.000đ thanh toán một lần / 365 ngày`, rồi mới hiển thị giá quy đổi ([Google Play Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533)).
- Chưa có attribution đầy đủ từ impression → click → save → contact → appointment → filled/handed-over. Không có funnel này thì không thể chứng minh boost tạo incremental value.

## 3. Benchmark mô hình và pricing first-party

| Nền tảng | Người trả | Cơ chế và giá chính thức | Bài học cho Homeji |
|---|---|---|---|
| Nhà Tốt/Chợ Tốt | Người đăng BĐS cá nhân | Tin cho thuê 15 ngày: Cơ bản `31.500–38.200đ`, Tăng cường `46.500–53.200đ`, Nâng cao `131.900–138.600đ`; 30 ngày cao hơn. Một khách hàng cá nhân có 1 tin BĐS miễn phí mỗi 365 ngày; tin bị từ chối được hoàn phí ([Trợ giúp Chợ Tốt](https://trogiupios.chotot.com/nguoi-ban/quy-dinh-phi-dang-tin-bat-dong-san-tren-cho-tot/)). | Có thể thu theo từng tin/thời hạn, nhưng nên cho free allowance và hoàn phí nếu moderation từ chối. Mốc Homeji `19k/7 ngày`, `49k/30 ngày` phù hợp để test với sinh viên hơn là bắt mua subscription. |
| SpareRoom | Người tìm phòng hoặc có phòng | Free user liên hệ tin sau 7 ngày; Early Bird liên hệ ngay: `$14/1 tuần`, `$25/2 tuần`, `$28/4 tuần`; Bold Ad rank cao hơn và theo công bố nhận trung bình gấp đôi inquiry ([SpareRoom listing options](https://www.spareroom.com/content/placeditadvert/listing-options/)). | Có willingness-to-pay cho tốc độ. Homeji chỉ nên thử cảnh báo sớm/insight; không nên khóa chat sau mutual accept hoặc tạo nguy cơ người có ít tiền mất cơ hội nhà ở. |
| HousingAnywhere | Người thuê khi booking | Tenant Protection là phí một lần `25–40%` tiền thuê tháng đầu, tối thiểu `€175` ở các thị trường áp dụng; tiền tháng đầu chỉ chuyển cho landlord sau 48 giờ kể từ move-in ([Pricing for tenants](https://housinganywhere.com/pricing/tenants), [Tenant Protection](https://housinganywhere.com/secure-payments)). | Mức phí cao chỉ đứng vững khi có giữ tiền, scam monitoring, hỗ trợ, điều kiện hoàn và xử lý chỗ ở không đúng mô tả. Homeji không được sao chép mức phí hoặc tên gọi khi chưa có năng lực vận hành tương ứng. |
| Airbnb | Host/guest khi booking | Airbnb thu khi booking được xác nhận. Cấu trúc split-fee thường có host `3%`, guest `14,1–16,5%`; single-fee thường `15,5%` trừ từ host payout ([Airbnb service fees](https://www.airbnb.com/help/article/1857)). | Transaction take-rate phù hợp khi platform kiểm soát booking/payment/support. Với thuê dài hạn sinh viên, Homeji nên bắt đầu từ flat fee nhỏ và dịch vụ tùy chọn, không cộng phí phần trăm lớn vào tiền thuê. |
| Zillow Rentals | Property advertiser | Có Base/Enhanced/Premium/Signature; paid tier tăng featured search, email visibility, premium search card, social ads và map icon; Zillow công bố Signature `+75%`, Premium `+30%` impressions so với Base ([Zillow Rentals packages](https://www.zillow.com/rentals-network/packages/)). | Bán outcome về reach/analytics thay vì bán nhãn tin cậy. Homeji phải báo impression/contact uplift thực tế theo từng tin. |
| Batdongsan.com.vn | Người đăng nhiều tin | Cho nâng hạng và hoàn `100%` phần chi phí còn lại của tin cũ theo số giờ chưa hiển thị; các lượt đẩy chưa dùng cũng được hoàn ([Nâng cấp tin đăng](https://trogiup.batdongsan.com.vn/docs/nang-cap-tin-dang)). | Upgrade giữa kỳ nên tính prorate, không buộc người dùng trả chồng hai gói. |

Kết luận benchmark: mô hình bền vững không đơn thuần “đặt badge Premium”. Nền tảng bán một trong ba thứ có thể đo được: **tốc độ**, **độ phủ**, hoặc **bảo vệ giao dịch**. Mức giá phải tương xứng với năng lực Homeji thực sự cung cấp.

## 4. Ranh giới paywall

### Luôn miễn phí

- Xem giá thuê, cọc, phí định kỳ, điều kiện ở, ngày vào và tình trạng consent chủ nhà.
- Search/map cơ bản, xem chi tiết, lưu một số lượng hợp lý, report, block, khiếu nại và xem chính sách hoàn tiền.
- Xác minh danh tính/phòng ở mức cần thiết để bảo vệ cộng đồng; kết quả xác minh không phụ thuộc việc mua gói.
- Nhắn tin text an toàn sau mutual accept; gửi ảnh phòng cơ bản sau accept; lời mời ở ghép và từ chối lời mời.
- Luồng pass phòng: consent chủ nhà, cảnh báo pháp lý, trạng thái bàn giao, biên nhận và bằng chứng giao dịch.
- Hủy subscription, xóa tài khoản, tải/xóa dữ liệu và quản lý consent.

### Có thể trả phí

- Tốc độ: push alert tức thời thay vì digest; refresh/boost có quota.
- Độ phủ: vị trí tài trợ, card nổi bật, phân phối qua notification/email có giới hạn tần suất.
- Công cụ: commute matrix, nhiều saved searches, comparison nâng cao, analytics lead và lịch xem.
- Lao động thật: hỗ trợ chuẩn hóa hồ sơ pass, điều phối lịch, checklist bàn giao, đối soát case.
- Bảo vệ tiền: chỉ sau khi có payment/escrow partner, SLA tranh chấp, reserve và refund policy thật.

### Tuyệt đối không bán

- Badge “đã xác minh”, quyền report/block, quyền biết toàn bộ giá, quyền xem điều khoản, hoặc thứ hạng giả dạng organic.
- Quyền gửi ảnh trước khi hai bên accept; khả năng bỏ qua moderation/rate limit.
- Kết quả compatibility theo thuộc tính nhạy cảm hoặc khả năng trả tiền.
- Việc bán/chia sẻ dữ liệu hồ sơ, vị trí, roommate preferences cho quảng cáo ngoài ngữ cảnh nếu không có cơ sở pháp lý và consent riêng.

## 5. Danh mục sản phẩm kiếm tiền đề xuất

### 5.1. Homeji Plus — người tìm phòng và ở ghép

**Giá test:** `29.000đ/30 ngày` prepaid, không tự gia hạn trong MVP; sau khi chứng minh retention mới thử auto-renew. Gói `149.000đ/180 ngày` chỉ mở khi có ít nhất ba giá trị lặp lại được dùng hàng tuần.

**Paid:** push tức thời cho tối đa 10 saved searches, commute matrix đến 3 địa điểm, so sánh 10 phòng, insight tương thích nâng cao và export checklist đi xem phòng.  
**Free:** digest hằng ngày, 3 saved searches, so sánh 3 phòng, compatibility cơ bản, toàn bộ safety/contact flow.

Lý do định giá: đây là mức giả thuyết thấp hơn Premium người đăng và phù hợp một “search sprint” 1–2 tháng. SpareRoom chứng minh người tìm phòng có thể trả cho tốc độ, nhưng Homeji tránh mô hình chặn liên hệ 7 ngày để không làm housing access kém công bằng ([SpareRoom](https://www.spareroom.com/content/placeditadvert/listing-options/)).

### 5.2. Tin nổi bật trả một lần

| SKU | Giá test | Entitlement |
|---|---:|---|
| Boost 7 ngày | 19.000đ | Tối đa 7 ngày hoặc đến khi tin đóng; vị trí tài trợ trong tập đủ relevance. |
| Boost 30 ngày | 49.000đ | Như trên; report impression/click/contact. |
| Refresh | 5.000đ/lượt hoặc 4 lượt/15.000đ | Cập nhật thời gian trong organic; không cộng điểm Premium vô hạn. |

Quy tắc: một tin free hoạt động/người đăng cá nhân; moderation từ chối thì hoàn 100%; đóng tin sớm do đã cho thuê không tự hoàn phần đã chạy; upgrade giữa kỳ khấu trừ phần entitlement chưa dùng. Nhà Tốt đang cho một free allowance và hoàn phí tin bị từ chối, còn Batdongsan.com.vn prorate phần chưa dùng khi nâng cấp, là hai guardrail first-party phù hợp ([Chợ Tốt](https://trogiupios.chotot.com/nguoi-ban/quy-dinh-phi-dang-tin-bat-dong-san-tren-cho-tot/), [Batdongsan.com.vn](https://trogiup.batdongsan.com.vn/docs/nang-cap-tin-dang)).

### 5.3. Homeji Pro — chủ phòng cá nhân/người pass phòng

**Giá:** giữ `99.000đ/30 ngày`; `450.000đ/180 ngày`; `780.000đ/365 ngày` trong cấu hình hiện tại. Không đổi giá trước khi sửa entitlement.

**Cần bổ sung để có recurring value:** 4 refresh/tháng; analytics theo funnel; 2 A/B cover photo; lịch xem nhóm; template phản hồi; gợi ý giá dựa trên dữ liệu aggregate; ưu tiên hỗ trợ moderation. Không cam kết “tăng X lần” nếu chưa có experiment thật.

**Cần bỏ/đổi:** badge `Premium` trên owner card đổi thành `Pro`; badge `Đã xác minh chủ phòng/phòng` là entitlement miễn phí do workflow cấp. AI ranking không được thêm điểm chỉ vì trả phí; sponsored candidates cần lane riêng, disclosure và relevance threshold.

### 5.4. Chợ đồ

Giữ mô hình hiện tại ở beta:

- Starter: `0đ/tháng + 10%`.
- Growth: `49.000đ/30 ngày + 8%`.
- Pro: `149.000đ/30 ngày + 6%`.

Không thêm buyer fee ở P0. Với người bán đồ cũ giá thấp, hiển thị rõ `Bạn nhận`, `Phí Homeji`, `Người mua trả` trước accept order. Gói trả phí chỉ nên có inventory/analytics/ưu tiên hỗ trợ và rate limit cao hơn; không được mua quyền bỏ qua kiểm duyệt.

Điểm hòa vốn giữa Starter và Growth theo commission thuần là `49.000 / (10%-8%) = 2.450.000đ GMV/tháng`; Growth và Pro là `(149.000-49.000)/(8%-6%) = 5.000.000đ GMV/tháng`. UI nên hiển thị hai mốc này thay vì chỉ gắn “phổ biến nhất”, để người bán tự chọn có lợi.

### 5.5. Dịch vụ hỗ trợ pass phòng

**Giá test:** `99.000đ/case thành công`; không thu lúc tạo draft. Chỉ tạo charge sau khi chủ nhà consent, người nhận được chọn và ba bên xác nhận muốn dùng dịch vụ.

Bao gồm: kiểm tra completeness, thu consent theo workflow, checklist công tơ/tài sản/chìa khóa, điều phối lịch, biên nhận và audit trail. Không bao gồm tư vấn pháp lý, bảo lãnh chủ nhà, giữ cọc hoặc bảo đảm hợp đồng. Nếu Homeji chưa có nhân sự xử lý case và SLA thì chưa mở bán. Luật Kinh doanh bất động sản 29/2023/QH15 quy định điều kiện đối với doanh nghiệp kinh doanh dịch vụ môi giới; việc Homeji thu success commission và tham gia tìm đối tác/đàm phán có thể đi qua ranh giới này, nên phải được luật sư phân loại trước khi thử nghiệm ([Cổng TTĐT Chính phủ](https://vanban.chinhphu.vn/?classid=1&docid=209624&pageid=27160&typegroupid=3), đặc biệt Điều 61–65).

### 5.6. Bảo vệ giao dịch — P2 có điều kiện

Chỉ nghiên cứu tiếp mức `2,5–4%` với sàn/cổng có năng lực giữ và giải ngân tiền; phải tính phí processor trên **toàn bộ dòng tiền**, reserve, chargeback, support và refund. HousingAnywhere thu `25–40%` tháng đầu nhưng đồng thời giữ tháng đầu đến 48 giờ sau move-in và cung cấp scam monitoring/hỗ trợ/hoàn tiền; mức phí không thể tách khỏi dịch vụ này ([HousingAnywhere](https://housinganywhere.com/secure-payments)).

Điều kiện go-live:

1. Luật sư xác nhận vai trò của Homeji/đối tác trong thu hộ, chi hộ, cọc và giải quyết tranh chấp. Nghị định 52/2024/NĐ-CP đặt dịch vụ trung gian thanh toán của tổ chức không phải ngân hàng dưới cơ chế giấy phép NHNN; Homeji không được suy luận rằng ví nội bộ hiện có đồng nghĩa được phép giữ cọc/rent balance hay cash-out P2P ([Cổng TTĐT Chính phủ](https://vanban.chinhphu.vn/?classid=1&docid=210262&orggroupid=2&pageid=27160)).
2. Partner contract có settlement, refund, chargeback, KYC/KYB và SLA.
3. Ledger double-entry, idempotency, reconciliation hằng ngày và reserve.
4. Công khai trường hợp được/không được hoàn, thời hạn evidence và kênh appeal.
5. Pilot tiền nhỏ; không dùng ví marketplace hiện tại làm escrow chỉ vì đã có balance.

## 6. Unit economics giả định

Các số dưới đây là mô hình quyết định, không phải số đã đo. `2,5%` web payment, chi phí support/AI và tỷ lệ store đều là **assumption bảo thủ** cho đến khi có hợp đồng và cohort thật.

| SKU | Gross | Cost giả định | Contribution/order | Margin |
|---|---:|---:|---:|---:|
| Homeji Plus web | 29.000đ | payment 725đ + AI/push 2.000đ + support 3.000đ | 23.275đ | 80,3% |
| Homeji Plus app store | 29.000đ | store 15% + AI/push 2.000đ + support 3.000đ | 19.650đ | 67,8% |
| Homeji Pro web | 99.000đ | payment 2.475đ + AI/support 8.000đ | 88.525đ | 89,4% |
| Boost 7 ngày | 19.000đ | payment 475đ + delivery/support 2.000đ | 16.525đ | 87,0% |
| Pass thành công | 99.000đ | payment 2.475đ + ops 40.000đ | 56.525đ | 57,1% |
| Chợ đồ Starter, AOV 120.000đ | fee 12.000đ | payment allocation 750đ + fraud/refund/support 2.000đ | 9.250đ | 77,1% trên revenue |

Google Play công bố subscription auto-renew ở các thị trường còn áp dụng rollout cũ có service fee `15%`; chính sách vùng có thể thay đổi, nên forecast phải gắn `store`, `country` và `install cohort`, không dùng một tỷ lệ toàn cầu cố định ([Google Play service fees](https://support.google.com/googleplay/android-developer/answer/112622)).

### Công thức cần đưa vào dashboard

- `Net revenue = gross - VAT/withholding - gateway/store fee - refunds - incentives`.
- `Contribution = net revenue - variable AI/storage/notification - trust & safety - support - partner payout`.
- `LTV = ARPPU × gross margin × paid lifetime months`.
- `CAC payback months = blended CAC / monthly contribution per payer`.
- `Boost incrementality = contacts from randomized boosted impressions - counterfactual contacts`.
- `Marketplace take rate = platform fee / completed GMV`, không tính top-up là revenue.

Không dùng số dư ví chưa tiêu, cọc đang giữ hoặc tiền chờ rút làm doanh thu.

## 7. A/B test và metric

### Instrumentation P0

Mọi event có `user_role`, `listing_type`, `plan/SKU`, `price`, `placement`, `experiment_id`, nhưng không gửi nội dung chat/CCCD/địa chỉ chính xác vào analytics:

`paywall_view → plan_select → checkout_start → payment_success/fail → entitlement_granted → feature_used → renewal/cancel/refund`  
`sponsored_impression → listing_open → save → contact → appointment → filled/handed_over`

### Experiments

| Test | Biến thể | Primary metric | Guardrails / kill criteria |
|---|---|---|---|
| Boost SKU | A: 19k/7d; B: 49k/30d; C: Pro 99k | paid conversion; incremental qualified contacts/1.000 impressions | Organic CTR giảm >5%; report rate tăng >20%; không có uplift contact sau 2.000 eligible listings thì dừng. |
| Plus | A: 29k prepaid; B: 39k prepaid | D30 payer retention; weekly paid feature use | Free user contact/appointment rate giảm >3%; complaint >1% payer thì dừng. |
| Pro value | A: boost-only hiện tại; B: analytics + quota refresh, không paid AI score | renewal; filled listing rate | Relevance/NDCG hoặc renter save rate giảm >3%; badge confusion survey >10%. |
| Pass fee | A: 99k success; B: 49k upfront refundable + 50k success | completed handover; ops contribution/case | Owner consent <100%; refund dispute >3%; median ops >60 phút/case thì thiết kế lại. |
| Seller-plan explainer | A: tên plan; B: hiển thị GMV break-even | plan attach; seller net revenue | Downgrade regret/refund và support contacts; không dùng preselect plan đắt. |

Phân tích theo cohort ít nhất 28 ngày, báo confidence interval và effect size; không kết luận chỉ từ conversion paywall. North star nên là `successful, low-dispute housing/marketplace outcomes`, không phải số lượt checkout.

## 8. Payment, App Store và Google Play

- Trên iOS, tính năng số mở khóa trong app như boost, Plus/Pro và subscription phải đi theo In-App Purchase nếu bán trong app; Apple nêu cả quảng cáo/boost hiển thị trong chính app trong phạm vi IAP. Hàng hóa/dịch vụ vật lý tiêu dùng ngoài app và dịch vụ P2P thời gian thực như tour bất động sản dùng phương thức khác theo guideline tương ứng ([Apple App Review Guidelines 3.1.1, 3.1.3(d), (e), (g)](https://developer.apple.com/app-store/review/guidelines/)).
- Forecast iOS nên dùng `30%` làm baseline ngoài chương trình; auto-renew subscription sau hơn một năm trong cùng subscription group là `15%`, và Small Business Program là `15%` nếu được Apple chấp thuận và đáp ứng ngưỡng proceeds. Không tự áp `15%` khi chưa được duyệt ([Apple Schedule 2–3](https://developer.apple.com/support/downloads/terms/schedules/Schedule-2-and-3-English.pdf), [Small Business Program](https://developer.apple.com/news/?id=i7jzeefs)).
- Google Play yêu cầu Play Billing cho digital goods/services trong app trừ chương trình/ngoại lệ áp dụng; subscription phải có giá trị lặp lại, còn boost một lần phải là one-time in-app product, không giả dạng subscription ([Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818), [Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533)).
- Phí marketplace cho món đồ vật lý, tiền thuê/cọc và lao động hỗ trợ bàn giao là giao dịch ngoài app; thiết kế payment rail riêng và để luật sư/store-review kiểm tra trước release. “Lead credit” chỉ mở quyền tương tác trong app vẫn có rủi ro bị coi là digital entitlement.
- Web hiện có MoMo/PayOS. Không hard-code assumption gateway fee; lấy fee schedule từ merchant contract rồi đưa vào `payment_cost_rate` theo provider/method.
- payOS công bố chương trình KLB miễn phí không giới hạn cho khách hàng cá nhân/hộ kinh doanh từ 23/01/2026, nhưng Homeji phải xác nhận doanh nghiệp/pháp nhân và use case có thuộc chương trình hay không trước khi đưa `0đ` vào forecast ([payOS](https://payos.vn/cong-thanh-toan-mien-phi-2026/)).

## 9. Consumer protection, privacy và chống dark pattern

Luật Bảo vệ quyền lợi người tiêu dùng 19/2023/QH15 có hiệu lực 01/07/2024; giao dịch từ xa phải cung cấp thông tin trước hợp đồng, cho người tiêu dùng làm rõ/xác nhận, xem lại và tải hợp đồng đã xác nhận ([CSDL VBPL Bộ Tư pháp, Điều 37–38](https://vbpl.moj.gov.vn/botuphap/Pages/vbpq-toanvan.aspx?ItemID=161263&Keyword=02%2F2002%2FQH11)). Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 có hiệu lực 01/01/2026 ([CSDL quốc gia về VBPL](https://vbpl.vn/bocongan/Pages/vbpq-thuoctinh.aspx?ItemID=179252)); trước go-live cần privacy/legal review theo Luật và Nghị định 356/2025/NĐ-CP.

Từ 01/07/2026, Luật Thương mại điện tử 122/2025/QH15 và Nghị định 248/2026/NĐ-CP đã có hiệu lực. Vì Homeji cho bên thứ ba đăng phòng/đồ/dịch vụ, sản phẩm rất có khả năng thuộc nhóm nền tảng TMĐT trung gian; cần luật sư xác nhận phân loại, pháp nhân chủ quản và đăng ký trước vận hành. Hồ sơ theo cơ chế cũ chỉ nằm trong giai đoạn chuyển tiếp đến hết 30/06/2027 ([Luật 122/2025/QH15](https://vanban.chinhphu.vn/?docid=216503&pageid=27160), [Nghị định 248/2026/NĐ-CP](https://vanban.chinhphu.vn/?classid=0&docid=218747&pageid=27160), [Bộ Công Thương phổ biến quy định mới](https://moit.gov.vn/tin-tuc/bo-cong-thuong-pho-bien-luat-thuong-mai-dien-tu-va-nghi-dinh-so-248-2026-nd-cp.html)).

Checklist go-live theo luật TMĐT mới phải bao gồm: xác thực điện tử người bán trước khi cho bán; kiểm duyệt listing; quy chế và cơ chế phản ánh; công khai tiêu chí chính dùng để ưu tiên/hạn chế hiển thị (do đó paid ranking phải có disclosure); lưu dữ liệu listing/hợp đồng theo thời hạn luật định; và hỗ trợ khiếu nại/tranh chấp. Cần map từng nghĩa vụ sang owner, log và retention policy dựa trên Điều 12, 14, 15, 17, 40 và 41 của văn bản chính thức ([Công báo Chính phủ](https://congbaocdn.chinhphu.vn/180507251028987904/2026/1/27/cong-bao-so-41-ngay-22-01-46939signed-1769482450756911635608.pdf)).

Luật Bảo vệ quyền lợi người tiêu dùng còn đặt yêu cầu riêng cho dịch vụ liên tục từ ba tháng/không xác định thời hạn: hợp đồng bằng văn bản, nêu phí, báo trước kỳ phí/ngày kết thúc và cho lựa chọn gia hạn/chấm dứt. Vì vậy, các gói 180/365 ngày cần notice ledger, self-service cancel và bằng chứng thông báo, không chỉ một cờ `ExpiresAt` ([Luật 19/2023/QH15](https://vanban.chinhphu.vn/?classid=1&docid=208363&pageid=27160&typegroupid=3), [Nghị định 55/2024/NĐ-CP](https://vanban.chinhphu.vn/?docid=210254&pageid=27160)).

### Checklist UX bắt buộc

- Hiển thị **tổng tiền thực thu, thời hạn, auto-renew/prepaid, VAT/phí và refund** trước nút trả tiền; không chỉ nêu giá quy đổi/tháng.
- Không preselect gói trả phí; nút đóng paywall rõ ràng; free option ngang tầm thị giác.
- Không countdown giả, “chỉ còn 1 phòng” giả, social proof giả hoặc che giấu sponsored ranking.
- Cancel cùng kênh và không nhiều bước hơn subscribe; cho tải hóa đơn/lịch sử/điều khoản tại thời điểm mua.
- Trước tăng giá: thông báo giá cũ/mới, ngày áp dụng, lựa chọn hủy; không tự chuyển SKU khác.
- Xin consent riêng cho marketing, personalization và chia sẻ partner; không gộp với điều kiện cần để cung cấp dịch vụ.
- Không dùng dữ liệu chat, ảnh riêng, CCCD, vị trí chính xác hoặc roommate preference cho ad targeting.
- Không mua/bán dữ liệu cá nhân. Nếu có affiliate/partner ads, consent phải tách riêng và nêu nội dung, phương thức, hình thức và tần suất; không coi việc đồng ý Terms là consent quảng cáo. Luật 91/2025/QH15 đã có hiệu lực và quy định chế tài riêng cho mua bán/chuyển dữ liệu ([Cổng TTĐT Chính phủ](https://xaydungchinhsach.chinhphu.vn/quoc-hoi-da-thong-qua-luat-bao-ve-du-lieu-ca-nhan-119250626153701582.htm)).

OECD định nghĩa dark commercial patterns là choice architecture làm suy yếu quyền tự chủ/quyết định của người tiêu dùng ([OECD](https://www.oecd.org/en/publications/dark-commercial-patterns_44f5e846-en.html)). Google Play cấm paywall thiếu nút dismiss, làm mờ giá thật hoặc nhấn giá/tháng khi thu cả kỳ; đồng thời yêu cầu đường dẫn dễ dùng để quản lý/hủy subscription ([Google Play](https://support.google.com/googleplay/android-developer/answer/9900533)). Đây nên là acceptance criteria, không chỉ guideline thiết kế.

## 10. Backlog P0–P2

### P0 — đo lường và doanh thu ít rủi ro (0–8 tuần)

- [ ] Tạo taxonomy `Paid`, `Sponsored`, `Verified`; migration UI bỏ mọi cách hiểu Premium = đáng tin.
- [ ] Thêm funnel events và revenue ledger theo SKU/provider/store/country; dashboard refund, dispute và organic guardrails.
- [ ] Tách paid placement khỏi organic ranking; relevance floor, frequency cap, nhãn `Tài trợ`, “Vì sao thấy tin này”.
- [ ] Thêm SKU Boost 7/30 ngày, entitlement/idempotency, prorate upgrade và auto-refund khi moderation từ chối.
- [ ] Sửa checkout gói hiện tại: tổng tiền nổi bật, thời hạn, prepaid/renewal, refund, invoice; không preselect gói đắt.
- [ ] Hiển thị GMV break-even `2,45 triệu` và `5 triệu` cho seller plan hiện tại.
- [ ] Privacy event schema: cấm PII/chat/CCCD/exact address; retention và access control.
- [ ] Legal review: TMĐT, consumer contract, tax/VAT, wallet/top-up/withdrawal và nội dung điều khoản.
- [ ] Gap assessment Luật TMĐT 122/2025 + NĐ 248/2026: pháp nhân/đăng ký, seller e-KYC, pre-display moderation, ranking disclosure, retention và dispute owner.

### P1 — tách sản phẩm theo vai trò (8–16 tuần)

- [ ] Homeji Plus prepaid `29k/30 ngày` với ít nhất ba recurring features; free baseline như mục 4.
- [ ] Homeji Pro dùng giá hiện tại nhưng thêm analytics, refresh quota, lead calendar và quality recommendations.
- [ ] A/B test bảng mục 7; feature flag, holdout organic và kill switch.
- [ ] Pass-room assisted service `99k success fee`; queue vận hành, SLA, refund, audit, owner consent 100%.
- [ ] Subscription management/cancel/refund self-service; price-change notification và entitlement reconciliation.
- [ ] Chuẩn bị Apple/Google product catalog: subscription cho recurring value, one-time product cho boost.

### P2 — giao dịch có bảo vệ (sau 16 tuần, chỉ khi đủ điều kiện)

- [ ] RFP payment/escrow partner; lấy fee schedule và regulatory responsibility bằng văn bản.
- [ ] Double-entry ledger, settlement/reconciliation, reserve, chargeback/refund/dispute case management.
- [ ] Pilot giữ tiền nhỏ cho pass/đặt lịch; review luật sư và security assessment trước production.
- [ ] Chỉ sau pilot mới định giá protection theo actual loss + ops + processor cost; không sao chép take-rate quốc tế.
- [ ] Partner marketplace (chuyển nhà, internet, vệ sinh) chỉ khi disclosure `Homeji có thể nhận hoa hồng`; consent riêng, không bán lead thô.

## 11. Quyết định nên chốt ngay

1. Giữ giá Premium hiện tại trong ngắn hạn nhưng **ngừng quảng bá cho renter** cho tới khi Homeji Plus có recurring value.
2. SKU đầu tiên cần ship là `Boost 7 ngày 19.000đ`, vì dùng được hạ tầng entitlement/payment hiện tại và đo incremental outcome rõ nhất.
3. Tách `Pro/Paid` khỏi `Verified` trước khi nhận thêm tiền.
4. Chợ đồ tiếp tục commission + seller plan; hiển thị break-even và seller net amount, chưa thêm buyer fee.
5. Pass phòng thu theo case thành công sau consent; không thu phí chỉ để nộp hồ sơ hoặc được “xác minh”.
6. Không thu phần trăm tiền thuê/cọc trước khi có đối tác giữ tiền, refund/dispute SLA và legal sign-off.
