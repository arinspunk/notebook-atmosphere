# Tasks

## 1. Settled results and direction

- [ ] 1.1 Add `peek(rkey)` to `DrawingMemo` in `src/drawing-loader.ts` (decision 4). It returns the settled result of an entry that is still fresh (same 60 s rule as `load`), or `undefined` while it loads, after it expires, or when there is none. Verify with unit tests: `undefined` before and during loading, the `ok` result once settled, `undefined` after 60 s and after `clear()`, and `undefined` after an error (errors are not kept).
- [ ] 1.2 Create `src/ui/page-turn.ts` with the pure `turnDirection(catalog, fromRkey, toRkey)` (decision 2). Verify with unit tests: `"older"` to a later index, `"newer"` to an earlier one, including several places apart, and `null` when `fromRkey` is `null`, when both are equal, or when either is not in the catalogue.

## 2. Starting the turn

- [ ] 2.1 Add `startPageTurn(doc, win, direction, update)` to `src/ui/page-turn.ts` (decisions 1, 2 and 5). With no `startViewTransition`, a `null` direction or `prefers-reduced-motion: reduce`, it runs `update` directly and returns `null`. Otherwise it sets `data-page-turn` on `<html>` (through `dataset`), starts the transition with `update`, and removes the attribute when `finished` settles, whether it succeeds or fails. Verify with unit tests using a fake `startViewTransition`, covering each of those cases and that the attribute is gone after `finished` rejects.
- [ ] 2.2 In `src/app.ts`, keep `shownRkey` and the active transition (decisions 2, 4 and 6).
  - At the start of `render()`, skip the active transition.
  - For a drawing route, run the shell swap through `startPageTurn`. The update shows the shell and scrolls. If `drawingsMemo.peek(rkey)` is `ok`, it fills at once and waits for `img.decode()` raced against `PAGE_TURN_DECODE_MS` (150 ms). Everything else first checks `isCurrent()`.
  - After the swap, fill only if not filled yet.
  - Set `shownRkey` to the drawing shown, and to `null` on the index and on status messages.

  Verify with DOM tests in `tests/ui.test.ts` through the `win` parameter and a fake `startViewTransition`. The tests cover the spec scenarios:
  - "To the older drawing", "To the newer drawing", "Browser back action" and "Several drawings apart", checking the `data-page-turn` value during the update;
  - "First page", "From the index" and "Reduced motion": no transition is started;
  - "Browser without support": the existing tests, which have no API, still pass unchanged;
  - "Neighbour prepared": `.post__image` already exists when the update callback returns;
  - "Neighbour not ready": the callback returns without waiting for the fetch, and the image appears afterwards;
  - "Two quick clicks": the first transition is skipped and the page ends on the drawing two places older;
  - the same drawing re-rendered after a background reload starts no transition.

## 3. Styles

- [ ] 3.1 Add `--page-turn-duration: 550ms` and `--page-turn-notes-duration: 200ms` to `theme.css`. Write `src/styles/components/page-turn.css` (decision 3) and import it in `main.css`:
  - the names `sheet`, `notes`, `site-header` and `pager`;
  - `animation: none` on the `sheet` and `notes` groups;
  - `perspective` on the sheet pair and `transform-origin` on the rings axis;
  - the two `rotateY` keyframes, chosen by `:root[data-page-turn="older"|"newer"]`, with `z-index` and `mix-blend-mode: normal`;
  - the notes fade out at once and fade in after `--page-turn-duration`;
  - a `prefers-reduced-motion: reduce` block with `animation: none`.

  Raise the component count of the literal-colours test if it counts files. Add a style test, like the viewer's: every animation in `page-turn.css` uses the tokens, both tokens resolve to times, and the reduced-motion block exists. Verify that `npm test` passes, including the literal-colours, accent and BEM tests.

## 4. Integration

- [ ] 4.1 Verify that `npm run check` and `npm test` pass.
- [ ] 4.2 With `npm run build && npm run preview`, in Chrome with the console open, on an intermediate drawing with replies whose neighbours have replies too:
  - at 1024 px, "Seguinte": the sheet turns away around the rings, leaning on its −1° tilt without looking skewed, and the older one is uncovered already showing its image; "Anterior": the newer sheet comes back on top;
  - the old notes are gone before the turn ends and the new ones appear after it; no note turns;
  - the header does not move; the side arrows only follow the sheet's bottom;
  - the browser's back button after "Seguinte" turns like "Anterior";
  - clicking "Seguinte" four times quickly ends on the drawing four places older, with no leftover `data-page-turn` on `<html>`;
  - at 360 px, scrolled down to the notes, tapping the bar arrow turns the sheet at the top without it sliding in from above, and the bar stays fixed;
  - with reduced motion emulated in DevTools (Rendering panel), the page changes at once;
  - index → drawing and the first load show no turn;
  - a drawing with a very long text turns acceptably;
  - no CSP violations (design, Risks).
- [ ] 4.3 Repeat the "Seguinte"/"Anterior" checks of 4.2 in Firefox and in Safari on an iPhone, and note the result here. If Safari renders the turn flat, apply the 2D `scaleX` fallback of the design's Risks in `page-turn.css` only.

## Workflow follow-up

- Archive `page-navigation` before archiving this change, since this one builds on its `site-styling` requirements.
