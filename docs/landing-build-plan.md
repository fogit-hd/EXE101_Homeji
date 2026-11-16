# Kế hoạch build landing Homeji (bản 5)

Trạng thái: **chờ duyệt**. Nội dung và copy từng cảnh vẫn theo [landing-scrollytelling-plan.md](landing-scrollytelling-plan.md). File này nói **làm theo thứ tự nào, ai làm, xong thì trông thế nào**.

## Các yêu cầu đã chốt

| Yêu cầu | Nguồn |
| --- | --- |
| 10 cảnh kể chuyện quá trình thuê trọ; cuộn là đi xuống | plan bản 4 |
| Chỉ cảnh 5 "Tìm phòng quanh bạn" đứng yên, dùng Google Maps, API thật và ô tìm kiếm | plan bản 4 |
| Toàn landing theo thế giới **"Sổ tìm trọ"**: giấy ô li, lề đỏ, mực bi xanh, Be Vietnam Pro 800 + Patrick Hand, bút dạ quang xanh chỉ cho một điểm, băng keo giấy | chốt 12/11 |
| **Claude thiết kế và code UI.** Cursor chỉ làm logic/dữ liệu nếu cần | chốt 12/11 |
| Hiệu ứng vào cảnh **chạy một lần** khi cuộn xuống; cuộn lên không chạy lùi | chốt 13/11 |
| Vòng lặp **một chiều đi xuống**: hết cảnh 10 thì về cảnh 1; không có chiều đi lên | chốt 13/11 |
| Ảnh chân thực do AI tạo; không dùng logo cho animation | plan bản 4 |
| Không bịa số liệu (chỉ 3 chỉ số cũ), không hứa giữ cọc, copy tiếng Việt | plan bản 4 |

## Cách thế giới "Sổ tìm trọ" áp vào 10 cảnh

Mỗi cảnh là **một trang sổ**. Ảnh AI không phủ kín nền: chúng là **ảnh in dán vào trang** bằng băng keo, nghiêng nhẹ. Chữ in đậm là tiêu đề trang, chữ viết tay là ghi chú bên lề.

| Cảnh | Trang sổ | Hiệu ứng vào cảnh (chạy một lần) |
| --- | --- | --- |
| 1 · Mở đầu | Trang bìa: ảnh hẻm dán giữa trang, tiêu đề + ô tìm "Bạn muốn ở khu vực nào?", 3 chỉ số viết như số đếm ở góc | Ảnh hạ xuống và dán vào, băng keo xuất hiện sau; tiêu đề trượt lên |
| 2 · Tự tìm trọ | 4 mẩu giấy rao kẹp vào trang, mỗi mẩu một tình huống | Từng mẩu rơi xuống và "dán" vào, xoay về góc lệch cuối |
| 3 · Lời hứa | Ghi chú viết tay gạch bỏ 4 mẩu giấy; câu hứa in đậm | Nét gạch bỏ vẽ qua từng mẩu; câu hứa hiện theo từng chữ |
| 4 · Tin đã duyệt | Con dấu "Chủ nhà đã xác minh" đóng lên trang + 3 tiêu chuẩn | Dấu đóng xuống; dạ quang quét lần lượt 3 dòng |
| 5 · Tìm phòng | **Đã xong** (bản đồ dán trang, ghi chú đánh số khớp ghim) | Giữ như hiện tại |
| 6 · So sánh | Hai ảnh phòng dán cạnh nhau, bảng so sánh kẻ tay, câu hỏi như bong bóng chat | Hai ảnh tách ra hai bên; câu hỏi gõ từng chữ |
| 7 · Hẹn xem phòng | Lịch tay khoanh ngày + ảnh trước cửa phòng | Vòng khoanh ngày vẽ ra; mốc lịch sáng lần lượt |
| 8 · Trước khi quyết định | Checklist 3 dòng + dòng chốt báo cáo tin viết bằng mực đỏ lề | Dấu tích vẽ lần lượt; dòng chốt trượt vào |
| 9 · Chủ nhà | Ảnh chủ nhà chụp phòng + thẻ tin Homeji thật dán cạnh | Thẻ tin trượt ra từ điện thoại |
| 10 · Nhận phòng | Trang cuối: ảnh chìa khóa, CTA, footer; mép dưới là cầu nối | Ảnh dán vào; CTA hiện |

## Các giai đoạn

Mỗi giai đoạn kết thúc bằng **một điểm duyệt**: bạn xem preview thật trên `http://localhost:5173`, tôi gửi ảnh chụp 1440px và 390px, cả sáng và tối.

### Giai đoạn 0 — Nền chung (không cần ảnh)

1. Đưa token "Sổ tìm trọ" từ `ExploreScene.css` lên mức landing (`.hl`), để mọi cảnh dùng chung một bộ màu, chữ và bản tối.
2. Các khối dùng chung trong `src/components/landing/notebook/`: trang sổ (lưới ô li + lề đỏ), ảnh dán băng keo, vệt dạ quang, ghi chú viết tay, con dấu, dấu tích SVG.
3. `landingCopy.ts`: toàn bộ chữ của 10 cảnh ở một chỗ để bạn duyệt và sửa.
4. Bỏ các cảnh tạm (`SceneMap`, `SceneListings` không còn dùng) và chữ nội bộ lộ ra ngoài như "Scrub từng bước — tua ngược khi cuộn lên." ở `SceneHow`.
5. DESIGN.md: **thêm một mục riêng cho landing** (đề xuất "merge"), vì DESIGN.md hiện mô tả cả app (Grab green, Maps chrome) và app vẫn giữ giao diện đó.

