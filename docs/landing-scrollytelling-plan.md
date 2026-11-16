# Plan: Landing Homeji — Hành trình thuê một căn phòng

Trạng thái: **đã duyệt (bản 4)**, phạm vi chuyển động đổi ngày 13/11/2026. Thứ tự build nằm ở [landing-build-plan.md](landing-build-plan.md).

Thay đổi so với bản 3: gộp phần bản đồ và danh sách phòng thành **một phân cảnh cố định "Tìm phòng quanh bạn"**. Phân cảnh này dùng dữ liệu trực tiếp từ API, có Google Maps và khung tìm kiếm để người dùng tìm một địa điểm rồi xem các tin đăng gần đó. Các cảnh còn lại vẫn kể quá trình thuê trọ, có chữ giới thiệu website hiện ra theo cuộn.

Giữ nguyên: cuộn là đi xuống (trừ phân cảnh cố định), ảnh chân thực do AI tạo, không dùng logo cho animation.

**Đổi phạm vi (13/11/2026):** bỏ scrub hai chiều. Hiệu ứng mỗi cảnh **chạy một lần** khi cuộn xuống tới cảnh đó; cuộn ngược lên thì cảnh giữ nguyên trạng thái cuối, không chạy lùi. Bỏ chiều đi lên của vòng lặp; chỉ còn vòng lặp một chiều đi xuống (mục 7).

## 1. Nguyên tắc nội dung

- **Chỉ nói điều Homeji thật sự có.** Mỗi câu giới thiệu dựa trên tính năng đang có trong code (ghi ở dòng "Dựa trên"). Không bịa số liệu hay testimonial; chỉ dùng 3 chỉ số đã có trên landing cũ.
- **Không hứa giữ tiền cọc.** Homeji không làm trung gian giữ cọc. Landing chỉ nói Homeji giúp người thuê *kiểm tra trước khi cọc*.
- **Rủi ro được nói như tình huống thường gặp**, không quy kết ai và không đưa con số không có nguồn.
- **Giọng văn:** tiếng Việt, ngắn, thực dụng, xưng "bạn". Không eyebrow chữ in hoa, không chuỗi "A · B · C", không mũi tên "→" trong nút.
- Toàn bộ copy dưới đây là **bản nháp để bạn duyệt**.

## 2. Nguyên tắc chuyển động

1. **Cuộn là đi xuống.** Các cảnh kể chuyện không ghim: mỗi section trôi lên đúng tốc độ tay. Khi mép trên section chạm khoảng 72% chiều cao màn hình, hiệu ứng vào cảnh **chạy một lần** theo thời gian (không theo quãng cuộn). Cuộn lên không đảo ngược hiệu ứng; cảnh đã nằm phía trên màn hình (deep link, tải lại giữa trang) hiện thẳng ở trạng thái cuối.
2. **Ngoại lệ duy nhất là phân cảnh cố định "Tìm phòng quanh bạn"** (mục 4): khi tới nơi, nó đứng yên chiếm trọn màn hình để người dùng thao tác.
3. **Lớp sâu.** Nền ảnh trôi chậm (0.6–0.8x), chữ 1x, chi tiết tiền cảnh nhanh hơn (1.15–1.3x).
4. **Chữ hiện ra theo cuộn, mỗi cảnh một kiểu** (bảng ở mục 6).
5. **Ảnh thật của sản phẩm.** Màn hình điện thoại hoặc laptop trong ảnh AI được thay bằng **ảnh chụp giao diện Homeji thật**.

## 3. Các phân cảnh

Chiều cao ghi trong ngoặc là chiều cao section, quyết định quãng cuộn dành cho hiệu ứng.

### Cảnh 1 — Mở đầu (#hero) · 160vh

- **Ảnh dọc:** con hẻm nhà trọ quanh Thủ Đức lúc sáng sớm, cột điện dán chi chít giấy rao "cho thuê phòng" (chữ trong ảnh mờ, không đọc được), dãy nhà trọ phía sau, mặt hẻm bên dưới.
- **Chữ hiện ra:**
  1. (có ngay khi tải trang) **"Trọ an tâm. / Nâng tầm cuộc sống."**
  2. "Tìm phòng phù hợp. Gặp người cùng nhịp sống tại TP.HCM."
  3. Ô tìm kiếm "Bạn muốn ở khu vực nào?" + nút "Tìm phòng". Gửi tìm kiếm sẽ chuyển từ khóa xuống phân cảnh cố định (cảnh 5) và cuộn tới đó.
  4. Ba chỉ số: 1.500+ phòng trọ TP.HCM, 800+ bạn trẻ đã kết nối, Xác minh chính chủ 100%.
  5. "Muốn lưu phòng và xem số liên hệ? Tạo tài khoản miễn phí".
