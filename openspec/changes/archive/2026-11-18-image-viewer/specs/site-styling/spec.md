# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Estilos solo desde hojas del propio sitio
Styles SHALL load only from stylesheets served by the site itself. The published `index.html` SHALL NOT contain `<style>` elements or `style` attributes. Proportions the code sets through CSSOM (index thumbnails, the drawing's image slot) are not inline styles of the HTML; the code SHALL NOT use `setAttribute("style", …)`. The slot's default square SHALL come from the stylesheet.

#### Scenario: HTML publicado
- **WHEN** the publishable site is generated
- **THEN** its `index.html` has no `<style>` and no `style` attributes, and links a stylesheet of the site itself

#### Scenario: Proporción reservada sin atributo en el HTML
- **WHEN** a drawing with an image is shown on the published site, with a CSP that does not allow inline styles
- **THEN** its slot has the drawing's proportion, set through CSSOM, and the console shows no CSP violation
