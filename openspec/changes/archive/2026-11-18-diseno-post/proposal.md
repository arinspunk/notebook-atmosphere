# Proposal

## Why

`arquitectura-estilos` dejó la base (BEM, capas, tokens y CSP) con valores provisionales. El diseño del componente `Post` ya está en Figma: una hoja de cuaderno de espiral con el dibujo, el texto escrito como a mano y la autoría. Este change lo aplica a la página de un dibujo, que es lo que más se mira, y fija los tokens reales que usarán después las demás partes.

Además, el diseño trae dos decisiones que cambian comportamiento visible:
- las imágenes se muestran **cuadradas**;
- el contador de likes lleva un emoji: "Fiz feliz a 20 amigas 🥰".

## What Changes

- **Hoja de cuaderno:** el bloque `post` se pinta como una hoja blanca con anillas de espiral a la izquierda. Las anillas se repiten en vertical sin cortes, así que la hoja puede crecer a lo alto con textos largos.
- **Imagen cuadrada:** la primera imagen ocupa un hueco cuadrado y se recorta para llenarlo sin deformarse (`object-fit: cover`), por si alguna vez se sube una imagen que no es cuadrada. El hueco se reserva desde que se muestra la página si el record trae imagen, sin depender de su `aspectRatio`.
- **Tipografía:** Andika (SIL, licencia OFL) autoalojada, recortada a los alfabetos latinos y en WOFF2. Texto del dibujo en cursiva y color tinta. Autoría y contadores alineados a la derecha, con el nombre en negrita.
- **Tokens reales:** colores, tamaños e interlineado de Figma en `theme.css`. Se añaden tokens para tinta, enlaces y foco, y una comprobación automática de contraste.
- **Texto del contador:** "Fiz feliz a 1 amiga 🥰" y "Fiz feliz a N amigas 🥰". **BREAKING** para quien haya sobrescrito esa cadena en la configuración: no hay nadie conocido.

Fuera de este change:
- las respuestas (componente `Post it` de Figma), el `pager` y el índice, que siguen con los estilos provisionales;
- el diseño de escritorio completo, el header y el footer;
- el modo oscuro;
- Geomanist y el título del componente de Figma, que no se usan.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `drawing-page`: la primera imagen se muestra en un hueco cuadrado y recortada; el hueco se reserva si el record trae imagen. El contador de likes cambia de texto.
- `ui-localization`: los escenarios del contador de likes pasan a llevar el emoji.
- `site-styling`: la proporción de la imagen del dibujo la da la hoja de estilos, no el código; nuevos requisitos de la hoja que crece sin cortes, de fuentes propias ligeras y de contraste de los textos.

## Impact

- **Assets:** tira de anillas nueva en `src/assets/images/`; `notebook-page.png` deja de usarse. Andika en WOFF2 con su `OFL.txt` en `src/assets/fonts/`; los TTF originales no se publican ni se versionan.
- **Estilos:** `theme.css`, `fonts.css`, `base.css`, `components/post.css` y `components/byline.css`.
- **Código:** `src/ui/drawing-view.ts` (hueco cuadrado, sin `aspect-ratio` por CSSOM en el dibujo, modificador de `byline`), `src/embed.ts` (saber si el record trae imagen) y `src/lib/i18n.ts` (texto del contador).
- **Tests:** vista del dibujo, i18n, y uno nuevo de contraste de los tokens.
- **README:** cómo regenerar las fuentes y de dónde sale la tira de anillas.
- **Sin cambios:** datos, moderación, rutas y CSP (las fuentes y la imagen son de `'self'`).
