// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { stickNotes } from "../src/ui/note-stick.ts";
import { fakeIntersectionObservers } from "./intersection-observer.ts";
import { fakeMatchMedia } from "./view-transitions.ts";

describe("stickNotes (notes-stick-bounce 1.1)", () => {
  function setup({ observer = true, reducedMotion = false, threads = 3 } = {}) {
    const io = fakeIntersectionObservers();
    const win = {
      matchMedia: fakeMatchMedia(reducedMotion),
      ...(observer ? { IntersectionObserver: io.IntersectionObserver } : {}),
    } as unknown as Window;
    const section = document.createElement("section");
    section.className = "replies";
    for (let i = 0; i < threads; i++) {
      const t = document.createElement("div");
      t.className = "replies__thread";
      section.append(t);
    }
    const all = [...section.children] as HTMLElement[];
    const order = (t: HTMLElement) => t.style.getPropertyValue("--note-stick-order");
    const stuck = () => all.map((t) => t.classList.contains("replies__thread--stuck"));
    return { io, win, section, all, order, stuck };
  }
  const settle = () => new Promise((r) => setTimeout(r, 0));

  test("arms the section and observes every thread, with threshold 0 and the bottom margin", () => {
    const t = setup();
    stickNotes(t.section, t.win);
    expect(t.section.classList.contains("replies--sticking")).toBe(true);
    const [observer] = t.io.created;
    expect(observer!.options).toEqual({ threshold: 0, rootMargin: "0px 0px -15% 0px" });
    expect([...observer!.observed]).toEqual(t.all);
  });

  test("threads entering together are staggered in document order, even when reported in reverse", () => {
    const t = setup();
    stickNotes(t.section, t.win);
    t.io.created[0]!.report([t.all[1]!, t.all[0]!]);
    expect([t.order(t.all[0]!), t.order(t.all[1]!)]).toEqual(["0", "1"]);
    expect(t.stuck()).toEqual([true, true, false]);
  });

  test("a thread entering later starts again at 0, and each thread sticks only once", () => {
    const t = setup();
    stickNotes(t.section, t.win);
    const [observer] = t.io.created;
    observer!.report([t.all[0]!, t.all[1]!]);
    observer!.report([t.all[1]!, t.all[2]!]); // the second one again, and the third
    expect(t.order(t.all[1]!)).toBe("1");
    expect(t.order(t.all[2]!)).toBe("0");
    expect(observer!.disconnected).toBe(true); // all stuck
  });

  test("the notes stuck on a reply get steps 1, 2, 3… in a cascade, capped at 5", () => {
    const t = setup({ threads: 2 });
    const addFollowups = (thread: HTMLElement, n: number) => {
      const main = Object.assign(document.createElement("article"), { className: "reply" });
      const followups = Object.assign(document.createElement("div"), { className: "replies__followups" });
      for (let i = 0; i < n; i++) followups.append(Object.assign(document.createElement("article"), { className: "reply reply--followup" }));
      thread.append(main, followups);
      return { main, notes: [...followups.children] as HTMLElement[] };
    };
    const three = addFollowups(t.all[0]!, 3);
    const seven = addFollowups(t.all[1]!, 7);
    const step = (n: HTMLElement) => n.style.getPropertyValue("--note-stick-step");
    stickNotes(t.section, t.win);
    t.io.created[0]!.report(t.all);
    expect(step(three.main)).toBe(""); // the reply itself: step 0, the CSS default
    expect(three.notes.map(step)).toEqual(["1", "2", "3"]);
    expect(seven.notes.map(step)).toEqual(["1", "2", "3", "4", "5", "5", "5"]);
  });

  test("the stagger is capped at 4", () => {
    const t = setup({ threads: 7 });
    stickNotes(t.section, t.win);
    t.io.created[0]!.report(t.all);
    expect(t.all.map(t.order)).toEqual(["0", "1", "2", "3", "4", "4", "4"]);
  });

  test.each([
    ["resolves", (p: { resolve: () => void; reject: () => void }) => p.resolve()],
    ["rejects", (p: { resolve: () => void; reject: () => void }) => p.reject()],
  ])("nothing is observed until the turn %s, but the notes are hidden at once", async (_, settleTurn) => {
    const t = setup();
    let control!: { resolve: () => void; reject: () => void };
    const after = new Promise<void>((resolve, reject) => (control = { resolve, reject: () => reject(new Error("skipped")) }));
    stickNotes(t.section, t.win, after);
    expect(t.section.classList.contains("replies--sticking")).toBe(true);
    expect(t.io.created).toHaveLength(0);
    settleTurn(control);
    await settle();
    expect(t.io.created).toHaveLength(1);
  });

  test("stop() disconnects, and before the turn settles it means nothing is ever observed", async () => {
    const t = setup();
    stickNotes(t.section, t.win)();
    expect(t.io.created[0]!.disconnected).toBe(true);

    const u = setup();
    let resolve!: () => void;
    const stop = stickNotes(u.section, u.win, new Promise<void>((r) => (resolve = r)));
    stop();
    resolve();
    await settle();
    expect(u.io.created).toHaveLength(0);
  });

  test.each([
    ["without IntersectionObserver", { observer: false }],
    ["with reduced motion", { reducedMotion: true }],
  ])("%s, nothing is armed and the notes stay visible", (_, opts) => {
    const t = setup(opts);
    stickNotes(t.section, t.win)();
    expect(t.section.classList.contains("replies--sticking")).toBe(false);
    expect(t.io.created).toHaveLength(0);
  });
});
