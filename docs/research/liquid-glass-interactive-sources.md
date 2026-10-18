# Nguồn Liquid Glass cho tab co giãn khi tương tác

Kiểm tra ngày 18/10/2026. Phạm vi: tìm nguồn thiết kế Figma có thể chỉnh sửa và phân biệt với mã web; không nhập tài nguyên, cài thư viện hoặc chấp nhận giấy phép thay người dùng.

## Kết luận

Có tài nguyên thiết kế chính thức trong Figma. Tuy nhiên, chưa có bằng chứng đã mở được một prototype Community thực hiện đầy đủ thao tác kéo, phóng lớn rồi thu nhỏ như yêu cầu. Vì vậy không gọi các thumbnail là mã nguồn hay prototype đã kiểm chứng.

Hành vi người dùng mô tả phù hợp với Apple: trạng thái nghỉ yên; vật liệu nâng lên và phản hồi ánh sáng khi chạm. Apple trình bày điều này trong phần Dynamics của [Meet Liquid Glass, WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/). Đây là căn cứ cho việc sửa lens Homeji đang phồng thường trực, không phải lý do tăng kích thước mọi lúc.

## Figma: ưu tiên nguồn chính thức

- [Apple — iOS and iPadOS 26 UI Kit](https://www.figma.com/community/file/1527721578857867021): URL lấy trực tiếp từ bài [Get started with Apple's UI kit của Figma](https://help.figma.com/hc/en-us/articles/24037833895831-Get-started-with-Apple-s-UI-kit). Đây là thư viện component/style/screen có thể dùng trong file thiết kế, không phải gói React. Figma xác nhận kit khả dụng trên các gói và yêu cầu chấp nhận EULA Apple khi dùng. Chưa mở được cây layer hay chạy prototype bên trong Community nên chưa khẳng định có sẵn đúng animation kéo yêu cầu.
- [Figma — Glass effect playground](https://www.figma.com/community/file/1522715486231239473/glass-effect-playground): được liên kết trực tiếp trong tài liệu [Apply effects to layers](https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers). Phù hợp nghiên cứu thông số quang học; chưa xác nhận có segmented-control kéo/co giãn hoàn chỉnh.

Figma mô tả Glass có các điều khiển hướng/cường độ ánh sáng, refraction, depth, dispersion, frost và splay. Quan trọng với Homeji: **Glass không xuất được sang SVG và không được hỗ trợ trong Figma Sites**; không thể lấy một SVG/ảnh export rồi kỳ vọng nền DOM tiếp tục bị bẻ cong. Phần kính web cần được thực thi lại bằng code. Nguồn: [tài liệu hiệu ứng chính thức](https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers).

Trang [Apple Design Resources](https://developer.apple.com/design/resources/) hiện liên kết bản iOS/iPadOS 27; không tự gọi link mới này là bộ iOS26. Figma Help vẫn cung cấp link iOS26 ở trên. Không coi tài nguyên Apple là giấy phép mã nguồn web; cần đọc EULA trước khi sao chép tài sản vào sản phẩm ngoài hệ sinh thái Apple.

## Community: ứng viên, chưa đủ bằng chứng để lấy ngay

[Liquid Glass của Oluwafemi Adelekan](https://www.figma.com/community/file/1521815105197434985) có bài [giới thiệu của chính tác giả](https://dev.to/oluwafemi_adelekan_243070/building-fluid-interfaces-with-liquid-glass-open-source-on-figma-52ac), nói có component chỉnh sửa và trạng thái hover/click, miễn phí dùng/remix. Bài này không chứng minh có thao tác kéo segmented tab hoặc cung cấp mã React. Chưa xác minh giấy phép chi tiết bên trong file. Không chọn làm dependency của Homeji.

Các trang Community trực tiếp bị công cụ web từ chối truy cập/robots ở lần kiểm tra này. Các URL chính thức ở trên được xác nhận qua link từ tài liệu nhà cung cấp; nội dung layer và tính tương tác của từng file vẫn chưa được xác minh.

## Mã web có sẵn để đối chiếu hành vi

[liquid-glass-js — mã của Amir Abushanab](https://github.com/amir-abushanab/liquid-glass-js) là mã web, giấy phép MIT được công bố tại repository, không phải file Figma. [Showcase của tác giả](https://amir-abushanab.github.io/liquid-glass-js/) mô tả segmented pill trượt giữa lựa chọn và controls nở thành kính khi nhấn/kéo rồi trở lại khi thả. Đây là nguồn gần yêu cầu tương tác hơn một ảnh chụp.

README phân biệt filter trên nội dung DOM với backdrop: độ tương thích khác nhau theo render path; không nên lặp lại tuyên bố “mọi browser giống hệt” mà không chạy thử trên Homeji. Chưa cài hay kiểm thử thư viện này, nên chỉ dùng làm nguồn đọc/đối chiếu, không khẳng định là giải pháp tích hợp đã đạt chất lượng production.

## Quyết định triển khai đề xuất cho Homeji

Giữ component tab hiện có để bảo toàn lựa chọn, bàn phím và handler nghiệp vụ. Sửa hình học và trạng thái tương tác: lens nghỉ nằm gọn trong rail; pointer-down nở có giới hạn; kéo đi theo vị trí pointer; thả/cancel trở về kích thước nghỉ. Lớp phản sáng/bẻ nền có thể co giãn nhưng chữ/icon không bị scale hoặc blur. Tôn trọng reduced-motion. Đây là đề xuất kỹ thuật từ yêu cầu và nguồn tham khảo, không phải thông số Apple/Figma đã đo.
