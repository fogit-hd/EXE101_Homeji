# Source publishers use the native rental flow

The requested reference is Dương Thanh Duy's compact map card and `RoomDetailModal`, not the separate map place detail panel. Published imported listings now use those same components and real native rental IDs for saving, shortlist selection, messaging and viewing controls. The four map-place action icons remain inline SVGs from the earlier request.

The account operation assigned unique name-based reserved-domain aliases to 61 existing imported publisher accounts. No ordinary account, password, subscription or owner verification was changed. Native ownership is matched by the existing contact profile, never display-name equality alone. Database readback found 129 correct links: 103 active native listings and 26 incomplete drafts. All 175 original source records, including expired records, remain intact. Imported accounts remain unclaimed; account creation does not establish real-world identity or prove that a person receives messages.

`sourcePublisherLinks.generated.json` contains only public source, post and profile UUIDs exported by the idempotent backend operation. Linked published source URLs open `RoomDetailModal`. Their previews use `RentalMapPreview`, the native saved-post API and native shortlist IDs. Draft or unmigrated source records keep the source detail fallback, whose dimensions, profile and phone presentation share the native template. Duplicate native/source cards and map markers are removed by the retained source/native UUID.

The close action has its own toolbar so it cannot intercept the save button when no Premium badge exists. Mobile previews retain area/type and shortlist controls. Save failures remain visible and retryable; changing account identity cannot reuse another viewer's saved-state response. Missing source price units, capacity and deposit are not inferred from the imported account role or native draft defaults. The backend's media provenance flag keeps unknown imported price units out of aggregate cost calculations without a schema migration.

Validation on the latest remote main plus these changes:

- 518 frontend tests, production build and changed-file lint.
- 729 backend application unit tests and API build; alias normalization self-test.
- Real components with local intercepted APIs: imported native preview/detail, save failure and retry, save-state synchronization, shortlist ID, phone reveal, native contact controls, 390/1440 layouts.
- Native/source fallback dialog geometry, columns, gallery and footer at 320–1440 widths; clustering, selection, source retry/missing contact, Escape and independent detail scrolling.
- Production database ownership/alias readback and two public native detail responses. These are not authenticated provider or actual message-delivery tests. Public GET requests can increment normal view counters.

Import snapshots and contact-bearing reports remain in ignored backend output and the access-restricted import audit table. Generated aliases are placeholders, not the publishers' actual email addresses. No invitations or messages were sent as part of this operation.
