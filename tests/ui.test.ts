// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";

window.scrollTo = () => {}; // jsdom no lo implementa
import { startApp } from "../src/app.ts";
import { buildCatalog, findDrawing, type Drawing } from "../src/catalog.ts";
import type { Config } from "../src/config.ts";
import { loadDrawing } from "../src/drawing-loader.ts";
import { createI18n } from "../src/lib/i18n.ts";
import type { PostRecord, PostView, RepoRecord } from "../src/lib/types.ts";
import { parseRoute } from "../src/router.ts";
import { renderDrawing, renderDrawingShell } from "../src/ui/drawing-view.ts";
import { renderTime } from "../src/ui/dom.ts";
import indexHtml from "../index.html?raw";
import { loadThumbnails, renderIndex } from "../src/ui/index-view.ts";
import drawingBsky from "./fixtures/drawing-thread-bsky.json";
import drawingPosts from "./fixtures/drawing-posts-bsky.json";
import pdsLikes from "./fixtures/pds-likes.json";
import pdsPosts from "./fixtures/pds-posts.json";
import pdsThreadgate from "./fixtures/pds-threadgate.json";
import { json, mockFetch } from "./helpers.ts";
import type { FetchFn } from "../src/xrpc.ts";

const DID = "did:plc:t3q3ylsnsser3o74xz42sdqk";
const CONFIG: Config = {
  did: DID,
  pdsUrl: "https://pds.example",
  appviewUrl: "https://appview.example",
  lang: "gl",
  nombres: [
    { tag: "naia", nombre: "Naia" },
    { tag: "leon", nombre: "León" },
  ],
};
const i18n = createI18n("gl");
const NOW = Date.parse("2026-11-18T23:00:00Z");
const catalog = buildCatalog((pdsPosts as { records: RepoRecord<PostRecord>[] }).records, CONFIG.nombres);
const NAIA = catalog.find((d) => d.rkey === "3n2hlsmfo5k2w")!;
const rootPost = (): PostView => structuredClone((drawingBsky as { thread: { post: PostView } }).thread.post);

/** Servidor simulado con los fixtures reales. */
function server(over: { catalog?: () => Response; thread?: () => Response } = {}) {
  return mockFetch((url) => {
    if (url.origin === "https://pds.example") {
      if (url.pathname.endsWith("getRecord")) return json(pdsThreadgate);
      const c = url.searchParams.get("collection");
      if (url.searchParams.get("cursor")) return json({ records: [] });
      if (c === "app.bsky.feed.post") return over.catalog?.() ?? json(pdsPosts);
      return json(pdsLikes);
    }
    if (url.pathname.endsWith("getPostThread")) {
      if (over.thread) return over.thread();
      const u = url.searchParams.get("uri");
      const t = structuredClone((drawingBsky as { thread: { post: PostView; replies: unknown[] } }).thread);
      if (u !== t.post.uri) {
        // Otro dibujo: mismo hilo con la URI cambiada y sin respuestas.
        t.post.uri = u!;
        t.replies = [];
      }
      return json({ thread: t });
    }
    if (url.pathname.endsWith("getPosts")) return json(drawingPosts);
    return json({ error: "x" }, 400);
  });
}

describe("parseRoute", () => {
  test("rutas", () => {
    expect(parseRoute("")).toEqual({ name: "home" });
    expect(parseRoute("#/")).toEqual({ name: "home" });
    expect(parseRoute("#/d/3n2hlsmfo5k2w")).toEqual({ name: "drawing", rkey: "3n2hlsmfo5k2w" });
    expect(parseRoute("#/indice")).toEqual({ name: "index" });
    expect(parseRoute("#/indice/")).toEqual({ name: "index" });
    expect(parseRoute("#/outra")).toEqual({ name: "home" });
    expect(parseRoute("#/d/a%2Fb")).toEqual({ name: "drawing", rkey: "" });
  });
});

describe("startApp (6.1)", () => {
  let stop: (() => void) | undefined;
  afterEach(() => {
    stop?.();
    location.hash = "";
  });
  async function open(hash: string, fetchFn = server().fn) {
    location.hash = hash;
    const root = document.createElement("main");
    const app = startApp(root, { config: CONFIG, fetchFn, storage: null, now: () => NOW });
    stop = app.stop;
    const done = app.render();
    const loading = root.textContent;
    await done;
    return { root, loading, app };
  }

  test("home: el dibujo más reciente, con estado de carga antes", async () => {
    const { root, loading } = await open("#/");
    expect(loading).toBe("A carregar…");
    expect(root.querySelector(".post__byline strong")?.textContent).toBe("León");
  });

  test("#/d/<rkey>: ese dibujo (recargar mantiene el dibujo)", async () => {
    for (let i = 0; i < 2; i++) {
      const { root } = await open("#/d/3n2hlsmfo5k2w");
      expect(root.querySelector(".post__byline strong")?.textContent).toBe("Naia");
      expect(root.querySelectorAll(".replies__thread")).toHaveLength(1);
    }
  });

  test("#/indice: todos los dibujos", async () => {
    const { root } = await open("#/indice");
    expect([...root.querySelectorAll("li strong")].map((e) => e.textContent)).toEqual(["León", "Naia"]);
  });

  test("dibujo no encontrado, con enlace al índice", async () => {
    const { root } = await open("#/d/3mwso7oovnp2u"); // existe pero no es dibujo
    expect(root.textContent).toContain("Este desenho não existe.");
    expect(root.querySelector("a")?.getAttribute("href")).toBe("#/indice");
  });

  test("error al cargar el catálogo", async () => {
    const { root } = await open("#/", server({ catalog: () => json({ error: "x" }, 500) }).fn);
    expect(root.textContent).toBe("Não foi possível carregar o caderno.");
  });

  test("error al cargar el hilo", async () => {
    const { root } = await open("#/", server({ thread: () => json({ error: "x" }, 500) }).fn);
    expect(root.textContent).toContain("Não foi possível carregar este desenho.");
  });

  test("cuaderno vacío", async () => {
    const { root } = await open("#/", server({ catalog: () => json({ records: [] }) }).fn);
    expect(root.textContent).toBe("O caderno ainda está vazio.");
  });

  test("navegar con el hash", async () => {
    const { root, app } = await open("#/");
    root.querySelector<HTMLAnchorElement>("a[rel=prev]")!.click();
    location.hash = "#/d/3n2hlsmfo5k2w";
    await app.render();
    expect(root.querySelector(".post__byline strong")?.textContent).toBe("Naia");
  });
});

