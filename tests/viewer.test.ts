// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createI18n } from "../src/lib/i18n.ts";
import { closeViewer, isViewerState, openViewer } from "../src/ui/viewer.ts";
import { fakeImages, installDialogShim, nextPopState } from "./dialog-shim.ts";

installDialogShim();

const i18n = createI18n("gl");
const THUMB = "https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:x/cid";
const FULL = "https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:x/cid";
const BEM = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$/;

let images: ReturnType<typeof fakeImages>;
let zoom: HTMLButtonElement;

beforeEach(() => {
  images = fakeImages();
  vi.stubGlobal("Image", images.FakeImage);
  zoom = document.createElement("button");
  zoom.className = "post__zoom";
  document.body.append(zoom);
});

afterEach(async () => {
  if (document.querySelector(".viewer")) {
    const popped = nextPopState();
    closeViewer();
    await popped;
  }
  zoom.remove();
  vi.unstubAllGlobals();
});

const open = () => openViewer({ thumb: THUMB, full: FULL, alt: "Na praia", i18n, returnFocus: zoom });
const viewer = () => document.querySelector<HTMLDialogElement>("dialog.viewer");

/** Closes in some way other than back and waits for the `popstate` of the entry removal. */
async function closeAndSettle(action: () => void) {
  const popped = nextPopState();
  action();
  await popped;
  await new Promise((r) => setTimeout(r, 0));
}

describe("viewer (image-viewer 3.1)", () => {
  test("opens with the thumbnail and switches to the full image on load", () => {
    expect(images.created).toHaveLength(0); // nothing loads the full image before opening
    open();
    const dialog = viewer()!;
    expect(dialog.open).toBe(true);
    expect(dialog.parentElement).toBe(document.body);
    const img = dialog.querySelector<HTMLImageElement>(".viewer__image")!;
    expect(img.getAttribute("src")).toBe(THUMB);
    expect(img.alt).toBe("Na praia");
    expect(images.created.map((i) => i.getAttribute("src"))).toEqual([FULL]);
    images.created[0]!.dispatchEvent(new Event("load"));
    expect(img.getAttribute("src")).toBe(FULL);
  });

  test("if the full image fails, the thumbnail stays", () => {
    open();
    images.created[0]!.dispatchEvent(new Event("error"));
    expect(viewer()!.querySelector(".viewer__image")?.getAttribute("src")).toBe(THUMB);
  });

  test("close button: visible ×, named Fechar, and its click closes", async () => {
    open();
    const button = viewer()!.querySelector<HTMLButtonElement>(".viewer__close")!;
    expect(button.textContent).toBe("×");
    expect(button.getAttribute("aria-label")).toBe("Fechar");
    expect(button.getAttribute("type")).toBe("button");
    await closeAndSettle(() => button.click());
    expect(viewer()).toBeNull();
    expect(isViewerState(history.state)).toBe(false);
    expect(document.activeElement).toBe(zoom);
  });

  test("a click outside the image closes; a click on the image does not", async () => {
    open();
    viewer()!.querySelector<HTMLImageElement>(".viewer__image")!.click();
    expect(viewer()?.open).toBe(true);
    await closeAndSettle(() => viewer()!.click());
    expect(viewer()).toBeNull();
    expect(isViewerState(history.state)).toBe(false);
    expect(document.activeElement).toBe(zoom);
  });

  test("Escape (cancel) closes and removes the history entry", async () => {
    open();
    const cancel = new Event("cancel", { cancelable: true });
    await closeAndSettle(() => viewer()!.dispatchEvent(cancel));
    expect(viewer()).toBeNull();
    expect(isViewerState(history.state)).toBe(false);
    expect(document.activeElement).toBe(zoom);
  });

  test("the browser closing the dialog by itself also cleans up", async () => {
    open();
    await closeAndSettle(() => viewer()!.close());
    expect(viewer()).toBeNull();
    expect(isViewerState(history.state)).toBe(false);
  });

  test("back (popstate) closes without going back again", async () => {
    open();
    expect(isViewerState(history.state)).toBe(true);
    const back = vi.spyOn(history, "back");
    const popped = nextPopState();
    history.back();
    await popped;
    expect(viewer()).toBeNull();
    expect(back).toHaveBeenCalledTimes(1); // only ours, not another from the viewer
    expect(document.activeElement).toBe(zoom);
    back.mockRestore();
  });

  test("a popstate while closed does nothing, and the listener is gone after closing", async () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    open();
    const added = add.mock.calls.filter(([t]) => t === "popstate").map(([, fn]) => fn);
    expect(added).toHaveLength(1); // the viewer's listener
    await closeAndSettle(() => closeViewer());
    const removed = remove.mock.calls.filter(([t]) => t === "popstate").map(([, fn]) => fn);
    expect(removed).toContain(added[0]);
    add.mockRestore();
    remove.mockRestore();

    // A hash change fires popstate too: with the viewer closed, nothing happens.
    const back = vi.spyOn(history, "back");
    const popped = nextPopState();
    location.hash = "#/other";
    await popped;
    expect(viewer()).toBeNull();
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
    // Wait for the popstate of this hash change too, so it does not leak into the next test.
    const reset = nextPopState();
    location.hash = "";
    await reset;
  });

  test("closing and reopening at once keeps the history entry, and back still closes", async () => {
    open();
    const removal = nextPopState();
    viewer()!.querySelector<HTMLButtonElement>(".viewer__close")!.click();
    open(); // before the popstate of the removal has arrived; its push waits for it
    await removal;
    await new Promise((r) => setTimeout(r, 0)); // the deferred push runs after the traversal
    expect(viewer()?.open).toBe(true);
    expect(isViewerState(history.state)).toBe(true);
    const back = nextPopState();
    history.back();
    await back;
    expect(viewer()).toBeNull(); // back closed the viewer instead of leaving the drawing
  });

  test("reopened and closed again before the removal arrives: nothing left behind", async () => {
    open();
    const back = vi.spyOn(history, "back");
    const removal = nextPopState();
    viewer()!.querySelector<HTMLButtonElement>(".viewer__close")!.click();
    open();
    closeViewer(); // its entry was never pushed: no second back
    await removal;
    await new Promise((r) => setTimeout(r, 0));
    expect(viewer()).toBeNull();
    expect(isViewerState(history.state)).toBe(false);
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });

  test("closeViewer without an open viewer does nothing", () => {
    const back = vi.spyOn(history, "back");
    closeViewer();
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
  });

  test("viewer, viewer__image and viewer__close follow BEM", () => {
    open();
    const dialog = viewer()!;
    const classes = [dialog, ...dialog.querySelectorAll("[class]")].flatMap((n) => [...n.classList]);
    expect(classes.sort()).toEqual(["viewer", "viewer__close", "viewer__image"]);
    for (const c of classes) expect(c).toMatch(BEM);
  });
});
