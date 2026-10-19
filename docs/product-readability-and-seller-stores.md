# Product readability and seller storefronts

This change makes the shared Homeji UI easier to scan and completes the second-hand seller browsing flow in both Explore and Marketplace.

## Design decisions

Used UI UX Pro Max from `nextlevelbuilder/ui-ux-pro-max-skill`, inspected at commit `56ea9cf174ed86786187daa9de0e6247cb0747e4`. Applied guidance on hierarchy, visible focus, touch target spacing, semantic action colors, responsive layouts and contextual assistance. The generated promotional funnel, unrelated purple/red palettes and extra fonts were rejected: Homeji retains its teal identity, Vietnamese typeface and existing product workflows.

`src/product-ui.css` is loaded after shared material and theme styles. It defines paired action colors for light/dark appearances, solid primary actions, clear secondary controls, readable input text, visible focus and room/menu layouts. Existing component styles continue to own geometry and business state. Optical backgrounds remain decorative; upstream readable-glass and native-cart accessibility fixes are preserved.

The floating room recommendation launcher is limited to housing discovery/saved screens. All authenticated users can still open its management dialog through the account menu. Its `interest=manage` link survives discovery URL normalization.

## Marketplace behavior

- Explore's market feed and the second-hand Marketplace use the same seller catalog component. Stable seller IDs determine grouping; identical display names never merge accounts. Unknown IDs do not merge unrelated posts.
- Catalog groups show at most three preview products, with a link to the seller store. Counts describe only the current search results.
- Store URLs contain `seller`, and product URLs contain `item`. Reloading or sharing either link preserves the destination. Store search sends `sellerId` to the existing backend, without an unrelated nearby radius; 50-item store pages offer previous/next navigation.
- Product details expose quantity, stock, seller messaging and an explicit price/quantity confirmation before a single-item wallet purchase. A pending request is guarded against double-clicks. Balance is refreshed for confirmation and after successful ordering. Insufficient funds expose top-up; API rejection keeps the product and error visible.
- Room cards keep their original save/detail/map-selection behavior. In market list mode, clicking a product opens its actual details; map/split mode retains marker selection and links the preview to those details.
- Food menus remain grouped by seller, use compact horizontal dish rows, larger quantity controls and a cart total on the mobile launcher. Checkout text correctly describes pickup at the kitchen, rather than promising delivery. Public restaurant references are placed after the product catalog.

## Verification

- Production read-only API verification: catalog and seller-filtered requests returned HTTP 200; all 13 returned store products matched the requested seller ID.
- Browser fixtures intercept APIs, provider calls, messaging and order creation. They create no real account, conversation, payment or order.
- `tests/homeji-product-ui.e2e.mjs` covers product destinations in 1440px/390px and light/dark appearances, control contrast, input readability, horizontal overflow, storefront/item reload, purchase confirmation, a rejected purchase and retry, messaging navigation, food cart confirmation and recommendation management.
- `tests/marketplace-sellers.test.mjs` covers stable identity, identical names, missing seller IDs, encoded deep links and recommendation query preservation.
- Browser snapshots/results are saved under `output/verification/product-ui/`. These demonstrate the shipped frontend with synthetic data, not a real customer transaction or a live Google sign-in/map round trip.

Validated before release: production build, targeted ESLint and all 293 unit/contract tests passed. The broad fixture browser run passed 138 theme/viewport/destination cases with zero JavaScript errors and no document overflow. Separate wallet balance-priority and 320px/390px cart focus/keyboard regressions also passed. The final upstream kitchen-row material opt-out is preserved.

Production verification: release `16cc65f` was served at https://homeji.onrender.com with entry `/assets/main-d407sgHm.js` and marketplace chunk `/assets/MarketplacePage-C1beXRwH.js`. The deployed frontend passed the storefront/detail reload, wallet confirmation and rejection/retry, messaging, food cart, recommendation management and error-state browser fixture flow. Results and screenshots: `output/verification/product-ui-production/`. No real order, payment or conversation was created. Hit-area measurements wait for press feedback to settle and allow half a CSS pixel of browser geometry rounding.
