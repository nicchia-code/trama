---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
  - requirements/rules#task
drift: null
---
# Show a design's Tasks as one expandable card on the Board

On the Board, the Tasks linked to the same Proposal, when there are at least two, appear as one card named after the Proposal, in creation order, instead of one card each. The card stands in the derived column (To do while none started, Done when all are done, In progress otherwise, including a mix of To do and Done). It is closed at first and shows a done/total counter; expanded, it lists the Tasks with a status dot (distinct by colour and by a text label), their titles and the usual move buttons. Expansion survives Board refreshes during the session and is forgotten when the panel closes. The card cannot be dragged, and Tasks of a design move only with their own buttons. A design with one Task and Tasks without a design remain normal cards. Depends on the Task link.
