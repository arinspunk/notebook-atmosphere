/**
 * Notes that stick on with a bounce the first time they come into view
 * (notes-stick-bounce). The bounce itself is CSS, in `components/replies.css`;
 * this module only decides when each thread of notes is stuck.
 *
 * Fail open: the notes are hidden only while `replies--sticking` is on, and it
 * is set only when an observer will reveal them.
 */

/** Highest stagger position: notes entering together never wait longer. */
const MAX_ORDER = 4;

/** Highest step in the cascade of notes stuck on a reply. */
const MAX_STEP = 5;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Starts sticking on the threads of `section` as they come into view, once
 * `after` settles (the page turn, if any). Returns `stop()`, which stops it,
 * also before it has started. Does nothing, leaving the notes visible, with
 * reduced motion or without `IntersectionObserver`.
 */
export function stickNotes(section: HTMLElement, win: Window, after?: Promise<unknown>): () => void {
  const Observer = (win as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  if (typeof Observer !== "function" || win.matchMedia?.(REDUCED_MOTION).matches) return () => {};

  const threads = [...section.querySelectorAll<HTMLElement>(".replies__thread")];
  if (!threads.length) return () => {};
  section.classList.add("replies--sticking");

  let stopped = false;
  let observer: IntersectionObserver | null = null;
  const stop = () => {
    stopped = true;
    observer?.disconnect();
  };

  const start = () => {
    if (stopped) return;
    let pending = threads.length;
    // Any part of a thread above the bottom 15 % of the screen counts, however tall the thread.
    observer = new Observer(
      (entries) => {
        const entering = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement)
          .filter((t) => !t.classList.contains("replies__thread--stuck"))
          // The entries may come in any order: stagger them as they are on the page.
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        entering.forEach((thread, i) => {
          thread.style.setProperty("--note-stick-order", String(Math.min(i, MAX_ORDER)));
          // The notes stuck on the reply follow it one by one (decision 3).
          thread.querySelectorAll<HTMLElement>(".reply--followup").forEach((note, k) => {
            note.style.setProperty("--note-stick-step", String(Math.min(k + 1, MAX_STEP)));
          });
          thread.classList.add("replies__thread--stuck");
          observer?.unobserve(thread);
          pending--;
        });
        if (pending <= 0) observer?.disconnect();
      },
      { threshold: 0, rootMargin: "0px 0px -15% 0px" },
    );
    for (const thread of threads) observer.observe(thread);
  };

  if (after) after.then(start, start);
  else start();
  return stop;
}
