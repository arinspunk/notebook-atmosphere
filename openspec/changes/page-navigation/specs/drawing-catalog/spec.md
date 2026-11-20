# Spec Delta

## MODIFIED Requirements

### Requirement: Navegación al dibujo anterior y siguiente
The drawing page SHALL offer a link to the immediately older drawing and a link to the immediately newer drawing, in the catalogue's order, following the order of a book: since the newest drawing comes first, moving forward goes to older drawings. The link to the older drawing SHALL be the "next" one, shown at the right, and the link to the newer drawing SHALL be the "previous" one, shown at the left. Their accessible names SHALL come from the dictionary ("Seguinte" and "Anterior" in Galician). A link without a destination SHALL NOT be shown.

#### Scenario: Dibujo intermedio
- **WHEN** a drawing that is neither the newest nor the oldest is shown
- **THEN** there is a "previous" link at the left to the newer drawing and a "next" link at the right to the older drawing

#### Scenario: Dibujo más reciente
- **WHEN** the newest drawing is shown
- **THEN** there is only the "next" link, at the right, to the older drawing

#### Scenario: Dibujo más antiguo
- **WHEN** the oldest drawing is shown
- **THEN** there is only the "previous" link, at the left, to the newer drawing

#### Scenario: Names of the links
- **WHEN** a screen reader reads the links of an intermediate drawing
- **THEN** the link to the older drawing is named "Seguinte" and the link to the newer one "Anterior"

### Requirement: Página de índice
The site SHALL have an index page, linked from the header of every page, that lists every drawing in the catalogue's order. Each entry SHALL show the thumbnail of the first image (if any), the attributed name and the date, and link to the drawing's page.

#### Scenario: Abrir el índice
- **WHEN** a visitor opens the index
- **THEN** they see every drawing, each with thumbnail, name and date, and tapping one takes them to its page

#### Scenario: Dibujo sin imagen
- **WHEN** a drawing has no image
- **THEN** its index entry is shown without a thumbnail, with name and date

#### Scenario: Link from any page
- **WHEN** a visitor is on a drawing, on the index or on a "drawing not found" page
- **THEN** the header has a link to the index
