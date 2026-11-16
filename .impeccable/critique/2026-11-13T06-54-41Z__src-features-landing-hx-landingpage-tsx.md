---
target: landing page route /
total_score: 23
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\PHONG\\Desktop\\Coding_Proj\\EXE101\\exe-homeji-web\\src\\features\\landing-hx\\LandingPage.tsx"
target_fingerprint: "sha256:bbc4c28541d36787010b6f62f56d251d808dc1cb00efbc9768f8aae0eb4a3f30"
target_path: "C:\\Users\\PHONG\\Desktop\\Coding_Proj\\EXE101\\exe-homeji-web\\src\\features\\landing-hx\\LandingPage.tsx"
timestamp: 2026-11-13T06-54-41Z
slug: src-features-landing-hx-landingpage-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score: 23/36 (64%, Acceptable). H7 n/a (Persuade surface). Previous run 22/36.

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Filter chips and card highlight work; hero search form goes stale when listing filters change |
| 2 | Match System / Real World | 3 | "Quận 9 (cũ)" listed beside "TP. Thủ Đức" although Q9 is part of Thủ Đức |
| 3 | User Control and Freedom | 2 | Hero tile click silently resets district/price filters |
| 4 | Consistency and Standards | 2 | Decorative orange: values icon, "Chặng n/4", story heart |
| 5 | Error Prevention | 2 | Ở ghép + Bình Thạnh is empty; Thủ Đức hides the Q9 listing |
| 6 | Recognition Rather Than Recall | 3 | Labelled selects and chips |
| 7 | Flexibility and Efficiency | n/a | Persuade surface |
| 8 | Aesthetic and Minimalist Design | 3 | "Verified" pitched in three consecutive sections before listings |
| 9 | Error Recovery | 3 | Good empty state |
| 10 | Help and Documentation | 2 | Badge explainer added; nothing on deposits/contracts; footer offers in-app support to guests |

## Design Specificity
Hero authored (real listing tiles, TrustStandard Vietnam-specific). Below the fold: icon grid, 4-chapter vector story, 1-2-3 stepper, green CTA band. Listings start ~5,300px down on desktop; mobile page 14,323px.
Detector CLI: exit 0, 15 advisory design-system drift (font-size 13, radius 2), stale DESIGN.md. Live overlay (375/1440 light, 1440 dark): no element overlays; overused-font (brief mandates Plus Jakarta Sans) and bounce-easing (global --ease-spring in src/index.css, unused on "/") are false positives. dark-glow and repeating-stripes no longer fire. No console errors, no overflow.

## Priority Issues
- [P1] "100% xác minh" contradicted: l-02 and l-08 have no verified tag; cards show only rent though TrustStandard promises deposit/fees "hiện trên tin". Fix: badge all or change the stat; add deposit + fees line on ListingCard. → harden/clarify
- [P1] Listing cards hover like links but contain none. Fix: stretched title link "Xem chi tiết" to existing app route or sign-up. → harden
- [P1] Hero form and listing filters desync (stale after "Xóa bộ lọc"; tab mismatch after tile click). Fix: hero controlled by shared query; announce reset. → harden
- [P2] Product buried behind ValueProps + TrustStandard + 4-chapter story. Fix: listings right after hero; merge ValueProps into TrustStandard; shorten/move story. → distill/layout
- [P2] Decorative orange persists; mobile header + sheet primary serve landlords. Fix: brand-tone decorative orange; header CTA "Tìm phòng"; posting in menu/footer. → colorize/clarify

## Persona Red Flags
- Jordan: EN no-op; "Đăng ký miễn phí để xem tất cả tin" reads as paywall; cards dead.
- Riley: 100% vs unbadged cards; "1.500+ phòng" vs 8 listings; Thủ Đức excludes Q9; stale hero filters; sample testimonials vanish in prod.
- Casey: no photo in first 812px; 3-line stat wrap at 375; sheet primary for posters.

## Minor
- 100% stat link leaves focus on body.
- District names dated after 07/2025 reform; consider landmark areas.
- Footer column titles are h2.
- Chatbot h2 hidden from a11y tree while closed (OK).
- Dark mode solid; story vector props look cartoonish in dark.

## Questions
1. Would you put "100%" on a billboard next to an unbadged listing?
2. Why scroll past a fictional story before seeing more real listings?
3. How many landlords land on a page headlined for students?
