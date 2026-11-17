# Proposal

## Why

El sitio funciona, pero no tiene estilos: el MVP los dejó fuera a propósito y hoy solo hay cuatro reglas en un `<style>` de `index.html`. El diseño ya existe en Figma, pero sus valores aún no están disponibles. Antes de aplicarlo hace falta una base en la que encaje sin rehacer nada:
- nombres de clase estables y fáciles de entender para quien haga un fork;
- CSS organizado por componentes;
- una CSP que permita las fuentes y las imágenes propias del sitio.

La CSP actual (`default-src 'none'`, sin `font-src` e `img-src` solo para `cdn.bsky.app`) bloquearía en producción las fuentes autoalojadas y las imágenes propias. Además, como `npm run dev` no la aplica, el fallo solo se vería después de publicar.

## What Changes

- **Clases BEM en inglés:** las clases actuales en galego (`debuxo`, `tarxeta`, `resposta`, `indice`…) se sustituyen por bloques BEM en inglés: `post`, `pager`, `replies`, `reply`, `post-list`, `post-card`, `status` y un bloque compartido `byline` (nombre + fecha) que admite modificadores. Los textos de la interfaz siguen en galego. **BREAKING** para cualquier CSS o script externo que dependa de los nombres actuales; no hay ninguno conocido.
- **Arquitectura CSS:** CSS a secas en `src/styles/`, ordenado con `@layer` (tokens, base, layout, components, utilities), con un fichero por componente e importado desde `src/main.ts`. Se elimina el `<style>` de `index.html`.
- **Tokens:** variables CSS con nombres semánticos y **valores provisionales** cercanos al aspecto actual, que se sustituirán por los de Figma en un cambio posterior. Los componentes solo usan tokens de color semánticos, de modo que un modo oscuro futuro solo tenga que redefinir tokens.
- **Assets propios:** sitio preparado para fuentes autoalojadas e imágenes propias servidas desde el mismo origen. Este cambio no incluye todavía ninguna fuente ni imagen.
- **CSP más estricta y a la vez más permisiva con lo propio:**
  - se añaden `font-src 'self'` e `img-src 'self'`;
  - se **quita `'unsafe-inline'`** de `style-src`. Para ello, la proporción de las imágenes se fija por CSSOM y no con el atributo `style` en el HTML.
- **CSP en local:** `npm run preview` sirve la misma cabecera que Netlify, leída del mismo `netlify.toml`, para detectar bloqueos antes de publicar.

Fuera de este cambio:
- los valores reales de Figma (colores, tipografías, espaciados);
- las fuentes y las imágenes concretas;
- los breakpoints;
- header y footer;
- el modo oscuro;
- convertir los componentes en módulos TS.

## Capabilities

### New Capabilities

- `site-styling`: convención de clases (BEM en inglés) y bloques que expone el HTML, y cómo se cargan los estilos (hojas propias, sin estilos en línea en el HTML, tokens centralizados).
- `content-security-policy`: la política de seguridad de contenido del sitio publicado (orígenes permitidos para scripts, estilos, fuentes, imágenes y conexiones) y su disponibilidad en la previsualización local.

### Modified Capabilities

Ninguna. Los nombres de clase nunca formaron parte de `drawing-page`, `drawing-catalog`, `reply-rendering`, `reply-moderation` ni `ui-localization`, y su comportamiento no cambia.

## Impact

- **Código:**
  - `src/ui/drawing-view.ts`, `src/ui/index-view.ts` y `src/app.ts`: nombres de clase nuevos. En `drawing-view.ts` e `index-view.ts` (3 sitios), además, el `aspect-ratio` pasa a asignarse con `element.style`.
  - `src/main.ts`: importa la hoja de estilos.
- **Estilos:** nuevo `src/styles/`. En `index.html` desaparece el `<style>` y `<main>` recibe su clase.
- **Configuración:**
  - `netlify.toml`: CSP nueva y comentario actualizado.
  - `vite.config.ts`: cabecera CSP en `preview`.
- **Tests:** los selectores de `tests/ui.test.ts` pasan a las clases nuevas. Se añaden comprobaciones de la CSP y de que no haya estilos en línea en el HTML.
- **README:** sección sobre estilos y forks.
- **Sin cambios:** datos, moderación, rutas y textos de la interfaz.
