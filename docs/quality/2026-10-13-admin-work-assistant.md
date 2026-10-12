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

Deployment status: source ready for push. Authenticated production behavior has not been reverified in this change because the Edge connection is unavailable. Routes and long-term history remain disabled.
