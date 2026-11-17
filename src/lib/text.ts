/**
 * Texto de los posts: troceado por facets, limpieza de tags y tags de un post.
 * Sin DOM, para poder probarlo fuera del navegador.
 *
 * `facetSegments` está adaptado de `src/text.ts` de atproto-comments
 * (https://github.com/arinspunk/atproto-comments, commit dd311b7).
 * Copyright (c) 2026 arinspunk. Licencia MIT.
 */

import type { PostRecord } from "./types.ts";

const LINK = "app.bsky.richtext.facet#link";
const MENTION = "app.bsky.richtext.facet#mention";
const TAG = "app.bsky.richtext.facet#tag";

/**
 * Trozo del texto: un enlace si tiene `href`, una mención o un hashtag si
 * tiene `mention` o `tag`, texto plano en otro caso.
 */
export interface TextSegment {
  text: string;
  href?: string;
  mention?: string;
  tag?: string;
}

/**
 * Trocea el texto según sus facets. Los rangos son offsets en bytes UTF-8; los
 * facets solapados, vacíos o fuera de rango se descartan. Solo los enlaces
 * `http:` y `https:` llevan `href`.
 */
export function facetSegments(record: PostRecord): TextSegment[] {
  const text = record.text ?? "";
  const facets = Array.isArray(record.facets) ? record.facets : [];
  const bytes = new TextEncoder().encode(text);

  const runs: Array<{ start: number; end: number; uri?: string; mention?: string; tag?: string }> = [];
  for (const facet of facets) {
    const start = facet?.index?.byteStart;
    const end = facet?.index?.byteEnd;
    if (typeof start !== "number" || typeof end !== "number") continue;
    for (const feature of facet.features ?? []) {
      if (feature.$type === LINK && typeof feature.uri === "string") {
        if (/^https?:\/\//i.test(feature.uri)) runs.push({ start, end, uri: feature.uri });
      } else if (feature.$type === MENTION && typeof feature.did === "string") {
        runs.push({ start, end, mention: feature.did });
      } else if (feature.$type === TAG && typeof feature.tag === "string") {
        runs.push({ start, end, tag: feature.tag });
      }
    }
  }
  runs.sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  const decoder = new TextDecoder();
  let pos = 0;
  for (const run of runs) {
    if (run.start < pos || run.end <= run.start || run.end > bytes.length) continue;
    if (run.start > pos) segments.push({ text: decoder.decode(bytes.slice(pos, run.start)) });
    const part = decoder.decode(bytes.slice(run.start, run.end));
    if (run.mention !== undefined) segments.push({ text: part, mention: run.mention });
    else if (run.tag !== undefined) segments.push({ text: part, tag: run.tag });
    else segments.push({ text: part, href: run.uri });
    pos = run.end;
  }
  if (pos < bytes.length) segments.push({ text: decoder.decode(bytes.slice(pos)) });
  return segments;
}

/**
 * Segmentos de un post del cuaderno: sin ningún hashtag y sin los espacios que
 * sobran al quitarlos (al principio y al final del texto, repetidos dentro de
 * una línea o pegados a un salto de línea). Los saltos de línea se conservan
 * todos; las menciones y los enlaces también.
 */
export function cleanCadernoSegments(record: PostRecord): TextSegment[] {
  const parts = facetSegments(record).filter((s) => s.tag === undefined);
  // Junta el texto plano contiguo para normalizar los espacios de una vez.
  const merged: TextSegment[] = [];
  for (const seg of parts) {
    const last = merged[merged.length - 1];
    if (isPlain(seg) && last && isPlain(last)) last.text += seg.text;
    else merged.push({ ...seg });
  }
  for (const seg of merged) {
    if (isPlain(seg)) {
      seg.text = seg.text
        .replace(/[^\S\n]+/g, " ")
        .replace(/ ?\n ?/g, "\n");
    }
  }
  const first = merged[0];
  if (first && isPlain(first)) first.text = first.text.trimStart();
  const last = merged[merged.length - 1];
  if (last && isPlain(last)) last.text = last.text.trimEnd();
  return merged.filter((s) => s.text !== "");
}

function isPlain(s: TextSegment): boolean {
  return s.href === undefined && s.mention === undefined && s.tag === undefined;
}

/** Forma canónica de un tag para comparar: sin `#`, NFC y en minúsculas. */
export function normalizeTag(raw: string): string {
  return raw.replace(/^#/, "").trim().normalize("NFC").toLowerCase();
}

/** Tags del post (facets de tag y `tags[]`) normalizados con `normalizeTag`, sin repetir, en orden de aparición. */
export function postTags(record: PostRecord | undefined): string[] {
  const out: string[] = [];
  const add = (raw: unknown) => {
    if (typeof raw !== "string") return;
    const tag = normalizeTag(raw);
    if (tag && !out.includes(tag)) out.push(tag);
  };
  for (const facet of Array.isArray(record?.facets) ? record.facets : []) {
    for (const feature of facet?.features ?? []) if (feature.$type === TAG) add(feature.tag);
  }
  if (Array.isArray(record?.tags)) record.tags.forEach(add);
  return out;
}
