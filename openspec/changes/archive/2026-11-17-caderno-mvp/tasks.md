# Tasks

## 1. Comprobaciones con datos reales

- [x] 1.1 Llamar desde un navegador (origen `http://localhost`) a `com.atproto.repo.listRecords` del PDS de Eurosky del cuaderno para `app.bsky.feed.post` y `app.bsky.feed.like`, y a `com.atproto.repo.getRecord` de `app.bsky.feed.threadgate`. Llamar también a `getPostThread` de los dos AppViews con la cabecera `atproto-accept-labelers`. Verificar que todo responde con cabeceras CORS válidas (incluida la preflight de esa cabecera) y anotar el resultado en design.md (Risks). Si falla, parar y revisar el diseño antes de seguir.
- [x] 1.2 Guardar en `tests/fixtures/` respuestas reales de `getPostThread` (con respuestas anidadas, una oculta, una con like y una pendiente) y de `getPosts`, de `public.api.bsky.app` y del AppView de Blacksky. Verificar que los ficheros existen y que contienen `cid` en cada post. Los casos que no se pueden provocar con datos reales (etiqueta de cuenta después del like, `cid` reescrito, threadgate ausente en el AppView) se crean como fixtures sintéticas derivadas de las reales, marcadas como tales.
- [x] 1.3 Con una cuenta de pruebas, ocultar desde Bluesky una respuesta de segundo nivel y verificar en el threadgate del PDS si su URI aparece en `hiddenReplies`. Anotar el resultado en design.md (Risks).

## 2. Andamiaje del proyecto

- [x] 2.1 Crear el proyecto con Vite (plantilla vanilla-ts), TypeScript estricto y Vitest. Verificar que `npm run dev`, `npm run build` y `npm test` funcionan con un test trivial.
- [x] 2.2 Crear `src/config.ts` con el tipo de configuración (`did`, `pdsUrl`, `appviewUrl`, `lang`, `strings`, `nombres`) y los valores del cuaderno. Verificar que `tsc --noEmit` pasa.

## 3. Módulos reutilizados de atproto-comments

- [x] 3.1 Copiar y adaptar `date.ts` en `src/lib/`, con la cabecera de origen y licencia MIT, y con el patrón localizable de la fecha relativa ("há {t}"). Verificar con tests los umbrales (agora sin patrón, m, h, d, meses, fecha corta a partir de 365 días), la fecha no válida y la fecha absoluta del tooltip.
- [x] 3.2 Copiar y adaptar `i18n.ts` con diccionario `gl` por defecto, cadenas sobrescribibles, plurales con `Intl.PluralRules` y caída a `gl` si el idioma no existe. Verificar con tests "Fiz feliz a 1 amiga" y "Fiz feliz a 2 amigas", una cadena sobrescrita y un idioma desconocido.
- [x] 3.3 Copiar y adaptar `text.ts` (`facetSegments`) y añadir la limpieza de tags y espacios para los posts del cuaderno. Verificar con tests los offsets UTF-8 con emojis, los tags al final, los saltos de línea conservados, los enlaces solo `http`/`https` y los facets solapados.

## 4. Catálogo de dibujos

- [x] 4.1 Implementar como funciones puras el filtro de dibujos (tag `caderno` en facets o `tags[]`, sin distinguir mayúsculas, sin `reply`), la atribución de nombre con la lista (NFC y sin distinguir mayúsculas, el primero de la lista si hubiera varios) y "o caderno" como valor por defecto, y el orden por `createdAt` y rkey. Verificar con tests todos los escenarios de `specs/drawing-catalog`.
- [x] 4.2 Implementar el cliente XRPC del PDS (`listRecords` paginado) y la carga del catálogo en memoria. Verificar con tests con `fetch` simulado que se recorren todas las páginas y que un error devuelve un estado de error.
- [x] 4.3 Implementar el cálculo de anterior y siguiente para un rkey, y la búsqueda de un rkey inexistente. Verificar con tests los extremos (el más reciente, el más antiguo) y un rkey que no está en el catálogo.

## 5. Moderación y tarjetas

