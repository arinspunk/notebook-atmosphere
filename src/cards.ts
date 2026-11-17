/**
 * Tarjetas de respuestas: cada respuesta directa visible abre una tarjeta, y
 * todas sus respuestas visibles, a cualquier profundidad, van debajo en un
 * solo nivel. Función pura.
 */

import type { PostView } from "./lib/types.ts";
import type { VisibleReply } from "./moderation.ts";

export interface Card {
  reply: PostView;
  /** Descendientes visibles, de la más antigua a la más reciente. */
  followups: PostView[];
}

function time(post: PostView): number {
  const t = Date.parse(post.record?.createdAt ?? "");
  return Number.isNaN(t) ? 0 : t;
}

const byCreatedAt = (a: PostView, b: PostView) => time(a) - time(b);

/** Aplana el árbol visible en tarjetas ordenadas por `createdAt` ascendente. */
export function buildCards(replies: VisibleReply[]): Card[] {
  return replies
    .map((r) => {
      const followups: PostView[] = [];
      // Recorrido iterativo: un hilo muy profundo no agota la pila.
      const stack = [...r.replies];
      while (stack.length) {
        const next = stack.pop()!;
        followups.push(next.post);
        stack.push(...next.replies);
      }
      return { reply: r.post, followups: followups.sort(byCreatedAt) };
    })
    .sort((a, b) => byCreatedAt(a.reply, b.reply));
}
