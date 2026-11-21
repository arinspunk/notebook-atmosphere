/**
 * Page turn between drawings (page-turn-transition): which way the sheet
 * turns, and the view transition that animates the swap. The motion itself is
 * CSS, in `components/page-turn.css`, chosen by the `data-page-turn`
 * attribute of `<html>`.
 */

import type { Drawing } from "../catalog.ts";

/** Towards an older drawing (the sheet turns away) or a newer one (it comes back). */
export type TurnDirection = "older" | "newer";

/** The part of a `ViewTransition` the app uses. */
export interface PageTurn {
  finished: Promise<unknown>;
  skipTransition(): void;
}

/**
 * Longest wait for the new sheet's image to decode before the snapshot
 * (decision 4). The thumbnail is already in the HTTP cache; this only stops a
 * slow decode from holding the old page.
 */
export const PAGE_TURN_DECODE_MS = 150;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Direction of the turn from `fromRkey` to `toRkey`, by their order in the
 * catalogue (newest first), so history navigation turns the right way too.
 * `null` when there is no turn: no drawing before, the same drawing, or one of
 * them not in the catalogue.
 */
export function turnDirection(catalog: readonly Pick<Drawing, "rkey">[], fromRkey: string | null, toRkey: string | null): TurnDirection | null {
  if (!fromRkey || !toRkey || fromRkey === toRkey) return null;
  const from = catalog.findIndex((d) => d.rkey === fromRkey);
  const to = catalog.findIndex((d) => d.rkey === toRkey);
  if (from < 0 || to < 0) return null;
  return to > from ? "older" : "newer";
}

/** The turn that last set the attribute of each document: only it may clear it (decision 2). */
const activeTurns = new WeakMap<Document, PageTurn>();

/**
 * Runs `update` inside a view transition that turns the page towards
 * `direction`. Without the API, without a direction, or when the system asks
 * for reduced motion, runs `update` at once and returns `null`.
 */
export function startPageTurn(doc: Document, win: Window, direction: TurnDirection | null, update: () => void | Promise<void>): PageTurn | null {
  const start = (doc as Partial<Pick<Document, "startViewTransition">>).startViewTransition;
  if (!direction || typeof start !== "function" || win.matchMedia?.(REDUCED_MOTION).matches) {
    void update();
    return null;
  }
  const html = doc.documentElement;
  html.dataset.pageTurn = direction;
  const turn: PageTurn = start.call(doc, update);
  activeTurns.set(doc, turn);
  const clear = () => {
    // A newer turn may have started before this one finished: its direction stays.
    if (activeTurns.get(doc) !== turn) return;
    activeTurns.delete(doc);
    delete html.dataset.pageTurn;
  };
  turn.finished.then(clear, clear);
  return turn;
}

/**
 * Resolves when `img` has decoded, when decoding fails, or after
 * `PAGE_TURN_DECODE_MS`, whichever comes first. At once if there is no image.
 */
export function imageDecoded(img: HTMLImageElement | null): Promise<void> {
  if (!img || typeof img.decode !== "function") return Promise.resolve();
  return Promise.race([
    img.decode().catch(() => {}),
    new Promise<void>((resolve) => setTimeout(resolve, PAGE_TURN_DECODE_MS)),
  ]);
}
