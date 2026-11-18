/**
 * jsdom 26 has `HTMLDialogElement` but no `showModal()` or `close()`: this
 * shim sets and removes `open` and dispatches `close`, as browsers do.
 */
export function installDialogShim(): void {
  const proto = HTMLDialogElement.prototype;
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

/** Stand-in for `Image` that records every loader the code creates. */
export function fakeImages() {
  const created: HTMLImageElement[] = [];
  class FakeImage {
    constructor() {
      const img = document.createElement("img");
      created.push(img);
      return img;
    }
  }
  return { FakeImage, created };
}

/** Waits for the next `popstate` (jsdom fires it asynchronously). */
export function nextPopState(): Promise<PopStateEvent> {
  return new Promise((resolve) => window.addEventListener("popstate", (e) => resolve(e), { once: true }));
}
