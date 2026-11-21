# Proposal

## Why

Moving from one drawing to another swaps the whole page at once. The site looks like a spiral notebook, and with the arrows beside the sheet (page-navigation) a child expects the arrows to *turn the page*. An animated page turn makes the metaphor real and tells which way you went, older or newer, without reading anything.

## What Changes

- **Page turn between drawings:** going from one drawing to another turns the sheet around the axis of its rings, in 3D.
  - Towards an older drawing ("Seguinte"): the current sheet lifts and turns away over the rings, uncovering the next one underneath.
  - Towards a newer drawing ("Anterior"): the previous sheet comes back over the rings and lands on top of the current one.
  - The direction comes from the order of the two drawings in the catalogue, so the browser's back and forward actions turn the page the right way too.
- **The notes take turns:** the sticky notes of the old drawing fade out as the sheet starts to turn, and the new drawing's notes fade in once it has landed. They never turn with the sheet.
- **What stays still:** the site header and the arrows (beside the sheet, or in the bottom bar on a phone) do not take part in the turn.
- **The new sheet arrives complete when it can:** if the drawing was prepared in advance, the sheet that is uncovered already shows its image. Otherwise the turn starts at once with what the catalogue has, as today, and the rest appears when it arrives.
- **No turn** on the first load, on links to a drawing from outside, between the index and a drawing, when the same drawing is shown again, when the visitor's system asks for reduced motion, or in browsers without the View Transitions API. In all those cases the page changes at once, as today.
- **Quick clicks:** a new navigation during a turn ends the current turn at once and goes on to the new drawing.
- The duration comes from the design tokens.

Out of scope: an entrance animation of the notes ("sticking" with a bounce), a transition from an index thumbnail to the sheet, showing the back of the turning sheet, and swipe gestures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-styling`: new requirement for the page turn between drawings, alongside the viewer's opening transition: direction, what moves and what stays still, reduced motion, and the cases with no turn.

`drawing-catalog` keeps its requirements. The text, name, date and arrows still come from the catalogue right away, and neighbours prepared in advance are still shown without waiting for the network. The turn only decides how the swap looks (design, decision 4).

## Impact

- **Code:** `src/app.ts` (direction, and wrapping the swap in a view transition), a small module for the direction and the transition (`src/ui/page-turn.ts`), `src/drawing-loader.ts` (`peek` of a settled result, so the new sheet can be filled before the snapshot).
- **Styles:** a new `components/page-turn.css` (the view-transition pseudo-elements and reduced motion), `view-transition-name`s for the sheet, the notes, the header and the pager, and a `--page-turn-duration` token in `theme.css`.
- **Tests:** direction, the transition being used or not (with a fake `startViewTransition`, since jsdom has none), skipping on quick clicks, the attribute removed afterwards, and the style tests (tokens, reduced motion, no literal colours).
- **No changes:** data, moderation, freshness, routes, CSP (no new resource, and the transition is styled only from the site's own stylesheet).
- **Depends on** `page-navigation` (sheet and arrows as separate elements), which is implemented but not yet archived.
