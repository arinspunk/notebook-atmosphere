/**
 * Lectura de ficheros del proyecto en los tests. En Vitest, `import "x.css?raw"`
 * devuelve una cadena vacía (Vitest no procesa CSS), así que las hojas se leen
 * del disco.
 */

import { readdirSync, readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);

/** Contenido de un fichero, con la ruta relativa a la raíz del proyecto. */
export function readProjectFile(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

/** Ficheros `.css` de una carpeta del proyecto: ruta relativa → contenido. */
export function readCssDir(dir: string): Record<string, string> {
  const base = new URL(dir.endsWith("/") ? dir : `${dir}/`, ROOT);
  return Object.fromEntries(
    readdirSync(base)
      .filter((f) => f.endsWith(".css"))
      .sort()
      .map((f) => [`${dir}/${f}`, readFileSync(new URL(f, base), "utf8")]),
  );
}
