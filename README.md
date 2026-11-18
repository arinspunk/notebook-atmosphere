# O meu caderno

Sitio estático donde los niños ven sus dibujos publicados en atproto y los mensajes que reciben. Solo se ven las respuestas que el cuaderno ha revisado.

- **Solo cliente:** TypeScript + Vite, sin framework ni backend.
- **Dos fuentes de datos:**
  - El PDS del cuaderno: posts, likes y threadgates.
  - Un AppView: hilos, nombres, contadores e imágenes. Hoy es Bluesky, con Blacksky como alternativa.
- **Rutas:**
  - `#/`: el dibujo más reciente.
  - `#/d/<rkey>`: un dibujo.
  - `#/indice`: todos los dibujos.

## Requisitos

- Node.js 20 o posterior, con npm.

## Arrancar desde cero

```sh
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
```

## Configurar el cuaderno

Todo está en [`src/config.ts`](src/config.ts):

| Campo | Qué es |
| --- | --- |
| `did` | DID de la cuenta del cuaderno, por ejemplo `did:plc:…`. Se obtiene con `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=<handle>`. |
| `pdsUrl` | PDS de esa cuenta (`serviceEndpoint` de `#atproto_pds` en `https://plc.directory/<did>`), por ejemplo `https://eurosky.social`. |
| `appviewUrl` | AppView. Puede ser `APPVIEW_BLUESKY` (`https://public.api.bsky.app`) o `APPVIEW_BLACKSKY` (`https://api.blacksky.community`). Basta con cambiar este campo para cambiar de AppView. |
| `lang` | Idioma de la interfaz. Hoy solo existe `gl`, que es también el que se usa si el idioma no tiene diccionario. |
| `strings` | Opcional: cadenas que sustituyen a las del diccionario (`src/lib/i18n.ts`), por ejemplo `{ genericName: "a casa" }`. Las de número llevan sus formas de plural: `{ likes: { one: "…{n}…", other: "…{n}…" } }`. |
| `nombres` | Lista de `{ tag, nombre }`. El tag va sin `#` y no distingue mayúsculas ni tildes compuestas o descompuestas. |

**Ahora mismo `src/config.ts` apunta a la cuenta de pruebas `usoritual.com`.** Cambia `did` y `pdsUrl` cuando exista la cuenta definitiva.

## Cómo publica el cuaderno

- **Un dibujo** es un post del cuaderno, que no sea una respuesta, con `#caderno` y el tag del niño (`#naia`):
  - Se muestra la primera imagen.
  - El texto aparece sin los hashtags.
  - Si no lleva ningún tag de la lista, se firma como "o caderno".
- **Las respuestas del cuaderno** se firman con el tag de la lista que lleven (`Obrigada! #naia` se ve como "Naia") o, si no llevan ninguno, como "o caderno".

## Moderar los mensajes

Una respuesta de otra cuenta **solo se ve si el cuaderno le da like** desde Bluesky o desde otra app. El like vale para la versión exacta que se revisó: si el autor reescribe el post, vuelve a quedar pendiente. Las respuestas que cuelgan de una respuesta no visible tampoco se ven.

Para **retirar** un mensaje:

- **Ocultar la respuesta para todos** ("Ocultar respuesta"): deja de verse al recargar la página o al navegar a ese dibujo. Si el dibujo ya estaba preparado (el sitio prepara por adelantado el anterior y el siguiente del que se está viendo), puede seguir viéndose como mucho 1 minuto más. Una página que sigue abierta no se actualiza sola, pero sí al volver a ella tras más de 10 minutos en segundo plano (otra pestaña, pantalla bloqueada). Es la vía para retirar algo con urgencia, y gana a un like. Funciona también con las respuestas del propio cuaderno.
- **Quitar el like:** el sitio guarda en caché los likes del cuaderno en cada navegador, y la caché se vuelve a cargar entera cada 24 h. Hasta entonces puede seguir viéndose en los navegadores que ya la tenían.

Si el PDS no responde, no se ve ninguna respuesta de otras cuentas.

## Estilos

CSS a secas, sin preprocesadores ni frameworks, en [`src/styles/`](src/styles/). `src/main.ts` importa `main.css`, y Vite genera una sola hoja en `dist/assets/`.

```
src/styles/
  main.css          orden de las capas e imports
  theme.css         tokens: colores, tipografía, espacios, radios, medidas
  fonts.css         @font-face de las fuentes autoalojadas
  base.css          reset mínimo y elementos sin clase
  layout.css        contenedor de la página (.app)
  components/       un fichero por bloque
```

Las capas, de menos a más prioridad, son `tokens`, `base`, `layout`, `components` y `utilities`. Una capa posterior gana a una anterior sea cual sea la especificidad.

**Clases:** BEM en inglés (`bloque`, `bloque__elemento`, `bloque--modificador`), para que un fork las entienda sin saber galego. Los textos de la interfaz siguen en galego. Bloques:

| Bloque | Qué es |
| --- | --- |
| `post` | Página de un dibujo: `__media`, `__image`, `__text`, `__byline`, `__stat` (`--likes`, `--shares`) |
| `pager` | Anterior, índice y siguiente: `__link` (`--prev`, `--index`, `--next`) |
| `replies` | Respuestas: `__thread` (cada tarjeta) y `__followups` (segundo nivel) |
| `reply` | Una respuesta: `__header`, `__text`; `--followup` en el segundo nivel |
| `post-list` | Índice: `__title`, `__items`, `__item` |
| `post-card` | Un dibujo del índice: `__thumb`, `__image`, `__byline` |
| `byline` | Nombre y fecha: `__name`, `__date`. Se combina con la clase del bloque que lo contiene (`post__byline byline`) |
| `status` | Mensajes: `--loading`, `--error`, `--empty`, `--not-found` |

Un test comprueba que todas las clases siguen la convención.

**Cambiar el aspecto:** los valores están en `theme.css`; ahora son provisionales, parecidos a los del navegador. Los componentes solo usan esos tokens: un test falla si un componente usa un color literal (`#fff`, `rgb()`, `white`…). Los colores se nombran por función (`--color-bg`, `--color-accent`…), así que un modo oscuro solo tendría que redefinirlos en un `@media (prefers-color-scheme: dark)`.

**Fuentes e imágenes propias:**
- Las fuentes van en `src/assets/fonts/`, declaradas en `fonts.css`, y las imágenes en `src/assets/images/`.
- Se enlazan con rutas relativas desde el CSS (`url("../assets/fonts/x.woff2")`) o con `import` desde TypeScript; Vite les añade un hash.
- **Nada de URIs `data:`:** la CSP las bloquea. Vite está configurado para no generarlas (`assetsInlineLimit: 0`), pero tampoco hay que escribirlas a mano (`url("data:image/svg+xml,…")`): el SVG va como fichero.

**La fuente, "Caderno Letra":** es [Andika](https://software.sil.org/andika/) 6.200 (SIL, licencia OFL, ver `src/assets/fonts/OFL.txt`), recortada a los alfabetos latinos y convertida a WOFF2 (unos 70 KB por cara en vez de ~750 KB). Lleva otro nombre porque la licencia reserva "Andika" para la versión original. Para regenerarla:

```sh
pip install fonttools brotli
# Andika-Regular.ttf, Andika-Italic.ttf y Andika-Bold.ttf en tooling/fonts-src/
python3 tooling/fonts.py tooling/fonts-src
```

Los TTF no se versionan (`*.ttf` en `.gitignore`) ni se publican. Si cambias el recorte en `tooling/fonts.py`, cambia también `unicode-range` en `fonts.css`.

**La hoja de cuaderno:** `.post` es una caja blanca normal que crece con el contenido; sombra y bordes los pone CSS. Las anillas son `src/assets/images/notebook-rings.png`, una tira de **un periodo** de la hoja de Figma (capa `folha`), exportada a 2x y ajustada a 60 px de alto para que se repita cada 30 px, el mismo interlineado del texto. Sus agujeros son transparentes y el fondo blanco empieza donde acaba la tira, así que por ellos se ve el fondo de la página. No se usa la hoja entera (`docs/design/notebook-page.png`) porque al repetirla se cortan las anillas y se repite la sombra.

**Recursos externos:** la CSP de [`netlify.toml`](netlify.toml) solo admite lo propio del sitio. Para usar una fuente de Google Fonts o un CDN, añade su origen a la directiva que corresponda: `font-src` para fuentes, `style-src` para hojas, `img-src` para imágenes. Si no, el navegador lo bloquea en producción. `npm run dev` no aplica la CSP; `npm run build && npm run preview` sí, y así se ve el bloqueo en la consola antes de publicar.

## Probar

```sh
npm test         # tests unitarios y de DOM (Vitest + jsdom)
npm run check    # comprobación de tipos (tsc), del sitio y de vite.config.ts
```

Las fixtures de `tests/fixtures/` son respuestas reales de la cuenta de pruebas, de los dos AppViews y del PDS.

## Publicar

```sh
npm run build    # comprueba los tipos y genera dist/
npm run preview  # sirve dist/ en local, con la misma CSP que Netlify
```

El sitio se publica en **Netlify**. [`netlify.toml`](netlify.toml) ya fija el comando de build (`npm run build`), la carpeta publicada (`dist`) y la versión de Node, así que no hay que configurar nada en el panel. También define la **Content-Security-Policy**. Es la única definición: `npm run preview` la lee de ahí y `tests/csp.test.ts` la comprueba. Si cambias `pdsUrl` en `src/config.ts`, cambia también `connect-src`; si no, el test falla.

Hay dos formas de publicar:

- **Desde un repositorio Git:** en Netlify, "Add new site" → "Import an existing project" y elegir el repositorio. Cada push a la rama principal publica una versión nueva.
- **Desde la terminal:** `npx netlify-cli deploy --build` crea un borrador para revisar, y `npx netlify-cli deploy --build --prod` lo publica. La primera vez pide iniciar sesión y vincular el sitio.

Para volver atrás, en el panel de Netlify: "Deploys" → elegir un deploy anterior → "Publish deploy".

`dist/` es estático, con rutas relativas y rutas por hash, así que no necesita reglas de redirección.

## Origen del código

`src/lib/date.ts`, `src/lib/i18n.ts`, `src/lib/text.ts`, `src/lib/thread.ts` y `src/lib/types.ts` están adaptados de [atproto-comments](https://github.com/arinspunk/atproto-comments) (licencia MIT). Cada fichero lo indica en su cabecera.
