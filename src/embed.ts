/**
 * Primera imagen de un post del AppView y si el record del PDS trae imagen.
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
 * Si el record del PDS trae al menos una imagen (en `embed.images` o, en
 * `recordWithMedia`, en `media.images`). Basta para reservar el hueco cuadrado
 * de la imagen antes de tener la URL del AppView.
 */
export function recordHasImage(record: PostRecord | undefined): boolean {
  const embed = record?.embed as { $type?: unknown; images?: unknown; media?: { $type?: unknown; images?: unknown } } | undefined;
  let images: unknown;
  if (embed?.$type === IMAGES_RECORD) images = embed.images;
  else if (embed?.$type === RECORD_WITH_MEDIA_RECORD && embed.media?.$type === IMAGES_RECORD) images = embed.media.images;
  return Array.isArray(images) && images.length > 0 && typeof images[0] === "object" && images[0] !== null;
}
