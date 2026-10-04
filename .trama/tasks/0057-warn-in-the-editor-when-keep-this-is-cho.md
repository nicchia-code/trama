---
column: done
technical: false
refs:
  - panel/Diagram
  - panel/Board
  - drift/Open/developer.ACCEPT_DRIFT_PROPOSAL
  - requirements/ui#drift
drift: null
proposal: "0017"
agent: false
---
# Warn in the editor when Keep this is chosen on a Drift whose Proposal cannot be approved, with a Rework button when it is stale

When the attached Proposal cannot be approved, the left Keep this looks disabled and is marked disabled for assistive technology but stays focusable and receives the click. Clicking it changes nothing and shows a warning in the editor naming the Proposal and why: still being written (wait for the agent to hand it over); rejected or discarded (the Model will not change, keep what should happen to have the code fixed); stale (the Model changed since it was written), with a Rework Proposal button that asks the agent to rework it; any other reason as reported. The line under the button names the same reason in short. The right Keep this is always available.
