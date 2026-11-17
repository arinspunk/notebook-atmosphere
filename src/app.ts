/**
 * Aplicación: pinta la ruta actual en `root` y la vuelve a pintar en cada
 * cambio de hash. Estados: cargando, error, cuaderno vacío y no encontrado.
 *
 * Con el catálogo ya cargado, un dibujo se pinta en dos partes: lo del
 * catálogo al momento y lo de la red cuando llega. "A carregar…" solo se ve
 * mientras no hay catálogo.
 *
 * Si la página estuvo oculta más de 10 minutos, al volver se descartan el
 * catálogo y los dibujos guardados y se vuelve a pintar, como en una recarga.
 */

import { findDrawing, type Drawing } from "./catalog.ts";
import { memoCatalog } from "./catalog-loader.ts";
import type { Config } from "./config.ts";
import { memoDrawings } from "./drawing-loader.ts";
import { firstImage } from "./embed.ts";
import { createI18n, type I18n, type SimpleKey } from "./lib/i18n.ts";
import type { KeyValueStorage } from "./likes.ts";
import { INDEX_HREF, parseRoute, type Route } from "./router.ts";
import { el, isWebUrl } from "./ui/dom.ts";
import { renderDrawingShell } from "./ui/drawing-view.ts";
import { loadThumbnails, renderIndex } from "./ui/index-view.ts";
import type { FetchFn } from "./xrpc.ts";

export interface AppDeps {
  config: Config;
  fetchFn: FetchFn;
  storage: KeyValueStorage | null;
  /** Reloj, para los tests. */
  now?: () => number;
  /** Lleva una imagen a la caché HTTP del navegador; se sustituye en los tests. */
  preloadImage?: (src: string) => void;
}

function preloadWithImage(src: string): void {
  new Image().src = src;
}

/** Tiempo oculta a partir del cual la página se vuelve a cargar al volver. */
export const BACKGROUND_RELOAD_MS = 10 * 60 * 1000;

export interface App {
  /** Pinta la ruta del hash actual; resuelve cuando termina. */
  render(): Promise<void>;
  stop(): void;
}

export function startApp(root: HTMLElement, deps: AppDeps, win: Window = window): App {
  const { config, fetchFn, storage } = deps;
  const now = deps.now ?? Date.now;
  const i18n = createI18n(config.lang, config.strings);
  const getCatalog = memoCatalog(config, fetchFn);
  const drawingsMemo = memoDrawings({ config, fetchFn, storage, now });
  const preloadImage = deps.preloadImage ?? preloadWithImage;
  let generation = 0;

  const message = (key: SimpleKey, ...extra: Node[]) => el("p", { class: "estado", role: "status" }, i18n.t(key), ...extra);

  async function render(): Promise<void> {
    const gen = ++generation;
    const isCurrent = () => gen === generation;
    const show = (node: Node) => {
      if (isCurrent()) root.replaceChildren(node);
    };
    const route = parseRoute(win.location.hash);

    let drawings = getCatalog.peek();
    if (!drawings) {
      show(message("loading"));
      const catalog = await getCatalog();
      if (!isCurrent()) return;
      if (catalog.state === "error") return show(message("error"));
      drawings = catalog.drawings;
    }

    if (route.name === "index") return renderIndexPage(drawings, i18n, show, isCurrent);

    if (!drawings.length) return show(message("empty"));
    const rkey = route.name === "drawing" ? route.rkey : drawings[0]!.rkey;
    const neighbours = findDrawing(drawings, rkey);
    if (!neighbours.current) return show(message("notFound", document.createTextNode(" "), el("a", { href: INDEX_HREF }, i18n.t("index"))));

    const view = renderDrawingShell({ drawing: neighbours.current, neighbours, config, i18n, now: now() });
    show(view.element);
    win.scrollTo?.(0, 0);

    const data = await drawingsMemo.load(rkey);
    if (!isCurrent()) return; // otro dibujo ya ocupa la página
    if (data.state === "error") return view.fail();
    view.fill(data.post, data.cards);
    prefetch([neighbours.older, neighbours.newer]);
  }

  /** Prepara en segundo plano los vecinos y su imagen; los fallos se ignoran (el clic lo reintentará). */
  function prefetch(drawings: Array<Drawing | null>) {
    for (const d of drawings) {
      if (!d) continue;
      void drawingsMemo.load(d.rkey).then((data) => {
        if (data.state !== "ok") return;
        const img = firstImage(data.post);
        const src = img?.fullsize ?? img?.thumb;
        if (isWebUrl(src)) preloadImage(src);
      });
    }
  }

  async function renderIndexPage(drawings: Drawing[], i18n: I18n, show: (n: Node) => void, isCurrent: () => boolean) {
    if (!drawings.length) return show(message("empty"));
    const view = renderIndex(drawings, i18n, now());
    show(view.element);
    if (isCurrent()) await loadThumbnails(config, fetchFn, view);
  }

  // Vuelta del segundo plano (decisión 4): `visibilitychange` en general y
  // `pageshow` con `persisted` para las páginas restauradas de la bfcache.
  let hiddenAt: number | null = null;
  const markHidden = () => {
    hiddenAt ??= now(); // si llegan `pagehide` y `visibilitychange`, cuenta el primero
  };
  const back = () => {
    if (hiddenAt === null) return; // ya atendida por el otro evento
    const away = now() - hiddenAt;
    hiddenAt = null;
    // Un reloj que retrocede no deja saber cuánto pasó: se recarga por si acaso.
    if (away > BACKGROUND_RELOAD_MS || away < 0) {
      getCatalog.reset();
      drawingsMemo.clear();
      void render();
    }
  };
  const doc = win.document;
  const onVisibility = () => (doc.visibilityState === "hidden" ? markHidden() : back());
  const onPageShow = (e: Event) => {
    if ((e as PageTransitionEvent).persisted) back();
  };

  const onHash = () => void render();
  const listeners: Array<[EventTarget, string, (e: Event) => void]> = [
    [win, "hashchange", onHash],
    [win, "pagehide", markHidden],
    [win, "pageshow", onPageShow],
    [doc, "visibilitychange", onVisibility],
  ];
  for (const [target, type, fn] of listeners) target.addEventListener(type, fn);
  return {
    render,
    stop: () => {
      for (const [target, type, fn] of listeners) target.removeEventListener(type, fn);
    },
  };
}

export type { Route };
