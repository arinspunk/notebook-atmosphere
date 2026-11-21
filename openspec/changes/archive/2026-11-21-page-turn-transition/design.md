# Design

## Context

- The site is a hash-routed single page. `render()` in `src/app.ts` replaces the content of `#app` with one `root.replaceChildren(...)`, scrolls to the top, and then fills the drawing (image, counters, notes) when `drawingsMemo.load(rkey)` resolves. A `generation` counter discards stale renders.
- After a drawing is shown, both neighbours are prepared: `drawingsMemo` keeps their promise for 60 s and the thumbnail is preloaded into the HTTP cache. So when an arrow is clicked, the data is usually already settled.
- After `page-navigation`, the page of a drawing is `div.drawing > div.drawing__sheet > (article.post, nav.pager)`, followed by `section.replies`. The header `header.site-header` sits outside `#app`. `.post` carries `transform: rotate(-1deg)` and a shadow. The pager is either absolute beside the sheet or fixed at the bottom of the screen.
- There is one motion precedent: the viewer's opening transition, with a duration token (`--viewer-duration`) and a `prefers-reduced-motion` block.
- CSP: `style-src 'self'`, no inline styles. jsdom has no View Transitions API.

## Goals / Non-Goals

**Goals:**
- One page-turn effect that can be removed by deleting one stylesheet and one module.
- No change to what is shown or when the network is asked: moderation, freshness and the two-part render stay exactly as they are.
- Correct under quick clicks, history navigation and background reloads.

**Non-Goals:**
- Animating anything other than drawing-to-drawing navigation (index, status messages, first load).
- A polyfill or JS animation for browsers without the API.

## Decisions

### 1. Same-document View Transitions, feature-detected

Wrap the swap in `document.startViewTransition(update)`. The browser snapshots the old state and the new one, and the motion is plain CSS on `::view-transition-*` pseudo-elements in the site's own stylesheet. If `startViewTransition` is missing, the swap runs directly, as today.

*Alternatives:* cloning the old page and animating both with the Web Animations API. That needs more code, leaves two copies of the content in the DOM for a moment (a problem for screen readers and for `el()`-only rendering), and has to handle scroll by hand. A CSS-only animation on insert cannot show the old sheet leaving.

### 2. Direction from the catalogue, passed to CSS as an attribute

The app keeps `shownRkey`, the rkey of the drawing currently on screen. It is `null` on the index, on a status message, and before the first render. A pure function `turnDirection(catalog, fromRkey, toRkey)` returns `"older"` or `"newer"` by comparing indices, or `null` when there is no turn: either rkey is missing, the two are equal, or one is not in the catalogue. Because it uses the catalogue order rather than which arrow was clicked, history navigation and links to the home (`#/` → newest drawing) get the right direction.

The direction goes to CSS as `data-page-turn="older|newer"` on `<html>`, set just before `startViewTransition` and removed when its `finished` promise settles, but only if that transition is still the active one. A new turn can start before the previous turn's `finished` settles (decision 6); without that check, the old turn would remove the new turn's direction. This is a `data-*` attribute set through `dataset`, not a `style`.

*Alternative:* view transition `types` (`startViewTransition({ update, types })`). They belong to one transition, so they avoid the check above, but browsers added them later than the API itself, so support is less even. The attribute works wherever the API does.

### 3. What is named, and how each part moves

All rules live in a new `src/styles/components/page-turn.css` (layer `components`). It adds no class; it styles pseudo-elements and gives names to existing blocks. The names are set only under `:root[data-page-turn]`, so they exist only while a turn runs and have no effect outside it; a style test checks this.

| Element | `view-transition-name` | During the turn |
|---|---|---|
| `.post` | `sheet` | turns in 3D (below) |
| `.replies` | `notes` | old fades out at the start, new fades in after the turn |
| `.site-header` | `site-header` | identical snapshots, nothing visible |
| `.pager` | `pager` | its group gets `animation: none`, like the sheet's: beside the sheet the arrows are at their new place from the first frame instead of sliding there (which, when the page was scrolled, looked like them falling behind the sheet); in the bar they stay put |
| rest (`root`) | — | default cross-fade of identical background, nothing visible |

