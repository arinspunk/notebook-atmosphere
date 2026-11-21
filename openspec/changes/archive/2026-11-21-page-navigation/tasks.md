# Tasks

## 1. Header

- [x] 1.1 Add the `siteName` string ("caderno") to `src/lib/i18n.ts`, write `renderHeader` in a new `src/ui/header.ts`, add `<header class="site-header" id="site-header">` before `<main>` in `index.html`, and pass it to `startApp` through a new optional `header` in `AppDeps` (decision 1). Verify with DOM tests the scenarios "Header on a drawing", "Header on the index" (`aria-current="page"` only on the index, removed when leaving it), "Header on a status message" and "Link from any page" of the specs, and that the BEM test passes for the header.
- [x] 1.2 Write `components/site-header.css` and import it in `main.css`; adjust the top padding of `.app` (decision 6). Raise the component count of the literal-colours test. Verify that `npm test` passes, including the literal-colours test.

## 2. Pager markup

- [x] 2.1 In `src/ui/drawing-view.ts`, build `div.drawing > div.drawing__sheet > (article.post, nav.pager)`, map `--prev` to the newer drawing and `--next` to the older one, drop the index link, and put each label in `span.pager__label` (decision 2). Update the tests that expected the pager inside the post, the index link in the pager or the old direction. Verify with DOM tests the `drawing-catalog` scenarios "Dibujo intermedio", "Dibujo más reciente", "Dibujo más antiguo" and "Names of the links", and the `site-styling` scenarios "Dibujo completo", "Primer dibujo", "Drawing with replies" and "Drawing without visible replies"; that `fail()` still leaves the arrows; and that the index page has no `.pager`.

## 3. Arrows and layout

- [x] 3.1 Add the provisional `src/assets/images/arrow-prev.svg` (pointing right) and `arrow-next.svg` (pointing left) (decision 3). Verify that they open in the browser and that `npm run build` emits them as files, with no `data:` URI in the CSS.
- [x] 3.2 Add the pager tokens of decision 4 to `theme.css`, rewrite `components/pager.css` (bar by default, beside the sheet from `39.25rem`, hidden labels) and `components/drawing.css` (`drawing__sheet`, room for the bar), and add a test that recomputes the breakpoint from the tokens. Verify that `npm test` passes, and that the breakpoint test fails with `--pager-arrow-size` temporarily set to `4rem`.
- [x] 3.3 Add `viewport-fit=cover` to `index.html` and the safe-area side padding to `.app` and `.site-header` (decision 5). Verify that `npm test` passes, including the test of `index.html` without inline styles.

## 4. Integration

- [x] 4.1 Verify that `npm run check` and `npm test` pass.
- [x] 4.2 With `npm run build && npm run preview`, in Chrome with the console open, on an intermediate drawing with replies:
  - at 1024 px: header with "caderno" at the left and "Todos os desenhos" at the right; "Anterior" arrow at the left of the sheet and "Seguinte" at its right, in its lower part, both pointing towards it; clicking the right arrow opens the older drawing;
  - at 628 px (39.25rem) the arrows are still beside the sheet, and at 627 px they are in the bar;
  - at 360 px: the bar is fixed at the bottom while scrolling, the arrows are at least 44 × 44 px, and at the end of the page the last note is fully above the bar;
  - on the newest drawing only the right arrow shows, still at the right; on the oldest only the left one;
  - on the index: no bar, and "Todos os desenhos" is marked as the current page;
  - the accessibility tree names the arrows "Anterior" and "Seguinte", and no label text is visible;
  - no CSP violations.
