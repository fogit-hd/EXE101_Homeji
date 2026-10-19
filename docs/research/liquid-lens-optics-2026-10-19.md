# Khúc xạ thấu kính cho Homeji

Ngày: 2026-10-19. Phạm vi: kiểm tra nguồn vật lý, phép lấy mẫu SVG và mã đang triển khai; chưa phải chứng nhận chất lượng giao diện sau sửa.

## Cơ chế cần mô phỏng

Tại mỗi mặt phân cách, góc tia được đo với pháp tuyến cục bộ và tuân theo `n1 sin(theta1) = n2 sin(theta2)`. Hai phía đối xứng của mặt kính có pháp tuyến ngược dấu, nên độ lệch cũng đổi dấu. Điều này không có nghĩa một nét chữ được nhân thành hai ảnh. [OpenStax: Refraction](https://openstax.org/books/university-physics-volume-3/pages/1-3-refraction)

Kính lồi đặt gần vật, trong khoảng tiêu cự, tạo ảnh ảo cùng chiều và lớn hơn vật. Do đó hiệu ứng phù hợp với chữ ngay sau mặt kính là phóng đại và uốn liên tục, thay vì cắt chữ thành các mảnh hoặc luôn đảo ảnh. [OpenStax: Simple Magnifier](https://openstax.org/books/university-physics-volume-3/pages/2-7-the-simple-magnifier)

Tán sắc là sự phụ thuộc của khúc xạ vào bước sóng. Với vật liệu thông thường trong ví dụ của sách, tím bị lệch mạnh hơn đỏ. Một dải màu liên tục ở viền có thể mô phỏng đặc tính này; ba bản chữ RGB lệch xa nhau chỉ tạo cảm giác lỗi đăng ký màu. Chỉ bật màu khi tương tác là lựa chọn thiết kế Homeji, không phải quy luật quang học. [OpenStax: Dispersion](https://openstax.org/books/university-physics-volume-3/pages/1-5-dispersion)

## Quy tắc triển khai SVG

`feDisplacementMap` xác định tọa độ nguồn cho từng pixel đích:

```text
output(x,y) = input(x + scale * (R(x,y)-0.5),
                    y + scale * (G(x,y)-0.5))
```

Đây là ánh xạ ngược. Muốn ảnh phía phải tâm nhìn nở ra, pixel đích phía phải cần lấy nguồn gần tâm hơn, tức độ lệch nguồn âm; phía trái lấy nguồn với dấu ngược. Tương tự cho trục dọc. Hướng tia vật lý và hướng lấy mẫu pixel không được đánh đồng. [W3C Filter Effects: feDisplacementMap](https://www.w3.org/TR/filter-effects-1/#feDisplacementMapElement)

## Lỗi xác định được trong mã hiện tại

Nguồn: `scripts/generate-liquid-lens-map.mjs` và `src/components/ui/LiquidGlassEffects.tsx` tại thời điểm nghiên cứu.

Map hiện tại dùng pháp tuyến capsule nhân `rho^5`, biên độ `98/255`; `rho=2r/H`. Nếu bỏ qua lượng tử hóa PNG, tọa độ nguồn theo bán kính là:

```text
rho_source = rho - (196/255) * depth * rho^5
d(rho_source)/d(rho) = 1 - (980/255) * depth * rho^4
```

Ở tab tương tác, kênh đỏ dùng `depth=.23+.04=.27`. Đạo hàm tại viền xấp xỉ `-.0376`: thứ tự mẫu bị đảo ở một dải hẹp. Đây là foldover trong mô hình lấy mẫu, có thể làm nét chữ gập/vỡ. Kênh xanh lá `.23` còn đạo hàm khoảng `.116`, vẫn kéo dãn rất mạnh gần viền. Vì vậy tăng `scale` thêm sẽ làm lỗi nặng hơn. Ngưỡng dương theo mô hình này là `depth < 255/980 ≈ .2602`; chỉ giữ dưới ngưỡng cũng chưa đảm bảo đẹp.

`rho^5` còn khiến phần giữa gần như không thay đổi, rồi dồn biến dạng vào mép. Đây là suy luận từ công thức và mã; cần kiểm tra ảnh thực tế để phân biệt ảnh hưởng của lượng tử PNG, khử răng cưa và clipping.

## Đề xuất thực dụng

1. Dùng một ánh xạ hình học liên tục chung cho toàn bộ chữ. Dấu độ lệch đổi qua tâm trên cả hai trục; không tạo hai bản chữ.
2. Dùng bề mặt lồi có độ dốc hữu hạn, hoặc ánh xạ phóng đại gần đúng có Jacobian dương. Không lấy `rho^5` rồi tăng cường độ đến khi đảo ánh xạ.
3. Ví dụ gần đúng cho tiết diện chuẩn hóa: `rho_source = rho * [1 - k(1-rho^2)^2]`, `0 <= rho <= 1`, `0 < k < 1`. Đạo hàm là `1-k+6k*rho^2-5k*rho^4`, luôn dương trong khoảng với điều kiện trên. Độ lệch bằng 0 và đạo hàm bằng 1 ở biên; ảnh nở quanh tâm, nối với phần ngoài êm. `k=.15...30` là điểm bắt đầu thiết kế, không phải chỉ số khúc xạ vật liệu.
4. Với capsule, bảo đảm trường hai chiều liên tục cả tại chỗ nối phần thẳng và nửa tròn; kiểm tra Jacobian theo X/Y, không chỉ đạo hàm một chiều. Ánh xạ ví dụ ở mục 3 là tiết diện tham khảo, chưa tự động chứng minh mọi phép kéo capsule đều an toàn.
5. Giữ RGB gần ánh xạ chung: khác biệt nhỏ và tập trung ở viền khi tương tác. Nếu cần tăng vẻ 7 màu, tăng độ sáng phản chiếu viền riêng, không tăng độ lệch của toàn bộ chữ.
6. Giảm lớp phủ trắng/tối và blur để kính trong. Phân biệt lớp phản chiếu/độ khối với lớp lấy mẫu phía sau; không chồng hai lần cùng chữ gốc và chữ khúc xạ.

Các công thức bảo toàn đơn điệu và gợi ý thông số ở phần này là đề xuất kỹ thuật suy ra từ phép lấy mẫu W3C, không phải công thức mô phỏng Snell đầy đủ.

Với trường hướng tâm hai chiều `q_source=f(r)q`, `f=1-k(1-r^2)^2`, các trị riêng Jacobian là `lambda_t=f` và `lambda_r=f+r*f'`. Cả hai không nhỏ hơn `1-k`; với `k=.30` còn biên an toàn `.70`. Điều này chứng minh tính đơn điệu của trường liên tục chuẩn hóa tròn/ellipse. Sau mã hóa PNG 8-bit và scale SVG, cần kiểm tra số trên trường đã giải mã; không dùng chứng minh liên tục thay cho kiểm tra ảnh lượng tử hóa.

Chọn ánh xạ đơn điệu gần đúng cho lần sửa này dễ kiểm soát chữ hơn trace tia chỉ qua một mặt kính. Nếu dùng Snell với một mặt lồi rồi một đoạn truyền thẳng, cần ghi rõ mô hình một mặt gần đúng: nó chưa bao gồm mặt ra của thấu kính, khoảng cách vật/thấu kính/người quan sát và các tham số camera để được gọi là mô phỏng thấu kính hoàn chỉnh.

## Bằng chứng cần có sau sửa

- Ảnh cùng một dòng chữ ở trái, tâm, phải và trên/dưới thấu kính; chuyển động qua viền phải liên tục, không tăng thành hai dòng hay đứt nét.
- Lấy mẫu grid và đạo hàm/Jacobian: không có pixel nguồn đảo thứ tự trong vùng nhìn thấy; kiểm tra cả ba kênh khi tương tác.
- Bằng chứng RGB tắt khi đứng yên, bật nhẹ khi tương tác rồi trở về trong suốt.
- Desktop/mobile, nền sáng/tối, zoom/DPR khác nhau; bảo toàn vùng bấm và các vùng nội dung đã loại trừ.

## Bản sửa được chọn

- Trường capsule lấy mẫu ngược: `offset = -3 * q * max(0, 1-r²)²`, `r=2|q|`. Nó đổi dấu qua trục, tác động rộng trong lòng kính và về 0 với độ dốc 0 tại biên. Đây là mô hình màn hình gần đúng, không phải trace Snell đầy đủ.
- Bộ lọc dùng `primitiveUnits=userSpaceOnUse`, kích thước ảnh map theo nút và `scale=depth*height`. Cả X và Y dùng pixel. Thông số lớn nhất `.09` tương ứng `k=.27`, phóng đại cục bộ giữa kính khoảng `1/(1-k)=1.37`.
- Một phép warp duy nhất cho chữ; bỏ ghép ba ảnh chữ RGB. Màu 7 sắc là phản chiếu trang trí phía trong viền, chỉ bật lúc tương tác. Không gọi dải màu CSS này là mô phỏng tán sắc vật lý.
- Unit test giải mã PNG kiểm tra dấu, tính nối biên và Jacobian dương ở các tỉ lệ 1/2/3/4/6/10. Browser test kiểm tra đơn vị pixel, chỉ một warp, ảnh chữ đi qua ba vị trí, cùng các thao tác chuột/cảm ứng/bàn phím và trạng thái nghỉ.
