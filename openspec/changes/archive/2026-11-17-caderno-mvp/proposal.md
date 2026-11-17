# Proposal

## Why

O Meu Caderno publica en atproto los dibujos de los niños desde una cuenta propia (el "cuaderno", con PDS en Eurosky), y cualquiera, también desconocidos, puede responderles desde Bluesky u otra app. Falta el sitio donde los niños ven sus dibujos y los mensajes que reciben, con la garantía de que **nada llega a la app sin que el cuaderno lo haya revisado antes**. Esta primera versión deja el sitio funcional, sin estilos específicos, para validar los datos y las reglas antes de entrar en el diseño.

## What Changes

- Nuevo sitio estático en TypeScript + Vite, sin framework y sin backend: la app es solo cliente y lee de dos fuentes configurables, el PDS del cuaderno y un AppView (Bluesky hoy, Blacksky como alternativa).
- Catálogo de dibujos: entran los posts del cuaderno con `#caderno` (en `facets` o en `tags[]`, sin distinguir mayúsculas) que no son respuestas. El nombre del niño sale del tag que coincide con una lista fija de configuración; si no hay coincidencia, se usa el genérico "o caderno".
- Navegación: la home muestra el dibujo más reciente; cada dibujo tiene su propia URL y flechas para ir al anterior y al siguiente; una página secundaria hace de índice de todos los dibujos.
- Página de dibujo: primera imagen, texto sin hashtags, nombre del niño y fecha, contador de likes ("fiz feliz a N amigas") y contador de veces compartido (reposts + citas), ocultos si valen 0.
- Moderación de respuestas: una respuesta solo se ve si la escribe el cuaderno o si el cuaderno le dio like, y el like vale solo si su `cid` coincide con el del post. Se ocultan siempre las respuestas que estén en `hiddenReplies`, las que tengan etiquetas de moderación que ocultan y las que no tengan el padre visible. Los likes del cuaderno se leen de su PDS, con caché incremental.
- Presentación de respuestas: tarjetas por cada respuesta directa al dibujo, con sus descendientes visibles aplanados en un único nivel con sangría. Cada respuesta muestra solo texto (con enlaces que se pueden pulsar), nombre y fecha; sin avatar. Las respuestas del cuaderno se firman con el nombre de su tag de la lista, o "o caderno".
- Fechas como en `atproto-comments`: relativas ("agora", minutos, horas, días, meses) y fecha corta a partir de un año, con la fecha y hora absolutas en un tooltip.
- Textos de la interfaz localizables (i18n), con el idioma en la configuración.

Fuera de esta fase: estilos y diseño visual, más de una imagen por dibujo, imágenes en las respuestas, vídeo, filtro del índice por niño.

## Capabilities

### New Capabilities

- `drawing-catalog`: qué posts del cuaderno son dibujos, a qué niño se atribuyen, cómo se ordenan, el índice y la navegación entre dibujos.
- `drawing-page`: qué datos del dibujo se muestran y cómo (imagen, texto limpio, nombre, fecha, contadores).
- `reply-moderation`: reglas que deciden si cada respuesta es visible, oculta o pendiente, y de dónde salen los datos de aprobación.
- `reply-rendering`: presentación de las respuestas visibles (tarjetas, aplanado, texto, autoría y fecha).
- `ui-localization`: textos de la interfaz traducibles, plurales y formato de fechas.

### Modified Capabilities

Ninguna: no hay specs previas en el proyecto.

## Impact

- Proyecto nuevo: `package.json`, configuración de Vite y TypeScript, código en `src/` y tests unitarios con Vitest.
- Reutiliza, adaptados, los módulos sin DOM de `atproto-comments` (MIT, mismo autor): `date.ts`, `text.ts`, `thread.ts` e `i18n.ts`.
- Dependencias de red en el navegador: XRPC públicos del PDS del cuaderno (`com.atproto.repo.listRecords`) y del AppView (`app.bsky.feed.getPostThread`, `app.bsky.feed.getPosts`). Sin sesión ni autenticación.
- `docs/atproto-datos.md` es la referencia de datos, con las columnas "¿Mostrar?" y el anexo ya alineados con este change.
