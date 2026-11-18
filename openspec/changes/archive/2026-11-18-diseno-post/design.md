# Design

## Context

Ver proposal.md (Why) para la motivación y las specs para los requisitos.

Estado actual que condiciona el enfoque:

- **Estilos:** la base de `arquitectura-estilos` (capas, BEM, tokens en `theme.css`, sin colores literales en los componentes) con valores provisionales. Los enlaces y el contorno del foco usan `--color-accent`. En `theme.css` ya hay, sin commitear, tres colores del diseño: fondo `#FFEDED`, acento `#84FEFC` y borde `#FFDEDE`.
- **Imagen del dibujo:** `renderDrawingShell` reserva el hueco solo si el record trae `aspectRatio` y lo asigna por CSSOM a la `figure` y a la `img` (`recordAspectRatio` de `src/embed.ts`).
- **Assets que ya están en el repositorio sin versionar:**
  - `src/assets/fonts/Andika-{Regular,Italic,Bold}.ttf`, unos 750 KB cada uno, con latín, cirílico, IPA y más.
  - `src/assets/images/notebook-page.png` (474 × 677): la hoja entera con su sombra inferior y derecha. Las anillas no tienen un paso entero en píxeles (unos 30,5 px), así que repetir la imagen deja un salto en las anillas y una línea de sombra cada 677 px.
- **Medidas del componente `Post` en Figma** (468 de ancho):
  - margen interior de unos 43,5 px; a la izquierda, 30 px más para las anillas (73,5 px);
  - el contenido mide 351 px de ancho, el de la imagen cuadrada;
  - las anillas tienen un paso de **30 px** y sobresalen unos 19 px por la izquierda de la hoja;
  - texto en Andika Italic 20/30 de color `#290074`; autoría en Andika 20/30 alineada a la derecha, con el nombre en Bold; contador en Andika 15 alineado a la derecha.
- **CSP:** `font-src 'self'` e `img-src 'self'` ya admiten fuentes e imágenes propias. Las URIs `data:` están prohibidas.

## Goals / Non-Goals

**Goals:**

- Que la página de un dibujo se vea como el componente `Post` de Figma a 468 px de ancho y se adapte sin romperse en un móvil de 360 px.
- Ritmo vertical de 30 px: interlineado del texto y paso de las anillas iguales.
- Tokens con los valores reales, y que un error de contraste se detecte sin abrir el navegador.

**Non-Goals:**

- Reproducir píxel a píxel la sombra de la hoja del PNG. Se aproxima con `box-shadow`.
- Adaptar el diseño a escritorio más allá de centrar la hoja: no hay diseño de escritorio todavía.
- Optimizar los emojis. Salen de la fuente del sistema, igual que en Figma.

## Decisions

### 1. La hoja en CSS y solo las anillas como imagen

- **Hoja:** `.post` con fondo `--color-surface`, `box-shadow: var(--shadow-sheet)` y un borde redondeado pequeño. Es una caja normal, así que crece con el contenido.
- **Anillas:** dos capas de fondo de `.post`. Encima, una **tira de un periodo** con `background-repeat: repeat-y` y `background-size` de 30 px de alto (`--line`), así que se repite siempre con el mismo paso y alineada con el texto. Debajo, un `linear-gradient` transparente en el ancho de la tira y blanco después: los agujeros de la tira son transparentes y por ellos se ve el fondo de la página.
- **La tira:** se exportó desde Figma a 2x la capa `folha` suelta. *Implementado:* en esa exportación las anillas tienen un paso de 61 px (30,5 a 1x), no de 60, y no sobresalen de la hoja. Se recortó un periodo de la zona central (66 × 61 px, comprobando que coincide con el siguiente) y se reescaló a 66 × 60 para que el paso sea exactamente `--line`; la diferencia (1,6 %) no se aprecia. Como no sobresalen, no hace falta un `::before`. Se guarda como `src/assets/images/notebook-rings.png` y el README explica cómo se hizo.
- `notebook-page.png` sale de `src/assets/`: se mueve a `docs/design/` como referencia, fuera del build.

