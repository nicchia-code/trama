---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
  - task/Taken by the agent
drift: null
proposal: "0015"
agent: false
---
# Show a status dot on every Task card and drop the agent working badge

Every Task card on the Board starts with a status dot, to the left of its ID, as the Task rows inside a design card already do. The dot tells To do, In progress and Done apart by colour and carries the column's name as tooltip and accessible name. A Task taken by the agent has its dot in the accent colour, pulsing, labelled 'Agent working'; the pulse stops when the system asks for reduced motion, leaving a still accent dot. No Task, on its own card or inside a design card, shows an 'agent working' badge any more, and no other dot is animated. The disabled move arrows, the missing drag and the Take back button of a taken Task stay as they are.
