# drawing-page Specification

## Purpose

Define qué datos del post del dibujo se muestran en su página y cómo se presentan: imagen, texto, autoría, fecha y contadores.

## Requirements

### Requirement: Se muestra solo la primera imagen
La página SHALL mostrar la primera imagen del post (de `embed.images` o, si el embed es `recordWithMedia`, de su `media.images`) en tamaño completo, con su texto alternativo como `alt` y reservando su proporción (`aspectRatio`) antes de que cargue. El hueco SHALL reservarse desde que se muestra la página, con la proporción del record del dibujo, aunque la imagen aún no esté disponible. El resto de imágenes, vídeos y otros embeds NO SHALL mostrarse.

#### Scenario: Post con tres imágenes
- **WHEN** el dibujo tiene tres imágenes
- **THEN** solo se muestra la primera, con su `alt`

#### Scenario: Imagen sin alt
- **WHEN** la primera imagen tiene `alt` vacío
- **THEN** la imagen se muestra con `alt` vacío, sin errores

#### Scenario: Hueco reservado antes de tener la imagen
- **WHEN** se muestra un dibujo cuya primera imagen tiene `aspectRatio` en el record y la imagen aún no ha llegado
- **THEN** su hueco ya ocupa esa proporción, y el texto no se desplaza cuando aparece la imagen

#### Scenario: Record sin aspectRatio
- **WHEN** la primera imagen no trae `aspectRatio` en el record
- **THEN** la imagen se muestra al llegar, sin hueco reservado y sin errores

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
La página SHALL mostrar el número de likes del post con el texto localizado de "hizo feliz a N amigas", en singular o plural según N. Si N es 0, el contador NO SHALL mostrarse.

#### Scenario: Veinte likes
- **WHEN** el dibujo tiene 20 likes y el idioma es galego
- **THEN** se muestra "Fiz feliz a 20 amigas"

#### Scenario: Un like
- **WHEN** el dibujo tiene 1 like
- **THEN** se muestra la forma singular ("Fiz feliz a 1 amiga")

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
