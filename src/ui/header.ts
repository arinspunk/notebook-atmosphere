/**
 * Site header (page-navigation, decision 1): the place of the logo, for now the
 * notebook's name, linking to the home, and the link to the index. It lives in
 * `index.html`, outside the content that each route replaces, and is filled once.
 */

import type { I18n } from "../lib/i18n.ts";
import { HOME_HREF, INDEX_HREF } from "../router.ts";
import { el } from "./dom.ts";

/** Fills `header` with the logo and the index link. */
export function renderHeader(header: HTMLElement, i18n: I18n): void {
  header.replaceChildren(
    el("a", { class: "site-header__logo", href: HOME_HREF }, i18n.t("siteName")),
    " ",
    el("a", { class: "site-header__index", href: INDEX_HREF }, i18n.t("index")),
  );
}

/** Marks the index link as the current page, or unmarks it. */
export function markCurrent(header: HTMLElement, onIndex: boolean): void {
  const link = header.querySelector(".site-header__index");
  if (!link) return;
  if (onIndex) link.setAttribute("aria-current", "page");
  else link.removeAttribute("aria-current");
}
