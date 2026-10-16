# Search URL synchronization — 2026-10-13

Issue: https://github.com/fogit-hd/EXE101_Homeji/issues/25

Browser Back removed the URL query while leaving the search field populated. Housing, roommate and marketplace contexts now follow explicit query removal and Forward navigation. Selecting a map place uses its placeName in the field. Independent context drafts and unrelated filter/view changes retain their previous behavior.

Verification: the actual local browser reproduced stale housing text before the fix; Back/Forward passed for all three contexts after it. Eight provider transition tests pass, including place selection and draft preservation. An isolated production build, focused ESLint and 202 Node tests passed. The isolated source excludes unrelated work in progress; only the two URL synchronization hunks are included in this release.

Production deployment verification is recorded separately after release. This change does not alter search endpoints or map viewport requests.

Production verification: https://exe101-homeji.onrender.com served index-CEiUqDQd.js. Authenticated UI checks passed: housing keyword=UEL, roommate roommateQuery=UEL, and marketplace q=bàn each cleared the field on Back and restored it on Forward. Production claims above are based on the original requested URL itself.
