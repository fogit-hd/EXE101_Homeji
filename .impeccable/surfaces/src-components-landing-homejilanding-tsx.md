---
version: 1
slug: "src-components-landing-homejilanding-tsx"
primary_target: "src/components/landing/HomejiLanding.tsx"
related_targets: ["src/components/landing/explore/ExploreScene.tsx"]
---

# Guest landing (Homeji Web, route /)

Scope: guest scrollytelling landing, 10 scenes (docs/landing-scrollytelling-plan.md v4). Mode: Persuade; scene 5 "Tìm phòng quanh bạn" is the working tool inside it (Operate rules for its controls).
Audience: sinh viên và người đi làm trẻ quanh Thủ Đức – Quận 9, phần lớn trên điện thoại. Job: tin Homeji an toàn hơn tự tìm, rồi tìm phòng thật quanh nơi muốn ở. Proof: tin thật từ API, chủ nhà đã xác minh, 3 chỉ số cũ. Constraints: không bịa số liệu, không hứa giữ cọc, tiếng Việt, Maps key chỉ localhost:5173.

## Direction contract

THESIS: Landing là cuốn sổ tìm trọ của một sinh viên: mỗi phòng là một dòng ghi chú đánh số, khớp với ghim trên tờ bản đồ dán vào trang. Từ chối bố cục "thanh lọc + lưới thẻ trắng + bản đồ" của mọi trang thuê nhà.

OWN-WORLD: Giấy vở trắng xanh lạnh #fbfcff kẻ ô li tím (ô nhỏ 20px #dcd9f5, ô lớn 80px #b8b2ea), lề đỏ #d8443c, mực bi xanh #1c3aa6, chữ in đậm #16213f (Be Vietnam Pro 800), ghi chú viết tay Patrick Hand màu mực, bút dạ quang xanh Grab #00b14f chỉ cho một điểm đang chú ý, băng keo giấy mờ, ảnh dán lệch nhẹ. Tối: trang giấy than #10162a, ô #232b4a, mực #9fb3ff, dạ quang giữ xanh.

STORY: Người xem thấy một trang sổ đang ghi dở việc tìm trọ, hiểu ngay đây là nơi tìm phòng thật quanh chỗ mình học/làm, gõ nơi muốn ở, thấy ghi chú và ghim đánh số hiện ra, mở một phòng để xem.

FIRST VIEWPORT (cảnh 5, 1440×900): lề đỏ x≈96; tiêu đề in đậm 52px trên cùng, cụm "quanh nơi bạn muốn ở" có vệt dạ quang; dưới là dòng viết tay làm ô tìm (gạch chân mực) + bán kính 1/2/3 km khoanh tay; dòng bộ lọc viết tay gạch đứt; trái 480px là danh sách ghi chú đánh số cuộn trong khung; phải là bản đồ Google như tờ in dán 4 góc băng keo (bản đồ giữ thẳng để ô bản đồ nét và điểm bấm chính xác; tờ giấy lót bên dưới nghiêng 1.3° mang độ lệch tay), ghim tròn đánh số mực xanh, ghim đang chọn tô dạ quang, vòng bán kính nét đứt mực xanh. "Tiếp tục xem Homeji" là liên kết gạch chân ở chân trang.

FORM: Vở ô li học sinh Việt Nam, vị trí 5 trong danh sách grounded (được bốc thăm). Signature interaction: truy vết hai chiều số ghim ↔ số dòng ghi chú (rê/bấm một bên, bên kia nổi dạ quang). Raises: lưới ô li 20px là đơn vị bố cục (teletext); dạ quang chỉ một điểm chú ý (poster Ba Lan); dải dữ liệu cố định mỗi dòng (hũ muối); số đếm thật làm chrome nhỏ (Cyworld). seed:da51384d27fb3090

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
