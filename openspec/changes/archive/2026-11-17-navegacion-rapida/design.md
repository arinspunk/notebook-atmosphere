# Design

## Context

Ver proposal.md (Why) para la motivación y las specs para los requisitos.

Estado actual que condiciona el enfoque:

- **Catálogo:** `memoCatalog` (`src/catalog-loader.ts`) lo carga una vez por visita y lo guarda en memoria sin caducidad.
- **Dibujo:** `loadDrawing` (`src/drawing-loader.ts`) pide en cada navegación, en paralelo, el hilo (`getThread`), los likes (`loadLikes`, con caché incremental en `localStorage`) y el threadgate (`getHiddenReplies`). Después resuelve las continuaciones y calcula las tarjetas. Cada llamada trabaja sobre un árbol recién pedido.
- **Pintado:** `startApp` (`src/app.ts`) hace `root.replaceChildren("A carregar…")` en cada cambio de ruta y espera a todo antes de pintar. Un contador `generation` descarta los renders que se han quedado atrás.
- **Datos ya disponibles:** el record del PDS de cada dibujo (en el catálogo) tiene texto, facets, `createdAt` y `embed.images[0].aspectRatio`. La URL de la imagen en el CDN solo la da el AppView.
- **Tiempos medidos (2026-11-17):** hilo de Bluesky 50–330 ms, de Blacksky unos 480 ms; likes y threadgate de Eurosky 180–260 ms cada uno.

## Goals / Non-Goals

**Goals:**

- Quitar el parpadeo al navegar entre dibujos.
- Que la navegación al anterior o al siguiente sea instantánea en el uso normal (mirar un dibujo unos segundos y pasar al siguiente).
- Que ninguna respuesta se decida con un hilo o un threadgate de más de 60 segundos al mostrarse, sin temporizadores ni repintados de fondo.
- Que una pestaña que vuelve tras un rato largo en segundo plano no enseñe datos viejos.

**Non-Goals:**

- Que volver a un dibujo visto hace varios minutos sea instantáneo. Con el pintado por partes, el texto sale al momento y la imagen viene de la caché HTTP del navegador; solo las respuestas esperan a la red.
- Actualizar sola una página que sigue visible sin que nadie la toque. Es el comportamiento actual, y se acepta porque los niños usan la app con un adulto.
- Indicadores visuales de carga o de actualización.

## Decisions

### 1. Pintado en dos fases

La vista del dibujo se divide en dos partes:

- **Del catálogo:** texto limpio, nombre, fecha, flechas y un hueco para la imagen con `aspect-ratio` sacado de `record.embed.images[0].aspectRatio`, o de `media.images[0]` si el embed es `recordWithMedia`. Esta parte se pinta al momento al cambiar de dibujo.
- **De la red:** la imagen (en el hueco reservado), los contadores y las tarjetas se rellenan cuando `loadDrawing` resuelve. Si el hilo falla, ahí va el mensaje `threadError` y lo del catálogo se queda.

Si el dibujo ya estaba precargado, las dos fases ocurren en el mismo tick y no se ve ningún salto.

El "A carregar…" a pantalla completa solo queda para cuando no hay catálogo: la primera carga y la vuelta del segundo plano (decisión 4).

El contador `generation` sigue descartando lo que llega tarde, también el relleno de la segunda fase, para que una respuesta lenta no rellene el dibujo al que ya se ha cambiado.

### 2. Resultados de `loadDrawing` guardados 60 segundos

`loadDrawing` pasa por una memoria pequeña indexada por rkey. Cada entrada guarda la promesa del resultado y el momento en que se **lanzó** la carga.

- **Uso:** si la entrada tiene menos de 60 s, se devuelve su promesa, haya terminado o no. Así, un clic durante la precarga reutiliza la petición en curso.
- **Caducada o ausente:** se lanza una carga nueva y sustituye a la anterior.
- **Errores:** si el resultado es `state: "error"` (falló el hilo), la entrada se borra y el siguiente intento vuelve a pedir.
- **Edad negativa** (el reloj retrocede): se trata como caducada.
- **`clear()`** vacía todo. El reloj se inyecta para los tests.