- **Hiệu ứng: hạ máy dọc cột điện.** Ảnh trôi chậm, khung nhìn lướt từ ngọn cột điện xuống đám giấy rao rồi xuống mặt hẻm. Khi tới đám giấy rao, ảnh phóng nhẹ vào đó, dẫn sang cảnh 2.

### Cảnh 2 — Tự tìm trọ, bạn thường gặp gì? (#mission, phần 1) · 170vh

- **Ảnh:** cận cảnh mảng giấy rao chồng lớp trên cột điện; tay cầm điện thoại lúc tối, màn hình trống.
- **Chữ hiện ra:** tiêu đề **"Tự tìm trọ, bạn thường gặp gì?"**, rồi bốn tình huống, mỗi cái như một mẩu giấy rao dán lên:
  1. "Ảnh đăng một kiểu, phòng thật một kiểu."
  2. "Giá báo một con số, tới nơi phát sinh thêm phí."
  3. "Bị giục chuyển cọc khi chưa kịp xem phòng."
  4. "Không biết người cho thuê thật sự là ai."
- **Hiệu ứng: giấy rao dán lên khi đi qua.** Mỗi mẩu là chữ in trên texture giấy thật, trôi lên với tốc độ khác nhau và xoay lệch nhẹ; tới giữa màn hình thì "dán" vào (xoay về 0°, bóng đổ co lại).

### Cảnh 3 — Lời hứa của Homeji (#mission, phần 2) · 160vh

- **Ảnh:** bàn tay gỡ mảng giấy rao khỏi cột điện, phía sau là con hẻm sạch dưới nắng; hai ảnh phố Thủ Đức và Quận 9.
- **Chữ hiện ra:**
  - **"Không chỉ tìm phòng — tìm nơi bạn thuộc về."** (sáng dần theo từng chữ)
  - "Homeji kết nối người tìm phòng, bạn ở ghép và chủ nhà quanh Thủ Đức và Quận 9. Tin đăng được kiểm duyệt, chủ nhà được xác minh, mọi trao đổi nằm trong một nơi."
  - Hai khu vực Thủ Đức và Quận 9 (lấy từ `GUEST_DISTRICTS`).
- **Hiệu ứng: gỡ giấy.** Bốn mẩu giấy của cảnh 2 bong lên và bay vượt khỏi màn hình nhanh hơn trang, lộ con hẻm sạch phía sau. Mỗi mẩu để lại một gạch chân xanh, sẽ hiện lại dưới câu trả lời tương ứng ở các cảnh sau.

### Cảnh 4 — Tin đã duyệt, chủ nhà đã xác minh · 160vh

- **Ảnh:** hành lang nhà trọ một điểm tụ, cửa phòng hai bên.
- **Chữ hiện ra:**
  - **"Mỗi tin đều được xem qua trước khi bạn thấy"**
  - "Tin cho thuê chỉ công khai sau khi đội kiểm duyệt Homeji xem qua."
  - Huy hiệu **"Chủ nhà đã xác minh"** kèm ba tiêu chuẩn, mỗi dòng hiện khi cuộn tới:
    1. "Đối chiếu danh tính và CCCD gắn chip"
    2. "Hình ảnh thực tế, không chỉnh sửa ảo"
    3. "Giá cam kết minh bạch, không phí ẩn"
- **Hiệu ứng: đóng dấu duyệt.** Huy hiệu từ to và mờ thu về đúng kích thước như con dấu đóng xuống. Ba tiêu chuẩn có vệt bút dạ xanh quét qua từng dòng theo quãng cuộn. Ảnh hành lang trôi chậm và tiến lên nhẹ, dẫn vào cảnh 5. Đây là câu trả lời cho tình huống 1, 2 và 4.
- **Dựa trên:** `VerifiedBadgeModal` (3 tiêu chuẩn), ghi chú "Tin chỉ công khai sau khi được duyệt" ở form đăng tin.

