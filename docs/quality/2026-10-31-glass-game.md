# Thử kính WebGL và Lật thẻ Góc nhà

Phạm vi đã được người dùng duyệt ngày 31/10/2026. Chỉ sửa frontend local, chưa deploy.

## Kính

- Chỉ cụm tab chính của MarketplaceHeader bật `webglGlass`; các cụm tab khác giữ nguyên.
- Một canvas WebGL nhỏ nằm trong lens di chuyển, dưới chữ và vùng bấm HTML. Shader tính normal của bề mặt capsule 3D, phản sáng và viền Fresnel; khúc xạ nền DOM vẫn do CSS/SVG sẵn có thực hiện. Không gọi đây là WebGL lấy mẫu trực tiếp toàn bộ trang HTML hay mô phỏng quang học vật lý đầy đủ.
- Render theo thay đổi kích thước, pointer, trạng thái và theme; không có vòng lặp render liên tục khi nghỉ. Dừng vẽ khi khuất hoặc tab trình duyệt ẩn. DPR giới hạn 1,5; backing buffer giới hạn 1024 × 256. Giải phóng shader/program/buffer/context khi unmount.
- Không có WebGL, compile lỗi hoặc mất context: giữ điều hướng và kính CSS. Tôn trọng reduced-transparency/forced-colors; chuyển động tab vốn có tôn trọng reduced-motion.
- Không thêm thư viện hay texture. Build quan sát: chunk renderer khoảng 4,7 KB chưa gzip; tải động.

## Game

- Nút “Chơi một chút” ở Chợ Homeji và khi chờ AI. Không tự mở hay kéo dài request; khi AI phản hồi, game giữ ván và hiện nút quay lại chat. Focus quay về ô nhập khi nút mở đã ẩn.
- 8 thẻ / 4 cặp đồ vật bằng SVG riêng, lật 3D bằng CSS; không dùng asset hoặc script từ website game bên ngoài.
- Luật trong reducer thuần, chặn lật thẻ thứ ba khi đang so cặp. Không đếm ngược, không âm thanh tự động, không tiền/voucher hay API giao dịch. Kỷ lục số lượt chỉ lưu localStorage trên máy và không ảnh hưởng chức năng khi storage bị chặn.
- Native modal dialog giữ focus; Escape/đóng trả về tác vụ chính. Game tải động, có ErrorBoundary riêng; đóng hoặc ẩn game dừng timer so cặp. Trong thời gian mounted, đóng rồi mở lại vẫn giữ ván.

## Kiểm chứng và giới hạn

- 4 tests luật game, gồm lượt tối thiểu, click nhanh, shuffle và storage lỗi; 29 tests phục hồi chat hiện có.
- `tests/glass-game.e2e.mjs`: Chromium headless trên Intel Iris Xe, viewport 390 px DPR 3 và 1280 px DPR 1; thêm trường hợp WebGL bị chặn. Đã kiểm tra một canvas, chọn tab/keyboard, idle không vẽ liên tục, mất context vẫn điều hướng, hoàn thành game/lưu kỷ lục, reduced-motion, thông báo AI trả lời và focus quay lại chat.
- `tests/liquid-tab-transition.e2e.mjs`: chuyển động lens, retarget liên tiếp, chữ rõ, layout 320/390/900 px sáng/tối và reduced-motion/keyboard qua.
- Kết quả và ảnh: `output/verification/glass-game/results.json` và các PNG cùng thư mục. Frame interval của rAF và thời gian CPU submit được ghi riêng; không coi chúng là GPU timing hoặc bằng chứng đạt FPS trên điện thoại thật. Chưa kiểm tra thiết bị Android/iOS vật lý; giữ phạm vi thử ở một cụm tab.
- Build và ESLint các module thay đổi qua; build vẫn có cảnh báo chunk lớn sẵn có.

Nguồn kỹ thuật: [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices), [MDN showModal](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal).
