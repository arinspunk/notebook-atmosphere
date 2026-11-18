# site-styling Specification

## Purpose

Define el contrato de estilos del sitio: qué clases expone el HTML para dar estilo a cada parte, con qué convención se nombran y cómo se cargan los estilos. Cualquiera que haga un fork puede cambiar el aspecto sin tocar la lógica.

## Requirements

### Requirement: Clases BEM en inglés
Toda clase que el sitio ponga en su HTML SHALL seguir la convención BEM (`bloque`, `bloque__elemento`, `bloque--modificador`, `bloque__elemento--modificador`), en inglés, en minúsculas y con guiones entre palabras. Los textos visibles de la interfaz NO SHALL verse afectados por esta convención.

#### Scenario: Ninguna clase fuera de la convención
- **WHEN** se muestra cualquier página del sitio (un dibujo, el índice o un mensaje de estado)
- **THEN** todas las clases del HTML cumplen el patrón BEM en inglés y ninguna es una de las anteriores en galego (`debuxo`, `tarxeta`, `resposta`, `indice`…)

#### Scenario: Los textos siguen en galego
- **WHEN** se muestra un dibujo con "Fiz feliz a 3 amigas"
- **THEN** el texto visible es el mismo que antes del cambio de clases

### Requirement: Bloques de la página de un dibujo
La página de un dibujo SHALL exponer el bloque `post` con sus elementos: `media` (hueco de la imagen), `image`, `text`, `byline` y `stat`. Cada `stat` SHALL llevar el modificador `likes` o `shares`. La navegación SHALL ser el bloque `pager`, con un `link` por enlace y los modificadores `prev`, `index` y `next`.

#### Scenario: Dibujo completo
- **WHEN** se muestra un dibujo con imagen, texto, likes y vecinos a los dos lados
- **THEN** existen `.post`, `.post__media`, `.post__image`, `.post__text`, `.post__byline`, `.post__stat--likes`, `.pager__link--prev`, `.pager__link--index` y `.pager__link--next`

#### Scenario: Primer dibujo
- **WHEN** se muestra el dibujo más antiguo
- **THEN** no existe `.pager__link--prev`, y sí `.pager__link--index`

### Requirement: Bloques de las respuestas
Las respuestas SHALL agruparse en el bloque `replies`. Cada tarjeta SHALL ser un `replies__thread`, cada respuesta un bloque `reply` con sus elementos `header` y `text`, y las respuestas de segundo nivel SHALL ir dentro de `replies__followups` con el modificador `reply--followup`.

#### Scenario: Tarjeta con seguimiento
- **WHEN** una respuesta visible tiene una respuesta visible del cuaderno
- **THEN** el `.replies__thread` contiene un `.reply` y un `.replies__followups` con un `.reply.reply--followup`

#### Scenario: Sin respuestas visibles
- **WHEN** un dibujo no tiene respuestas visibles
- **THEN** no existe `.replies`

### Requirement: Bloques del índice
El índice SHALL ser el bloque `post-list`, con sus elementos `title`, `items` e `item`. Cada dibujo del índice SHALL ser un bloque `post-card`, con sus elementos `thumb` (hueco de la miniatura) y `byline`.

#### Scenario: Índice con dos dibujos
- **WHEN** se muestra el índice con dos dibujos
- **THEN** hay dos `.post-list__item`, cada uno con un `.post-card` que contiene `.post-card__thumb` y `.post-card__byline`

### Requirement: Bloque compartido de autoría
El nombre y la fecha SHALL formar un bloque `byline`, con sus elementos `name` y `date`, siempre que aparezcan juntos: en el dibujo, en cada respuesta y en cada tarjeta del índice. Cada uso SHALL llevar también la clase de elemento del bloque que lo contiene (mix BEM), y SHALL poder llevar modificadores de `byline`.

#### Scenario: Byline del dibujo
- **WHEN** se muestra un dibujo de Naia
- **THEN** un elemento con las clases `post__byline` y `byline` contiene `.byline__name` con "Naia" y un `time.byline__date`

#### Scenario: Byline de una respuesta
- **WHEN** se muestra una respuesta
- **THEN** su cabecera lleva las clases `reply__header` y `byline`, y contiene `.byline__name` y `.byline__date`

### Requirement: Bloque de mensajes de estado
Los mensajes de estado SHALL ser el bloque `status` con un modificador según el caso: `loading`, `error`, `empty` o `not-found`.

