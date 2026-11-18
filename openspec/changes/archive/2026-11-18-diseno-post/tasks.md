# Tasks

## 1. Assets

- [x] 1.1 Exportar desde Figma (componente `Post`, capa `folha`) la tira de anillas a 2x y recortar un periodo de 60 px de alto de la zona central, con el ancho de las anillas más lo que sobresalen (decisión 1). Guardarla como `src/assets/images/notebook-rings.png` (*implementado:* paso real de 61 px reescalado a 60, ver decisión 1) y mover `notebook-page.png` a `docs/design/`. Verificar pintando tres periodos seguidos (por ejemplo, con Pillow) que las anillas casan sin saltos y que la tira no tiene sombra ni borde superior o inferior.
- [x] 1.2 Convertir los tres TTF de Andika a WOFF2 con `tooling/fonts.py` y el recorte de la decisión 3, con el nombre "Caderno Letra" (comprobar antes que `brotli` está disponible). Guardar `caderno-letra-{regular,italic,bold}.woff2` y el `OFL.txt` de esa versión en `src/assets/fonts/`, añadir `*.ttf` a `.gitignore` y mover los TTF a `tooling/fonts-src/`. Verificar:
  - cada WOFF2 pesa 100 KB o menos;
  - con fontTools, los tres tienen los glifos de "ñ", "ç", "ã", "õ", "á", "ü", "«", "—" y "€";
  - `git status` no muestra ningún `.ttf`.

## 2. Tokens y base

- [x] 2.1 Poner en `theme.css` los tokens de la decisión 4 y pasar los enlaces y el foco de `base.css` a `--color-link` y `--color-focus`. Declarar las tres caras de Andika en `fonts.css` (decisión 3). Verificar que `npm run build` copia los tres WOFF2 a `dist/assets/` con hash y que el CSS generado los enlaza con rutas relativas.
- [x] 2.2 Añadir el test de contraste de la decisión 5 (en `tests/styles.test.ts`, leyendo las hojas del disco, junto con el test de colores literales). Verificar que `npm test` pasa, que falla si `--color-link` pasa temporalmente a `var(--color-accent)` y que falla si `base.css` usa temporalmente `--color-accent` en el foco. La función de contraste da 21:1 con negro sobre blanco y 1:1 con blanco sobre blanco.

## 3. Componente `post`

- [x] 3.1 Sustituir `recordAspectRatio` por una función que diga si el record trae imagen, y que `renderDrawingShell` reserve la `figure` con ella (decisión 2). Quitar las asignaciones de `aspect-ratio` por CSSOM de la `figure` y la `img` del dibujo. Actualizar `tests/ui.test.ts`. Verificar con tests de DOM los escenarios "Hueco reservado antes de tener la imagen", "Record sin aspectRatio" y "Dibujo sin imagen" de `specs/drawing-page`, y que ni la `figure` ni la `img` del dibujo tienen atributo `style`.
- [x] 3.2 Añadir `byline--large` a la autoría del dibujo en `drawing-view.ts` y su estilo en `byline.css` (decisión 6). Verificar con un test de DOM que la autoría del dibujo lleva `post__byline byline byline--large` y que las respuestas y el índice no llevan `byline--large`.
- [x] 3.3 Escribir `components/post.css`: hoja con fondo, sombra y margen interior; anillas en `::before` con `notebook-rings.png` repetida cada `--line`; imagen cuadrada con `object-fit: cover`; texto en cursiva, `--font-size-lg`, interlineado `--line` y color `--color-ink`; autoría y contadores a la derecha (decisiones 1, 2 y 6). Verificar con `npm test` que el test de colores literales sigue pasando.
- [x] 3.4 Cambiar el texto del contador en `src/lib/i18n.ts` (decisión 7) y actualizar los tests de i18n y de la vista que lo comprueban. Verificar con `npm test` los escenarios del contador de `specs/drawing-page` y `specs/ui-localization`.

## 4. Documentación

- [x] 4.1 Añadir al README, en la sección "Estilos": de dónde se descarga Andika, el comando exacto de conversión a WOFF2 y que los TTF no se versionan; cómo se generó la tira de anillas y por qué no se usa la hoja entera. Verificar que los nombres de ficheros del README existen.

## 5. Integración

- [x] 5.1 Verificar que `npm run check` y `npm test` pasan.
- [x] 5.2 Con `npm run build && npm run preview`, en Chrome con la consola abierta:
  - a 468 px de ancho, comparar un dibujo con la exportación del componente `Post` de Figma (hoja, anillas, imagen, texto, autoría y contador);
  - a 360 px, comprobar que no hay scroll horizontal y que la hoja se adapta;
  - con un texto de 40 líneas (por ejemplo, cambiando el texto en las herramientas del navegador), comprobar que las anillas siguen sin cortes hasta el final;
  - en la pestaña Red, que se cargan los tres WOFF2 desde el propio sitio y ningún TTF;
  - que no hay violaciones de la CSP.
