import type { FetchFn } from "../src/xrpc.ts";

/** Respuesta JSON simulada. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** `fetch` simulado que guarda las URLs pedidas y responde con `handler`. */
export function mockFetch(handler: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: URL; init?: RequestInit }> = [];
  const fn: FetchFn = async (input, init) => {
    const url = new URL(input);
    calls.push({ url, init });
    return handler(url, init);
  };
  return { fn, calls };
}
