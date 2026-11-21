# Proposal

## Why

The navigation between drawings is still the provisional row of text links ("Anterior · Todos os desenhos · Seguinte") at the bottom of the sheet, and the site has no header. The design turns it into what a child expects from a notebook: arrows beside the page to turn it, and a header with the notebook's name and the way to see every drawing. On a phone, where there is no room beside the sheet, the arrows must stay at hand.

## What Changes

- **Header on every page:** a `<header>` above the content, not fixed. On the left, the place of the future logo, for now the text "caderno" from the dictionary, linking to the home (the latest drawing). On the right, "Todos os desenhos", linking to the index; on the index itself it is marked as the current page.
- **Arrows instead of text links:** the pager leaves the sheet. It keeps only the two arrows, as images with no visible text (their names come from the dictionary for screen readers). The images are provisional hand-drawn-style SVGs in `src/assets/`, one file per arrow, to be replaced later without touching code.
- **Beside the sheet:** on wide screens the arrows sit to the left and right of the sheet, towards its bottom, both pointing towards the sheet, as if pulling the page.
- **BREAKING (meaning of the links): book order.** The site shows the newest drawing first, so moving forward, as in a book, goes to older drawings. The right arrow goes to the older drawing and is "Seguinte" (`rel="next"`); the left arrow goes to the newer one and is "Anterior" (`rel="prev"`). Today it is the other way round.
- **Fixed bar on narrow screens:** when the sheet and both arrows do not fit side by side, the same arrows go to a bar fixed at the bottom of the screen, with the same images. It respects the phone's safe area, every arrow is a touch target of at least 44 × 44 px, and the page leaves room below so the bar never covers content.
- **"Todos os desenhos" moves to the header**, so the pager no longer has an index link. The index has no arrows and no bar.

Out of scope: the final logo and arrow drawings, keyboard shortcuts and swipe gestures, a fixed header, and the page background with doodles.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `drawing-catalog`: the previous and next links follow book order (right/next = older, left/previous = newer), and the index is linked from the header on every page instead of from the drawing page.
- `site-styling`: new `site-header` block; the `pager` block leaves the sheet, loses its `index` link, and is shown as arrows beside the sheet or in a fixed bottom bar; the `drawing` block wraps the sheet and its arrows.

`ui-localization` keeps its requirement: the new "caderno" string comes from the dictionary like every fixed UI text.

## Impact

- **Code:** `index.html` (header element, `viewport-fit=cover`), `src/main.ts` and `src/app.ts` (render the header and mark the current page), `src/ui/drawing-view.ts` (pager outside the sheet, inverted links, hidden labels), a new `src/ui/header.ts`, `src/lib/i18n.ts` (`siteName`).
- **Styles and assets:** new `components/site-header.css`; `components/pager.css` and `components/drawing.css` rewritten; `layout.css`; tokens in `theme.css`; two SVGs in `src/assets/images/`.
- **Tests:** drawing view (pager place and direction), app (header, current page), BEM, and a token test for the breakpoint.
- **No changes:** data, moderation, routes, prefetching of neighbours, CSP (the SVGs are served from `'self'`).
