/**
 * Primera imagen de un post del AppView y si el record del PDS trae imagen.
 * Funciones puras.
 */

import type { ImageView, PostRecord, PostView } from "./lib/types.ts";
import { isWebUrl } from "./lib/url.ts";

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

/** Images of a PDS record's embed (`embed.images` or, in `recordWithMedia`, `media.images`). */
function recordImages(record: PostRecord | undefined): unknown {
  const embed = record?.embed as { $type?: unknown; images?: unknown; media?: { $type?: unknown; images?: unknown } } | undefined;
  if (embed?.$type === IMAGES_RECORD) return embed.images;
  if (embed?.$type === RECORD_WITH_MEDIA_RECORD && embed.media?.$type === IMAGES_RECORD) return embed.media.images;
  return undefined;
}

/** `{ width, height }` if `value` is an aspect ratio with positive finite numbers; `null` otherwise. */
export function validAspectRatio(value: unknown): { width: number; height: number } | null {
  if (value === null || typeof value !== "object") return null;
  const { width, height } = value as { width?: unknown; height?: unknown };
  const ok = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
  return ok(width) && ok(height) ? { width, height } : null;
}

/** `aspectRatio` of the record's first image, to reserve the slot before the AppView answers; `null` if missing or invalid. */
export function recordAspectRatio(record: PostRecord | undefined): { width: number; height: number } | null {
  const images = recordImages(record);
  if (!Array.isArray(images)) return null;
  const first = images[0] as { aspectRatio?: unknown } | null | undefined;
  return first && typeof first === "object" ? validAspectRatio(first.aspectRatio) : null;
}

/**
 * Si el record del PDS trae al menos una imagen (en `embed.images` o, en
 * `recordWithMedia`, en `media.images`). Basta para reservar el hueco cuadrado
 * de la imagen antes de tener la URL del AppView.
 */
export function recordHasImage(record: PostRecord | undefined): boolean {
  const images = recordImages(record);
  return Array.isArray(images) && images.length > 0 && typeof images[0] === "object" && images[0] !== null;
}

/** URL for the drawing page and the neighbour prefetch: `thumb`, else `fullsize`; `null` if neither is a web URL. */
export function pageImageUrl(img: ImageView | null | undefined): string | null {
  return pickWebUrl(img?.thumb, img?.fullsize);
}

/** URL for the viewer: `fullsize`, else `thumb`; `null` if neither is a web URL. */
export function viewerImageUrl(img: ImageView | null | undefined): string | null {
  return pickWebUrl(img?.fullsize, img?.thumb);
}

function pickWebUrl(first: unknown, second: unknown): string | null {
  for (const url of [first, second]) if (typeof url === "string" && isWebUrl(url)) return url;
  return null;
}
