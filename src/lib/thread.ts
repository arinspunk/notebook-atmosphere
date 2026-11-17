/**
 * Etiquetas de moderación y respuestas ocultas del threadgate. Sin DOM, para
 * poder probarlo fuera del navegador.
 *
 * Adaptado de `src/thread.ts` de atproto-comments
 * (https://github.com/arinspunk/atproto-comments, commit dd311b7).
 * Copyright (c) 2026 arinspunk. Licencia MIT.
 *
 * Cambios: aquí solo se aplican a las respuestas (no al post raíz) y
 * `hiddenReplies` se lee del record del threadgate en el PDS, no del AppView.
 */

import type { Label, PostView, ThreadgateRecord } from "./types.ts";

const HIDE_LABELS = new Set(["!hide", "!no-promote", "porn", "sexual", "graphic-media", "nudity"]);

/** Si alguna etiqueta oculta. */
export function isHiddenByLabel(labels: Label[] | undefined): boolean {
  if (!Array.isArray(labels)) return false;
  return labels.some((l) => typeof l?.val === "string" && HIDE_LABELS.has(l.val));
}

/**
 * Si una etiqueta del post, o de la cuenta de su autor (`uri == did`), lo
 * oculta. Las etiquetas del record de perfil (avatar, banner) no ocultan lo que
 * publica.
 */
export function isHiddenByPostOrAccountLabel(post: PostView | undefined): boolean {
  if (isHiddenByLabel(post?.labels)) return true;
  const did = post?.author?.did;
  if (!did || !Array.isArray(post?.author?.labels)) return false;
  return isHiddenByLabel(post.author.labels.filter((l) => l?.uri === did));
}

/** URIs de `hiddenReplies` de un threadgate; las entradas que no son cadenas se ignoran. */
export function hiddenUris(record: ThreadgateRecord | null | undefined): Set<string> {
  const list = record?.hiddenReplies;
  if (!Array.isArray(list)) return new Set();
  return new Set(list.filter((u): u is string => typeof u === "string" && u !== ""));
}
