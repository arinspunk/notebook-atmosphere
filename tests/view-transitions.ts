/**
 * Fake `document.startViewTransition` for the page-turn tests (jsdom has
 * none). Like the real one, it calls `update` asynchronously, after a task,
 * and `skipTransition()` runs a pending `update` at once. Its `finished` is
 * settled by hand with `finish()` / `fail()`, or right after `update` with
 * `autoFinish`.
 */

export interface FakeTurn {
  /** `data-page-turn` of `<html>` when `update` ran. */
  directionAtUpdate: string | undefined;
  /** What `probe` returned right after `update` started. */
  probed: unknown;
  /** Whether `update` has run. */
  ran: boolean;
  skipped: boolean;
  /** Settles when `update` has run (and its promise settled). */
  updateDone: Promise<void>;
  finished: Promise<void>;
  skipTransition(): void;
  finish(): void;
  fail(error?: unknown): void;
}

export function fakeViewTransitions({ autoFinish = false, probe }: { autoFinish?: boolean; probe?: () => unknown } = {}) {
  const started: FakeTurn[] = [];

  function startViewTransition(this: Document, update: () => unknown): FakeTurn {
    let resolveFinished!: () => void;
    let rejectFinished!: (e: unknown) => void;
    const finished = new Promise<void>((res, rej) => {
      resolveFinished = res;
      rejectFinished = rej;
    });
    finished.catch(() => {}); // tests may reject it on purpose
    const html = this.documentElement;
    let pending: Promise<void> | null = null;
    const run = () => {
      pending ??= (async () => {
        turn.ran = true;
        turn.directionAtUpdate = html.dataset.pageTurn;
        const result = update();
        turn.probed = probe?.();
        await result;
      })();
      return pending;
    };
    const turn: FakeTurn = {
      directionAtUpdate: undefined,
      probed: undefined,
      ran: false,
      skipped: false,
      updateDone: new Promise<void>((r) => setTimeout(r, 0)).then(run),
      finished,
      skipTransition() {
        turn.skipped = true;
        void run().then(() => resolveFinished());
      },
      finish: () => resolveFinished(),
      fail: (error = new Error("update failed")) => rejectFinished(error),
    };
    if (autoFinish) void turn.updateDone.then(() => resolveFinished());
    started.push(turn);
    return turn;
  }

  return { started, startViewTransition };
}

/** `matchMedia` that answers `matches` for reduced motion and `false` for anything else. */
export function fakeMatchMedia(reducedMotion: boolean) {
  return (query: string) => ({ matches: reducedMotion && query.includes("prefers-reduced-motion: reduce") }) as MediaQueryList;
}
