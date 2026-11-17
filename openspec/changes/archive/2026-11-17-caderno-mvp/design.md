# Design

## Context

El proyecto está vacío: solo hay `docs/atproto-datos.md` con la referencia de los datos de atproto. Ver proposal.md para la motivación y las specs para los requisitos.

Restricciones que dan forma al diseño:

- **Solo cliente.** No hay servidor propio: todo se pide desde el navegador a endpoints XRPC públicos, sin sesión.
- **Dos fuentes de datos.** El PDS del cuaderno (Eurosky) tiene los records del cuaderno: sus posts, sus likes y sus threadgates. El AppView (Bluesky o Blacksky, configurable) tiene lo que escriben los demás: las respuestas, los perfiles, los contadores y las URLs de imagen en CDN.
- **El filtrado tiene que fallar cerrado.** El público son niños. Ante cualquier duda o error, una respuesta no se muestra.
- Ya existe `atproto-comments` (TypeScript, MIT, mismo autor), con módulos sin DOM que resuelven problemas iguales: fechas relativas, troceado de facets, `hiddenReplies`, etiquetas e i18n.

## Goals / Non-Goals

**Goals:**

- Toda la lógica de decisión (qué es un dibujo, a quién se atribuye, qué respuesta se ve, cómo se aplana, cómo se formatea) en funciones puras, sin DOM ni red, y cubierta por tests unitarios.
- Cambiar de AppView solo con configuración.
- Que una página de dibujo cueste pocas peticiones: el hilo y los likes, estos con caché incremental.

**Non-Goals:**

- Estilos o diseño visual. El HTML es semántico y sin CSS propio, salvo la sangría del segundo nivel.
- Caché del catálogo entre visitas y modo offline.
- Renderizado en servidor o generación estática de páginas por dibujo.
- Indicadores de moderación en la app. La revisión se hace desde Bluesky.

## Decisions

### 1. Stack: TypeScript + Vite, sin framework

Vite para el servidor de desarrollo y el build estático, y Vitest para los tests. El DOM se construye con `document.createElement` y `textContent`.

- *Por qué:* es el mismo lenguaje y estilo que `atproto-comments`, sin capa de componentes que más adelante pueda condicionar la UI.
- *Alternativas:* SvelteKit (más andamiaje, y no hace falta reactividad) y Astro (pensado para contenido generado en build, mientras que aquí todo se carga en el cliente).

### 2. Ningún contenido ajeno pasa por `innerHTML`

Todo texto que venga de la red se inserta con `textContent`. Los enlaces se crean con `href` solo si el esquema es `http:` o `https:`, y con `target="_blank" rel="noopener noreferrer"`.

Como defensa adicional:

- `index.html` declara una Content-Security-Policy que limita `connect-src` al PDS y al AppView configurados e `img-src` al CDN de imágenes. Se mantiene a mano junto a `src/config.ts`.
- El rkey de la ruta se valida con el formato de rkey de atproto antes de usarlo en una URL; si no es válido, se trata como dibujo no encontrado.

- *Por qué:* el texto de las respuestas lo escriben desconocidos. Aunque las aprobamos con un like, el sitio no debe depender de que el like detecte un ataque XSS.

### 3. Configuración en un módulo tipado

`src/config.ts` exporta un objeto con estos campos:

- `did` del cuaderno.
- `pdsUrl` (Eurosky).
- `appviewUrl` (por defecto `https://public.api.bsky.app`).
- `lang` (por defecto `gl`).
- `strings` opcionales, para sobrescribir cadenas.
- `nombres`: lista de `{ tag, nombre }`.

Se fijan el `did` y el `pdsUrl` y no se resuelven en tiempo de ejecución, así cada visita se ahorra una petición al directorio PLC.

- *Alternativa:* un `config.json` que se carga en tiempo de ejecución. Permitiría cambiar la lista sin recompilar, pero de todas formas hay que volver a desplegar, y se pierde el tipado.

### 4. Rutas por hash

Las rutas son `#/` (home, dibujo más reciente), `#/d/<rkey>` (un dibujo) y `#/indice`. Cada dibujo se identifica por su rkey, y su URI se reconstruye como `at://<did>/app.bsky.feed.post/<rkey>`.

- *Por qué:* funciona en cualquier hosting estático sin reglas de reescritura, y las URLs se pueden recargar y compartir.
- *Alternativa:* History API con rutas limpias. Exige configurar el servidor y no aporta nada en esta fase.

