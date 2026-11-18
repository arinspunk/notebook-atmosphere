# Design

## Context

See proposal.md (Why) for the motivation and the specs for the requirements.

Current state that shapes the approach:

- **Image URLs:** `renderImage` in `src/ui/drawing-view.ts` and the neighbour prefetch in `src/app.ts` both use `fullsize ?? thumb`. The index thumbnails already use `thumb ?? fullsize`.
- **Measured on 2026-11-18** with two real drawings of the test account (`cdn.bsky.app`, served as WebP regardless of `Accept`):

  | | Size served | Weight |
  |---|---|---|
  | `thumb` (`feed_thumbnail`) | 1000 px on the long side (1000 × 717) | ~120 KB |
  | `fullsize` (`feed_fullsize`) | the original (1840 × 1320) | ~315 KB |

  The square is at most 350 CSS px: 700 device px at 2x. A square drawing's thumbnail is 1000 × 1000, enough up to ~2.8x.
- **Slot:** until this change, `.post__media` was a square from `post.css` and `.post__image` filled it with `object-fit: cover` (decision 8 changes this). The PDS record, which the page has before the AppView answers, carries `aspectRatio` for the image when the client that posted it sent one.
- **Routing:** the router listens to `hashchange` only. `history.pushState` with the same URL does not fire `hashchange`, and going back to an entry with the same URL fires `popstate` but not `hashchange`.
- **Re-renders:** `startApp` replaces the content of `#app` on every route change and when the page comes back after more than 10 minutes hidden.
- **Tests:** jsdom 26 has `HTMLDialogElement` but does not implement `showModal()` or `close()`.

## Goals / Non-Goals

**Goals:**

- One image request of ~120 KB per drawing shown or prepared, instead of ~315 KB.
- A viewer that feels instant, works with touch, mouse and keyboard, and never traps the visitor (back always works).

**Non-Goals:**

- Zoom and pan of our own: the full image fits the screen and the browser's pinch-zoom does the rest.
- An animation when closing (see decision 7).
- Moving between drawings inside the viewer.

## Decisions

### 1. Two pure helpers for the image URLs

`src/embed.ts` gets `pageImageUrl(img)` (`thumb`, else `fullsize`) and `viewerImageUrl(img)` (`fullsize`, else `thumb`), both checked with `isWebUrl`. The drawing view and the prefetch use `pageImageUrl`; only the viewer uses `viewerImageUrl`.

`isWebUrl` lives today in `src/ui/dom.ts`, a DOM module. It only uses `URL`, so it moves to a new DOM-free `src/lib/url.ts`, and `src/ui/dom.ts` re-exports it so its current importers do not change. `src/embed.ts` stays free of DOM code.

### 2. The image is the control: a `<button>` without button styling

Inside `figure.post__media`, the image goes inside `button.post__zoom` (`type="button"`). The button has no border, background or padding, fills the slot and shows a `zoom-in` cursor. Its accessible name comes from `aria-label`, which replaces the name the `img` would give, so it has to carry the `alt` too:

- with a non-empty `alt`: new string `viewImageWithAlt`, "{alt}. Ver o desenho em grande";
- with an empty `alt`, which is common in the drawings: new string `viewImage`, "Ver o desenho em grande".

The `alt` stays on the `img` as well.

- *Why a button:* it is the native way to get keyboard focus, Enter and Space, and a role screen readers announce, with no visible button.
- *Alternative:* a click listener on the `img` with `tabindex="0"` and `role="button"`. It needs the keyboard handling by hand, and the native element gives it for free.

### 3. The viewer is a native `<dialog>` opened with `showModal()`

A new module, `src/ui/viewer.ts`, with `openViewer({ thumb, full, alt, i18n, returnFocus })` and `closeViewer()`.

- **Element:** `dialog.viewer`, created on demand and appended to `document.body`, outside `#app`, so a re-render does not remove it by surprise. It contains `img.viewer__image` and `button.viewer__close` (new string `close`: "Fechar"; visible "×").
- **Modal behaviour:** `showModal()` makes the rest of the page inert, traps the focus and closes with Escape (the `cancel` event). When it closes, the focus returns to `button.post__zoom`.
- **Close button:** a visible "×" in the top corner, because on touch screens there is no Escape and tapping outside is not obvious to everyone.
- **Outside the image:** the dialog covers the whole screen. A click whose target is not `.viewer__image` closes it, so this covers the backdrop and the margins around the image.
- **Images:** `img.src` is the thumbnail, already in the browser cache, so the viewer opens instantly. At the same time, a `new Image()` loads the full image; on `load`, `img.src` changes to it. If the full image fails, the thumbnail stays. Nothing loads the full image before the viewer opens.

### 4. Back closes the viewer

- **On open:** `history.pushState({ viewer: true }, "")` with the same URL. No `hashchange`, so the router does not render.
- **Back while open:** `popstate` arrives and the viewer closes. The URL is the same, so the drawing stays as it is.
- **Only while open:** a navigation to another hash also fires `popstate` (by the HTML spec; jsdom does the same). The viewer's `popstate` listener does nothing unless the viewer is open, and it is removed when the viewer closes.
- **Removing the entry, always with a guard:** every close that is not a back action (button, outside, Escape, and `closeViewer()` from a re-render) calls `history.back()` **only if `history.state?.viewer` is still set**, and then ignores the `popstate` that follows. That way the next back leaves the drawing as usual. Without the guard, a re-render caused by a new navigation would send the visitor back to the previous drawing.
- **Re-render:** at the start of every `render()` of the app, `closeViewer()` closes an open viewer. This covers the return after 10 minutes in the background.

