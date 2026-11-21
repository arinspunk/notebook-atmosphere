/**
 * Página de un dibujo: imagen, texto limpio, nombre, fecha, contadores,
 * navegación y tarjetas de respuestas.
 *
 * Se pinta en dos partes: lo del catálogo (texto, nombre, fecha, flechas y el
 * hueco cuadrado de la imagen, si el record la trae) al momento, y lo de la red
 * (imagen, contadores y tarjetas, o el mensaje de error) cuando llega.
 */

import type { Card } from "../cards.ts";
import { attributeName, type Drawing, type Neighbours } from "../catalog.ts";
import type { Config } from "../config.ts";
import { firstImage, pageImageUrl, recordAspectRatio, recordHasImage, validAspectRatio, viewerImageUrl } from "../embed.ts";
import type { I18n } from "../lib/i18n.ts";
import { cleanCadernoSegments, facetSegments } from "../lib/text.ts";
import type { PostView } from "../lib/types.ts";
import { drawingHref } from "../router.ts";
import { el, renderByline, renderSegments } from "./dom.ts";
import { openViewer } from "./viewer.ts";

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

/**
 * The first image of the post inside `button.post__zoom`, the control that
 * opens the viewer (decision 2), or `null` if there is no image with a web URL.
 */
function renderImage(post: PostView, i18n: I18n): HTMLButtonElement | null {
  const img = firstImage(post);
  const src = pageImageUrl(img); // the thumbnail is enough for the square (decision 1)
  if (!img || !src) return null;
  const alt = typeof img.alt === "string" ? img.alt : "";
  const attrs: Record<string, string> = { class: "post__image", src, alt };
  const ar = validAspectRatio(img.aspectRatio);
  if (ar) {
    // Intrinsic size for the browser; the slot's proportion is set on the figure.
    attrs.width = String(ar.width);
    attrs.height = String(ar.height);
  }
  // `aria-label` replaces the name the `img` would give, so it carries the `alt` too.
  // Without the final full stop or ellipsis, so the name does not read "Na praia.. Ver…".
  const altName = alt.trim().replace(/[\s.…]+$/u, "");
  const label = altName ? i18n.t("viewImageWithAlt", { alt: altName }) : i18n.t("viewImage");
  const button = el("button", { class: "post__zoom", type: "button", "aria-label": label }, el("img", attrs));
  const full = viewerImageUrl(img) ?? src;
  button.addEventListener("click", () => openViewer({ thumb: src, full, alt, i18n, returnFocus: button }));
  return button;
}

/**
 * The arrows, in book order (page-navigation, decision 2): the newest drawing
 * comes first, so "next" goes to the older one, at the right, and "previous"
 * to the newer one, at the left. The labels are real text, hidden by CSS.
 */
function renderNav(n: Neighbours, i18n: I18n): HTMLElement {
  const link = (to: Drawing | null, dir: "prev" | "next", label: "previous" | "next") =>
    to && el("a", { class: `pager__link pager__link--${dir}`, href: drawingHref(to.rkey), rel: dir }, el("span", { class: "pager__label" }, i18n.t(label)));
  return el("nav", { class: "pager", "aria-label": i18n.t("navLabel") }, link(n.newer, "prev", "previous"), " ", link(n.older, "next", "next"));
}

/** Una respuesta: nombre, fecha y texto. Sin avatar, imágenes, embeds ni contadores. */
export function renderReply(post: PostView, config: Config, i18n: I18n, now?: number, followup = false): HTMLElement {
  const own = post.author?.did === config.did;
  const record = post.record ?? {};
  const name = own
    ? (attributeName(record, config.nombres) ?? i18n.t("genericName"))
    : post.author?.displayName?.trim() || post.author?.handle || "";
  const segments = own ? cleanCadernoSegments(record) : facetSegments(record);
  const text = segments.length ? el("p", { class: "reply__text" }, renderSegments(segments)) : null;
  return el(
    "article",
    { class: followup ? "reply reply--followup" : "reply" },
    text,
    // After the text, as in Figma: who wrote it and when, signing the note.
    renderByline({ tag: "footer", className: "reply__footer byline byline--note", name, iso: record.createdAt, i18n, now }),
  );
}

