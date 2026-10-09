# Ở ghép và chợ đồ — tiến độ 09/10/2026

Mục tiêu vẫn đang thực hiện, chưa hoàn tất: nhập lối sống, tab tìm bạn/tìm phòng, gửi lời mời, và hoàn thiện chợ đồ.

## Đã phát hành trong lượt này

Frontend `221ff38`, `59990e7`; backend `9db999a`.

- Form lối sống giữ khu vực người dùng chọn thay vì ghi đè bằng Thủ Đức. Có nhập khu vực mong muốn, ngân sách phải hữu hạn và lớn hơn 0. Liên kết từ lời mời mở đúng tab lối sống qua `profileTab=lifestyle`.
- Chấp nhận/từ chối/hủy lời mời bắt lỗi, khôi phục nút để thử lại và khóa thao tác khi request đang chạy.
- Backend kiểm tra enum ngủ/thú cưng/hút thuốc; Unknown vẫn hợp lệ, ngân sách bỏ trống vẫn được phép.
- Chợ đồ cho nhắn người bán trước khi mua; mở đúng conversation trả về từ API thay vì chỉ mở hộp thư chung. Nút mua/nhắn không xuất hiện trên thẻ của chính người dùng.

## Bằng chứng

- Build và diff-check đạt. 64 unit tests backend nhóm Profiles/Marketplace/Roommate đạt, không skipped. 11 tests frontend về lời mời, lọc chợ đồ và bố cục kho hàng đạt; các tests đọc source chỉ là kiểm tra contract, không thay thế kiểm thử runtime.
- ESLint: MarketplacePage và RoommateInvitationsPage 0 lỗi; ProfilePage còn 2 lỗi set-state-in-effect đã có ở baseline b158b69 (không tuyên bố lint toàn dự án đạt).
- Browser local dùng API giả loopback: nhận lỗi 503 khi chấp nhận, thử lại thành công và hiện Nhắn tin. Đổi khu vực/ngân sách, lưu, reload: giữ Gần UEL, Linh Trung / 2800000; tab Lối sống vẫn được chọn. Nhắn người bán mở đúng conversation 77777777-7777-4777-8777-777777777777 và đúng người bán. Không gửi tin nhắn thật.
- Render backend xác nhận commit 9db999a Live; /health/live và /health/ready đều HTTP 200.
- Frontend production phục vụ /assets/index-CkPoUl2i.js với liên kết lối sống và nút nhắn người bán mới.
- Browser production: danh mục Bàn ghế trả đúng Bàn học gỗ nhỏ gọn và Ghế học tựa lưng; cả hai có Nhắn người bán. Ảnh local: output/verification/marketplace-contact-production-20261009.png.

## Chưa đạt để kết luận mục tiêu hoàn tất

- Lời mời backend vẫn bắt buộc cả hai cùng lưu một phòng. Tab Tìm bạn đã có, dùng mô hình này. Đã hỏi người dùng chọn tìm theo lối sống trước khi có phòng hay tìm người cùng quan tâm phòng đã lưu; chưa có câu trả lời cho phương án tìm người độc lập với phòng.
- Kiểm thử hai người đã đạt ở cấp service/repository với PostgreSQL, kết hợp browser local của tab mới. Chưa kiểm thử hai phiên đăng nhập Supabase thực đồng thời và thông báo realtime qua mạng.
- Luồng mua đồ–người bán xác nhận–giao–hoàn tất/giải ngân và từ chối–hoàn tiền đã đạt với PostgreSQL tách biệt. Không thực hiện giao dịch tài chính thật để QA; chưa tuyên bố kiểm chứng gateway hoặc giao dịch production.

## Cập nhật tiếp theo — đã phát hành

Frontend `a355ff1`, `b3e33af`; backend chạy `d597ff5`, tests bổ sung `da74b77` và commit test luồng hai người.

- Ba tab Tìm bạn / Tìm phòng / Lời mời; URL giữ tab khi reload; hỗ trợ bàn phím trái/phải/Home/End.
- Form lối sống mở ngay trong màn hình ở ghép, tái sử dụng form lưu thật. Ngân sách hồ sơ làm mặc định khi tìm phòng, kể cả khi hồ sơ tải sau component.
- Tìm phòng dùng API `type=2&minAvailableSlots=1`; SQL lọc loại và chỗ trống trước LIMIT/OFFSET. Có từ khóa đường/trường/tên phòng, ngân sách và phân trang; hủy request cũ khi đổi bộ lọc.
- Thanh tìm kiếm chung trước đây không thực hiện tìm kiếm trong khu ở ghép. Nay mở tab Tìm phòng với `roommateQuery`; đã kiểm tra UEL trên production.
- Tìm bạn chỉ hiển thị tin ở ghép đã lưu, ứng viên và điểm tương đồng lối sống của người cùng lưu phòng. Không mở danh bạ hồ sơ công khai mới.
- Request ứng viên trả về trễ không ghi đè phòng đang chọn; khóa gửi lời mời lặp khi đang chạy. Bỏ lưu có thông báo lỗi và thử lại.

