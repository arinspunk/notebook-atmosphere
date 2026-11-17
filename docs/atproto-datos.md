# Datos de un post atproto: referencia para O Meu Caderno

Leyenda de origen:

- **R**: record guardado en un PDS.
- **V**: vista que devuelve el AppView.
- **Q**: requiere una consulta aparte.
- **App**: lo calcula la app.

La columna **¿Mostrar?** recoge lo que se ve en la primera versión del sitio (change `caderno-mvp`). "Filtra" significa que el dato no se muestra pero decide qué se ve.

---

## 1. El post (el dibujo)

### 1.1 Record `app.bsky.feed.post` (en tu PDS)

| Campo | Origen | Qué es | ¿Mostrar? |
|---|---|---|---|
| `text` | R | Texto del post, hasta 300 grafemas | Sí, limpio: sin hashtags y sin espacios sobrantes |
| `createdAt` | R | Fecha de publicación según el cliente | Sí, junto al nombre del niño: relativa, con la fecha absoluta en un tooltip |
| `facets[]` | R | Partes "ricas" del texto (ver 1.2) | No. Filtra: buscar `#caderno` y el nombre, quitar tags y crear enlaces |
| `tags[]` | R | Hashtags que no aparecen en el texto, hasta 8 | No. Filtra: buscar `#caderno` y el nombre |
| `langs[]` | R | Idiomas del post, hasta 3 (ej. `gl`, `es`) | No |
| `labels` | R | Autoetiquetas de contenido sensible | No |
| `reply.root` / `reply.parent` | R | Solo en respuestas: a qué hilo y a qué post responde | No. Filtra: un post con `reply` no es un dibujo |
| `embed` | R | Imágenes, vídeo, enlace o cita (ver 1.3) | Solo la primera imagen (ver 1.3) |

### 1.2 Facets (dentro del texto)

| Tipo | Qué contiene | Ejemplo |
|---|---|---|
| `#tag` | `tag` | `caderno`, `lucia` |
| `#mention` | `did` de la persona mencionada | `@abuela.bsky.social` |
| `#link` | `uri` | un enlace web |
| `index` | `byteStart`, `byteEnd` | Posición en el texto, para poder quitar los tags al mostrarlo |

Al mostrar el texto:

- **Enlaces** (`#link`): se pueden pulsar, solo si son `http` o `https`, y se abren en una pestaña nueva.
- **Menciones**: como texto, sin enlace.
- **Tags**: en los posts del cuaderno se eliminan todos. En las respuestas de otros se dejan como texto.

### 1.3 Embed: el dibujo (record y vista)

**Imágenes** (hasta 4)

| Campo | Origen | Qué es | ¿Mostrar? |
|---|---|---|---|
| `image` | R | Blob en tu PDS: CID, tipo y tamaño | No: se usa la URL de CDN del AppView |
| `alt` | R/V | Texto alternativo | Sí, como atributo `alt` de la imagen |
| `aspectRatio` | R/V | `width`, `height` | No. Se usa para reservar el hueco antes de que cargue |
| `thumb` | V | URL de la miniatura (CDN) | Sí, en el índice |
| `fullsize` | V | URL en tamaño completo (CDN) | Sí, en la página del dibujo. **Solo la primera imagen** |

**Vídeo** (en lugar de imágenes)

| Campo | Origen | Qué es | ¿Mostrar? |
|---|---|---|---|
| `video` | R | Blob del vídeo | No, fuera de esta fase |
| `captions[]` | R | Subtítulos por idioma | No |
| `alt` | R/V | Texto alternativo | No |
| `aspectRatio` | R/V | Proporción | No |
| `playlist` | V | URL de streaming (HLS) | No |
| `thumbnail` | V | URL de la imagen de portada | No |

**Otros embeds**, que no se muestran en esta fase:

- **external**: tarjeta de enlace, con `uri`, `title`, `description` y `thumb`.
- **record**: cita de otro post.
- **recordWithMedia**: cita más imágenes.

### 1.4 Vista del post `postView` (AppView)

