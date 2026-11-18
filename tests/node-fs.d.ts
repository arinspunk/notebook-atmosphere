/**
 * Lo mínimo de `node:fs` que usan los tests para leer ficheros del proyecto.
 * Se declara aquí y no con `@types/node` para que `src/` no vea los tipos de
 * Node (process, Buffer…), que comparte tsconfig con los tests.
 */
declare module "node:fs" {
  export function readFileSync(path: URL, encoding: "utf8"): string;
  export function readdirSync(path: URL): string[];
}
