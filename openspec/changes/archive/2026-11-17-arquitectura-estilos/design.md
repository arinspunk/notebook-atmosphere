# Design

## Context

La motivación está en proposal.md (Why) y los requisitos en `specs/site-styling` y `specs/content-security-policy`.

Estado actual que condiciona el enfoque:

- **Estilos:** cuatro reglas en un `<style>` de `index.html`. No hay ninguna hoja propia.
- **Marcado:** lo generan `src/ui/drawing-view.ts`, `src/ui/index-view.ts` y `src/app.ts` con el helper `el()` de `src/ui/dom.ts`. Las clases están en galego. `renderTime()` crea el `<time>` sin clase.
- **Proporciones:** el `aspect-ratio` se pone con `setAttribute("style", …)` en 3 sitios: la `figure` y la `img` del dibujo, y la miniatura del índice.
- **CSP:** se define solo en `netlify.toml`. Tiene `style-src 'self' 'unsafe-inline'`, no tiene `font-src`, e `img-src` solo admite `https://cdn.bsky.app`. `npm run dev` y `npm run preview` no la aplican.
- **Build:** Vite con `base: "./"` (rutas relativas). Por defecto, Vite incrusta como `data:` los assets de menos de 4 KB.
- **Tests:** `tests/ui.test.ts` busca por clase (unas 50 veces) y comprueba el atributo `style` exacto de la `figure` y la `img`.

## Goals / Non-Goals

**Goals:**

- Que el diseño de Figma pueda aplicarse después tocando solo `src/styles/`.
- Que un fork entienda las clases y cambie el aspecto sin leer TypeScript.
- Que la CSP sea más estricta (sin `'unsafe-inline'`), admita lo propio y se pueda comprobar en local.
- Que el aspecto no cambie en lo esencial: los valores provisionales se parecen a los del navegador.

**Non-Goals:**

- Separar las vistas en módulos TS por componente. Los componentes de este cambio son solo de CSS.
- Aplicar la CSP a `npm run dev`. El HMR de Vite inyecta `<style>` en línea.
- Fijar los breakpoints. Se decidirán con el diseño, porque las media queries no admiten variables CSS.
- Comprobar en los tests los estilos calculados. jsdom no aplica hojas de estilo.

## Decisions

### 1. CSS a secas, ordenado con `@layer`

```
src/styles/
  main.css          @layer tokens, base, layout, components, utilities;
                    @import "./theme.css" layer(tokens); ...
  theme.css         tokens: propiedades personalizadas en :root
  fonts.css         @font-face (vacío por ahora, con el patrón comentado)
  base.css          reset mínimo, body, enlaces, :focus-visible
  layout.css        .app: ancho máximo y márgenes
  components/
    byline.css  post.css  pager.css  replies.css  reply.css
    post-list.css  post-card.css  status.css
```

- **Carga:** `src/main.ts` importa `./styles/main.css`. En el build, Vite resuelve los `@import`, genera un único `assets/index-[hash].css` y lo enlaza con `<link>`. En dev lo inyecta como `<style>`.
- **Orden:** la precedencia la marcan las capas, no el orden de los ficheros ni la especificidad. La capa `utilities` queda declarada pero sin fichero hasta que haga falta.
- **Alternativas descartadas:**
  - Sass o PostCSS con plugins: el CSS actual ya tiene anidado, capas y `clamp()`, y una dependencia más es una cosa más que un fork tiene que entender.
  - Tailwind: las clases de utilidad mezclan el aspecto con el marcado de las vistas, justo lo contrario de lo que se busca.
  - Un CSS por componente junto a su TS: no aplica mientras los componentes sean solo de CSS.

### 2. Mapa BEM

| Antes | Después |
|---|---|
| `article.debuxo` | `article.post` |
| `figure.imaxe` | `figure.post__media` |
| `img` del dibujo | `img.post__image` |
| `p.texto` (dibujo) | `p.post__text` |
| `p.autoria` | `p.post__byline.byline` |
| `p.gustos` / `p.partilhas` | `p.post__stat.post__stat--likes` / `--shares` |
| `nav` | `nav.pager`, con `a.pager__link.pager__link--prev` / `--index` / `--next` |
| `section.respostas` | `section.replies` |
| `div.tarxeta` | `div.replies__thread` |
| `div.seguimento` | `div.replies__followups` |
| `article.resposta` | `article.reply` (`.reply--followup` en el segundo nivel) |
| `header` (respuesta) | `header.reply__header.byline` |
| `p.texto` (respuesta) | `p.reply__text` |
| `section.indice` | `section.post-list`, con `h1.post-list__title`, `ol.post-list__items`, `li.post-list__item` |
| `a` del índice | `a.post-card` |
| `span.miniatura` | `span.post-card__thumb` |
| `img` de la miniatura | `img.post-card__image` |
| `strong` + `time` del índice | `span.post-card__byline.byline` que los envuelve |
| `strong` del nombre (en todos) | `strong.byline__name` |
| `time` (en todos) | `time.byline__date` |
| `p.estado` | `p.status.status--loading` / `--error` / `--empty` / `--not-found` |
| `main#app` | `main#app.app` |

