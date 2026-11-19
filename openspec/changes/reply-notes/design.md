# Design

## Context

See proposal.md (Why) for the motivation and the specs for the requirements.

Current state that shapes the approach:

- **Markup:** `renderDrawingShell` returns `article.post`, and `fill()` appends `section.replies` inside it, so the replies sit inside the sheet. Each card is `div.replies__thread` with `article.reply` and, if there are replies to it, `div.replies__followups` with `article.reply.reply--followup` (all descendants flattened into one level).
- **Byline:** three places build it (`renderDrawingShell`, `renderReply` in `drawing-view.ts`, and `renderIndex` in `index-view.ts`) as `strong.byline__name`, a `" "` text node and `time.byline__date`. `renderTime` returns `null` for an invalid date. `.byline` is a flex row with `gap`.
- **Figma, component `Post it`** (360 × 360):
  - background `#ceb6ff`, 30 px padding;
  - a 1 px line, black at 10 % in multiply mode, 62 px from the top (not reproduced, see decision 5);
  - text in Andika 18/27, `#24006c`;
  - byline right-aligned: name in Bold, ", há 22 d" in Regular.
- **Figma, desktop frame:** notes in yellow `#fffb86` and cyan `#84fefc` (equal to `--color-accent`) too. Content centred vertically, slight rotations, zigzag, and notes overlapping a little.
- **Palette chosen with the author** (after the first implementation): four paper colours, `#fffb86`, `#d5c1ff`, `#94fffd` and `#feb7ec`, each with its own ink instead of the single `#24006c`: the same hue, saturation 100 %, brightness 16 % (diagonally down in a colour picker). Yellow uses the author's `#292400`; the others follow the rule. Contrast: 14.4:1, 12.3:1, 13.3:1 and 11.8:1.

## Goals / Non-Goals

**Goals:**

- Notes like the design at 468 px and without horizontal scroll at 360 px.
- Colour, rotation and zigzag in CSS only, by position, with the palette in tokens.
- Stuck notes that never cover the text of the note below.

**Non-Goals:**

- Random or per-reply colours. A position cycle guarantees no repeats between neighbours, and new replies go at the end.
- The line of the adhesive strip. It adds noise rather than meaning, and it crossed the text of long replies.

## Decisions

### 1. A `drawing` block wraps the sheet and the replies

`renderDrawingShell` returns `div.drawing` containing `article.post`. `fill()` appends `section.replies` to `div.drawing`, after the post. `fail()` still puts its status message inside the post. `shell.element` is now `div.drawing`, so `app.ts` does not change. `drawing.css` makes `.drawing` a column with a gap between the sheet and the notes.

*Alternative:* return a fragment and insert the replies with `post.after()`. That fails while the shell is not yet in the document, which `renderDrawing` does.

### 2. One helper for the byline, with the comma

A new `renderByline({ tag, className, name, iso, i18n, now })` in `src/ui/dom.ts` returns a `tag` element (`p` in the drawing, `footer` in the notes, `span` in the index) with `strong.byline__name` and, only if the date is valid, the separator and `time.byline__date`. It is used by the drawing, the replies and the index cards. An invalid date leaves only the name, with no trailing comma.

The separator is a new UI string, `bylineSeparator: ", "`, because `ui-localization` asks for every fixed UI text to come from the dictionary.

`.byline` stops being a flex row: with `gap`, the comma would become a separate flex item with space on both sides ("Toquinho , há"). It becomes ordinary inline text:
- `.post__byline` changes `justify-content: flex-end` to `text-align: end`;
- the `gap` of `byline--large` goes away;
- the notes align their byline with `text-align: end` on `.reply__footer`.

### 3. Note tokens

New tokens in `theme.css`:

| Token | Value | Use |
|---|---|---|
| `--color-note-1` / `--color-note-1-ink` | `#fffb86` / `#292400` | yellow |
| `--color-note-2` / `--color-note-2-ink` | `#d5c1ff` / `#0d0029` | lilac |
| `--color-note-3` / `--color-note-3-ink` | `#94fffd` / `#002928` | cyan (no longer `--color-accent`) |
| `--color-note-4` / `--color-note-4-ink` | `#feb7ec` / `#29001f` | pink |
| `--shadow-note` | soft shadow, like the sheet's | |
| `--note-size` | `22.5rem` (360 px) | side of the note |
| `--note-padding` | `1.875rem` (30 px) | padding at the sides |
| `--note-padding-block` | `1.5rem` (24 px) | padding at the top and bottom, close to Figma's 26 and 21 px, so 300 characters fit |
| `--note-font-size` | `1.125rem` (18 px) | |
| `--note-line` | `1.6875rem` (27 px) | |
| `--note-indent` | `2rem` | indent of replies to a reply |
| `--note-overlap` | `1.25rem` (20 px) | how much a stuck note overlaps the note before it; smaller than `--note-padding-block` |
| `--note-tilt` | `1deg` | rotation |
| `--note-shift` | `min(1.5rem, 4vw)` | zigzag offset |

The contrast test (`tests/styles.test.ts`) checks each `--color-note-<n>-ink` on its `--color-note-<n>`, which must be at least 4.5:1; a colour without its ink fails. A new test checks that `--note-overlap` is smaller than `--note-padding-block` (both in `rem`), so a stuck note never reaches the text or byline of the note below.

