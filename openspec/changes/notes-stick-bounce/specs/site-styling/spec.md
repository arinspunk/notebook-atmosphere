# Spec Delta

## ADDED Requirements

### Requirement: Notes stick on with a bounce
Each direct reply SHALL appear the first time it enters the screen with a short bounce, as if pressed onto the page, keeping its tilt and offset, and the notes stuck on it SHALL then stick on the same way, one by one. Direct replies entering the screen together SHALL stick on one after another. The durations SHALL come from the design tokens.

#### Scenario: Notes in view on loading
- **WHEN** a drawing with three replies is shown on a screen tall enough to see them, and the system does not ask for reduced motion
- **THEN** the three notes stick on one after another with a bounce, each keeping its tilt

#### Scenario: Cascade of stuck-on notes
- **WHEN** a reply with two notes stuck on it comes into view
- **THEN** the reply sticks on first, then the first stuck-on note, then the second, each with a bounce and keeping its tilt

#### Scenario: Notes below the screen
- **WHEN** a drawing with replies is shown on a phone, with the notes below the screen, and the visitor scrolls down to them
- **THEN** each note sticks on with a bounce as it comes into view, and only once

#### Scenario: Notes arrive late
- **WHEN** the visitor is looking at a drawing whose replies arrive from the network after the page is shown
- **THEN** the notes in view stick on with a bounce when they arrive

### Requirement: Notes shown at once without motion
With reduced motion (`prefers-reduced-motion: reduce`), or when the browser cannot tell when a note is in view, every note SHALL be shown at once, without a bounce and without waiting to come into view.

#### Scenario: Reduced motion
- **WHEN** a drawing with replies is shown and the system asks for reduced motion
- **THEN** the notes are shown at once, without a bounce

#### Scenario: Browser that cannot tell what is in view
- **WHEN** a drawing with replies is shown in a browser without `IntersectionObserver`
- **THEN** the notes are shown at once, as before this change

## MODIFIED Requirements

### Requirement: What moves during the page turn
During the page turn, the sticky notes SHALL NOT turn with the sheet: the old drawing's notes SHALL fade out as the turn starts, and the new drawing's notes SHALL NOT be shown until the turn ends, when those in view stick on with a bounce. The site header and the arrows SHALL stay in place, without turning or fading as a whole.

#### Scenario: Both drawings have replies
- **WHEN** the sheet turns from a drawing with notes to another drawing with notes that was prepared in advance
- **THEN** the old notes are gone before the new sheet is fully shown, the new notes stick on after it, and no note rotates with the sheet

#### Scenario: Arrows in the bottom bar
- **WHEN** the sheet turns on a phone, with the arrows in the bar fixed at the bottom
- **THEN** the bar stays fixed and does not turn or fade as a whole
