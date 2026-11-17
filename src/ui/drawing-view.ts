/**
 * Página de un dibujo: imagen, texto limpio, nombre, fecha, contadores,
 * navegación y tarjetas de respuestas.
 *
 * Se pinta en dos partes: lo del catálogo (texto, nombre, fecha, flechas y el
 * hueco de la imagen con la proporción del record) al momento, y lo de la red
 * (imagen, contadores y tarjetas, o el mensaje de error) cuando llega.
 */

import type { Card } from "../cards.ts";
import { attributeName, type Drawing, type Neighbours } from "../catalog.ts";
import type { Config } from "../config.ts";
import { firstImage, recordAspectRatio } from "../embed.ts";
import type { I18n } from "../lib/i18n.ts";
import { cleanCadernoSegments, facetSegments } from "../lib/text.ts";
import type { PostView } from "../lib/types.ts";
import { drawingHref, INDEX_HREF } from "../router.ts";
import { el, isWebUrl, renderSegments, renderTime } from "./dom.ts";

export interface DrawingViewInput {
  drawing: Drawing;
  /** `postView` del AppView (imagen y contadores). */
  post: PostView;
  neighbours: Neighbours;
  cards: Card[];
  config: Config;
  i18n: I18n;
  now?: number;
}


function count(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** `<img>` de la primera imagen del post, o `null` si no hay una con URL web. */
function renderImage(post: PostView): HTMLImageElement | null {
  const img = firstImage(post);
  const src = img?.fullsize ?? img?.thumb;
  if (!img || !isWebUrl(src)) return null;
  const attrs: Record<string, string> = { src, alt: typeof img.alt === "string" ? img.alt : "" };
  const ar = img.aspectRatio;
  if (ar && ar.width > 0 && ar.height > 0) {
    // Reserva la proporción antes de que cargue.
    attrs.width = String(ar.width);
    attrs.height = String(ar.height);
    attrs.style = `aspect-ratio: ${ar.width} / ${ar.height}`;
  }
  return el("img", attrs);
}

function renderNav(n: Neighbours, i18n: I18n): HTMLElement {
  return el(
    "nav",
    { "aria-label": i18n.t("navLabel") },
    n.older && el("a", { href: drawingHref(n.older.rkey), rel: "prev" }, i18n.t("previous")),
    " ",
    el("a", { href: INDEX_HREF }, i18n.t("index")),
    " ",
    n.newer && el("a", { href: drawingHref(n.newer.rkey), rel: "next" }, i18n.t("next")),
  );
}

/** Una respuesta: nombre, fecha y texto. Sin avatar, imágenes, embeds ni contadores. */
export function renderReply(post: PostView, config: Config, i18n: I18n, now?: number): HTMLElement {
  const own = post.author?.did === config.did;
  const record = post.record ?? {};
  const name = own
    ? (attributeName(record, config.nombres) ?? i18n.t("genericName"))
    : post.author?.displayName?.trim() || post.author?.handle || "";
  const segments = own ? cleanCadernoSegments(record) : facetSegments(record);
  const text = segments.length ? el("p", { class: "texto" }, renderSegments(segments)) : null;
  return el("article", { class: "resposta" }, el("header", {}, el("strong", {}, name), " ", renderTime(record.createdAt, i18n, now)), text);
}

/** Tarjetas de respuestas; `null` si no hay ninguna (sin avisos de pendientes). */
export function renderCards(cards: Card[], config: Config, i18n: I18n, now?: number): HTMLElement | null {
  if (!cards.length) return null;
  return el(
    "section",
    { class: "respostas" },
    ...cards.map((c) =>
      el(
        "div",
        { class: "tarxeta" },
        renderReply(c.reply, config, i18n, now),
        c.followups.length ? el("div", { class: "seguimento" }, ...c.followups.map((f) => renderReply(f, config, i18n, now))) : null,
      ),
    ),
  );
}

export interface DrawingShellInput {
  drawing: Drawing;
  neighbours: Neighbours;
  config: Config;
  i18n: I18n;
  now?: number;
}

export interface DrawingShell {
  element: HTMLElement;
  /** Coloca la imagen en su hueco, los contadores y las tarjetas. */
  fill(post: PostView, cards: Card[]): void;
  /** Pone el mensaje de error en lugar de la imagen y las respuestas. */
  fail(): void;
}

/** Parte del catálogo, al momento; la de la red se rellena con `fill` o `fail`. */
export function renderDrawingShell({ drawing, neighbours, config, i18n, now }: DrawingShellInput): DrawingShell {
  const segments = cleanCadernoSegments(drawing.record);
  const ar = recordAspectRatio(drawing.record);
  // Hueco de la imagen con la proporción del record; sin ella, no se reserva nada.
  let figure: HTMLElement | null = ar ? el("figure", { class: "imaxe", style: `aspect-ratio: ${ar.width} / ${ar.height}` }) : null;
  const nav = renderNav(neighbours, i18n);
  const element = el(
    "article",
    { class: "debuxo" },
    figure,
    segments.length ? el("p", { class: "texto" }, renderSegments(segments)) : null,
    el("p", { class: "autoria" }, el("strong", {}, drawing.nombre ?? i18n.t("genericName")), " ", renderTime(drawing.record.createdAt, i18n, now)),
    nav,
  );

  /** Sustituye el hueco por `node` (o lo quita si es `null`). */
  const replaceFigure = (node: HTMLElement | null) => {
    if (figure && node) figure.replaceWith(node);
    else if (figure) figure.remove();
    else if (node) element.prepend(node);
    figure = node;
  };

  return {
    element,
    fill(post, cards) {
      const img = renderImage(post);
      if (img && figure) figure.append(img);
      else replaceFigure(img && el("figure", { class: "imaxe" }, img));
      const likes = count(post.likeCount);
      const shared = count(post.repostCount) + count(post.quoteCount);
      nav.before(
        ...[
          likes ? el("p", { class: "gustos" }, i18n.tn("likes", likes)) : null,
          shared ? el("p", { class: "partilhas" }, i18n.tn("shared", shared)) : null,
        ].filter((n): n is HTMLParagraphElement => n !== null),
      );
      const section = renderCards(cards, config, i18n, now);
      if (section) element.append(section);
    },
    fail() {
      replaceFigure(el("p", { class: "estado", role: "status" }, i18n.t("threadError")));
    },
  };
}

/** Las dos partes a la vez. */
export function renderDrawing({ post, cards, ...input }: DrawingViewInput): HTMLElement {
  const shell = renderDrawingShell(input);
  shell.fill(post, cards);
  return shell.element;
}