/** Tarjetas de respuestas; `null` si no hay ninguna (sin avisos de pendientes). */
export function renderCards(cards: Card[], config: Config, i18n: I18n, now?: number): HTMLElement | null {
  if (!cards.length) return null;
  return el(
    "section",
    { class: "replies" },
    ...cards.map((c) =>
      el(
        "div",
        { class: "replies__thread" },
        renderReply(c.reply, config, i18n, now),
        c.followups.length ? el("div", { class: "replies__followups" }, ...c.followups.map((f) => renderReply(f, config, i18n, now, true))) : null,
      ),
    ),
  );
}

/** Proportion of the image slot, through CSSOM (never a `style` attribute). */
function setRatio(figure: HTMLElement, { width, height }: { width: number; height: number }): void {
  figure.style.aspectRatio = `${width} / ${height}`;
}

export interface DrawingShellInput {
  drawing: Drawing;
  neighbours: Neighbours;
  config: Config;
  i18n: I18n;
  now?: number;
}

export interface DrawingShell {
  /** The `drawing` block: the sheet (`post` and its arrows) and, after it, the replies. */
  element: HTMLElement;
  /** Coloca la imagen en su hueco, los contadores y las tarjetas. */
  fill(post: PostView, cards: Card[]): void;
  /** Pone el mensaje de error en lugar de la imagen y las respuestas. */
  fail(): void;
}

/** Parte del catálogo, al momento; la de la red se rellena con `fill` o `fail`. */
export function renderDrawingShell({ drawing, neighbours, config, i18n, now }: DrawingShellInput): DrawingShell {
  const segments = cleanCadernoSegments(drawing.record);
  // Image slot if the record carries an image (decision 8): with the record's
  // proportion, through CSSOM; without one, post.css reserves a square.
  let figure: HTMLElement | null = recordHasImage(drawing.record) ? el("figure", { class: "post__media" }) : null;
  const recordRatio = recordAspectRatio(drawing.record);
  if (figure && recordRatio) setRatio(figure, recordRatio);
  const nav = renderNav(neighbours, i18n);
  const sheet = el(
    "article",
    { class: "post" },
    figure,
    segments.length ? el("p", { class: "post__text" }, renderSegments(segments)) : null,
    renderByline({
      tag: "p",
      className: "post__byline byline byline--large",
      name: drawing.nombre ?? i18n.t("genericName"),
      iso: drawing.record.createdAt,
      i18n,
      now,
    }),
  );
  // The arrows go beside the sheet, outside it, so the rotation of `post` does
  // not trap the fixed bar (page-navigation, decision 2); the replies go after
  // the sheet (reply-notes, decision 1).
  const element = el("div", { class: "drawing" }, el("div", { class: "drawing__sheet" }, sheet, nav));

  /** Sustituye el hueco por `node` (o lo quita si es `null`). */
  const replaceFigure = (node: HTMLElement | null) => {
    if (figure && node) figure.replaceWith(node);
    else if (figure) figure.remove();
    else if (node) sheet.prepend(node);
    figure = node;
  };

  return {
    element,
    fill(post, cards) {
      const img = renderImage(post, i18n);
      if (img && figure) figure.append(img);
      else replaceFigure(img && el("figure", { class: "post__media" }, img));
      // The record had no proportion: take the AppView's, if it has one.
      const appviewRatio = validAspectRatio(firstImage(post)?.aspectRatio);
      if (img && figure && !recordRatio && appviewRatio) setRatio(figure, appviewRatio);
      const likes = count(post.likeCount);
      const shared = count(post.repostCount) + count(post.quoteCount);
      sheet.append(
        ...[
          likes ? el("p", { class: "post__stat post__stat--likes" }, i18n.tn("likes", likes)) : null,
          shared ? el("p", { class: "post__stat post__stat--shares" }, i18n.tn("shared", shared)) : null,
        ].filter((n): n is HTMLParagraphElement => n !== null),
      );
      const section = renderCards(cards, config, i18n, now);
      if (section) element.append(section); // after the sheet, inside `drawing`
    },
    fail() {
      replaceFigure(el("p", { class: "status status--error", role: "status" }, i18n.t("threadError")));
    },
  };
}

/** Las dos partes a la vez. */
export function renderDrawing({ post, cards, ...input }: DrawingViewInput): HTMLElement {
  const shell = renderDrawingShell(input);
  shell.fill(post, cards);
  return shell.element;
}
