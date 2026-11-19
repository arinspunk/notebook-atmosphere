/**
 * Utilidades de DOM. Todo texto entra con `textContent`; nunca `innerHTML`.
 */

import { formatAbsoluteDate, formatRelativeTime, isValidDate } from "../lib/date.ts";
import type { I18n } from "../lib/i18n.ts";
import type { TextSegment } from "../lib/text.ts";
import { isWebUrl } from "../lib/url.ts";

// Re-exported so existing importers keep working; it lives in a DOM-free module.
export { isWebUrl };

type Child = Node | string | null | undefined | false;

/** Crea un elemento con atributos y hijos. Las cadenas se añaden como nodos de texto. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

/**
 * Texto troceado en nodos: los enlaces web se abren en una pestaña nueva;
 * menciones, hashtags y cualquier otra cosa van como texto.
 */
export function renderSegments(segments: TextSegment[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const s of segments) {
    if (isWebUrl(s.href)) {
      frag.append(el("a", { href: s.href, target: "_blank", rel: "noopener noreferrer" }, s.text));
    } else {
      frag.append(document.createTextNode(s.text));
    }
  }
  return frag;
}

/**
 * `<time>` con la fecha relativa, `datetime` y la fecha absoluta en `title`;
 * `null` si la fecha no es válida. `className`, si se da, va en `class`.
 */
export function renderTime(iso: string | undefined, i18n: I18n, now: number = Date.now(), className?: string): HTMLTimeElement | null {
  if (!isValidDate(iso)) return null;
  const attrs: Record<string, string> = { datetime: new Date(iso).toISOString(), title: formatAbsoluteDate(iso, i18n.locale) };
  if (className) attrs.class = className;
  return el(
    "time",
    attrs,
    formatRelativeTime(iso, i18n, now),
  );
}

export interface BylineInput {
  /** Element that holds the byline: `p` in the drawing, `footer` in a reply, `span` in the index. */
  tag: "p" | "footer" | "span";
  className: string;
  name: string;
  iso: string | undefined;
  i18n: I18n;
  now?: number;
}

/**
 * Name and date as "name, date": `strong.byline__name` and, only if the date
 * is valid, the dictionary's separator and `time.byline__date`. An invalid
 * date leaves only the name, with no trailing separator.
 */
export function renderByline({ tag, className, name, iso, i18n, now }: BylineInput): HTMLElement {
  const time = renderTime(iso, i18n, now, "byline__date");
  return el(tag, { class: className }, el("strong", { class: "byline__name" }, name), time && i18n.t("bylineSeparator"), time);
}
