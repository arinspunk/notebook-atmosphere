# Design

## Context

See proposal.md (Why) for the motivation and the specs for the requirements.

Current state that shapes the approach:

- **Markup:** `index.html` has only `<main id="app" class="app">`; `startApp` paints every route into it. There is no header. `renderNav` in `src/ui/drawing-view.ts` builds `nav.pager` with `pager__link--prev` (to `neighbours.older`), `--index` and `--next` (to `neighbours.newer`), separated by `" "` text nodes so the page reads without CSS. The nav is the last child of `article.post`.
- **The sheet is rotated:** `.post` has `transform: rotate(-1deg)`. A transformed ancestor becomes the containing block of `position: fixed` descendants, so a fixed bar inside `.post` would scroll and tilt with the sheet.
- **Column:** `.app` is `max-width: var(--measure)` (40rem, 38rem of content after `--space-4` on each side); the sheet is `--sheet-width` (29.25rem, 468 px). Without the index link, the pager has only two links.
- **Dictionary:** `previous` ("Anterior"), `next` ("Seguinte") and `index` ("Todos os desenhos") already exist. `home` ("Início") exists and is unused.
- **Router:** `HOME_HREF` (`#/`) and `INDEX_HREF` (`#/indice`) already exist.
- **Images:** `notebook-rings.png` in `src/assets/images/` is referenced from CSS; Vite emits it as a file (`assetsInlineLimit: 0`), allowed by `img-src 'self'`.
- **Viewport:** `<meta name="viewport" content="width=device-width, initial-scale=1.0">`, without `viewport-fit=cover`, so `env(safe-area-inset-*)` is always 0.

## Goals / Non-Goals

**Goals:**

- One `nav.pager` in the DOM, placed beside the sheet or in the bar by CSS only.
- Arrow drawings replaceable by swapping two files.
- The page still reads without CSS: the labels are real text, hidden only visually.

**Non-Goals:**

- A dark theme for the arrows (the SVGs carry their own colour).
- Animating the page turn.

## Decisions

### 1. The header is a static element that the app fills

`index.html` gets `<header class="site-header" id="site-header"></header>` before `<main>`, so the header is the page's banner landmark and stays outside the content that each route replaces. `main.ts` passes it to `startApp` as a new optional `header` in `AppDeps`. `startApp` fills it once, with `renderHeader(i18n)` from a new `src/ui/header.ts`:

- `a.site-header__logo` with the new string `siteName` ("caderno") and `href` `HOME_HREF`;
- `a.site-header__index` with `index` and `href` `INDEX_HREF`.

On every `render()`, the app sets `aria-current="page"` on `.site-header__index` when the route is the index, and removes it otherwise. The header is filled before the catalogue loads, so it is there during "A carregar…" and in every status message.

*Alternatives:* painting the header inside `<main>` on every route (it would not be the banner landmark, and every view would repeat it); writing the texts in `index.html` (they must come from the dictionary, which a fork can override).

### 2. The pager leaves the sheet, in book order

`renderDrawingShell` builds `div.drawing > div.drawing__sheet > (article.post, nav.pager)`, and `fill()` still appends `section.replies` to `div.drawing`, after the sheet. `shell.element` is still `div.drawing`.

`renderNav` changes its mapping and drops the index link:

| Link | Destination | `rel` | Label |
|---|---|---|---|
| `a.pager__link.pager__link--prev` | `neighbours.newer` | `prev` | `previous` ("Anterior") |
| `a.pager__link.pager__link--next` | `neighbours.older` | `next` | `next` ("Seguinte") |

Each link holds `span.pager__label` with its text, and the two links keep a `" "` text node between them. DOM order is prev, then next: left, then right, which is also the order a keyboard or screen reader meets them. Prefetching of neighbours does not change: it already prepares both.

### 3. Arrows are CSS background images, labels are visually hidden

Two provisional SVGs, `src/assets/images/arrow-prev.svg` and `arrow-next.svg`, each a single hand-drawn-looking stroke (an irregular path with round caps) in the ink colour. `arrow-prev` points right and `arrow-next` points left: both point towards the sheet. `pager.css` sets them as `background-image` of `.pager__link--prev` and `.pager__link--next`, `contain`-sized and centred in a square of `--pager-arrow-size`.