| Campo | Origen | Qué es | ¿Mostrar? |
|---|---|---|---|
| `uri` | V | `at://<did>/app.bsky.feed.post/<rkey>` | No |
| `cid` | V | Hash del contenido | No. Filtra: se compara con el `subject.cid` del like (ver 5.1) |
| `rkey` | dentro del uri | Identificador corto, basado en la fecha | No. Se usa en la URL de cada dibujo (`#/d/<rkey>`) |
| `record` | V | El record de 1.1, tal cual | Ver 1.1 |
| `author` | V | Quién lo publicó (ver sección 4) | No en el dibujo: se muestra el nombre del niño. Filtra: si es el cuaderno |
| `embed` | V | La vista del embed (ver 1.3) | Ver 1.3 |
| `likeCount` | V | Número de likes | Sí, como "Fiz feliz a N amigas", en singular o plural. Oculto si es 0 |
| `replyCount` | V | Número de respuestas, **incluye las ocultas y las pendientes** | No |
| `repostCount` | V | Número de reposts | Sí, sumado a `quoteCount` como "compartido X vezes". Oculto si la suma es 0 |
| `quoteCount` | V | Número de citas | Sí, sumado a `repostCount` |
| `bookmarkCount` | V | Número de guardados | No |
| `indexedAt` | V | Cuándo lo vio el AppView | No: la fecha que se muestra es `createdAt` |
| `labels` | V | Etiquetas de moderación de terceros | No. Filtra solo en las respuestas, nunca en los dibujos |
| `threadgate` | V | Reglas del hilo (ver sección 3) | No. Filtra: `hiddenReplies` |
| `viewer` | V | Solo con sesión iniciada: si tú le diste like, etc. No aplica a vuestra app | No |

**No existe:** número de visualizaciones, historial de ediciones ni ubicación.

---

## 2. Las respuestas (`getPostThread`)

Cada respuesta es **un post completo**, con todo lo de la sección 1 más lo siguiente. De cada respuesta visible **solo se muestran el texto, el nombre del autor y la fecha**. No se muestran imágenes, vídeo, tarjetas de enlace, citas, contadores ni avatar.

| Campo | Origen | Qué es | ¿Mostrar? |
|---|---|---|---|
| `post` | V | El `postView` de la respuesta | Solo `record.text`, `record.createdAt` y el nombre del autor |
| `parent` | V | El post al que responde | No. Filtra: sin padre visible, la respuesta no se ve |
| `replies[]` | V | Las respuestas a esta respuesta (recursivo) | Sí, aplanadas en la tarjeta con un nivel de sangría |
| `threadContext.rootAuthorLike` | V | Si el autor del dibujo (el cuaderno) dio like a esta respuesta. **No se usa para aprobar:** probablemente trae solo la URI del like, sin `cid`, y puede que otros AppViews no lo implementen. La fuente son los likes del cuaderno en su PDS (ver 5.1) | No |
| `notFoundPost` | V | Respuesta borrada o inaccesible | No. Cuenta como no visible, así que tampoco se ve lo que cuelga de ella |
| `blockedPost` | V | Respuesta de una cuenta bloqueada | No. Igual que `notFoundPost` |

Parámetros de la llamada: `depth`, que es cuántos niveles de respuestas devuelve, y `parentHeight`, cuántos posts padre devuelve hacia arriba. Se pide `depth=1000` y `parentHeight=0`.

---

## 3. Reglas del hilo (records en tu PDS, con el mismo rkey que el post)

### 3.1 `app.bsky.feed.threadgate`

| Campo | Qué es |
|---|---|
| `post` | URI del dibujo |
| `allow[]` | Quién puede responder: `mentionRule`, `followerRule`, `followingRule`, `listRule`. Si no aparece, todos; si es `[]`, nadie. **No se usa:** las respuestas quedan abiertas a cualquiera |
| `hiddenReplies[]` | URIs ocultadas con "Ocultar para todos", hasta 300. **Filtra:** lo que está aquí no se ve nunca |
| `createdAt` | Fecha |

### 3.2 `app.bsky.feed.postgate`

| Campo | Qué es |
|---|---|
| `post` | URI del dibujo |
| `embeddingRules[]` | `disableRule` impide que lo citen |
| `detachedEmbeddingUris[]` | Citas desvinculadas |
| `createdAt` | Fecha |

No se usa en esta fase.

---

## 4. Personas (autor del post y de las respuestas)

### 4.1 Vista corta `profileViewBasic`, la que viene dentro de cada post

