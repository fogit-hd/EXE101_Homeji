# Stability and loading improvements — 2026-10-28

## Verified changes

- Rental cost regression assertions now use the shipped Vietnamese budget wording. Negative assertions also guard the new wording for unknown or per-person prices.
- ReceiptsPage was already lazy on current main. ReferralsPage, the account-only search interest tools, intro implementation, authentication modal and chatbot now have separate import boundaries. The auth modal stays mounted after first opening so close transitions and draft state remain intact.
- App no longer imports HomePage/auth/detail/post-form/pages CSS. Auth and publishing pages import their styles. Shared page styles are imported by the pages that use them. The unused legacy detail stylesheet is no longer requested.
- Vite 8 uses native Rolldown codeSplitting groups for React, GSAP, Query, SignalR, Motion and OAuth. The normal 500 kB warning is restored; the deferred Three.js chunk still exceeds it.
- npm test runs all *.test.mjs. Playwright is installed for existing E2E scripts; those scripts have different server, fixture, Chrome and account requirements, so dependency installation does not establish that all E2E flows pass.
- npm run check:bundle checks the built manifest: main under 250,000 bytes, receipt/referral routes deferred, page styles absent from static initial imports. It prints the complete static JS closure to avoid hiding costs behind vendor filenames.

## Validation

- FE: 391 tests passed; targeted ESLint and TypeScript/Vite build passed.
- Main JS: 805,661 bytes before this work; 225,208 bytes after, about 69.6 kB gzip.
- Complete initial static JS closure: 726,737 bytes. Initial CSS: 188,445 bytes. Home/route/dynamically mounted tools add further requests; this is not an LCP measurement.
- npm audit: zero vulnerabilities after updating the compatible transitive Zod version.
- BE: 38 targeted API/proxy/rate-limit tests passed. A real in-memory HTTP pipeline verifies one exhausted client does not block another behind 10.1.2.3, while forged leftmost X-Forwarded-For values do not create another bucket.
- Local production build was opened through the browser: login and password recovery render; recovery loads after client navigation. Google reports this temporary localhost port is not an authorized OAuth origin; no login, OTP or payment was submitted.

## Backend configuration and limits

Production only adds 10.0.0.0/8 to trusted networks; development defaults remain restricted to loopback. ForwardLimit stays explicitly 1. CORS credentials apply only to configured origins; untrusted origins receive neither allow-origin nor allow-credentials.

This trusts a single immediate internal proxy. It must be narrowed if deployment network isolation changes. Actual Render peer/header chain has not been observed, so production client-IP attribution and multi-hop proxy paths are not proven by the tests. Do not raise ForwardLimit or trust arbitrary public networks without verifying the actual chain.

## References

- https://vite.dev/guide/build
- https://rolldown.rs/in-depth/manual-code-splitting
- https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer
- https://learn.microsoft.com/en-us/aspnet/core/signalr/security
