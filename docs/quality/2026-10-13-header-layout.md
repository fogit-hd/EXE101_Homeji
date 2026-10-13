# Responsive header evidence

Tracking: https://github.com/fogit-hd/EXE101_Homeji/issues/24.

The compact header had a 280px minimum search column alongside fixed-size menu, brand and account actions. At a measured 920px viewport, the actual rendered search field overlapped account actions by approximately 104px. A separate search row now applies for 767px < width <= 1100px; small mobile and wide desktop retain their layouts. The header-height variable matches the two 64px rows. This deliberately uses more vertical space to keep search and admin controls usable without hiding primary actions.

A fractional CSS width between 767px and 768px occurred with the current Edge zoom. Neither max-width767 nor min-width768 matched. The range starts immediately above767 to cover that gap. Narrow mobile continues to use its existing search overlay.

Saved/message icon links now have accessible names while their visible labels remain empty, preserving compact widths and destinations.

Verification:
- Through Cua: await headerLayoutProbe.assertHeaderLayout(headerLocalTab), imported from tests/header-layout-probe.mjs, failed before the fix with search/actions collision at920. The same actual-DOM probe passes afterward. It checks visible menu/logo/search/actions rectangles for intersection and viewport overflow; it is not a substitute for click or screen-reader tests.
- Admin: requested widths320,375,767,768,820,920,1024,1100,1101,1180,1181,1440; all no overlap/overflow. Edge zoom can round the measured CSS width (1101->1102,1181->1182), so the probe records actual innerWidth.
- Authenticated home:375,768,920,1100,1181,1440 also pass. Account menu opens and retains the first Quản trị item.
- The actual HeaderLink SSR regression failed with aria-label empty before the accessible-name fix, then passed with Tin đã lưu and Tin nhắn including unread count.
- Isolated archive of HEAD70ffa72 plus only owned files: production build and all194 Node tests pass. Focused ESLint for AppShell, GlobalHeader and both probes passes.
- Local screenshots: output/quality/full-audit/header-920-before.png and header-920-after.png.

No authentication/role, search query, API, database or moderation behavior is changed. Other active working-tree UI changes are excluded from this release. Routes and long-term chatbot history remain disabled. Production verification is recorded after release, separately from local fixture results.

Production follow-up: original https://exe101-homeji.onrender.com serves index-C3kKySkT.css with the new tablet range. After reloading the real Admin session, the same geometry probe at measured innerWidth920 returns zero overlaps and zero viewport overflow, and Saved/Messages links expose their new names. The production origin used a different browser zoom, so the explicit viewport was adjusted until the measured CSS width was920 rather than relying on requested device pixels. Screenshot: output/quality/full-audit/header-920-production.png. Temporary viewport override was reset; no role or moderation data was changed. Implementation commit562bf87 is pushed to main.
