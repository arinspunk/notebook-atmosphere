/**
 * Utilidades de DOM. Todo texto entra con `textContent`; nunca `innerHTML`.
 */

import { formatAbsoluteDate, formatRelativeTime, isValidDate } from "../lib/date.ts";
import type { I18n } from "../lib/i18n.ts";
import type { TextSegment } from "../lib/text.ts";

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

/** Si una URL es `http:` o `https:`. */
export function isWebUrl(href: string | undefined): href is string {
  if (!href) return false;
  try {
    const u = new URL(href);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
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
