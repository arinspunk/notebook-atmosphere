# Spec Delta

## ADDED Requirements

### Requirement: Swipe between drawings
On a touch screen, a horizontal swipe on a drawing's page SHALL do what activating an arrow does, following the order of a book: right to left goes to the older drawing ("Seguinte"), left to right to the newer one ("Anterior").

#### Scenario: Swipe right to left
- **WHEN** on an intermediate drawing a visitor slides a finger from right to left across the page
- **THEN** the older drawing is shown, as with the "Seguinte" arrow

#### Scenario: Swipe left to right
- **WHEN** on an intermediate drawing a visitor slides a finger from left to right across the page
- **THEN** the newer drawing is shown, as with the "Anterior" arrow

### Requirement: Moves that are not a swipe
A swipe SHALL NOT change the drawing when there is no drawing in that direction, when it starts at the very edge of the screen, while the image viewer is open, while the page is zoomed in, or when the move is short, mostly vertical or made with more than one finger. Vertical scrolling, pinch zoom and moving around a zoomed-in page SHALL keep working as without the swipe.

#### Scenario: No drawing in that direction
- **WHEN** on the newest drawing a visitor slides a finger from left to right
- **THEN** nothing happens

#### Scenario: Scrolling down
- **WHEN** a visitor slides a finger mostly downwards, a little to the side, to read the notes
- **THEN** the page scrolls and the drawing does not change

#### Scenario: Short or two-finger move
- **WHEN** a visitor moves a finger sideways only a few pixels, or zooms with two fingers
- **THEN** the drawing does not change

#### Scenario: Swipe from the edge of the screen
- **WHEN** a visitor starts a sideways swipe at the very edge of the screen
- **THEN** the site does not change the drawing, and the browser's own edge gesture is left alone

#### Scenario: Page zoomed in
- **WHEN** a visitor has zoomed the page in with two fingers and slides one finger sideways to move around it
- **THEN** the view moves and the drawing does not change

#### Scenario: Viewer open
- **WHEN** the image viewer is open and the visitor swipes across it
- **THEN** the drawing does not change
