/**
 * Cliente XRPC mínimo para endpoints públicos (GET, sin sesión).
 */

import type { RepoRecord } from "./lib/types.ts";

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/** Error de una llamada XRPC: `status` HTTP (0 si falló la red) y el `error` del cuerpo si lo hay. */
export class XrpcError extends Error {
  constructor(
    readonly status: number,
    readonly error?: string,
    message?: string,
  ) {
    super(message ?? `XRPC ${status}${error ? ` ${error}` : ""}`);
  }
}

type Params = Record<string, string | number | string[] | undefined>;

/** URL de un método XRPC con sus parámetros (los arrays se repiten: `uris=a&uris=b`). */
export function xrpcUrl(base: string, nsid: string, params: Params = {}): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else qs.append(k, String(v));
  }
  const q = qs.toString();
  return `${base.replace(/\/+$/, "")}/xrpc/${nsid}${q ? `?${q}` : ""}`;
}

/** GET a un método XRPC. Lanza `XrpcError` si la red falla, la respuesta no es 2xx o el JSON no es válido. */
export async function xrpcGet<T>(
  fetchFn: FetchFn,
  base: string,
  nsid: string,
  params?: Params,
  headers?: Record<string, string>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetchFn(xrpcUrl(base, nsid, params), headers ? { headers } : undefined);
  } catch (e) {
    throw new XrpcError(0, undefined, e instanceof Error ? e.message : String(e));
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new XrpcError(res.status, undefined, `XRPC ${res.status}: respuesta no JSON`);
  }
  if (!res.ok) {
    const b = body as { error?: unknown; message?: unknown } | null;
    throw new XrpcError(
      res.status,
      typeof b?.error === "string" ? b.error : undefined,
      typeof b?.message === "string" ? b.message : undefined,
    );
  }
  return body as T;
}

interface ListRecordsPage<T> {
  records?: RepoRecord<T>[];
  cursor?: string;
}

/**
 * Recorre `com.atproto.repo.listRecords` de una colección, del record más
 * reciente al más antiguo. Para cuando no hay `cursor`, cuando una página llega
 * vacía (el PDS de Eurosky devuelve `cursor` también en la última página) o
 * cuando `stop` devuelve `true` para un record (ese record no se incluye).
 */
export async function listAllRecords<T>(
  fetchFn: FetchFn,
  pdsUrl: string,
  repo: string,
  collection: string,
  stop?: (record: RepoRecord<T>) => boolean,
): Promise<RepoRecord<T>[]> {
  const out: RepoRecord<T>[] = [];
  let cursor: string | undefined;
  const seen = new Set<string>();
  for (;;) {
    const page = await xrpcGet<ListRecordsPage<T>>(fetchFn, pdsUrl, "com.atproto.repo.listRecords", {
      repo,
      collection,
      limit: 100,
      cursor,
    });
    const records = Array.isArray(page.records) ? page.records : [];
    for (const r of records) {
      if (stop?.(r)) return out;
      out.push(r);
    }
    if (!records.length || !page.cursor || seen.has(page.cursor)) return out;
    seen.add(page.cursor);
    cursor = page.cursor;
  }
}