/** `server()` cuyos hilos esperan a `release(rkey)` mientras `slow` está activo. */
function slowServer(over: Parameters<typeof server>[0] = {}) {
  const base = server(over);
  const gates = new Map<string, Array<() => void>>();
  const state = { slow: false, only: null as string | null, fail: new Set<string>() };
  const calls: Array<{ url: URL }> = [];
  const fn: FetchFn = async (input, init) => {
    const url = new URL(input);
    calls.push({ url });
    const rkey = url.searchParams.get("uri")?.split("/").pop() ?? "";
    if (url.pathname.endsWith("getPostThread") && state.fail.has(rkey)) return json({ error: "x" }, 500);
    if (state.slow && url.pathname.endsWith("getPostThread") && (!state.only || state.only === rkey)) {
      await new Promise<void>((r) => gates.set(rkey, [...(gates.get(rkey) ?? []), r]));
    }
    return base.fn(input, init);
  };
  const release = async (rkey: string) => {
    await vi.waitFor(() => expect(gates.has(rkey)).toBe(true));
    gates.get(rkey)!.forEach((r) => r());
    gates.delete(rkey);
  };
  return { fn, calls, state, release };
}

/** Ventana simulada: `go` cambia el hash y avisa a la app al momento (sin los `hashchange` asíncronos de jsdom). */
function fakeWindow(hash = "#/") {
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible" as DocumentVisibilityState });
  const win = Object.assign(new EventTarget(), { location: { hash }, document: doc, scrollTo: () => {} });
  return {
    win: win as unknown as Window,
    doc,
    go(next: string) {
      win.location.hash = next;
      win.dispatchEvent(new Event("hashchange"));
    },
  };
}

const LEON = "3n2hlw4u4k22y";

describe("navegar entre dibujos (1.2)", () => {
  let stop: (() => void) | undefined;
  afterEach(() => stop?.());
  async function start(fetchFn: FetchFn) {
    const w = fakeWindow("#/indice"); // desde el índice no se precarga nada
    const root = document.createElement("main");
    const app = startApp(root, { config: CONFIG, fetchFn, storage: null, now: () => NOW }, w.win);
    stop = app.stop;
    await app.render();
    return { root, go: w.go };
  }

  test("lo del catálogo sale al momento, sin A carregar…, y lo de la red después", async () => {
    const srv = slowServer();
    const { root, go } = await start(srv.fn);
    srv.state.slow = true;
    go(`#/d/${NAIA.rkey}`);
    expect(root.textContent).not.toContain("A carregar…");
    expect(root.querySelector(".post__byline strong")?.textContent).toBe("Naia");
    expect(root.querySelector(".post__text")?.textContent).toBe("Prova de desenho");
    expect(root.querySelector<HTMLElement>("figure")?.style.aspectRatio).toBe("1840 / 1380");
    expect(root.querySelector("figure img")).toBeNull();
    expect(root.querySelector(".replies__thread")).toBeNull();
    await srv.release(NAIA.rkey);
    await vi.waitFor(() => expect(root.querySelectorAll(".replies__thread")).toHaveLength(1));
    expect(root.querySelector("figure img")).not.toBeNull();
  });

  test("dos cambios seguidos: solo se rellena el último dibujo", async () => {
    const srv = slowServer();
    const { root, go } = await start(srv.fn);
    srv.state.slow = true;
    go(`#/d/${NAIA.rkey}`);
    const naia = root.firstElementChild!;
    go(`#/d/${LEON}`);
    expect(root.querySelector(".post__byline strong")?.textContent).toBe("León");
    await srv.release(LEON);
    await vi.waitFor(() => expect(root.querySelector("figure img")).not.toBeNull());
    await srv.release(NAIA.rkey); // el relleno tardío del primero
    await new Promise((r) => setTimeout(r, 20));
    expect(naia.querySelector("img")).toBeNull();
    expect(naia.querySelector(".replies__thread")).toBeNull();
    expect(root.querySelector(".post__byline strong")?.textContent).toBe("León");
    expect(root.querySelectorAll("figure")).toHaveLength(1);
    expect(root.querySelector(".replies__thread")).toBeNull(); // el hilo de León no tiene respuestas
  });

  test("con el hilo fallido se quedan el texto y las flechas", async () => {
    let fail = false;
    const base = server();
    const fn: FetchFn = (input, init) =>
      fail && new URL(input).pathname.endsWith("getPostThread") ? Promise.resolve(json({ error: "x" }, 500)) : base.fn(input, init);
    const { root, go } = await start(fn);
    fail = true;
    go(`#/d/${NAIA.rkey}`);
    await vi.waitFor(() => expect(root.textContent).toContain("Não foi possível carregar este desenho."));
    expect(root.querySelector(".post__byline strong")?.textContent).toBe("Naia");
    expect(root.querySelector("nav a[rel=next]")).not.toBeNull();
  });
});