### 5. El catálogo sale del PDS

`com.atproto.repo.listRecords` de `app.bsky.feed.post`, con `limit=100`, paginando hasta el final. Se queda con los posts que no tienen `reply` y que llevan el tag `caderno` en facets o en `tags[]`. Se ordena por `createdAt` descendente y, a igual fecha, por rkey. El resultado se carga una vez por sesión de la página y se guarda en memoria.

- *Por qué:* no depende de `searchPosts`, que es lo menos portable entre AppViews, y el número de posts de un cuaderno familiar es pequeño.
- *Alternativa:* `getAuthorFeed` del AppView. Mezcla reposts, depende del AppView y su paginación es menos predecible.

### 6. Página de dibujo: `getPostThread` + likes en paralelo

- **Hilo:** `app.bsky.feed.getPostThread` con `depth=1000` y `parentHeight=0`, que es el máximo del endpoint. Así se cubre el aplanado de conversaciones profundas. El `postView` raíz trae la imagen en CDN y los contadores. El `threadgate` que trae el AppView no se usa (ver abajo).
- **Threadgate:** `com.atproto.repo.getRecord` de `app.bsky.feed.threadgate` con el mismo rkey del dibujo, en el PDS del cuaderno y en paralelo con el hilo. Que no exista el record significa que no hay threadgate: el PDS de Eurosky responde **400** con `error: "RecordNotFound"` (comprobado el 2026-11-16), y se acepta también un 404. Cualquier otro error es un fallo.
- **Continuaciones:** algunos AppViews (Blacksky) cortan el hilo antes de `depth`. Un nodo que llega sin la clave `replies` (no vacía: ausente) está cortado. Si ese nodo es **visible** tras la moderación, se pide `getPostThread` desde él y se injertan sus respuestas, y se repite con lo injertado. Bajo nodos ocultos o pendientes no se pide nada, así que el cierre ante fallos se mantiene. Si una continuación falla, esa rama se queda sin descendientes.
- **Likes:** se piden al mismo tiempo que el hilo (decisión 7).
- **Etiquetas:** toda petición al AppView envía la cabecera `atproto-accept-labelers` con el labeler de moderación de Bluesky (`did:plc:ar7c4by46qjdydhdevvrndac`), para que las etiquetas no dependan de los labelers por defecto de cada AppView.
- **Si falla el hilo:** se muestra un mensaje de error.
- **Si fallan los likes o el threadgate:** se aplica el cierre ante fallos (ver la spec `reply-moderation`).
- *Por qué el threadgate del PDS:* es la fuente autoritativa y la vía para retirar algo con urgencia ("Ocultar para todos") no puede depender de que un AppView lo hidrate o lo tenga al día.

### 7. Likes del cuaderno: caché incremental en `localStorage`

`listRecords` de `app.bsky.feed.like`, que devuelve primero lo más reciente.

- **Qué se guarda:** un mapa `uri del post -> conjunto de cids`, el rkey del like más reciente visto y la fecha de la última carga completa. La clave incluye el `did`.
- **Carga incremental:** se piden páginas hasta llegar a un rkey igual o anterior al último visto.
- **Carga completa:** si la última tiene más de 24 h, se descarta la caché y se vuelve a leer todo. Así entran los likes retirados, que una carga incremental no detecta.
- **Si falla la red:** se usa la caché si tiene menos de 24 h. Si no, se trata como si no hubiera likes.
- **Sin `localStorage`:** se hace una carga completa en memoria.
- **`localStorage` lleno (`QuotaExceededError`):** se sigue con el mapa en memoria, sin guardar, y se borra la entrada de la caché para no usar una a medias.
- *Por qué:* es independiente del AppView y trae el `cid`, que `rootAuthorLike` no da.
- *Alternativa:* `threadContext.rootAuthorLike`. No tiene `cid` y quizá no esté disponible en Blacksky.

### 8. Moderación en una sola pasada, de arriba abajo

Una función pura recibe el árbol del hilo, el `did` del cuaderno, el mapa de likes y el conjunto de `hiddenReplies` (leído del PDS), y clasifica cada nodo como visible, oculto o pendiente. La pasada empieza en la raíz y no baja por los nodos no visibles. El orden de las reglas es el de la spec:

```
oculta   <- hiddenReplies | etiqueta que oculta | padre no visible | nodo no threadViewPost
visible  <- autor == did del cuaderno | like con subject.cid == post.cid
pendiente <- resto
```

