# Dark appearance readability verification — 2026-10-21

The map seller panel used three product columns inside a narrow container. Commit
b95fecd changes this panel to individual rows, preserving product selection and
seller links. Main marketplace grids retain their existing layout.

This follow-up repairs paired foreground/background colors in AI examples,
assistant forms, calendar controls, appointment states, legal pages, toast states,
notification counters and guest map filters. Calendar background colors no longer
reuse a text-color token. Promotional CTAs retain their own paired canvas instead
of inheriting a dark glass fill. Mobile home room images now fit their grid column
and cannot overlap room names or prices.

Verification uses local Chromium with intercepted API fixtures. It does not make
real financial, messaging, account or database writes. The contrast helper checks
settled text against composited solid fills; screenshots remain necessary for
images, gradients, backdrop filters and layout. Disabled controls and invisible
entrance animations are excluded from contrast assertions.

Run with a local Vite server and Playwright available:

```powershell
$env:HOMEJI_TEST_BASE_URL='http://127.0.0.1:5518'
node tests/dark-project-readability.e2e.mjs
node tests/dark-components-readability.e2e.mjs
node tests/map-market-list.e2e.mjs
node tests/workspace-readability.e2e.mjs
node tests/content-surfaces.e2e.mjs
node tests/rental-contact-layout.e2e.mjs
npm run build
npm run lint
node --test tests/*.test.mjs
```

The project sweep includes signed-in routes, admin, account menu, search popup,
login/register/recovery, guest landing and legal pages at desktop/mobile widths.
Component fixtures additionally cover 320/390/1440 px, appointment status variants,
rescheduling, AI results, comparison/calculator and all toast tones. Existing
regressions cover chat/phone, wallet, invitations, notifications, receipts and
room contact overlays in both themes.

Build, lint and 309 unit tests passed. Screenshot evidence is stored under
`output/verification/`. A deployed bundle must be checked independently; pushing
main is not proof that Render has completed deployment.
