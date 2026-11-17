/**
 * Moderación de respuestas: clasifica cada respuesta del hilo como visible,
 * oculta o pendiente en una sola pasada de arriba abajo. Función pura.
 */

import { hiddenUris, isHiddenByLabel, isHiddenByPostOrAccountLabel } from "./lib/thread.ts";
import type { PostView, ThreadNode } from "./lib/types.ts";

export { hiddenUris, isHiddenByLabel };

export const THREAD_VIEW_POST = "app.bsky.feed.defs#threadViewPost";

export type Status = "visible" | "hidden" | "pending";

/** Likes del cuaderno: uri del post -> cids aprobados. */
export type LikeMap = ReadonlyMap<string, ReadonlySet<string>>;

export interface ModerationInput {
  /** DID del cuaderno. */
  did: string;
  /** Likes del cuaderno, o `null` si no se pudieron obtener (fallo cerrado). */
  likes: LikeMap | null;
  /** URIs de `hiddenReplies`, o `null` si el threadgate no se pudo leer (fallo cerrado). */
  hidden: ReadonlySet<string> | null;
}

/** Respuesta visible con sus respuestas visibles. */
export interface VisibleReply {
  post: PostView;
  replies: VisibleReply[];
  /** El AppView cortó el hilo aquí (`replies` ausente): hay que pedir una continuación. */
  truncated: boolean;
}

export interface ModerationResult {
  /** Respuestas directas visibles, con sus descendientes visibles. */
  replies: VisibleReply[];
  /** Estado de cada respuesta clasificada, por URI. Las que cuelgan de una no visible no se clasifican. */
  statuses: Map<string, Status>;
  /** Respuestas visibles que llegaron cortadas. */
  truncated: VisibleReply[];
}

/** Clasifica una respuesta cuyo padre es visible. */
export function classifyReply(node: ThreadNode | undefined, input: ModerationInput): Status {
  if (!node || node.$type !== THREAD_VIEW_POST) return "hidden";
  const post = node.post;
  const uri = post?.uri;
  const authorDid = post?.author?.did;
  if (typeof uri !== "string" || !uri || typeof authorDid !== "string") return "hidden";

  if (input.hidden?.has(uri)) return "hidden";
  if (isHiddenByPostOrAccountLabel(post)) return "hidden";

  if (authorDid === input.did) return "visible";
  // Sin threadgate o sin likes no se puede saber si está revisada: pendiente.
  if (input.hidden === null || input.likes === null) return "pending";
  const cid = post?.cid;
  if (typeof cid === "string" && input.likes.get(uri)?.has(cid)) return "visible";
  return "pending";
}

/**
 * Clasifica las respuestas del hilo de `root` de arriba abajo. No baja por las
 * respuestas no visibles: todo lo que cuelga de ellas queda fuera. Las
 * etiquetas del post raíz (el dibujo) no se miran.
 */
export function moderateThread(root: ThreadNode, input: ModerationInput): ModerationResult {
  const statuses = new Map<string, Status>();
  const truncated: VisibleReply[] = [];

  const walk = (children: ThreadNode[] | undefined): VisibleReply[] => {
    const out: VisibleReply[] = [];
    for (const child of Array.isArray(children) ? children : []) {
      const status = classifyReply(child, input);
      const uri = child?.post?.uri;
      if (typeof uri === "string") statuses.set(uri, status);
      if (status !== "visible" || !child.post) continue;
      const reply: VisibleReply = {
        post: child.post,
        replies: walk(child.replies),
        truncated: !("replies" in child),
      };
      if (reply.truncated) truncated.push(reply);
      out.push(reply);
    }
    return out;
  };

  return { replies: walk(root.replies), statuses, truncated };
}
