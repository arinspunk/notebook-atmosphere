# Proposal

## Why

The replies look like sticky notes, but they just appear, and during a page turn they fade in like any other content. A note that is stuck onto the page with a little bounce tells a child that someone left it there for them. On a phone the notes are below the sheet, out of sight, so if they stuck on when they load nobody would see it: they should stick on when they come into view.

## What Changes

- **Notes stick on with a bounce:** each note appears with a short "press and settle" bounce. The notes are not shown before that.
- **Cascade of stuck-on notes:** the notes stuck on a reply (replies to a reply) stick on after it, one by one, each a moment after the one before.
- **When they come into view:** a note sticks on the first time it enters the screen, whether that happens on loading, after a page turn, or while scrolling down. Notes that enter the screen together stick on one after another, a few hundredths of a second apart.
- **After the page turn:** during a turn the new drawing's notes are not shown. They stick on once the sheet has landed, replacing the fade-in of `page-turn-transition`. The old notes still fade out as the turn starts.
- **Reduced motion, and browsers that cannot tell when a note is in view:** the notes are shown at once, with no bounce, as today.
- The duration and the gap between notes come from the design tokens. The bounce keeps each note's tilt and zigzag offset.

Out of scope: sounds, and any change to which replies are shown.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-styling`: a new requirement for the notes sticking on with a bounce when they come into view, and "What moves during the page turn" changes so the new notes stick on, instead of fading in, after the turn.

`reply-rendering` and `reply-moderation` do not change: the same replies are shown, in the same order; only how they appear changes.

## Impact

- **Code:** a new `src/ui/note-stick.ts` (watching the notes come into view), `src/ui/drawing-view.ts` (`fill()` gives back the replies section), and `src/app.ts` (starting it, after the turn when there is one).
- **Styles:** `components/replies.css` (hidden-until-stuck state and the bounce), `components/page-turn.css` (no fade-in of the new notes), and the `--note-stick-duration` and `--note-stick-stagger` tokens in `theme.css`.
- **Tests:** the module with a fake `IntersectionObserver`, the app waiting for the turn, and the style tests (tokens, reduced motion, the bounce does not override the tilt).
- **No changes:** data, moderation, CSP.
