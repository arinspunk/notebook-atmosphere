# Tasks

## 1. Sticking on in view

- [x] 1.1 Write `stickNotes(section, win, after?)` in a new `src/ui/note-stick.ts` (decisions 1 and 2). It adds `replies--sticking` and observes each `.replies__thread` once `after` settles (or at once); with threshold `0` and `rootMargin: "0px 0px -15% 0px"`; on intersection it sets `--note-stick-order` through CSSOM (in document order, capped at 4) and adds `replies__thread--stuck`; it disconnects when all are stuck or on `stop()`. With reduced motion or without `IntersectionObserver` it does nothing. Verify with unit tests in a new `tests/note-stick.test.ts`, using a fake `IntersectionObserver`:
  - the observer is created with threshold `0` and that `rootMargin`;
  - two threads entering together get orders 0 and 1, also when the fake reports them in reverse order;
  - a thread entering later gets 0;
  - each thread is stuck only once;
  - nothing is observed before `after` settles, including when it rejects;
  - `stop()` disconnects, and `stop()` before `after` settles means nothing is ever observed;
  - no arm without the observer or with reduced motion.
- [x] 1.2 Make `fill()` in `src/ui/drawing-view.ts` return the `.replies` section or `null`. In `src/app.ts`, call `stickNotes(section, win, turn?.finished)` after `fill()`, keep its `stop()`, and call it at the start of every `render()` (decision 4). Verify with DOM tests in `tests/ui.test.ts`:
  - after loading, the replies section is armed and its threads stick on when the fake observer reports them;
  - with a fake page turn, a prepared drawing's notes are armed before the update shows the shell, and observed only after `finished`;
  - navigating away calls `stop()`;
  - without `IntersectionObserver` (the existing tests), nothing is armed.

## 2. Styles

- [x] 2.1 Add `--note-stick-duration: 450ms` and `--note-stick-stagger: 90ms` to `theme.css`. In `components/replies.css`, add the hidden state under `replies--sticking`, the `note-stick` bounce on `replies__thread--stuck` with the delay from `--note-stick-order`, and `prefers-reduced-motion: reduce` and `print` blocks that show every note without animation (decisions 2, 3 and 5). In `components/page-turn.css`, set `animation: none` on `::view-transition-new(notes)` instead of its fade-in, drop its entry in the reduced-motion block, and update the header comment. Update the page-turn tests in `tests/styles.test.ts`: 3 animations instead of 4, no check that the new notes wait for `--page-turn-duration`, and no `::view-transition-new(notes)` in the reduced-motion list; instead, check that `::view-transition-new(notes)` has `animation: none`. Add style tests:
  - the bounce uses the two tokens;
  - its keyframes animate only `scale` and `opacity`;
  - the reduced-motion and print blocks exist.

  Verify that `npm test` passes, including the BEM and literal-colours tests.

## 4. Cascade of stuck-on notes

- [x] 4.1 In `stickNotes`, when sticking a thread, set `--note-stick-step` through CSSOM on each of its `.reply--followup` (`1, 2, 3…`, capped at 5). Add `--note-stick-cascade: 180ms` to `theme.css`. In `components/replies.css`, move the hidden state and the bounce from `.replies__thread` to its notes (`.reply`), with the delay `--note-stick-order × --note-stick-stagger + --note-stick-step × --note-stick-cascade`, and the reduced-motion and print blocks with them (design, decision 3). Verify with tests:
  - in `tests/note-stick.test.ts`, a thread with three stuck-on notes gives them steps 1, 2 and 3, the main note none, and seven are capped at 5;
  - in `tests/styles.test.ts`, the bounce uses the three tokens and the step, the hidden state and the bounce are on `.reply`, and the keyframes still animate only `scale` and `opacity`;
  - in Chromium, a thread with stuck-on notes sticks on in a cascade, each note keeping its tilt.

## 3. Integration

- [x] 3.1 Verify that `npm run check` and `npm test` pass.
- [x] 3.2 With `npm run build && npm run preview`, in Chrome with the console open:
  - on a drawing with replies, at 1024 px, the notes in view stick on one after another with a bounce, keeping their tilt;
  - after "Seguinte" or "Anterior", the new notes are not seen during the turn and stick on after it;
  - at 360 px, the notes stick on as they are scrolled into view, only once, without poking out of the column;
  - with reduced motion emulated, the notes are there at once;
  - no CSP violations.

  Results (2026-11-21, Chromium driven by Playwright against `vite preview` with the real CSP, on Naia's drawing with two threads): at 1024 px the thread in view sticks on and the one below waits hidden until scrolled to, then both stagger (orders 0 and 1); `rotate` is kept during the bounce; during a turn the new notes are hidden and stick on right after it; at 360 px nothing sticks before scrolling, there is no sideways overflow (`scrollWidth` = `clientWidth` = 360); with reduced motion nothing is armed and every note is visible; no CSP violations.
- [x] 3.3 Repeat the first two checks of 3.2 in Safari and Firefox. On a browser without the View Transitions API (for example, the author's iPhone 8), the notes still stick on when scrolled into view.

  Results (2026-11-21, checked by the author): the notes, the cascade included, stick on in Safari and Firefox on macOS and on the iPhone 8, where there is no page turn.
