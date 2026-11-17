import { describe, expect, test } from "vitest";
import netlifyToml from "../netlify.toml?raw";
import { APPVIEW_BLACKSKY, APPVIEW_BLUESKY, config } from "../src/config.ts";
import { cspDirectives, cspFromNetlifyToml } from "../tooling/csp.ts";

const origin = (url: string) => new URL(url).origin;

/** Problemas de la política frente a la configuración del sitio; vacío si está bien. */
function problems(policy: string, pdsUrl = config.pdsUrl, appviewUrl = config.appviewUrl): string[] {
  const d = cspDirectives(policy);
  const out: string[] = [];
  for (const [name, sources] of d) {
    if (sources.includes("'unsafe-inline'") || sources.includes("'unsafe-eval'")) out.push(`${name}: unsafe`);
  }
  const must = (name: string, sources: string[]) => {
    if (JSON.stringify([...(d.get(name) ?? [])].sort()) !== JSON.stringify([...sources].sort())) out.push(`${name}: ${d.get(name)?.join(" ")}`);
  };
  must("default-src", ["'none'"]);
  must("script-src", ["'self'"]);
  must("style-src", ["'self'"]);
  must("font-src", ["'self'"]);
  must("img-src", ["'self'", "https://cdn.bsky.app"]);
  for (const name of ["base-uri", "form-action", "frame-ancestors", "object-src"]) must(name, ["'none'"]);
  const appviews = [origin(APPVIEW_BLUESKY), origin(APPVIEW_BLACKSKY)];
  must("connect-src", [...new Set([origin(pdsUrl), ...appviews])]);
  if (!appviews.includes(origin(appviewUrl))) out.push(`appviewUrl fuera de los admitidos: ${appviewUrl}`);
  return out;
}

describe("Content-Security-Policy", () => {
  const policy = cspFromNetlifyToml(netlifyToml);

  test("netlify.toml cumple la política con la configuración actual", () => {
    expect(problems(policy)).toEqual([]);
  });

  test("falla si cambia el PDS sin cambiar la política", () => {
    expect(problems(policy, "https://otro-pds.example")).toEqual([expect.stringMatching(/^connect-src/)]);
  });

  test("falla si sobra un origen en connect-src", () => {
    const extra = policy.replace("connect-src ", "connect-src https://extra.example ");
    expect(problems(extra)).toEqual([expect.stringMatching(/^connect-src/)]);
  });

  test("cambiar a Blacksky no exige tocar la política", () => {
    expect(problems(policy, config.pdsUrl, APPVIEW_BLACKSKY)).toEqual([]);
  });

  test("falla con 'unsafe-inline' o una fuente de terceros", () => {
    expect(problems(policy.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'"))).toContain("style-src: unsafe");
    expect(problems(policy.replace("font-src 'self'", "font-src 'self' https://fonts.gstatic.com"))).toEqual([expect.stringMatching(/^font-src/)]);
  });

  test("sin la línea de la CSP, error claro", () => {
    expect(() => cspFromNetlifyToml("[build]\n  publish = \"dist\"\n")).toThrow(/Content-Security-Policy/);
  });
});
