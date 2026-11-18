# O meu caderno

Sitio estático (TypeScript + Vite, sin framework ni backend) que muestra los dibujos que un cuaderno familiar publica en atproto y las respuestas que reciben, **solo las revisadas por el cuaderno**. El público son niños. Ver `README.md` para el uso y `openspec/specs/` para los requisitos vigentes.

## Cómo se trabaja

- Los cambios de comportamiento pasan por OpenSpec (`openspec/changes/`, skills `openspec-*`). Para revisar un change antes de implementarlo, usa la skill `revisar-change`.
- Idiomas:
  - En **inglés**: comentarios del código, artefactos de OpenSpec (proposal, design, specs, tasks), nombres de los changes, **mensajes de commit**, README y cualquier otra documentación, además de identificadores y clases CSS. Los ficheros nuevos van enteros en inglés. En los que ya existen en castellano, lo que se añada va en inglés, y la traducción del resto queda para un change propio.
  - En **galego**: los textos de la interfaz, con la misma norma que `src/lib/i18n.ts` ("há", "desenho", "não").
  - La conversación con el autor sigue en su idioma.
- Comprobar antes de dar algo por hecho: `npm run check` y `npm test`. Para lo que afecte al navegador o a la CSP: `npm run build && npm run preview` y la consola sin violaciones.

## Reglas que no se rompen

- **Moderación, fallar cerrado.** Ante cualquier duda, error o dato incompleto, una respuesta ajena no se muestra. La moderación es una función pura (`src/moderation.ts`); la caché guarda datos, nunca decisiones.
- **Fuentes de los datos de moderación:** likes y threadgate (`hiddenReplies`) se leen del **PDS del cuaderno**, nunca del AppView. El like aprueba solo si `subject.cid` coincide con el `cid` actual.
- **Frescura:** hilo y threadgate de como mucho 60 s al mostrarse; retirar un like tarda como mucho 24 h (caché de likes en `localStorage`). Cualquier caché nueva de datos de moderación tiene que justificar su plazo en un change.
- **Contenido ajeno:** nunca `innerHTML`. Todo texto con `textContent` (helper `el()` de `src/ui/dom.ts`). Enlaces solo `http:`/`https:`, con `target="_blank" rel="noopener noreferrer"`.
- **Sin estilos en línea:** nada de `setAttribute("style", …)` ni `style` en `el()`; las proporciones se asignan por CSSOM (`element.style.aspectRatio`).
- **CSP:** se define solo en `netlify.toml`. Si cambias `pdsUrl` o los AppViews de `src/config.ts`, actualiza `connect-src`. Ningún recurso externo nuevo (fuentes, CDN, `data:`) sin tocar la política a propósito.
- **Sin servidor propio ni autenticación.** Todo son XRPC públicos desde el navegador.

## Estilos (tras el change `arquitectura-estilos`)

- CSS a secas en `src/styles/`, ordenado con `@layer` (tokens, base, layout, components, utilities); un fichero por componente.
- Clases BEM en inglés (`post`, `pager`, `replies`, `reply`, `post-list`, `post-card`, `byline`, `status`). Nunca las antiguas en galego.
- Los componentes solo usan tokens semánticos de `theme.css`: ningún color literal (hex, `rgb()`, nombres de color…). Texto y foco con contraste suficiente: `--color-accent` es solo decorativo (un test lo comprueba).
- Fuentes e imágenes propias en `src/assets/`, nunca como URI `data:`.

## Particularidades conocidas

- El PDS de Eurosky responde **400 `RecordNotFound`** (no 404) cuando un record no existe, y devuelve `cursor` también en la última página de `listRecords`.
- Blacksky corta `getPostThread` a unos 5 niveles: el nodo cortado llega **sin** la clave `replies` y hay que pedir la continuación (`resolveContinuations`).
- El fichero de tokens se llama `src/styles/theme.css` y no `tokens.css` porque el entorno de los agentes bloquea los ficheros con "token" en el nombre. No lo renombres.
- En Vitest, `import "x.css?raw"` devuelve una cadena **vacía**: los tests que leen hojas usan `tests/files.ts` (lee del disco) y comprueban que no están vacías.
- La fuente se llama "Caderno Letra" y no "Andika": la licencia OFL reserva ese nombre para la versión sin modificar. Se regenera con `tooling/fonts.py` (ver README).
- `src/config.ts` apunta a la cuenta de pruebas (`usoritual.com`) hasta que exista la definitiva.
- `node_modules` está instalado para macOS. Desde un Linux (VM o contenedor), los tests fallan por el binario nativo de rollup: ejecútalos en una copia sin `node_modules` con `npm ci`, sin tocar el `node_modules` del proyecto.
- El repositorio local no tiene `user.name`/`user.email`; usa el autor de los commits anteriores. El push lo hace el autor desde su terminal (el agente no tiene credenciales de GitHub).
