---
column: done
technical: false
refs:
  - drift
  - requirements/ui#drift
drift: null
proposal: "0017"
agent: false
---
# Show a Drift's two sides, and the state of its Proposal, in the textual Drift view and the agent tools

Showing a Drift lists a block headed What happens and a block headed What should happen, then the attached Proposal with its state and, when it cannot be approved, the reason (still being written, rejected, discarded, already approved, stale, invalid, waiting for others). A resolved Drift written before the two sections existed shows its body as one block headed Description. The agent tools show the same.