#### Scenario: Dibujo inexistente
- **WHEN** se abre `#/d/<rkey>` con un rkey que no está en el catálogo
- **THEN** se muestra un `.status.status--not-found` con su texto en galego

#### Scenario: Error del hilo
- **WHEN** falla la carga de un dibujo del AppView
- **THEN** se muestra un `.status.status--error`

### Requirement: Estilos solo desde hojas del propio sitio
Los estilos SHALL cargarse solo desde hojas de estilo servidas por el propio sitio. El `index.html` generado para publicar NO SHALL contener elementos `<style>` ni atributos `style`. Los estilos que el código asigna en ejecución por CSSOM (como la proporción de las miniaturas del índice) no cuentan como estilos en línea del HTML. La forma cuadrada del hueco de la imagen del dibujo SHALL venir de la hoja de estilos, no del código.

#### Scenario: HTML publicado
- **WHEN** se genera el sitio publicable
- **THEN** su `index.html` no tiene `<style>` ni atributos `style`, y enlaza una hoja de estilos del propio sitio

#### Scenario: Proporción reservada sin atributo en el HTML
- **WHEN** se muestra un dibujo con imagen en el sitio publicado, con una CSP que no permite estilos en línea
- **THEN** su hueco es cuadrado, y ni el hueco ni la imagen llevan un atributo `style`

### Requirement: Tokens de diseño centralizados
Los colores, tipografías, tamaños, espacios y radios SHALL definirse una sola vez como propiedades personalizadas de CSS en un único fichero de tokens. Los estilos de los componentes SHALL usar esos tokens y no valores literales de color (hexadecimales, funciones de color ni nombres de color). Los tokens de color SHALL tener nombres por función (fondo, texto, acento…) y no por tono.

#### Scenario: Color con nombre en un componente
- **WHEN** un componente usa `color: white`
- **THEN** la comprobación de estilos falla

#### Scenario: Cambio de color de acento en un fork
- **WHEN** alguien cambia el valor del token de color de acento
- **THEN** cambian todos los sitios que usan el acento sin editar ningún otro fichero

### Requirement: La hoja del dibujo crece sin cortes
La página de un dibujo SHALL mostrarse como una hoja de cuaderno con anillas de espiral en el borde izquierdo. Las anillas SHALL continuar con el mismo paso a lo largo de toda la hoja, sea cual sea su altura, sin saltos, sin repetir la sombra ni el borde de la hoja en mitad de ella.

#### Scenario: Dibujo con texto corto
- **WHEN** se muestra un dibujo con una línea de texto
- **THEN** la hoja tiene anillas de arriba abajo, con el mismo paso

#### Scenario: Dibujo con texto largo
- **WHEN** se muestra un dibujo cuyo texto ocupa 40 líneas
- **THEN** la hoja crece a lo alto y las anillas siguen con el mismo paso hasta el final, sin cortes ni sombras intermedias

### Requirement: Fuentes propias ligeras
Las fuentes de la interfaz SHALL servirse desde el propio sitio, en un formato comprimido para web y con un peso máximo de 100 KB por fichero, y SHALL cubrir los caracteres de galego, castellano y portugués. Mientras se cargan, el texto SHALL verse con una fuente del sistema.

#### Scenario: Caracteres de los textos
- **WHEN** un texto lleva "ñ", "ç", "ã", "õ", "á" o "ü"
- **THEN** se muestra con la fuente del sitio, no con una de reserva

#### Scenario: Emojis
- **WHEN** un texto lleva un emoji
- **THEN** el emoji se muestra con la fuente de emojis del sistema

#### Scenario: Red lenta
- **WHEN** la fuente aún no ha llegado
- **THEN** el texto ya se ve con una fuente del sistema y cambia cuando llega

### Requirement: Textos con contraste suficiente
Todo texto de la interfaz, enlaces incluidos, SHALL tener un contraste de al menos 4,5:1 con el fondo sobre el que se muestra, y el indicador de foco al menos 3:1. Los colores puramente decorativos quedan fuera de esta regla, pero NO SHALL usarse para texto ni para el foco.

#### Scenario: Color de acento decorativo
- **WHEN** el token de acento tiene un contraste menor de 4,5:1 con el fondo
- **THEN** ningún texto, enlace ni foco usa ese token

#### Scenario: Cambio de un color de texto en un fork
- **WHEN** alguien cambia un token de color de texto a un valor con contraste insuficiente
- **THEN** la comprobación de estilos falla
