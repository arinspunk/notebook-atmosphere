# Spec Delta

## MODIFIED Requirements

### Requirement: Se muestra solo la primera imagen
La página SHALL mostrar la primera imagen del post (de `embed.images` o, si el embed es `recordWithMedia`, de su `media.images`) en un hueco **cuadrado** del ancho del contenido, con su texto alternativo como `alt`. La imagen SHALL llenar el cuadrado sin deformarse: si no es cuadrada, se recorta centrada. El hueco SHALL reservarse desde que se muestra la página, aunque la imagen aún no esté disponible, siempre que el record del dibujo traiga una imagen, tenga o no `aspectRatio`. El resto de imágenes, vídeos y otros embeds NO SHALL mostrarse.

#### Scenario: Post con tres imágenes
- **WHEN** el dibujo tiene tres imágenes
- **THEN** solo se muestra la primera, con su `alt`

#### Scenario: Imagen sin alt
- **WHEN** la primera imagen tiene `alt` vacío
- **THEN** la imagen se muestra con `alt` vacío, sin errores

#### Scenario: Imagen cuadrada
- **WHEN** la primera imagen es cuadrada
- **THEN** se ve entera, ocupando todo el hueco

#### Scenario: Imagen apaisada por error
- **WHEN** la primera imagen mide 1840 × 1320
- **THEN** se muestra en el hueco cuadrado, recortada por los lados y sin deformarse

#### Scenario: Hueco reservado antes de tener la imagen
- **WHEN** se muestra un dibujo cuyo record trae imagen y la imagen aún no ha llegado
- **THEN** su hueco ya es cuadrado, y el texto no se desplaza cuando aparece la imagen

#### Scenario: Record sin aspectRatio
- **WHEN** la primera imagen no trae `aspectRatio` en el record
- **THEN** el hueco cuadrado se reserva igualmente

#### Scenario: Dibujo sin imagen
- **WHEN** el record del dibujo no trae ninguna imagen
- **THEN** no se reserva hueco y la página se muestra sin errores

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
