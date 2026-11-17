# Tasks

## 1. Hojas de estilo y tokens

- [x] 1.1 Crear `src/styles/` con la estructura de la decisión 1:
  - `main.css` declara las capas e importa el resto;
  - `theme.css` con los tokens semánticos y valores provisionales de la decisión 3;
  - `fonts.css` vacío, con el patrón de `@font-face` comentado y apuntando a `src/assets/fonts/`;
  - `base.css` y `layout.css` (`.app`);
  - un fichero vacío por componente en `components/`.

  Importar `./styles/main.css` desde `src/main.ts`, quitar el `<style>` de `index.html` y dar `class="app"` a `<main>`. Crear `src/assets/fonts/` y `src/assets/images/` con un `.gitkeep`. Verificar:
  - `npm run build` genera un único `assets/*.css` enlazado desde `dist/index.html`;
  - `dist/index.html` no tiene `<style>`;
  - el CSS generado mantiene las capas (contiene `@layer tokens{` y `@layer components{`).
- [x] 1.2 Poner `build.assetsInlineLimit: 0` en `vite.config.ts` (decisión 5). Verificar que, con un SVG de prueba de menos de 4 KB referenciado desde el CSS, `npm run build` lo deja como fichero en `dist/assets/` y no como `data:`. Quitar después el SVG de prueba.

## 2. Clases BEM en las vistas

- [x] 2.1 Hacer que `renderTime()` de `src/ui/dom.ts` acepte una clase opcional. Verificar con un test de `tests/ui.test.ts`: con clase, el `<time>` la lleva; sin ella, no tiene atributo `class`.
- [x] 2.2 Renombrar las clases de `src/ui/drawing-view.ts` según el mapa de la decisión 2:
  - `post` y sus elementos;
  - `byline` en mix;
  - `pager` con sus modificadores;
  - `replies`, `reply` y `reply--followup`;
  - `status--error` para `threadError`.

  Pasar el `aspect-ratio` de la `figure` y la `img` a `element.style.aspectRatio` (decisión 4). Actualizar los selectores de `tests/ui.test.ts` y las comprobaciones de `style` para que lean `style.aspectRatio`. Verificar que `npm test` pasa con los escenarios de "Bloques de la página de un dibujo", "Bloques de las respuestas" y "Bloque compartido de autoría" de `specs/site-styling`.
- [x] 2.3 Renombrar las clases de `src/ui/index-view.ts`:
  - `post-list` y sus elementos;
  - `post-card` con `thumb`;
  - un `<span class="post-card__byline byline">` que envuelve nombre y fecha.

  Pasar el `aspect-ratio` de la miniatura a CSSOM. Verificar con `npm test` el escenario "Índice con dos dibujos" y que `li strong` sigue dando los nombres.
- [x] 2.4 En `src/app.ts`, sustituir `estado` por `status` con el modificador que corresponde a cada clave (`loading`, `error`, `empty`, `not-found`). Verificar con tests de DOM los escenarios "Dibujo inexistente" y "Error del hilo", y que el catálogo vacío da `.status--empty`.
- [x] 2.5 Añadir a `tests/ui.test.ts` el test de convención de la decisión 7. Recorre el DOM de un dibujo con imagen, contadores, vecinos, tarjeta y seguimiento, del índice y de cada estado, y comprueba que todas las clases cumplen la expresión BEM. El test también falla si algún bloque, elemento o modificador es una de las clases anteriores en galego (lista de la decisión 7). Añadir también un test que lea `index.html` y compruebe que no tiene `<style>` ni `style=`, y el test de colores literales en `src/styles/components/*.css` de la decisión 7. Verificar que `npm test` pasa, que el primer test falla si se vuelve a poner temporalmente `debuxo` y que el de colores falla con un `color: white` temporal en un componente.

## 3. Estilos de los componentes

- [x] 3.1 Llevar a los componentes las reglas que hoy existen:
  - `post.css`: `.post__text` con `white-space: pre-line` e `img` con `max-width: 100%`;
  - `reply.css`: `.reply__text` con `pre-line`;
  - `replies.css`: sangría de `.replies__followups`;
  - `post-card.css`: ancho de `.post-card__thumb img`.

  En `byline.css`, `pager.css`, `post-list.css` y `status.css`, solo una disposición básica con tokens: byline en línea con hueco, pager en fila con hueco, lista sin viñetas. Verificar en `npm run dev` que el dibujo, el índice y un dibujo inexistente se ven como antes o con cambios mínimos de fuente y márgenes, sin solapamientos y con la sangría del seguimiento.

## 4. CSP

- [x] 4.1 Actualizar la CSP de `netlify.toml` a la política de la decisión 6 (`style-src 'self'`, `font-src 'self'`, `img-src 'self' https://cdn.bsky.app`) y reescribir su comentario: ya no hay `'unsafe-inline'`, las fuentes e imágenes propias se sirven desde `'self'` y `connect-src` debe seguir a `src/config.ts`.
- [x] 4.2 Crear una función que lea la CSP de `netlify.toml` y lance un error si no la encuentra. Usarla en `vite.config.ts` para `preview.headers`. Verificar con `npm run build && npm run preview` y `curl -sI http://localhost:4173/` que la cabecera `Content-Security-Policy` coincide exactamente con la de `netlify.toml`.
- [x] 4.3 Añadir un test de la política que use la misma función:
  - sin `'unsafe-inline'` ni `'unsafe-eval'`;
  - `default-src 'none'`, `font-src 'self'` e `img-src` con `'self'` y `https://cdn.bsky.app`;
  - `connect-src` es exactamente el origen de `config.pdsUrl` más los de `APPVIEW_BLUESKY` y `APPVIEW_BLACKSKY`, y `config.appviewUrl` es uno de ellos.

  Verificar que `npm test` pasa, que falla si se cambia temporalmente `pdsUrl` a otro origen y que falla si se añade temporalmente un origen extra a `connect-src`.

## 5. Documentación

- [x] 5.1 Añadir al README una sección "Estilos" con:
  - la estructura de `src/styles/` y las capas;
  - la convención BEM y la lista de bloques;
  - que el aspecto se cambia en `theme.css` y en los componentes;
  - dónde poner las fuentes y las imágenes, y que no se pueden usar URIs `data:` (ni las que genera Vite ni las escritas a mano en el CSS);
  - qué directiva de `netlify.toml` tocar para añadir recursos externos;
  - que `npm run preview` aplica la CSP.

  Actualizar la nota de la CSP en la sección "Publicar". Verificar que los nombres de ficheros y clases del README existen en el código.

## 6. Integración

- [x] 6.1 Verificar que `npm run check` y `npm test` pasan.
- [x] 6.2 Con `npm run build && npm run preview`, abrir en Chrome con la consola abierta `#/`, un dibujo con respuestas y seguimiento, `#/indice` y un `#/d/<rkey>` inexistente. Comprobar que no hay ninguna violación de la CSP, que se cargan las imágenes y las miniaturas, y que se aplica la hoja de estilos.

## Workflow follow-up

- Desactivar el Netlify Drawer de los deploy previews en el panel de Netlify (Migration Plan, paso 1).
- Revisar el deploy preview de Netlify con la consola abierta antes de pasar a producción (Migration Plan del diseño).
- Archivar el cambio cuando esté publicado y revisado.
- Siguiente cambio: aplicar el diseño de Figma (valores de tokens, fuentes, breakpoints, estilos de los componentes).
