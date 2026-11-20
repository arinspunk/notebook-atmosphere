# Spec Delta

## ADDED Requirements

### Requirement: Site header
Every page SHALL start with a header, the `site-header` block, which scrolls with the page. At its start it SHALL have the `logo` element, which until there is a logo is the notebook's name from the dictionary ("caderno" in Galician) and links to the home. At its end it SHALL have the `index` element, the link to the index, which on the index page SHALL be marked as the current page.

#### Scenario: Header on a drawing
- **WHEN** a drawing is shown
- **THEN** above it there is a `header.site-header` with `.site-header__logo` reading "caderno" and linking to the home, and `.site-header__index` reading "Todos os desenhos" and linking to the index

#### Scenario: Header on the index
- **WHEN** the index is shown
- **THEN** `.site-header__index` is marked as the current page (`aria-current="page"`)

#### Scenario: Header on a status message
- **WHEN** the site shows a loading, error, empty or "not found" message
- **THEN** the header is shown above it

### Requirement: The pager links are arrows
The links of the `pager` block SHALL be arrows: images with no visible text, with a hidden label as their accessible name. The images SHALL be the site's own files, one per arrow, replaceable without changing code. Each arrow SHALL be a touch target of at least 44 × 44 CSS px. The index page SHALL have no arrows.

#### Scenario: Arrow without text
- **WHEN** an arrow is shown
- **THEN** it shows no visible text, its accessible name is the dictionary's ("Anterior" or "Seguinte"), and its tappable area is at least 44 × 44 px

#### Scenario: Index page
- **WHEN** the index is shown on a narrow screen
- **THEN** there is no bar and no arrow

### Requirement: Arrows beside the sheet or in a bottom bar
When the screen is wide enough for the sheet and both arrows side by side, the arrows SHALL be shown to the left and right of the sheet, towards its bottom, both pointing towards the sheet. When it is not, they SHALL be shown in a bar fixed at the bottom of the screen, with the same images, outside the phone's safe areas. The bar SHALL NOT cover any content when the page is scrolled to its end.

#### Scenario: Wide screen
- **WHEN** an intermediate drawing is shown on a screen 1024 px wide
- **THEN** the "previous" arrow is to the left of the sheet and the "next" arrow to its right, both in the lower part of the sheet and pointing towards it

#### Scenario: Narrow screen
- **WHEN** an intermediate drawing is shown on a screen 360 px wide
- **THEN** both arrows are in a bar fixed at the bottom of the screen, "previous" at the left and "next" at the right, and they stay there while scrolling

#### Scenario: End of the page on a narrow screen
- **WHEN** a visitor on a 360 px screen scrolls to the end of a drawing with replies
- **THEN** the last reply is fully visible above the bar

## MODIFIED Requirements

### Requirement: Bloques de la página de un dibujo
The drawing page SHALL expose the `post` block with its elements: `media` (the image slot), `image`, `text`, `byline` and `stat`. Each `stat` SHALL carry the `likes` or `shares` modifier. The navigation SHALL be the `pager` block, outside `post`, with one `link` per link, the `prev` and `next` modifiers, and a `label` element for each link's hidden text. The link to the index SHALL NOT be part of the `pager`; it is in the site header.

#### Scenario: Dibujo completo
- **WHEN** a drawing with image, text, likes and neighbours on both sides is shown
- **THEN** there are `.post`, `.post__media`, `.post__image`, `.post__text`, `.post__byline`, `.post__stat--likes`, `.pager__link--prev` and `.pager__link--next`, each link with a `.pager__label`, and `.post` does not contain `.pager`

#### Scenario: Primer dibujo
- **WHEN** the newest drawing is shown
- **THEN** there is no `.pager__link--prev`, there is `.pager__link--next`, and there is no `.pager__link--index`

### Requirement: Replies are shown below the sheet
The replies of a drawing SHALL be shown after the drawing's sheet, outside it, in a single column. The drawing page SHALL be the `drawing` block, containing its `sheet` element, which holds the `post` block and the `pager` block after it, and, when there are visible replies, the `replies` block after the `sheet`.

#### Scenario: Drawing with replies
- **WHEN** a drawing with visible replies is shown
- **THEN** `.drawing` contains `.drawing__sheet` and, after it, `.replies`; `.drawing__sheet` contains `.post` and `.pager`; and neither `.post` nor `.drawing__sheet` contains `.replies`

#### Scenario: Drawing without visible replies
- **WHEN** a drawing has no visible replies
- **THEN** `.drawing` contains only `.drawing__sheet`
