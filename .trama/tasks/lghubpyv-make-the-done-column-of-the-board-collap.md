---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
drift: null
proposal: 8osh2q6r
agent: false
created: 2026-10-11T04:40:56.568Z
finished: 2026-10-11T04:54:38.759Z
---
# Make the Done column of the Board collapsible

The Done column opens and closes with an icon-only chevron button in its header, next to the title. Its tooltip and accessible name are Collapse Done column when open and Expand Done column when collapsed, and it tells assistive technology whether the column is open. Collapsed, the column is a narrow strip with the button and the title Done rotated vertically, read top to bottom; it shows no cards, no period menu, no count and no Nothing done in this period, and the To decide, To do and In progress columns share the freed space. The column is collapsed the first time the Board shows after the panel opens; the choice lasts while the Board refreshes and is forgotten when the panel closes.