| Campo | Qué es | ¿Mostrar? |
|---|---|---|
| `did` | Identificador permanente | No. Filtra: si el autor es el cuaderno |
| `handle` | `@nombre.bsky.social` o un dominio propio | Sí, solo si no hay `displayName` |
| `displayName` | Nombre visible | Sí, en las respuestas de otros. En las del cuaderno se usa el nombre de su tag (ver sección 6) |
| `avatar` | URL de la foto de perfil | No: puede cambiar después del like |
| `pronouns` | Pronombres, si los ha puesto | No |
| `createdAt` | Fecha de creación de la cuenta | No |
| `labels` | Etiquetas de moderación | No. Filtra: las etiquetas de la cuenta que ocultan hacen invisibles sus respuestas |
| `verification` | Verificación (marca azul y similares) | No |
| `associated` | Si es labeler, si tiene chat activado, etc. | No |
| `viewer` | Solo con sesión iniciada: si la sigues, si la bloqueas… | No |

### 4.2 Perfil completo `getProfile`

Q, llamada aparte. Incluye todo lo de 4.1 más lo siguiente. **No se pide ni se muestra en esta fase.**

| Campo | Qué es | ¿Mostrar? |
|---|---|---|
| `description` | Biografía | No |
| `banner` | Imagen de cabecera | No |
| `website` | Web | No |
| `followersCount` | Número de seguidores | No |
| `followsCount` | Número de cuentas a las que sigue | No |
| `postsCount` | Número de posts | No |
| `pinnedPost` | Post fijado | No |

---

## 5. Interacciones (records en el PDS de quien interactúa)

### 5.1 Likes

| Dato | Origen | Qué es | ¿Mostrar? |
|---|---|---|---|
| `subject` (uri, cid) | R | A qué post se dio like | No. Filtra, en los likes del cuaderno |
| `createdAt` | R | Cuándo | No |
| `getLikes` → `likes[]` | Q | Lista de quién dio like: `actor` (perfil), `createdAt` e `indexedAt` | No: serían perfiles sin revisar |
| `likeCount` | V | Solo el número, ya viene en el post | Sí, en el dibujo (ver 1.4) |
| Likes del cuaderno | R | `com.atproto.repo.listRecords` de `app.bsky.feed.like` en el PDS del cuaderno. **Fuente de la aprobación.** Carga incremental: los rkeys van ordenados por fecha, así que se piden solo los likes nuevos y se para al llegar a lo ya cacheado. Cada 24 h se recargan todos, para detectar los likes retirados. Un like aprueba un post solo si su `subject.cid` coincide con el `cid` actual del post | No. Filtra |

Ojo: los likes no pasan por el filtro de moderación. Cualquiera puede dar like. Por eso solo se muestra el número.

### 5.2 Reposts

| Dato | Origen | Qué es | ¿Mostrar? |
|---|---|---|---|
| `subject`, `createdAt` | R | Qué se compartió y cuándo | No |
| `getRepostedBy` → `repostedBy[]` | Q | Quién lo compartió | No: serían perfiles sin revisar. Solo se muestra el contador (ver 1.4) |

### 5.3 Citas

| Dato | Origen | Qué es | ¿Mostrar? |
|---|---|---|---|
| `getQuotes` → `posts[]` | Q | Posts que citan el dibujo, cada uno completo | No: contenido sin revisar. Solo cuentan en "compartido X vezes" |

### 5.4 Seguidos del cuaderno

**Ya no se usa para la visibilidad**: la única aprobación es el like. Se deja como referencia.

| Dato | Origen | Qué es |
|---|---|---|
| `getFollows(cuaderno)` → `follows[]` | Q | Perfiles a los que sigue el cuaderno |

---

## 6. Datos que calcula la app

| Dato | De dónde sale | ¿Mostrar? |
|---|---|---|
| **Nombre** | Primer tag (facets o `tags[]`, sin distinguir mayúsculas) que coincide con la lista de nombres de la configuración. Si ninguno coincide, el genérico "o caderno" | Sí: en el dibujo, junto a la fecha; en las respuestas del cuaderno, como firma |
| **Texto limpio** | `text` sin los facets `#tag` y sin espacios sobrantes, solo en los posts del cuaderno | Sí |
| **Fecha relativa** | `createdAt`: "agora" por debajo de 60 s; después minutos, horas, días y meses; a partir de un año, fecha corta. Igual que `atproto-comments/src/date.ts` | Sí, con la fecha y la hora absolutas en un tooltip |
| **Estado de cada respuesta** | Visible, pendiente u oculta, según las reglas del anexo | No. Filtra |
| **Número de mensajes visibles** | Respuestas que pasan el filtro (no `replyCount`) | No |
| **Tarjetas** | Respuestas directas al dibujo, con sus descendientes aplanados | Sí: una tarjeta por respuesta directa y los descendientes con una sangría |
| **Índice del cuaderno** | Todos los dibujos, del más reciente al más antiguo | Sí, en una página secundaria: miniatura, nombre y fecha |
| **Anterior / siguiente** | Posición del dibujo en el orden del índice | Sí, como enlaces en la página del dibujo |

