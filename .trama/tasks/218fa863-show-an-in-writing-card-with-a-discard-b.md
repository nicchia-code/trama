---
column: done
technical: false
refs:
  - panel/Board
  - proposal/Draft/developer.DISCARD_PROPOSAL
  - requirements/ui#panel/Board
drift: null
proposal: 3d6b3838
agent: false
created: 1970-01-01T00:00:00.028Z
---
# Show an in-writing card with a Discard button on the Board

A band above the Board's columns, shown only when there is a draft, holds one card per draft with its ID and title, the text The agent is writing this Proposal with the animated indicator (still when the system asks for reduced motion) and a Discard button; no Approve or Reject, no link to the Diagram. Discard asks for confirmation (Discard this draft? The agent will not be told.), does nothing when cancelled, and otherwise discards the draft through the host and refreshes the Board.
