---
column: done
technical: false
refs:
  - proposal/Draft
  - panel/Board
  - panel/Diagram
  - panel/Requirements
  - requirements/ui#panel/Board
drift: null
proposal: 3d6b3838
agent: false
created: 1970-01-01T00:00:00.027Z
---
# Keep Drafts out of the snapshot's Proposals and give the Board its drafts and a blocker for an attached Draft

The Diagram's Proposal selector, the Requirements tab and the count of what awaits a decision never include a Proposal the agent is still writing. The Board is given the drafts separately (ID, title). A Drift whose attached Proposal is a Draft shows Accept Proposal disabled with the reason that the Proposal is still being written.