*Why 24 px at the top and bottom:* in Figma, a ~300-character reply takes 10 lines of 27 px (270 px), plus the 27 px byline and a small gap, about 312 px. With 30 px at the top and bottom it would need ~372 px and the note would grow. With 24 px it needs ~360 px.

### 4. Colours by position, in CSS only

Threads cycle the four colours. The stuck notes of a thread of colour n cycle the three colours that are not the next thread's (n + 1): n + 2, n + 3, n. Each thread sets those three, with their inks, and each note picks one as `--note` and `--note-ink`:

```css
.replies__thread:nth-child(4n + 1) { --note-own: var(--color-note-1); --note-a: var(--color-note-3); --note-b: var(--color-note-4); /* and their -ink */ }
/* … 4n + 2, 4n + 3, 4n + 4 */
.replies__thread > .reply { --note: var(--note-own); }
.replies__followups > .reply:nth-child(3n + 1) { --note: var(--note-a); }
.replies__followups > .reply:nth-child(3n + 2) { --note: var(--note-b); }
.replies__followups > .reply:nth-child(3n + 3) { --note: var(--note-own); }
.reply { background-color: var(--note); color: var(--note-ink); }
```

So two notes next to each other on screen never share a colour: neighbouring threads differ; the first stuck note (n + 2) differs from the main note; stuck notes in a row differ (a 3-cycle); and the last stuck note is never n + 1, the colour of the next thread right below it. With three colours that last condition would leave only two colours alternating for the stuck notes; the fourth colour lets them use three. Changing the number of colours means changing both cycles; `replies.css` documents that.

*Alternative:* one cycle over every note in the column, computed in JS. It would use all colours evenly, but a new reply to the notebook would change the colours of every thread after it, and it needs a class per colour.

*Alternative:* a hash of the reply's URI. It is stable even when a reply in the middle is approved later, but with four colours one pair in four would repeat.

### 5. The note

`.reply` inside `.replies`:
- `width: min(100%, var(--note-size))`, `aspect-ratio: 1`, so it is a square that grows only if its content overflows;
- `padding: var(--note-padding-block) var(--note-padding)`;
- flex column with `justify-content: center`;
- `background-color: var(--note)`, with no strip line;
- `box-shadow: var(--shadow-note)`;
- `.reply__text`: `--note-font-size`, `--note-line`, `--note-ink`, `font-style: normal`;
- the byline is a `footer.reply__footer` after the text (it signs the note, so it goes after it in the DOM too, not reordered by CSS), with the new modifier `byline--note`: same size and colour for name and date, right-aligned by `.reply__footer`. The `reply__header` element goes away.

### 6. Layout of the column

- `.replies`: a column centred under the sheet, with `gap: var(--space-6)` between threads and `overflow-x: clip`, so the zigzag never creates horizontal scroll. `padding-inline: var(--space-3)` keeps the corners of the rotated notes, and their shadow, inside the clipping box on narrow screens (without it, at 360 px, the 1° rotation cut up to 4 px of them). It is also a size container (`container-type: inline-size`), so the threads can measure the column with `cqi`.
- `.replies__thread`: `width: min(calc(100cqi - 2 * var(--note-shift)), var(--note-size))`, centred. The direct reply fills it, so the main notes stay on the sheet's axis, and the zigzag offset fits inside the column even at 360 px: `overflow-x: clip` never cuts an edge.
  - `:nth-child(odd)`: `rotate(calc(-1 * var(--note-tilt)))` and `translate(var(--note-shift))`.
  - `:nth-child(even)`: `rotate(var(--note-tilt))` and `translate(calc(-1 * var(--note-shift)))`.
- `.replies__followups`: stuck notes are as wide as the main one and stick out by the indent on the end side (`margin-inline: indent -indent`). The indent is `--note-indent` when the column has room for it and shrinks, down to 0, when it does not: `clamp(0px, (100cqi - note width) / 2 - --note-shift, --note-indent)`, the room at the end side of a thread shifted towards that side (the worst case), so every thread gets the same indent. With the column of 608 px it is 32 px, with 468 px about 22 px, and on a 360 px phone 0: the stuck note sits straight on the one before, overlapping its bottom. Each `.reply--followup` has `margin-block-start: calc(-1 * var(--note-overlap))` and `position: relative`, so it paints over the note before it, with a small alternating rotation of its own.

### 7. Old styles

`reply.css` and `replies.css` are rewritten. The provisional rules from `arquitectura-estilos` (`margin-block` on `.reply`, `margin-inline-start: var(--space-6)` on the followups) go away.

## Risks / Trade-offs

- **[A reply approved late, or hidden, in the middle shifts the colours of the notes below it]** → Accepted (see proposal).
- **[Rotated notes and `aspect-ratio` with very long words]** → `.reply__text` keeps `overflow-wrap: anywhere`. The note grows in height rather than overflowing.
- **[The overlap covers text if the padding changes]** → The token test (decision 3) fails if `--note-overlap` is not smaller than `--note-padding-block`.
- **[On a phone, stuck notes have no indent]** → Accepted: shrinking the notes instead would make every note in the thread smaller. The overlap, the rotation and the colour still tell them apart.
- **[The comma changes the index too]** → Intended: the design uses "name, date" everywhere.

## Migration Plan

Publish as usual. To roll back, use "Publish deploy" on an earlier deploy. No data.
