# Map tab capabilities (Figma 71:2621)

Source frame: `Homeji — Bản đồ mới` (`71:2621`) in file `v0kJhCy06r2pE0tsTQzNnY`.
Backend: `GET /api/rental-posts` (`RentalPostsController.Search` → `RentalPostSearchDto`).
There is no `GET /listings/filter-options` (searched controllers; not present).
Search returns `RentalPostSummaryDto[]` only — no total count, no sort parameter.
Fixed order: `UpdatedAt` desc, then `Id`. Page size clamped 1–100 (default 20).

Only rows with Supported = true are rendered as filters or query fields.

| UI feature | Backend field | API endpoint/query | Data type | Supported |
| --- | --- | --- | --- | --- |
| Search keyword | Keyword | `GET /api/rental-posts?keyword=` | string | true |
| Price min / max | MinPrice, MaxPrice | `minPrice`, `maxPrice` | decimal | true |
| Area min / max | MinArea, MaxArea | `minArea`, `maxArea` | decimal | true |
| Amenities | Amenities (codes on the post) | `amenities` (repeat) | string[] | true |
| Map bounds (search as map moves) | MinLatitude, MaxLatitude, MinLongitude, MaxLongitude | `minLatitude`, `maxLatitude`, `minLongitude`, `maxLongitude` | decimal | true |
| Page | Page, PageSize | `page`, `pageSize` | int | true |
| Result count | — | response is a page array, no total field | — | false |
| Room type filter (Loại phòng) | Type exists on the post, not on `RentalPostSearchDto` | — | — | false |
| Furniture filter (Nội thất) | no furniture field on search or summary | — | — | false |
| Radius filter (Bán kính) | no radius; only axis-aligned bounds | — | — | false |
| Travel time (Di chuyển) | no commute / isochrone field | — | — | false |
| Sort (Phù hợp nhất) | repository orders by UpdatedAt only | — | — | false |
| Match score (Phù hợp %) | not on `RentalPostSummaryDto` | — | — | false |
| Area stats (median price, new this week, minutes to campus) | not returned | — | — | false |
| Max deposit | MaxDeposit | `maxDeposit` | decimal | true |
| Min available slots | MinAvailableSlots | `minAvailableSlots` | int | true |
| Available from before | AvailableFromBefore | `availableFromBefore` | date | true |

Omitted from the map UI (in the Figma frame, no backing query or summary field): loại phòng, nội thất, bán kính, di chuyển, sort, match score, median / “phòng mới” / travel-time chips, and any invented suggestion cards.

Shown without a filter endpoint:

- Amenity choices use the same codes the create/edit form stores (`AMENITY_OPTIONS` in `src/lib/labels.ts`). The API matches `RentalPostAmenity.Code`.
- Search suggestions come from the existing Places autocomplete (`fetchPlacePredictions`). Recent searches read `localStorage` key `homeji:map-search-recent` (Map omnibox store). If that store is empty, the recent row is hidden.
- View modes Bản đồ / Chia đôi / Danh sách are layout only (`view=map|list`, default split).
- Card fields from the summary: title, price, area, address, thumbnail, type, highlight tag, owner badge. Save uses the existing saved-posts API. Detail route stays `/?section=listings&post=`.
