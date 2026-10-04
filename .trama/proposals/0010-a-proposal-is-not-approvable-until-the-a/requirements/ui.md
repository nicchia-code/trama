---
description: "Use when building or changing screens, layout, styling, components, navigation look or texts shown to users."
---
# Interface

## General

## panel/Board
- A design card shows the Proposal's title, a counter of finished Tasks over all its Tasks (for example "2/5 done") and the Run this design button. It is closed when the Board first shows and stays as the developer left it while the Board refreshes during the session; closing the panel forgets which cards were open.
- An expanded design card lists its Tasks in creation order. Each sub-item shows the Task's title, a status dot and the same move buttons a normal card has. The dot tells To do, In progress and Done apart by colour and carries a text label (tooltip and accessible name), so the colour is never the only signal.
- Dragging a design card is refused. Moving a Task of a design is done only with its own buttons.
- A Task taken by the agent shows a badge "agent working" with an animated indicator; the animation stops when the system asks for reduced motion, leaving the badge. Its two move arrows are disabled and the card cannot be dragged. Each disabled control has a tooltip and an accessible description saying that the agent is working on the Task. The card has a Take back button, enabled, that is not shown on other Tasks.
- Inside a design card the same applies to each Task taken by the agent, on its own row. Run this design and Run all To do are disabled, with a tooltip naming the Task or saying that an agent is working, while a relevant Task is taken.

- A Proposal the agent is still writing is an "in writing" card in a band above the columns, shown only when there is at least one. It shows the Proposal's ID and title, the text "The agent is writing this Proposal" with the same animated indicator as the "agent working" badge (stopped when the system asks for reduced motion, leaving the text), and a Discard button. It has no Approve or Reject button and is not a link to the Diagram.
- Discard asks for confirmation ("Discard this draft? The agent will not be told.") and does nothing when the developer cancels.
- The Diagram's Proposal selector and the Requirements tab list only handed-over (open) Proposals.

## task
- `trama board` lists Proposals the agent is still writing in their own group, "In writing", marked "(draft)", apart from the Proposals to decide, and `trama proposal list` marks them "(draft)". The agent tools show the same.
- `trama board` lists each design once, in its derived column, with the Proposal's ID and title and its Tasks underneath, each with its own column. Tasks that belong to no design, and designs of a single Task, are listed as before.
- `trama task list` stays a flat list grouped by column, so every Task can still be found; each Task shows the ID of the Proposal it comes from when it has one. The agent tools show the same.
- A Task taken by the agent is marked "(agent working)" in `trama board` and `trama task list`, and in the agent tools' output.
