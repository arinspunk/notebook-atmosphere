# Tasks

## 1. Direction

- [x] 1.1 Create `src/ui/page-turn.ts` with the pure `turnDirection(catalog, fromRkey, toRkey)` (decision 2). Verify with unit tests: `"older"` to a later index, `"newer"` to an earlier one, including several places apart, and `null` when `fromRkey` is `null`, when both are equal, or when either is not in the catalogue.

## 2. Starting the turn

- [x] 2.1 Add `startPageTurn(doc, win, direction, update)` to `src/ui/page-turn.ts` (decisions 1, 2 and 5). With no `startViewTransition`, a `null` direction or `prefers-reduced-motion: reduce`, it runs `update` directly and returns `null`. Otherwise it sets `data-page-turn` on `<html>` (through `dataset`), starts the transition with `update`, and removes the attribute when `finished` settles, whether it succeeds or fails, unless a newer turn has started since. Verify with unit tests using a fake `startViewTransition` that, like the real one, calls `update` asynchronously and whose `finished` the test settles by hand:
  - each of the cases without a transition;
  - the attribute is gone after `finished` resolves and after it rejects;
  - turn A to `"older"`, then turn B to `"newer"` before A's `finished` settles; settling A leaves `"newer"` in place, and settling B removes it. This test fails if the check on the active transition is removed.
- [x] 2.2 In `src/app.ts`, keep `shownRkey` and the active transition (decisions 2, 4 and 6).
  - At the start of `render()`, right after increasing `generation`, skip the active transition.
  - For a drawing route, build the shell first and run the swap through `startPageTurn`. The update first checks `isCurrent()`, then shows the shell and scrolls; if the shell already has `.post__image`, it waits for `img.decode()` raced against `PAGE_TURN_DECODE_MS` (150 ms), with a failed or missing `decode` counting as done.
  - After starting the swap, `render()` awaits `drawingsMemo.load(rkey)`, fills and prefetches exactly as today. There is no second fill path.
  - Set `shownRkey` to the drawing when a current swap shows it, and to `null` on the index and on status messages, "A carregar…" included.

  Verify with DOM tests in `tests/ui.test.ts` through the `win` parameter and the same asynchronous fake `startViewTransition`. The tests cover the spec scenarios:
  - "To the older drawing", "To the newer drawing", "Browser back action" and "Several drawings apart", checking the `data-page-turn` value during the update;
  - "First page", "From the index" and "Reduced motion": no transition is started;
  - "Browser without support": the existing tests, which have no API, still pass unchanged;
  - "Neighbour prepared": `.post__image` is already in the shell when the update callback shows it, and both neighbours of the new drawing are preloaded afterwards (`preloaded` gets their thumbnails);
  - "Neighbour not ready": the callback shows the shell without waiting for the fetch, and the image appears afterwards;
  - "Back twice during a turn": two hash changes before the first update runs; the first transition is skipped, its stale callback shows nothing, and the page ends on the drawing of the last hash;
  - after the background reload, the same drawing is shown again without a transition.

## 3. Styles

- [x] 3.1 Add `--page-turn-duration: 550ms` and `--page-turn-notes-duration: 200ms` to `theme.css`. Write `src/styles/components/page-turn.css` (decision 3) and import it in `main.css`:
  - the names `sheet`, `notes`, `site-header` and `pager`;
  - `animation: none` on the `sheet` and `notes` groups;
  - `perspective` on the sheet pair and `transform-origin` on the rings axis;
  - the two `rotateY` keyframes, chosen by `:root[data-page-turn="older"|"newer"]`, with `z-index` and `mix-blend-mode: normal`;
  - the notes fade out at once and fade in after `--page-turn-duration`;
  - a `prefers-reduced-motion: reduce` block with `animation: none`.

  Raise the component count in `tests/styles.test.ts` (`toBe(11)`) to 12. Add a style test, like the viewer's: every animation in `page-turn.css` uses the tokens, both tokens resolve to times, and the reduced-motion block exists. Verify that `npm test` passes, including the literal-colours, accent and BEM tests.

## 4. Integration

- [x] 4.1 Verify that `npm run check` and `npm test` pass.
- [x] 4.2 With `npm run build && npm run preview`, in Chrome with the console open, on an intermediate drawing with replies whose neighbours have replies too:
  - at 1024 px, "Seguinte": the sheet turns away around the rings, leaning on its −1° tilt without looking skewed, and the older one is uncovered already showing its image; "Anterior": the newer sheet comes back on top;
  - the old notes are gone before the turn ends and the new ones appear after it; no note turns;
  - the header does not move; the side arrows jump at once to their place beside the new sheet, without sliding;
  - the browser's back button after "Seguinte" turns like "Anterior";
  - double-clicking "Seguinte" turns once and ends on the next older drawing (if it moves two, apply the `.pager` fallback in the design's Risks);
  - "Seguinte" twice, then the browser's back button twice quickly, ends on the starting drawing, with no leftover `data-page-turn` on `<html>`;
  - at 360 px, scrolled down to the notes, tapping the bar arrow turns the sheet at the top without it sliding in from above, and the bar stays fixed;
  - with reduced motion emulated in DevTools (Rendering panel), the page changes at once;
  - index → drawing and the first load show no turn;
  - a drawing with a very long text turns acceptably;
  - no CSP violations (design, Risks).

  Results so far (2026-11-21, Chromium driven by Playwright against `vite preview` with the real CSP, test account with two drawings): both directions, back action, double click (one drawing), the −1° tilt (not skewed), the image already on the uncovered sheet, phone scrolled to the bottom (sheet at the top, bar fixed), reduced motion, index → drawing and first load are fine, with no CSP violations and no leftover `data-page-turn`. The rest (the notes fading out and in, "Seguinte" twice + back twice quickly, and a drawing with a very long text) checked by the author.
- [x] 4.3 Repeat the "Seguinte"/"Anterior" checks of 4.2 in Firefox and in Safari on an iPhone, and note the result here. If Safari renders the turn flat, apply the 2D `scaleX` fallback of the design's Risks in `page-turn.css` only.

  Results so far (2026-11-21): Safari on macOS turns like Chrome, with a clean console. Playwright's own WebKit build reported a `style-src-elem` violation per turn and broke the turn; real Safari does not, so that is a quirk of that build, not of the site. Firefox on macOS turns fine too (checked by the author). Safari on the author's iPhone 8 (iOS 16 at most, without the View Transitions API, which arrived in Safari 18) shows no turn: the page changes at once, as the spec's "Browser without support" scenario requires. The turn on a recent iPhone is still unseen; Safari on macOS uses the same engine.
