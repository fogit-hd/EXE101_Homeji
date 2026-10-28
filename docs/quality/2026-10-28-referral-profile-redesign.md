# Mời bạn, voucher, Hồ sơ và ảnh sản phẩm — 28/10/2026

## Chính sách đã chốt
- Người mời và người được mời đều nhận bộ 4 voucher tổng mức giảm tối đa 50.000đ.
- Mỗi bộ: 3 voucher đồ ăn giảm 5% tối đa 10.000đ/voucher, đơn từ 100.000đ; 1 voucher VIP giảm 20% tối đa 20.000đ, gói từ 50.000đ và thanh toán bằng ví.
- Hạn 30 ngày; mỗi lần thanh toán dùng 1 voucher. Không cộng tiền vào ví, không đổi tiền hoặc rút tiền.
- Tài khoản mới trong 7 ngày, xác nhận email và lưu hồ sơ; nhập mã/nhận lời mời để cấp quà cho cả hai. Không tự mời hoặc nhận quà đăng ký nhiều lần. Người đã nhận thưởng khi mời người khác không thể quay lại nhận quà đăng ký.
- Ngân sách 1.000.000đ cho 10 cặp; giữ chỗ toàn bộ mệnh giá 100.000đ/cặp trong giao dịch PostgreSQL có khóa. Mỗi người mời tối đa 5 lượt.

## Cài đặt
- Mã ngẫu nhiên 96 bit, endpoint có xác thực, kiểm tra email ở auth.users; bảng khuyến mại bật RLS và thu hồi quyền client trực tiếp.
- Cấp quà và ngân sách cùng transaction; unique invitee. Voucher có concurrency token, dùng cùng lần lưu đơn/trừ ví. Người mua trả số tiền sau giảm; thu nhập người bán giữ nguyên, giảm từ phí Homeji. Hoàn đơn trả số tiền thực trả và trả voucher với hạn gốc.
- VIP dùng voucher qua ví, kiểm tra giá cuối ở server và request id chống trừ trùng. GA4 và biên nhận dùng số tiền sau giảm.
- Trang /referrals có mã/link mời, điều kiện, trạng thái và voucher. Có lối vào từ banner, menu tài khoản và Hồ sơ.
- Banner bỏ các lời hứa chưa được thực hiện (giảm 50%, giữ hộ cọc, tặng 3 tin, giao tận phòng); thay nội dung và chữ trong hình minh họa.
- Hồ sơ đổi từ hero/tab ngang sang sidebar tài khoản + menu và vùng chỉnh sửa riêng. Lối sống giữ là tùy chọn.
- Chợ đồ dùng ảnh vuông object-fit:contain giữ trọn sản phẩm, tối đa 6 sản phẩm xem trước mỗi người bán, 2 cột mobile; giảm thông tin/người bán và thao tác bản đồ lặp.

## Bằng chứng kiểm tra
- PostgreSQL loopback riêng, migrations từ đầu gồm bảng auth giả lập: 14 test database đạt, không skip. Bao gồm cấp 8 voucher/cặp, đồng thời gửi claim trùng, self-invite, chưa xác nhận email, mã khác, giới hạn 5 lượt, trần 10 cặp, VIP retry, đồ ăn sau giảm và hoàn voucher/tiền.
- 51 unit test Marketplace đạt, gồm mức giảm, hết hạn, mức tối thiểu, dùng trùng, ngân sách và bảo toàn số tiền người bán.
- Frontend test chọn voucher chặn phản hồi quote cũ sau bỏ chọn đạt; regression luồng đích đăng nhập, menu bán, profile return đạt.
- Build TypeScript/Vite và backend Release đạt. ESLint module thay đổi đạt.
- Kiểm tra trình duyệt cho bản redesign mới bị chặn vì Browser Use bị tắt trong Work settings; chưa xác nhận trực quan hoặc thực hiện giao dịch tiền thật trên production.

## Giới hạn
- Xác nhận email và trần ngân sách không thể chứng minh hai tài khoản thuộc hai người khác nhau; tổng mệnh giá bị giới hạn cứng.
- Đồ ăn vẫn có phí nền tảng và VIP có giảm doanh thu theo voucher. Không gọi đây là khuyến mại không có chi phí.