---

### Cảnh 5 — Tìm phòng quanh bạn: PHÂN CẢNH CỐ ĐỊNH (#map, bên trong có #listings) · 100svh

Đây là phân cảnh làm việc chính của landing: bản đồ, danh sách tin và khung tìm kiếm, tất cả dùng dữ liệu thật.

**Cách vào và ra (giữ cảm giác đi xuống):**

- **Đi vào:** khung bản đồ trồi lên từ đáy màn hình ở tư thế nằm nghiêng như mặt bàn (`rotateX` 55°) và dựng thẳng dần theo quãng cuộn. Phía trên khung là tiêu đề **"01 · Tìm phòng quanh nơi bạn muốn ở"**. Khi mép trên của phân cảnh còn cách đỉnh màn hình dưới 15%, trang trượt nốt cho khớp (snap) và phân cảnh đứng yên, chiếm trọn màn hình.
- **Ở trong:** cuộn chuột hoặc vuốt trong danh sách thì cuộn danh sách; thao tác trên bản đồ thì kéo và zoom bản đồ. Trang không bị cuốn theo (Lenis bỏ qua vùng này nhờ `data-lenis-prevent`).
- **Đi ra:**
  - Cuộn tiếp khi danh sách đã ở cuối thì trang tiếp tục đi xuống sang cảnh 6.
  - Cuộn lên khi danh sách đang ở đầu thì quay lại cảnh 4.
  - Có thêm nút "Tiếp tục xem Homeji" ở mép dưới cho người không muốn cuộn hết danh sách.
  - Bàn phím: Tab đi qua các thẻ và nút trong phân cảnh. Thẻ nào nhận focus thì danh sách cuộn tới thẻ đó.
- **Vòng lặp** không bao giờ kích hoạt khi đang ở trong phân cảnh này.

**Bố cục desktop (≥ 1024px):**

```
┌───────────────────────────────────────────────────────────────┐
│ [ Khung tìm kiếm địa điểm……………… ] [Bán kính 1 km|2 km|3 km]   │
│ [Phòng trọ] [Căn hộ] [Giá ▾] [Quận/Phường ▾] [Gần trường ▾]   │
├──────────────────────┬────────────────────────────────────────┤
│ 18 phòng trong 2 km  │                                        │
│ quanh ĐH Nông Lâm    │        Google Maps                     │
│ ┌──────────────────┐ │   ● điểm đã tìm + vòng bán kính        │
│ │ ảnh │ giá, m²     │ │   ● ghim từng tin (cụm khi dày)       │
│ │     │ cách 650 m  │ │                                       │
│ └──────────────────┘ │   [Tìm trong khu vực này]  [Vị trí    │
│ … danh sách cuộn …   │                              của tôi] │
├──────────────────────┴────────────────────────────────────────┤
│                     Tiếp tục xem Homeji                       │
└───────────────────────────────────────────────────────────────┘
```

**Bố cục mobile (< 1024px):** khung tìm kiếm nằm trên cùng; bản đồ chiếm khoảng 55% chiều cao; bên dưới là dải thẻ phòng kéo ngang (scroll-snap), kéo lên được để mở rộng thành danh sách dọc. Bản đồ dùng `gestureHandling: 'cooperative'`: một ngón tay vẫn cuộn trang, hai ngón tay mới kéo bản đồ, nên người dùng không bị kẹt lại trong phân cảnh.

**Khung tìm kiếm (hành vi chi tiết):**

1. Gõ từ 2 ký tự trở lên thì hiện gợi ý sau 250ms, gồm hai nhóm:
   - **Khu vực Homeji:** quận và phường trong `GUEST_DISTRICTS` / `GUEST_WARDS`, các trường gần (`useNearbyGuestSchools`). Nhóm này có sẵn, không tốn lượt gọi Google.
   - **Địa điểm Google:** `fetchPlacePredictions`, dùng session token của Places để gộp phí theo phiên.
