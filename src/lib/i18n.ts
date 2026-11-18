/**
 * Textos de la interfaz: diccionarios por idioma, cadenas sobrescribibles y
 * plurales con `Intl.PluralRules`. Sin DOM, para poder probarlo fuera del navegador.
 *
 * Adaptado de `src/i18n.ts` de atproto-comments
 * (https://github.com/arinspunk/atproto-comments, commit dd311b7).
 * Copyright (c) 2026 arinspunk. Licencia MIT.
 */

/** Formas de una cadena con número, por categoría de `Intl.PluralRules`. */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const GL = {
  // Fechas
  now: "agora",
  minutes: "m",
  hours: "h",
  days: "d",
  months: "me",
  /** Patrón de la fecha relativa; `{t}` es "16 h", "2 d"… No se aplica a "agora" ni a la fecha corta. */
  relative: "há {t}",
  // Autoría
  genericName: "o caderno",
  // Contadores
  likes: { one: "Fiz feliz a {n} amiga 🥰", other: "Fiz feliz a {n} amigas 🥰" } as PluralForms,
  shared: { one: "Partilhado {n} vez", other: "Partilhado {n} vezes" } as PluralForms,
  // Navegación
  /** Nombre accesible de la navegación entre desenhos. */
  navLabel: "Navegação entre desenhos",
  previous: "Anterior",
  next: "Seguinte",
  index: "Todos os desenhos",
  home: "Início",
  // Image viewer
  /** Accessible name of the drawing's image when it has `alt` text. */
  viewImageWithAlt: "{alt}. Ver o desenho em grande",
  /** Accessible name of the drawing's image when its `alt` is empty. */
  viewImage: "Ver o desenho em grande",
  /** Close button of the viewer. */
  close: "Fechar",
  // Estados
  loading: "A carregar…",
  error: "Não foi possível carregar o caderno.",
  threadError: "Não foi possível carregar este desenho.",
  empty: "O caderno ainda está vazio.",
  notFound: "Este desenho não existe.",
};

/** Clave de una cadena de la interfaz. */
export type StringKey = keyof typeof GL;

/** Claves cuyo valor tiene formas de plural. */
export type PluralKey = { [K in StringKey]: (typeof GL)[K] extends PluralForms ? K : never }[StringKey];

/** Claves de cadenas simples. */
export type SimpleKey = Exclude<StringKey, PluralKey>;

export type Dictionary = { [K in StringKey]: K extends PluralKey ? PluralForms : string };

/** Idiomas con diccionario incluido. */
export const DICTIONARIES: Record<string, Dictionary> = { gl: GL };

export const DEFAULT_LANG = "gl";

/** Interfaz resuelta para un idioma. */
export interface I18n {
  /** Idioma del diccionario usado (el pedido o `gl`). */
  lang: string;
  /** Locale BCP 47 para `Intl` (fechas y plurales). */
  locale: string;
  t(key: SimpleKey, vars?: Record<string, string | number>): string;
  /** Cadena con número: elige la forma de plural de `n` y rellena `{n}`. */
  tn(key: PluralKey, n: number, vars?: Record<string, string | number>): string;
}

const PLURAL_KEYS = new Set<string>(
  Object.entries(GL).filter(([, v]) => typeof v === "object").map(([k]) => k),
);
const KEYS = new Set<string>(Object.keys(GL));

function isPluralForms(value: unknown): value is PluralForms {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return typeof (value as { other?: unknown }).other === "string" && entries.every(([, v]) => typeof v === "string");
}

/** Se queda solo con claves conocidas y valores del tipo correcto. Lo que no sea un objeto da `{}`. */
export function pickStrings(value: unknown): Partial<Dictionary> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (!KEYS.has(k)) continue;
    if (PLURAL_KEYS.has(k) ? isPluralForms(v) : typeof v === "string") out[k] = v;
  }
  return out as Partial<Dictionary>;
}

/** Locale válido para `Intl`, o `fallback` si está vacío o no se admite. */
export function resolveLocale(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([raw])[0] ?? fallback;
  } catch {
    return fallback;
  }
}

function fill(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  let out = str;
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

/**
 * Construye la interfaz para `lang`, con `gl` como base y como idioma de
 * reserva, y con las cadenas sobrescritas encima.
 */
export function createI18n(lang: string | undefined, overrides?: unknown): I18n {
  const code = (lang ?? "").split("-")[0]?.toLowerCase() ?? "";
  const resolved = code in DICTIONARIES ? code : DEFAULT_LANG;
  const dict: Dictionary = { ...GL, ...DICTIONARIES[resolved], ...pickStrings(overrides) };
  const locale = resolveLocale(resolved === code ? lang : resolved, DEFAULT_LANG);
  let rules: Intl.PluralRules;
  try {
    rules = new Intl.PluralRules(locale);
  } catch {
    rules = new Intl.PluralRules(DEFAULT_LANG);
  }
  return {
    lang: resolved,
    locale,
    t: (key, vars) => fill(dict[key], vars),
    tn: (key, n, vars) => {
      const forms = dict[key];
      const form = forms[rules.select(n)] ?? forms.other;
      return fill(form, { n, ...vars });
    },
  };
}
