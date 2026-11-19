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
The replies SHALL be grouped in the `replies` block. Each card SHALL be a `replies__thread`, each reply a `reply` block with its `text` and `footer` elements, in that order, and the second-level replies SHALL go inside `replies__followups` with the `reply--followup` modifier.

#### Scenario: Tarjeta con seguimiento
- **WHEN** a visible reply has a visible reply from the notebook
- **THEN** the `.replies__thread` contains a `.reply` and a `.replies__followups` with a `.reply.reply--followup`

#### Scenario: Sin respuestas visibles
- **WHEN** a drawing has no visible replies
- **THEN** there is no `.replies`

#### Scenario: Byline after the text
- **WHEN** a reply with text is shown
- **THEN** its last child is a `footer.reply__footer`, after `.reply__text`, and it has no `header`

### Requirement: Bloques del índice
El índice SHALL ser el bloque `post-list`, con sus elementos `title`, `items` e `item`. Cada dibujo del índice SHALL ser un bloque `post-card`, con sus elementos `thumb` (hueco de la miniatura) y `byline`.

#### Scenario: Índice con dos dibujos
- **WHEN** se muestra el índice con dos dibujos
- **THEN** hay dos `.post-list__item`, cada uno con un `.post-card` que contiene `.post-card__thumb` y `.post-card__byline`

### Requirement: Bloque compartido de autoría
The name and the date SHALL form a `byline` block, with its `name` and `date` elements, wherever they appear together: in the drawing, in each reply and in each index card. Each use SHALL also carry the element class of the block that contains it (BEM mix), and MAY carry `byline` modifiers.

#### Scenario: Byline del dibujo
- **WHEN** a drawing by Naia is shown
- **THEN** an element with the classes `post__byline` and `byline` contains `.byline__name` with "Naia" and a `time.byline__date`

#### Scenario: Byline de una respuesta
- **WHEN** a reply is shown
- **THEN** its footer has the classes `reply__footer`, `byline` and `byline--note`, and contains `.byline__name` and `.byline__date`

### Requirement: Bloque de mensajes de estado
Los mensajes de estado SHALL ser el bloque `status` con un modificador según el caso: `loading`, `error`, `empty` o `not-found`.

#### Scenario: Dibujo inexistente
- **WHEN** se abre `#/d/<rkey>` con un rkey que no está en el catálogo
- **THEN** se muestra un `.status.status--not-found` con su texto en galego

#### Scenario: Error del hilo
- **WHEN** falla la carga de un dibujo del AppView
- **THEN** se muestra un `.status.status--error`

### Requirement: Image viewer blocks
The drawing's image SHALL be wrapped in a `post__zoom` element that is the control that opens the viewer and has no visible button styling. The viewer SHALL be the `viewer` block, with its `image` and `close` elements. Its backdrop and colours SHALL come from the design tokens.

#### Scenario: Drawing with image
- **WHEN** a drawing with an image is shown
- **THEN** `.post__media` contains a `.post__zoom` that contains `.post__image`

#### Scenario: Open viewer
- **WHEN** the viewer is open
- **THEN** there is a `.viewer` with a `.viewer__image` and a `.viewer__close`, and all classes follow the BEM convention

### Requirement: Viewer opening transition
Opening the viewer SHALL fade it in briefly, with a duration from the design tokens. When the visitor's system asks for reduced motion, it SHALL open without a transition. Closing SHALL be instant.

#### Scenario: Open with motion
- **WHEN** the visitor opens the viewer and the system does not ask for reduced motion
- **THEN** the viewer and its backdrop fade in and the image grows slightly to its size

#### Scenario: Reduced motion
- **WHEN** the visitor opens the viewer and the system asks for reduced motion (`prefers-reduced-motion: reduce`)
- **THEN** the viewer appears at once, without a transition

