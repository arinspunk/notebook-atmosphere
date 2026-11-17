/**
 * Fechas: tiempo relativo para mostrar y fecha absoluta para el tooltip.
 * Sin DOM, para poder probarlo fuera del navegador.
 *
 * Adaptado de `src/date.ts` de atproto-comments
 * (https://github.com/arinspunk/atproto-comments, commit dd311b7).
 * Copyright (c) 2026 arinspunk. Licencia MIT.
 */

import type { I18n } from "./i18n.ts";

/** Si `iso` es una cadena que se interpreta como fecha válida. */
export function isValidDate(iso: string | undefined | null): iso is string {
  if (!iso) return false;
  return !Number.isNaN(new Date(iso).getTime());
}

/**
 * Tiempo relativo ("agora", "há 5 m", "há 3 d"…) con las unidades del idioma,
 * o la fecha corta del locale a partir de 365 días. Vacío si la fecha no es válida.
 */
export function formatRelativeTime(iso: string | undefined, i18n: I18n, now: number = Date.now()): string {
  if (!isValidDate(iso)) return "";
  const date = new Date(iso);
  const delta = Math.floor((now - date.getTime()) / 1000);
  if (delta < 60) return i18n.t("now");
  const ago = (n: number, unit: "minutes" | "hours" | "days" | "months") =>
    i18n.t("relative", { t: `${n} ${i18n.t(unit)}` });
  if (delta < 3600) return ago(Math.floor(delta / 60), "minutes");
  if (delta < 86400) return ago(Math.floor(delta / 3600), "hours");
  if (delta < 2592000) return ago(Math.floor(delta / 86400), "days");
  if (delta < 31536000) return ago(Math.floor(delta / 2592000), "months");
  try {
    return new Intl.DateTimeFormat(i18n.locale, { dateStyle: "short" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Fecha y hora cortas del locale, para el tooltip. Vacío si la fecha no es válida. */
export function formatAbsoluteDate(iso: string | undefined, locale: string): string {
  if (!isValidDate(iso)) return "";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}
