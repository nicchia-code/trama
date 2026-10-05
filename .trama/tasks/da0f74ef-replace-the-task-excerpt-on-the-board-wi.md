---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
  - requirements/ui#panel
drift: null
proposal: 81fb3342
agent: false
created: 1970-01-01T00:00:00.070Z
---
# Replace the Task excerpt on the Board with expandable details

A Task card that is not inside a design card no longer shows a two-line excerpt of its body.

- It has a "Show details" toggle that expands the whole body as Markdown in the card and then reads "Hide details". The toggle is not shown when the Task has no body.
- The toggle names the Task for assistive technology and says whether it is expanded.
- The card is closed when the Board first shows and stays as the developer left it while the Board refreshes during the session; closing the panel forgets which cards were open, as with design cards.
- Task rows inside a design card get no toggle and show no body.