### Requirement: Estilos solo desde hojas del propio sitio
Styles SHALL load only from stylesheets served by the site itself. The published `index.html` SHALL NOT contain `<style>` elements or `style` attributes. Proportions the code sets through CSSOM (index thumbnails, the drawing's image slot) are not inline styles of the HTML; the code SHALL NOT use `setAttribute("style", …)`. The slot's default square SHALL come from the stylesheet.

#### Scenario: HTML publicado
- **WHEN** the publishable site is generated
- **THEN** its `index.html` has no `<style>` and no `style` attributes, and links a stylesheet of the site itself

#### Scenario: Proporción reservada sin atributo en el HTML
- **WHEN** a drawing with an image is shown on the published site, with a CSP that does not allow inline styles
- **THEN** its slot has the drawing's proportion, set through CSSOM, and the console shows no CSP violation

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

### Requirement: Replies are shown below the sheet
The replies of a drawing SHALL be shown after the drawing's sheet, outside it, in a single column. The drawing page SHALL be the `drawing` block, containing the `post` block and, when there are visible replies, the `replies` block after it.

#### Scenario: Drawing with replies
- **WHEN** a drawing with visible replies is shown
- **THEN** `.drawing` contains `.post` and, after it, `.replies`, and `.post` does not contain `.replies`

#### Scenario: Drawing without visible replies
- **WHEN** a drawing has no visible replies
- **THEN** `.drawing` contains only `.post`

### Requirement: Replies look like sticky notes
Every reply SHALL be shown as a sticky note of at least 360 × 360 CSS px, or the available width if the screen is narrower, which grows only if its content needs it. Its content SHALL be centred vertically, its text in roman, and its byline after the text, right-aligned, with the name in bold.

#### Scenario: Short reply
- **WHEN** a reply has one line of text
- **THEN** its note is a square of 360 px with the text and the byline centred vertically

#### Scenario: Reply at the length limit
- **WHEN** a reply has 300 characters
- **THEN** it fits in its note without the note growing

#### Scenario: Narrow screen
- **WHEN** the screen is 360 px wide
- **THEN** the notes fit the width, including their zigzag offset, without horizontal scroll and without any edge cut off

### Requirement: Consecutive notes never share a colour
Notes SHALL take their background from a cycle of four note colours defined as design tokens, by their position, and their text and byline from the ink of that colour: a dark shade of the same hue. Two notes next to each other on screen SHALL NOT share a colour: neither two consecutive direct replies, nor a reply to a reply and the note it is stuck to, nor the last reply to a reply and the next direct reply.

#### Scenario: Five direct replies
- **WHEN** a drawing has five direct replies
- **THEN** they are coloured 1, 2, 3, 4 and 1

#### Scenario: Replies to a reply
- **WHEN** a direct reply of colour 1 has three replies to it
- **THEN** they are coloured 3, 4 and 1, and the next direct reply is colour 2

#### Scenario: One reply to a reply
- **WHEN** a direct reply has one reply to it
- **THEN** that note has a colour different from the direct reply and from the next direct reply

#### Scenario: Note text contrast
- **WHEN** a note's text is shown on its colour
- **THEN** it uses that colour's ink, with a contrast of at least 4.5:1

### Requirement: Direct replies are separate, replies to a reply are stuck on
Direct replies SHALL be separate notes, slightly rotated and alternating left and right by position. Replies to a reply SHALL be notes as wide as the note they answer, stuck on top of the note before them: indented once, or less when the column has no room for the indent, overlapping it by less than its bottom padding, so they never cover its text or byline.

#### Scenario: Conversation
- **WHEN** a direct reply has a reply from the notebook
- **THEN** the notebook's note is as wide as the first one, indented, overlaps the bottom of the first note, and the first note's text and byline remain fully visible

#### Scenario: Conversation on a narrow screen
- **WHEN** a direct reply has a reply from the notebook and the screen is 360 px wide
- **THEN** both notes have the same width, the indent shrinks as needed (down to none), and no edge of either note is cut off

#### Scenario: Two direct replies
- **WHEN** a drawing has two direct replies
- **THEN** there is space between their notes, and one leans and moves to one side while the other leans and moves to the other side

### Requirement: The byline reads "name, date"
Wherever a name and a date appear together (the drawing, the replies and the index), they SHALL be separated by the dictionary's byline separator, which in Galician is a comma and a space.

#### Scenario: Reply byline
- **WHEN** Toquinho's reply from 16 hours ago is shown
- **THEN** its byline reads "Toquinho, há 16 h"

#### Scenario: Invalid date
- **WHEN** a reply's date cannot be parsed
- **THEN** the byline shows only the name, without a trailing comma