### Kiểm chứng mới

- Build / diff-check đạt; lint các components mới, SavedPostsPage và SearchContext đạt. Cảnh báo bundle >1500 KB và hai lỗi lint baseline ở ProfilePage vẫn còn.
- 11 tests frontend về tìm/lọc, tích hợp header, lời mời đạt. Browser local dùng dữ liệu giả riêng: lọc 2.600.000 chỉ còn phòng 2.500.000; lưu phòng; gửi lời mời; đổi khu vực/ngân sách tại chỗ; reload giữ tab; chuyển phòng nhanh hiện đúng ứng viên phòng cuối; bỏ lưu gặp 503 giữ thẻ và thử lại thành công. Màn hình 390 × 844 không tràn ngang.
- Script `C:\Homeji\scripts\quality\Test-LocalBackend.ps1 -SkipLoadTest` tạo database PostgreSQL riêng `homeji_quality` trên loopback, chạy toàn bộ migrations rồi tests. Kết quả cuối **312 unit / 96 API integration đạt, 0 skipped**; script dừng PostgreSQL sau khi xong. Không đọc/ghi database production và không dùng Docker.
- Hai tests giao dịch mới dùng service, validators và repositories thật: mua đồ trừ ví/giữ tồn; người bán nhận/giao và người mua nhận; giữ tiền trước thời hạn; giải ngân sau 25 giờ, chạy lại không trả thêm. Từ chối đơn hoàn tiền đúng một lần và trả tồn kho. EF tracking được xóa giữa các bước để đọc lại persistence.
- Test luồng hai người dùng transaction rollback: chưa cùng lưu bị từ chối; cùng lưu thấy ứng viên với điểm 100; gửi/nhận; chặn lời mời pending lặp và chặn người gửi tự chấp nhận; người nhận chấp nhận, cả hai đọc lại đúng conversation đã persist.
- Bằng chứng database mới nhất: `C:\Homeji\output\quality\local-9aa8b891d8ab4d5e9875af9ea96ab364\tests\local_net9.0_20261009053411.trx`.
- Render xác nhận backend `d597ff5` Live. `/health/live`, `/health/ready` HTTP 200; query type 999 HTTP 400; query type 2 trả toàn type 2.
- Frontend production `/assets/index-Ciqi_tji.js` có tabs, form lối sống và header search mới. Browser production tìm UEL trả đúng hai phòng có UEL trong tên/địa chỉ; không tạo lời mời hoặc giao dịch thật.
- Ảnh: `output/verification/roommate-tabs-production-20261009.png`, `roommate-search-uel-production-20261009.png`, `roommate-tabs-mobile-fixture-20261009.png` (ảnh cuối dùng dữ liệu giả).

Routes nâng cao và lịch sử AI dài hạn tiếp tục tắt. Không sửa các thay đổi Infrastructure integration/import-progress thuộc công việc khác ở backend.

## Rà soát chợ đồ tiếp theo

Backend `b5cdc44`, frontend `aa825fa`:

