/**
 * Índice: nombre y fecha al momento (vienen del PDS) y miniaturas después,
 * con `getPosts` del AppView en lotes de 25.
 */

import { getPosts } from "../appview.ts";
import type { Drawing } from "../catalog.ts";
import type { Config } from "../config.ts";
import { firstImage } from "../embed.ts";
import type { I18n } from "../lib/i18n.ts";
import type { FetchFn } from "../xrpc.ts";
import { drawingHref } from "../router.ts";
import { el, isWebUrl, renderTime } from "./dom.ts";

export interface IndexView {
  element: HTMLElement;
  /** Hueco de la miniatura de cada dibujo, por URI. */
  slots: Map<string, HTMLElement>;
}

export function renderIndex(catalog: Drawing[], i18n: I18n, now?: number): IndexView {
  const slots = new Map<string, HTMLElement>();
  const items = catalog.map((d) => {
    const slot = el("span", { class: "miniatura" });
    slots.set(d.uri, slot);
    return el(
      "li",
      {},
      el("a", { href: drawingHref(d.rkey) }, slot, el("strong", {}, d.nombre ?? i18n.t("genericName")), " ", renderTime(d.record.createdAt, i18n, now)),
    );
  });
  return { element: el("section", { class: "indice" }, el("h1", {}, i18n.t("index")), el("ol", {}, ...items)), slots };
}

/**
 * Pide las miniaturas y las coloca en su hueco. Un dibujo sin imagen se queda
 * sin miniatura; si falla la petición, el índice sigue sin miniaturas.
 */
export async function loadThumbnails(config: Config, fetchFn: FetchFn, view: IndexView): Promise<void> {
  let posts;
  try {
    posts = await getPosts(config, fetchFn, [...view.slots.keys()]);
  } catch {
    return;
  }
  for (const post of posts) {
    const slot = post.uri ? view.slots.get(post.uri) : undefined;
    const img = firstImage(post);
    const src = img?.thumb ?? img?.fullsize;
    if (!slot || !img || !isWebUrl(src)) continue;
    const attrs: Record<string, string> = { src, alt: typeof img.alt === "string" ? img.alt : "", loading: "lazy" };
    if (img.aspectRatio && img.aspectRatio.width > 0 && img.aspectRatio.height > 0) {
      attrs.style = `aspect-ratio: ${img.aspectRatio.width} / ${img.aspectRatio.height}`;
    }
    slot.replaceChildren(el("img", attrs));
  }
}
