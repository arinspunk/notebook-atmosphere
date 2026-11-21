# Tasks

## 1. Gesture

- [ ] 1.1 Write `onSwipe(element, win, { toOlder, toNewer })` in a new `src/ui/swipe.ts` (decision 1): passive `touchstart`/`touchend`/`touchcancel` listeners, the thresholds of the design, the edge margin, the zoom check through `visualViewport`, and multi-touch and `touchcancel` dropping the gesture. Verify with unit tests in a new `tests/swipe.test.ts`, dispatching synthetic touch events:
  - right to left calls `toOlder` and left to right calls `toNewer`;
  - short, slow, mostly vertical, edge-started, two-finger, cancelled and zoomed-in moves call nothing;
  - the listeners are registered as passive.

## 2. Drawing page

- [ ] 2.1 Add `swipeHint: "Passa a página deslizando o dedo"` to `src/lib/i18n.ts`. In `src/ui/drawing-view.ts`, put `span.pager__hint` (`aria-hidden="true"`) between the links in `renderNav`, add `win` to `DrawingViewInput` (passed from `app.ts`), and wire `onSwipe(element, win, …)` on the `drawing` element to `.click()` the page's `a[rel=next]` / `a[rel=prev]` (decisions 2 and 3). Update the tests that list the pager's children. Verify with DOM tests in `tests/ui.test.ts`:
  - the scenarios "Swipe right to left", "Swipe left to right" and "No drawing in that direction" (the hash changes, or does not, through the app);
  - "Viewer open": a swipe dispatched on the open viewer does not change the hash;
  - "Page zoomed in": with a `visualViewport.scale` of 2 on the app's `win`, a swipe does not change the hash;
  - the hint is present with its text and `aria-hidden` on the newest, intermediate and oldest drawings;
  - the BEM test passes.

## 3. Styles

- [ ] 3.1 Add `--pager-bar-icon-size: 1.75rem` to `theme.css`. In `components/pager.css`, hide `.pager__hint` by default, and in the bar under `@media (pointer: coarse)` show it centred between the arrows and shrink the arrow images to `--pager-bar-icon-size` (decision 3). Add style tests:
  - two lines of the hint fit within `--pager-arrow-size`;
  - the link boxes keep `--pager-arrow-size` (at least 44 px);
  - the hint does not use `--color-accent`.

  Verify that `npm test` passes, including the literal-colours, accent and breakpoint tests.

## 4. Integration

- [ ] 4.1 Verify that `npm run check` and `npm test` pass.
- [ ] 4.2 With `npm run build && npm run preview`, in Chrome DevTools device mode (touch, 360 px), with the console open:
  - the bar shows "Passa a página deslizando o dedo" between two smaller arrows, and the arrows still open the neighbours;
  - swiping right to left turns to the older drawing, left to right to the newer one; on the newest, left to right does nothing;
  - a mostly vertical swipe scrolls; a two-finger zoom does not change the drawing;
  - at 360 px, `document.documentElement.scrollWidth` equals `clientWidth` (the page does not scroll sideways; if it does, see the design's Risks);
  - a second swipe during the turn does nothing;
  - at 360 px without touch emulation, the bar shows only the arrows; at 1024 px nothing changes beside the sheet;
  - no CSP violations.
- [ ] 4.3 On a real phone (the author's iPhone 8 is enough; it has no page turn, so the page changes at once):
  - swipes in both directions, scrolling, zoom and panning while zoomed in;
  - a swipe from the left edge does what Safari does (back), with no double navigation;
  - the hint fits in the bar without covering the last note;
  - VoiceOver reads the arrows and not the hint.
