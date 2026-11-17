/**
 * Catálogo de dibujos: qué posts del cuaderno son dibujos, a quién se
 * atribuyen y en qué orden van. Funciones puras, sin DOM ni red.
 */

import type { NombreTag } from "./config.ts";
import { normalizeTag, postTags } from "./lib/text.ts";
import type { PostRecord, RepoRecord } from "./lib/types.ts";

export const CADERNO_TAG = "caderno";

export interface Drawing {
  rkey: string;
  uri: string;
  cid?: string;
  record: PostRecord;
  /** Nombre de la lista, o `null` si ningún tag coincide (se muestra el genérico). */
  nombre: string | null;
}

/** rkey de una AT-URI (`at://did/coleccion/rkey`). */
export function rkeyOf(uri: string): string {
  return uri.slice(uri.lastIndexOf("/") + 1);
}

/** Si el post es un dibujo: lleva `#caderno` (facets o `tags[]`) y no es respuesta. */
export function isDrawing(record: PostRecord | undefined): boolean {
  if (!record || typeof record !== "object") return false;
  if (record.reply) return false;
  return postTags(record).includes(CADERNO_TAG);
}

/**
 * Nombre de la entrada de la lista cuyo tag lleve el post (comparando tras
 * normalizar a NFC y en minúsculas), o `null`. Si coincide más de una, gana la
 * que aparece antes en la lista.
 */
export function attributeName(record: PostRecord | undefined, nombres: NombreTag[]): string | null {
  const tags = new Set(postTags(record));
  for (const n of nombres) {
    if (typeof n?.tag === "string" && tags.has(normalizeTag(n.tag))) return n.nombre;
  }
  return null;
}

/** Del más reciente al más antiguo por `createdAt`; a igual fecha (o sin fecha válida), rkey descendente. */
export function compareDrawings(a: Drawing, b: Drawing): number {
  const ta = Date.parse(a.record.createdAt ?? "");
  const tb = Date.parse(b.record.createdAt ?? "");
  const va = Number.isNaN(ta) ? -Infinity : ta;
  const vb = Number.isNaN(tb) ? -Infinity : tb;
  if (va !== vb) return vb - va;
  return a.rkey < b.rkey ? 1 : a.rkey > b.rkey ? -1 : 0;
}

export interface Neighbours {
  /** El dibujo buscado, o `null` si el rkey no es un dibujo. */
  current: Drawing | null;
  /** Inmediatamente más antiguo. */
  older: Drawing | null;
  /** Inmediatamente más reciente. */
  newer: Drawing | null;
}

/** Dibujo de `rkey` y sus vecinos en el orden del catálogo (del más reciente al más antiguo). */
export function findDrawing(catalog: Drawing[], rkey: string): Neighbours {
  const i = catalog.findIndex((d) => d.rkey === rkey);
  if (i < 0) return { current: null, older: null, newer: null };
  return { current: catalog[i] ?? null, older: catalog[i + 1] ?? null, newer: catalog[i - 1] ?? null };
}

/** Construye el catálogo ordenado a partir de los records `app.bsky.feed.post` del cuaderno. */
export function buildCatalog(records: RepoRecord<PostRecord>[], nombres: NombreTag[]): Drawing[] {
  return records
    .filter((r) => typeof r?.uri === "string" && isDrawing(r.value))
    .map((r) => ({
      rkey: rkeyOf(r.uri),
      uri: r.uri,
      cid: r.cid,
      record: r.value,
      nombre: attributeName(r.value, nombres),
    }))
    .sort(compareDrawings);
}
