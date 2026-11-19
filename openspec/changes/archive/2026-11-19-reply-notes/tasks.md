# Tasks

## 1. Markup

- [x] 1.1 Wrap the sheet in `div.drawing` and append `section.replies` to it, after `article.post` (decision 1). Update the tests that expected the replies inside the post. Verify with DOM tests the scenarios "Drawing with replies" and "Drawing without visible replies" of `specs/site-styling`, that `fail()` still puts the error in the post, and that the BEM test passes.
- [x] 1.2 Add the `bylineSeparator` string to `src/lib/i18n.ts`, and `renderByline` (with its `tag`) to `src/ui/dom.ts`. Use it in the drawing (`p`), the replies (`footer` after the text, with `reply__footer` and `byline--note`) and the index (`span`) (decision 2). Verify with DOM tests the scenarios "Reply byline" ("Toquinho, há 16 h") and "Invalid date" (only the name, without a comma), and that the index and the drawing read "name, date".

## 2. Tokens

- [x] 2.1 Add the note tokens of decision 3 to `theme.css`. Extend the contrast test with each `--color-note-<n>-ink` on its `--color-note-<n>`, and add the test that `--note-overlap` is smaller than `--note-padding-block`. Verify that `npm test` passes, that the contrast test fails with the inks temporarily set to `#fff`, and that the overlap test fails with `--note-overlap` temporarily set to `1.5rem`.

## 3. Styles

- [x] 3.1 Rewrite `components/byline.css` without flex (inline text), drop the `gap` of `byline--large` and add `byline--note`. In `post.css`, change `.post__byline` to `text-align: end` (decision 2). Verify in `npm run dev` that the drawing's byline is still right-aligned and reads "Naia, há 2 d", and the index reads "name, date".
- [x] 3.2 Write `components/drawing.css`, and rewrite `components/replies.css` and `components/reply.css` with decisions 4, 5 and 6. Import `drawing.css` in `main.css`. Verify that `npm test` passes, including the literal colours test.

## 4. Integration

- [x] 4.1 Verify that `npm run check` and `npm test` pass.
- [x] 4.2 With `npm run build && npm run preview`, in Chrome with the console open, on a drawing with at least four direct replies and one reply to a reply (in the test account, or by editing the DOM in DevTools):
  - at 468 px, compare with the desktop frame of Figma: colours 1, 2, 3, 4, 1 (with no two notes in a row sharing a colour, stuck notes included) and each note's ink; rotations and zigzag; no strip line; centred content; "name, date" byline;
  - the stuck note is as wide as the main one, indented (less, down to none, on narrow screens), overlaps the previous note without covering its byline, and has a different colour;
  - a reply of 300 characters (the Figma sample text) fits without the note growing beyond 360 px;
  - the main notes are centred on the sheet's axis, apart from their zigzag offset;
  - at 360 px, no horizontal scroll and no note edge cut off by the zigzag;
  - no CSP violations.
