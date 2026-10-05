---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
drift: null
proposal: 23c34185
agent: false
created: 1970-01-01T00:00:00.047Z
---
# Show a ghost of a Task in the destination column while the developer's move is carried out

When the developer moves a Task that is not in a design card, by dragging it or with the card's arrows, the Task stays in its column, dimmed and marked busy, and a ghost of it stands in the destination column. The ghost is a translucent copy of the card with its title and the destination column's status dot, with a dashed border, at the place the Task will have in that column once the Board is updated, so the real card does not jump when it arrives. It cannot be dragged, has no buttons or links and is hidden from assistive technology. The destination column's count does not include it. It disappears when the real card arrives. Tasks inside a design card get no ghost: their row is only dimmed.