*Por qué:* separar la hoja de las anillas es lo único que permite crecer sin cortes. La sombra y los bordes no se repiten porque los pone CSS una sola vez.

*Alternativas descartadas:*
- `repeat-y` del PNG entero: corta las anillas y repite la sombra (ver Context).
- `border-image` con 9 cortes del PNG: el tramo central se repite o se estira, pero con un paso no entero las anillas siguen sin casar.
- Dibujar las anillas con gradientes CSS: un arco con sombra en gradientes es frágil y no se parece al diseño.

### 2. Imagen cuadrada por CSS

- `.post__media { aspect-ratio: 1; }` con el ancho del contenido; `.post__image { width: 100%; height: 100%; object-fit: cover; }`.
- El shell reserva la `figure` si el record trae imagen (`embed.images` o `recordWithMedia` con imágenes), tenga o no `aspectRatio`. `recordAspectRatio` se sustituye por una función que responde si el record trae imagen.
- Se quitan las asignaciones de `aspect-ratio` por CSSOM de la `figure` y la `img` del dibujo. Los atributos `width` y `height` de la `img` se mantienen, porque no estorban y ayudan al navegador.
- Las miniaturas del índice no cambian en este change: siguen con su proporción por CSSOM.

*Por qué:* las imágenes se suben siempre cuadradas, y `object-fit: cover` cubre el error ocasional sin deformar el dibujo. El cuadrado en la hoja de estilos simplifica el código y no depende de un dato del record.

### 3. Andika recortada y en WOFF2

- **Conversión** con fontTools (`tooling/fonts.py`, que usa el mismo subsetter que `pyftsubset`) de los tres TTF a WOFF2, recortados a:
  - `U+0000-024F`: latín básico, Latin-1 y Latin Extended A y B (galego, castellano, portugués);
  - `U+1E00-1EFF`: Latin Extended Additional;
  - `U+2000-206F`: puntuación general (comillas, rayas, puntos suspensivos);
  - `U+20AC`: euro.
- **Nombre:** *Implementado:* la licencia de Andika 6.200 reserva los nombres "Andika" y "SIL", y un recorte es una versión modificada. `tooling/fonts.py` cambia el nombre interno de la familia a **"Caderno Letra"**, que es también el de `@font-face`.
- **Ficheros:** `src/assets/fonts/caderno-letra-regular.woff2`, `caderno-letra-italic.woff2` y `caderno-letra-bold.woff2` (unos 70 KB cada uno), junto con `OFL.txt`, que indica la versión y el cambio de nombre.
- **Originales:** los TTF van en `tooling/fonts-src/` y no se versionan (`*.ttf` en `.gitignore`) ni se publican. El README indica de dónde se descargan y el comando de conversión.
- **`fonts.css`:** tres `@font-face` (400 normal, 400 italic y 700 normal) con `font-display: swap` y `unicode-range` igual al recorte.
- `--font-body: "Caderno Letra", system-ui, sans-serif`.

*Por qué:* 2,2 MB de fuentes para una página con un párrafo no tiene sentido, y menos en el móvil con el que se mirarán los dibujos. Con `swap` el texto se ve desde el primer momento.

*Alternativa descartada:* servir los TTF tal cual. Funciona, pero pesa entre 20 y 30 veces más.

### 4. Tokens reales y colores por función

`theme.css` queda así (lo nuevo, en negrita):

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#FFEDED` | fondo de la página |
| `--color-surface` | `#FFFFFF` | la hoja |
| `--color-text` | `#000000` | autoría, contadores, textos generales |
| **`--color-ink`** | `#290074` | texto del dibujo, como escrito a mano |
| **`--color-link`** | `var(--color-ink)` | enlaces |
| **`--color-focus`** | `var(--color-ink)` | contorno del foco |
| `--color-accent` | `#84FEFC` | **solo decoración** (sin uso en este change) |
| `--color-border` | `#FFDEDE` | bordes suaves |
| **`--shadow-sheet`** | sombra suave hacia abajo | sombra de la hoja |
| `--font-body` | `"Caderno Letra", system-ui, sans-serif` | |
| `--font-size-sm` | `0.9375rem` (15 px) | contadores |
| `--font-size-lg` | `1.25rem` (20 px) | texto y autoría del dibujo |
| **`--line`** | `1.875rem` (30 px) | interlineado del dibujo y paso de las anillas |
| **`--sheet-width`** | `29.25rem` (468 px) | ancho máximo de la hoja |
| **`--sheet-padding`** | `clamp(1rem, 9vw, 2.75rem)` | margen interior; 44 px a partir de ~490 px de ancho |
| **`--sheet-rings`** | `1.875rem` (30 px) | espacio extra de las anillas a la izquierda |