El conjunto de etiquetas y la forma de leerlas (las del post y las de la cuenta con `uri == did`) se reutilizan de `atproto-comments/src/thread.ts`. Solo se aplican a las respuestas.

### 9. Tarjetas: aplanado puro

Cada hijo visible de la raíz abre una tarjeta. Sus descendientes visibles se recogen en profundidad, se ordenan por `createdAt` ascendente y se presentan en un único nivel con sangría. Esto también es una función pura, separada de la moderación.

### 10. Texto: segmentos de facets y limpieza de tags

Se reutiliza `facetSegments` de `atproto-comments/src/text.ts`. Trabaja con offsets en bytes UTF-8 y descarta facets solapados o fuera de rango.

- **Posts del cuaderno** (dibujo y respuestas): se eliminan **todos** los segmentos de tag, se colapsan los espacios repetidos dentro de cada línea y se recortan los del principio y el final. Los saltos de línea se conservan. Por convención, el cuaderno solo usa `#caderno` y los tags de nombre.
- **Respuestas ajenas:** los tags y las menciones quedan como texto plano.

Por convención, cada post del cuaderno lleva como mucho un tag de nombre. La atribución lo busca en facets y en `tags[]`, comparando tras normalizar a NFC y pasar a minúsculas (para nombres con tilde, como `#Uxía`). Si por error hubiera más de uno, se usa el que aparece antes en la lista de configuración, para que el resultado sea determinista.

### 11. Miniaturas del índice: `getPosts` del AppView por lotes

El índice se pinta primero con el nombre y la fecha, que vienen del PDS. Después pide `app.bsky.feed.getPosts` en lotes de 25 URIs para obtener `thumb`.

- *Alternativa:* `com.atproto.sync.getBlob` del PDS. Sirve la imagen original, que puede pesar varios MB por miniatura.

### 12. i18n con plurales

Hay diccionarios por idioma (`gl` incluido y por defecto) con el patrón de `atproto-comments/src/i18n.ts`. Las cadenas con número tienen variantes por categoría de `Intl.PluralRules` (`one`, `other`…) y marcadores como `{n}`. La fecha relativa usa un patrón localizable (por ejemplo, `"há {t}"` en `gl`, que da "há 16 h") que no se aplica a "agora" ni a la fecha corta de más de un año. El cálculo se reutiliza de `atproto-comments/src/date.ts`, con los mismos umbrales. Se muestra en un `<time datetime>` con `title` para la fecha y hora absolutas.

### 13. Reutilización de `atproto-comments`: copiar y adaptar

Los módulos `date.ts`, `text.ts`, `thread.ts` e `i18n.ts` se copian en `src/lib/` con una cabecera que indica su origen y su licencia (MIT).

- *Por qué:* el paquete npm expone el custom element, no estas funciones, y aquí cambian algunas reglas (las etiquetas solo afectan a respuestas, la moderación es por like, se limpian los tags).
- *Alternativa:* publicar las funciones como un subpaquete. Merece la pena si los dos proyectos siguen compartiendo lógica.

## Risks / Trade-offs

- **[Riesgo]** Un like retirado puede seguir aprobando hasta 24 h en un navegador con caché.
  → **Mitigación:** para retirar algo con urgencia, "Ocultar para todos". `hiddenReplies` se lee en cada carga del hilo y tiene prioridad sobre el like.
- **[Riesgo]** El PDS de Eurosky no permite CORS en `listRecords`, o limita las peticiones.
  → **Mitigación:** comprobarlo con una llamada real antes de construir encima (tarea de verificación). Si falla, la alternativa sería un proxy mínimo, lo que rompería la premisa de "solo cliente" y obligaría a revisar el diseño.
  → **Comprobado (2026-11-16, tarea 1.1)** con la cuenta de pruebas `usoritual.com` (`did:plc:t3q3ylsnsser3o74xz42sdqk`, PDS `https://eurosky.social`): `listRecords` de `app.bsky.feed.post`, `app.bsky.feed.like` y `app.bsky.feed.threadgate` responde 200 con `Access-Control-Allow-Origin: *`; el preflight `OPTIONS` responde 204 con `GET` permitido. Límite: `RateLimit-Limit: 3000`. Ojo: el PDS devuelve `cursor` aunque la página tenga menos de `limit` registros, así que la paginación para cuando no hay `cursor` **o** la página llega vacía.
