/**
 * Content-Security-Policy del sitio. La única definición está en
 * `netlify.toml`; estas funciones la sacan de ahí para `npm run preview`
 * (vite.config.ts) y para los tests. Sin dependencias de Node ni del DOM.
 */

const CSP_LINE = /^\s*Content-Security-Policy\s*=\s*"([^"]*)"\s*$/m;

/** Valor de la cabecera `Content-Security-Policy` de un `netlify.toml`; lanza un error si no está. */
export function cspFromNetlifyToml(toml: string): string {
  const policy = CSP_LINE.exec(toml)?.[1]?.trim();
  if (!policy) throw new Error('netlify.toml: no se encuentra la línea `Content-Security-Policy = "…"`');
  return policy;
}

/** Directivas de una política: nombre → lista de fuentes. */
export function cspDirectives(policy: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const part of policy.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) directives.set(name.toLowerCase(), sources);
  }
  return directives;
}