*Alternative:* a hash for the viewer (`#/d/<rkey>/ver`). It would make the viewer shareable, but it goes through the router and re-renders the page, and a shared link to an open viewer has no use here.

### 5. Styles with tokens

- **`theme.css`:** a new `--color-backdrop` (dark ink, `rgb(41 0 116 / 0.9)`), only for the backdrop, and `--viewer-gap` for the space around the image.
- **`viewer.css`:**
  - the dialog resets the browser's own `<dialog>` styles (`margin: 0`, `border: 0`, `max-width: none`, `max-height: none`, transparent background) and covers the viewport (`100dvw` × `100dvh`), with `--viewer-gap` of padding and a centring grid;
  - `overscroll-behavior: contain` on the dialog, and `html:has(.viewer[open]) { overflow: hidden; }`, so a scroll gesture on a phone does not move the page underneath and the scroll position is kept;
  - `::backdrop` uses `--color-backdrop`;
  - `.viewer__image` uses `max-width: 100%`, `max-height: 100%` and `object-fit: contain`;
  - `.viewer__close` sits in the top corner, is at least 44 × 44 px, and uses `--color-surface` with `--color-ink` text, a pair already covered by the contrast test.
- **`post.css`:** `.post__zoom` resets the button (`border: 0`, `padding: 0`, `background: none`, `display: block`, full size, `cursor: zoom-in`) and keeps the focus outline from `base.css`.

### 6. Tests with a dialog shim

The tests stub `HTMLDialogElement.prototype.showModal` and `close`: they set and remove `open` and dispatch `close`. `history` comes from jsdom, which implements `pushState`, `back` and `popstate` asynchronously. In jsdom, as in browsers, changing `location.hash` also fires `popstate`, so the tests wait for it and use it to check the guard of decision 4. The tests cover:
- the URL of the page image and of the prefetch;
- the viewer opening with the thumbnail and switching to the full image on `load`;
- no `fullsize` request until it opens;
- closing with the button, outside, Escape (`cancel`) and `popstate`;
- the history entry being removed when it closes in any other way;
- the focus returning to the image;
- `closeViewer()` on re-render, including a re-render caused by a navigation to another drawing, which must not go back;
- the accessible name with and without `alt`.

### 7. A short transition on opening only

Opening fades the dialog and its backdrop in and grows the image from `scale(0.96)`, over `--viewer-duration` (180 ms, new token in `theme.css`). It is CSS only, with `@starting-style` on `.viewer[open]`, so `viewer.ts` does not change. With `prefers-reduced-motion: reduce` there is no transition.

- *Opening only:* animating the close means waiting for `transitionend` before removing the dialog, with `transition-behavior: allow-discrete` on `overlay` and `display`, and deciding what happens when a re-render or a back action arrives during the animation. That complexity would sit in the history handling, the most delicate part of the viewer. Closing stays instant.
- *Without `@starting-style`* (Chrome before 117, Safari before 17.5, Firefox before 129), the viewer opens at once, as without this decision.

### 8. The slot keeps the drawing's proportions

The forced square goes away: the image is shown whole, with its own proportions.

- **Reserved space:** `renderDrawingShell` reads `aspectRatio` from the PDS record (new pure helper `recordAspectRatio` in `src/embed.ts`, only positive finite numbers) and sets `figure.style.aspectRatio = "w / h"` through CSSOM, as the index thumbnails already do. The CSP allows CSSOM changes, and nothing uses `setAttribute("style", …)`.
- **Without `aspectRatio` in the record:** `post.css` keeps `aspect-ratio: 1` on `.post__media` as the default, so a square is reserved. When the AppView answers, if its image has a valid `aspectRatio` and the record had none, the figure takes it.
- **Image:** `.post__zoom` and `.post__image` still fill the slot, with `object-fit: contain` instead of `cover`: if the record and the AppView disagree, the image is neither cropped nor distorted.

*Alternative:* no reservation without `aspectRatio`. The text would jump on every such drawing, instead of only on the non-square ones.

## Risks / Trade-offs

- **[Reloading the page while the viewer is open leaves a history entry with the same URL]** → After the reload, one back action does nothing visible. At start-up, the app replaces a leftover `{ viewer: true }` state with `null`. The extra entry stays, which is a rare, harmless case.
- **[The thumbnail looks soft on screens above ~2.8x]** → Accepted: it is still 1000 px, and the viewer is there for detail.
- **[A record without `aspectRatio` for a non-square drawing]** → The square reserved at first changes to the real proportion when the AppView answers, so the text moves once. Rare: the clients we use send `aspectRatio`.
- **[A very tall drawing makes a long page]** → Accepted; the drawings are uploaded square or close to it.
- **[`<dialog>` support]** → Supported by every current browser. In a browser without it the image would not open, but nothing else breaks.

## Migration Plan

Publish as usual. To roll back, use "Publish deploy" on an earlier deploy in Netlify. There is no data to migrate.
