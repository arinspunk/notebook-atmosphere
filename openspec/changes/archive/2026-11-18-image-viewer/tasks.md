# Tasks

## 1. Thumbnail

- [x] 1.1 Move `isWebUrl` to `src/lib/url.ts` and re-export it from `src/ui/dom.ts`. Add `pageImageUrl` and `viewerImageUrl` to `src/embed.ts` (decision 1). Use `pageImageUrl` in `renderImage` (`src/ui/drawing-view.ts`) and in the prefetch in `src/app.ts`. Verify with tests that the page image and the prefetched neighbour images are the `thumb` URLs, that `fullsize` is used only when there is no `thumb`, and that the existing drawing tests still pass.

## 2. Clickable image

- [x] 2.1 Wrap the image in `button.post__zoom` with an `aria-label` from the new `viewImageWithAlt` or `viewImage` strings, and add the `close` string to `src/lib/i18n.ts` (decision 2). Verify with DOM tests that `.post__media > .post__zoom > .post__image` exists, that the button has `type="button"`, that its name is "Na praia. Ver o desenho em grande" with that `alt` and "Ver o desenho em grande" with an empty `alt`, that the `img` keeps its `alt`, that a drawing without image has no `.post__zoom`, and that the BEM test still passes.

## 3. Viewer

- [x] 3.1 Create `src/ui/viewer.ts` with `openViewer` and `closeViewer` (decisions 3 and 4) and connect it to the click on `.post__zoom`. Add the dialog shim to the tests and verify:
  - it opens with the thumbnail and switches to the full image on `load`; if the full image fails, the thumbnail stays;
  - no `fullsize` request happens before the viewer opens;
  - it closes with the close button, with a click outside the image, with `cancel` (Escape) and with `popstate`;
  - a `popstate` from a hash change while the viewer is closed does nothing, and the listener is gone after closing;
  - after closing without back, the history entry has been removed (`history.state` is not `{ viewer: true }`);
  - the focus returns to `.post__zoom`;
  - `.viewer`, `.viewer__image` and `.viewer__close` pass the BEM test.
- [x] 3.2 Call `closeViewer()` at the start of every `render()` in `src/app.ts`, and replace a leftover `{ viewer: true }` history state at start-up (decision 4 and Risks). Verify with app tests that a return after 10 minutes in the background closes an open viewer and removes its history entry, and that a navigation to another drawing (new hash) while it is open closes it **without** calling `history.back()`, so the new drawing stays.

## 4. Styles

- [x] 4.1 Add `--color-backdrop` and `--viewer-gap` to `theme.css`. Write `components/viewer.css`, with the reset of the browser's `<dialog>` styles, `overscroll-behavior: contain` and the `html:has(.viewer[open])` rule, and the `.post__zoom` rules in `post.css`. Import `viewer.css` in `main.css` (decision 5). Verify that `npm test` passes, including the literal colours test and the contrast test.
- [x] 4.2 Add `--viewer-duration` to `theme.css` and the opening transition to `viewer.css` with `@starting-style`, disabled under `prefers-reduced-motion: reduce` (decision 7). Verify with a style test that `viewer.css` uses `@starting-style`, that its transitions use the token, and that the reduced-motion block sets `transition: none`.

## 4b. Drawing proportions

- [x] 4.3 Add `recordAspectRatio` to `src/embed.ts` and, in `renderDrawingShell`, set `figure.style.aspectRatio` from the record; on `fill`, use the AppView's `aspectRatio` when the record had none. In `post.css`, keep `aspect-ratio: 1` on `.post__media` as the default and change `.post__image` to `object-fit: contain` (decision 8). Verify with tests that the slot has the record's proportion before the image arrives (e.g. `1840 / 1320`), that a record without `aspectRatio` leaves the slot without a proportion from the code and takes the AppView's on `fill`, that invalid values are ignored, that nothing sets a `style` attribute other than through CSSOM, and that the image is not removed or duplicated.

## 5. Integration

- [x] 5.1 Verify that `npm run check` and `npm test` pass.
- [x] 5.2 With `npm run build && npm run preview`, in Chrome with the console open and the Network tab:
  - the drawing page and the prefetch request only `feed_thumbnail` URLs;
  - clicking the drawing opens the viewer at once, and only then is `feed_fullsize` requested;
  - the viewer closes with the button, outside the image, Escape and back, and back after closing leaves the drawing;
  - Tab reaches the image, and Enter opens the viewer;
  - opening fades in with a slight zoom and closing is instant; with "Emulate CSS prefers-reduced-motion: reduce" in the Rendering tab, it opens without a transition;
  - in mobile emulation at 360 px, the image fills the screen up to `--viewer-gap` (the browser's `<dialog>` limits are gone), the close button is easy to hit, and a scroll gesture over the viewer does not move the page, which keeps its scroll position after closing;
  - a drawing keeps its proportions, uncropped, and the text below does not move when the image arrives (Network throttling "Slow 4G");
  - there are no CSP violations.