**Sheet:**
- `::view-transition-group(sheet)` gets `animation: none`. The group then sits at the new sheet's position and size from the first frame. The two sheets do not stretch to each other's height, and when the visitor was scrolled down on a phone, the old sheet does not slide in from above the viewport.
- `::view-transition-image-pair(sheet)` gets `perspective`: `100rem`, and `200rem` towards an older drawing, where the sheet's free edge passes towards the visitor and a closer viewpoint makes the back too large.
- `transform-origin` is on the axis of the rings: about half of `--sheet-rings` from the left edge, vertically centred.
- `mix-blend-mode: normal` on both images replaces the default blend.

| `data-page-turn` | Turns | Animation | Stays still |
|---|---|---|---|
| `older` | old image, on top (`z-index`) | `rotateY(0)` → `rotateY(-90deg)`, ease-in, slightly darker (`filter: brightness`); then its blank back, `rotateY(-90deg)` → `rotateY(-180deg)`, ease-out, fading out over the last third | new image, beneath, at full opacity |
| `newer` | new image, on top | `rotateY(-90deg)` → `rotateY(0)`, ease-out, darker at the start | old image |

Towards an older drawing the sheet goes all the way over the rings, as a real page does. Stopping it edge-on at −90° made it vanish abruptly, at its fastest. Past edge-on the visitor would see the back of the snapshot, a mirror image of the front, so from there on the same snapshot is painted as blank paper: `filter: brightness(0) invert(0.96)` turns every opaque pixel white and keeps the ring holes transparent. The switch happens edge-on, when the sheet is invisible and moving fastest, so it is not seen. Towards a newer drawing, the sheet coming back from edge-on already looked right, so it stays as it is.

*Alternative:* a separate back face (an element or a second snapshot). View transitions give one image per name and state, so it would mean extra DOM during the turn, for the same look.

**Notes:**
- `::view-transition-group(notes)` gets `animation: none`.
- `::view-transition-old(notes)` fades out over `--page-turn-notes-duration`, starting at once.
- `::view-transition-new(notes)` starts invisible and fades in over the same time, with a delay of `--page-turn-duration`.
- When only one of the two pages has notes, only the matching half exists, and it still animates correctly.

**Tokens** (theme.css): `--page-turn-duration: 550ms` and `--page-turn-notes-duration: 200ms`.

Names are unique: there is at most one `.post`, `.replies`, `.site-header` and `.pager` on a page, and the index has none of the first two. The viewer is closed at the start of every `render()`, so its dialog is never part of a snapshot.

### 4. Filling the new sheet before the snapshot, without waiting for the network

The shell is built before the transition starts, and the update callback only shows it. The browser always calls the update callback asynchronously, after it captures the old state at the next rendering opportunity. Meanwhile `render()` goes on as today with `await drawingsMemo.load(rkey)`:
- When the drawing was prepared, that promise is already settled and resolves in a microtask, so `fill()` runs on the detached shell before the callback shows it.
- When it was not, the callback shows the shell with what the catalogue has, and `fill()` runs later on the live page, as today.

`fill()` and `prefetch()` stay on the single path they have today, so the neighbours are always prepared.

Inside the update callback:
1. If the render is no longer current, do nothing.
2. Show the shell and scroll to the top.
3. If the shell already has a `.post__image`, wait for it to decode: `img.decode()` raced against a cap of 150 ms (`PAGE_TURN_DECODE_MS`). A failed decode counts as done. The thumbnail is already in the HTTP cache, so decoding is fast; the cap only stops a slow decode from holding the old page.

Without the API (or with no direction, or reduced motion), `startPageTurn` runs the update at once, before `load()` resolves, so the order is exactly as today.

This keeps `drawing-catalog`'s rule of showing the catalogue part "al momento":
- The callback never waits for the network, only for a local decode with a cap.
- The old page stays visible meanwhile, so the page is never empty and there is no loading message.

No new cache and no new deadline: the data comes from `load()`, with its 60 s rule.

*Alternatives:* a `peek(rkey)` on `drawingsMemo` that returns a settled result, to fill inside the callback. It gives the same result with more code, and a second fill path where the neighbours' prefetch could be lost. Awaiting `load(rkey)` with a ~300 ms timeout is also simple, but it adds a network wait to drawings that are not ready.

