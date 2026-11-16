---
target: landing page route /
total_score: 22
max_score: 36
na_heuristics: 7
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\PHONG\\Desktop\\Coding_Proj\\EXE101\\exe-homeji-web\\src\\features\\landing-hx\\LandingPage.tsx"
target_fingerprint: "sha256:04d5894152a08359e4250a909ed08d455645d9cf9a2e858fa48772c9654c0bd2"
target_path: "C:\\Users\\PHONG\\Desktop\\Coding_Proj\\EXE101\\exe-homeji-web\\src\\features\\landing-hx\\LandingPage.tsx"
timestamp: 2026-11-13T04-59-07Z
slug: src-features-landing-hx-landingpage-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score: 22/36 (61%, Acceptable). H7 n/a (Persuade surface)

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Search shows filter chips. On mobile the listings grid stays blank after the jump (P0) |
| 2 | Match System / Real World | 3 | Natural Vietnamese and local units. HowItWorks says "Gõ nơi bạn học" (type where you study) but the page only has a district dropdown |
| 3 | User Control and Freedom | 2 | Hero tiles look like specific listings that are not in the results. Listing cards are not clickable |
| 4 | Consistency and Standards | 2 | Two orange CTAs above the fold (seeker vs landlord). "Đã xác thực" vs "Chủ nhà đã xác minh". VI/EN switch does nothing |
| 5 | Error Prevention | 2 | No result-count preview, so Quận 7 + Trên 5 triệu is empty. The lead text "quanh Thủ Đức, Quận 9" ignores the active filter |
| 6 | Recognition Rather Than Recall | 3 | Floating labels and chips are good. Addresses are truncated |
| 7 | Flexibility and Efficiency | n/a | Persuade surface |
| 8 | Aesthetic and Minimalist Design | 3 | Hero is restrained. Cards are dense (2 badges, heart, 9 data points). Mobile page is 13,147px tall |
| 9 | Error Recovery | 3 | Empty state plus "Xóa bộ lọc". No nearest-alternative suggestion |
| 10 | Help and Documentation | 1 | Nothing on deposits, contracts, or what "xác minh" checks |

## Design Specificity
The hero is authored: asymmetric-corner photo grid, glass tags in triệu/m²/quận, verified badge. Below the fold it falls back to a generic SaaS rhythm: icon-row Why, 3-dot How, 6 star cards, green CTA band, 4-column footer. StoryJourney is the most specific idea, but it renders as flat illustration and leaves a large empty column on desktop.
Detector (CLI, src): exit 0. 13 advisory DESIGN.md drift findings: font-size ×10, radius ×2 (stale DESIGN.md, not defects).
Detector (live overlay, landing scope):
- dark-glow: orange accent shadow on the "Tìm phòng ngay" CTA over the emerald-900 band, plus .hx-sv__heart (light theme).
- repeating-stripes-gradient: .hx-sv__fake-img hatch (375 only).
- overused-font: false positive, Plus Jakarta Sans is required by the brief.
- bounce-easing: false positive, global --ease-spring used only by MobileTabBar, which is not rendered here.

## Priority Issues
- [P0] Mobile listings blank after search/nav jump. Reveal.tsx VIEWPORT amount 0.2 on a ~3,600px RevealGroup. Fix: per-card reveal or amount 0 / margin. → harden/animate
- [P1] 8 listing cards reuse 2 photos, and hero tiles are not real listings. This contradicts the "ảnh thật" promise. Fix: distinct photo per listing; make the HERO_SHOWCASE items entries in LISTINGS and highlight on click. → harden
- [P1] Trust is asserted, never shown. "100% xác minh chính chủ" has no explanation of what verification checks; nothing on deposits or contracts. Fix: a "Xác minh nghĩa là gì" block (ID/ownership check, photo date, itemised fees, report listing), placed in the empty story column. → clarify
- [P1] Seeker and landlord CTAs compete. Orange "Đăng tin ngay" is the only header CTA on mobile and the sheet's primary. Fix: one orange action per view; landlord CTA becomes outline or moves into the menu; mobile header gets a seeker action. → layout/distill
- [P2] Template rhythm below the hero. Fix: fold ValueProps into the story; HowItWorks shows real UI fragments; one strong testimonial instead of a 6-card grid; drop the orange glow on the CTA band. → bolder/distill

## Persona Red Flags
- Jordan: "Dịch vụ" goes to "Tại sao chọn"; "Đã xác thực" vs "Chủ nhà đã xác minh" is ambiguous; cards are not clickable; "Gõ" with no input; nothing on deposits.
- Riley: clicked hero studio is missing from results; empty filter combos; VI/EN is a no-op; duplicate photos; lead copy ignores the filter; hearts are not persisted.
- Casey: blank listings after jump; landlord CTA in the thumb's path; 13k px page; cramped 3-column stats at 375.

## Minor
- Chatbot injects an extra h2 into the outline.
- Scroll offset leaves ~180px of story background above the listings heading.
- Orange testimonial stars break the "orange only for actions" rule.
- Listing tabs vs hero tabs use different words for the same split.
- Dark mode is solid.

## Questions
1. Why is the strongest trust device a percentage, not an inspectable proof?
2. Why can't a visitor touch one roommate-compatibility attribute?
3. Who is the navbar's orange button for?
