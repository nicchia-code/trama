---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
drift: null
proposal: "0016"
agent: false
---
# Remove the ghost and restore the Task when the developer's move is refused or gets no answer

When a move asked by the developer is refused, the ghost goes away at once, the original card returns to normal (no longer dimmed or busy, draggable again) and the reason is shown. When no answer comes before the timeout, the ghost goes away and the card returns to normal as well. Today the Board keeps the Task dimmed until the timeout even when the move was refused.
