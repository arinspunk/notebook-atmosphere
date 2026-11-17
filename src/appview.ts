/**
 * Lecturas del AppView (hilo y posts) y del threadgate del cuaderno en su PDS.
 */

import type { Config } from "./config.ts";
import type { PostView, RepoRecord, ThreadgateRecord, ThreadNode } from "./lib/types.ts";
import { hiddenUris } from "./lib/thread.ts";
import { XrpcError, xrpcGet, type FetchFn } from "./xrpc.ts";

/** Labeler de moderación de Bluesky; se pide siempre para no depender de los de cada AppView. */
export const BLUESKY_MODERATION_LABELER = "did:plc:ar7c4by46qjdydhdevvrndac";
export const LABELER_HEADERS = { "atproto-accept-labelers": BLUESKY_MODERATION_LABELER };

/** Máximo de URIs por llamada a `getPosts`. */
export const GET_POSTS_BATCH = 25;

export function postUri(did: string, rkey: string): string {
  return `at://${did}/app.bsky.feed.post/${rkey}`;
}

/** `getPostThread` con `depth=1000` y `parentHeight=0`. Lanza `XrpcError` si falla. */
export async function getThread(config: Config, fetchFn: FetchFn, uri: string): Promise<ThreadNode> {
  const res = await xrpcGet<{ thread?: ThreadNode }>(
    fetchFn,
    config.appviewUrl,
    "app.bsky.feed.getPostThread",
    { uri, depth: 1000, parentHeight: 0 },
    LABELER_HEADERS,
  );
  if (!res?.thread || typeof res.thread !== "object") throw new XrpcError(200, "InvalidResponse");
  return res.thread;
}

/** `getPosts` en lotes de 25. Lanza `XrpcError` si falla algún lote. */
export async function getPosts(config: Config, fetchFn: FetchFn, uris: string[]): Promise<PostView[]> {
  const batches: string[][] = [];
  for (let i = 0; i < uris.length; i += GET_POSTS_BATCH) batches.push(uris.slice(i, i + GET_POSTS_BATCH));
  const results = await Promise.all(
    batches.map((b) =>
      xrpcGet<{ posts?: PostView[] }>(fetchFn, config.appviewUrl, "app.bsky.feed.getPosts", { uris: b }, LABELER_HEADERS),
    ),
  );
  return results.flatMap((r) => (Array.isArray(r?.posts) ? r.posts : []));
}

/**
 * `hiddenReplies` del threadgate del dibujo, leído del PDS del cuaderno.
 * Si el record no existe (400 `RecordNotFound` en Eurosky, o 404) devuelve un
 * conjunto vacío; ante cualquier otro error devuelve `null` (fallo cerrado).
 */
export async function getHiddenReplies(config: Config, fetchFn: FetchFn, rkey: string): Promise<Set<string> | null> {
  try {
    const res = await xrpcGet<RepoRecord<ThreadgateRecord>>(fetchFn, config.pdsUrl, "com.atproto.repo.getRecord", {
      repo: config.did,
      collection: "app.bsky.feed.threadgate",
      rkey,
    });
    return hiddenUris(res?.value);
  } catch (e) {
    if (e instanceof XrpcError && (e.status === 404 || e.error === "RecordNotFound")) return new Set();
    return null;
  }
}