---

## Anexo: decisiones tomadas hasta ahora

### Datos y catálogo

- **Datos:** PDS en Eurosky; AppView configurable (Bluesky hoy, Blacksky como alternativa); app solo cliente.
- **Qué entra:** posts del cuaderno con `#caderno` que no son respuestas. Los tags se buscan en `facets` y en `tags[]`, sin distinguir mayúsculas.
- **Nombres:** los da una lista fija de configuración (tag y nombre). Si el post no lleva ningún tag de la lista, o lleva uno que no está, se usa el genérico "o caderno". Vale para los dibujos y para las respuestas del cuaderno.
- **Navegación:** la home muestra el dibujo más reciente. Cada dibujo tiene su URL, con flechas al anterior y al siguiente. El índice es una página secundaria.

### Moderación

- **Objetivo del filtrado:** que los niños no vean nada que no haya revisado el cuaderno. Cualquiera, también desconocidos, puede responder en atproto, pero nada pasa a la app sin aprobación.
- **Visibilidad de cada respuesta**, decidida en una pasada desde la raíz hacia abajo:
  - **Oculta** si está en `hiddenReplies`, si el post o la cuenta del autor tiene una etiqueta de moderación que oculta (`!hide`, `!no-promote`, `porn`, `sexual`, `graphic-media`, `nudity`), o si su padre no es visible.
  - **Visible** si la escribe el cuaderno o si el cuaderno le dio like.
  - **Pendiente** en cualquier otro caso. No se ve.
  - Consecuencia: si el cuaderno responde a una respuesta pendiente, su respuesta tampoco se ve hasta que dé like a esa respuesta.
- **Etiquetas de moderación:** solo se aplican a las respuestas. Un dibujo del cuaderno con una etiqueta (por ejemplo, un falso positivo de `nudity`) se sigue mostrando.
- **Aprobación por like:** el like vale solo si su `subject.cid` coincide con el `cid` actual del post. Así la aprobación cubre exactamente el contenido revisado.
- **Fuente de los likes:** los likes del cuaderno se leen de su PDS, con caché incremental que se recarga entera cada 24 h. No se usa `rootAuthorLike` y no hay aprobación por follow.
- **Retirar algo:** "Ocultar para todos" (`hiddenReplies`) tiene efecto en la siguiente carga. Quitar el like tarda como mucho 24 h en tener efecto, por la caché.
- **Ante un fallo, nada sin revisar se ve:** si no se pueden leer los likes y no hay caché de menos de 24 h, solo se ven las respuestas del cuaderno.
- **Respuestas abiertas:** sin threadgate restrictivo.

### Presentación

- **Dibujo:** primera imagen, texto sin hashtags, nombre y fecha, "Fiz feliz a N amigas" (`likeCount`) y "compartido X vezes" (`repostCount` + `quoteCount`). Los contadores se ocultan si valen 0.
- **Respuestas:** tarjetas con un solo nivel de anidación, ordenadas de la más antigua a la más reciente. Cada respuesta muestra solo texto, nombre y fecha. Si trae imagen, no se muestra. Las respuestas que solo tienen imagen no se aprueban.
- **Enlaces:** se pueden pulsar. Se acepta el riesgo de que la web de destino cambie. Las menciones van como texto.
- **Autor de las respuestas:** `displayName`, o `handle` si no lo tiene. Sin avatar, porque puede cambiar después del like.
- **Fechas:** como en `atproto-comments`, con la fecha absoluta en un tooltip.
- **Idioma:** textos de la interfaz localizables, con `gl` por defecto.
- **Sin estilos** en esta fase: el segundo nivel de las tarjetas se marca solo con sangría.

### Fuera de esta fase

- Diseño visual (hoja de cuaderno, pósits de colores).
- Más de una imagen por dibujo.
- Pósits con imagen en las respuestas.
- Vídeo.
- Filtro del índice por niño.

### Pendiente de comprobar

- Que desde la app de Bluesky se puede ocultar cualquier respuesta del hilo, no solo las directas al dibujo.
- Que el PDS de Eurosky permite CORS en `listRecords`.
