# Spec Delta

## ADDED Requirements

### Requirement: Swipe hint in the bottom bar
When the main pointer is a finger, the bottom bar SHALL show the dictionary's swipe hint between the arrows, hidden from screen readers, and SHALL draw the arrows smaller while keeping a tappable area of at least 44 × 44 px. Otherwise, and beside the sheet, there SHALL be no hint. The bar SHALL still not cover any content at the end of the page.

#### Scenario: Swipe hint on a phone
- **WHEN** an intermediate drawing is shown on a 360 px touch screen
- **THEN** the bar shows "Passa a página deslizando o dedo" between the two arrows, the arrows are smaller than beside the sheet but still at least 44 × 44 px to tap, and a screen reader does not read the text

#### Scenario: Only one arrow
- **WHEN** the newest drawing is shown on a 360 px touch screen
- **THEN** the "next" arrow is at the right of the bar and the hint takes the rest of it, with its text centred in that space

#### Scenario: Narrow window without touch
- **WHEN** an intermediate drawing is shown in a 360 px window of a computer with a mouse
- **THEN** the bar shows only the two arrows

#### Scenario: Wide touch screen
- **WHEN** an intermediate drawing is shown on a 1024 px touch screen
- **THEN** the arrows are beside the sheet, as before, and there is no hint

#### Scenario: End of the page with the hint
- **WHEN** a visitor on a 360 px touch screen scrolls to the end of a drawing with replies
- **THEN** the last reply is fully visible above the bar, hint included
