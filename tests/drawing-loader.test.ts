import { describe, expect, test } from "vitest";
import type { Config } from "../src/config.ts";
import { loadDrawing, memoDrawings, resolveContinuations } from "../src/drawing-loader.ts";
import type { LikeRecord, RepoRecord, ThreadNode } from "../src/lib/types.ts";
import type { ModerationInput } from "../src/moderation.ts";
import drawingBlacksky from "./fixtures/drawing-thread-blacksky.json";
import drawingBsky from "./fixtures/drawing-thread-bsky.json";
import pdsLikes from "./fixtures/pds-likes.json";
import pdsThreadgate from "./fixtures/pds-threadgate.json";
import realBlacksky from "./fixtures/real-thread-blacksky.json";
import realBsky from "./fixtures/real-thread-bsky.json";
import { json, mockFetch } from "./helpers.ts";

const DID = "did:plc:t3q3ylsnsser3o74xz42sdqk";
const XULIO = "did:plc:myufvpeutlocqv3tpnzsvwoe";
const CUT = `at://${DID}/app.bsky.feed.post/3mxuf5ysuns2m`; // donde Blacksky corta el hilo real
const PENDING_PARENT = `at://${XULIO}/app.bsky.feed.post/3mwtnl5guwc2v`; // con like en el fixture

const likeRecords = (pdsLikes as { records: RepoRecord<LikeRecord>[] }).records;
function likes(except: string[] = []) {
  const m = new Map<string, Set<string>>();
  for (const r of likeRecords) {
    const { uri, cid } = r.value.subject ?? {};
    if (uri && cid && !except.includes(uri)) m.set(uri, (m.get(uri) ?? new Set()).add(cid));
  }
  return m;
}
const clone = (src: unknown): ThreadNode => structuredClone((src as { thread: ThreadNode }).thread);

/** Subhilo de `uri` sacado del hilo completo de Bluesky, como lo devolvería getPostThread. */
function subthread(full: ThreadNode, uri: string): ThreadNode {
  const stack = [full];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.post?.uri === uri) return structuredClone(n);
    stack.push(...(n.replies ?? []));
  }
  throw new Error("no está");
}
const uris = (t: { replies: { post: { uri?: string }; replies: unknown[] }[] }): string[] => {
  const out: string[] = [];
  const walk = (rs: { post: { uri?: string }; replies: unknown[] }[]) =>
    rs.forEach((r) => {
      out.push(r.post.uri!);
      walk(r.replies as never);
    });
  walk(t.replies);
  return out;
};

describe("resolveContinuations", () => {
  const input = (over: Partial<ModerationInput> = {}): ModerationInput => ({ did: DID, likes: likes(), hidden: new Set(), ...over });

  test("recupera el hilo completo de Blacksky", async () => {
    const asked: string[] = [];
    const full = clone(realBsky);
    const result = await resolveContinuations(clone(realBlacksky), input(), async (u) => {
      asked.push(u);
      return subthread(full, u);
    });
    expect(asked).toEqual([CUT]);
    const expected = await resolveContinuations(clone(realBsky), input(), async () => {
      throw new Error("no debería pedir nada");
    });
    expect(uris(result)).toEqual(uris(expected));
    expect(uris(result)).toHaveLength(7);
    expect(result.truncated).toEqual([]);
  });

  test("no pide nada bajo una respuesta pendiente", async () => {
    const asked: string[] = [];
    await resolveContinuations(clone(realBlacksky), input({ likes: likes([PENDING_PARENT]) }), async (u) => {
      asked.push(u);
      return subthread(clone(realBsky), u);
    });
    expect(asked).toEqual([]);
  });

  test("un fallo deja la rama sin descendientes", async () => {
    const result = await resolveContinuations(clone(realBlacksky), input(), async () => {
      throw new Error("500");
    });
    expect(uris(result).at(-1)).toBe(CUT);
    expect(result.truncated).toEqual([]);
  });

  test("continuación que vuelve a llegar cortada se repite", async () => {
    // Cada continuación devuelve solo un nivel, cortado otra vez.
    const full = clone(realBsky);
    const asked: string[] = [];
    const result = await resolveContinuations(clone(realBlacksky), input(), async (u) => {
      asked.push(u);
      const sub = subthread(full, u);
      for (const r of sub.replies ?? []) delete r.replies;
      return sub;
    });
    expect(asked.length).toBe(3); // 3mxuf5y -> 3mxufa2 -> 3mxufez
    expect(uris(result)).toHaveLength(7);
  });
});

