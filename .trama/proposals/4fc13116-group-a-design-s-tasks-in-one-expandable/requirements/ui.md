---
description: "Use when building or changing screens, layout, styling, components, navigation look or texts shown to users."
---
# Interface

## General

## panel/Board
- A design card shows the Proposal's title, a counter of finished Tasks over all its Tasks (for example "2/5 done") and the Run this design button. It is closed when the Board first shows and stays as the developer left it while the Board refreshes during the session; closing the panel forgets which cards were open.
- An expanded design card lists its Tasks in creation order. Each sub-item shows the Task's title, a status dot and the same move buttons a normal card has. The dot tells To do, In progress and Done apart by colour and carries a text label (tooltip and accessible name), so the colour is never the only signal.
- Dragging a design card is refused. Moving a Task of a design is done only with its own buttons.

## task
- `trama board` lists each design once, in its derived column, with the Proposal's ID and title and its Tasks underneath, each with its own column. Tasks that belong to no design, and designs of a single Task, are listed as before.
- `trama task list` stays a flat list grouped by column, so every Task can still be found; each Task shows the ID of the Proposal it comes from when it has one. The agent tools show the same.
