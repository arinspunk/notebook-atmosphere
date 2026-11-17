/**
 * Datos de la página de un dibujo: hilo del AppView, likes y threadgate del
 * PDS en paralelo; moderación; continuaciones de los hilos cortados; tarjetas.
 */

import { getHiddenReplies, getThread, postUri } from "./appview.ts";
import { buildCards, type Card } from "./cards.ts";
import type { Config } from "./config.ts";
import type { PostView, ThreadNode } from "./lib/types.ts";
import { loadLikes, type KeyValueStorage } from "./likes.ts";
import { moderateThread, type ModerationInput } from "./moderation.ts";
import type { FetchFn } from "./xrpc.ts";

/** Límite de seguridad de rondas de continuación. */
const MAX_CONTINUATION_ROUNDS = 50;

export type DrawingPageData = { state: "ok"; post: PostView; cards: Card[] } | { state: "error"; error: unknown };

function indexByUri(node: ThreadNode, out = new Map<string, ThreadNode>()): Map<string, ThreadNode> {
  const stack = [node];
  while (stack.length) {
    const n = stack.pop()!;
    if (typeof n?.post?.uri === "string") out.set(n.post.uri, n);
    if (Array.isArray(n?.replies)) stack.push(...n.replies);
  }
  return out;
}

/**
 * Modera el hilo y, mientras queden respuestas visibles cortadas por el AppView
 * (sin la clave `replies`), pide `getPostThread` desde ellas e injerta sus
 * respuestas en el árbol. No pide nada bajo respuestas no visibles. Si una
 * continuación falla, esa rama se queda sin descendientes.
 */
export async function resolveContinuations(
  root: ThreadNode,
  input: ModerationInput,
  fetchThread: (uri: string) => Promise<ThreadNode>,
) {
  let result = moderateThread(root, input);
  for (let round = 0; result.truncated.length && round < MAX_CONTINUATION_ROUNDS; round++) {
    const nodes = indexByUri(root);
    await Promise.all(
      result.truncated.map(async (cut) => {
        const raw = cut.post.uri ? nodes.get(cut.post.uri) : undefined;
        if (!raw) return;
        try {
          const sub = await fetchThread(cut.post.uri!);
          raw.replies = Array.isArray(sub.replies) ? sub.replies : [];
        } catch {
          raw.replies = [];
        }
      }),
    );
    result = moderateThread(root, input);
  }
  // Si se agotan las rondas, lo que siga cortado se queda sin más descendientes.
  return result;
}

export interface LoadDrawingOptions {
  config: Config;
  fetchFn: FetchFn;
  storage: KeyValueStorage | null;
  rkey: string;
  now?: number;
}

/** Carga todo lo de la página de un dibujo. Nunca lanza; si falla el hilo, estado de error. */
export async function loadDrawing({ config, fetchFn, storage, rkey, now }: LoadDrawingOptions): Promise<DrawingPageData> {
  const uri = postUri(config.did, rkey);
  const [thread, likes, hidden] = await Promise.all([
    getThread(config, fetchFn, uri).catch((error: unknown) => ({ error })),
    loadLikes({ did: config.did, pdsUrl: config.pdsUrl, fetchFn, storage, now }),
    getHiddenReplies(config, fetchFn, rkey),
  ]);
  if ("error" in thread) return { state: "error", error: thread.error };
  if (!thread.post || thread.$type !== "app.bsky.feed.defs#threadViewPost") {
    return { state: "error", error: new Error(`hilo no disponible: ${thread.$type}`) };
  }
  const result = await resolveContinuations(thread, { did: config.did, likes, hidden }, (u) => getThread(config, fetchFn, u));
  return { state: "ok", post: thread.post, cards: buildCards(result.replies) };
}

/** Tiempo durante el que se reutiliza un resultado de `loadDrawing`, contado desde que se lanzó. */
export const DRAWING_TTL_MS = 60_000;

export interface DrawingMemoOptions {
  config: Config;
  fetchFn: FetchFn;
  storage: KeyValueStorage | null;
  /** Reloj, para los tests. */
  now?: () => number;
}

export interface DrawingMemo {
  /** Resultado de `loadDrawing` de `rkey`: el guardado si se lanzó hace menos de 60 s, o uno nuevo. */
  load(rkey: string): Promise<DrawingPageData>;
  /** Olvida todo lo guardado. */
  clear(): void;
}

/**
 * Memoria de resultados de `loadDrawing` por rkey (decisión 2 del diseño). Una
 * carga en curso se comparte; los errores del hilo no se guardan; una edad
 * negativa (el reloj retrocede) cuenta como caducada.
 */
export function memoDrawings({ config, fetchFn, storage, now = Date.now }: DrawingMemoOptions): DrawingMemo {
  const entries = new Map<string, { at: number; promise: Promise<DrawingPageData> }>();
  const fresh = (at: number, t: number) => t - at >= 0 && t - at < DRAWING_TTL_MS;

  return {
    load(rkey) {
      const t = now();
      for (const [k, e] of entries) if (!fresh(e.at, t)) entries.delete(k);
      const cached = entries.get(rkey);
      if (cached) return cached.promise;
      const entry = {
        at: t,
        promise: loadDrawing({ config, fetchFn, storage, rkey, now: t })
          .catch((error: unknown): DrawingPageData => ({ state: "error", error }))
          .then((data) => {
            if (data.state === "error" && entries.get(rkey) === entry) entries.delete(rkey);
            return data;
          }),
      };
      entries.set(rkey, entry);
      return entry.promise;
    },
    clear() {
      entries.clear();
    },
  };
}