2. Chọn một gợi ý thì gọi `resolvePlaceCoordinates`. Bản đồ bay tới đó, cắm một ghim điểm tìm, vẽ vòng bán kính.
3. Nhấn Enter mà không chọn gợi ý thì dùng `resolveSearchLocation` / `searchPlaceByText`. Không ra địa điểm thì tìm theo từ khóa trong tin đăng (`keyword`).
4. Lấy tin gần đó:
   - **Tin Homeji:** `searchRentalMapInventory({ ...bộ lọc, ...bboxAround(lat, lng, bánKính) })`.
   - **Tin từ nguồn khác:** `getRentalSourceCatalog()`, lọc ở client theo khoảng cách tới điểm tìm (chỉ những tin có tọa độ).
   - Gộp hai nguồn, tính khoảng cách đường thẳng, sắp theo gần nhất. Mỗi thẻ ghi "cách 650 m".
5. Kéo hoặc zoom bản đồ sang chỗ khác thì hiện nút **"Tìm trong khu vực này"**: tìm theo khung đang nhìn thấy (bounds của bản đồ), không tự gọi API mỗi lần kéo.
6. Nút **"Vị trí của tôi"** dùng định vị trình duyệt, xin quyền khi bấm. Bị từ chối thì báo nhẹ và giữ nguyên kết quả.
7. Bộ lọc Phòng trọ/Căn hộ, mức giá, quận/phường, gần trường áp lên kết quả hiện tại. Mỗi lần đổi lọc, request cũ bị hủy (`AbortController`).
8. Trạng thái tìm kiếm được ghi lên URL (`?q=…&r=2`), nên chia sẻ link hoặc tải lại trang vẫn giữ kết quả. Không ghi tọa độ "Vị trí của tôi" lên URL.

**Liên kết danh sách và bản đồ:**

- Rê chuột lên thẻ thì ghim tương ứng nổi lên; bấm ghim thì thẻ tương ứng được cuộn tới và tô viền.
- Bấm thẻ hoặc ghim thì mở chi tiết phòng thật: `RoomDetailModal` cho tin Homeji, `SourceRoomDetail` cho tin nguồn khác. Modal giữ cuộn gốc.
- Ghim dày thì gom cụm (`@googlemaps/markerclusterer` đã có sẵn).
- Thẻ có huy hiệu "Chủ nhà đã xác minh" nếu chủ nhà đã xác minh. Đây là chỗ nối với cảnh 4.

**Khách chưa đăng nhập:**

- Nút lưu phòng mở modal đăng nhập; sau khi đăng nhập thì lưu đúng phòng đó.
- Số điện thoại chỉ hiện sau khi đăng nhập (giữ đúng hành vi hiện có).

**Các trạng thái:**

- **Đang tải:** khung thẻ giả (skeleton) trong danh sách, thanh tiến trình mảnh trên bản đồ.
- **Lỗi API:** "Chưa tải được danh sách phòng." + nút **"Thử lại"**. Bản đồ vẫn dùng được.
- **Không có kết quả:** "Chưa có phòng trong bán kính 2 km quanh đây." + nút **"Mở rộng tới 3 km"** và nút **"Xem toàn khu Thủ Đức – Quận 9"**.
- **Google Maps không tải được** (mất mạng, hết hạn mức): ẩn bản đồ, danh sách chiếm toàn bộ chiều rộng, ghi "Bản đồ đang tạm thời không khả dụng. Bạn vẫn xem được danh sách phòng."
- **Mặc định khi chưa tìm gì:** hiện toàn bộ tin quanh khu Thủ Đức – Quận 9 (`GUEST_DEFAULT_FOCUS`), sắp theo mới nhất.

**Tải tài nguyên:**

- Google Maps JS và Places chỉ được tải khi phân cảnh còn cách màn hình khoảng một màn hình. Dữ liệu tin cũng chỉ gọi lúc đó.
- Ô tìm kiếm ở hero dùng gợi ý khu vực có sẵn, chưa cần tải Google cho tới khi người dùng chọn địa điểm.

**Deep link:**

- `/#map`, `/explore` và `/?section=listings` đi thẳng tới phân cảnh này.
- `/?section=listings&view=list` đi tới phân cảnh và mở rộng danh sách (trên mobile là danh sách dọc).

**Dựa trên:** `searchRentalMapInventory`, `getRentalSourceCatalog`, `fetchPlacePredictions`, `resolvePlaceCoordinates`, `searchPlaceByText`, `bboxAround`, `RentalMap`, `MapPlaceDetailPanel`, `MapNearbyPanel`, `RoomDetailModal`, `SourceRoomDetail`, `GUEST_DISTRICTS`, `GUEST_WARDS`, `useNearbyGuestSchools`. Chỉ dùng lại component ở mức dữ liệu và logic; giao diện phân cảnh viết mới.