describe("loadDrawing", () => {
  const config = (appviewUrl: string): Config => ({ did: DID, pdsUrl: "https://pds.example", appviewUrl, lang: "gl", nombres: [] });

  function server(thread: unknown, opts: { likesDown?: boolean; threadgate?: Response } = {}) {
    return mockFetch((url) => {
      if (url.origin === "https://pds.example") {
        if (url.pathname.endsWith("getRecord")) return opts.threadgate ?? json(pdsThreadgate);
        if (opts.likesDown) return json({ error: "InternalServerError" }, 500);
        return json(url.searchParams.get("cursor") ? { records: [] } : pdsLikes);
      }
      if (url.pathname.endsWith("getPostThread")) {
        const root = (thread as { thread: ThreadNode }).thread;
        const u = url.searchParams.get("uri")!;
        return json({ thread: u === root.post?.uri ? root : subthread(clone(drawingBsky), u) });
      }
      return json({ error: "x" }, 400);
    });
  }
  const cardUris = (d: Awaited<ReturnType<typeof loadDrawing>>) =>
    d.state === "ok" ? d.cards.map((c) => [c.reply.uri?.split("/").pop(), c.followups.map((f) => f.uri?.split("/").pop())]) : d.state;

  for (const [name, fx] of [
    ["bsky", drawingBsky],
    ["blacksky", drawingBlacksky],
  ] as const) {
    test(`dibujo real (${name}): solo la rama aprobada, aplanada`, async () => {
      const { fn } = server(fx);
      const d = await loadDrawing({ config: config("https://appview.example"), fetchFn: fn, storage: null, rkey: "3n2hlsmfo5k2w" });
      expect(cardUris(d)).toEqual([["3n2hlyc7pv225", ["3n2hlzjt2l225", "3n2hm4byxe225", "3n2hm4uuazc2l"]]]);
    });
  }

  test("likes caídos: solo respuestas del cuaderno con padre visible (ninguna aquí)", async () => {
    const { fn } = server(drawingBsky, { likesDown: true });
    const d = await loadDrawing({ config: config("https://appview.example"), fetchFn: fn, storage: null, rkey: "3n2hlsmfo5k2w" });
    expect(cardUris(d)).toEqual([]);
  });

  test("threadgate no disponible: ninguna ajena se ve", async () => {
    const { fn } = server(drawingBsky, { threadgate: json({ error: "InternalServerError" }, 500) });
    const d = await loadDrawing({ config: config("https://appview.example"), fetchFn: fn, storage: null, rkey: "3n2hlsmfo5k2w" });
    expect(cardUris(d)).toEqual([]);
  });

  test("hilo, likes y threadgate se piden en paralelo", async () => {
    const { fn, calls } = server(drawingBsky);
    await loadDrawing({ config: config("https://appview.example"), fetchFn: fn, storage: null, rkey: "3n2hlsmfo5k2w" });
    expect(calls.slice(0, 3).map((c) => c.url.pathname.split(".").pop()).sort()).toEqual(["getPostThread", "getRecord", "listRecords"]);
  });

  test("hilo que falla: estado de error", async () => {
    const { fn } = mockFetch((url) => (url.pathname.endsWith("getPostThread") ? json({ error: "NotFound" }, 400) : json({ records: [] })));
    expect((await loadDrawing({ config: config("https://appview.example"), fetchFn: fn, storage: null, rkey: "x" })).state).toBe("error");
  });
});

describe("memoDrawings (2.1)", () => {
  const config: Config = { did: DID, pdsUrl: "https://pds.example", appviewUrl: "https://appview.example", lang: "gl", nombres: [] };
  const RKEY = "3n2hlsmfo5k2w";
  const T0 = Date.parse("2026-11-17T10:00:00Z");

  function setup(opts: { threadDown?: () => boolean } = {}) {
    const clock = { t: T0 };
    const { fn, calls } = mockFetch((url) => {
      if (url.origin === "https://pds.example") {
        if (url.pathname.endsWith("getRecord")) return json(pdsThreadgate);
        return json(url.searchParams.get("cursor") ? { records: [] } : pdsLikes);
      }
      if (opts.threadDown?.()) return json({ error: "x" }, 500);
      return json(drawingBsky);
    });
    const memo = memoDrawings({ config, fetchFn: fn, storage: null, now: () => clock.t });
    const threads = () => calls.filter((c) => c.url.pathname.endsWith("getPostThread")).length;
    return { memo, calls, clock, threads };
  }

  test("a los 59 s no hace peticiones; a los 60 s las repite", async () => {
    const { memo, calls, clock, threads } = setup();
    const first = await memo.load(RKEY);
    expect(first.state).toBe("ok");
    const n = calls.length;
    clock.t = T0 + 59_000;
    expect(await memo.load(RKEY)).toBe(first);
    expect(calls.length).toBe(n);
    clock.t = T0 + 60_000;
    const third = await memo.load(RKEY);
    expect(third).not.toBe(first);
    expect(threads()).toBe(2);
    expect(calls.length).toBe(2 * n);
  });

  test("dos llamadas simultáneas hacen una sola carga", async () => {
    const { memo, calls, threads } = setup();
    const [a, b] = await Promise.all([memo.load(RKEY), memo.load(RKEY)]);
    expect(a).toBe(b);
    expect(threads()).toBe(1);
    expect(calls.filter((c) => c.url.pathname.endsWith("getRecord"))).toHaveLength(1);
  });

  test("un hilo fallido no se guarda y el siguiente intento vuelve a pedir", async () => {
    let down = true;
    const { memo, threads } = setup({ threadDown: () => down });
    expect((await memo.load(RKEY)).state).toBe("error");
    down = false;
    expect((await memo.load(RKEY)).state).toBe("ok");
    expect(threads()).toBe(2);
  });

  test("un reloj que retrocede invalida la entrada", async () => {
    const { memo, clock, threads } = setup();
    await memo.load(RKEY);
    clock.t = T0 - 1;
    await memo.load(RKEY);
    expect(threads()).toBe(2);
  });

  test("clear() vacía la memoria", async () => {
    const { memo, threads } = setup();
    await memo.load(RKEY);
    memo.clear();
    await memo.load(RKEY);
    expect(threads()).toBe(2);
  });

  test("la edad se cuenta desde el lanzamiento, no desde que termina", async () => {
    const { memo, clock, threads } = setup();
    const p = memo.load(RKEY);
    clock.t = T0 + 30_000; // la carga termina tarde
    await p;
    clock.t = T0 + 60_000;
    await memo.load(RKEY);
    expect(threads()).toBe(2);
  });

  test("cada rkey tiene su entrada", async () => {
    const { memo, threads } = setup();
    await memo.load(RKEY);
    await memo.load("otro");
    await memo.load(RKEY);
    expect(threads()).toBe(2);
  });
});