describe("precarga de vecinos (2.2)", () => {
  const VELLO = "3n2aaaaaaaaaa";
  /** Catálogo con un tercer dibujo, más antiguo que Naia: Naia queda en medio. */
  const threeDrawings = () => {
    const posts = structuredClone(pdsPosts) as { records: RepoRecord<PostRecord>[] };
    const naia = posts.records.find((r) => r.uri.endsWith(NAIA.rkey))!;
    posts.records.push({ ...structuredClone(naia), uri: naia.uri.replace(NAIA.rkey, VELLO), value: { ...naia.value, createdAt: "2026-01-01T00:00:00Z" } });
    return json(posts);
  };
  let stop: (() => void) | undefined;
  afterEach(() => stop?.());

  async function start(hash: string) {
    const srv = slowServer({ catalog: threeDrawings });
    const clock = { t: NOW };
    const preloaded: string[] = [];
    const w = fakeWindow(hash);
    const root = document.createElement("main");
    const app = startApp(root, { config: CONFIG, fetchFn: srv.fn, storage: null, now: () => clock.t, preloadImage: (src) => preloaded.push(src) }, w.win);
    stop = app.stop;
    const threads = (rkey: string) => srv.calls.filter((c) => c.url.pathname.endsWith("getPostThread") && c.url.searchParams.get("uri")?.endsWith(rkey)).length;
    const settle = () => new Promise((r) => setTimeout(r, 10));
    return { srv, clock, preloaded, root, go: w.go, render: app.render, threads, settle };
  }

  test("tras pintar un dibujo intermedio se piden sus dos vecinos y su imagen", async () => {
    const t = await start(`#/d/${NAIA.rkey}`);
    await t.render();
    await vi.waitFor(() => expect(t.preloaded).toHaveLength(2));
    expect([t.threads(LEON), t.threads(VELLO)]).toEqual([1, 1]);
    expect(t.preloaded[0]).toMatch(/^https:\/\/cdn\.bsky\.app\//);
  });

  test("al navegar a un vecino preparado se pinta completo sin peticiones nuevas", async () => {
    const t = await start(`#/d/${NAIA.rkey}`);
    await t.render();
    await vi.waitFor(() => expect(t.preloaded).toHaveLength(2));
    const n = t.srv.calls.length;
    t.go(`#/d/${VELLO}`);
    await t.settle();
    expect(t.root.querySelector("figure img")).not.toBeNull();
    expect(t.root.textContent).not.toContain("A carregar…");
    expect(t.srv.calls.length).toBe(n); // Vello y su vecino Naia ya estaban preparados
  });

  test("desde el índice no se precarga nada", async () => {
    const t = await start("#/indice");
    await t.render();
    await t.settle();
    expect(t.srv.calls.filter((c) => c.url.pathname.endsWith("getPostThread"))).toHaveLength(0);
  });

  test("un clic en mitad de la precarga reutiliza la carga en curso", async () => {
    const t = await start(`#/d/${NAIA.rkey}`);
    t.srv.state.slow = true;
    t.srv.state.only = LEON;
    await t.render();
    await vi.waitFor(() => expect(t.threads(LEON)).toBe(1));
    t.go(`#/d/${LEON}`);
    expect(t.root.querySelector(".post__byline strong")?.textContent).toBe("León");
    await t.srv.release(LEON);
    await vi.waitFor(() => expect(t.root.querySelector("figure img")).not.toBeNull());
    expect(t.threads(LEON)).toBe(1);
  });

  test("un fallo de precarga no muestra nada y el clic vuelve a pedir", async () => {
    const t = await start(`#/d/${NAIA.rkey}`);
    t.srv.state.fail.add(LEON);
    await t.render();
    await vi.waitFor(() => expect(t.preloaded).toHaveLength(1)); // solo la de Vello
    await t.settle();
    expect(t.threads(LEON)).toBe(1);
    expect(t.root.textContent).not.toContain("Não foi possível");
    expect(t.root.querySelectorAll(".replies__thread")).toHaveLength(1); // Naia sigue intacta
    t.srv.state.fail.clear();
    t.go(`#/d/${LEON}`);
    await vi.waitFor(() => expect(t.root.querySelector("figure img")).not.toBeNull());
    expect(t.threads(LEON)).toBe(2);
  });

  test("con el reloj a +2 min, el clic vuelve a pedir", async () => {
    const t = await start(`#/d/${NAIA.rkey}`);
    await t.render();
    await vi.waitFor(() => expect(t.preloaded).toHaveLength(2));
    t.clock.t += 2 * 60_000;
    t.go(`#/d/${LEON}`);
    expect(t.root.querySelector("figure img")).toBeNull(); // espera a la red
    await vi.waitFor(() => expect(t.root.querySelector("figure img")).not.toBeNull());
    expect(t.threads(LEON)).toBe(2);
  });
});

describe("vuelta del segundo plano (3.1)", () => {
  const replyUri = (drawingBsky as { thread: { replies: { post: { uri: string; record: { text: string } } }[] } }).thread.replies.find(
    (r) => r.post.record.text === "chulo!",
  )!.post.uri;
  let stop: (() => void) | undefined;
  afterEach(() => stop?.());

  async function start() {
    const srv = slowServer();
    const state = { hide: false };
    const fn: FetchFn = (input, init) => {
      const url = new URL(input);
      if (state.hide && url.pathname.endsWith("getRecord")) {
        const gate = structuredClone(pdsThreadgate) as { value: { hiddenReplies: string[] } };
        gate.value.hiddenReplies.push(replyUri);
        return Promise.resolve(json(gate));
      }
      return srv.fn(input, init);
    };
    const clock = { t: NOW };
    const w = fakeWindow(`#/d/${NAIA.rkey}`);
    const root = document.createElement("main");
    const app = startApp(root, { config: CONFIG, fetchFn: fn, storage: null, now: () => clock.t, preloadImage: () => {} }, w.win);
    stop = app.stop;
    await app.render();
    await new Promise((r) => setTimeout(r, 10)); // termina la precarga
    const count = (pred: (u: URL) => boolean) => srv.calls.filter((c) => pred(c.url)).length;
    const catalogCalls = () => count((u) => u.searchParams.get("collection") === "app.bsky.feed.post" && !u.searchParams.has("cursor"));
    const threadCalls = () => count((u) => u.pathname.endsWith("getPostThread") && u.searchParams.get("uri")!.endsWith(NAIA.rkey));
    const visibility = (v: DocumentVisibilityState) => {
      w.doc.visibilityState = v;
      w.doc.dispatchEvent(new Event("visibilitychange"));
    };
    const pageEvent = (type: string, persisted: boolean) => w.win.dispatchEvent(Object.assign(new Event(type), { persisted }));
    return { srv, state, clock, root, visibility, pageEvent, calls: () => srv.calls.length, catalogCalls, threadCalls };
  }

  test("oculta 11 min y vuelve: se vuelven a pedir el catálogo y el dibujo, y la respuesta ocultada no se ve", async () => {
    const t = await start();
    expect(t.root.querySelectorAll(".replies__thread")).toHaveLength(1);
    expect([t.catalogCalls(), t.threadCalls()]).toEqual([1, 1]);
    t.visibility("hidden");
    t.state.hide = true; // el cuaderno oculta la respuesta entretanto
    t.clock.t += 11 * 60_000;
    t.visibility("visible");
    expect(t.root.textContent).toBe("A carregar…");
    await vi.waitFor(() => expect(t.root.querySelector("figure img")).not.toBeNull());
    expect([t.catalogCalls(), t.threadCalls()]).toEqual([2, 2]);
    expect(t.root.querySelector(".replies__thread")).toBeNull();
    expect(t.root.textContent).not.toContain("chulo!");
  });

  test("oculta 2 min y vuelve: no hay peticiones", async () => {
    const t = await start();
    const n = t.calls();
    t.visibility("hidden");
    t.clock.t += 2 * 60_000;
    t.visibility("visible");
    await new Promise((r) => setTimeout(r, 10));
    expect(t.calls()).toBe(n);
    expect(t.root.querySelectorAll(".replies__thread")).toHaveLength(1);
  });

  test("pageshow con persisted tras 11 min hace lo mismo", async () => {
    const t = await start();
    t.pageEvent("pagehide", true);
    t.clock.t += 11 * 60_000;
    t.pageEvent("pageshow", true);
    expect(t.root.textContent).toBe("A carregar…");
    await vi.waitFor(() => expect(t.root.querySelector("figure img")).not.toBeNull());
    expect([t.catalogCalls(), t.threadCalls()]).toEqual([2, 2]);
  });

  test("pageshow sin persisted no recarga", async () => {
    const t = await start();
    const n = t.calls();
    t.pageEvent("pagehide", false);
    t.clock.t += 11 * 60_000;
    t.pageEvent("pageshow", false);
    await new Promise((r) => setTimeout(r, 10));
    expect(t.calls()).toBe(n);
  });

  test("si llegan los dos eventos, solo se carga una vez", async () => {
    const t = await start();
    t.pageEvent("pagehide", true);
    t.visibility("hidden");
    t.clock.t += 11 * 60_000;
    t.pageEvent("pageshow", true);
    t.visibility("visible");
    await vi.waitFor(() => expect(t.root.querySelector("figure img")).not.toBeNull());
    await new Promise((r) => setTimeout(r, 10));
    expect([t.catalogCalls(), t.threadCalls()]).toEqual([2, 2]);
  });
});

describe("renderDrawing (6.2)", () => {
  const render = (post: PostView, drawing: Drawing = NAIA, cards = [] as never[]) =>
    renderDrawing({ drawing, post, neighbours: findDrawing(catalog, drawing.rkey), cards, config: CONFIG, i18n, now: NOW });

  test("dibujo real: imagen con alt y proporción, texto limpio, nombre y fecha", () => {
    const el = render(rootPost());
    const img = el.querySelector("img")!;
    expect(img.alt).toBe("umha chispa de auto-colantes desenhados a mao");
    expect(img.getAttribute("width")).toBeTruthy();
    expect(img.style.aspectRatio).toMatch(/^\d+ \/ \d+$/);
    expect(el.querySelector(".post__text")?.textContent).toBe("Prova de desenho");
    expect(el.querySelector(".post__byline strong")?.textContent).toBe("Naia");
    const time = el.querySelector("time")!;
    expect(time.textContent).toBe("há 2 d");
    expect(time.getAttribute("datetime")).toBe(new Date(NAIA.record.createdAt!).toISOString());
    expect(time.title).toMatch(/\d\d\/\d\d\/\d\d/);
  });

  test("un texto con <script> se muestra literal", () => {
    const evil: Drawing = { ...NAIA, record: { ...NAIA.record, text: '<script>alert(1)</script><img src=x onerror=alert(1)> #caderno', facets: [] } };
    const el = render(rootPost(), evil);
    expect(el.querySelector("script")).toBeNull();
    expect(el.querySelectorAll("img")).toHaveLength(1);
    expect(el.querySelector(".post__text")?.textContent).toContain("<script>alert(1)</script>");
  });

  test("con 0 likes y 0 compartidos no hay contadores; sin replyCount", () => {
    const post = { ...rootPost(), likeCount: 0, repostCount: 0, quoteCount: 0, replyCount: 5 };
    const el = render(post);
    expect(el.querySelector(".post__stat--likes")).toBeNull();
    expect(el.querySelector(".post__stat--shares")).toBeNull();
    expect(el.textContent).not.toContain("5");
  });

  test("contadores con plural", () => {
    expect(render({ ...rootPost(), likeCount: 1 }).querySelector(".post__stat--likes")?.textContent).toBe("Fiz feliz a 1 amiga");
    expect(render({ ...rootPost(), likeCount: 20 }).querySelector(".post__stat--likes")?.textContent).toBe("Fiz feliz a 20 amigas");
    expect(render({ ...rootPost(), repostCount: 3, quoteCount: 1 }).querySelector(".post__stat--shares")?.textContent).toBe("Partilhado 4 vezes");
  });

  test("solo la primera de varias imágenes; también en recordWithMedia", () => {
    const leon = catalog.find((d) => d.rkey === "3n2hlw4u4k22y")!;
    const post = (drawingPosts as { posts: PostView[] }).posts.find((p) => p.uri?.endsWith("3n2hlw4u4k22y"))!;
    const el = render(post, leon);
    expect(el.querySelectorAll("img")).toHaveLength(1);
    expect(el.querySelector("img")?.alt).toBe("arte");
    const rwm = { ...post, embed: { $type: "app.bsky.embed.recordWithMedia#view", media: post.embed } };
    expect(render(rwm as PostView, leon).querySelector("img")?.alt).toBe("arte");
  });

  test("imagen sin alt y post sin imagen", () => {
    const p = rootPost();
    p.embed!.images![0]!.alt = "";
    expect(render(p).querySelector("img")?.getAttribute("alt")).toBe("");
    expect(render({ ...rootPost(), embed: undefined }).querySelector("img")).toBeNull();
  });

  test("la navegación tiene nombre accesible del diccionario", () => {
    expect(render(rootPost()).querySelector("nav")?.getAttribute("aria-label")).toBe("Navegação entre desenhos");
  });

  test("texto en varias líneas y enlace en el texto del dibujo", () => {
    const text = "Na praia\nco avó https://example.org #caderno";
    const enc = new TextEncoder();
    const r = (part: string) => {
      const byteStart = enc.encode(text.slice(0, text.indexOf(part))).length;
      return { byteStart, byteEnd: byteStart + enc.encode(part).length };
    };
    const d: Drawing = {
      ...NAIA,
      record: {
        ...NAIA.record,
        text,
        facets: [
          { index: r("https://example.org"), features: [{ $type: "app.bsky.richtext.facet#link", uri: "https://example.org" }] },
          { index: r("#caderno"), features: [{ $type: "app.bsky.richtext.facet#tag", tag: "caderno" }] },
        ],
      },
    };
    const p = render(rootPost(), d).querySelector(".post__text")!;
    expect(p.textContent).toBe("Na praia\nco avó https://example.org");
    expect(p.querySelector("a")?.getAttribute("href")).toBe("https://example.org");
  });

  test("enlaces anterior y siguiente según el catálogo", () => {
    const el = render(rootPost()); // Naia es el más antiguo
    expect(el.querySelector("a[rel=prev]")).toBeNull();
    expect(el.querySelector("a[rel=next]")?.getAttribute("href")).toBe("#/d/3n2hlw4u4k22y");
    expect(el.querySelector('a[href="#/indice"]')).not.toBeNull();
  });
});

describe("pintado en dos fases (1.1)", () => {
  const shell = (drawing: Drawing = NAIA) => renderDrawingShell({ drawing, neighbours: findDrawing(catalog, drawing.rkey), config: CONFIG, i18n, now: NOW });

  test("el hueco tiene la proporción del record antes de tener la imagen", () => {
    const s = shell();
    const fig = s.element.querySelector("figure")!;
    expect(fig.style.aspectRatio).toBe("1840 / 1380");
    expect(fig.querySelector("img")).toBeNull();
    expect(s.element.firstElementChild).toBe(fig); // el texto va debajo y no se desplaza
    expect(s.element.querySelector(".post__text")?.textContent).toBe("Prova de desenho");
    expect(s.element.querySelector(".post__byline strong")?.textContent).toBe("Naia");
    expect(s.element.querySelector("nav a[rel=next]")).not.toBeNull();
  });

  test("también con recordWithMedia", () => {
    const media = NAIA.record.embed;
    const d: Drawing = { ...NAIA, record: { ...NAIA.record, embed: { $type: "app.bsky.embed.recordWithMedia", record: {}, media } } };
    expect(shell(d).element.querySelector<HTMLElement>("figure")?.style.aspectRatio).toBe("1840 / 1380");
  });

  test("un record sin aspectRatio no reserva hueco y no da errores", () => {
    const embed = structuredClone(NAIA.record.embed) as { images: { aspectRatio?: unknown }[] };
    delete embed.images[0]!.aspectRatio;
    for (const e of [embed, undefined, { $type: "app.bsky.embed.images", images: [{ aspectRatio: { width: 0, height: "x" } }] }]) {
      const s = shell({ ...NAIA, record: { ...NAIA.record, embed: e } });
      expect(s.element.querySelector("figure")).toBeNull();
      s.fill(rootPost(), []);
      expect(s.element.querySelector("figure img")?.getAttribute("alt")).toBe("umha chispa de auto-colantes desenhados a mao");
      expect(s.element.firstElementChild?.tagName).toBe("FIGURE");
    }
  });

  test("al rellenar, la imagen ocupa el mismo hueco, con contadores y tarjetas", () => {
    const s = shell();
    const fig = s.element.querySelector("figure")!;
    const reply: PostView = { uri: "at://x/app.bsky.feed.post/r", author: { did: "did:plc:outra", handle: "luzia.bsky.social" }, record: { text: "chulo!" } };
    s.fill({ ...rootPost(), likeCount: 2 }, [{ reply, followups: [] }]);
    expect(s.element.querySelectorAll("figure")).toHaveLength(1);
    expect(s.element.querySelector("figure")).toBe(fig);
    expect(fig.querySelector("img")?.alt).toBe("umha chispa de auto-colantes desenhados a mao");
    expect([...s.element.children].map((c) => c.classList[0])).toEqual(["post__media", "post__text", "post__byline", "post__stat", "pager", "replies"]);
  });

  test("post del AppView sin imagen: se quita el hueco", () => {
    const s = shell();
    s.fill({ ...rootPost(), embed: undefined }, []);
    expect(s.element.querySelector("figure")).toBeNull();
  });

  test("con el hilo fallido se ven el texto, las flechas y el mensaje de error", () => {
    const s = shell();
    s.fail();
    expect(s.element.querySelector("figure")).toBeNull();
    expect(s.element.firstElementChild?.textContent).toBe("Não foi possível carregar este desenho.");
    expect(s.element.querySelector(".post__text")?.textContent).toBe("Prova de desenho");
    expect(s.element.querySelector(".post__byline strong")?.textContent).toBe("Naia");
    expect(s.element.querySelector("nav a[rel=next]")).not.toBeNull();
    expect(s.element.querySelector('nav a[href="#/indice"]')).not.toBeNull();
  });
});

describe("tarjetas (6.3)", () => {
  async function cardsEl() {
    const { fn } = server();
    const data = await loadDrawing({ config: CONFIG, fetchFn: fn, storage: null, rkey: NAIA.rkey, now: NOW });
    if (data.state !== "ok") throw new Error("hilo");
    return renderDrawing({ drawing: NAIA, post: data.post, neighbours: findDrawing(catalog, NAIA.rkey), cards: data.cards, config: CONFIG, i18n, now: NOW });
  }

  test("una tarjeta con la respuesta y sus descendientes en un nivel con sangría", async () => {
    const el = await cardsEl();
    const cards = el.querySelectorAll(".replies__thread");
    expect(cards).toHaveLength(1);
    const card = cards[0]!;
    expect(card.querySelector(":scope > .reply .reply__text")?.textContent).toBe("chulo!");
    const followups = [...card.querySelectorAll(".replies__followups > .reply")];
    expect(followups.map((f) => f.querySelector(".reply__text")?.textContent)).toEqual(["☠️", "👺", "obrigada!"]);
    expect(card.querySelectorAll(".replies__followups .replies__followups")).toHaveLength(0);
  });

  test("nombres: displayName/handle ajeno, tag de la lista para el cuaderno; sin avatar ni imágenes", async () => {
    const el = await cardsEl();
    const names = [...el.querySelectorAll(".reply header strong")].map((s) => s.textContent);
    expect(names.at(-1)).toBe("Naia");
    expect(names[0]).toBeTruthy();
    expect(el.querySelector(".replies img")).toBeNull();
    expect(el.textContent).not.toContain("ocultada");
    expect(el.textContent).not.toContain("😍");
    expect(el.textContent).not.toContain("cumu?");
  });

  test("enlaces de respuestas en pestaña nueva; menciones y javascript: como texto", () => {
    const text = "mira https://example.org @abuela.bsky.social e clic";
    const enc = new TextEncoder();
    const r = (part: string) => {
      const byteStart = enc.encode(text.slice(0, text.indexOf(part))).length;
      return { byteStart, byteEnd: byteStart + enc.encode(part).length };
    };
    const reply: PostView = {
      uri: "at://x/app.bsky.feed.post/r",
      cid: "c",
      author: { did: "did:plc:outra", handle: "luzia.bsky.social", displayName: "  " },
      record: {
        text,
        createdAt: new Date(NOW - 3600_000).toISOString(),
        facets: [
          { index: r("https://example.org"), features: [{ $type: "app.bsky.richtext.facet#link", uri: "https://example.org" }] },
          { index: r("@abuela.bsky.social"), features: [{ $type: "app.bsky.richtext.facet#mention", did: "did:plc:a" }] },
          { index: r("clic"), features: [{ $type: "app.bsky.richtext.facet#link", uri: "javascript:alert(1)" }] },
        ],
      },
    };
    const el = renderDrawing({ drawing: NAIA, post: rootPost(), neighbours: findDrawing(catalog, NAIA.rkey), cards: [{ reply, followups: [] }], config: CONFIG, i18n, now: NOW });
    const links = [...el.querySelectorAll(".replies a")];
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toBe("https://example.org");
    expect(links[0]?.getAttribute("target")).toBe("_blank");
    expect(links[0]?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(el.querySelector(".reply header strong")?.textContent).toBe("luzia.bsky.social");
  });

  test("respuesta con texto e imagen: solo el texto; respuesta sin texto: nombre y fecha", () => {
    const base = { author: { did: "did:plc:outra", handle: "luzia.bsky.social", displayName: "Luzia", avatar: "https://cdn.example/a.jpg" } };
    const withImage: PostView = {
      ...base,
      uri: "at://x/app.bsky.feed.post/i",
      cid: "c1",
      record: { text: "mira!", createdAt: new Date(NOW - 7200_000).toISOString() },
      embed: { $type: "app.bsky.embed.images#view", images: [{ fullsize: "https://cdn.example/f.jpg", thumb: "https://cdn.example/t.jpg", alt: "foto" }] },
    } as PostView;
    const empty: PostView = { ...base, uri: "at://x/app.bsky.feed.post/e", cid: "c2", record: { text: "", createdAt: new Date(NOW - 3600_000).toISOString() } } as PostView;
    const el = renderDrawing({ drawing: NAIA, post: rootPost(), neighbours: findDrawing(catalog, NAIA.rkey), cards: [{ reply: withImage, followups: [empty] }], config: CONFIG, i18n, now: NOW });
    const replies = [...el.querySelectorAll(".reply")];
    expect(el.querySelector(".replies img")).toBeNull();
    expect(replies[0]?.querySelector(".reply__text")?.textContent).toBe("mira!");
    expect(replies[1]?.querySelector(".reply__text")).toBeNull();
    expect(replies[1]?.querySelector("strong")?.textContent).toBe("Luzia");
    expect(replies[1]?.querySelector("time")?.textContent).toBe("há 1 h");
  });

  test("sin respuestas visibles: sin tarjetas ni avisos", () => {
    const el = renderDrawing({ drawing: NAIA, post: rootPost(), neighbours: findDrawing(catalog, NAIA.rkey), cards: [], config: CONFIG, i18n, now: NOW });
    expect(el.querySelector(".replies")).toBeNull();
    expect(el.textContent).not.toMatch(/pendente|oculta/i);
  });
});

describe("índice (6.4)", () => {
  const many = (n: number): Drawing[] =>
    Array.from({ length: n }, (_, i) => ({
      rkey: `r${i}`,
      uri: `at://${DID}/app.bsky.feed.post/r${i}`,
      record: { createdAt: new Date(NOW - i * 86400_000).toISOString() },
      nombre: i % 2 ? "Naia" : null,
    }));

  test("nombre y fecha al momento; 30 dibujos generan 2 peticiones de getPosts", async () => {
    const drawings = many(30);
    const view = renderIndex(drawings, i18n, NOW);
    const items = view.element.querySelectorAll("li");
    expect(items).toHaveLength(30);
    expect(items[0]?.querySelector("strong")?.textContent).toBe("o caderno");
    expect(items[1]?.querySelector("strong")?.textContent).toBe("Naia");
    expect(items[0]?.querySelector("time")).not.toBeNull();
    expect(items[0]?.querySelector("a")?.getAttribute("href")).toBe("#/d/r0");

    const { fn, calls } = mockFetch((url) =>
      json({
        posts: url.searchParams.getAll("uris").map((uri, i) => ({
          uri,
          embed: i === 0 ? { $type: "app.bsky.embed.external#view" } : { $type: "app.bsky.embed.images#view", images: [{ thumb: `https://cdn.example/${i}.jpg`, alt: "a" }] },
        })),
      }),
    );
    await loadThumbnails(CONFIG, fn, view);
    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.url.searchParams.getAll("uris").length)).toEqual([25, 5]);
    expect(items[0]?.querySelector("img")).toBeNull(); // sin imagen: sin miniatura
    expect(items[1]?.querySelector("img")?.getAttribute("src")).toBe("https://cdn.example/1.jpg");
  });

  test("con los posts reales: el que no tiene imagen no lleva miniatura", async () => {
    const view = renderIndex(catalog, i18n, NOW);
    const { fn } = mockFetch(() => json(drawingPosts));
    await loadThumbnails(CONFIG, fn, view);
    expect([...view.element.querySelectorAll("li")].map((li) => li.querySelectorAll("img").length)).toEqual([1, 1]);
  });

  test("si getPosts falla, el índice sigue sin miniaturas", async () => {
    const view = renderIndex(many(3), i18n, NOW);
    const { fn } = mockFetch(() => json({ error: "x" }, 500));
    await loadThumbnails(CONFIG, fn, view);
    expect(view.element.querySelectorAll("li")).toHaveLength(3);
    expect(view.element.querySelector("img")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Clases BEM y estilos (change arquitectura-estilos)
// ---------------------------------------------------------------------------

/** Patrón BEM en inglés: bloque, `__elemento` y `--modificador` opcionales, en kebab-case. */
const BEM = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$/;
/** Clases anteriores en galego: no pueden volver ni como bloque, elemento o modificador. */
const OLD_CLASSES = ["debuxo", "imaxe", "texto", "autoria", "gustos", "partilhas", "respostas", "tarxeta", "seguimento", "resposta", "indice", "miniatura", "estado"];

/** Clases de `root` (incluido) que no cumplen la convención. */
function badClasses(root: Element): string[] {
  const classes = new Set<string>();
  for (const node of [root, ...root.querySelectorAll("[class]")]) node.classList.forEach((c) => classes.add(c));
  return [...classes].filter((c) => !BEM.test(c) || c.split(/__|--/).some((part) => OLD_CLASSES.includes(part)));
}

/** Todos los nombres de color de CSS. */
const NAMED_COLORS = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse " +
    "chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta " +
    "darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet " +
    "deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green " +
    "greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral " +
    "lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
    "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple " +
    "mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite " +
    "navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink " +
    "plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue " +
    "slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
  ).split(" "),
);

/** Colores literales en las declaraciones de `css` (sin contar los `var(...)`). */
function literalColors(css: string): string[] {
  const found: string[] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:\s*([^;{}]+)(?=[;}])/g)) {
    const value = m[2]!.replace(/var\([^)]*\)/g, "").toLowerCase();
    found.push(...(value.match(/#[0-9a-f]{3,8}\b/g) ?? []));
    found.push(...(value.match(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g) ?? []));
    found.push(...(value.match(/[a-z]+/g) ?? []).filter((w) => NAMED_COLORS.has(w)));
  }
  return found;
}

describe("clases BEM y estilos", () => {
  let stop: (() => void) | undefined;
  afterEach(() => {
    stop?.();
    location.hash = "";
  });
  async function open(hash: string, fetchFn = server().fn) {
    location.hash = hash;
    const root = document.createElement("main");
    const app = startApp(root, { config: CONFIG, fetchFn, storage: null, now: () => NOW });
    stop = app.stop;
    const done = app.render();
    const loading = root.cloneNode(true) as Element;
    await done;
    return { root, loading };
  }
  /** Dibujo de Naia con vecinos a los dos lados, likes, compartidos y la tarjeta real con seguimiento. */
  async function fullDrawing() {
    const data = await loadDrawing({ config: CONFIG, fetchFn: server().fn, storage: null, rkey: NAIA.rkey, now: NOW });
    if (data.state !== "ok") throw new Error("hilo");
    const leon = catalog.find((d) => d.rkey === LEON)!;
    const post = { ...data.post, likeCount: 3, repostCount: 1 };
    return renderDrawing({ drawing: NAIA, post, neighbours: { older: leon, current: NAIA, newer: leon }, cards: data.cards, config: CONFIG, i18n, now: NOW });
  }

  test("renderTime: con clase la pone en el <time>; sin ella, sin atributo class", () => {
    const iso = new Date(NOW - 3600_000).toISOString();
    expect(renderTime(iso, i18n, NOW, "byline__date")?.className).toBe("byline__date");
    expect(renderTime(iso, i18n, NOW)?.hasAttribute("class")).toBe(false);
  });

  test("dibujo completo: bloques post y pager", async () => {
    const el = await fullDrawing();
    for (const sel of [".post", ".post__media", ".post__image", ".post__text", ".post__byline", ".post__stat--likes", ".post__stat--shares", ".pager__link--prev", ".pager__link--index", ".pager__link--next"]) {
      expect(el.matches(sel) || el.querySelector(sel) !== null, sel).toBe(true);
    }
    expect(el.querySelector(".post__stat--likes")?.textContent).toBe("Fiz feliz a 3 amigas"); // los textos siguen en galego
  });

  test("primer dibujo: sin pager__link--prev y con pager__link--index", () => {
    const el = renderDrawing({ drawing: NAIA, post: rootPost(), neighbours: findDrawing(catalog, NAIA.rkey), cards: [], config: CONFIG, i18n, now: NOW });
    expect(el.querySelector(".pager__link--prev")).toBeNull();
    expect(el.querySelector(".pager__link--index")).not.toBeNull();
  });

  test("tarjeta con seguimiento: replies__thread > reply + replies__followups > reply--followup", async () => {
    const thread = (await fullDrawing()).querySelector(".replies .replies__thread")!;
    expect(thread.querySelector(":scope > .reply:not(.reply--followup)")).not.toBeNull();
    const followups = thread.querySelectorAll(":scope > .replies__followups > .reply.reply--followup");
    expect(followups.length).toBeGreaterThan(0);
  });

  test("byline compartido en dibujo, respuestas e índice", async () => {
    const el = await fullDrawing();
    const post = el.querySelector(".post__byline")!;
    expect(post.classList.contains("byline")).toBe(true);
    expect(post.querySelector(".byline__name")?.textContent).toBe("Naia");
    expect(post.querySelector("time.byline__date")).not.toBeNull();
    for (const header of el.querySelectorAll(".reply > header")) {
      expect([...header.classList]).toEqual(["reply__header", "byline"]);
      expect(header.querySelector(".byline__name")).not.toBeNull();
      expect(header.querySelector("time.byline__date")).not.toBeNull();
    }
  });

  test("índice con dos dibujos: post-list__item > post-card con thumb y byline", async () => {
    const view = renderIndex(catalog, i18n, NOW);
    expect(view.element.matches(".post-list")).toBe(true);
    expect(view.element.querySelector(".post-list__title")).not.toBeNull();
    const items = view.element.querySelectorAll(".post-list__items > .post-list__item");
    expect(items).toHaveLength(2);
    for (const item of items) {
      const card = item.querySelector(":scope > .post-card")!;
      expect(card.querySelector(".post-card__thumb")).not.toBeNull();
      expect(card.querySelector(".post-card__byline.byline .byline__name")).not.toBeNull();
    }
    await loadThumbnails(CONFIG, mockFetch(() => json(drawingPosts)).fn, view);
    expect(badClasses(view.element)).toEqual([]);
  });

  test("mensajes de estado con su modificador", async () => {
    const loading = await open("#/");
    expect(loading.loading.querySelector(".status.status--loading")).not.toBeNull();
    const notFound = await open("#/d/3mwso7oovnp2u");
    expect(notFound.root.querySelector(".status.status--not-found")?.textContent).toContain("Este desenho não existe.");
    const empty = await open("#/", server({ catalog: () => json({ records: [] }) }).fn);
    expect(empty.root.querySelector(".status.status--empty")).not.toBeNull();
    const error = await open("#/", server({ catalog: () => json({ error: "x" }, 500) }).fn);
    expect(error.root.querySelector(".status.status--error")).not.toBeNull();
    const threadError = await open(`#/d/${NAIA.rkey}`, server({ thread: () => json({ error: "x" }, 500) }).fn);
    expect(threadError.root.querySelector(".status.status--error")?.textContent).toBe("Não foi possível carregar este desenho.");
    for (const r of [loading.loading, notFound.root, empty.root, error.root, threadError.root]) expect(badClasses(r)).toEqual([]);
  });

  test("todas las clases del dibujo cumplen BEM; el comprobador rechaza las anteriores", async () => {
    expect(badClasses(await fullDrawing())).toEqual([]);
    const probe = document.createElement("div");
    probe.innerHTML = '<p class="debuxo"></p><p class="post__texto"></p><p class="Post"></p><p class="post_text"></p>';
    expect(badClasses(probe)).toEqual(["debuxo", "post__texto", "Post", "post_text"]);
  });

  test("index.html no tiene estilos en línea", () => {
    expect(indexHtml).toContain('<main id="app"');
    expect(indexHtml).not.toMatch(/<style[\s>]/i);
    expect(indexHtml).not.toMatch(/\sstyle\s*=/i);
  });

  test("los componentes no usan colores literales; el comprobador los detecta", () => {
    const files = import.meta.glob<string>("../src/styles/components/*.css", { query: "?raw", import: "default", eager: true });
    expect(Object.keys(files).length).toBe(8);
    for (const [f, css] of Object.entries(files)) expect(literalColors(css), f).toEqual([]);
    expect(literalColors(".x { color: white; }")).toEqual(["white"]);
    expect(literalColors(".x { border: 1px solid #ABC; background: rgb(0 0 0); outline-color: oklch(0.5 0.1 200) }")).toEqual(["#abc", "rgb(", "oklch("]);
    expect(literalColors(".x { color: var(--color-text); border-color: currentColor; background: transparent; /* red */ }")).toEqual([]);
    expect(literalColors(".white a:hover { color: inherit; }")).toEqual([]);
  });
});