- **[Riesgo]** Blacksky responde distinto a `getPostThread` o `getPosts`, con otros campos o límites de `depth`.
  → **Mitigación:** guardar fixtures reales de los dos AppViews y probar la moderación con ambos.
  → **Observado (2026-11-16):** `https://api.blacksky.community` (CORS `*`) corta `getPostThread` a unos 5 niveles bajo la raíz aunque se pida `depth=1000`; el nodo cortado llega **sin** la clave `replies` (una hoja llega con `replies: []`). Pedir `getPostThread` desde ese nodo devuelve el resto. Bluesky devuelve los 7 niveles del mismo hilo. Fixtures: `tests/fixtures/real-thread-{bsky,blacksky}.json`.
  → **Observado (2026-11-17, sitio con Blacksky):** el catálogo, la navegación, el índice con miniaturas, la moderación y las continuaciones dan el mismo resultado que con Bluesky. Diferencia: Blacksky no devuelve `displayName` ni `avatar` de `xulioze.eurosky.social` (tampoco en `getProfile`), así que las respuestas se firman con el `handle`, como manda la spec. Parece que no tiene indexado ese record de perfil. Una respuesta nueva (`3n2hnayfaos2g`) se vio pendiente con los dos AppViews y pasó a visible en la siguiente carga tras el like, con la caché de likes ya creada (carga incremental). Verificado con la cuenta de pruebas `usoritual.com`; falta repetirlo con la cuenta definitiva.
- **[Riesgo]** No se pueda ocultar desde Bluesky una respuesta anidada, de modo que `hiddenReplies` solo cubra respuestas directas.
  → **Mitigación:** comprobarlo con una cuenta de pruebas. Si no se puede, retirar el like sigue funcionando, con el retraso de la caché.
  → **Comprobado (2026-11-17, tarea 1.3):** con `usoritual.com`, se ocultó desde Bluesky `3n2hn6lo7622g`, una respuesta de segundo nivel (responde a `3n2hlyc7pv225`, que responde al dibujo `3n2hlsmfo5k2w`). Su URI aparece en `hiddenReplies` del threadgate del dibujo en el PDS. Ocultar funciona también con respuestas anidadas, y el riesgo no se da.
- **[Riesgo aceptado]** El `displayName` y el `handle` de un autor ajeno pueden cambiar después del like, y el `cid` no los cubre. Se acepta porque un nombre tiene poco alcance.
  → **Mitigación:** si un cambio de nombre fuera un problema, "Ocultar para todos" retira la respuesta en la siguiente carga.
- **[Riesgo]** Los AppViews no permiten la cabecera `atproto-accept-labelers` en CORS.
  → **Mitigación:** comprobarlo en la tarea de verificación. Si no se permite, documentar qué labelers aplica cada AppView por defecto.
  → **Comprobado (2026-11-16):** `public.api.bsky.app` y `api.blacksky.community` responden al preflight con `Access-Control-Allow-Headers: atproto-accept-labelers`, y los dos devuelven `atproto-content-labelers: did:plc:ar7c4by46qjdydhdevvrndac` (Bluesky añade `;redact`).
- **[Trade-off]** El cuaderno también da likes fuera de sus dibujos, así que la carga completa de likes y la caché crecen con el tiempo. A escala familiar son pocas páginas; si crece, se puede filtrar el mapa por los hilos de los dibujos.
- **[Trade-off]** El catálogo se lee entero en cada visita. Con cientos de posts son unas pocas peticiones, y si crece, se puede añadir caché con el mismo patrón que los likes.
- **[Trade-off]** Un hilo con más niveles que `depth` se cortaría. Con 1000 niveles no es realista en un cuaderno familiar.
- **[Trade-off]** Los hashtags y nombres de los niños son públicos en atproto. Es una decisión ya aceptada, fuera del alcance del sitio.

## Migration Plan

Proyecto nuevo, no hay nada que migrar. El build genera un directorio estático que se puede publicar en cualquier hosting, y para volver atrás basta con desplegar la versión anterior.

Se publica en **Netlify** (decidido el 2026-11-17). `netlify.toml` fija el build (`npm run build`), la carpeta publicada (`dist`) y la versión de Node. Con las rutas por hash no hacen falta reglas de redirección. Para volver atrás se usa "Publish deploy" sobre un deploy anterior en el panel de Netlify.

## Open Questions

- La URL exacta del PDS de Eurosky y el `did` del cuaderno, que se rellenan en la configuración.
- La URL del AppView de Blacksky.