**Điểm duyệt 0:** một trang mẫu với đủ các khối dùng chung.

### Giai đoạn 1 — Cảnh 1 đến 4 (nửa đầu câu chuyện)

1. Dựng 4 cảnh bằng **ảnh giữ chỗ** (khung ảnh dán có ghi chú "ảnh hẻm sáng sớm") để duyệt bố cục và hiệu ứng trước khi tốn credit tạo ảnh.
2. Ô tìm ở cảnh 1: gửi từ khóa xuống cảnh 5 và cuộn tới đó (dùng lại `exploreUrlState`).
3. Header: Về Homeji, **Tìm phòng**, Cách dùng, Đăng tin, Đăng nhập; chừa chỗ cho nút theme nổi.

**Điểm duyệt 1:** cuộn từ cảnh 1 tới cảnh 5 liền mạch.

### Giai đoạn 2 — Cảnh 6 đến 10 (nửa sau câu chuyện)

1. Dựng 5 cảnh, vẫn dùng ảnh giữ chỗ.
2. Cảnh 6, 7, 9 cần **ảnh chụp giao diện Homeji thật** (bảng so sánh, lịch xem phòng, thẻ tin). Tôi chụp bằng Playwright từ app đang chạy, không cần ảnh AI.

**Điểm duyệt 2:** cuộn trọn 10 cảnh.

### Giai đoạn 3 — Ảnh thật

1. Tạo 16 ảnh theo bảng ở mục 8 của plan bản 4, đổi tỉ lệ cho hợp kiểu ảnh dán sổ.
2. Tối ưu: AVIF/WebP, nhiều cỡ, `loading="lazy"` trừ ảnh cảnh 1; ghi nguồn gốc từng ảnh (ảnh AI, công cụ, ngày tạo) vào `src/assets/landing/PROVENANCE.md`.

**Điểm duyệt 3:** cả trang với ảnh thật.

### Giai đoạn 4 — Vòng lặp đi xuống

1. Cầu nối sau cảnh 10: trang cuối của sổ lật sang trang bìa (cảnh 1). Khi cầu nối lấp đầy màn hình, trang nhảy về đỉnh cảnh 1, giữ quán tính cuộn.
2. Không nhảy khi đang ở cảnh 5, khi đang mở dialog, hoặc khi bật `prefers-reduced-motion`. Cầu nối ẩn khỏi trình đọc màn hình.
3. Sau khi nhảy, các cảnh giữ trạng thái đã hiện, không chạy hiệu ứng lại.
4. Có test cho phần tính vị trí đích.

**Điểm duyệt 4:** cuộn qua cảnh 10 về lại cảnh 1 không thấy cú nhảy.

### Giai đoạn 5 — Hoàn thiện và kiểm tra

1. Rà soát thiết kế (finish review) cho cả trang, sửa tới khi đạt.
2. Khả năng truy cập: thứ tự focus, nhãn, tương phản ở cả hai theme, `prefers-reduced-motion` (hiện thẳng mọi cảnh).
3. Hiệu năng: LCP cảnh 1, không có ảnh lớn tải sớm, cuộn mượt trên điện thoại tầm trung.
4. Build, lint, toàn bộ test; ảnh chụp 1440 / 1280 / 390.

**Điểm duyệt cuối:** bạn duyệt rồi mới commit (tôi chỉ stage, không commit hay push khi chưa được bảo).

## Cần bạn quyết

1. **Parallax:** hiệu ứng vào cảnh chỉ chạy một lần, nhưng ảnh nền có nên **trôi chậm hơn chữ** khi cuộn (lớp sâu, mục 2.3 plan cũ) không? Đây là vị trí theo cuộn chứ không phải hiệu ứng chạy lùi. Đề xuất: **giữ nhẹ** (0.85–0.9x) cho ảnh dán; tắt khi bật giảm chuyển động.
2. **Tạo ảnh:** dùng Figma AI (tốn credit Figma, cần đăng nhập Figma trong app qua `/mcp`) hay bạn tự tạo ảnh rồi đưa tôi? Đề xuất: **Figma AI**, tạo sau điểm duyệt 2.
3. **Người trong ảnh:** chỉ thấy tay và lưng (đề xuất), hay chỉ cảnh vật?
4. **Cảnh 9 "Dành cho chủ nhà":** giữ (đề xuất)?
5. **DESIGN.md:** thêm mục riêng cho landing (đề xuất), hay viết lại toàn bộ?

## Ràng buộc giữ suốt quá trình

- Hỏi trước khi thêm hoặc bớt thư viện. Patrick Hand lấy từ Google Fonts, không cài gói npm.
- Không đổi route trong `App.tsx` hay backend/API khi chưa hỏi.
- Google Maps key chỉ chạy trên `http://localhost:5173`; không in key ra đâu cả.
- Các file của phiên Cursor c2 vẫn giữ tạm; sẽ thay ở giai đoạn 0–2 khi cảnh tương ứng được dựng lại.
