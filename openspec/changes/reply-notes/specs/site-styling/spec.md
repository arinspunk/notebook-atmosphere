# Spec Delta

## ADDED Requirements

### Requirement: Replies are shown below the sheet
The replies of a drawing SHALL be shown after the drawing's sheet, outside it, in a single column. The drawing page SHALL be the `drawing` block, containing the `post` block and, when there are visible replies, the `replies` block after it.

#### Scenario: Drawing with replies
- **WHEN** a drawing with visible replies is shown
- **THEN** `.drawing` contains `.post` and, after it, `.replies`, and `.post` does not contain `.replies`

#### Scenario: Drawing without visible replies
- **WHEN** a drawing has no visible replies
- **THEN** `.drawing` contains only `.post`

### Requirement: Replies look like sticky notes
Every reply SHALL be shown as a sticky note of at least 360 × 360 CSS px, or the available width if the screen is narrower, which grows only if its content needs it. Its content SHALL be centred vertically, its text in roman, and its byline right-aligned with the name in bold. Each note SHALL show the line of its adhesive strip near the top edge.

#### Scenario: Short reply
- **WHEN** a reply has one line of text
- **THEN** its note is a square of 360 px with the text and the byline centred vertically

#### Scenario: Reply at the length limit
- **WHEN** a reply has 300 characters
- **THEN** it fits in its note without the note growing

#### Scenario: Narrow screen
- **WHEN** the screen is 360 px wide
- **THEN** the notes fit the width, including their zigzag offset, without horizontal scroll and without any edge cut off

### Requirement: Consecutive notes never share a colour
Notes SHALL take their background from a cycle of note colours defined as design tokens, by their position. Two consecutive direct replies SHALL NOT share a colour, and a reply to a reply SHALL NOT share a colour with the note it is stuck to.

#### Scenario: Four direct replies
- **WHEN** a drawing has four direct replies and the palette has three colours
- **THEN** they are coloured 1, 2, 3 and 1

#### Scenario: Replies to a reply
- **WHEN** a direct reply has two replies to it
- **THEN** each of them has a colour different from the note right before it

#### Scenario: Note text contrast
- **WHEN** the note text is shown on any of the note colours
- **THEN** its contrast is at least 4.5:1

### Requirement: Direct replies are separate, replies to a reply are stuck on
Direct replies SHALL be separate notes, slightly rotated and alternating left and right by position. Replies to a reply SHALL be notes stuck on top of the note before them: indented once, overlapping it by less than its bottom padding, so they never cover its text or byline.

#### Scenario: Conversation
- **WHEN** a direct reply has a reply from the notebook
- **THEN** the notebook's note is indented, overlaps the bottom of the first note, and the first note's text and byline remain fully visible

#### Scenario: Two direct replies
- **WHEN** a drawing has two direct replies
- **THEN** there is space between their notes, and one leans and moves to one side while the other leans and moves to the other side

### Requirement: The byline reads "name, date"
Wherever a name and a date appear together (the drawing, the replies and the index), they SHALL be separated by the dictionary's byline separator, which in Galician is a comma and a space.

#### Scenario: Reply byline
- **WHEN** Toquinho's reply from 16 hours ago is shown
- **THEN** its byline reads "Toquinho, há 16 h"

#### Scenario: Invalid date
- **WHEN** a reply's date cannot be parsed
- **THEN** the byline shows only the name, without a trailing comma
