# Proposal

## Why

The drawing page loads the AppView's `fullsize` image (the original upload, about 1840 px and ~315 KB as WebP), but shows it in a square of at most 350 CSS px. The AppView's `thumb` is already resized to 1000 px on the long side (~120 KB) and is enough for that square even on high-density screens. The neighbour prefetch also downloads the full image today, so every drawing costs three full images.

At the same time, children want to look at the drawing up close. A viewer that opens the full image over the page, when they tap the drawing, gives them that without paying for it on every page.

## What Changes

- **Thumbnail on the page:** the drawing page and the neighbour prefetch use the AppView `thumb`. They fall back to `fullsize` only if there is no thumbnail.
- **Viewer:** tapping or clicking the drawing opens a full-screen viewer with the full image, over the page. There is no separate "open" button: the image itself is the control, and it is still reachable with the keyboard and announced to screen readers.
  - The thumbnail shows at once while the full image loads, so the viewer opens instantly.
  - The full image is requested only when the viewer opens; it is never prefetched.
  - Opening fades the viewer in with a slight zoom, unless the visitor asks the system for reduced motion. Closing is instant.
  - The viewer closes with its close button, by tapping anywhere outside the image, with Escape, and with the browser's back button or gesture.
- **Drawing proportions:** the image keeps the drawing's own proportions instead of a forced square, and is never cropped. The space is still reserved before the image arrives, with the `aspectRatio` of the PDS record; without it, a square is reserved.
- **Texts:** three new UI strings in Galician: the accessible name of the image control, with and without the drawing's `alt` text, and the close button.

Out of scope: zoom or pan controls of our own (the browser's pinch-zoom is enough), swiping between drawings inside the viewer, the viewer for reply images (replies show no images), and the index thumbnails, which already use `thumb`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `drawing-page`: the page shows the AppView thumbnail, the image keeps the drawing's proportions instead of a square, and a new requirement for viewing the full drawing in a viewer.
- `site-styling`: new BEM blocks and elements for the clickable image and the viewer; the proportion of the image slot comes from the code through CSSOM, with the square only as the stylesheet's default.

`ui-localization` keeps its requirements: the new strings are covered by "all fixed UI texts come from the dictionary".

## Impact

- **Code:** `src/ui/drawing-view.ts` (thumbnail, clickable image), a new `src/ui/viewer.ts` (viewer with `<dialog>` and history handling), `src/app.ts` (prefetch uses the thumbnail; viewer state on re-render) and `src/lib/i18n.ts` (two strings).
- **Styles:** new `src/styles/components/viewer.css`; `post.css` for the clickable image.
- **Tests:** drawing view, viewer and app (prefetch URL, history).
- **Network:** about 60 % fewer image bytes per drawing seen; the full image only when the viewer opens.
- **No changes:** data, moderation, routes and CSP (both images come from `cdn.bsky.app`).
- **Language:** following the project rule, the spec deltas are in English. Once archived, `drawing-page` and `site-styling` will mix English and Spanish until the existing text is translated in a change of its own.
