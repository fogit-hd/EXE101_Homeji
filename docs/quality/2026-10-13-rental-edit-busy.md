# Rental edit concurrency — 2026-10-13

Issue: https://github.com/fogit-hd/EXE101_Homeji/issues/27

Inputs stayed editable after save captured its payload; successful submit could navigate away and discard later edits. Archive and media deletion could overlap mutations. Geocode and Places resolution could overwrite newer addresses.

One synchronous operation lock now serializes save, submit, uploads, deletion and archive. Native edit/media fields and external actions are disabled while pending. Errors release the lock and preserve the input. Location callbacks cannot write during a mutation, and generation checks discard old geocode/Places replies, including after disable/re-enable or unmount. AddressAutocomplete has an optional disabled prop; existing callers retain the default enabled behavior.

Validation: eight real-component transition tests and one autocomplete cancellation test were observed failing before the fix. Fifteen focused tests now pass, including normal typing/selection, provider failure, duplicate events and coordinate invalidation. An obsolete source-pattern test was replaced by behavioral coverage. Isolated production build, focused ESLint and all 223 Node tests passed. This release excludes other form/router/media-queue/UI work still in progress.

Browser verification used only a loopback fixture, not production writes. A delayed PUT left no editable native controls; title/address/file fields and header actions were disabled. The fixture then returned 400; controls unlocked and the edited title remained. Evidence: output/quality/full-audit/edit-busy-pending.png and edit-busy-error-retains-draft.png.

Scope: locks the current edit operation. Unsaved-navigation guarding and media retry-queue changes remain separate work. No API payload or backend authorization changes are required.
