# drawing-page Specification

## Purpose

Define qué datos del post del dibujo se muestran en su página y cómo se presentan: imagen, texto, autoría, fecha y contadores.

## Requirements

### Requirement: Se muestra solo la primera imagen
La página SHALL mostrar la primera imagen del post (de `embed.images` o, si el embed es `recordWithMedia`, de su `media.images`), con su texto alternativo como `alt`. El resto de imágenes, vídeos y otros embeds NO SHALL mostrarse.

#### Scenario: Post con tres imágenes
- **WHEN** el dibujo tiene tres imágenes
- **THEN** solo se muestra la primera, con su `alt`

#### Scenario: Imagen sin alt
- **WHEN** la primera imagen tiene `alt` vacío
- **THEN** la imagen se muestra con `alt` vacío, sin errores

### Requirement: The image keeps the drawing's proportions
The first image SHALL be shown whole, as wide as the content and with its own proportions, without cropping or distortion. Its slot SHALL be reserved from the moment the page is shown, before the image is available, whenever the drawing's record carries an image: with the record's `aspectRatio` when it has a valid one, and as a square otherwise.

#### Scenario: Imagen cuadrada
- **WHEN** the first image is square
- **THEN** it is shown whole in a square slot

#### Scenario: Imagen apaisada por error
- **WHEN** the first image measures 1840 × 1320
- **THEN** it is shown whole in a slot of 1840 / 1320 proportions, without cropping or distortion

#### Scenario: Hueco reservado antes de tener la imagen
- **WHEN** a drawing is shown whose record carries an image with `aspectRatio`, and the image has not arrived yet
- **THEN** its slot already has that proportion, and the text does not move when the image appears

#### Scenario: Record sin aspectRatio
- **WHEN** the first image of the record has no valid `aspectRatio`
- **THEN** a square slot is reserved, and it takes the AppView's proportion when the image arrives

#### Scenario: Dibujo sin imagen
- **WHEN** the drawing's record carries no image
- **THEN** no slot is reserved and the page is shown without errors

### Requirement: The page shows the thumbnail of the drawing
The drawing page, and the preparation of its neighbouring drawings, SHALL load the AppView thumbnail (`thumb`) of the first image, not the full image (`fullsize`). Only if the post has no thumbnail SHALL they load the full image.

#### Scenario: Drawing with thumbnail
- **WHEN** a drawing is shown and its first image has `thumb` and `fullsize`
- **THEN** the page loads `thumb` and does not request `fullsize`

#### Scenario: Neighbour prepared in advance
- **WHEN** the previous and next drawings are prepared in the background
- **THEN** their `thumb` images are requested, never their `fullsize` images

#### Scenario: Image without thumbnail
- **WHEN** the first image has `fullsize` but no `thumb`
- **THEN** the page shows `fullsize`

### Requirement: The full drawing opens in a viewer
Activating the drawing's image SHALL open a viewer over the page with the full image (`fullsize`, or `thumb` if there is none), as large as the screen allows without cropping or distortion, and with its `alt` text. While the viewer is open, the rest of the page SHALL NOT be interactive.

#### Scenario: Tap the drawing
- **WHEN** a visitor taps or clicks the drawing's image
- **THEN** the viewer opens with the drawing whole and as large as the screen allows

#### Scenario: Drawing without image
- **WHEN** a drawing has no image
- **THEN** there is nothing to activate and no viewer

### Requirement: The drawing's image is the control
The image itself SHALL be the control that opens the viewer, with no separate open button. It SHALL be reachable with the keyboard, and its accessible name SHALL include the drawing's `alt` text, when there is one, and say that it opens the drawing large.

#### Scenario: Keyboard
- **WHEN** a visitor moves the focus to the drawing's image with Tab and presses Enter or Space
- **THEN** the viewer opens, and when it closes the focus returns to the image

#### Scenario: Screen reader
- **WHEN** a screen reader reaches the image of a drawing whose `alt` is "Na praia"
- **THEN** it announces a button named "Na praia. Ver o desenho em grande"

#### Scenario: Screen reader without alt
- **WHEN** a screen reader reaches the image of a drawing with an empty `alt`
- **THEN** it announces a button named "Ver o desenho em grande"

