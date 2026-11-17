import { describe, expect, test } from "vitest";
import { cacheKey, FULL_RELOAD_MS, loadLikes, type KeyValueStorage } from "../src/likes.ts";
import { json, mockFetch } from "./helpers.ts";

const DID = "did:plc:cuaderno";
const PDS = "https://pds.example";
const T0 = Date.parse("2026-11-16T12:00:00Z");
const HOUR = 3600_000;

/** Repositorio de likes simulado: lista de [rkey, uri del post, cid], del más reciente al más antiguo. */
function pds(initial: Array<[string, string, string]>) {
  let likes = [...initial];
  let down = false;
  const { fn, calls } = mockFetch((url) => {
    if (down) throw new TypeError("Failed to fetch");
    const start = Number(url.searchParams.get("cursor") ?? 0);
    const page = likes.slice(start, start + 2); // páginas de 2 para forzar paginación
    return json({
      records: page.map(([rkey, uri, cid]) => ({
        uri: `at://${DID}/app.bsky.feed.like/${rkey}`,
        value: { subject: { uri, cid }, createdAt: "" },
      })),
      cursor: String(start + 2), // como Eurosky: cursor también en la última página
    });
  });
  return {
    fn,
    calls,
    set: (l: Array<[string, string, string]>) => (likes = [...l]),
    down: (d: boolean) => (down = d),
  };
}

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const A: [string, string, string] = ["3aaa", "at://x/app.bsky.feed.post/a", "cidA"];
const B: [string, string, string] = ["3bbb", "at://x/app.bsky.feed.post/b", "cidB"];
const C: [string, string, string] = ["3ccc", "at://x/app.bsky.feed.post/c", "cidC"];
const D: [string, string, string] = ["3ddd", "at://x/app.bsky.feed.post/d", "cidD"];

const load = (p: ReturnType<typeof pds>, storage: KeyValueStorage | null, now: number) =>
  loadLikes({ did: DID, pdsUrl: PDS, fetchFn: p.fn, storage, now });
const has = (m: Map<string, Set<string>> | ReadonlyMap<string, ReadonlySet<string>>, l: [string, string, string]) =>
  m.get(l[1])?.has(l[2]) ?? false;

describe("loadLikes", () => {
  test("carga completa y guarda en caché", async () => {
    const p = pds([C, B, A]);
    const s = memoryStorage();
    const m = await load(p, s, T0);
    expect([has(m, A), has(m, B), has(m, C)]).toEqual([true, true, true]);
    expect(p.calls.map((c) => c.url.searchParams.get("collection"))).toEqual(Array(3).fill("app.bsky.feed.like"));
    expect(JSON.parse(s.data.get(cacheKey(DID))!).newest).toBe("3ccc");
  });

  test("un like nuevo aparece con carga incremental", async () => {
    const p = pds([C, B, A]);
    const s = memoryStorage();
    await load(p, s, T0);
    p.set([D, C, B, A]);
    p.calls.length = 0;
    const m = await load(p, s, T0 + HOUR);
    expect(has(m, D)).toBe(true);
    expect(has(m, A)).toBe(true);
    expect(p.calls).toHaveLength(1); // para al llegar a C, ya visto
  });

  test("un like retirado sigue hasta 24 h y desaparece después", async () => {
    const p = pds([C, B, A]);
    const s = memoryStorage();
    await load(p, s, T0);
    p.set([C, A]); // se quitó el like a B
    expect(has(await load(p, s, T0 + 23 * HOUR), B)).toBe(true);
    const later = await load(p, s, T0 + FULL_RELOAD_MS);
    expect(has(later, B)).toBe(false);
    expect(has(later, A)).toBe(true);
  });

  test("fallo de red con caché de menos de 24 h: usa la caché", async () => {
    const p = pds([B, A]);
    const s = memoryStorage();
    await load(p, s, T0);
    p.down(true);
    expect(has(await load(p, s, T0 + HOUR), A)).toBe(true);
  });

  test("fallo de red con caché de 24 h o más: mapa vacío", async () => {
    const p = pds([B, A]);
    const s = memoryStorage();
    await load(p, s, T0);
    p.down(true);
    expect((await load(p, s, T0 + FULL_RELOAD_MS + 1)).size).toBe(0);
  });

  test("fallo sin caché: mapa vacío", async () => {
    const p = pds([A]);
    p.down(true);
    expect((await load(p, memoryStorage(), T0)).size).toBe(0);
  });

  test("error HTTP sin caché: mapa vacío", async () => {
    const { fn } = mockFetch(() => json({ error: "InternalServerError" }, 500));
    expect((await loadLikes({ did: DID, pdsUrl: PDS, fetchFn: fn, storage: null, now: T0 })).size).toBe(0);
  });

  test("sin localStorage: carga completa en memoria cada vez", async () => {
    const p = pds([B, A]);
    expect(has(await load(p, null, T0), A)).toBe(true);
    expect(has(await load(p, null, T0 + HOUR), A)).toBe(true);
    expect(p.calls).toHaveLength(4);
  });

  test("localStorage que lanza al leer: como si no hubiera caché", async () => {
    const p = pds([A]);
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
      removeItem: () => {},
    };
    expect(has(await load(p, broken, T0), A)).toBe(true);
  });

  test("localStorage lleno: sigue en memoria y borra la entrada", async () => {
    const p = pds([B, A]);
    const s = memoryStorage();
    s.data.set(cacheKey(DID), "vieja");
    s.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    const m = await load(p, s, T0);
    expect(has(m, A)).toBe(true);
    expect(s.data.has(cacheKey(DID))).toBe(false);
  });

  test("caché corrupta: carga completa", async () => {
    const p = pds([A]);
    const s = memoryStorage();
    s.data.set(cacheKey(DID), JSON.stringify({ v: 1, likes: { x: "no-array" }, newest: null, fullAt: T0 }));
    expect(has(await load(p, s, T0), A)).toBe(true);
  });

  test("caché con fecha futura (reloj cambiado): carga completa", async () => {
    const p = pds([B, A]);
    const s = memoryStorage();
    await load(p, s, T0 + 10 * HOUR);
    p.set([A]);
    expect(has(await load(p, s, T0), B)).toBe(false);
  });

  test("dos cargas a la vez comparten una sola lectura del PDS", async () => {
    const p = pds([C, B, A]);
    const s = memoryStorage();
    const [m1, m2, m3] = await Promise.all([load(p, s, T0), load(p, s, T0), load(p, s, T0)]);
    expect(p.calls).toHaveLength(3); // lo mismo que una sola carga completa (ver el primer test)
    for (const m of [m1, m2, m3]) expect([has(m, A), has(m, B), has(m, C)]).toEqual([true, true, true]);
  });

  test("terminada una carga, la siguiente vuelve a leer", async () => {
    const p = pds([B, A]);
    const s = memoryStorage();
    await load(p, s, T0);
    const before = p.calls.length;
    p.set([C, B, A]);
    const m = await load(p, s, T0 + 1000);
    expect(p.calls.length).toBeGreaterThan(before);
    expect(has(m, C)).toBe(true);
  });

  test("con otro fetch no se comparte", async () => {
    const p1 = pds([A]);
    const p2 = pds([B]);
    const [m1, m2] = await Promise.all([load(p1, null, T0), load(p2, null, T0)]);
    expect([has(m1, A), has(m1, B)]).toEqual([true, false]);
    expect([has(m2, A), has(m2, B)]).toEqual([false, true]);
  });
});
