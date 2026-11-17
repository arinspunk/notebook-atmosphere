# O meu caderno

Sitio estático donde los niños ven sus dibujos publicados en atproto y los mensajes que reciben. Solo se ven las respuestas que el cuaderno ha revisado.

- **Solo cliente:** TypeScript + Vite, sin framework ni backend.
- **Dos fuentes de datos:**
  - El PDS del cuaderno: posts, likes y threadgates.
  - Un AppView: hilos, nombres, contadores e imágenes. Hoy es Bluesky, con Blacksky como alternativa.
- **Rutas:**
  - `#/`: el dibujo más reciente.
  - `#/d/<rkey>`: un dibujo.
  - `#/indice`: todos los dibujos.

## Requisitos

- Node.js 20 o posterior, con npm.

## Arrancar desde cero

```sh
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
```

## Configurar el cuaderno

Todo está en [`src/config.ts`](src/config.ts):

| Campo | Qué es |
| --- | --- |
| `did` | DID de la cuenta del cuaderno, por ejemplo `did:plc:…`. Se obtiene con `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=<handle>`. |
| `pdsUrl` | PDS de esa cuenta (`serviceEndpoint` de `#atproto_pds` en `https://plc.directory/<did>`), por ejemplo `https://eurosky.social`. |
| `appviewUrl` | AppView. Puede ser `APPVIEW_BLUESKY` (`https://public.api.bsky.app`) o `APPVIEW_BLACKSKY` (`https://api.blacksky.community`). Basta con cambiar este campo para cambiar de AppView. |
| `lang` | Idioma de la interfaz. Hoy solo existe `gl`, que es también el que se usa si el idioma no tiene diccionario. |
| `strings` | Opcional: cadenas que sustituyen a las del diccionario (`src/lib/i18n.ts`), por ejemplo `{ genericName: "a casa" }`. Las de número llevan sus formas de plural: `{ likes: { one: "…{n}…", other: "…{n}…" } }`. |
| `nombres` | Lista de `{ tag, nombre }`. El tag va sin `#` y no distingue mayúsculas ni tildes compuestas o descompuestas. |

**Ahora mismo `src/config.ts` apunta a la cuenta de pruebas `usoritual.com`.** Cambia `did` y `pdsUrl` cuando exista la cuenta definitiva.

## Cómo publica el cuaderno

- **Un dibujo** es un post del cuaderno, que no sea una respuesta, con `#caderno` y el tag del niño (`#naia`):
  - Se muestra la primera imagen.
  - El texto aparece sin los hashtags.
  - Si no lleva ningún tag de la lista, se firma como "o caderno".
- **Las respuestas del cuaderno** se firman con el tag de la lista que lleven (`Obrigada! #naia` se ve como "Naia") o, si no llevan ninguno, como "o caderno".

## Moderar los mensajes

Una respuesta de otra cuenta **solo se ve si el cuaderno le da like** desde Bluesky o desde otra app. El like vale para la versión exacta que se revisó: si el autor reescribe el post, vuelve a quedar pendiente. Las respuestas que cuelgan de una respuesta no visible tampoco se ven.

Para **retirar** un mensaje:

- **Ocultar la respuesta para todos** ("Ocultar respuesta"): deja de verse al recargar la página o al navegar a ese dibujo. Si el dibujo ya estaba preparado (el sitio prepara por adelantado el anterior y el siguiente del que se está viendo), puede seguir viéndose como mucho 1 minuto más. Una página que sigue abierta no se actualiza sola, pero sí al volver a ella tras más de 10 minutos en segundo plano (otra pestaña, pantalla bloqueada). Es la vía para retirar algo con urgencia, y gana a un like. Funciona también con las respuestas del propio cuaderno.
- **Quitar el like:** el sitio guarda en caché los likes del cuaderno en cada navegador, y la caché se vuelve a cargar entera cada 24 h. Hasta entonces puede seguir viéndose en los navegadores que ya la tenían.

Si el PDS no responde, no se ve ninguna respuesta de otras cuentas.

## Probar

```sh
npm test         # tests unitarios y de DOM (Vitest + jsdom)
npm run check    # comprobación de tipos (tsc --noEmit)
```

Las fixtures de `tests/fixtures/` son respuestas reales de la cuenta de pruebas, de los dos AppViews y del PDS.

## Publicar

```sh
npm run build    # comprueba los tipos y genera dist/
npm run preview  # sirve dist/ en local para revisarlo
```

El sitio se publica en **Netlify**. [`netlify.toml`](netlify.toml) ya fija el comando de build (`npm run build`), la carpeta publicada (`dist`) y la versión de Node, así que no hay que configurar nada en el panel. Hay dos formas de publicar:

- **Desde un repositorio Git:** en Netlify, "Add new site" → "Import an existing project" y elegir el repositorio. Cada push a la rama principal publica una versión nueva.
- **Desde la terminal:** `npx netlify-cli deploy --build` crea un borrador para revisar, y `npx netlify-cli deploy --build --prod` lo publica. La primera vez pide iniciar sesión y vincular el sitio.

Para volver atrás, en el panel de Netlify: "Deploys" → elegir un deploy anterior → "Publish deploy".

`dist/` es estático, con rutas relativas y rutas por hash, así que no necesita reglas de redirección.

## Origen del código

`src/lib/date.ts`, `src/lib/i18n.ts`, `src/lib/text.ts`, `src/lib/thread.ts` y `src/lib/types.ts` están adaptados de [atproto-comments](https://github.com/arinspunk/atproto-comments) (licencia MIT). Cada fichero lo indica en su cabecera.
