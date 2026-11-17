import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import { cspFromNetlifyToml } from "./tooling/csp.ts";

/** La misma CSP que publica Netlify, para verla aplicada en `npm run preview`. */
const csp = cspFromNetlifyToml(readFileSync(new URL("./netlify.toml", import.meta.url), "utf8"));

export default defineConfig({
  base: "./",
  build: {
    // Nunca incrustar assets como URIs `data:`: la CSP no admite `data:` en
    // `img-src` ni en `font-src`.
    assetsInlineLimit: 0,
  },
  preview: {
    headers: { "Content-Security-Policy": csp },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
