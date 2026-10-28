# Profile account hub redesign

The profile now uses a dark teal identity banner and a compact two-column card layout. Personal details and optional roommate preferences have separate actions. Voucher and membership links appear as small account shortcuts. The previous introductory hero and sidebar settings layout are removed.

## Behavior

- Saved basic information remains distinct from optional lifestyle completion.
- Existing avatar upload, profile/lifestyle save handlers, return links and landlord verification behavior remain connected.
- The name, role and current plan come from the loaded account. No new verification or payment eligibility is inferred.
- Layout stacks below 700 px and handles long values without horizontal overflow.

## Validation

- TypeScript/Vite build and targeted ESLint passed.
- All 408 unit/regression tests passed.
- `node tests/profile-redesign.e2e.mjs` passed against loopback fixtures: overview, profile save/refresh, roommate editor/back, landlord verification, light/dark, and widths 320, 390, 768, 1440.
- Local screenshots and results are in `output/verification/profile-redesign/`. They use fictional accounts, not production account data.
- The logged-out production browser cannot establish authenticated profile behavior. Release asset checks alone do not establish real-account saves.
