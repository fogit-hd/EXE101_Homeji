---
target: toàn bộ member web app
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 6
target_identity: "file:C:\\Users\\PHONG\\Desktop\\Coding_Proj\\EXE101\\exe-homeji-web\\src\\components\\map\\listings\\MapListingsWorkspace.tsx"
target_fingerprint: "sha256:beb59db887a886afa3d95aa95038318d780b43458f514ad66027a107f64a98d2"
target_path: "C:\\Users\\PHONG\\Desktop\\Coding_Proj\\EXE101\\exe-homeji-web\\src\\components\\map\\listings\\MapListingsWorkspace.tsx"
timestamp: 2026-11-24T20-26-16Z
slug: nts-map-listings-maplistingsworkspace-tsx-e3c142fc
---
# Critique: Homeji member web app (2026-11-25)
Method: dual-agent (A design review · B detector+browser)
Score 22/40 (Acceptable). H1 2, H2 3, H3 2, H4 1, H5 2, H6 3, H7 2, H8 2, H9 3, H10 2.
P0: price pin mouse click does nothing (mapLocationPins coordinateAnchorRoot 0x0); filter sheet chips collapse to 0-width column (legend float, MapListingsWorkspace.css:214).
P1: filter chip selected/unselected colors inverted (.map-listings__popover button green); dark cluster InfoWindow unreadable; home invitation count counts non-pending; Premium vs AI agent quota contradiction + upsell to active Premium; count mismatch 113 vs 99; cluster count white on #65a30d 3.1:1.
P2: Phòng mới fixed button overlaps; detail CTA booking demoted; naming inconsistencies; focus not restored after filter close; side-tab stripes (PaymentPage.css:908 etc); touch targets <44.
P3: map cold-load no skeleton; sort glass transparency; duplicate nav labels; seed copy visible; Nổi bật on every card; bounce easing.
Toolbar: Lọc icon-only + count badge; sort keep value text; view -> 3-icon segmented control.