- [x] 5.1 Implementar la clasificación del árbol (oculta, visible o pendiente) en una pasada de arriba abajo, con `hiddenReplies`, etiquetas solo en respuestas, padre visible, autoría del cuaderno y like con `cid`. Verificar con tests cada escenario de `specs/reply-moderation` usando las fixtures de 1.2, incluido un threadgate ausente en el AppView.
- [x] 5.2 Implementar el aplanado en tarjetas (hijos visibles de la raíz y descendientes visibles en un nivel, ordenados por `createdAt`). Verificar con tests los escenarios de `specs/reply-rendering` sobre conversaciones de tres y de veinte niveles.
- [x] 5.3 Implementar la caché de likes en `localStorage` (mapa uri -> cids, carga incremental por rkey, carga completa a las 24 h, caché de menos de 24 h si falla la red, fallo cerrado sin caché, funcionamiento sin `localStorage` y con `localStorage` lleno). Verificar con tests con `fetch` y reloj simulados que un like nuevo aparece, que un like retirado desaparece tras 24 h y que un fallo sin caché devuelve un mapa vacío.
- [x] 5.5 Implementar las continuaciones del hilo (decisión 6): un nodo visible sin la clave `replies` se completa con `getPostThread` desde él, repitiendo hasta que no queden cortes; nada bajo nodos no visibles. Verificar con tests con `fetch` simulado sobre `real-thread-blacksky.json` que se recupera el hilo completo, que no se pide nada bajo una respuesta pendiente y que un fallo deja la rama sin descendientes.
- [x] 5.4 Implementar la lectura del threadgate del PDS (`getRecord`, en paralelo con el hilo) y la cabecera `atproto-accept-labelers` en el cliente del AppView. Verificar con tests con `fetch` simulado que `RecordNotFound` (400, o un 404) da un conjunto vacío, que otro error deja todas las respuestas ajenas pendientes y que la cabecera se envía.

## 6. Interfaz y rutas

- [x] 6.1 Implementar el router por hash (`#/`, `#/d/<rkey>`, `#/indice`) y los estados de carga, error, cuaderno vacío y dibujo no encontrado, validando el formato del rkey. Añadir la Content-Security-Policy a `index.html`. Verificar en `npm run dev` que las cuatro rutas funcionan, que recargar mantiene el dibujo, que un rkey mal formado da "no encontrado" y que la consola no muestra violaciones de la CSP.
- [x] 6.2 Renderizar la página de dibujo: primera imagen (`images` o `recordWithMedia`) con `alt` y proporción, texto limpio, nombre, fecha con tooltip, contadores ocultos a 0 y enlaces anterior/siguiente, todo con `textContent` y sin `innerHTML`. Verificar con un test de DOM (jsdom) que un texto con `<script>` se muestra literal y que con 0 likes no hay contador.
- [x] 6.3 Renderizar las tarjetas de respuestas (texto con enlaces en pestaña nueva, nombre, fecha, sangría del segundo nivel, sin avatar ni imágenes) y la ausencia de tarjetas sin avisos de pendientes. Verificar con un test de DOM sobre las fixtures de 1.2.
- [x] 6.4 Renderizar el índice con nombre y fecha inmediatos y las miniaturas cargadas después con `getPosts` en lotes de 25. Verificar con un test con `fetch` simulado que 30 dibujos generan 2 peticiones y que un dibujo sin imagen no tiene miniatura.

## 7. Integración

- [x] 7.1 Verificar de punta a punta contra el cuaderno real con `appviewUrl` de Bluesky: la home muestra el último dibujo, se navega con las flechas y el índice, y una respuesta pasa de pendiente a visible al darle like (en la siguiente carga).
- [x] 7.2 Repetir 7.1 cambiando solo `appviewUrl` al AppView de Blacksky y anotar en design.md cualquier diferencia encontrada.
- [x] 7.3 Documentar en `README.md` cómo configurar el cuaderno (`src/config.ts`), desarrollar, probar y publicar, y cómo retirar un mensaje (ocultar o quitar el like). Verificar que siguiendo el README se arranca el proyecto desde cero.