---

### Cảnh 6 — 02 · So sánh và hỏi đúng câu (#how, phần 1) · 170vh

- **Ảnh:** hai phòng trọ khác nhau (hai ảnh dọc); laptop trên bàn học, màn hình là **ảnh chụp bảng so sánh phòng thật của Homeji**.
- **Chữ hiện ra:**
  - **"02"**, **"So sánh trước khi chọn"**
  - "Đặt các phòng cạnh nhau: giá thuê, chi phí đã tính mỗi tháng, vị trí."
  - "Homeji gợi ý những câu nên hỏi chủ nhà, ví dụ:" rồi lần lượt hiện từng câu như tin nhắn:
    - "Chi phí điện nước và dịch vụ tính thế nào ạ?"
    - "Chi phí dự kiến mỗi người đã gồm những khoản nào?"
- **Hiệu ứng: hai phòng tách ra.** Hai ảnh phòng bắt đầu chồng lên nhau rồi tách ra hai bên khi trôi lên, ở giữa hiện bảng so sánh. Câu hỏi gợi ý hiện như bong bóng chat, gõ từng chữ một lần khi cảnh hiện ra. Trả lời tình huống 2.
- **Dựa trên:** `RentalComparison`, `RentalDecisionResults`, `rentalOwnerQuestions.ts`, câu gợi ý trong `RoomDetailModal`.

### Cảnh 7 — 03 · Trao đổi và hẹn xem phòng (#how, phần 2) · 170vh

- **Ảnh:** người thuê đứng trước cửa phòng trọ, chủ nhà mở cửa (nhìn từ phía sau); điện thoại với màn hình là **ảnh chụp lịch xem phòng thật**.
- **Chữ hiện ra:**
  - **"03"**, **"Trao đổi rồi hẹn xem phòng"**
  - "Nhắn người đăng ngay trong Homeji. Chọn giờ bạn rảnh, chờ chủ trọ xác nhận lịch xem."
  - "Số điện thoại chỉ hiện khi bạn đã đăng nhập."
  - "Muốn ở ghép? Gửi lời mời và kết nối bạn cùng phòng."
- **Hiệu ứng: đường đi vẽ theo quãng cuộn.** Một đường SVG chạy dọc trang nối ba mốc "Nhắn tin", "Chọn giờ", "Chủ trọ xác nhận"; mỗi mốc sáng lên khi đường chạm tới. Ảnh cửa phòng mở bằng mặt nạ tròn nở ra từ mốc cuối. Trả lời tình huống 3.
- **Dựa trên:** chat, `MapAppointmentsPanel` / "Đặt lịch xem phòng", nhãn "Đăng nhập để xem số điện thoại", lời mời ở ghép.

### Cảnh 8 — 04 · Trước khi quyết định (#start) · 180vh

- **Ảnh:** bàn tay cầm bút đánh dấu vào tờ giấy kiểm tra trên bàn trong phòng trọ trống.
- **Chữ hiện ra:**
  - **"04"**, **"Trước khi quyết định"**
  - Ba cam kết (đúng copy landing cũ):
    1. "Xem tin miễn phí" — "Tạo tài khoản khi bạn muốn lưu phòng hoặc xem số liên hệ."
    2. "Ưu tiên khu vực gần trường" — "Đối chiếu vị trí, giá và tiện ích với nhu cầu đi học của bạn."
    3. "Theo dõi trao đổi" — "Lời mời, tin nhắn và thông báo giúp bạn nắm được tiến độ."
  - Dòng chốt: **"Thấy dấu hiệu lừa đảo hoặc bị đòi chuyển tiền trước? Báo cáo tin để đội kiểm duyệt Homeji xem xét."**
- **Hiệu ứng: đánh dấu từng dòng.** Dấu tích được vẽ bằng nét SVG đúng lúc dòng đó trôi qua giữa màn hình; cuộn lên thì dấu tích tự xóa. Dòng chốt trượt vào từ trái trong khung đỏ nhạt. Trả lời tình huống 3.
- **Dựa trên:** copy `GuestJourney` cũ, `ReportListingButton`.

### Cảnh 9 — Dành cho chủ nhà · 140vh

