/**
 * Formas de los records del PDS y de las respuestas del AppView que lee el
 * sitio. Solo se declaran los campos que se usan; todo es opcional porque los
 * datos vienen de la red.
 *
 * Adaptado de `src/types.ts` de atproto-comments
 * (https://github.com/arinspunk/atproto-comments, commit dd311b7).
 * Copyright (c) 2026 arinspunk. Licencia MIT.
 */

export interface Label {
  val: string;
  /** A qué se aplica: una cuenta (DID) o un record (AT-URI). */
  uri?: string;
}

export interface Facet {
  index: { byteStart: number; byteEnd: number };
  features?: Array<{ $type?: string; uri?: string; did?: string; tag?: string }>;
}

export interface StrongRef {
  uri?: string;
  cid?: string;
}

export interface PostRecord {
  text?: string;
  createdAt?: string;
  facets?: Facet[];
  tags?: string[];
  reply?: { root?: StrongRef; parent?: StrongRef };
  embed?: unknown;
}

export interface ProfileViewBasic {
  did?: string;
  handle?: string;
  displayName?: string;
  /** Etiquetas de la cuenta (`uri == did`) y del record de perfil. */
  labels?: Label[];
}

export interface ImageView {
  thumb?: string;
  fullsize?: string;
  alt?: string;
  aspectRatio?: { width: number; height: number };
}

export interface PostView {
  uri?: string;
  cid?: string;
  author?: ProfileViewBasic;
  record?: PostRecord;
  embed?: { $type?: string; images?: ImageView[]; media?: { $type?: string; images?: ImageView[] } };
  likeCount?: number;
  repostCount?: number;
  quoteCount?: number;
  replyCount?: number;
  labels?: Label[];
}

/** Nodo de `getPostThread`. `replies` ausente (no vacío) indica que el AppView cortó el hilo ahí. */
export interface ThreadNode {
  $type?: string;
  post?: PostView;
  replies?: ThreadNode[];
}

/** Record devuelto por `com.atproto.repo.listRecords` / `getRecord`. */
export interface RepoRecord<T> {
  uri: string;
  cid?: string;
  value: T;
}

export interface LikeRecord {
  subject?: StrongRef;
  createdAt?: string;
}

export interface ThreadgateRecord {
  /** Lista de AT-URIs; tipada de forma laxa para filtrar datos incorrectos. */
  hiddenReplies?: unknown[];
}
