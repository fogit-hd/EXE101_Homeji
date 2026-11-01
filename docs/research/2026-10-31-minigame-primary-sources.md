# Nghiên cứu minigame Homeji — đề xuất chờ duyệt

Ngày nghiên cứu: 31/10/2026. Phạm vi: đọc nguồn chính thức và đề xuất sản phẩm; chưa triển khai game hay thay đổi ứng dụng. Các thời lượng bên dưới là mục tiêu thiết kế đề xuất, không phải kết quả đo thực tế.

## Bài học từ sản phẩm thật

- **Chrome Dino:** Google mô tả game xuất hiện trong trang mất mạng, người dùng chủ động bấm để chơi; cơ chế cơ bản gồm chạy, nhảy và cúi. Áp dụng cho Homeji: một thao tác dễ hiểu, chơi được ngay và rời được ngay. Đây là mẫu xử lý lúc mất mạng, không phải bằng chứng rằng nên chèn game vào mọi lần tải. [Google Chrome, 06/09/2018](https://blog.google/products-and-platforms/products/chrome/chrome-dino/).
- **Microsoft Edge Surf:** Microsoft có liên kết mở game khi mất mạng; hỗ trợ bàn phím, chuột, chạm, tay cầm và chế độ giảm tốc độ/hiển thị rõ. Áp dụng: thiết kế điều khiển và khả năng tiếp cận ngay từ đầu, không chỉ làm đẹp chuyển động. [Microsoft Edge Blog, 26/05/2020](https://blogs.windows.com/msedgedev/2020/05/26/surf-game-edge-stable/).
- **Google Santa Tracker:** có game [Memory Match](https://santatracker.google.com/matching.html). Repo chính thức chia trải nghiệm thành các scene tương đối độc lập, có giao tiếp pause/resume/restart với phần host. Áp dụng: game phải tách vòng đời khỏi phần tác vụ chính và dừng được khi người dùng rời màn hình. Không mặc định sao chép kiến trúc iframe của Google sang Homeji. [Repo chính thức](https://github.com/google/santa-tracker-web).
- **Google Search:** Google giới thiệu solitaire và tic-tac-toe trên desktop và ứng dụng; tic-tac-toe có lựa chọn độ khó hoặc chơi với bạn. Áp dụng: luật quen thuộc giúp giảm thời gian hướng dẫn, nhưng game cần bản sắc Homeji để tránh cảm giác tính năng thừa. [Google, 25/08/2016](https://blog.google/intl/en-ca/products/explore-get-answers/search-is-jack-of-all-trades/).

Các nguồn trên chứng minh mô hình sản phẩm tồn tại; chưa có dữ liệu chứng minh minigame sẽ tăng giữ chân, đơn hàng hay tỷ lệ thuê phòng của Homeji. Những suy luận và lựa chọn dưới đây là đề xuất riêng.

## Năm ý tưởng để duyệt

### 1. Lật thẻ Góc nhà — ưu tiên thử đầu tiên

Lật 8 thẻ để ghép 4 cặp đồ dùng nhà trọ: chìa khóa, chậu cây, đèn bàn, ly nước. Mỗi ván hướng tới 20–40 giây; có chế độ không đếm ngược. Lấy cảm hứng từ Memory Match, dùng hình riêng của Homeji.

Phù hợp trong mục “Chơi một chút” và khi chờ phản hồi người bán/chủ trọ. Ưu điểm: điều khiển đơn giản, ít chuyển động liên tục, dễ tạo thẻ kính nổi. Đánh đổi: độ mới giảm sau vài ván; nên thay bộ hình nhẹ thay vì thêm hệ thống thưởng phức tạp. Không buộc người dùng nhớ ảnh phòng thật hoặc nhầm thẻ game với tin đăng.

### 2. Homeji chạy về nhà — bản sắc tốt nhất

Mascot nhảy qua chướng ngại vật và nhặt chìa khóa, một nút chạm/Space; ván ngắn hướng tới 20–30 giây. Lấy cảm hứng cơ chế tối giản của Chrome Dino, thiết kế nhân vật và bối cảnh riêng.

Phù hợp màn hình offline và lối vào tự chọn. Ưu điểm: vui, nhận diện thương hiệu rõ. Đánh đổi: cần kiểm tra va chạm, tốc độ trên máy yếu, chuyển động giảm và khả năng thao tác. Không phù hợp làm trò bắt buộc lúc thanh toán; game chỉ offline được sau khi tài nguyên cần thiết đã được lưu sẵn.

### 3. Đố vui ở trọ — hữu ích nhất

Ba câu mỗi ván, mỗi câu một lựa chọn và giải thích ngắn: kiểm tra công tơ, kiểm tra hư hỏng trước nhận phòng, bảo vệ thông tin cá nhân. Đây là đề xuất nội dung riêng cho Homeji, không phải tính năng được xác nhận từ các mẫu trên. Mục tiêu 15–30 giây.

Ưu điểm: vừa vui vừa giúp người thuê ra quyết định. Đánh đổi: cần người chịu trách nhiệm duyệt nội dung, nguồn và ngày cập nhật; tránh các câu khẳng định pháp lý hoặc đảm bảo an toàn tuyệt đối. Ưu tiên câu quan sát thực tế, không thu thêm dữ liệu cá nhân để chơi.

### 4. Xếp góc phòng

Đặt ba món đồ vào lưới nhỏ để hoàn thành góc học tập; chạm để chọn rồi chạm ô đặt thay vì chỉ kéo thả. Mục tiêu 30–60 giây. Lấy bài học từ Santa Tracker về các scene độc lập và trò chơi có chủ đề, không sao chép một game cụ thể.

Ưu điểm: liên quan tìm nhà và có thể đẹp với hình đồ vật render 3D. Đánh đổi: chi phí asset và quy tắc bố trí cao hơn game thẻ; không ngụ ý đây là công cụ đo đạc hoặc mô phỏng phòng thật. Phù hợp giai đoạn sau.

### 5. Cờ ca-rô mini 3×3

Chơi một ván với máy, thay X/O bằng biểu tượng nhà/chìa khóa kèm nhãn dễ đọc. Mục tiêu 15–40 giây. Lấy cảm hứng từ Google Search tic-tac-toe.

Ưu điểm: luật quen thuộc và có thể điều khiển đầy đủ bằng bàn phím. Đánh đổi: ít khác biệt thương hiệu, nhanh lặp lại. Chưa nên thêm multiplayer, vì kéo theo đồng bộ phiên, ngắt kết nối và vận hành không cần thiết cho nhu cầu chờ ngắn.

## Khuyến nghị phạm vi thử nghiệm

Chỉ làm **Lật thẻ Góc nhà** trong đợt đầu, hoặc chọn **Homeji chạy về nhà** nếu ưu tiên mascot. Không triển khai cả năm game cùng lúc. Điểm và thành tích ban đầu chỉ để vui, không quy đổi tiền/voucher hoặc ảnh hưởng ví.

- Vào bằng nút tự chọn; không tự bật âm thanh, không tạo thời gian chờ giả.
- Mất mạng: giữ thông báo lỗi, nút thử lại và dữ liệu đã có. Không tự retry thao tác thanh toán/gửi đơn từ game.
- Chờ tác vụ ngắn: giữ trạng thái tác vụ làm nội dung chính. Nếu tác vụ hoàn thành khi đang chơi, hiện thông báo rõ cùng nút quay lại; không chờ hết ván và không giật focus bất ngờ.
- Chờ người phản hồi/đơn hàng: chỉ gắn vào màn hình có trạng thái thực sự đã xác nhận; game không được thay đổi hoặc giả lập tiến độ.
- Đóng game phải giải phóng vòng lặp, audio và listener; giữ hành vi ứng dụng chính độc lập.
- Bảng điều khiển, chữ và nút có thể dùng kính nổi; mặt chơi cần tương phản ổn định để người dùng phân biệt vật thể. Phần hướng thiết kế liquid glass do tài liệu đề xuất của phiên nghiên cứu chính phụ trách.

Nếu được duyệt, đo lượt chủ động mở, lỗi, thời gian quay lại tác vụ chính và tỷ lệ hoàn thành tác vụ. Không coi thời gian ở lại tăng là thành công nếu tỷ lệ hoàn thành tác vụ giảm. Mọi ngưỡng hiệu năng và tiêu chí rollout cần dựa trên đo thực tế trước/sau.

## Lựa chọn ngoài game: Hôm nay ăn gì?

Một nút gợi ý ngẫu nhiên từ nhóm món người dùng chọn, tôn trọng ngân sách và tùy chọn đã nhập. Không phải vòng quay trúng thưởng, không yêu cầu giao dịch. Khi chỉ có danh mục món thì hiển thị là ý tưởng ăn uống; chỉ liên kết món/quán đang bán khi nguồn dữ liệu thực sự xác nhận. Đây có thể hữu ích hơn một game đối với người đang phân vân đặt món, nhưng cần tránh biến ngẫu nhiên thành khẳng định phù hợp dị ứng hay sức khỏe.

## Nút 3D liquid glass và ranh giới phê duyệt

Theo kiểm tra mã nguồn của phiên nghiên cứu chính, `MarketplaceHeader.tsx` dùng `MotionTabs` dẫn tới `LiquidTabList`; `src/components/ui/LiquidGlassEffects.tsx` đã có bộ lọc SVG và `src/glass-controls.css` có các style kính. Đây là điểm có thể tái sử dụng; không xác nhận giao diện production hiện tại đã giống ảnh hoặc đạt hiệu năng mong muốn.

Hướng đề xuất: nút pill có viền kính nổi, khúc xạ cục bộ ở nền phía sau chữ, điểm sáng theo con trỏ, nén nhẹ khi bấm và thấu kính trượt theo tab đang chọn. Giữ chữ đậm màu, focus rõ và trạng thái chọn phân biệt được khi giảm chuyển động. Tham khảo nguyên tắc chọn Regular/Clear theo ngữ cảnh và độ rõ nội dung trong [Apple: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/).

Ưu tiên mở rộng CSS/SVG có sẵn rồi đo trên thiết bị thật. WebGL cho từng nút tăng chi phí render và bảo trì, chưa có bằng chứng cần thiết cho phạm vi này. Có thể dùng asset đồ vật render 3D sẵn trong minigame; ảnh render sẵn không tạo khúc xạ nền thật. Khi tạo chuyển động, ưu tiên transform/opacity và đánh giá riêng các hiệu ứng blur theo [web.dev: How to create high-performance CSS animations](https://web.dev/articles/animations-guide).

**Chờ người dùng duyệt game và phạm vi nút trước khi triển khai.** Phiên này chỉ tạo tài liệu nghiên cứu; không thay code ứng dụng, không deploy và không chạy kiểm thử tính năng mới chưa tồn tại.

## Giới hạn xác minh

Đã đọc trang chính thức và repo; chưa chạy game trong trình duyệt, chưa thử trên điện thoại, chưa đánh giá tác động với người dùng Homeji. Không sao chép asset/mã nguồn bên ngoài trong phiên này. Repo Santa Tracker công bố điều kiện giấy phép riêng cho asset và code; nếu tái sử dụng sau này phải đọc điều kiện áp dụng chính xác.
