---
created: 2026-10-24T11:23:03.767Z
updated: 2026-10-24T11:23:03.767Z
summary: The shared Markdown renderer shows pipe tables as tables with column alignment, instead of code blocks, in every view that uses it.
tasks:
  - u8j9nh9d
---
# Tables in the Markdown renderer

Markdown pipe tables render as real tables in every view that uses the shared renderer. Column alignment comes from the separator row: left, centre or right. Cells keep inline bold, italic, code and http or https links, and raw HTML stays text. A malformed table shows as written. Wide tables scroll inside their own box, so the panel never scrolls sideways. The renderer adds no library. Implemented by Task u8j9nh9d. The table CSS has not been checked visually in a running window.
