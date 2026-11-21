# Spec Delta

## ADDED Requirements

### Requirement: Page turn between drawings
Going from one drawing to another SHALL turn the sheet around the axis of its rings, with a duration from the design tokens. Towards an older drawing, the current sheet SHALL turn away and uncover the new one beneath it. Towards a newer drawing, the new sheet SHALL turn back over the rings and land on top of the current one. The direction SHALL follow the order of the two drawings in the catalogue, however the visitor got there.

#### Scenario: To the older drawing
- **WHEN** the visitor activates the "Seguinte" arrow and the system does not ask for reduced motion
- **THEN** the current sheet turns away around its rings and the older drawing's sheet is uncovered beneath it

#### Scenario: To the newer drawing
- **WHEN** the visitor activates the "Anterior" arrow and the system does not ask for reduced motion
- **THEN** the newer drawing's sheet turns back over the rings and lands on top of the current one

#### Scenario: Browser back action
- **WHEN** the visitor went from a drawing to an older one with "Seguinte" and then uses the browser's back action
- **THEN** the sheet turns as with "Anterior": the newer drawing's sheet comes back on top

#### Scenario: Several drawings apart
- **WHEN** the visitor opens a link to the newest drawing (the home) from a drawing five places older
- **THEN** the sheet turns as towards a newer drawing

### Requirement: What moves during the page turn
During the page turn, the sticky notes SHALL NOT turn with the sheet: the old drawing's notes SHALL fade out as the turn starts and the new drawing's notes SHALL fade in after it ends. The site header and the arrows SHALL stay in place, without turning or fading as a whole.

#### Scenario: Both drawings have replies
- **WHEN** the sheet turns from a drawing with notes to another drawing with notes that was prepared in advance
- **THEN** the old notes are gone before the new sheet is fully shown, the new notes appear after it, and no note rotates with the sheet

#### Scenario: Arrows in the bottom bar
- **WHEN** the sheet turns on a phone, with the arrows in the bar fixed at the bottom
- **THEN** the bar stays fixed and does not turn or fade as a whole

### Requirement: New sheet complete when prepared
When the drawing being turned to was prepared in advance, the uncovered sheet SHALL already show its image. Otherwise the turn SHALL start without waiting for the network, with the text, name, date and the reserved image slot from the catalogue, and the rest SHALL appear when it arrives.

#### Scenario: Neighbour prepared
- **WHEN** the visitor activates an arrow whose drawing has finished preparing, with the preparation started less than 60 seconds ago
- **THEN** the sheet that is uncovered or lands shows the drawing's image during the turn

#### Scenario: Neighbour not ready
- **WHEN** the visitor activates an arrow whose drawing is still being prepared
- **THEN** the turn starts without waiting for it, and the image appears in its reserved slot when it arrives

### Requirement: No page turn outside drawing-to-drawing navigation
The page SHALL change at once, with no page turn, when the system asks for reduced motion (`prefers-reduced-motion: reduce`), when the browser cannot animate the change, on the first page shown, between the index and a drawing, between a drawing and a status message, and when the same drawing is shown again.

#### Scenario: Reduced motion
- **WHEN** the visitor activates an arrow and the system asks for reduced motion
- **THEN** the new drawing is shown at once, without a turn or a fade

#### Scenario: First page
- **WHEN** the visitor opens the site at a drawing
- **THEN** the drawing is shown without a page turn

#### Scenario: From the index
- **WHEN** the visitor activates a drawing in the index
- **THEN** the drawing is shown without a page turn

#### Scenario: Browser without support
- **WHEN** the visitor activates an arrow in a browser without the View Transitions API
- **THEN** the new drawing is shown at once, as before this change

### Requirement: Quick navigation during a page turn
A new navigation during a page turn SHALL end that turn at once and SHALL show the drawing of the latest navigation. A page turn SHALL never leave the page showing a drawing other than the latest one requested. Clicks on the page during a turn SHALL NOT navigate, so a double click on an arrow moves one drawing.

#### Scenario: Back twice during a turn
- **WHEN** the visitor went two drawings older with "Seguinte" and then uses the browser's back action twice before the first turn back ends
- **THEN** the first turn ends at once, and the page ends showing the drawing the visitor started from

#### Scenario: Double click on an arrow
- **WHEN** the visitor double-clicks the "Seguinte" arrow
- **THEN** the page turns once and ends showing the next older drawing
