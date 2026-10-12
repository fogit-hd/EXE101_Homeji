# Admin work assistant evidence

Scope: FE issue https://github.com/fogit-hd/EXE101_Homeji/issues/23 and BE issue https://github.com/thanhduykx/Homeji_BE/issues/19.

- One assistant entry replaces the duplicate work-check buttons. Loaded queue counts retain their explicit filter/snapshot scope.
- Opening a task reloads queues before focusing and scrolling to the exact post/report row. Report tasks reset the filter to pending. Unknown task kinds are ignored.
- A task no longer in the queue produces a persistent inline status; it does not select another row or make a moderation decision.
- Summary requests are cancellable on unmount and guarded against overlapping refreshes.

Validation against isolated HEAD a573a6d plus only this change:
- Original overview regression failed with two entries; current regression passes with one.
- Production build passed; Node suite 193 passed. Focused ESLint passed for assistant, operations summary and API. AdminModerationPage has the existing react-refresh export warning/error for cleanAdminReportText; it predates this change.
- Browser local fixture: login -> /admin; exact second post and second report received focus, verified by activeElement.id. Switching from resolved reports to a pending task reset the filter to 1 and focused report.Id (different from targetId).
- Stale synthetic task shows inline status after reload. Unknown payments task is absent.
- Screenshot: output/quality/full-audit/admin-queue-stale-local.png (local fixture, not production).

Backend companion passed 430 unit tests and 126 API/infrastructure tests; 13 opt-in database tests skipped. Queue task SQL translation includes status filters, deterministic CreatedAt/Id ordering, LIMIT 10 and narrow projection without joins/media. Exact counts are separate from task caps. Sequential queries can observe concurrent queue changes; the UI revalidates before navigation. No migration or production data write is required.

Deployment verification after push: FE commits 55fa7f4 and af7644c are on main. The original origin serves index--LZ8u5eB.js and AdminModerationPage-Bw3pqdhm.js containing both exact-task navigation and styled task buttons. Render reports BE commit 713a257 Live; /health/ready returned 200 Healthy. Authenticated production task behavior was subsequently verified below. Screenshot admin-assistant-local.png is a local-fixture visual proof only. Routes and long-term history remain disabled.

Authenticated production verification (2026-10-13, Asia/Ho_Chi_Minh): admin@gmail.com signs in directly to /admin and the header has a prominent Quản trị action. One assistant shows 0 pending rental posts and 14 New reports, with ten report tasks. Opening the unique review-report task reloads the queue, selects pending filter 1 and focuses the actual report row whose reason matches the task. No moderation decision was submitted. Screenshots: output/quality/full-audit/admin-assistant-production.png and admin-task-production.png. The personal renter account correctly lacks the admin action; its role was not changed.