- `base.css`: los enlaces pasan a `--color-link` y el foco a `--color-focus`.
- `--color-accent` sobre blanco o `#FFEDED` tiene un contraste de ~1,3:1, así que no puede usarse para texto ni para el foco (spec "Textos con contraste suficiente"). Se queda como token decorativo para lo que llegue del resto del diseño.

### 5. Comprobación de contraste en un test

*Implementado:* en Vitest, `import "x.css?raw"` devuelve una cadena vacía porque Vitest no procesa CSS. El test de colores literales de `arquitectura-estilos` comprobaba ficheros vacíos y pasaba siempre. Los tests de estilos leen ahora las hojas del disco (`tests/files.ts`, con una declaración mínima de `node:fs` en `tests/node-fs.d.ts` para que `src/` no vea los tipos de Node), comprueban que no están vacías y viven en `tests/styles.test.ts`, que corre en el entorno de Node. La función de contraste está en `tooling/contrast.ts`.

Un test lee `theme.css`, resuelve los `var()` entre tokens de color y calcula el contraste WCAG de estos pares:
- `--color-text`, `--color-ink`, `--color-link` y `--color-text-muted` sobre `--color-surface` y sobre `--color-bg`: al menos 4,5:1;
- `--color-focus` sobre `--color-surface` y sobre `--color-bg`: al menos 3:1.

También comprueba que ningún componente ni `base.css` usa `--color-accent` en `color`, `outline` ni `outline-color`. El cálculo es una función pura con sus propios casos (negro sobre blanco 21:1, blanco sobre blanco 1:1).

### 6. Autoría del dibujo con un modificador

En el dibujo, nombre y fecha van a 20/30 y la fecha en el color del texto, no atenuada. Como `byline` es compartido con las respuestas y el índice, el aspecto va en un modificador, `byline--large`, que añade `drawing-view.ts`. La alineación a la derecha es colocación, así que va en `.post__byline`. Los contadores (`.post__stat`) van a la derecha y en `--font-size-sm`.

### 7. Texto del contador

En `src/lib/i18n.ts`: `likes: { one: "Fiz feliz a {n} amiga 🥰", other: "Fiz feliz a {n} amigas 🥰" }`. Figma pone el emoji 1 px más pequeño que el texto; no se reproduce.

## Risks / Trade-offs

- **[La tira de anillas no casa al repetirse]** → La tarea de la tira incluye pintar tres periodos seguidos y compararlos con la hoja de Figma antes de usarla.
- **[fontTools necesita `brotli` para escribir WOFF2]** → Comprobarlo antes de convertir. Si no está, instalarlo con `pip`; el README lo menciona.
- **[Un recorte demasiado agresivo deja fuera un carácter que alguien escribe]** → El rango cubre todo Latin Extended; un carácter fuera de él cae en la fuente del sistema, no desaparece.
- **[El ancho de 468 px es justo en móviles pequeños]** → La hoja ocupa todo el ancho disponible y el margen interior escala con `clamp()`. Verificación visual a 360 px.
- **[La sombra en CSS no es idéntica a la del PNG]** → Se acepta (Non-Goals).

## Migration Plan

Se publica como siempre. Para volver atrás, "Publish deploy" de un deploy anterior en Netlify. No hay datos ni cachés que migrar.

## Open Questions

- Para qué se usará el cian de `--color-accent` cuando llegue el resto del diseño (respuestas, pager, índice). En este change no se usa.
