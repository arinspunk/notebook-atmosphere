import { describe, expect, test } from "vitest";
import { findDrawing, type Drawing } from "../src/catalog.ts";
import { loadCatalog, memoCatalog } from "../src/catalog-loader.ts";
import type { Config } from "../src/config.ts";
import { listAllRecords, XrpcError, xrpcUrl } from "../src/xrpc.ts";
import { json, mockFetch } from "./helpers.ts";

const CONFIG: Config = {
  did: "did:plc:cuaderno",
  pdsUrl: "https://pds.example/",
  appviewUrl: "https://appview.example",
  lang: "gl",
  nombres: [{ tag: "naia", nombre: "Naia" }],
};

const drawing = (rkey: string, createdAt: string) => ({
  uri: `at://did:plc:cuaderno/app.bsky.feed.post/${rkey}`,
  cid: `cid-${rkey}`,
  value: { text: "x", tags: ["caderno", "naia"], createdAt },
});

describe("xrpcUrl", () => {
  test("repite los arrays y omite undefined", () => {
    expect(xrpcUrl("https://a.example/", "app.bsky.feed.getPosts", { uris: ["at://1", "at://2"], x: undefined })).toBe(
      "https://a.example/xrpc/app.bsky.feed.getPosts?uris=at%3A%2F%2F1&uris=at%3A%2F%2F2",
    );
  });
});

describe("listAllRecords", () => {
  test("recorre todas las páginas y para con una página vacía aunque haya cursor", async () => {
    const pages: Record<string, unknown> = {
      "": { records: [drawing("c", "2026-03-03T00:00:00Z")], cursor: "p2" },
      p2: { records: [drawing("b", "2026-03-02T00:00:00Z")], cursor: "p3" },
      p3: { records: [], cursor: "p4" },
    };
    const { fn, calls } = mockFetch((url) => json(pages[url.searchParams.get("cursor") ?? ""]));
    const out = await listAllRecords(fn, "https://pds.example", "did:plc:cuaderno", "app.bsky.feed.post");
    expect(out.map((r) => r.uri.slice(-1))).toEqual(["c", "b"]);
    expect(calls).toHaveLength(3);
    expect(calls[0]?.url.pathname).toBe("/xrpc/com.atproto.repo.listRecords");
    expect(calls[0]?.url.searchParams.get("limit")).toBe("100");
    expect(calls[0]?.url.searchParams.get("collection")).toBe("app.bsky.feed.post");
  });

  test("para sin cursor", async () => {
    const { fn, calls } = mockFetch(() => json({ records: [drawing("a", "2026-01-01T00:00:00Z")] }));
    expect(await listAllRecords(fn, "https://pds.example", "d", "c")).toHaveLength(1);
    expect(calls).toHaveLength(1);
  });

  test("para con stop sin incluir ese record", async () => {
    const { fn } = mockFetch(() => json({ records: [drawing("c", ""), drawing("b", ""), drawing("a", "")], cursor: "x" }));
    const out = await listAllRecords(fn, "https://pds.example", "d", "c", (r) => r.uri.endsWith("/b"));
    expect(out.map((r) => r.uri.slice(-1))).toEqual(["c"]);
  });

  test("un error HTTP lanza XrpcError con status y error", async () => {
    const { fn } = mockFetch(() => json({ error: "RecordNotFound", message: "no" }, 400));
    await expect(listAllRecords(fn, "https://pds.example", "d", "c")).rejects.toMatchObject({
      status: 400,
      error: "RecordNotFound",
    });
  });

  test("un fallo de red lanza XrpcError con status 0", async () => {
    const fn = async () => {
      throw new TypeError("Failed to fetch");
    };
    const err = await listAllRecords(fn, "https://pds.example", "d", "c").catch((e) => e);
    expect(err).toBeInstanceOf(XrpcError);
    expect(err.status).toBe(0);
  });
});

describe("loadCatalog", () => {
  test("todas las páginas al catálogo ordenado", async () => {
    const { fn } = mockFetch((url) =>
      url.searchParams.get("cursor")
        ? json({ records: [drawing("a", "2026-03-01T00:00:00Z")] })
        : json({ records: [drawing("b", "2026-03-02T00:00:00Z"), { uri: "at://x/app.bsky.feed.post/n", value: { text: "no" } }], cursor: "p2" }),
    );
    const s = await loadCatalog(CONFIG, fn);
    expect(s.state).toBe("ok");
    if (s.state === "ok") expect(s.drawings.map((d) => [d.rkey, d.nombre])).toEqual([["b", "Naia"], ["a", "Naia"]]);
  });

  test("un error devuelve estado de error", async () => {
    const { fn } = mockFetch(() => json({ error: "InternalServerError" }, 500));
    expect((await loadCatalog(CONFIG, fn)).state).toBe("error");
  });

  test("memoCatalog carga una vez y reintenta tras un error", async () => {
    let fail = true;
    const { fn, calls } = mockFetch(() => (fail ? json({}, 500) : json({ records: [] })));
    const get = memoCatalog(CONFIG, fn);
    expect((await get()).state).toBe("error");
    fail = false;
    expect((await get()).state).toBe("ok");
    await get();
    expect(calls).toHaveLength(2);
  });
});

test("memoCatalog.reset descarta el catálogo y una carga en curso", async () => {
  const { fn, calls } = mockFetch(() => json({ records: [drawing("a", "2026-03-01T00:00:00Z")] }));
  const get = memoCatalog(CONFIG, fn);
  expect(get.peek()).toBeNull();
  await get();
  expect(get.peek()).toHaveLength(1);
  get.reset();
  expect(get.peek()).toBeNull();
  const inFlight = get();
  get.reset();
  await inFlight;
  expect(get.peek()).toBeNull(); // la carga descartada no se guarda
  await get();
  expect(calls).toHaveLength(3);
  expect(get.peek()).toHaveLength(1);
});

describe("findDrawing", () => {
  const cat = ["c", "b", "a"].map((rkey) => ({ rkey }) as Drawing);
  test("intermedio: anterior y siguiente", () => {
    const n = findDrawing(cat, "b");
    expect([n.current?.rkey, n.older?.rkey, n.newer?.rkey]).toEqual(["b", "a", "c"]);
  });
  test("el más reciente: solo anterior", () => {
    const n = findDrawing(cat, "c");
    expect([n.older?.rkey, n.newer]).toEqual(["b", null]);
  });
  test("el más antiguo: solo siguiente", () => {
    const n = findDrawing(cat, "a");
    expect([n.older, n.newer?.rkey]).toEqual([null, "b"]);
  });
  test("rkey inexistente", () => {
    expect(findDrawing(cat, "zz")).toEqual({ current: null, older: null, newer: null });
    expect(findDrawing([], "a").current).toBeNull();
  });
});
