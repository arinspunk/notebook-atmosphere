# Design

## Context

See proposal.md (Why) for the motivation and the specs for the requirements.

Current state that shapes the approach:

- **Markup:** `renderDrawingShell` returns `article.post`, and `fill()` appends `section.replies` inside it, so the replies sit inside the sheet. Each card is `div.replies__thread` with `article.reply` and, if there are replies to it, `div.replies__followups` with `article.reply.reply--followup` (all descendants flattened into one level).
- **Byline:** three places build it (`renderDrawingShell`, `renderReply` in `drawing-view.ts`, and `renderIndex` in `index-view.ts`) as `strong.byline__name`, a `" "` text node and `time.byline__date`. `renderTime` returns `null` for an invalid date. `.byline` is a flex row with `gap`.
- **Figma, component `Post it`** (360 × 360):
  - background `#ceb6ff`, 30 px padding;
  - a 1 px line, black at 10 % in multiply mode, 62 px from the top;
  - text in Andika 18/27, `#24006c`;
  - byline right-aligned: name in Bold, ", há 22 d" in Regular.
- **Figma, desktop frame:** notes in yellow `#fffb86` and cyan `#84fefc` (equal to `--color-accent`) too. Content centred vertically, slight rotations, zigzag, and notes overlapping a little.
- **Contrast** of `#24006c` on the three colours: 9.1:1, 14.8:1 and 13.6:1.

## Goals / Non-Goals

**Goals:**

- Notes like the design at 468 px and without horizontal scroll at 360 px.
- Colour, rotation and zigzag in CSS only, by position, with the palette in tokens.
- Stuck notes that never cover the text of the note below.

**Non-Goals:**

- Random or per-reply colours. A position cycle guarantees no repeats between neighbours, and new replies go at the end.
- Reproducing the multiply blend of the strip exactly. A semi-transparent black line looks the same on light colours.

## Decisions

### 1. A `drawing` block wraps the sheet and the replies

`renderDrawingShell` returns `div.drawing` containing `article.post`. `fill()` appends `section.replies` to `div.drawing`, after the post. `fail()` still puts its status message inside the post. `shell.element` is now `div.drawing`, so `app.ts` does not change. `drawing.css` makes `.drawing` a column with a gap between the sheet and the notes.

*Alternative:* return a fragment and insert the replies with `post.after()`. That fails while the shell is not yet in the document, which `renderDrawing` does.

### 2. One helper for the byline, with the comma

A new `renderByline({ tag, className, name, iso, i18n, now })` in `src/ui/dom.ts` returns a `tag` element (`p` in the drawing, `header` in the notes, `span` in the index) with `strong.byline__name` and, only if the date is valid, the separator and `time.byline__date`. It is used by the drawing, the replies and the index cards. An invalid date leaves only the name, with no trailing comma.

The separator is a new UI string, `bylineSeparator: ", "`, because `ui-localization` asks for every fixed UI text to come from the dictionary.

`.byline` stops being a flex row: with `gap`, the comma would become a separate flex item with space on both sides ("Toquinho , há"). It becomes ordinary inline text:
- `.post__byline` changes `justify-content: flex-end` to `text-align: end`;
- the `gap` of `byline--large` goes away;
- the notes align their header with `text-align: end` on `.reply__header`.

### 3. Note tokens

New tokens in `theme.css`:

| Token | Value | Use |
|---|---|---|
| `--color-note-1` | `#ceb6ff` | lilac |
| `--color-note-2` | `#fffb86` | yellow |
| `--color-note-3` | `var(--color-accent)` | cyan |
| `--color-note-ink` | `#24006c` | text on notes |
| `--color-note-strip` | `rgb(0 0 0 / 0.1)` | line of the adhesive strip |
| `--shadow-note` | soft shadow, like the sheet's | |
| `--note-size` | `22.5rem` (360 px) | side of the note |
| `--note-padding` | `1.875rem` (30 px) | padding at the sides |
| `--note-padding-block` | `1.5rem` (24 px) | padding at the top and bottom, close to Figma's 26 and 21 px, so 300 characters fit |
| `--note-strip-offset` | `3.875rem` (62 px) | position of the strip line |
| `--note-font-size` | `1.125rem` (18 px) | |
| `--note-line` | `1.6875rem` (27 px) | |
| `--note-indent` | `2rem` | indent of replies to a reply |
| `--note-overlap` | `1.25rem` (20 px) | how much a stuck note overlaps the note before it; smaller than `--note-padding-block` |
| `--note-tilt` | `1deg` | rotation |
| `--note-shift` | `min(1.5rem, 4vw)` | zigzag offset |

