# Dark appearance corrections

The menu used fixed light-theme ink `#243028` against a dark elevated surface.
The final UI consistency layer similarly forced blue badge text to `#0e52a3`.
Root palette changes alone could not fix these local declarations. Static contrast
checks reproduced the defects at 1.05:1 and 1.25:1 respectively.

`components/theme/dark-theme.css` loads after shared optical material and changes only
explicit dark-theme selectors. It supplies opaque raised menus, semantic text and
status pairs, visible placeholders/focus, and calmer administrator controls/tabs.
It also pairs the current-plan/wallet surfaces and outgoing message bubbles with
appropriate light foregrounds. Brand imagery retains its colors on a small light tile;
photos, videos, maps and the light theme are not recolored by this layer.

`node --test tests/dark-theme-contrast.test.mjs` checks menu text, information badges,
secondary copy, placeholders and scoping/import order. New menu/badge pairs measure
11.16:1 and 6.86:1. This is a declaration-level guard, not a claim of a full browser
cascade/accessibility audit. The production build passes. The existing admin component
has an unchanged `react-refresh/only-export-components` ESLint error at its exported
helper; the same error reproduces on the pre-change source.

Visual verification of the dark-mode correction is pending: browser use was disabled
in Work settings during this change. Earlier new-room screenshots predate this repair
and must not be presented as proof of the corrected dark appearance.
