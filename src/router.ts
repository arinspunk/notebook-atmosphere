/**
 * Rutas por hash: `#/` (dibujo más reciente), `#/d/<rkey>` (un dibujo) e
 * `#/indice`. Cualquier otra cosa va a la home.
 */

export type Route = { name: "home" } | { name: "drawing"; rkey: string } | { name: "index" };

/** rkey válido de atproto (record key): 1-512 caracteres de este conjunto, ni `.` ni `..`. */
const RKEY = /^[A-Za-z0-9._:~-]{1,512}$/;

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, "").replace(/\/+$/, "");
  if (path === "/indice") return { name: "index" };
  const m = /^\/d\/(.+)$/.exec(path);
  if (m?.[1]) {
    let rkey: string;
    try {
      rkey = decodeURIComponent(m[1]);
    } catch {
      rkey = m[1];
    }
    // Un rkey imposible se trata como dibujo no encontrado, no como la home.
    return { name: "drawing", rkey: RKEY.test(rkey) && rkey !== "." && rkey !== ".." ? rkey : "" };
  }
  return { name: "home" };
}

export const HOME_HREF = "#/";
export const INDEX_HREF = "#/indice";
export const drawingHref = (rkey: string) => `#/d/${encodeURIComponent(rkey)}`;