- **Byline como mix:** la clase del elemento (`post__byline`) solo coloca el bloque (márgenes, alineación) y `byline` decide cómo se ve. Las variantes que pida Figma serán modificadores (`byline--compact`).
- **Marcado:** el único cambio es el `<span>` que envuelve nombre y fecha en el índice, necesario para que la byline sea un bloque. Los espacios de texto entre enlaces del `pager` y entre nombre y fecha se mantienen, para que la página siga legible sin CSS.
- **`renderTime()`:** acepta una clase opcional para el `<time>`.
- **Modificador de `status`:** se deriva de la clave del mensaje: `loading`→`loading`, `error` y `threadError`→`error`, `empty`→`empty`, `notFound`→`not-found`.

### 3. Tokens semánticos con valores provisionales

`theme.css` (el fichero de tokens) define en `:root`. Se llama así y no `tokens.css` porque una política de permisos del entorno bloquea los ficheros con `token` en el nombre:
- colores por función: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-border`;
- tipografía: `--font-body`, `--font-heading`, `--font-size-*`, `--line-height-*`;
- espacios: `--space-1` … `--space-6`;
- radios: `--radius-*`;
- ancho de lectura: `--measure`.

Los valores provisionales se parecen a los del navegador: fondo blanco, texto negro y fuente del sistema. Los componentes solo usan estos tokens.

**Modo oscuro preparado pero no implementado:** como ningún componente usa colores literales, basta con añadir más adelante un bloque `@media (prefers-color-scheme: dark)` que redefina los tokens de color. Por ahora no se declara `color-scheme`.

**Alternativa descartada:** tokens por tono (`--blue-500`) usados directamente en los componentes. Así, el modo oscuro obligaría a tocar cada componente.

### 4. `aspect-ratio` por CSSOM

Se asigna `element.style.aspectRatio = "W / H"` en lugar de `setAttribute("style", …)`. La CSP solo controla el atributo `style` escrito en el HTML y los `<style>`; las asignaciones por CSSOM desde un script permitido no dependen de `'unsafe-inline'`. Comprobado: jsdom 26 serializa la propiedad como `aspect-ratio: 1840 / 1380;`, así que los tests pueden leer `style.aspectRatio`.

- Los atributos `width` y `height` de la `img` se mantienen.
- **Alternativa descartada:** pasar la proporción en una propiedad personalizada (`--ratio`) y que el CSS la lea con `aspect-ratio: var(--ratio)`. También funciona, pero el hueco dependería de que cargue la hoja de estilos, y hoy no depende.

### 5. Assets en `src/assets/`, sin incrustar

- **Ubicación:** fuentes en `src/assets/fonts/`, imágenes en `src/assets/images/`. Se referencian con rutas relativas desde el CSS (`url("../assets/fonts/x.woff2")`) o con `import` desde TS. Vite las copia con hash, y las rutas funcionan con `base: "./"`.
- **`public/`:** solo para lo que necesite un nombre fijo (un favicon, en una fase posterior).
- **Sin `data:`:** `build.assetsInlineLimit: 0` en `vite.config.ts`. Si no, un icono pequeño acabaría en una URI `data:`, y la CSP la bloquea porque ni `img-src` ni `font-src` admiten `data:`.
- **Tampoco `data:` escritos a mano:** un SVG puesto directamente en el CSS (`url("data:image/svg+xml,…")`, típico en viñetas e iconos) se bloquea igual. Va como fichero en `src/assets/images/`. El README lo avisa.

### 6. Una sola definición de la CSP

- **Fuente única:** `netlify.toml` sigue siendo la fuente de verdad.
- **Preview:** `vite.config.ts` lee ese fichero, extrae el valor de `Content-Security-Policy` del bloque `[[headers]]` y lo pone en `preview.headers`. La CSP no se duplica.
- **Lector compartido:** la extracción vive en `tooling/csp.ts`, sin dependencias de Node ni del DOM, para que la usen tanto `vite.config.ts` (que lee el fichero con `node:fs`) como el test (que lo importa con `?raw`).
- **Tipos de Node aislados:** `vite.config.ts` necesita `@types/node` (devDependency). Para que `src/` no vea `process` ni `Buffer`, `vite.config.ts` y `tooling/` se comprueban con un `tsconfig.node.json` propio, y `npm run check` ejecuta los dos tsconfig.
- **Tests de la política:** un test lee `netlify.toml` y comprueba que la política:
  - no tiene `'unsafe-inline'` ni `'unsafe-eval'`;
  - incluye `font-src 'self'` e `img-src 'self' https://cdn.bsky.app`;
  - tiene en `connect-src` **exactamente** el origen de `pdsUrl` y los de `APPVIEW_BLUESKY` y `APPVIEW_BLACKSKY`, las dos constantes de `src/config.ts`; y que `appviewUrl` es uno de ellos.

  Esto cubre el aviso que hoy está solo en un comentario de `netlify.toml`, en los dos sentidos: falla si falta un origen (cambio de PDS sin tocar la CSP) y si sobra uno. Blacksky sigue admitido para poder cambiar de AppView solo con `appviewUrl`.