- **Ảnh:** chủ nhà chụp ảnh căn phòng bằng điện thoại (nhìn từ phía sau).
- **Chữ hiện ra:**
  - **"Bạn có phòng cho thuê?"**
  - "Đăng tin, gửi duyệt, rồi nhận tin nhắn và lịch xem phòng từ người thuê trong cùng một nơi."
  - "Xác minh chủ nhà để tin của bạn có huy hiệu Chủ nhà đã xác minh."
  - Nút **"Đăng tin"** (tới `/posts/new`).
- **Hiệu ứng:** màn hình điện thoại của chủ nhà nở ra thành một thẻ phòng Homeji (ảnh chụp thẻ thật) khi trôi lên.

### Cảnh 10 — Nhận phòng (kết + footer) · 150vh

- **Ảnh dọc:** bàn tay cầm chìa khóa mở cửa một căn phòng sáng đèn; con hẻm buổi tối bên dưới.
- **Chữ hiện ra:** **"Căn phòng tiếp theo của bạn đang chờ."**; CTA **"Tạo tài khoản"**, **"Đăng tin"**, **"Đăng nhập"**; footer có link /terms và /privacy.
- **Hiệu ứng:** cánh cửa (tiền cảnh) trôi nhanh hơn trang và vượt khỏi màn hình, lộ con hẻm phía dưới. Con hẻm tiếp tục trôi và hòa vào con hẻm buổi sáng của cảnh 1: đó là cầu nối vòng lặp.

## 4. Đối chiếu: tình huống ↔ câu trả lời

| Tình huống ở cảnh 2 | Được trả lời ở |
| --- | --- |
| Ảnh đăng một kiểu, phòng thật một kiểu | Cảnh 4: "Hình ảnh thực tế, không chỉnh sửa ảo" |
| Giá báo một con số, phát sinh thêm phí | Cảnh 4: "Giá cam kết minh bạch" + Cảnh 6: so sánh chi phí, câu hỏi gợi ý |
| Bị giục chuyển cọc khi chưa xem phòng | Cảnh 7: hẹn xem có xác nhận + Cảnh 8: báo cáo tin |
| Không biết người cho thuê là ai | Cảnh 4: "Đối chiếu danh tính và CCCD gắn chip" + Cảnh 5: huy hiệu trên từng thẻ |

## 5. Header

