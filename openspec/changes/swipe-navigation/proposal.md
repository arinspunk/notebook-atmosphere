# Proposal

## Why

On a phone, turning a page is a gesture: a child slides a finger across it. The bar of big arrows at the bottom works, but it is a button bar, not a notebook. Swiping is the natural way to pass the page, and the bar can teach the gesture instead of being the main control.

## What Changes

- **Swipe to pass the page:** on a touch screen, a horizontal swipe on a drawing's page goes to the next or previous drawing, as a book does.
  - Right to left: "Seguinte", the older drawing.
  - Left to right: "Anterior", the newer drawing.
  - It does exactly what activating the arrow does: the same history entry and the same page turn.
- **Not in the way:** vertical scrolling and pinch zoom keep working; short, slanted or multi-finger moves do nothing; gestures that start at the very edge of the screen are left to the browser, whose own back and forward swipes live there; nothing happens when there is no drawing in that direction or while the image viewer is open.
- **The bottom bar teaches the gesture:** when the main pointer is a finger (phones and tablets), the bar shows the text "Passa a página deslizando o dedo" between two smaller arrows.
  - The arrows keep a touch target of at least 44 × 44 px, so whoever cannot swipe (a screen reader takes the swipe gesture for itself, and so does keyboard or switch access) can still pass the page.
  - The text comes from the dictionary and is hidden from screen readers, for whom it would be wrong.
  - When the main pointer is a mouse or a trackpad, even on a computer with a touch screen, the bar keeps only the arrows.
- Beside the sheet, on wide screens, nothing changes. Swiping also works there on a touch screen, such as a tablet.

Out of scope: the sheet following the finger while dragging (the page turns once the swipe ends), swiping in the index or in the viewer, and a hint that disappears after the first swipe.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `drawing-catalog`: new requirements for swiping between drawings and for the moves that are not a swipe, next to the arrows' requirement.
- `site-styling`: a new requirement for the swipe hint in the bottom bar, between smaller arrows, when the main pointer is a finger. "Arrows beside the sheet or in a bottom bar" keeps its text: the bar is still there, with the same arrows.

`ui-localization` keeps its requirement: the hint is one more fixed UI text from the dictionary.

## Impact

- **Code:** a new `src/ui/swipe.ts` (gesture recognition with passive Touch Events), `src/ui/drawing-view.ts` (the hint in the pager, and the swipe on the drawing), `src/lib/i18n.ts` (`swipeHint`).
- **Styles:** `components/pager.css` (the hint and the smaller arrow images, only in the bar and with `pointer: coarse`) and the `--pager-bar-icon-size` token in `theme.css`. `drawing.css` and `touch-action` do not change: the bar keeps its height, and scrolling and zoom stay the browser's.
- **Tests:** gesture recognition (directions, thresholds, edges, multi-touch, vertical moves), the drawing page wiring, the hint markup, and the style tests (BEM, colours, 44 px targets).
- **No changes:** data, moderation, routes, CSP.
