/**
 * Likes del cuaderno leídos de su PDS, con caché incremental en `localStorage`
 * (decisión 7 del diseño).
 *
 * - Caché de menos de 24 h: se piden solo los likes nuevos (rkey mayor que el
 *   último visto; los rkeys son TIDs y ordenan por fecha).
 * - Caché de 24 h o más, o sin caché: carga completa, para que desaparezcan los
 *   likes retirados.
 * - Si falla la red: la caché si tiene menos de 24 h; si no, un mapa vacío
 *   (todas las respuestas ajenas quedan pendientes).
 */

import type { LikeRecord, RepoRecord } from "./lib/types.ts";
import type { LikeMap } from "./moderation.ts";
import { listAllRecords, type FetchFn } from "./xrpc.ts";

export const FULL_RELOAD_MS = 24 * 60 * 60 * 1000;
const VERSION = 1;

/** Lo mínimo de `Storage` que se usa; permite simularlo en los tests. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface CacheEntry {
  v: number;
  /** uri del post -> cids con like. */
  likes: Record<string, string[]>;
  /** rkey del like más reciente visto. */
  newest: string | null;
  /** Momento (ms) de la última carga completa. */
  fullAt: number;
}

export function cacheKey(did: string): string {
  return `omeucaderno:likes:${did}`;
}

/** `localStorage` si se puede usar; `null` si no existe o lanza (modo privado, cookies bloqueadas…). */
export function safeLocalStorage(): KeyValueStorage | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    s.getItem("omeucaderno:probe");
    return s;
  } catch {
    return null;
  }
}

function rkeyOf(uri: string): string {
  return uri.slice(uri.lastIndexOf("/") + 1);
}

function readCache(storage: KeyValueStorage | null, key: string): CacheEntry | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const e = JSON.parse(raw) as Partial<CacheEntry>;
    if (
      e?.v !== VERSION ||
      typeof e.fullAt !== "number" ||
      !(e.newest === null || typeof e.newest === "string") ||
      e.likes === null ||
      typeof e.likes !== "object" ||
      Array.isArray(e.likes)
    ) {
      return null;
    }
    for (const cids of Object.values(e.likes)) {
      if (!Array.isArray(cids) || !cids.every((c) => typeof c === "string")) return null;
    }
    return e as CacheEntry;
  } catch {
    return null;
  }
}

function writeCache(storage: KeyValueStorage | null, key: string, entry: CacheEntry): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(entry));
  } catch {
    // Lleno (QuotaExceededError) u otro fallo: se sigue en memoria y se borra
    // la entrada para no usar una caché a medias.
    try {
      storage.removeItem(key);
    } catch {
      /* nada más que hacer */
    }
  }
}

function addLikes(target: Record<string, string[]>, records: RepoRecord<LikeRecord>[]): void {
  for (const r of records) {
    const uri = r?.value?.subject?.uri;
    const cid = r?.value?.subject?.cid;
    if (typeof uri !== "string" || typeof cid !== "string") continue;
    const list = (target[uri] ??= []);
    if (!list.includes(cid)) list.push(cid);
  }
}

function toMap(likes: Record<string, string[]>): LikeMap {
  return new Map(Object.entries(likes).map(([u, cids]) => [u, new Set(cids)]));
}

export interface LoadLikesOptions {
  did: string;
  pdsUrl: string;
  fetchFn: FetchFn;
  storage: KeyValueStorage | null;
  now?: number;
}

/** Mapa de likes del cuaderno. Nunca lanza: ante un fallo sin caché válida devuelve un mapa vacío. */
export async function loadLikes({ did, pdsUrl, fetchFn, storage, now = Date.now() }: LoadLikesOptions): Promise<LikeMap> {
  const key = cacheKey(did);
  const cache = readCache(storage, key);
  const fresh = cache !== null && now - cache.fullAt >= 0 && now - cache.fullAt < FULL_RELOAD_MS;

  if (fresh) {
    try {
      const newest = cache.newest;
      const records = await listAllRecords<LikeRecord>(fetchFn, pdsUrl, did, "app.bsky.feed.like", (r) =>
        newest !== null && rkeyOf(r.uri) <= newest,
      );
      const first = records[0];
      if (first) {
        addLikes(cache.likes, records);
        cache.newest = rkeyOf(first.uri);
        writeCache(storage, key, cache);
      }
      return toMap(cache.likes);
    } catch {
      return toMap(cache.likes);
    }
  }

  try {
    const records = await listAllRecords<LikeRecord>(fetchFn, pdsUrl, did, "app.bsky.feed.like");
    const entry: CacheEntry = { v: VERSION, likes: {}, newest: records[0] ? rkeyOf(records[0].uri) : null, fullAt: now };
    addLikes(entry.likes, records);
    writeCache(storage, key, entry);
    return toMap(entry.likes);
  } catch {
    return new Map();
  }
}