Se guarda el resultado completo (`DrawingPageData`) y no las piezas por separado, porque el hilo, el threadgate y los likes se leen juntos y tienen la misma edad. Contar desde el lanzamiento es conservador: lo que se muestra nunca tiene más de 60 s más lo que tarde la carga.

Un resultado con el cierre ante fallos aplicado (threadgate o likes no disponibles) sí se guarda. Como mucho deja respuestas pendientes 60 s de más, que es fallar hacia el lado seguro, y evita añadir a `loadLikes` una forma de distinguir el fallo.

Las continuaciones no cambian: cada carga pide su propio árbol, así que una rama cuya continuación falla se queda sin descendientes solo en ese resultado, como mucho 60 s.

*Por qué 60 s:* cubre el uso normal (mirar un dibujo y pasar al siguiente) y mantiene "Ocultar para todos" casi inmediato. Con plazos de minutos habría que garantizar la frescura de una página abierta con temporizadores y repintados, que es la complejidad que este diseño evita.

*Alternativa:* una caché de 10 minutos por piezas (catálogo, hilo, threadgate, likes) con temporizador de repintado. Hace instantáneo volver a cualquier dibujo reciente, pero obliga a gestionar la edad de cada pieza, repintar en silencio una página abierta y aceptar que "Ocultar" tarde hasta 10 minutos.

### 3. Precarga de vecinos por el mismo camino

Cuando termina el pintado completo de un dibujo, se llama en segundo plano a `loadDrawing` del anterior y del siguiente. Como pasa por la memoria de la decisión 2, un clic posterior encuentra el resultado.

Además se precarga la imagen del vecino con `new Image().src`, en cuanto se conoce su URL, para que quede en la caché HTTP del navegador.

- Los errores de la precarga se ignoran: el clic lo volverá a intentar.
- No se precarga desde el índice ni encadenando: solo los dos vecinos del dibujo que se está viendo.
- La precarga de likes usa `loadLikes` como siempre. Con la caché de `localStorage` ya creada, es una consulta incremental pequeña.

### 4. Vuelta del segundo plano

Con `visibilitychange` se apunta cuándo se ocultó la página. Si al volver han pasado más de 10 minutos, se descartan la memoria de dibujos y el catálogo y se vuelve a pintar la ruta actual, como en una recarga (con "A carregar…" mientras llega el catálogo).

También se escucha `pageshow` con `persisted`, para Safari, que restaura páginas desde la caché de ida y vuelta (bfcache) sin `visibilitychange`. Para medir el tiempo fuera se apunta el momento en `pagehide`. Si llegan los dos eventos, el contador `generation` y las cargas compartidas evitan pintar o pedir dos veces.

`memoCatalog` gana una forma de descartar el valor guardado (por ejemplo, `reset()`). No tiene caducidad propia: los dibujos nuevos aparecen en la siguiente visita, al recargar o al volver tras más de 10 minutos fuera.

## Risks / Trade-offs

- **[Riesgo]** Una página que sigue visible enseña lo que había al cargarla, aunque se oculte una respuesta.
  → **Mitigación:** es el comportamiento actual. Navegar o recargar da datos de menos de 60 s, y volver tras más de 10 minutos en segundo plano recarga.
- **[Riesgo]** Algún navegador no envía `visibilitychange` ni `pageshow` al volver.
  → **Mitigación:** navegar sigue dando datos de menos de 60 s.
- **[Trade-off]** La precarga hace hasta 2 cargas de dibujo extra (hilo, threadgate y likes) por cada dibujo visto, más 2 imágenes. A escala familiar es poco.
- **[Trade-off]** Volver a un dibujo visto hace más de un minuto espera a la red para las respuestas (unos 250 ms con Bluesky). El texto y la imagen ya están.
- **[Trade-off]** Un fallo pasajero del threadgate o de los likes puede dejar respuestas pendientes hasta 60 s de más. Es el lado seguro.

## Migration Plan

No hay datos que migrar: la memoria nueva empieza vacía en cada visita. Se publica como el resto del sitio, y para volver atrás basta con desplegar la versión anterior.