The contrast test (`tests/styles.test.ts`) adds `--color-note-ink` on each `--color-note-*`, which must be at least 4.5:1. A new test checks that `--note-overlap` is smaller than `--note-padding-block` (both in `rem`), so a stuck note never reaches the text or byline of the note below.

*Why 24 px at the top and bottom:* in Figma, a ~300-character reply takes 10 lines of 27 px (270 px), plus the 27 px byline and a small gap, about 312 px. With 30 px at the top and bottom it would need ~372 px and the note would grow. With 24 px it needs ~360 px.

### 4. Colours by position, in CSS only

Each thread defines its colour and the next two:

```css
.replies__thread:nth-child(3n + 1) { --note: var(--color-note-1); --note-next: var(--color-note-2); --note-after: var(--color-note-3); }
.replies__thread:nth-child(3n + 2) { --note: var(--color-note-2); --note-next: var(--color-note-3); --note-after: var(--color-note-1); }
.replies__thread:nth-child(3n + 3) { --note: var(--color-note-3); --note-next: var(--color-note-1); --note-after: var(--color-note-2); }
.replies__followups > .reply:nth-child(odd)  { --note: var(--note-next); }
.replies__followups > .reply:nth-child(even) { --note: var(--note-after); }
.reply { background-color: var(--note); }
```

Consecutive threads cycle 1, 2, 3, so two neighbours never share a colour. The first reply to a reply takes `next`, which differs from its thread's colour, and the following ones alternate `next` and `after`, so no stuck note shares a colour with the note right before it. Adding a fourth colour means a fourth token and changing the cycle to `4n`. `replies.css` documents that.

*Alternative:* a hash of the reply's URI. It is stable even when a reply in the middle is approved later, but with three colours one pair in three would repeat.

### 5. The note

`.reply` inside `.replies`:
- `width: min(100%, var(--note-size))`, `aspect-ratio: 1`, so it is a square that grows only if its content overflows;
- `padding: var(--note-padding-block) var(--note-padding)`;
- flex column with `justify-content: center`;
- `background-color: var(--note)` and, over it, a `linear-gradient` that draws the 1 px strip line at `--note-strip-offset`;
- `box-shadow: var(--shadow-note)`;
- `.reply__text`: `--note-font-size`, `--note-line`, `--color-note-ink`, `font-style: normal`;
- the header gets the new modifier `byline--note`: same size and colour for name and date, right-aligned by `.reply__header`.

### 6. Layout of the column

- `.replies`: a column centred under the sheet, with `gap: var(--space-6)` between threads and `overflow-x: clip`, so the zigzag never creates horizontal scroll.
- `.replies__thread`: `width: min(calc(100% - 2 * var(--note-shift)), var(--note-size))`, centred. The direct reply fills it, so the main notes stay on the sheet's axis, and the zigzag offset fits inside the column even at 360 px: `overflow-x: clip` never cuts an edge.
  - `:nth-child(odd)`: `rotate(calc(-1 * var(--note-tilt)))` and `translate(var(--note-shift))`.
  - `:nth-child(even)`: `rotate(var(--note-tilt))` and `translate(calc(-1 * var(--note-shift)))`.
- `.replies__followups`: `margin-inline-start: var(--note-indent)`, so stuck notes are `--note-indent` narrower than the main one (328 px instead of 360). They are usually short replies from the notebook; a long one simply grows a little. Each `.reply--followup` has `margin-block-start: calc(-1 * var(--note-overlap))` and `position: relative`, so it paints over the note before it, with a small alternating rotation of its own.

### 7. Old styles

`reply.css` and `replies.css` are rewritten. The provisional rules from `arquitectura-estilos` (`margin-block` on `.reply`, `margin-inline-start: var(--space-6)` on the followups) go away.

## Risks / Trade-offs

- **[A reply approved late, or hidden, in the middle shifts the colours of the notes below it]** → Accepted (see proposal).
- **[Rotated notes and `aspect-ratio` with very long words]** → `.reply__text` keeps `overflow-wrap: anywhere`. The note grows in height rather than overflowing.
- **[The overlap covers text if the padding changes]** → The token test (decision 3) fails if `--note-overlap` is not smaller than `--note-padding-block`.
- **[Stuck notes are narrower, so a long reply to a reply grows]** → Accepted: they are usually short, and the note grows instead of overflowing.
- **[The comma changes the index too]** → Intended: the design uses "name, date" everywhere.

## Migration Plan

Publish as usual. To roll back, use "Publish deploy" on an earlier deploy. No data.