- Gộp thẻ đơn và hoàn tiền theo `checkoutId` thay vì buyer/seller/thời điểm. Hai checkout tạo cùng lúc không bị gộp nhầm; nhiều dòng của một checkout vẫn gộp dù timestamp khác nhau. Giữ fallback theo timestamp cho API cũ chưa trả mã checkout.
- Nút liên hệ trong đơn mua/đơn bán gọi `/api/conversations/marketplace-orders/{orderId}`. Service chỉ cho buyer/seller của đơn mở cuộc trò chuyện với bên còn lại, kể cả khi sản phẩm đã bán; không cho người ngoài và không cho người chưa đăng nhập.
- Giỏ đồ ăn hiện nhận tại bếp, đúng request API hiện có. Bỏ phí giao dự kiến khỏi tổng vì backend không thu khoản này; bỏ lời hứa gom nhiều bếp/giao tận nơi chưa được triển khai trong luồng này.
- PostgreSQL tách biệt: 312 unit + 96 integration tests đạt, 0 skipped. Test mua–giao–giải ngân nay kiểm tra thêm hai bên mở cùng conversation sau khi hàng đã Sold, người ngoài bị Forbidden, user rỗng bị Unauthorized, không tạo conversation thứ hai.
- 8 tests frontend về lọc catalog/nhóm checkout/hoàn tiền đạt; build và lint các file sửa đạt. Cảnh báo bundle lớn vẫn còn.
- Browser local với fixture riêng: hai checkout cùng createdAt hiển thị hai thẻ, một Chờ xác nhận và một Đã nhận. Người bán bấm Liên hệ người mua gửi POST đúng order aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3 và mở đúng Người mua kiểm thử trong conversation 77777777-7777-4777-8777-777777777777. Không gửi tin nhắn hoặc mua thật.
- Bằng chứng: `C:\Homeji\output\quality\local-727745147bad4b25ba36c24d809ae918\tests\local_net9.0_20261009054012.trx`; ảnh `output/verification/marketplace-checkout-groups-fixture-20261009.png` dùng dữ liệu giả.
- Render xác nhận backend b5cdc44 Live; health live/ready HTTP 200; gọi endpoint order-chat không đăng nhập trả 401.
- Frontend aa825fa đã được xác nhận ở bundle public `/assets/index-DgMTnjZv.js`: API liên hệ theo đơn và nội dung nhận món tại bếp đã có.
- Frontend `61729eb` bổ sung khóa thao tác / bắt lỗi / khôi phục nút cho Đánh dấu đã bán và Ẩn tin. Browser fixture cho Đánh dấu đã bán gặp 503: nút vẫn dùng lại được; retry thành công, danh sách tải lại có badge Đã bán và bỏ nút chỉnh trạng thái. Ảnh `output/verification/marketplace-inventory-retry-fixture-20261009.png`. Build, lint và 8 tests frontend vẫn đạt.
- Bundle public cuối đã kiểm tra `/assets/index-cslymMxB.js`, có order-chat và xử lý lỗi inventory mới. Luồng Tìm bạn độc lập với phòng vẫn chờ người dùng chọn mô hình; không đánh dấu toàn mục tiêu hoàn tất.

## Tìm bạn độc lập và giao diện — cập nhật sau khi đã làm rõ

Người dùng đã chọn hai nhu cầu: đang tìm chỗ ở hoặc đã có chỗ ở muốn tìm người ghép. Cả hai không cần sở hữu tin phòng hay cùng lưu một phòng. Các ghi chú “chờ làm rõ” phía trên là lịch sử, không còn là trạng thái hiện tại.

- Backend `20bbdc4`: API hồ sơ khám phá và danh sách có phân trang/từ khóa/nhu cầu; mặc định riêng tư, chỉ xuất hiện khi đồng ý. Tắt hiển thị cũng ẩn khỏi gợi ý theo phòng đã lưu. Lời mời độc lập chống trùng cả hai chiều; chấp nhận mở cuộc trò chuyện lưu bền vững. Giữ lời mời gắn phòng cũ và tên người tham gia.
- Frontend: form chọn hai nhu cầu, giới thiệu, đồng ý hiển thị; tìm theo trường/khu vực/tên; gửi lời mời, retry lỗi và chuyển sang tab lời mời. Không tạo hồ sơ hay tin nhắn production để kiểm thử.
- Giữ bố cục Homeji, thống nhất Be Vietnam Pro và nền trắng lạnh/slate với điểm nhấn teal. Viền AI 2 px, màu loang vào trong 8–12 px; popup và tab chuyển nhẹ, hover 2 px. Chế độ giảm chuyển động dừng animation. Gallery thêm vuốt/kéo ngang khi chưa zoom; giữ nút và phím mũi tên, giữ kéo để pan khi đã zoom. Cuộn trang vẫn native.
- PostgreSQL riêng: 312 unit + 97 API/database tests đạt, 0 skipped. Kiểm tra thật gửi/đọc tin nhắn của hai người, chặn người ngoài; migration và tính duy nhất cặp lời mời. Bằng chứng: C:\Homeji\output\quality\local-a347c26f134f4b32ad76c2141d8fcfe7\tests\local_net9.0_20261009142922.trx.
- Frontend build, lint các file TypeScript sửa và 16 tests đạt. Browser fixture kiểm tra lưu/reload, lỗi 503 rồi retry, lọc UEL, lời mời không gắn phòng, gallery kéo ngang và phím. Edge 390 px không tràn ngang; reduced-motion dừng animation panel/tab. Chưa đo hiệu năng trên điện thoại thật; cảnh báo bundle lớn còn tồn tại.
- Nghiên cứu nguồn chính thức/GitHub: docs/research/homeji-ui-motion-2026-10-09.md. Không sao chép template bên ngoài. Đã tạo template cá nhân Homeji Cool Teal từ thiết kế cũ cải thiện và bản xem tương tác tại output/visualizations/homeji-design-language.html.

Routes nâng cao và lịch sử AI dài hạn tiếp tục tắt. Trạng thái phát hành được ghi bổ sung sau khi Render và bundle public xác nhận.
