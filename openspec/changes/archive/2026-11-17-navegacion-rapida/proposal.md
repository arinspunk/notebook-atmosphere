# Proposal

## Why

Al pasar de un dibujo a otro, la página entera se sustituye por "A carregar…" y espera al hilo, a los likes y al threadgate. Con Bluesky son unos 250 ms, sobre todo por el PDS de Eurosky; con Blacksky y un hilo largo, cerca de un segundo. Se nota como un parpadeo justo en el uso principal del sitio: mirar los dibujos con los niños, uno tras otro.

Además, una pestaña que se queda abierta de un día para otro enseña lo que había al cargarla, aunque entretanto se haya ocultado una respuesta. Este problema ya existe hoy y este change lo cubre.

El objetivo es quitar el parpadeo sin guardar datos de moderación más allá de un minuto, para no tener que gestionar su caducidad en una página abierta.

## What Changes

- **Pintar por partes:** al cambiar de dibujo, el texto, el nombre, la fecha y las flechas salen al instante del catálogo, que ya está en memoria. El hueco de la imagen se reserva con la proporción que trae el record del PDS. La imagen, los contadores y las respuestas aparecen cuando llegan del AppView y del PDS. Desaparece el "A carregar…" a pantalla completa al navegar entre dibujos.
- **Precarga de vecinos con vida corta:** después de pintar un dibujo, se cargan en segundo plano el anterior y el siguiente, y se precarga su imagen. Lo cargado se usa si tiene menos de 60 segundos; si no, se vuelve a pedir.
- **Vuelta del segundo plano:** si la app estuvo oculta (otra pestaña, pantalla bloqueada) más de 10 minutos, al volver se vuelve a cargar todo, catálogo incluido, como en una recarga.

Fuera de este change: caché del hilo o del catálogo más allá de lo anterior, modo sin conexión, indicador de "actualizando" y actualización automática de una página que sigue visible.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `drawing-catalog`: nuevos requisitos de navegación. Cambiar de dibujo muestra al instante los datos del catálogo y los vecinos se preparan por adelantado.
- `drawing-page`: el hueco de la primera imagen se reserva con la proporción del record del PDS desde que se muestra la página, antes de tener la URL del AppView.
- `reply-moderation`: nuevo requisito de frescura. Las respuestas se deciden con datos leídos como mucho 60 segundos antes de mostrarse, y una app que vuelve tras más de 10 minutos oculta se recarga.

## Impact

- **Código:**
  - `src/ui/drawing-view.ts`: separar la parte del catálogo de la del AppView y reservar el hueco de la imagen.
  - `src/app.ts`: pintado por partes, precarga de vecinos y vuelta del segundo plano.
  - `src/drawing-loader.ts`: guardar durante 60 segundos el resultado de `loadDrawing`, compartiendo las cargas en curso.
  - `src/catalog-loader.ts`: poder descartar el catálogo en memoria.
- **Red:** más peticiones en total por la precarga (hasta 2 dibujos vecinos por cada uno visto).
- **README:** la sección "Moderar los mensajes" explica los plazos nuevos de "Ocultar".
- **Sin cambios:** la caché de likes en `localStorage` (recarga completa cada 24 h), las reglas de moderación y el cierre ante fallos.
