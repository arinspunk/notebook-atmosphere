# Spec Delta

## ADDED Requirements

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
