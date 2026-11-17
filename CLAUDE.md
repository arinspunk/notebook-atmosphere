# O meu caderno

Sitio estático (TypeScript + Vite, sin framework ni backend) que muestra los dibujos que un cuaderno familiar publica en atproto y las respuestas que reciben, **solo las revisadas por el cuaderno**. El público son niños. Ver `README.md` para el uso y `openspec/specs/` para los requisitos vigentes.

## Cómo se trabaja

- Los cambios de comportamiento pasan por OpenSpec (`openspec/changes/`, skills `openspec-*`). Para revisar un change antes de implementarlo, usa la skill `revisar-change`.
- Idiomas: artefactos de OpenSpec, comentarios y README en **castellano**; textos de la interfaz en **galego**, con la misma norma que `src/lib/i18n.ts` ("há", "desenho", "não"); identificadores y clases CSS en **inglés**.
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
- Los componentes solo usan tokens semánticos de `tokens.css`: ningún color literal (hex, `rgb()`, nombres de color…).
- Fuentes e imágenes propias en `src/assets/`, nunca como URI `data:`.

## Particularidades conocidas

- El PDS de Eurosky responde **400 `RecordNotFound`** (no 404) cuando un record no existe, y devuelve `cursor` también en la última página de `listRecords`.
- Blacksky corta `getPostThread` a unos 5 niveles: el nodo cortado llega **sin** la clave `replies` y hay que pedir la continuación (`resolveContinuations`).
- `src/config.ts` apunta a la cuenta de pruebas (`usoritual.com`) hasta que exista la definitiva.
- `node_modules` está instalado para macOS. Desde un Linux (VM o contenedor), los tests fallan por el binario nativo de rollup: ejecútalos en una copia sin `node_modules` con `npm ci`, sin tocar el `node_modules` del proyecto.
- El repositorio local no tiene `user.name`/`user.email`; usa el autor de los commits anteriores. El push lo hace el autor desde su terminal (el agente no tiene credenciales de GitHub).
