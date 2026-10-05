---
column: done
technical: false
refs:
  - panel/Board
  - task/Taken by the agent
  - developer.TAKE_BACK_TASK
  - requirements/ui#panel/Board
  - requirements/rules#task
drift: null
proposal: dc81bbfc
agent: false
created: 1970-01-01T00:00:00.011Z
---
# Show a taken Task on the Board with its badge, disabled moves and a Take back button

A Task taken by the agent shows an "agent working" badge with an animated indicator; the animation stops when the system asks for reduced motion, leaving the badge. Its two move arrows are disabled, the card cannot be dragged, and each disabled control has a tooltip and an accessible description saying that the agent is working on the Task. The card has an enabled Take back button, shown on no other Task. The same holds for each taken Task on its own row inside a design card. Depends on the mark and on taking back.
