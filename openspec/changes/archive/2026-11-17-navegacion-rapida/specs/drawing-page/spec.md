# Spec Delta

## MODIFIED Requirements

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
