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
Every reply SHALL be shown as a sticky note of at least 360 × 360 CSS px, or the available width if the screen is narrower, which grows only if its content needs it. Its content SHALL be centred vertically, its text in roman, and its byline after the text, right-aligned, with the name in bold.

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
Notes SHALL take their background from a cycle of four note colours defined as design tokens, by their position, and their text and byline from the ink of that colour: a dark shade of the same hue. Two notes next to each other on screen SHALL NOT share a colour: neither two consecutive direct replies, nor a reply to a reply and the note it is stuck to, nor the last reply to a reply and the next direct reply.

#### Scenario: Five direct replies
- **WHEN** a drawing has five direct replies
- **THEN** they are coloured 1, 2, 3, 4 and 1

#### Scenario: Replies to a reply
- **WHEN** a direct reply of colour 1 has three replies to it
- **THEN** they are coloured 3, 4 and 1, and the next direct reply is colour 2

#### Scenario: One reply to a reply
- **WHEN** a direct reply has one reply to it
- **THEN** that note has a colour different from the direct reply and from the next direct reply

#### Scenario: Note text contrast
- **WHEN** a note's text is shown on its colour
- **THEN** it uses that colour's ink, with a contrast of at least 4.5:1

### Requirement: Direct replies are separate, replies to a reply are stuck on
Direct replies SHALL be separate notes, slightly rotated and alternating left and right by position. Replies to a reply SHALL be notes as wide as the note they answer, stuck on top of the note before them: indented once, or less when the column has no room for the indent, overlapping it by less than its bottom padding, so they never cover its text or byline.

#### Scenario: Conversation
- **WHEN** a direct reply has a reply from the notebook
- **THEN** the notebook's note is as wide as the first one, indented, overlaps the bottom of the first note, and the first note's text and byline remain fully visible

#### Scenario: Conversation on a narrow screen
- **WHEN** a direct reply has a reply from the notebook and the screen is 360 px wide
- **THEN** both notes have the same width, the indent shrinks as needed (down to none), and no edge of either note is cut off

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

## MODIFIED Requirements

### Requirement: Bloques de las respuestas
The replies SHALL be grouped in the `replies` block. Each card SHALL be a `replies__thread`, each reply a `reply` block with its `text` and `footer` elements, in that order, and the second-level replies SHALL go inside `replies__followups` with the `reply--followup` modifier.

#### Scenario: Tarjeta con seguimiento
- **WHEN** a visible reply has a visible reply from the notebook
- **THEN** the `.replies__thread` contains a `.reply` and a `.replies__followups` with a `.reply.reply--followup`

#### Scenario: Sin respuestas visibles
- **WHEN** a drawing has no visible replies
- **THEN** there is no `.replies`

#### Scenario: Byline after the text
- **WHEN** a reply with text is shown
- **THEN** its last child is a `footer.reply__footer`, after `.reply__text`, and it has no `header`

### Requirement: Bloque compartido de autoría
The name and the date SHALL form a `byline` block, with its `name` and `date` elements, wherever they appear together: in the drawing, in each reply and in each index card. Each use SHALL also carry the element class of the block that contains it (BEM mix), and MAY carry `byline` modifiers.

#### Scenario: Byline del dibujo
- **WHEN** a drawing by Naia is shown
- **THEN** an element with the classes `post__byline` and `byline` contains `.byline__name` with "Naia" and a `time.byline__date`

#### Scenario: Byline de una respuesta
- **WHEN** a reply is shown
- **THEN** its footer has the classes `reply__footer`, `byline` and `byline--note`, and contains `.byline__name` and `.byline__date`
