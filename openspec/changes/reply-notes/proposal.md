# Proposal

## Why

The replies still use the provisional styles from `arquitectura-estilos`: plain text blocks inside the drawing's sheet. The design in Figma (component `Post it` and the desktop frame) shows them as coloured sticky notes in a column below the sheet. Each note is slightly rotated, and the notes zigzag left and right. Children should read the replies as notes their friends left on the notebook.

## What Changes

- **Replies below the sheet:** the replies leave the drawing's sheet and go after it, in their own column.
- **Sticky notes:** every reply is a note of at least 360 × 360 px (it only grows if a text ever needs it), with 30 px of padding at the sides and 24 px at the top and bottom, so a 300-character reply fits, as in Figma, the line of the adhesive strip near the top, and the content centred vertically. The text is Andika in roman (no italics), 18/27, in the notes' ink colour. The byline is right-aligned, with the name in bold and the date in regular, same size and colour.
- **Colours:** three colours from the design (lilac, yellow and cyan) in a cycle by position, so two consecutive notes never share a colour. A new reply usually goes at the end, because replies are ordered from oldest to newest, so the notes above keep their colours.
- **Layout:**
  - **Direct replies** are separate notes, slightly rotated and zigzagging left and right, by position.
  - **Replies to a reply** (all of them, at any depth, as today) are notes stuck on top of the note before them: indented once, overlapping it a little without covering its text, and in colours different from the note they answer.
- **Byline with a comma:** name and date read "Toquinho, há 16 h", as in the design, everywhere a byline appears (drawing, notes and index). The separator is a new UI string, so another language can use its own.

Out of scope: the page background with doodles, the header ("o nosso caderno"), the pager as side arrows, the index, and a desktop layout beyond the centred column.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-styling`: new requirements for the replies as sticky notes (placement below the sheet, colours, stuck replies to replies) and for the comma in the byline.

`reply-rendering` keeps its requirements: one card per direct reply, descendants flattened into one indented level, text, name and date only. This change only defines how those cards look.

## Impact

- **Code:** `src/lib/i18n.ts` (new `bylineSeparator` string), `src/ui/drawing-view.ts` (the shell wraps the sheet and the replies in a `drawing` block; byline separator; the header of a note gets `byline--note`) and `src/ui/index-view.ts` (byline separator).
- **Styles:** `theme.css` (note tokens), `components/replies.css`, `components/reply.css`, `components/byline.css` and a new `components/drawing.css`.
- **Tests:** drawing view (structure and order), BEM, contrast (note text on each note colour) and the byline text.
- **Language:** the spec delta is in English and lands in `site-styling`, which still mixes English and Spanish until the translation change.
- **No changes:** data, moderation, flattening of replies, routes and CSP.
