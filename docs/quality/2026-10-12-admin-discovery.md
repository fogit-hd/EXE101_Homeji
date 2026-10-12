# Discoverable administrator workspace

Tracking: [FE #21](https://github.com/fogit-hd/EXE101_Homeji/issues/21).

The administration destination existed only as an English Admin item hidden in the account menu, which described every account as personal. Verified Admin profiles now receive a prominent Quản trị header action in place of the posting CTA, an accurate Quản trị viên account label and a first-position Quản trị menu link. The action stays visible when ordinary secondary links disappear on mobile, including payment layouts. Posting remains accessible through existing navigation.

Normal sign-in defaults to /admin for an Admin profile and / for other profiles. Explicit internal return paths remain intact. Password and Google handlers wait for session/profile work to finish before the existing redirect effect chooses the destination; they no longer perform competing immediate redirects. Invalid external/control-character return paths fall back to the role's default destination. The verified backend role is authoritative; no email allowlist or permission change is introduced. Existing AdminRoute and backend authorization remain required.

Verification: 188 Node tests pass, including three new default/explicit/unsafe destination cases; production build passes. Edge local password login with profile delayed 2500ms stayed pending, then reached /admin. Renter login reached /; opening /admin redirected to / with no admin CTA. Keyboard activation opened the account menu with Quản trị viên and Quản trị. A CDP viewport of exactly 320px showed the CTA fully inside the viewport and document scrollWidth 320; screenshots are in ignored output/quality/full-audit/admin-desktop-local.png and admin-mobile-local.png. Temporary viewport overrides were reset.

Focused lint for the destination helper and fixture passes. AuthPage retains its existing 14 errors and two warnings, unchanged from HEAD; repository-wide lint is not claimed clean. Local fixtures do not verify a real password or Google OAuth round trip on production.

Production verification: the exact origin now serves index-DADNSX-G.js with the admin CTA. The logged-in account named Homeji Admin initially had backend role Renter, confirmed by its profile page and a bounded auth/profile query for the user-designated account. After restoring that confirmed account's Admin role, a fresh browser load displayed Quản trị and opened /admin with live operational data. Screenshot: ignored output/quality/full-audit/admin-production-2026-10-12.png. The separate downgrade path in lifestyle updates is tracked by [BE #17](https://github.com/thanhduykx/Homeji_BE/issues/17). Two other existing Admin profiles were not changed while the user's policy clarification is pending.

The local payment layout was also loaded at exactly 320px: CTA display flex, right edge 266px, document scrollWidth 320. Temporary CDP overrides were cleared afterward.
