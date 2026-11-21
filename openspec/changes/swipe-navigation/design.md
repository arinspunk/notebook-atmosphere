# Design

## Context

- The drawing page is `div.drawing > div.drawing__sheet > (article.post, nav.pager)`, then `section.replies`. `nav.pager` holds `a.pager__link--prev` (`rel="prev"`, newer) and `a.pager__link--next` (`rel="next"`, older), each with a hidden `span.pager__label`; a missing destination means a missing link (`renderNav` in `src/ui/drawing-view.ts`).
- Below `39.25rem` the pager is a bar fixed at the bottom. Each link is a `--pager-arrow-size` (3rem, 48 px) box with the arrow SVG as `background-size: contain`. `drawing.css` leaves room for the bar from `--pager-arrow-size` and `--pager-bar-padding`.
- Activating a link changes the hash, so `render()` runs and the page turns (`page-turn-transition`) in the direction of the catalogue.
- The image viewer is a modal `<dialog>` appended to `document.body`, outside `.drawing`.
- The author's iPhone 8 (iOS 16) has Touch and Pointer Events but no View Transitions; there, swiping changes the page at once, as the arrows do.

## Goals / Non-Goals

**Goals:**
- A swipe does exactly what the arrow does, through the arrow itself.
- Never get in the way of scrolling, zooming, panning a zoomed page, or the browser's edge gestures.
- The bar teaches the gesture on touch screens and keeps accessible arrows.

**Non-Goals:**
- The sheet following the finger while dragging.
- Swiping on the index or in the viewer.

## Decisions

### 1. Touch Events, passive, with `touch-action` untouched

A new `src/ui/swipe.ts` exports `onSwipe(element, win, { toOlder, toNewer })`. It listens to `touchstart`, `touchend` and `touchcancel` on `element` with `{ passive: true }`, and never calls `preventDefault`, so scrolling, pinch zoom and panning stay entirely the browser's.

- **`touchstart`** with exactly one touch: it records x, y and time. With more than one touch, it forgets any gesture in progress.
- **`touchend`**: it takes the move from `changedTouches[0]`.

The move counts as a swipe only if all of these hold:
- `|dx| ≥ 56 px`;
- `|dx| ≥ 2 × |dy|`;
- it lasts 800 ms at most;
- it started at least 24 px from the left and right edges of the viewport;
- the page is not zoomed in (`win.visualViewport?.scale` is 1, within 0.01).

Then `dx < 0` (right to left) calls `toOlder`, and `dx > 0` calls `toNewer`.

*Alternatives:*
- **Pointer Events with `touch-action: pan-y pinch-zoom`** is the usual recipe. But `pan-y` stops the browser from panning sideways, which breaks moving around a zoomed-in page, an accessibility need.
- **Pointer Events with `touch-action: auto`** do not work: the browser sends `pointercancel` as soon as it takes the touch for panning, so the gesture never completes.

Touch Events keep arriving while the browser pans, which is why they are used.

### 2. The swipe activates the arrow

In `renderDrawingShell`, after building the pager, `onSwipe(element, win, …)`. `win` is a new field of `DrawingViewInput`, passed by `app.ts` from its own `win`, as the rest of the app does, so the tests can give it a `visualViewport`:
- `toOlder` calls `.click()` on the `a[rel=next]` of this page, if there is one;
- `toNewer` calls `.click()` on its `a[rel=prev]`.

The link stays the single source of the destination, history entry and page turn, and a missing link means nothing happens. The listeners live on the page's own `.drawing` element, so they go away with it. The viewer is outside `.drawing`, so swipes on it never reach them.

### 3. The hint in the pager

`renderNav` puts `span.pager__hint` between the two links, always, with the dictionary's `swipeHint` ("Passa a página deslizando o dedo") and `aria-hidden="true"`. Screen reader users cannot use this swipe (the reader takes it), and the arrows already have names.

In `pager.css`, `.pager__hint` is `display: none` by default. Only in the bar and under `@media (pointer: coarse)`, that is, when the main pointer is a finger, it shows:
- taking the space between the arrows (`flex: 1`), with its text centred in that space;
- with a small text size and a text colour token (never `--color-accent`, which is decorative);
- allowed to wrap to two lines.

In the same block, the arrow images shrink to `--pager-bar-icon-size` (1.75rem) with `background-size`. The link boxes stay `--pager-arrow-size` (48 px), so the touch targets, the bar's height and `drawing.css`'s room for the bar do not change.

Two lines of hint (`2 × line-height`) must fit within `--pager-arrow-size`, so the bar never grows beyond the room left for it; a style test checks it. With one link missing, the hint takes the space beside the other arrow, and its text is centred in that space, not in the bar: half an arrow off centre, which is accepted rather than reserving an empty slot. The pager already pushes a lone "next" link to the right, and the hint's `flex: 1` keeps that.

*Alternative:* showing the hint on any narrow screen. On a computer with a mouse it would tell the visitor to use a finger, so it is shown only when the main pointer is coarse. A computer with a touch screen and a trackpad has a fine main pointer: it gets no hint, although swiping works there too.

### 4. Tokens and strings

- `--pager-bar-icon-size: 1.75rem` in `theme.css`, next to the pager tokens. The hint's size and line height use the existing typography tokens.
- `swipeHint` in `src/lib/i18n.ts`, in the navigation group.

## Risks / Trade-offs

- **[Risk] iOS Safari's own edge swipe (back/forward) fires anyway** and navigates the history, which also turns the page through `hashchange`. → Mitigation: swipes that start within 24 px of an edge are ignored, so the site never adds a second navigation on top. The browser's gesture is the same history move the back button makes, so it lands on the right drawing.
- **[Risk] A sideways scroll is taken as a swipe as well.** `.replies` clips with `overflow-x: clip`, but neither `html` nor `.drawing` clips, and the sheet's −1° tilt could make the page a few pixels wider than the screen at 360 px; a swipe would then both pan the page and change the drawing. → Mitigation: a check in tasks that the page does not scroll sideways at 360 px; if it does, clip it in `layout.css`. → Mitigation: anything that scrolls sideways in the future would have to stop the swipe; this is noted in the code.
- **[Risk] Swiping on a note's link** follows the link instead. Browsers do not fire `click` after a moving touch, so only the swipe happens.
- **[Trade-off] Swipes during a page turn are lost.** While the view transition runs, touches go to its pseudo-elements on `<html>`, not to `.drawing`, as clicks do (`page-turn-transition`, decision 6). A second quick swipe does nothing, like a double click on an arrow.
- **[Trade-off] No feedback while dragging:** the turn starts when the finger lifts. Following the finger needs non-passive listeners and a different turn; it is out of scope.
- **[Trade-off] `visualViewport` is missing in very old browsers.** There the zoom check is skipped and swipes always count.

## Migration Plan

Nothing to migrate. Rollback means removing `swipe.ts` and its call, the hint span, its string, and the `pointer: coarse` block.
