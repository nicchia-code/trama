---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
drift: null
proposal: 65e2adde
agent: false
created: 1970-01-01T00:00:00.080Z
---
# Remove the ghost of a Task being moved and keep only its dimmed, busy card

Moving a Task draws no ghost any more.

- While a move asked by the developer is carried out, the card of the Task, or its row inside a design card, stays where it is, dimmed and marked as busy.
- It goes back to normal when the Board receives the Task in its new column, or when the move is refused or no answer comes before the timeout; then the error is shown.
- Nothing is drawn in the destination column, the destination column's count is that of its real cards, and the code and styles that drew the ghost of a moved Task are gone.