### 5. Reduced motion decided in JS, with CSS as a backstop

If `win.matchMedia?.("(prefers-reduced-motion: reduce)").matches`, no transition is started. That also avoids the decode wait. `page-turn.css` still has a `prefers-reduced-motion: reduce` block that sets `animation: none` on every `::view-transition-*` it styles, in case the preference changes mid-turn and to keep the pattern the viewer uses. A style test checks that block exists.

### 6. Quick navigation and stale renders

Clicks on the page during the turn do not reach the arrows: while a view transition runs, the browser hit-tests its pseudo-elements, which belong to the document element. This is accepted on purpose, and no `pointer-events` rule changes it. A child's double click on an arrow moves one drawing, not two, and a note's link cannot be activated while the note is still invisible. A new navigation during a turn still happens through the browser's back and forward actions (or any other hash change), and is handled like this.

The app keeps the active transition. At the start of every `render()`, right after increasing `generation`, it calls `skipTransition()` on it.
- Skipping still runs a pending update callback, without animation. That callback checks `isCurrent()` first, so a stale one does nothing.
- The new render computes its direction from `shownRkey`. It is set only when a current callback, or a swap without a transition, shows a drawing, so a skipped stale render never set it.
- The skipped transition's `finished` settles after the new turn has set its attribute. It does not remove it, because only the active transition clears the attribute (decision 2).
- After the background reload (more than 10 min hidden), the catalogue is reset, so "A carregar…" is shown first and `shownRkey` becomes `null`: there is no turn.

### 7. Where the code lives

`src/ui/page-turn.ts` exports:
- `turnDirection` (pure);
- `startPageTurn(doc, win, direction, update)`. It returns the transition, or `null` after running `update` directly when there is no API, no direction, or reduced motion. It sets the attribute, and clears it when the transition finishes unless a newer turn has started since.

`app.ts` builds the shell, decides `shownRkey`, calls it, and skips the previous transition. Tests pass a fake `document.startViewTransition` through the existing `win` parameter of `startApp`.

## Risks / Trade-offs

- **[Risk] A CSP violation from the transition's pseudo-elements.** The browser's own view-transition styles are UA styles, not author inline styles, but this has to be checked. → Mitigation: a step in tasks with `npm run build && npm run preview` and the console open. If there is a violation, stop and revisit; never relax `style-src`.
- **[Risk] `rotate(-1deg)` of `.post` together with the 3D turn.** The rotation goes to the group's transform and the turn to the image inside it. They should compose, but the result may look skewed. → Mitigation: visual check in Chrome, Firefox and Safari; if needed, counter the tilt on the image pair.
- **[Risk] Safari and `perspective` on view-transition pseudo-elements.** → Mitigation: check on an iPhone. If it looks flat, fall back to a 2D turn with `scaleX` from the same origin; the CSS changes, the spec does not.
- **[Risk] Very tall sheets (long text) may be clipped in the snapshot.** Browsers limit the capture of large elements. → Mitigation: check a drawing with about 40 lines of text. The turn may show a clipped bottom for a moment, which is acceptable.
- **[Risk] Clicks might reach the page during the turn** in some browser, so a double click would move two drawings. → Mitigation: a check in tasks. If it happens, add `:root[data-page-turn] .pager { pointer-events: none; }` to `page-turn.css`; the spec does not change.
- **[Trade-off] Clicks during the turn (about 0.55 s) are lost** (decision 6). Back and forward still work.
- **[Trade-off] When the drawing was not prepared, its notes appear without the fade.** They are added during the turn, after the snapshot, so they show at once.
- **[Trade-off] Up to 150 ms more on the old page** while a prepared image decodes, in exchange for a sheet that arrives with its drawing.
- **[Trade-off] The notes add about 200 ms after the sheet lands.** The new notes are in the DOM at once, so screen readers and links are not delayed; only their paint is.
- **[Trade-off] The turn is visual only.** The DOM and focus change at once, exactly as today.

## Migration Plan

Nothing to migrate. Rollback means deleting `page-turn.css`, its import and `page-turn.ts`, and calling the update directly in `app.ts`.
