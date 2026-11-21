// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { imageDecoded, PAGE_TURN_DECODE_MS, startPageTurn, turnDirection } from "../src/ui/page-turn.ts";
import { fakeMatchMedia, fakeViewTransitions } from "./view-transitions.ts";

describe("turnDirection (page-turn-transition 1.1)", () => {
  // Newest first, as the catalogue.
  const catalog = ["a", "b", "c", "d", "e", "f", "g"].map((rkey) => ({ rkey }));

  test("to a later index is older, to an earlier one newer", () => {
    expect(turnDirection(catalog, "b", "c")).toBe("older");
    expect(turnDirection(catalog, "c", "b")).toBe("newer");
  });

  test("several places apart", () => {
    expect(turnDirection(catalog, "a", "f")).toBe("older");
    expect(turnDirection(catalog, "f", "a")).toBe("newer");
  });

  test("no turn without a drawing before, to the same one, or outside the catalogue", () => {
    expect(turnDirection(catalog, null, "a")).toBeNull();
    expect(turnDirection(catalog, "a", null)).toBeNull();
    expect(turnDirection(catalog, "c", "c")).toBeNull();
    expect(turnDirection(catalog, "x", "a")).toBeNull();
    expect(turnDirection(catalog, "a", "x")).toBeNull();
  });
});

describe("startPageTurn (page-turn-transition 2.1)", () => {
  function setup({ api = true, reducedMotion = false } = {}) {
    const vt = fakeViewTransitions();
    const doc = document.implementation.createHTMLDocument("");
    if (api) Object.assign(doc, { startViewTransition: vt.startViewTransition });
    const win = { matchMedia: fakeMatchMedia(reducedMotion) } as unknown as Window;
    const attr = () => doc.documentElement.dataset.pageTurn;
    return { vt, doc, win, attr };
  }
  const settle = () => new Promise((r) => setTimeout(r, 0));

  test.each([
    ["without the API", { api: false }, "older"],
    ["without a direction", {}, null],
    ["with reduced motion", { reducedMotion: true }, "newer"],
  ] as const)("%s: runs the update at once and returns null", (_, opts, direction) => {
    const t = setup(opts);
    const update = vi.fn();
    expect(startPageTurn(t.doc, t.win, direction, update)).toBeNull();
    expect(update).toHaveBeenCalledOnce();
    expect(t.vt.started).toHaveLength(0);
    expect(t.attr()).toBeUndefined();
  });

  test("a window without matchMedia still turns", () => {
    const t = setup();
    expect(startPageTurn(t.doc, {} as Window, "older", () => {})).not.toBeNull();
    expect(t.vt.started).toHaveLength(1);
  });

  test("sets the direction before the update and clears it when finished resolves", async () => {
    const t = setup();
    const update = vi.fn();
    const turn = startPageTurn(t.doc, t.win, "older", update);
    expect(turn).toBe(t.vt.started[0]);
    expect(update).not.toHaveBeenCalled(); // asynchronous, like the real API
    expect(t.attr()).toBe("older");
    await t.vt.started[0]!.updateDone;
    expect(update).toHaveBeenCalledOnce();
    expect(t.vt.started[0]!.directionAtUpdate).toBe("older");
    expect(t.attr()).toBe("older");
    t.vt.started[0]!.finish();
    await settle();
    expect(t.attr()).toBeUndefined();
  });

  test("clears it when finished rejects", async () => {
    const t = setup();
    startPageTurn(t.doc, t.win, "newer", () => {});
    t.vt.started[0]!.fail();
    await settle();
    expect(t.attr()).toBeUndefined();
  });

  test("an older turn finishing never clears a newer turn's direction", async () => {
    const t = setup();
    startPageTurn(t.doc, t.win, "older", () => {});
    startPageTurn(t.doc, t.win, "newer", () => {});
    const [a, b] = t.vt.started;
    a!.finish();
    await settle();
    expect(t.attr()).toBe("newer");
    b!.finish();
    await settle();
    expect(t.attr()).toBeUndefined();
  });
});

describe("imageDecoded", () => {
  const img = (decode?: () => Promise<void>) => Object.assign(document.createElement("img"), { decode }) as HTMLImageElement;

  test("at once without an image or without decode", async () => {
    await expect(imageDecoded(null)).resolves.toBeUndefined();
    await expect(imageDecoded(img(undefined))).resolves.toBeUndefined();
  });

  test("when it decodes, and when decoding fails", async () => {
    await expect(imageDecoded(img(() => Promise.resolve()))).resolves.toBeUndefined();
    await expect(imageDecoded(img(() => Promise.reject(new Error("broken"))))).resolves.toBeUndefined();
  });

  test("gives up after the cap", async () => {
    vi.useFakeTimers();
    try {
      let done = false;
      void imageDecoded(img(() => new Promise(() => {}))).then(() => (done = true));
      await vi.advanceTimersByTimeAsync(PAGE_TURN_DECODE_MS - 1);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(done).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
