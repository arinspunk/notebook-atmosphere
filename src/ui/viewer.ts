/**
 * Full-screen viewer for the drawing's image (change image-viewer, decisions 3
 * and 4).
 *
 * A native `<dialog>` opened with `showModal()`, appended to `document.body`
 * (outside `#app`, so a re-render does not remove it by surprise). It shows the
 * thumbnail at once, already in the browser cache, and swaps in the full image
 * when it has loaded; the full image is never requested before opening.
 *
 * History: opening pushes an entry with the same URL, so the browser's back
 * action closes the viewer (`popstate`) without leaving the drawing. Any other
 * close removes that entry with `history.back()`, but only while it is still
 * the current entry, and the `popstate` that follows is ignored.
 *
 * `history.back()` is asynchronous. If the viewer opens again before the
 * `popstate` of a removal arrives, its `pushState` waits for it: otherwise the
 * pending back would take the new entry, and the next back would leave the
 * drawing with the viewer still open.
 */

import type { I18n } from "../lib/i18n.ts";
import { el } from "./dom.ts";

export interface ViewerInput {
  /** URL already shown on the page; it is shown first. */
  thumb: string;
  /** URL of the full image; loaded only now. */
  full: string;
  alt: string;
  i18n: I18n;
  /** Element that gets the focus back when the viewer closes. */
  returnFocus?: HTMLElement | null;
}

interface OpenViewer {
  dialog: HTMLDialogElement;
  returnFocus: HTMLElement | null;
  /** Whether this viewer has pushed its history entry (it may still be waiting to). */
  pushed: boolean;
}

/** History state of the entry pushed when the viewer opens. */
const VIEWER_STATE = { viewer: true } as const;

let current: OpenViewer | null = null;
/** `popstate` events still to come from our own `history.back()` calls. */
let pendingBacks = 0;
/** The open viewer still has to push its entry, once the pending backs have arrived. */
let deferredPush = false;
let listening = false;

/** Whether the current history entry is the one the viewer pushed. */
export function isViewerState(state: unknown): boolean {
  return typeof state === "object" && state !== null && (state as { viewer?: unknown }).viewer === true;
}

function onPopState(): void {
  if (pendingBacks > 0) {
    // The `popstate` of our own `history.back()`: nothing to close.
    pendingBacks--;
    if (pendingBacks === 0 && deferredPush) {
      // The viewer reopened while that back was pending: push its entry once
      // the traversal has finished (pushing inside its own `popstate` is not
      // reliable everywhere).
      setTimeout(pushDeferred, 0);
    }
  } else if (current) {
    // Back while open, or a navigation to another hash: close without going back again.
    close(false);
  }
  updateListener();
}

/** Pushes the entry of a viewer that opened while one of our backs was pending, if it is still open. */
function pushDeferred(): void {
  if (!deferredPush || !current || current.pushed) return;
  deferredPush = false;
  history.pushState(VIEWER_STATE, "");
  current.pushed = true;
}

/** The `popstate` listener exists only while the viewer is open or one of our backs is pending. */
function updateListener(): void {
  const needed = current !== null || pendingBacks > 0;
  if (needed && !listening) window.addEventListener("popstate", onPopState);
  if (!needed && listening) window.removeEventListener("popstate", onPopState);
  listening = needed;
}

function close(removeEntry: boolean): void {
  const open = current;
  if (!open) return;
  current = null; // first, so the dialog's own `close` event does not come back here
  deferredPush = false; // closed before its entry was pushed: nothing to push or remove
  if (open.dialog.open) open.dialog.close();
  open.dialog.remove();
  if (open.returnFocus?.isConnected) open.returnFocus.focus();
  // Only an entry this viewer pushed is removed. `history.state` alone is not
  // enough: while an earlier back is pending it still shows the old entry. And
  // without the state check, a re-render caused by a navigation to another
  // drawing would send the visitor back to the previous one.
  if (removeEntry && open.pushed && isViewerState(history.state)) {
    pendingBacks++;
    history.back();
  }
  updateListener();
}

/** Closes the viewer, if open, and removes its history entry. Safe to call at any time. */
export function closeViewer(): void {
  close(true);
}

/** Opens the viewer over the page with the thumbnail, then the full image when it loads. */
export function openViewer({ thumb, full, alt, i18n, returnFocus = null }: ViewerInput): void {
  closeViewer();
  const image = el("img", { class: "viewer__image", src: thumb, alt });
  const closeButton = el("button", { class: "viewer__close", type: "button", "aria-label": i18n.t("close") }, "×");
  const dialog = el("dialog", { class: "viewer" }, closeButton, image);
  const open: OpenViewer = { dialog, returnFocus, pushed: false };

  // The dialog covers the whole screen: any click that is not on the image
  // (the close button, the margins, the backdrop) closes it.
  dialog.addEventListener("click", (e) => {
    if (e.target !== image) closeViewer();
  });
  // Escape: close through our own path so the history entry is removed too.
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeViewer();
  });
  // The browser may close the dialog by itself (e.g. a repeated close request).
  dialog.addEventListener("close", () => {
    if (current === open) closeViewer();
  });

  document.body.append(dialog);
  dialog.showModal();
  current = open;
  if (pendingBacks > 0) {
    deferredPush = true; // see the note on history at the top
  } else {
    history.pushState(VIEWER_STATE, "");
    open.pushed = true;
  }
  updateListener();

  if (full !== thumb) {
    const loader = new Image();
    // If the full image fails, the thumbnail stays.
    loader.addEventListener("load", () => {
      if (current === open) image.src = full;
    });
    loader.src = full;
  }
}