Header cố định: **Về Homeji** (#mission), **Tìm phòng** (cảnh 5), **Cách dùng** (#how), **Đăng tin**, **Đăng nhập**. Hai link "Danh sách phòng" và "Bản đồ" cũ gộp thành **"Tìm phòng"**, vì giờ cả hai nằm chung một phân cảnh. Header tự đổi màu theo nền section và chừa chỗ bên phải cho nút theme nổi.

## 6. Bảng kỹ thuật, để thấy sự đa dạng

| Cảnh | Kiểu chuyển động | Kiểu chữ hiện ra |
| --- | --- | --- |
| 1 | Ảnh dọc trôi chậm + phóng vào giấy rao | Chữ hero có sẵn, các dòng sau trượt lên từ sau mặt nạ |
| 2 | Giấy rao trôi lệch tốc độ rồi "dán" vào | Chữ in trên texture giấy |
| 3 | Giấy bong ra bay vượt màn hình | Sáng dần theo từng chữ |
| 4 | Hành lang trôi chậm, tiến lên | Huy hiệu đóng dấu + bút dạ quét từng dòng |
| 5 | Mặt bàn bản đồ dựng thẳng rồi khớp vào màn hình, đứng yên | Tiêu đề trượt lên; kết quả tìm kiếm hiện theo thao tác |
| 6 | Hai ảnh chồng nhau tách ra hai bên | Bong bóng chat gõ từng chữ |
| 7 | Đường SVG vẽ theo cuộn + mặt nạ tròn | Mốc sáng lên khi đường chạm tới |
| 8 | Dòng trôi qua giữa màn hình | Dấu tích vẽ bằng nét SVG |
| 9 | Màn hình điện thoại nở thành thẻ phòng | Tách theo từng câu |
| 10 + cầu nối | Tiền cảnh vượt lên lộ hậu cảnh, shader hòa tối → sáng | Chữ lớn co lại vào giữa |

## 7. Vòng lặp một chiều (đi xuống)

- **Đi xuống:** hết cảnh 10, con hẻm buổi tối hòa thành con hẻm buổi sáng. Khi phần cuối cầu nối lấp đầy màn hình, nó trùng khít với màn đầu cảnh 1, lúc đó trang nhảy tức thời về đỉnh cảnh 1. Vì hiệu ứng suy ra từ vị trí cuộn nên không nhìn thấy cú nhảy.
- **Đi lên:** không có. Ở đầu trang mà cuộn lên thì trang dừng như bình thường; không có cầu nối trên.
- Sau khi nhảy về cảnh 1, các cảnh đã chạy hiệu ứng giữ nguyên trạng thái cuối, không chạy lại.
- **Giữ quán tính:** khi nhảy, cộng phần chênh vị trí để cú vuốt đang dở không bị khựng.
- **Cấu trúc:** `[Cảnh 1 … Cảnh 10][Cầu nối dưới]`. Cầu nối bị ẩn khỏi trình đọc màn hình, không nhận focus. Không dùng `infinite: true` của Lenis vì xung đột với bản đồ.
- **Ngoại lệ:**
  - `prefers-reduced-motion`: không lặp, không parallax, không snap; trang cuộn bình thường, đủ chữ, phân cảnh 5 vẫn dùng đầy đủ.
  - Phím Home/End và deep link: đi thẳng tới section.
  - Đang ở trong phân cảnh 5 hoặc đang mở dialog: không kích hoạt nhảy.

## 8. Danh sách ảnh

**Ảnh AI (chân thực):** ảnh chụp thật, ống kính 35mm, ánh sáng tự nhiên, ngoại ô TP.HCM, không logo, chữ trong ảnh luôn mờ, không cận mặt người.

| Mã | Cảnh | Ảnh | Tỉ lệ |
| --- | --- | --- | --- |
| A1 | 1 | Hẻm nhà trọ sáng sớm, cột điện dán giấy rao | 2:3 |
| A2 | 2 | Cận cảnh mảng giấy rao chồng lớp | 3:2 |
| A3 | 2 | Tay cầm điện thoại lúc tối, màn hình trống | 4:5 |
| A4 | 2–3 | Texture tờ giấy rao trắng (nền cho chữ) | 1:1 |
| A5 | 3 | Tay gỡ giấy rao, hẻm sạch phía sau | 2:3 |
| A6 | 3 | Phố Thủ Đức | 4:5 |
| A7 | 3 | Đường Lê Văn Việt, Quận 9 | 4:5 |
| A8 | 4 | Hành lang nhà trọ một điểm tụ | 3:2 |
| A9 | 6 | Phòng trọ A | 4:5 |
| A10 | 6 | Phòng trọ B (khác phong cách A9) | 4:5 |
| A11 | 6 | Laptop trên bàn học, màn hình trống để ghép | 3:2 |
| A12 | 7 | Người thuê trước cửa, chủ nhà mở cửa (nhìn từ sau) | 2:3 |
| A13 | 8 | Tay đánh dấu tờ kiểm tra trong phòng trống | 3:2 |
| A14 | 9 | Chủ nhà chụp ảnh phòng bằng điện thoại (nhìn từ sau) | 4:5 |
| A15 | 10 | Tay cầm chìa khóa mở cửa phòng sáng đèn, hẻm tối bên dưới | 2:3 |
| A16 | cầu nối | Hẻm buổi tối hòa sang buổi sáng, phần dưới khớp với phần trên của A1 | 2:3 |

Khoảng 16 lần tạo, chưa tính tạo lại. Phân cảnh 5 không cần ảnh AI: nó dùng bản đồ và ảnh tin đăng thật từ API.

**Ảnh chụp giao diện Homeji thật** (chụp từ app chạy local với dữ liệu mẫu, không lộ dữ liệu người dùng thật): bảng so sánh phòng, lịch xem phòng, thẻ phòng. Ghép vào màn hình trống của A11, A12, A14.

- **Rủi ro:** cặp A1/A16 cần khớp bố cục. Tạo A1 trước rồi tạo A16 dựa trên A1; nếu lệch thì shader hòa ở cầu nối che được độ lệch nhỏ.
- **Xuất ảnh:** WebP 1920px và 960px, trong `public/landing/scenes/`. Mỗi cảnh chỉ tải ảnh khi tới gần. Tổng dung lượng ảnh mục tiêu dưới 3 MB.

## 9. Kiến trúc code (bản chính, do Cursor viết)

- `src/components/landing/HomejiLanding.tsx`: ghép 10 cảnh, giữ các id `hero`, `mission`, `map`, `listings`, `how`, `start` để deep link không đổi.
- `src/components/landing/landingCopy.ts`: toàn bộ chữ ở một chỗ để duyệt và sửa copy.
- `src/components/landing/scroll/useLandingScroll.ts`: Lenis + ScrollTrigger, `prevent` cho dialog, Google Maps và vùng `data-lenis-prevent`; cleanup khi unmount.
- `src/components/landing/scroll/useSceneReveal.ts`: hiệu ứng vào cảnh chạy một lần khi cuộn xuống (ScrollTrigger `once`), không scrub, không ghim.
- `src/components/landing/scroll/useParallaxLayers.ts`, `textReveals.ts`: tốc độ lớp và các kiểu chữ hiện ra dùng chung.
- `src/components/landing/scroll/useLoopBridge.ts`: nhảy vòng lặp, giữ quán tính, khóa khi đang ở phân cảnh 5; có test cho phần tính vị trí đích.
- `src/components/landing/explore/`: phân cảnh cố định.
  - `ExploreScene.tsx`: bố cục, snap vào, các cửa ra.
  - `ExploreSearch.tsx`: khung tìm kiếm và gợi ý hai nhóm.
  - `useNearbyListings.ts`: gọi API theo điểm hoặc khung bản đồ, gộp hai nguồn, tính khoảng cách, sắp xếp, hủy request cũ. Phần gộp, tính khoảng cách và sắp xếp tách thành hàm thuần, có test.
  - `exploreUrlState.ts`: đọc/ghi `?q=&r=`, có test.
- `src/components/landing/scenes/Scene*.tsx`: các cảnh kể chuyện, mỗi cảnh một timeline vào cảnh, chạy một lần.
- three.js chỉ dùng cho shader ở cầu nối: lazy-load, dừng render khi khuất màn hình hoặc tab ẩn, dispose khi unmount.
- Root `.hl` có `data-glass-exclude`; thêm `.hl-header__mark` vào `LOGO_TARGETS` của BrandIntro.
- Chỉ dùng thư viện có sẵn (gsap, lenis, three, @googlemaps/markerclusterer). Font Bricolage Grotesque cần `@fontsource-variable/bricolage-grotesque`, sẽ hỏi lại trước khi cài.

## 10. Thứ tự làm và điểm duyệt

1. **Duyệt plan** này, gồm cả copy.
2. **Preview live phân cảnh 5 trước**, vì đây là phần thao tác chính: chạy trên dev server với API thật (hoặc dữ liệu giả nếu backend không truy cập được), đủ tìm kiếm, bản đồ, danh sách, các trạng thái. Bạn thao tác thử và duyệt.
3. **Tạo ảnh** bằng Figma AI (cần bạn đồng ý dùng credit) và chụp giao diện thật cho các cảnh kể chuyện.
4. **Preview live toàn trang** trong `tmp/` với ảnh thật, chữ và vòng lặp.
5. **Bản chính:** giao Cursor từng phần trong tab Cursor chat để bạn theo dõi; tôi kiểm tra từng phần bằng build, lint, test và ảnh chụp 1440 và 390px.

## 11. Cần bạn quyết

1. Gộp header thành **"Tìm phòng"** thay cho hai link "Danh sách phòng" và "Bản đồ"?
2. Bán kính mặc định khi tìm quanh một điểm: **2 km** (đề xuất), cho chọn 1 / 2 / 3 km?
3. Làm **preview phân cảnh 5 trước** (đề xuất), rồi mới tạo ảnh cho các cảnh kể chuyện?
4. Giữ **cảnh 9 "Dành cho chủ nhà"**?
5. ~~Vòng lặp áp dụng cho toàn bộ landing?~~ Đã chốt 13/11/2026: giữ vòng lặp **một chiều đi xuống** (cuối cảnh 10 về cảnh 1), không có chiều đi lên.
6. Đồng ý dùng **Figma AI** (tốn credit) để tạo khoảng 16 ảnh?
7. Trong ảnh có người (nhìn từ phía sau, chỉ thấy tay/lưng) hay chỉ cảnh vật?
