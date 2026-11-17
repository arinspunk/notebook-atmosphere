import { describe, expect, test } from "vitest";
import { getHiddenReplies, getPosts, getThread, BLUESKY_MODERATION_LABELER } from "../src/appview.ts";
import type { Config } from "../src/config.ts";
import pdsThreadgate from "./fixtures/pds-threadgate.json";
import threadBsky from "./fixtures/drawing-thread-bsky.json";
import { json, mockFetch } from "./helpers.ts";

const CONFIG: Config = {
  did: "did:plc:t3q3ylsnsser3o74xz42sdqk",
  pdsUrl: "https://pds.example",
  appviewUrl: "https://appview.example",
  lang: "gl",
  nombres: [],
};
const header = (init?: RequestInit) => new Headers(init?.headers).get("atproto-accept-labelers");

describe("getHiddenReplies", () => {
  test("lee hiddenReplies del PDS", async () => {
    const { fn, calls } = mockFetch(() => json(pdsThreadgate));
    const hidden = await getHiddenReplies(CONFIG, fn, "3n2hlsmfo5k2w");
    expect([...(hidden ?? [])]).toEqual(["at://did:plc:myufvpeutlocqv3tpnzsvwoe/app.bsky.feed.post/3n2hma6m3ak25"]);
    expect(calls[0]?.url.origin).toBe("https://pds.example");
    expect(calls[0]?.url.searchParams.get("collection")).toBe("app.bsky.feed.threadgate");
    expect(calls[0]?.url.searchParams.get("rkey")).toBe("3n2hlsmfo5k2w");
  });

  test("RecordNotFound (400, como Eurosky) da un conjunto vacío", async () => {
    const { fn } = mockFetch(() => json({ error: "RecordNotFound", message: "Could not locate record" }, 400));
    expect(await getHiddenReplies(CONFIG, fn, "x")).toEqual(new Set());
  });

  test("404 da un conjunto vacío", async () => {
    const { fn } = mockFetch(() => json({ error: "NotFound" }, 404));
    expect(await getHiddenReplies(CONFIG, fn, "x")).toEqual(new Set());
  });

  test("otro error da null (todas las ajenas pendientes)", async () => {
    for (const res of [json({ error: "InternalServerError" }, 500), json({ error: "InvalidRequest" }, 400)]) {
      const { fn } = mockFetch(() => res);
      expect(await getHiddenReplies(CONFIG, fn, "x")).toBeNull();
    }
    const down = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await getHiddenReplies(CONFIG, down, "x")).toBeNull();
  });
});

describe("cliente del AppView", () => {
  test("getPostThread envía la cabecera de labelers y los parámetros", async () => {
    const { fn, calls } = mockFetch(() => json(threadBsky));
    const t = await getThread(CONFIG, fn, "at://x/app.bsky.feed.post/y");
    expect(t.post?.uri).toContain("3n2hlsmfo5k2w");
    expect(header(calls[0]?.init)).toBe(BLUESKY_MODERATION_LABELER);
    expect(calls[0]?.url.searchParams.get("depth")).toBe("1000");
    expect(calls[0]?.url.searchParams.get("parentHeight")).toBe("0");
  });

  test("getPosts envía la cabecera de labelers", async () => {
    const { fn, calls } = mockFetch(() => json({ posts: [] }));
    await getPosts(CONFIG, fn, ["at://a"]);
    expect(header(calls[0]?.init)).toBe(BLUESKY_MODERATION_LABELER);
  });

  test("getPostThread sin thread lanza", async () => {
    const { fn } = mockFetch(() => json({}));
    await expect(getThread(CONFIG, fn, "at://x")).rejects.toThrow();
  });
});
