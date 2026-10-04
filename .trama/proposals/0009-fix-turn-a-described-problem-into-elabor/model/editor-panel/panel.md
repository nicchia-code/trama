# Panel

The editor tab that holds Trama's three views. There is at most one panel; opening it again brings it to the front. While it is open, a hidden tab keeps what the developer was looking at.

## States

### Closed (initial)
- `developer.OPEN_PANEL` → Open: only if the workspace has a Trama project, or it has none and the developer accepts the offer to initialize one and that succeeds. The panel starts on the Diagram.
- `developer.OPEN_PANEL` → Closed: the workspace has no Trama project and the developer dismisses the offer, or initializing fails (the reason is shown).

### Open
The panel is showing one of its tabs. Whenever the files change it is given a fresh picture of the Model, Requirements, Proposals, Tasks and Drifts, so every tab, also the hidden ones, stays current.
- `developer.OPEN_PANEL` → Open: the panel is brought to the front, keeping its tab.
- `developer.CLOSE_PANEL` → Closed: the panel stops following the files and forgets what it was showing.
- `developer.SHOW_DIAGRAM` → Diagram
- `developer.SHOW_BOARD` → Board
- `developer.SHOW_REQUIREMENTS` → Requirements
- `workspace.MODEL_CHANGED` → Open: after a short pause, one fresh picture is sent to the three tabs. If the files cannot be read, the error is shown and every tab keeps its last picture. If the files read fine but the Model or its Requirements are invalid, a banner counts the errors and links to each one, and the Diagram may be incomplete.

#### Diagram (initial)
The Model drawn one level at a time, with a selector to draw an open Proposal over it and the open Drifts drawn where they point. Selecting something shows its details and its Requirements; from there the developer can approve or reject a Proposal, resolve a Drift or open the file. Buttons ask the agent to design a change, to fix a problem or to scan the whole System or the Feature being looked at.

#### Board
Four columns: To decide (open Proposals, then open Drifts), To do, In progress and Done (the Tasks). Cards link to the Diagram. The Board tab shows how many Proposals and Drifts await a decision. Buttons ask the agent to implement every Task in To do, to scan the System, to design a change or to fix a problem.

The Tasks of one design, when there are at least two, are shown as a single design card named after the Proposal instead of one card each. The card stands in the column its Tasks add up to: To do while none of them has started, Done once all are done, In progress otherwise. It is closed at first and the developer can expand it to see its Tasks, each with a dot telling its own column and with the buttons to move it. A design card cannot be dragged. It has a button that asks the agent to implement the design's Tasks still in To do. A design with a single Task, and every Task that belongs to no design, stays a card of its own.

A Task the agent has taken shows an "agent working" badge with a small animated indicator, its move arrows are disabled and it cannot be dragged; a button takes it back. The same holds for that Task inside a design card. While any Task is taken by the agent the button that implements every Task in To do is unavailable, and so is the design card's button when one of the design's Tasks is taken; each disabled control says why.

#### Requirements
The Areas of Requirements with their sections, and what an open Proposal would change in them.