`.pager__label` uses the usual visually-hidden pattern (1 px box, `clip-path: inset(50%)`, `white-space: nowrap`, `overflow: hidden`), so the link's accessible name is its text and nothing shows.

*Why CSS and not `<img>`:* replacing an arrow is replacing a file, with no code; there is no `alt` to keep in sync with the label; and the page without CSS shows plain "Anterior Seguinte" links. *Why two files and not one mirrored:* hand-drawn arrows usually do not look right mirrored, and the final ones may differ.

### 4. Bar by default, beside the sheet from a breakpoint

New tokens in `theme.css`:

| Token | Value | Use |
|---|---|---|
| `--pager-arrow-size` | `3rem` (48 px) | side of each arrow's touch target, at least 44 px |
| `--pager-gap` | `var(--space-4)` | space between the sheet and each arrow |
| `--pager-lift` | `var(--space-10)` | distance from the bottom of the sheet to the bottom of the arrows |
| `--pager-bar-padding` | `var(--space-2)` | padding of the bar around the arrows |

Mobile first:

- **Bar (default):** `.pager` is `position: fixed` at the bottom, full width, a flex row with the arrows at both ends (`.pager__link--next` with `margin-inline-start: auto`, so it stays at the right when there is no "previous"), `z-index: 1` above the notes, with the page background and a soft top shadow. Its padding adds `env(safe-area-inset-bottom)` at the bottom and the left/right insets at the sides. `.drawing` gets `padding-block-end` equal to the bar's height plus the bottom inset, so the last note ends above it.
- **Beside the sheet (`@media (width >= 39.25rem)`):** `.drawing__sheet` is `position: relative`; `.pager` is `position: absolute`, `inset-block-end: var(--pager-lift)`, centred with `width: calc(var(--sheet-width) + 2 * (var(--pager-arrow-size) + var(--pager-gap)))`, so each arrow sits `--pager-gap` from the sheet. No background, no shadow, no extra padding on `.drawing`.

The breakpoint is the sheet plus both arrows and gaps plus the page gutters: `29.25 + 2 × (3 + 1) + 2 × 1 = 39.25rem`. Custom properties cannot be used in a media query, so the value is written in `pager.css`, and a test recomputes it from the tokens (`--sheet-width`, `--pager-arrow-size`, `--pager-gap`, `--space-4`) and fails if they disagree.

*Why a media query and not a container query:* the fixed bar must have no ancestor that becomes its containing block, and a query container adds containment to its box. Since `.app` is the whole column, the viewport width is the right measure anyway.

### 5. Safe areas

`index.html` adds `viewport-fit=cover`, so `env(safe-area-inset-*)` gets real values on phones with notches. In return, the page has to keep its content out of them in landscape: `.app` and `.site-header` change their side padding to `max(var(--space-4), env(safe-area-inset-left))` (and `-right`).

### 6. Header styles

`components/site-header.css`: a flex row with `justify-content: space-between` and `align-items: baseline`, as wide as `.app` (`--measure`, centred, same side padding). The logo in `--font-heading`, `--font-size-xl`, bold; the index link in `--font-size-lg`. Both in `--color-ink`, without underline except on hover and focus. `.app` reduces its top padding, since the header now gives the top space. These styles are provisional, like the text logo.

## Risks / Trade-offs

- **[The meaning of "Anterior"/"Seguinte" flips for anyone used to the current links]** → Accepted: the site has not launched, and book order is the intended one.
- **[The arrows' colour is in the SVG files, not in tokens]** → Accepted while they are provisional; the literal-colour test only covers CSS. A dark theme would need other files or inline SVG.
- **[`viewport-fit=cover` lets content reach the notch in landscape]** → The side padding with `env()` from decision 5; checked in the browser.
- **[The breakpoint written by hand drifts from the tokens]** → The token test from decision 4.
- **[The fixed bar covers the viewer or is covered by the notes]** → The viewer is a modal `<dialog>` in the top layer, above everything; the bar's `z-index: 1` puts it above the rotated notes, which make their own stacking contexts.
- **[A visually hidden label is focusable text that a sighted keyboard user cannot read]** → The focus outline from `base.css` shows on the whole link (the arrow), which is what they act on.

## Migration Plan

Publish as usual. To roll back, use "Publish deploy" on an earlier deploy. No data.
