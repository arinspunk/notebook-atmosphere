# Design

## Context

- The notes are `section.replies > div.replies__thread > (article.reply, div.replies__followups > article.reply--followup …)`, built by `renderCards()` and appended by `fill()` in `src/ui/drawing-view.ts`. Each thread already uses the individual `rotate` and `translate` properties for its tilt and zigzag (`replies.css`); stuck-on notes use `rotate` too.
- `fill()` runs either on the detached shell before a page turn shows it (prepared drawing) or later, on the live page (`page-turn-transition`, decision 4). In `app.ts`, `turn` holds the running page turn, if any.
- During a page turn, `page-turn.css` fades the new notes in after `--page-turn-duration` (`::view-transition-new(notes)`), and the old ones out.
- On a phone the notes are below the sheet, out of sight on loading.
- Motion precedents: the viewer's transition and the page turn, both with duration tokens and a reduced-motion path.

## Goals / Non-Goals

**Goals:**
- A bounce the visitor actually sees, also on a phone.
- Never hide a note for good: if anything is missing (no observer, reduced motion, JS not armed), the notes are shown as today.
- Keep each note's tilt and zigzag while it bounces.

**Non-Goals:**
- Any change to which replies are shown or their order.

## Decisions

### 1. Stick on when in view, with an `IntersectionObserver`

A new `src/ui/note-stick.ts` exports `stickNotes(section, win, after?)`. It observes every `.replies__thread` of `section` with an `IntersectionObserver` with threshold `0` and `rootMargin: "0px 0px -15% 0px"`: a thread counts as in view as soon as any part of it is above the bottom 15 % of the screen. A threshold on the visible fraction (such as `0.2`) would never be reached by a thread taller than five screens, which would then stay hidden for good; the bottom margin also keeps a note from bouncing behind the bar of arrows on a phone. On the first intersection of a thread it adds `replies__thread--stuck` and stops observing that thread; once all are stuck, it disconnects. It returns a `stop()` that disconnects at once.

The threads that become visible in the same callback are sorted by their position in the document (the callback's entries can come in any order) and numbered `0, 1, 2…`, capped at 4. The number goes to the custom property `--note-stick-order` through CSSOM (`style.setProperty`), the same way the drawing's proportion is set, never through a `style` attribute. The CSS turns it into the delay: `calc(var(--note-stick-order) * var(--note-stick-stagger))`.

*Alternatives:* bouncing when the notes are inserted, which is pure CSS, but on a phone they are off screen and nobody would see it. `animation-timeline: view()` is CSS only, but Safari lacks it, and scroll-driven timing ties the bounce to the scroll speed instead of playing it once.

### 2. Hidden only when armed (fail open)

The hidden state is gated by a block modifier, `replies--sticking`, that `stickNotes` adds only when it will animate:

```css
.replies--sticking .replies__thread:not(.replies__thread--stuck) { opacity: 0; }
.replies--sticking .replies__thread--stuck { animation: note-stick … both; }
```

`renderCards()` alone, the existing tests, and any path that never arms show the notes as today. `opacity: 0` keeps the notes in the accessibility tree and in find-in-page; finding one scrolls it into view, and it sticks on.

`stickNotes` does not arm, and so leaves the notes visible, when `win.matchMedia?.("(prefers-reduced-motion: reduce)").matches` or when `IntersectionObserver` is missing. A `prefers-reduced-motion: reduce` block in `replies.css` also resets `opacity` and `animation` as a backstop, as the viewer and the page turn do. A `print` block shows every note.

### 3. The bounce animates `scale` and `opacity` only

The threads use `rotate` and `translate`. The keyframes animate the individual `scale` property and `opacity`, which compose with those, so the tilt and zigzag stay as they are. `transform` would override them.

```css
@keyframes note-stick {
  0%   { scale: 1.12; opacity: 0; }  /* lifted, closer to the visitor */
  45%  { scale: 0.97; opacity: 1; }  /* pressed onto the page */
  70%  { scale: 1.015; }
  100% { scale: 1; }
}
```

`ease-out`, over `--note-stick-duration` (450ms). A style test checks that the keyframes do not use `transform`, `rotate` or `translate`.

The bounce is on each note (`.reply`), not on the thread, so the notes stuck on a reply can stick on after it, in a cascade. Hiding is on the notes too: a hidden thread would hide its stuck-on notes with it, whatever their own opacity. The delay of each note is

```
--note-stick-order × --note-stick-stagger  +  --note-stick-step × --note-stick-cascade
```

`--note-stick-order` is set on the thread and inherited by its notes. `--note-stick-step` is `0` for the main note (the default) and `1, 2, 3…` for the notes stuck on it, capped at 5. `stickNotes` sets it through CSSOM on each `.reply--followup` when it sticks the thread, so the CSS needs no list of `:nth-child` rules. The stuck-on notes use `rotate` for their alternating tilt; `scale` composes with it.

### 4. After a page turn

`fill()` returns the `.replies` section it appended, or `null`. In `app.ts`, right after `fill()`, the app calls `stickNotes(section, win, turn?.finished)`:
- The section is armed (hidden) at once.
- Observing starts when `after` settles, whether it resolves or rejects, or at once without it. If `stop()` was called before that (the visitor navigated during the turn, which skips it and settles `finished`), it never starts.

When the drawing was prepared, `fill()` runs before the update callback shows the shell, so the new state already has its notes hidden. Nothing of them shows in `::view-transition-new(notes)`, and they stick on when the turn has finished. When it was not, `turn` is `null` or still running by the time the data arrives, and both cases work the same.

In `page-turn.css`, `::view-transition-new(notes)` gets `animation: none` instead of its fade-in, which is now redundant (the live notes are hidden). The rule is kept rather than removed, because without it the browser's default fade-in would apply. The fade-out of the old notes stays.

The app keeps the `stop()` of the current notes and calls it at the start of every `render()`, next to `skipTransition()`, so an observer never outlives its page.

### 5. Tokens

`--note-stick-duration: 450ms`, `--note-stick-stagger: 90ms` (between direct replies entering together) and `--note-stick-cascade: 180ms` (between a note and the next one stuck on it), in `theme.css` next to the page-turn tokens.

## Risks / Trade-offs

- **[Risk] A note never sticks on, so it stays invisible** (for example, an observer that never fires, or a thread too tall to reach a visible fraction). → Mitigation: the hidden state needs the `replies--sticking` arm, set only when an observer exists; the threshold is `0`, so any thread that reaches the screen counts, however tall; observing starts on `after` settling either way; the reduced-motion and print blocks show everything. A test checks that without `IntersectionObserver` nothing is armed.
- **[Risk] The bounce scale makes a tilted note poke out of the clipped `.replies` column for a moment** (`overflow-x: clip`). → Mitigation: the overshoot is small (1.12 at opacity 0, then under 1.02), and the column already has inline padding for the tilt. Check it at 360 px.
- **[Trade-off] Notes scrolled past very fast stick on after the visitor has seen the empty spot for a moment.** This is accepted: the bounce is 450ms.
- **[Trade-off] On a page turn, the notes wait for `finished`,** which includes the old notes' fade-out. That is shorter than the sheet's turn, so it adds nothing.

## Migration Plan

Nothing to migrate. Rollback means removing `note-stick.ts` and its call, the rules in `replies.css` and the two tokens, and restoring the fade-in in `page-turn.css`.
