/**
 * Carga del catálogo desde el PDS del cuaderno, una vez por sesión de página.
 */

import { buildCatalog, type Drawing } from "./catalog.ts";
import type { Config } from "./config.ts";
import type { PostRecord } from "./lib/types.ts";
import { listAllRecords, type FetchFn } from "./xrpc.ts";

export type CatalogState = { state: "ok"; drawings: Drawing[] } | { state: "error"; error: unknown };

/** Lee todos los posts del cuaderno y devuelve el catálogo, o un estado de error. Nunca lanza. */
export async function loadCatalog(config: Config, fetchFn: FetchFn): Promise<CatalogState> {
  try {
    const records = await listAllRecords<PostRecord>(fetchFn, config.pdsUrl, config.did, "app.bsky.feed.post");
    return { state: "ok", drawings: buildCatalog(records, config.nombres) };
  } catch (error) {
    return { state: "error", error };
  }
}

export interface CatalogMemo {
  /** Carga el catálogo la primera vez y reutiliza el resultado si fue bien. */
  (): Promise<CatalogState>;
  /** Los dibujos ya cargados, sin esperar; `null` si aún no hay catálogo. */
  peek(): Drawing[] | null;
  /** Descarta el catálogo guardado; la siguiente llamada lo vuelve a pedir. */
  reset(): void;
}

/** Devuelve una función que carga el catálogo la primera vez y reutiliza el resultado si fue bien. */
export function memoCatalog(config: Config, fetchFn: FetchFn): CatalogMemo {
  let pending: Promise<CatalogState> | null = null;
  let loaded: Drawing[] | null = null;
  const get = () => {
    if (!pending) {
      const p: Promise<CatalogState> = loadCatalog(config, fetchFn).then((s) => {
        if (pending !== p) return s; // descartado mientras cargaba
        if (s.state === "error") pending = null; // reintentar en la siguiente navegación
        else loaded = s.drawings;
        return s;
      });
      pending = p;
    }
    return pending;
  };
  const reset = () => {
    pending = null;
    loaded = null;
  };
  return Object.assign(get, { peek: () => loaded, reset });
}
