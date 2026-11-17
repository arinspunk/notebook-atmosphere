/**
 * Primera imagen de un post del AppView y su proporción en el record del PDS.
 * Funciones puras.
 */

import type { ImageView, PostRecord, PostView } from "./lib/types.ts";

const IMAGES_VIEW = "app.bsky.embed.images#view";
const RECORD_WITH_MEDIA_VIEW = "app.bsky.embed.recordWithMedia#view";

/** Primera imagen de `embed.images` o, en `recordWithMedia`, de `media.images`; `null` si no hay. */
export function firstImage(post: PostView | undefined): ImageView | null {
  const embed = post?.embed;
  let images: unknown;
  if (embed?.$type === IMAGES_VIEW) images = embed.images;
  else if (embed?.$type === RECORD_WITH_MEDIA_VIEW && embed.media?.$type === IMAGES_VIEW) images = embed.media.images;
  if (!Array.isArray(images)) return null;
  const img = images[0] as ImageView | undefined;
  if (!img || (typeof img.fullsize !== "string" && typeof img.thumb !== "string")) return null;
  return img;
}

const IMAGES_RECORD = "app.bsky.embed.images";
const RECORD_WITH_MEDIA_RECORD = "app.bsky.embed.recordWithMedia";

/**
 * `aspectRatio` de la primera imagen del record del PDS (de `embed.images` o,
 * en `recordWithMedia`, de `media.images`); `null` si no hay o no es válido.
 */
export function recordAspectRatio(record: PostRecord | undefined): { width: number; height: number } | null {
  const embed = record?.embed as { $type?: unknown; images?: unknown; media?: { $type?: unknown; images?: unknown } } | undefined;
  let images: unknown;
  if (embed?.$type === IMAGES_RECORD) images = embed.images;
  else if (embed?.$type === RECORD_WITH_MEDIA_RECORD && embed.media?.$type === IMAGES_RECORD) images = embed.media.images;
  if (!Array.isArray(images)) return null;
  const ar = (images[0] as { aspectRatio?: { width?: unknown; height?: unknown } } | undefined)?.aspectRatio;
  const { width, height } = ar ?? {};
  if (typeof width !== "number" || typeof height !== "number" || !(width > 0) || !(height > 0)) return null;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { width, height };
}