Política resultante:

```
default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self';
img-src 'self' https://cdn.bsky.app;
connect-src https://eurosky.social https://public.api.bsky.app https://api.blacksky.community;
base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'
```

**Alternativa descartada:** un módulo TS con la política y un `_headers` generado en el build. Es más flexible, pero cambia cómo se publica, y Netlify ya lee `netlify.toml` sin pasos extra.

### 7. Comprobaciones sin navegador

- **Clases BEM:** un test recorre el DOM de las vistas (dibujo completo con seguimiento, índice y cada estado) y comprueba que todas las clases cumplen `^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$`. La expresión no distingue idiomas (`debuxo` la cumple), así que el test también comprueba que ningún bloque, elemento o modificador es una de las clases anteriores: `debuxo`, `imaxe`, `texto`, `autoria`, `gustos`, `partilhas`, `respostas`, `tarxeta`, `seguimento`, `resposta`, `indice`, `miniatura`, `estado`.
- **Sin estilos en línea en el HTML publicado:** otro test comprueba que `index.html` no tiene `<style>` ni `style=`. En el DOM en ejecución sí habrá atributos `style` con el `aspect-ratio` asignado por CSSOM (decisión 4), y son correctos.
- **Sin colores literales en los componentes:** un test lee `src/styles/components/*.css` (sin comentarios) y falla si encuentra un color hexadecimal, una función de color (`rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()`) o un nombre de color CSS (`white`, `black`, `red`…). Se admiten `transparent`, `currentColor` e `inherit`.
- **CSP real:** se revisa a mano con `npm run build && npm run preview`. La consola no debe mostrar violaciones.

## Risks / Trade-offs

- **[Vite inyecta algo en línea en el build]** → Comprobación manual con preview y la CSP aplicada (tarea explícita). Hoy Vite no añade scripts ni estilos en línea al `index.html` de un build con una sola entrada.
- **[El parseo de `netlify.toml` en `vite.config.ts` es frágil]** → Expresión acotada a la línea `Content-Security-Policy = "…"`. Si no la encuentra, la configuración lanza un error claro en vez de servir sin CSP. El test de la política usa la misma función.
- **[El aspecto cambia un poco con el reset y la fuente del sistema]** → Se acepta. No hay usuarios que dependan del aspecto actual, y el diseño real llega en el cambio siguiente.
- **[Las clases dejan de coincidir con la jerga del dominio en galego (debuxo, tarxeta)]** → Ganan los forks. El galego queda en los textos de la interfaz y en los comentarios del código.
- **[Netlify inyecta su barra de colaboración (Netlify Drawer) en los deploy previews]** Su script externo lo bloquearía la CSP, y la consola mostraría violaciones que no son del sitio. → Desactivar la barra en el panel de Netlify (paso 1 del Migration Plan). Una consola limpia tiene que significar que la CSP está bien.
- **[Un fork añade un recurso externo (Google Fonts, un CDN) y no carga]** → El README explica qué directiva tocar en `netlify.toml`, y la preview lo muestra antes de publicar.

## Migration Plan

1. Antes del primer deploy con la CSP nueva, desactivar el Netlify Drawer de los deploy previews en el panel de Netlify (es un ajuste del panel, no de `netlify.toml`). Si resulta que no inyectaba nada, el paso no hace daño.
2. Publicar como siempre: push a la rama principal o `npx netlify-cli deploy --build`.
3. Antes de pasar a producción, revisar el deploy preview con la consola abierta (dibujo, índice y un dibujo inexistente) para comprobar que no hay violaciones de la CSP.
4. Vuelta atrás: "Publish deploy" de un deploy anterior en Netlify. No hay datos ni cachés que migrar.
