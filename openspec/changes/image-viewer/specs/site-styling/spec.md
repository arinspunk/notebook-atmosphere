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