### Requirement: The viewer loads the full image only when it opens
The full image SHALL only be requested when the viewer opens, never in advance. Until it arrives, the viewer SHALL show the thumbnail.

#### Scenario: Instant opening
- **WHEN** the viewer opens and the full image has not arrived yet
- **THEN** the thumbnail is already visible in the viewer, and it is replaced by the full image when it arrives

#### Scenario: No prefetch of the full image
- **WHEN** a drawing is shown and its viewer is never opened
- **THEN** its `fullsize` image is never requested

### Requirement: The viewer closes without leaving the drawing
The viewer SHALL close with its close button, by activating anywhere outside the image, with Escape, and with the browser's back action. Closing SHALL leave the same drawing page as it was, at the same scroll position.

#### Scenario: Close by tapping outside
- **WHEN** the viewer is open and the visitor taps outside the image
- **THEN** the viewer closes and the drawing page is as it was, at the same scroll position

#### Scenario: Back button
- **WHEN** the viewer is open and the visitor uses the browser's back button or gesture
- **THEN** the viewer closes and the same drawing is still shown

#### Scenario: Escape
- **WHEN** the viewer is open and the visitor presses Escape
- **THEN** the viewer closes, and a later back action leaves the drawing as usual instead of doing nothing

### Requirement: El texto del dibujo se muestra sin hashtags
El texto del dibujo SHALL mostrarse sin ninguno de sus hashtags, eliminando también los espacios sobrantes que dejen al principio, al final o duplicados. Los saltos de línea SHALL conservarse. Los enlaces del texto SHALL poder pulsarse; las menciones SHALL mostrarse como texto.

#### Scenario: Tags al final
- **WHEN** el texto es "Na praia con León 🏖️ #caderno #naia"
- **THEN** se muestra "Na praia con León 🏖️"

#### Scenario: Texto en varias líneas
- **WHEN** el texto es "Na praia\nco avó #caderno"
- **THEN** se muestra "Na praia" y "co avó" en líneas distintas

#### Scenario: Enlace en el texto
- **WHEN** el texto contiene un facet de enlace a `https://example.org`
- **THEN** ese fragmento se muestra como enlace que abre `https://example.org`

### Requirement: Nombre y fecha del dibujo
Junto al texto SHALL mostrarse el nombre atribuido al dibujo y su fecha de publicación (`createdAt`), con el formato de fecha de la interfaz.

#### Scenario: Dibujo de Naia de hace dos días
- **WHEN** se muestra un dibujo atribuido a "Naia" publicado hace dos días
- **THEN** se ve "Naia" y la fecha relativa de dos días

### Requirement: Contador de personas a las que hizo feliz
La página SHALL mostrar el número de likes del post con el texto localizado de "hizo feliz a N amigas", que en galego termina con el emoji 🥰, en singular o plural según N. Si N es 0, el contador NO SHALL mostrarse.

#### Scenario: Veinte likes
- **WHEN** el dibujo tiene 20 likes y el idioma es galego
- **THEN** se muestra "Fiz feliz a 20 amigas 🥰"

#### Scenario: Un like
- **WHEN** el dibujo tiene 1 like
- **THEN** se muestra la forma singular ("Fiz feliz a 1 amiga 🥰")

#### Scenario: Sin likes
- **WHEN** el dibujo tiene 0 likes
- **THEN** no se muestra el contador

### Requirement: Contador de veces compartido
La página SHALL mostrar la suma de reposts y citas del post con el texto localizado de "compartido X veces", en singular o plural. Si la suma es 0, el contador NO SHALL mostrarse.

#### Scenario: Reposts y citas
- **WHEN** el dibujo tiene 3 reposts y 1 cita
- **THEN** se muestra el contador con 4

#### Scenario: Sin compartir
- **WHEN** el dibujo tiene 0 reposts y 0 citas
- **THEN** no se muestra el contador

### Requirement: No se muestra el número de respuestas del AppView
La página NO SHALL mostrar `replyCount`, porque incluye respuestas ocultas y pendientes.

#### Scenario: Respuestas pendientes
- **WHEN** el dibujo tiene 5 respuestas según el AppView y 2 visibles
- **THEN** no aparece ningún número de respuestas
