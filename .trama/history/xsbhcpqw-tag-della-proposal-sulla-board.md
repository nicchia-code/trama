---
created: 2026-10-18T08:31:41.934Z
updated: 2026-10-24T11:22:52.676Z
summary: Task cards in the Board no longer show the Proposal tag; the Task details show it behind a Show tags button, and cards of one Proposal share a coloured left edge.
tasks:
  - aplmqdd7
  - gv7p30zx
---
# Tag della Proposal sulla Board

Board cards of Tasks, and the Task rows inside Backlog cards, no longer show the Proposal tag in Active and Done. Cards of Tasks from the same Proposal get a 3 px left edge in the colour of the Proposal label; Tasks without a Proposal get no tag and no edge. In the Task details the tag sits behind a Show tags button that opens below the references, body and previews and closes on every reopening. The label is shown in full, or the title shortened to 30 characters when the Proposal has no label; the tooltip reads 'From Proposal <identity>: <title>'. History details keep showing the tag. Implemented by Task gv7p30zx.
