# Tasks

## 1. Pintado en dos fases

- [x] 1.1 Separar la vista del dibujo en la parte del catálogo (texto, nombre, fecha, flechas y hueco de imagen con `aspect-ratio` del record, también en `recordWithMedia`) y la parte de la red (imagen en el hueco, contadores y tarjetas, o el mensaje `threadError`), según la decisión 1. Verificar con tests de DOM: el hueco tiene la proporción del record antes de tener la imagen; un record sin `aspectRatio` no reserva hueco y no da errores; al rellenar, la imagen ocupa el mismo hueco; con el hilo fallido se ven el texto, las flechas y el mensaje de error.
- [x] 1.2 Cambiar `startApp` para que, al navegar entre dibujos con el catálogo ya cargado, pinte al momento la parte del catálogo y rellene después la de la red, sin "A carregar…", y que un relleno tardío no pise otro dibujo. Verificar con tests de DOM con `fetch` lento simulado: justo después del cambio de hash ya están el texto y el nombre del nuevo dibujo y no hay "A carregar…"; si se cambia dos veces seguidas, solo se rellena el último dibujo.

## 2. Precarga de vecinos

- [x] 2.1 Guardar durante 60 s el resultado de `loadDrawing` por rkey (decisión 2): promesa compartida mientras está en curso, edad contada desde el lanzamiento, resultados `error` sin guardar, edad negativa tratada como caducada, `clear()` y reloj inyectable. Verificar con tests con `fetch` y reloj simulados: un segundo `loadDrawing` a los 59 s no hace peticiones y a los 60 s las repite; dos llamadas simultáneas hacen una sola carga; un hilo fallido no se guarda y el siguiente intento vuelve a pedir; un reloj que retrocede invalida la entrada.
- [x] 2.2 Precargar el anterior y el siguiente al terminar el pintado de un dibujo, por `loadDrawing` y con la precarga de su imagen, ignorando sus errores y sin precargar desde el índice (decisión 3). Verificar con tests con `fetch` simulado: tras pintar un dibujo intermedio se piden los hilos de sus dos vecinos; al navegar a uno de ellos se pinta completo sin peticiones nuevas; un clic en mitad de la precarga reutiliza la carga en curso; un fallo de precarga no muestra nada y el clic vuelve a pedir; con el reloj a +2 min, el clic vuelve a pedir.

## 3. Vuelta del segundo plano

- [x] 3.1 Añadir a `memoCatalog` una forma de descartar el catálogo guardado. Escuchar `visibilitychange` y `pageshow` (`persisted`, con el momento apuntado en `pagehide`). Si la página estuvo oculta más de 10 minutos, descartar el catálogo y la memoria de dibujos y volver a pintar la ruta actual (decisión 4). Verificar con tests: oculta 11 min y vuelve, se vuelven a pedir el catálogo y el dibujo y una respuesta ocultada entretanto no se ve; oculta 2 min y vuelve, no hay peticiones; `pageshow` con `persisted` tras 11 min hace lo mismo; si llegan los dos eventos, solo se carga una vez.

## 4. Documentación e integración

- [x] 4.1 Actualizar la sección "Moderar los mensajes" del README: "Ocultar" se ve al recargar o al navegar (como mucho 1 minuto después si el dibujo ya estaba preparado); una página que sigue abierta no se actualiza sola, pero sí al volver tras más de 10 minutos en segundo plano; quitar un like, como mucho en 24 h. Verificar que el texto coincide con la spec `reply-moderation`.
- [x] 4.2 Verificar en `npm run dev`, con Chrome y la cuenta de pruebas, que al pulsar las flechas no aparece "A carregar…" y que el vecino precargado se pinta completo al momento; que tras ocultar una respuesta desde Bluesky deja de verse al navegar a su dibujo pasado un minuto; y que con la pestaña oculta más de 10 minutos la página se recarga al volver.
