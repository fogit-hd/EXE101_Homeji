# Listing photos: provenance

All five photos are AI-generated stand-ins, not photos of real Homeji listings. Each one was prompted to match the room type, price band and area of one sample listing in `src/lib/mock/homeji.ts`, so that budget rooms actually look like budget rooms.

- Generator: Figma AI `generate_image` (model `gpt-image-2.5-flare`), 2026-11-13.
- Source file: Figma "Homeji hero photos" (UKOuD7V6neNIZaHzvdHdAO), nodes 2:2 to 2:6.
- Converted from PNG to WebP (q 0.8) in Chrome via `tmp/to-webp.mjs`. Each photo comes in 1280×960 and 640×480.

| File | Listing | Shows |
|---|---|---|
| balcony | l-01, Thủ Đức, 2,8 triệu | Single bed, desk, sliding glass door to a balcony with a drying rack |
| garden-shared | l-02, Quận 9 (cũ), ở ghép | Two single beds, a shared wardrobe, a window onto a garden |
| loft-studio | l-03, Thủ Đức, 3,5 triệu | Mezzanine loft (gác lửng) with a kitchenette underneath |
| twin-desks | l-04, Thủ Đức, ở ghép | Large room with two beds and two desks |
| loft-shared | l-08, Gò Vấp, ở ghép | Budget room with a wooden loft holding two mattresses |

The other three listings (l-studio, l-shared, l-kitchen) reuse the hero photos in `public/landing/hero/`. Once the API serves real listings, replace these photos with the owners' real ones.
